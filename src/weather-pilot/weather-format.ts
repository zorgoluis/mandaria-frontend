import type {
  WeatherPage,
  WeatherReading,
  WeatherZone,
} from './weather-service'

export const weatherDeadline = (reading: WeatherReading) =>
  Math.min(
    Date.parse(reading.validUntil),
    Date.parse(reading.fetchedAt) + 30 * 60_000,
  )
/** Drop the provider content, rather than merely hiding an expired condition. */
export function expireWeatherPage(
  value: WeatherPage,
  now: number,
): WeatherPage {
  return {
    ...value,
    items: value.items.map((row) => {
      const permitted =
        value.globalEnabled &&
        row.configuration?.enabled &&
        row.serviceZone.status === 'ACTIVE'
      const fresh =
        permitted &&
        row.status === 'FRESH' &&
        row.reading &&
        Number.isFinite(weatherDeadline(row.reading)) &&
        weatherDeadline(row.reading) > now
      if (fresh) return row
      return {
        ...row,
        reading: null,
        state: 'UNKNOWN',
        status: row.status === 'FRESH' ? 'STALE' : row.status,
      }
    }),
  }
}
const statuses = {
  NOT_CONFIGURED: ['DRAFT', 'Sin configurar'],
  DISABLED: ['INACTIVE', 'Desactivado'],
  ZONE_INACTIVE: ['INACTIVE', 'Zona inactiva'],
  PENDING: ['PENDING', 'Esperando consulta'],
  STALE: ['EXPIRED', 'Dato vencido'],
  ERROR: ['REJECTED', 'Consulta no disponible'],
  BUDGET_EXHAUSTED: ['PENDING', 'Límite diario alcanzado'],
} as const
export function weatherBadge(row: WeatherZone) {
  if (row.status === 'FRESH' && row.reading) {
    if (row.reading.state === 'RAIN')
      return { value: 'OFFERED', label: 'Lluvia' }
    if (row.reading.state === 'NO_RAIN')
      return { value: 'ACTIVE', label: 'Sin lluvia' }
    return { value: 'PENDING', label: 'Desconocido' }
  }
  const [value, label] = statuses[row.status as keyof typeof statuses] ?? [
    'PENDING',
    'Desconocido',
  ]
  return { value, label }
}
