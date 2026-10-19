import type { Restriction, Snapshot, WorkItem } from './contract'
// Called on form submission only; the backend rechecks its own clock.
export function validReviewAt(value: unknown, now = Date.now()) {
  const text = String(value),
    d = Date.parse(text)
  return (
    /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(text) &&
    Number.isFinite(d) &&
    d > now &&
    d <= now + 30 * 86400000
  )
}
export const v2 = (s: Snapshot) =>
  s.cleanupPolicy === 'OPERATIONAL_RECONCILIATION_V2'
export function operationalMessage(s: Snapshot) {
  if (s.status === 'CANCELLED') {
    if (s.authorizationState === 'BLOCKED')
      return 'Limpieza cancelada; autorización de limpieza bloqueada'
    return s.blockingReason === 'RESTRICTIONS_UNDER_REVIEW'
      ? 'Limpieza cancelada; restricciones en revisión'
      : 'Limpieza cancelada; consulta el estado de las restricciones'
  }
  if (s.authorizationState === 'BLOCKED')
    return s.irreversibleStarted
      ? 'Eliminación parcial; incidencia pendiente'
      : 'Autorización bloqueada; identidad o alcance en revisión'
  if (s.incidentPending)
    return s.irreversibleStarted
      ? 'Eliminación parcial; incidencia pendiente'
      : 'Comprobación pendiente'
  return null
}
// Presentation of the last recorded gate decision, never authority or a global
// review conclusion. Incomplete/contradictory historical data stays neutral.
export function restrictionMessage(g: Restriction, now: number) {
  if (!g.reviewedAt && !g.reviewReason?.trim() && !g.reviewDueAt)
    return g.active === true
      ? 'Restricción activa; no consta una decisión de revisión'
      : 'No consta una decisión de revisión'
  const reviewed = Date.parse(g.reviewedAt ?? ''),
    due = Date.parse(g.reviewDueAt ?? '')
  if (Number.isFinite(reviewed) && reviewed <= now && g.reviewReason?.trim()) {
    if (g.active === true && Number.isFinite(due) && due > reviewed)
      return 'Se mantiene esta restricción'
    if (g.active === false && g.reviewDueAt == null)
      return 'Restricción retirada. Esto no habilita automáticamente la cuenta'
  }
  return 'Los datos disponibles no permiten acreditar la última decisión de revisión'
}
export function reviewResult(i: WorkItem) {
  if (i.incidentCode === 'RESIDUE_AWAITING_REVIEW')
    return 'Residuos detectados; comprobación pendiente'
  if (i.incidentCode || i.errorCode)
    return 'No concluyente o requiere intervención'
  if (i.status === 'VERIFIED' && i.finalVerifiedAt)
    return 'Verificación final sin residuos detectados'
  if (i.lastReviewedAt) return 'Comprobación realizada; secuencia aún pendiente'
  return 'Programada; sin ejecución acreditada'
}
