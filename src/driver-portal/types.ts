import type {
  GoodsPaymentMode,
  PackageCategory,
} from '../delivery-requests/types'
import type { Money } from '../dispatch/types'
import type { ServiceType } from '../pricing/types'
import type { VehicleType } from '../logistics/types'
import type {
  IndependentStatus,
  IndependentVehicle,
} from '../independent-drivers/types'

// Mandaria Backend OpenAPI 1.9.0: driver self, driver vehicles and driver dispatches.
export const releaseReasons = [
  'VEHICLE_ISSUE',
  'PERSONAL_EMERGENCY',
  'CANNOT_COMPLETE',
  'OPERATIONAL_ISSUE',
  'OTHER',
] as const
export type ReleaseReason = (typeof releaseReasons)[number]
export const REASON_DETAIL_MIN = 3
export const REASON_DETAIL_MAX = 500

/** The independent capability as the driver sees it on their own account. */
export interface DriverSelfIndependent {
  id: string
  status: IndependentStatus
  approvedAt: string | null
  suspendedAt: string | null
  reason: string | null
  /** True only when APPROVED and with no ACTIVE delivery assignment, fleet or independent. */
  canTakeServices: boolean
}
export interface DriverSelf {
  id: string
  name: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  availability: 'OFFLINE' | 'AVAILABLE' | 'BUSY'
  provider: { id: string; name: string; code: string; status: string }
  currentAssignment: unknown | null
  /**
   * V1.9: the ACTIVE delivery assignment in either model. The backend selects only these three
   * fields, so the timestamp comes from the dispatch's own assignment, never from here.
   */
  activeDeliveryAssignment: {
    id: string
    mode: 'FLEET' | 'INDEPENDENT'
    dispatchId: string
  } | null
  independent: DriverSelfIndependent | null
}

export interface DriverStop {
  address: string
  latitude: number
  longitude: number
  /** OWNER only, once the service is taken. */
  contactName?: string
  contactPhone?: string
  instructions?: string | null
}
export interface DriverPackage {
  category: PackageCategory
  quantity: number
  weightKg: number | null
  isFragile: boolean
  description?: string
  handlingInstructions?: string | null
}
export interface DriverService {
  route: { distanceMeters: number; durationSeconds: number }
  pickup: DriverStop
  dropoff: DriverStop
  packages: DriverPackage[]
  /** OWNER only. */
  deliveryRequestPublicId?: string
}
/** Every amount here is Money; delivery fee and goods value are never mixed. */
export interface DriverPaymentContext {
  deliveryFee: Money
  goodsValue: Money | null
  goodsPaymentMode: GoodsPaymentMode | null
  driverAdvancesGoods: boolean
  driverAdvanceAmount: Money | null
}
export interface DriverAssignment {
  id: string
  mode: 'FLEET' | 'INDEPENDENT'
  assignedAt: string
  vehicle: { id: string; identifier: string; type: VehicleType }
}
export interface DriverDispatch {
  id: string
  status: 'OPEN' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED' | 'DELIVERED'
  /** OFFER: I can take it. OWNER: I took it, so contacts and instructions appear. */
  access: 'OWNER' | 'OFFER'
  serviceType: ServiceType
  serviceZone: { code: string; name: string }
  openedAt: string
  expiresAt: string
  takenByMe: boolean
  claimedAt: string | null
  cancelledAt: string | null
  /** V1.11: when I confirmed the delivery. null unless DELIVERED and the service is mine. */
  deliveredAt: string | null
  assignment: DriverAssignment | null
  service: DriverService
  paymentContext: DriverPaymentContext
  /**
   * V1.10: Mandaria credits this service costs me, frozen when the Dispatch opened. Credits are
   * not money and never mix with paymentContext. null = opened before credit snapshots existed:
   * no cost was recorded, which is not zero.
   */
  creditCost: number | null
}
export type DriverVehicle = IndependentVehicle
