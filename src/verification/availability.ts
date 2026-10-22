import { ApiError } from '../services/errors'
import type { EvidenceEnvironment } from './types'

export const availabilityText = {
  local:
    'Modo de prueba. Usa exclusivamente datos e imágenes sintéticos. No habilita operaciones reales.',
  disabled:
    'El alta documental no está disponible en este momento. Puedes volver a consultar más tarde.',
  missing:
    'Falta publicar la política aplicable a este ámbito. Puedes consultar tu historial; la aceptación y las nuevas evidencias deben esperar.',
  invalidPublication:
    'Revisa las versiones, los textos completos, los consentimientos y la autorización. El texto no debe contener notas ni marcadores de borrador; corrige la copia y vuelve a revisarla antes de enviarla.',
}
export function availabilityError(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return
  if (error.status === 503 && error.code === 'VERIFICATION_LOCAL_DISABLED')
    return availabilityText.disabled
  if (
    error.status === 503 &&
    error.code === 'VERIFICATION_PUBLICATION_REQUIRED'
  )
    return availabilityText.missing
  if (error.status === 400 && error.code === 'VERIFICATION_PUBLICATION_INVALID')
    return availabilityText.invalidPublication
}
export function consultationError(error: unknown) {
  return (
    availabilityError(error) ||
    (error instanceof ApiError && error.status === 401
      ? 'No se pudo verificar tu sesión para esta consulta. Revisa tu acceso antes de continuar.'
      : error instanceof ApiError && error.status === 403
        ? 'No tienes permiso para esta consulta.'
        : error instanceof ApiError && error.status === 0
          ? 'No se pudo conectar para consultar los requisitos. Vuelve a intentarlo.'
          : 'No se pudo completar la consulta. Vuelve a intentarlo; no se ha confirmado la disponibilidad del alta.')
  )
}
export function registrationUnavailable(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 503 &&
    [
      'VERIFICATION_LOCAL_DISABLED',
      'VERIFICATION_PUBLICATION_REQUIRED',
    ].includes(error.code || '')
  )
}
export type AvailabilityQuery = {
  data?: { environment?: string; blockingReason?: string | null }
  error?: unknown
  isPending?: boolean
  isFetching?: boolean
}
export type Availability = {
  kind: 'ready' | 'loading' | 'disabled' | 'missing_policy' | 'error'
  mode: EvidenceEnvironment | null
  canProceed: boolean
  text: string
}
// Only the current requirements response identifies runtime. Neither session
// capabilities, productionReady, policy cutover nor historical receipts do so.
export function documentaryAvailability(
  runtime: AvailabilityQuery,
  policy?: AvailabilityQuery,
): Availability {
  const blocked = (
    kind: Availability['kind'],
    text: string,
    mode: Availability['mode'] = null,
  ): Availability => ({ kind, text, mode, canProceed: false })
  const errorState = (error: unknown, mode: Availability['mode'] = null) =>
    error instanceof ApiError &&
    error.status === 503 &&
    error.code === 'VERIFICATION_LOCAL_DISABLED'
      ? blocked('disabled', availabilityText.disabled)
      : error instanceof ApiError &&
          error.status === 503 &&
          error.code === 'VERIFICATION_PUBLICATION_REQUIRED'
        ? blocked('missing_policy', availabilityText.missing, mode)
        : blocked('error', consultationError(error), mode)
  if (runtime.isPending || runtime.isFetching)
    return blocked('loading', 'Consultando disponibilidad del alta documental…')
  if (runtime.error) return errorState(runtime.error)
  const mode = runtime.data?.environment
  if (mode !== 'LOCAL_TEST' && mode !== 'PRODUCTION')
    return blocked(
      'error',
      'No se pudo confirmar el modo del alta documental. Consulta de nuevo antes de continuar.',
    )
  if (policy) {
    if (policy.isPending || policy.isFetching)
      return blocked(
        'loading',
        'Consultando la política vigente para este ámbito…',
        mode,
      )
    if (policy.error) return errorState(policy.error, mode)
    if (policy.data?.blockingReason === 'VERIFICATION_PUBLICATION_REQUIRED')
      return blocked('missing_policy', availabilityText.missing, mode)
    if (
      !policy.data ||
      policy.data.blockingReason ||
      (policy.data.environment && policy.data.environment !== mode)
    )
      return blocked(
        'error',
        'La política consultada no corresponde a los requisitos actuales. Consulta de nuevo antes de continuar.',
        mode,
      )
  }
  return {
    kind: 'ready',
    mode,
    canProceed: true,
    text: mode === 'LOCAL_TEST' ? availabilityText.local : '',
  }
}
