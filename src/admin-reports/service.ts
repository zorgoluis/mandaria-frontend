import { api } from '../services/api'
import { queryString } from '../services/query'
export type Money = { currency: string; amount: string }
export interface ReportFilters {
  from: string
  to: string
  zoneId?: string
  providerId?: string
  driverId?: string
  mode?: string
  search?: string
  activity?: string
  groupBy?: string
  page?: number
  pageSize?: number
}
export interface DriverRow {
  id: string
  name: string
  createdAt: string
  category: string
  providerId: string | null
  provider_name: string | null
  connected: boolean
  status: string
  assigned: number
  delivered: number
  released: number
  cancelled: number
  returned: number
  transferred: number
  reassigned: number
  connection_history_complete: boolean
  active_days: number
  never_assigned: boolean
  last_assigned: string | null
  connections: number
  online_seconds: number
  last_connection: string | null
  logins: number
  last_login: string | null
  amounts: Money[]
}
export interface Report {
  from: string
  to: string
  timeZone: string
  groupBy: string
  asOf: string
  coverage: { since: string; complete: boolean; available: boolean }
  totals: Record<string, number | null>
  amounts: Money[]
  declaredCollections: (Money & { count: number })[]
  points: {
    consumed: number
    refunded: number
    net: number
    recharged: number
    adjusted: number
  }
  creditAccounts: {
    total: number
    items: {
      id: string
      name: string
      kind: string
      consumed: number
      refunded: number
      net: number
      recharged: number
      adjusted: number
    }[]
  }
  drivers: {
    total: number
    page: number
    pageSize: number
    counts: Record<string, number>
    items: DriverRow[]
  }
  series: {
    day: string
    requested: number
    taken: number
    delivered: number
    releases: number
    cancelled: number
    net_points: number
    amounts: Money[]
  }[]
}
export const reports = {
  get: (filters: ReportFilters, signal?: AbortSignal) =>
    api<Report>(
      '/admin/reports?' + queryString({ ...filters }),
      'GET',
      undefined,
      signal,
    ),
  options: (signal?: AbortSignal) =>
    api<{
      zones: { id: string; name: string }[]
      providers: { id: string; name: string }[]
    }>('/admin/reports/options', 'GET', undefined, signal),
  export: (filters: ReportFilters) =>
    api<{ fileName: string; content: string }>(
      '/admin/reports/export?' + queryString({ ...filters }),
    ),
}
export function initialFilters(now = new Date()): ReportFilters {
  const to = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const from = new Date(Date.parse(to + 'T00:00:00Z') - 29 * 86400000)
    .toISOString()
    .slice(0, 10)
  return { from, to, groupBy: 'day', page: 1, pageSize: 25 }
}
export function validReportRange(from: string, to: string) {
  const start = new Date(from + 'T00:00:00Z'),
    end = new Date(to + 'T00:00:00Z')
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    start.toISOString().slice(0, 10) !== from ||
    end.toISOString().slice(0, 10) !== to ||
    start > end
  )
    return false
  const anniversary = new Date(start)
  anniversary.setUTCFullYear(start.getUTCFullYear() + 1)
  if (anniversary.getUTCMonth() !== start.getUTCMonth())
    anniversary.setUTCDate(0)
  return +end + 86400000 <= +anniversary
}
