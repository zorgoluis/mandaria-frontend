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
  return usePendingCommands().items.some(
    (c) => c.actor === user?.id && c.dispatchId === dispatchId,
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
  pending = [...pending, item]
  message = ''
  emit()
  await retryCommand(item.key, command.actor)
}
export async function retryCommand(key: string, actor: string) {
  const item = pending.find((c) => c.key === key && c.actor === actor)
  if (!item || item.busy || reconciling.has(key)) return
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
