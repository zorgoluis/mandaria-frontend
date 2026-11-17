import type { DriverCategory } from '../driver-category/contract'
import type { VehicleType, VehicleStatus } from '../logistics/types'

// Mandaria Backend OpenAPI 1.9.0: independent-drivers.dto.ts,
// independent-drivers.responses.ts and independent-driver-policy.ts.
// Historical profile and approval never substitute for the canonical category projection.
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
  /** Administrative profile projection; optional for older API responses. */
  user?: { id: string; email: string; active: boolean } | null
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  availability: 'OFFLINE' | 'AVAILABLE' | 'BUSY'
  /** The V1.4 provider the Driver belongs to. Grants nothing in the independent context. */
  providerId: string | null
}
export interface IndependentDriverProfile {
  driverCategory?: DriverCategory
  membershipState?: 'CURRENT' | 'HISTORICAL' | 'REVIEW_REQUIRED'
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
  /** Substring of the driver's name; backends without it answer 400. */
  search?: string
}

export type UnusedAccountStatus = 'ACTIVE' | 'DISABLED' | 'ALL'
export interface UnusedDriverAccount {
  userId: string
  email: string
  name: string | null
  driverId: string | null
  createdAt: string
  updatedAt: string
  active: boolean
  driverStatus: string | null
  independentProfileId: string | null
  independentProfileStatus: string | null
  category: 'NONE' | 'INDEPENDENT' | 'FLEET' | 'REVIEW_REQUIRED'
  hasServiceActivity: boolean
  canDeactivate: boolean
  blockReason: string | null
  deactivatedAt: string | null
}
export interface UnusedAccountFilters {
  page: number
  pageSize: number
  search?: string
  accountStatus: UnusedAccountStatus
}
export interface DeactivateUnusedAccount {
  requestId: string
  expectedUpdatedAt: string
  reason: string
}
export interface UnusedAccountReceipt {
  userId: string
  active: false
  deactivatedAt: string
  requestId: string
}
