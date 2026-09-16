import type { QuoteStatus } from './types'

/** Spanish labels for the UI; the technical enum is what travels to the API. */
export const quoteStatusLabels: Record<QuoteStatus, string> = {
  OFFERED: 'Ofrecida',
  ACCEPTED: 'Aceptada',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
}
export const quoteStatusHints: Record<QuoteStatus, string> = {
  OFFERED: 'El precio puede aceptarse hasta el fin de su vigencia.',
  ACCEPTED: 'El precio quedó congelado. No expira después de aceptarse.',
  EXPIRED: 'La vigencia terminó sin aceptación. Debe solicitarse una nueva.',
  CANCELLED: 'La cotización dejó de estar disponible.',
}
const minutes = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
/** Routing duration in seconds as the operator reads it. */
export function duration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'No disponible'
  const total = Math.round(seconds / 60)
  if (total < 60) return `${minutes.format(total)} min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
/** cancellationReason is a backend code (string); never render it raw. */
export function cancellationReasonLabel(value: string | null) {
  if (!value) return 'Sin motivo registrado'
  const known: Record<string, string> = {
    DELIVERY_REQUEST_CANCELLED: 'La solicitud de entrega fue cancelada.',
  }
  return known[value] ?? 'Cancelada por el sistema.'
}
export function routingProviderLabel(value: string) {
  const known: Record<string, string> = {
    google: 'Google',
    local_fake: 'Proveedor local de pruebas',
  }
  return known[value.toLowerCase()] ?? 'Proveedor de ruta configurado'
}
