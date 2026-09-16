import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  RateBandInput,
  RatePlan,
  RatePlanFilters,
  RatePlanValidation,
  ServiceZone,
  ServiceZoneFilters,
  ServiceZoneInput,
  ServiceZoneSummary,
} from './types'

const zones = '/admin/service-zones'
const plans = '/admin/rate-plans'
const path = (base: string, id: string, action = '') =>
  `${base}/${encodeURIComponent(id)}${action}`

export const serviceZones = {
  list: (filters: ServiceZoneFilters, signal?: AbortSignal) => {
    const query = queryString({ ...filters })
    return api<Page<ServiceZoneSummary>>(
      `${zones}${query ? `?${query}` : ''}`,
      'GET',
      undefined,
      signal,
    )
  },
  get: (id: string, signal?: AbortSignal) =>
    api<ServiceZone>(path(zones, id), 'GET', undefined, signal),
  create: (data: ServiceZoneInput) => api<ServiceZone>(zones, 'POST', data),
  rename: (id: string, name: string) =>
    api<ServiceZone>(path(zones, id), 'PATCH', { name }),
  replaceBoundary: (id: string, boundary: unknown) =>
    api<ServiceZone>(path(zones, id, '/boundary'), 'PUT', { boundary }),
  transition: (id: string, action: 'activate' | 'deactivate') =>
    api<ServiceZone>(path(zones, id, `/${action}`), 'POST', {}),
}

export const ratePlans = {
  list: (filters: RatePlanFilters, signal?: AbortSignal) => {
    const query = queryString({ ...filters })
    return api<Page<RatePlan>>(
      `${plans}${query ? `?${query}` : ''}`,
      'GET',
      undefined,
      signal,
    )
  },
  get: (id: string, signal?: AbortSignal) =>
    api<RatePlan>(path(plans, id), 'GET', undefined, signal),
  create: (data: {
    serviceZoneId: string
    serviceType: string
    quoteValidityMinutes: number
    bands?: RateBandInput[]
  }) => api<RatePlan>(plans, 'POST', data),
  /** Copies TTL and bands of any version into the next DRAFT; the source is untouched. */
  clone: (id: string) => api<RatePlan>(path(plans, id, '/clone'), 'POST', {}),
  updateValidity: (id: string, quoteValidityMinutes: number) =>
    api<RatePlan>(path(plans, id), 'PATCH', { quoteValidityMinutes }),
  replaceBands: (id: string, bands: RateBandInput[]) =>
    api<RatePlan>(path(plans, id, '/bands'), 'PUT', { bands }),
  /** Read-only diagnosis: reports gaps, overlaps and invalid amounts without changing the plan. */
  validate: (id: string, signal?: AbortSignal) =>
    api<RatePlanValidation>(path(plans, id, '/validate'), 'POST', {}, signal),
  transition: (id: string, action: 'activate' | 'deactivate') =>
    api<RatePlan>(path(plans, id, `/${action}`), 'POST', {}),
}
