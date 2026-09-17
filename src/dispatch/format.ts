import type { CandidateStatus, DispatchStatus } from './types'

export const dispatchStatusLabels: Record<DispatchStatus, string> = {
  OPEN: 'Disponible',
  CLAIMED: 'Tomado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
}
export const candidateStatusLabels: Record<CandidateStatus, string> = {
  OFFERED: 'Ofrecido',
  CLAIMED: 'Tomado',
  RELEASED: 'Liberado',
}
/** Presets only fill the free-text reason the DTO accepts (3-500 characters). */
export const releaseReasons = [
  'Sin repartidor disponible',
  'Problema con vehículo',
  'No puedo cubrir el servicio',
] as const
export const OTHER_REASON = 'Otro'

/** Remaining claim window. The countdown is informative: the backend decides expiration. */
export function remaining(expiresAt: string, now: number) {
  const ms = Date.parse(expiresAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const total = Math.ceil(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return hours
    ? `${hours}:${two(minutes)}:${two(seconds)}`
    : `${minutes}:${two(seconds)}`
}

/** Why a provider only sees a summary, derived from real fields (no invented states). */
export function summaryReason(dispatch: {
  status: DispatchStatus
  claimedByMe: boolean
  myCandidate: { status: CandidateStatus } | null
}) {
  if (dispatch.myCandidate?.status === 'RELEASED')
    return 'Tu proveedor liberó este servicio y no puede volver a tomarlo.'
  if (dispatch.status === 'CLAIMED' && !dispatch.claimedByMe)
    return 'Este servicio fue tomado por otro proveedor.'
  if (dispatch.status === 'EXPIRED')
    return 'El tiempo para tomar este servicio terminó.'
  if (dispatch.status === 'CANCELLED')
    return 'La solicitud fue cancelada; el servicio ya no está disponible.'
  return 'El detalle de este servicio no está disponible para tu proveedor.'
}

/** Dispatch cancellationReason is a backend code; never render it raw. */
export function dispatchCancellationLabel(value: string | null) {
  if (!value) return 'Sin motivo registrado'
  return value === 'DELIVERY_REQUEST_CANCELLED'
    ? 'La solicitud de entrega fue cancelada.'
    : 'Cancelado por el sistema.'
}
