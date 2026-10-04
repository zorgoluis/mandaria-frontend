import {
  persistHistoricalMarker,
  useHistoricalMarkers,
  readHistoricalMarkers,
  removeHistoricalMarker,
} from './historical-store'
import { useEffect, useSyncExternalStore } from 'react'
import { ApiError } from '../services/errors'
import { queryClient } from '../services/query'
import { executionApi } from './service'
import { useAuth } from '../auth/context'
import {
  persistResolutionMarker,
  readResolutionMarkers,
  removeResolutionMarker,
  type ResolutionMarker,
} from './reconciliation-store'
import { inspectResolution } from './reconcile'
export interface PendingCommand {
  actor: string
  dispatchId: string
  path: string
  body: unknown
  key: string
  label: string
  busy: boolean
  resolution?: ResolutionMarker
  uncertain?: boolean
}
const reconciling = new Set<string>()
let pending: readonly PendingCommand[] = []
let message = ''
let messageActor = ''
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export const refreshExecution = () =>
  queryClient.invalidateQueries({
    predicate: (q) =>
      [
        'execution',
        'dispatches',
        'driver-portal',
        'delivery-assignments',
        'drivers',
        'vehicles',
        'custody-incidents',
      ].includes(String(q.queryKey[0])),
  })
export function usePendingCommands() {
  const items = useSyncExternalStore(subscribe, () => pending)
  useEffect(() => {
    if (!items.length) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [items.length])
  return { items, message, messageActor }
}
export function useExecutionBusy(dispatchId: string) {
  const { user } = useAuth()
  const history = useHistoricalMarkers()
  const inMemory = usePendingCommands().items.some(
    (c) => c.actor === user?.id && c.dispatchId === dispatchId,
  )
  return (
    inMemory ||
    (user?.role === 'PROVIDER_ADMIN' &&
      (history.unavailable ||
        history.markers.some((m) => m.dispatchId === dispatchId)))
  )
}
export async function runCommand(
  command: Omit<PendingCommand, 'key' | 'busy'>,
) {
  if (
    pending.some(
      (c) => c.actor === command.actor && c.dispatchId === command.dispatchId,
    )
  )
    return
  const item: PendingCommand = {
    ...command,
    body: JSON.parse(JSON.stringify(command.body)) as unknown,
    key: crypto.randomUUID(),
    busy: false,
  }
  const resolutionPath = command.path.match(
    /^\/admin\/dispatches\/[^/]+\/custody-incidents\/([^/]+)\/resolve$/,
  )
  if (resolutionPath) {
    const body = item.body as Record<string, unknown>
    if (
      !body ||
      typeof body.assignmentId !== 'string' ||
      typeof body.expectedRevision !== 'number' ||
      !['TRANSFER', 'RETURN_TO_ORIGIN'].includes(String(body.type))
    )
      return
    item.resolution = {
      actor: item.actor,
      dispatchId: item.dispatchId,
      incidentId: decodeURIComponent(resolutionPath[1]),
      assignmentId: body.assignmentId,
      expectedRevision: body.expectedRevision,
      type: body.type as ResolutionMarker['type'],
      key: item.key,
    }
    if (!persistResolutionMarker(item.resolution)) {
      messageActor = item.actor
      message =
        'Pendiente de reconciliación o almacenamiento local no disponible. No se envió otra resolución. Consulta la incidencia; no borres el marcador para reintentar.'
      pending = [...pending]
      emit()
      return
    }
  }
  preserveHistoricalCommand(item)
  pending = [...pending, item]
  message = ''
  emit()
  await retryCommand(item.key, command.actor)
}
/** Retired commands must never be replayed against either the old or a replacement write route. */
export const retiredWebCommand = (item: PendingCommand) =>
  /^\/driver\/dispatches\/[^/]+\/(execution-events|custody-incidents|execution-completion|deliver)(?:\?|$)/.test(
    item.path,
  ) ||
  /^\/provider\/dispatches\/[^/]+\/execution-events(?:\?|$)/.test(item.path)

export const isHistoricalProviderCommand = (item: PendingCommand) =>
  /^\/provider\/dispatches\/[^/]+\/execution-events(?:\?|$)/.test(item.path)
export function preserveHistoricalCommand(item: PendingCommand) {
  if (!isHistoricalProviderCommand(item)) return false
  const params = new URLSearchParams(item.path.split('?')[1] ?? '')
  const providerId = params.get('providerId') || undefined
  return persistHistoricalMarker({
    actor: item.actor,
    dispatchId: item.dispatchId,
    key: item.key,
    ...(providerId ? { providerId } : {}),
  })
}
export async function reconcileHistoricalAdvance(
  key: string,
  actor: string,
  role: string,
  authorized: () => boolean,
  close = false,
) {
  const marker = readHistoricalMarkers().markers.find(
    (m) => m.key === key && m.actor === actor,
  )
  if (
    !marker ||
    role !== 'PROVIDER_ADMIN' ||
    !authorized() ||
    reconciling.has(key)
  )
    return
  reconciling.add(key)
  try {
    const result = await executionApi.providerAttempt(
      marker.dispatchId,
      marker.providerId,
      key,
      close,
    )
    if (!authorized()) return
    await refreshExecution()
    if (!authorized()) return
    messageActor = actor
    const applied =
      result.state === 'APPLIED' &&
      Number.isSafeInteger(result.appliedRevision) &&
      Number(result.appliedRevision) > 0
    const closed =
      result.state === 'CLOSED_NO_EFFECTS' && result.appliedRevision === null
    if (
      result.canStartNewAttempt === false &&
      (applied || closed) &&
      removeHistoricalMarker(key, actor)
    ) {
      pending = pending.filter((c) => c.key !== key || c.actor !== actor)
      message = applied
        ? 'Avance histórico acreditado en revisión ' +
          result.appliedRevision +
          '. Se actualizaron las vistas autorizadas; no se reenvió ningún avance.'
        : 'Intento histórico cerrado sin efectos. No autoriza nuevos avances del proveedor ni revierte movimientos físicos.'
    } else
      message =
        'Pendiente de reconciliación. Conservamos el marcador y el bloqueo. Consulta o cierra expresamente el intento; nunca reenvíes el avance histórico.'
  } catch {
    if (authorized()) {
      messageActor = actor
      message = close
        ? 'Pendiente de reconciliación. El cierre pudo registrarse aunque no recibimos respuesta; conserva el marcador y consulta. No se asume CLOSED_NO_EFFECTS.'
        : 'Pendiente de revisión de acceso o reconciliación. No se pudo acreditar el recibo con esta cuenta y membership; conserva el marcador.'
    }
  } finally {
    reconciling.delete(key)
    pending = [...pending]
    emit()
  }
}
export async function inspectRetiredCommand(
  key: string,
  actor: string,
  role: string,
  authorized: () => boolean,
) {
  const item = pending.find((c) => c.key === key && c.actor === actor)
  if (
    !item ||
    !retiredWebCommand(item) ||
    item.busy ||
    reconciling.has(key) ||
    !authorized()
  )
    return
  if (isHistoricalProviderCommand(item)) {
    preserveHistoricalCommand(item)
    await reconcileHistoricalAdvance(key, actor, role, authorized)
    return
  }
  reconciling.add(key)
  try {
    const body = item.body as { assignmentId?: unknown }
    const operation = item.path.includes('/execution-events')
      ? 'ADVANCE'
      : item.path.includes('/custody-incidents')
        ? 'REPORT'
        : 'DELIVER'
    if (
      role !== 'DRIVER' ||
      !item.path.startsWith('/driver/') ||
      typeof body?.assignmentId !== 'string'
    ) {
      messageActor = actor
      message =
        'Pendiente de reconciliación: este intento anterior no dispone de un recibo consultable por este rol. Conserva la clave y consulta soporte; no reenvíes ni suplantes al repartidor.'
      return
    }
    const receipt = await executionApi.driverAttempt(
      item.dispatchId,
      body.assignmentId,
      operation,
      key,
    )
    if (!authorized()) return
    await refreshExecution()
    if (!authorized()) return
    messageActor = actor
    if (
      receipt.assignmentId === body.assignmentId &&
      receipt.operation === operation &&
      (receipt.state === 'APPLIED' || receipt.state === 'CLOSED_NO_EFFECTS')
    ) {
      pending = pending.filter((c) => c.key !== key)
      message =
        receipt.state === 'APPLIED'
          ? 'El recibo propio confirma el registro anterior. Se actualizaron las consultas; no se envió otra operación.'
          : 'Intento anterior cerrado sin efectos. No se repitió ninguna operación. El cierre técnico no revierte hechos físicos; los nuevos registros detallados corresponden a la app.'
    } else
      message =
        'Pendiente de reconciliación. Conservamos el bloqueo; consulta nuevamente con la cuenta iniciadora. No se reenvió la operación.'
  } catch {
    if (authorized()) {
      messageActor = actor
      message =
        'Pendiente de reconciliación. No se pudo confirmar el recibo; conservamos el intento y no lo reenviamos.'
    }
  } finally {
    reconciling.delete(key)
    pending = [...pending]
    emit()
  }
}
export async function retryCommand(key: string, actor: string) {
  const item = pending.find((c) => c.key === key && c.actor === actor)
  if (!item || item.busy || reconciling.has(key)) return
  if (retiredWebCommand(item)) return
  messageActor = actor
  pending = pending.map((c) => (c.key === key ? { ...c, busy: true } : c))
  emit()
  try {
    await executionApi.command(item.path, item.body, item.key)
    if (item.resolution) removeResolutionMarker(item.key)
    pending = pending.filter((c) => c.key !== key)
    message = `${item.label}: registro confirmado por Mandaria. Actualizando el estado vigente.`
  } catch (error) {
    if (
      item.resolution &&
      error instanceof ApiError &&
      error.code === 'EXECUTION_ATTEMPT_CLOSED'
    ) {
      pending = pending.filter((c) => c.key !== key)
      message =
        'La clave del intento está cerrada. Consulta su estado antes de preparar otra resolución; no repitas la operación física.'
    } else if (
      !(error instanceof ApiError) ||
      error.status === 0 ||
      error.status >= 500 ||
      [401, 408, 429].includes(error.status) ||
      (item.resolution && item.uncertain)
    ) {
      pending = pending.map((c) =>
        c.key === key ? { ...c, busy: false, uncertain: true } : c,
      )
      message =
        'Respuesta incierta. La operación pudo registrarse. Conservamos clave y cuerpo en esta pestaña. Tras recargar, consulta el intento y, si corresponde, ciérralo explícitamente. No prepares otra resolución mientras siga incierto.'
    } else {
      if (item.resolution) removeResolutionMarker(item.key)
      pending = pending.filter((c) => c.key !== key)
      message =
        error.status === 409
          ? `${error.message} El estado pudo cambiar; revisa la lectura actual antes de preparar otra operación. No se reintentó automáticamente.`
          : error.message
    }
  }
  await refreshExecution()
  // New array also notifies useSyncExternalStore after the refetch finishes.
  pending = [...pending]
  emit()
}
export async function reconcileCommand(
  key: string,
  actor: string,
  role: string,
  authorized: () => boolean = () => true,
  close = false,
) {
  const marker = readResolutionMarkers().markers.find(
    (m) => m.key === key && m.actor === actor,
  )
  if (
    !marker ||
    role !== 'SUPER_ADMIN' ||
    !authorized() ||
    reconciling.has(key) ||
    pending.some((c) => c.key === key && c.busy)
  )
    return
  reconciling.add(key)
  try {
    const attempt = await executionApi.attempt(
      marker.dispatchId,
      marker.incidentId,
      key,
      close,
    )
    if (!authorized()) return
    let cleared = false
    let resultMessage =
      'Pendiente de reconciliación. Consulta nuevamente; no prepares otra resolución con una clave distinta.'
    if (
      attempt.state === 'APPLIED' &&
      typeof attempt.resolutionId === 'string' &&
      attempt.resolutionId &&
      attempt.canStartNewAttempt === false
    ) {
      const result = await inspectResolution(
        marker,
        authorized,
        attempt.resolutionId,
      )
      cleared = result.resolved
      resultMessage = result.message
    } else if (
      attempt.state === 'CLOSED_NO_EFFECTS' &&
      attempt.resolutionId === null
    ) {
      const incident = await executionApi.incident(
        marker.dispatchId,
        marker.incidentId,
      )
      if (!authorized()) return
      const head = await executionApi.detail(
        { surface: 'admin', dispatchId: marker.dispatchId },
        1,
      )
      if (!authorized()) return
      if (
        attempt.canStartNewAttempt === true &&
        incident.incident.id === marker.incidentId &&
        incident.incident.dispatchId === marker.dispatchId &&
        !incident.incident.resolvedAt &&
        !incident.resolution &&
        head.execution?.openIncidentId === marker.incidentId
      ) {
        cleared = true
        resultMessage =
          'Intento técnico cerrado sin efectos. Revisa la asignación y revisión actuales y confirma la situación física antes de preparar un nuevo intento. No se envió ninguna resolución. El cierre no cancela ni revierte una entrega física.'
      } else {
        const result = await inspectResolution(marker, authorized)
        cleared = result.resolved
        resultMessage = result.message
      }
    }
    if (!authorized()) return
    await refreshExecution()
    if (!authorized()) return
    if (cleared) {
      pending = pending.filter((c) => c.key !== key)
      removeResolutionMarker(key)
    }
    messageActor = actor
    message = resultMessage
  } catch {
    if (!authorized()) return
    messageActor = actor
    message = close
      ? 'Pendiente de reconciliación. El cierre pudo registrarse aunque no recibimos confirmación. Conservamos el bloqueo: consulta el intento. No se asume CLOSED_NO_EFFECTS ni se repite la resolución.'
      : 'Pendiente de reconciliación. No fue posible consultar el intento con los permisos actuales. Conservamos el bloqueo.'
  } finally {
    reconciling.delete(key)
    pending = [...pending]
    emit()
  }
}
/** Isolated tests only. Pending intents survive route unmounts in this tab. */
export function resetCommands() {
  pending = []
  message = ''
  emit()
}
