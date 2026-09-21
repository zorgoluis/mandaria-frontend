import type { VehicleType, VehicleStatus } from '../logistics/types'

// Mandaria Backend OpenAPI 1.9.0: independent-drivers.dto.ts,
// independent-drivers.responses.ts and independent-driver-policy.ts.
// A DRIVER is an account and a person; an Independent Driver profile is an extra
// operational capability Mandaria grants on top of it. They are never the same thing.
export const independentStatuses = [
  'PENDING',
  'APPROVED',
  'SUSPENDED',
  'REJECTED',
] as const
export type IndependentStatus = (typeof independentStatuses)[number]
export const REASON_MIN = 3
export const REASON_MAX = 500

export interface IndependentDriverRef {
  id: string
  name: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  availability: 'OFFLINE' | 'AVAILABLE' | 'BUSY'
  /** The V1.4 provider the Driver belongs to. Grants nothing in the independent context. */
  providerId: string
}
export interface IndependentDriverProfile {
  id: string
  driverId: string
  status: IndependentStatus
  approvedAt: string | null
  approvedByUserId: string | null
  suspendedAt: string | null
  suspendedByUserId: string | null
  rejectedAt: string | null
  rejectedByUserId: string | null
  reason: string | null
  createdAt: string
  updatedAt: string
  driver: IndependentDriverRef
}
/** Owned by the profile: an independent vehicle never carries a providerId. */
export interface IndependentVehicle {
  id: string
  independentDriverProfileId: string
  identifier: string
  type: VehicleType
  status: VehicleStatus
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  plate: string | null
  createdAt: string
  updatedAt: string
}
export interface IndependentVehicleInput {
  identifier: string
  type: VehicleType
  brand?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  plate?: string | null
}
export interface IndependentFilters {
  page?: number
  pageSize?: number
  status?: string
}
