import type {
  RatePlanStatus,
  ServiceType,
  ServiceZoneStatus,
  ZoneBoundary,
} from './types'
import { MAX_DISTANCE_METERS } from './types'

export const zoneStatusLabels: Record<ServiceZoneStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}
export const ratePlanStatusLabels: Record<RatePlanStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}
export const serviceTypeLabels: Record<ServiceType, string> = {
  LOCAL_DELIVERY: 'Entrega local',
}

const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 })
/** Humans read kilometres; the API always stores and receives integer metres. */
export function km(meters: number) {
  return Number.isFinite(meters)
    ? `${decimal.format(meters / 1000)} km`
    : 'Distancia no disponible'
}
/** Value for a <input type="number"> in kilometres, without grouping separators. */
export function kmValue(meters: number) {
  return Number.isFinite(meters) ? String(meters / 1000) : ''
}
/** Kilometre text from the form back into the integer metres the DTO requires. */
export function metersFrom(value: string): number | null {
  const text = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return null
  const meters = Math.round(Number(text) * 1000)
  return Number.isSafeInteger(meters) && meters <= MAX_DISTANCE_METERS
    ? meters
    : null
}
/** Money arrives as a 2-decimal string; it is formatted, never recomputed. */
export function money(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${value} ${currency}`
  try {
    return `${new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)} ${currency}`
  } catch {
    return `${value} ${currency}`
  }
}
/** Rejects anything the RateBandDto would refuse: positive decimal, up to 2 decimals. */
export function amountFrom(value: string): string | null {
  const text = value.trim().replace(',', '.')
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) return null
  return Number(text) > 0 ? text : null
}
export function validityText(minutes: number) {
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

const RANGE = /band\s*\[?(\d+)\s*-\s*(\d+)\)?/i
const range = (from: string, to: string) =>
  `${decimal.format(Number(from) / 1000)} – ${decimal.format(Number(to) / 1000)} km`
/**
 * Backend band diagnostics are machine-generated templates (rate-bands.ts), never user text.
 * Anything unrecognised falls back to a generic sentence: raw backend strings are not shown.
 */
export function bandError(raw: string): string {
  if (/at least one band/i.test(raw))
    return 'La tarifa necesita al menos una banda.'
  if (/must not share the same minDistanceMeters/i.test(raw))
    return 'Dos bandas no pueden empezar en la misma distancia.'
  if (/^amount must be a positive decimal/i.test(raw))
    return 'El precio debe ser un decimal positivo con hasta 2 decimales.'
  const validity = /quoteValidityMinutes must be between (\d+) and (\d+)/i.exec(
    raw,
  )
  if (validity)
    return `La vigencia de cotización debe estar entre ${validity[1]} y ${validity[2]} minutos.`
  const gap = /gap between (\d+) and (\d+) meters/i.exec(raw)
  if (gap) return `Hueco entre rangos: ${range(gap[1], gap[2])} sin banda.`
  const overlap =
    /overlap between band\[(\d+)-(\d+)\) and band\[(\d+)-(\d+)\)/i.exec(raw)
  if (overlap)
    return `Rangos superpuestos: ${range(overlap[1], overlap[2])} y ${range(overlap[3], overlap[4])}.`
  const band = RANGE.exec(raw)
  const label = band ? `Banda ${range(band[1], band[2])}` : 'Una banda'
  if (/first band must start at 0/i.test(raw))
    return `${label}: la primera banda debe empezar en 0 km.`
  if (/maxDistanceMeters must be greater than minDistanceMeters/i.test(raw))
    return `${label}: la distancia final debe ser mayor que la inicial.`
  if (/amount must be greater than 0/i.test(raw))
    return `${label}: el precio debe ser mayor que cero.`
  const currency = /currency must be ([A-Z]{3})/.exec(raw)
  if (currency) return `${label}: la moneda debe ser ${currency[1]}.`
  if (/limits must be non-negative integer meters/i.test(raw))
    return `${label}: las distancias deben ser metros enteros no negativos.`
  return 'Revisa los rangos y los precios de las bandas.'
}
/** De-duplicates translations so one cause is not repeated per band. */
export const bandErrors = (list: string[]) => [...new Set(list.map(bandError))]

export const NOT_PROVIDED = '—'
const isPositionList = (value: unknown, depth: number): boolean =>
  Array.isArray(value) &&
  (depth === 0
    ? value.length === 2 && value.every((n) => typeof n === 'number')
    : value.length > 0 &&
      value.every((item) => isPositionList(item, depth - 1)))

/**
 * Local shape check only, so obvious mistakes never reach the API. The backend remains the
 * authority on closed rings, self-intersection, area and the 10000 position limit.
 */
export function parseBoundary(text: string): ZoneBoundary | null {
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch {
    return null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const { type, coordinates } = value as Record<string, unknown>
  if (type === 'Polygon' && isPositionList(coordinates, 2))
    return { type, coordinates }
  if (type === 'MultiPolygon' && isPositionList(coordinates, 3))
    return { type, coordinates }
  return null
}
export const boundaryText = (boundary: unknown) =>
  boundary ? JSON.stringify(boundary, null, 2) : ''
export function positionCount(boundary: ZoneBoundary): number {
  const count = (value: unknown): number =>
    Array.isArray(value)
      ? value.every((n) => typeof n === 'number')
        ? 1
        : value.reduce<number>((sum, item) => sum + count(item), 0)
      : 0
  return count(boundary.coordinates)
}
