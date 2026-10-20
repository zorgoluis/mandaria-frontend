import { ApiError } from '../services/errors'
import type { Snapshot } from './contract'
export interface ImageRetention {
  version: 1
  reason: 'DRAFT_ACTIVITY' | 'FINAL_REJECTION'
  caseId: string
  anchorAt: string
  noticeAt: string
  dueAt: string
  noticeAcceptedAt: string | null
}
export function imageRetention(raw: unknown): ImageRetention {
  const p = raw as ImageRetention
  const date = (v: unknown) =>
    typeof v === 'string' &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(v) &&
    Number.isFinite(Date.parse(v))
  if (
    !p ||
    p.version !== 1 ||
    !['DRAFT_ACTIVITY', 'FINAL_REJECTION'].includes(p.reason) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      p.caseId,
    ) ||
    ![p.anchorAt, p.noticeAt, p.dueAt].every(date) ||
    (p.noticeAcceptedAt !== null && !date(p.noticeAcceptedAt))
  )
    throw new ApiError(0, 'Calendario incompleto; consulta el folio original.')
  // Explicit projection; evidence references and private transport data are not public copy.
  return {
    version: 1,
    reason: p.reason,
    caseId: p.caseId,
    anchorAt: p.anchorAt,
    noticeAt: p.noticeAt,
    dueAt: p.dueAt,
    noticeAcceptedAt: p.noticeAcceptedAt,
  }
}
export function retentionMessage(s: Snapshot) {
  if (s.incidentPending)
    return 'Incidencia actual pendiente. Un cierre histórico no acredita la situación actual de las imágenes.'
  if (s.blockingReason === 'IMAGE_NOTICE_NOT_ACCEPTED_IN_WINDOW')
    return 'No se acreditó la aceptación del aviso en plazo. La eliminación automática está bloqueada; las fechas originales no se renuevan.'
  if (s.status === 'CANCELLED')
    return 'Este plan ya no está activo. Consulta el seguimiento vigente; no acredita eliminación.'
  if (s.status === 'MANUAL_REQUIRED' || s.authorizationState === 'BLOCKED')
    return 'La eliminación requiere revisión autorizada. Puede haber imágenes conservadas o efectos parciales.'
  if (s.closedAt || s.completedDocumentaryScopes > 0)
    return 'Hay alcance documental comprobado. Consulta la constancia y sus límites; esto no acredita la eliminación de todas las imágenes o copias.'
  if (s.irreversibleStarted || ['DELETING', 'MINIMIZING'].includes(s.status))
    return 'Eliminación en curso o parcial. Su finalización todavía no está acreditada.'
  if (s.status === 'PURGED')
    return 'Registro depurado. Sin una constancia no se deduce la eliminación total de imágenes.'
  return 'Eliminación prevista, sujeta a aviso y revisión. La fecha por sí sola no acredita que se haya eliminado una imagen.'
}
export function utcDate(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value)
        .toISOString()
        .replace('T', ' ')
        .replace('.000Z', ' UTC')
        .replace('Z', ' UTC')
    : 'No informado por el servidor'
}
