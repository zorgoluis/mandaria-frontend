// Mandaria Backend OpenAPI 1.6.0: service-zones.responses.ts, rate-plans.responses.ts and
// their DTOs. Every admin endpoint of this module is SUPER_ADMIN only.
export const serviceZoneStatuses = ['ACTIVE', 'INACTIVE'] as const
export const ratePlanStatuses = ['DRAFT', 'ACTIVE', 'INACTIVE'] as const
// Only LOCAL_DELIVERY exists in the backend enum; INTERCITY/FREIGHT are not implemented.
export const serviceTypes = ['LOCAL_DELIVERY'] as const
export type ServiceZoneStatus = (typeof serviceZoneStatuses)[number]
export type RatePlanStatus = (typeof ratePlanStatuses)[number]
export type ServiceType = (typeof serviceTypes)[number]
export type RateCalculationType = 'DISTANCE_BANDS'

/** GeoJSON Polygon/MultiPolygon in [longitude, latitude] order, as stored by the backend. */
export interface ZoneBoundary {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown
}
export interface ServiceZoneSummary {
  id: string
  code: string
  name: string
  status: ServiceZoneStatus
  currency: string
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
  createdAt: string
  updatedAt: string
}
export interface ServiceZone extends ServiceZoneSummary {
  /** Absent in list items; the detail endpoint returns the normalized geometry. */
  boundary?: ZoneBoundary | null
}
export interface ServiceZoneFilters {
  page?: number
  pageSize?: number
  status?: string
  search?: string
}
export interface ServiceZoneInput {
  code: string
  name: string
  currency: string
  boundary: unknown
}

/** Amounts are 2-decimal strings (NUMERIC(14,2)); distances are integer meters. */
export interface RateBand {
  id: string
  minDistanceMeters: number
  maxDistanceMeters: number
  amount: string
  currency: string
}
export interface RateBandInput {
  minDistanceMeters: number
  maxDistanceMeters: number
  amount: string
}
export interface RatePlanZone {
  id: string
  code: string
  name: string
  status: ServiceZoneStatus
}
export interface RatePlan {
  id: string
  serviceZoneId: string
  serviceType: ServiceType
  version: number
  status: RatePlanStatus
  calculationType: RateCalculationType
  quoteValidityMinutes: number
  currency: string
  serviceZone: RatePlanZone
  bands: RateBand[]
  createdAt: string
  updatedAt: string
  activatedAt: string | null
  deactivatedAt: string | null
}
export interface RatePlanFilters {
  page?: number
  pageSize?: number
  serviceZoneId?: string
  serviceType?: string
  status?: string
}
export interface RatePlanValidation {
  ratePlanId: string
  valid: boolean
  errors: string[]
}
/** LOCAL_DELIVERY policy in QUOTE_VALIDITY_LIMITS; the DTO itself allows 1..10080. */
export const QUOTE_VALIDITY = { min: 1, max: 120, recommended: 15 } as const
export const MAX_BANDS = 100
export const MAX_DISTANCE_METERS = 1_000_000
