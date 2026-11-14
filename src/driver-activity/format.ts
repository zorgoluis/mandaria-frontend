import type { DeliveryOutcome } from './types'

export const outcomeLabels: Record<DeliveryOutcome, string> = {
  IN_PROGRESS: 'En curso',
  DELIVERED: 'Entregado',
  RETURNED: 'Devuelto a origen',
  TRANSFERRED: 'Custodia transferida',
  REASSIGNED: 'Reasignado',
  RELEASED: 'Liberado',
  CANCELLED: 'Cancelado',
}

export function percent(rate: number | null) {
  return rate === null
    ? 'Sin datos'
    : rate.toLocaleString('es-MX', {
        style: 'percent',
        maximumFractionDigits: 0,
      })
}

export function duration(seconds: number | null) {
  if (seconds === null) return 'Sin entregas'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function money(amount: string, currency: string) {
  const value = Number(amount)
  return Number.isFinite(value)
    ? value.toLocaleString('es-MX', { style: 'currency', currency })
    : `${amount} ${currency}`
}

/** UTC day key as a short es-MX label, without shifting it to local time. */
export function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
