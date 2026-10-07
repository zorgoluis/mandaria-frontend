import { adminAssignments } from '../delivery-assignments/service'
import { executionApi } from './service'
import type { ResolutionMarker } from './reconciliation-store'
import type { Execution, IncidentDetail } from './types'

export type ReconciliationResult = { resolved: boolean; message: string }
const uncertain = (detail: string): ReconciliationResult => ({
  resolved: false,
  message: `Pendiente de reconciliación. ${detail} No se permite repetir esta resolución con otra clave.`,
})
const sameHead = (a: Execution | null, b: Execution | null) =>
  !!a &&
  !!b &&
  a.revision === b.revision &&
  a.activeAssignmentId === b.activeAssignmentId &&
  a.openIncidentId === b.openIncidentId &&
  a.custodyStatus === b.custodyStatus
const sameResolution = (a: IncidentDetail, b: IncidentDetail) =>
  a.incident.resolvedAt === b.incident.resolvedAt &&
  a.resolution?.id === b.resolution?.id &&
  a.resolution?.type === b.resolution?.type &&
  a.resolution?.fromAssignmentId === b.resolution?.fromAssignmentId &&
  a.resolution?.toAssignmentId === b.resolution?.toAssignmentId

/** Reads only. An open incident does not prove that an in-flight command rolled back. */
export async function inspectResolution(
  marker: ResolutionMarker,
  authorized: () => boolean = () => true,
  resolutionId?: string,
): Promise<ReconciliationResult> {
  try {
    const read = async <T>(work: () => Promise<T>) => {
      if (!authorized()) throw new Error('Session changed')
      const result = await work()
      if (!authorized()) throw new Error('Session changed')
      return result
    }
    const scope = { surface: 'admin' as const, dispatchId: marker.dispatchId }
    const first = await read(() => executionApi.detail(scope, 1))
    const detail = await read(() =>
      executionApi.incident(marker.dispatchId, marker.incidentId),
    )
    const assignments = await read(() =>
      adminAssignments.history(marker.dispatchId),
    )
    const { incident, resolution } = detail
    const head = first.execution
    if (
      !head ||
      incident.id !== marker.incidentId ||
      incident.dispatchId !== marker.dispatchId ||
      incident.assignmentId !== marker.assignmentId
    )
      return uncertain('Las lecturas no corresponden a la incidencia original.')
    const active = assignments.filter((a) => a.status === 'ACTIVE')
    const source = assignments.find((a) => a.id === marker.assignmentId)
    if (
      !source ||
      assignments.some((a) => a.dispatchId !== marker.dispatchId) ||
      (head.activeAssignmentId
        ? active.length !== 1 || active[0].id !== head.activeAssignmentId
        : active.length !== 0)
    )
      return uncertain('La asignación vigente y su historial no coinciden.')
    if (!incident.resolvedAt || !resolution)
      return uncertain(
        'No hay una resolución confirmada en las lecturas. Esto no demuestra que la operación haya fallado o terminado.',
      )
    if (
      (resolutionId !== undefined &&
        (resolution.id !== resolutionId ||
          resolution.actorUserId !== marker.actor)) ||
      resolution.fromAssignmentId !== marker.assignmentId ||
      head.openIncidentId === marker.incidentId ||
      !Number.isSafeInteger(resolution.confirmations?.expectedRevision)
    )
      return uncertain('La evidencia de cierre está incompleta.')
    const transfer = resolution.type === 'TRANSFER'
    if (
      transfer
        ? source.status !== 'TRANSFERRED' ||
          !resolution.toAssignmentId ||
          !assignments.some((a) => a.id === resolution.toAssignmentId)
        : resolution.type !== 'RETURN_TO_ORIGIN' ||
          source.status !== 'RETURNED' ||
          resolution.toAssignmentId !== null ||
          head.custodyStatus !== 'RETURNED' ||
          head.activeAssignmentId !== null
    )
      return uncertain(
        'La resolución y las asignaciones presentan diferencias.',
      )
    if (
      !head.activeAssignmentId &&
      !['DELIVERED', 'RETURNED'].includes(head.custodyStatus)
    )
      return uncertain(
        'No se puede determinar el custodio vigente ni un cierre terminal.',
      )
    const revision = resolution.confirmations.expectedRevision + 1
    if (revision <= marker.expectedRevision || revision > head.revision)
      return uncertain(
        'Las revisiones de la resolución y de la ejecución no coinciden.',
      )
    let page = first,
      found = false
    // Bounded read: exhaustion is uncertainty, never permission to write.
    for (
      let index = 1;
      index <= Math.min(first.events.totalPages, 50);
      index++
    ) {
      if (index > 1) page = await read(() => executionApi.detail(scope, index))
      if (!sameHead(head, page.execution))
        return uncertain('La ejecución cambió durante la consulta.')
      found = page.events.items.some(
        (event) =>
          event.revision === revision &&
          event.kind === (transfer ? 'TRANSFER' : 'RETURN') &&
          event.assignmentId ===
            (transfer ? resolution.toAssignmentId : marker.assignmentId) &&
          event.actorUserId === resolution.actorUserId &&
          event.source === 'ADMIN_RESOLUTION',
      )
      if (found) break
    }
    if (!found)
      return uncertain(
        'No se encontró el evento de resolución correspondiente en el historial consultado.',
      )
    const finalHead = await read(() => executionApi.detail(scope, 1))
    const finalIncident = await read(() =>
      executionApi.incident(marker.dispatchId, marker.incidentId),
    )
    if (
      !sameHead(head, finalHead.execution) ||
      !sameResolution(detail, finalIncident)
    )
      return uncertain(
        'El estado cambió durante la conciliación; vuelve a consultar.',
      )
    return {
      resolved: true,
      message: `Incidencia resuelta verificada: ${transfer ? 'transferencia de custodia' : 'devolución al origen (RETURNED)'}. Resolución, asignaciones e historial coherentes. No repetir. ${resolutionId ? 'El recibo acredita esta clave y el cierre coherente; no acredita cobro.' : 'Esta lectura acredita el cierre de la incidencia, no atribuye el resultado a la clave local ni acredita cobro.'}`,
    }
  } catch {
    return uncertain(
      'No fue posible completar las lecturas autorizadas del servidor.',
    )
  }
}
