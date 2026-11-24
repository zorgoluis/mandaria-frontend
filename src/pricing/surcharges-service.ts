import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type { ServiceType } from './types'

export type SurchargeKind = 'SCHEDULE' | 'MANUAL_RAIN' | 'AUTOMATIC_RAIN'
export interface SurchargeInput {
  serviceZoneId: string
  serviceType: ServiceType
  kind: SurchargeKind
  amount: string
  reason: string
  timeZone?: string
  weekdays?: number[]
  startMinute?: number
  endMinute?: number
  expiresAt?: string
}
export interface Surcharge {
  id: string
  serviceZoneId: string
  serviceType: ServiceType
  kind: SurchargeKind
  amount: string
  currency: string
  reason: string
  timeZone: string | null
  weekdays: number[]
  startMinute: number | null
  endMinute: number | null
  expiresAt: string | null
  disabledAt: string | null
  createdAt: string
  createdBy: string
  disabledBy: string | null
  disableReason: string | null
}
export interface SurchargeFilters {
  page: number
  pageSize: number
  serviceZoneId?: string
  serviceType?: ServiceType
}
const base = '/admin/pricing-surcharges'
export const pricingSurcharges = {
  list: (filters: SurchargeFilters, signal?: AbortSignal) =>
    api<Page<Surcharge>>(
      `${base}?${queryString({ ...filters })}`,
      'GET',
      undefined,
      signal,
    ),
  create: (data: SurchargeInput) => api<Surcharge>(base, 'POST', data),
  deactivate: (id: string, reason: string) =>
    api<Surcharge>(`${base}/${encodeURIComponent(id)}/deactivate`, 'POST', {
      reason,
    }),
}
