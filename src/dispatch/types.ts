import type {
  GoodsPaymentMode,
  PackageCategory,
} from '../delivery-requests/types'
import type { ServiceType } from '../pricing/types'
import type { DeliveryAssignment } from '../delivery-assignments/types'

// Mandaria Backend OpenAPI 1.7.0: dispatch.dto.ts, dispatch.responses.ts, dispatch-policy.ts
// and dispatch.select.ts (providerDispatchView / adminDispatchView).
export const dispatchStatuses = [
  'OPEN',
  'CLAIMED',
  'EXPIRED',
  'CANCELLED',
] as const
export const candidateStatuses = ['OFFERED', 'CLAIMED', 'RELEASED'] as const
export const dispatchViews = ['AVAILABLE', 'CLAIMED', 'ALL'] as const
export type DispatchStatus = (typeof dispatchStatuses)[number]
export type CandidateStatus = (typeof candidateStatuses)[number]
export type DispatchView = (typeof dispatchViews)[number]
/** OWNER: my provider holds the claim. OFFER: I can claim it. SUMMARY: status only. */
export type DispatchAccess = 'OWNER' | 'OFFER' | 'SUMMARY'
export const RELEASE_REASON_MIN = 3
export const RELEASE_REASON_MAX = 500

export interface Money {
  amount: string
  currency: string
}
export interface DispatchGoods {
  paymentMode: GoodsPaymentMode
  /** V1.7 contract: decimal string with the currency as a sibling field, not a Money. */
  value: string | null
  currency: string
  driverAdvancesGoods: boolean
  /** What the driver must advance to the merchant at pickup; null unless COURIER_ADVANCE. */
  driverAdvanceAmount: string | null
}
export interface DispatchStop {
  address: string
  latitude: number
  longitude: number
  /** OWNER only. */
  contactName?: string
  contactPhone?: string
  instructions?: string | null
}
export interface DispatchPackage {
  category: PackageCategory
  quantity: number
  weightKg: number | null
  isFragile: boolean
  /** OWNER only. */
  description?: string
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  handlingInstructions?: string | null
}
export interface DispatchService {
  deliveryFee: Money
  route: { distanceMeters: number; durationSeconds: number }
  pickup: DispatchStop
  dropoff: DispatchStop
  packages: DispatchPackage[]
  goods: DispatchGoods | null
  /** OWNER only. */
  deliveryRequestPublicId?: string
  externalReference?: string | null
}
export interface MyCandidate {
  status: CandidateStatus
  offeredAt: string
  claimedAt: string | null
  releasedAt: string | null
  releaseReason: string | null
}
export interface ProviderDispatch {
  id: string
  status: DispatchStatus
  access: DispatchAccess
  serviceType: ServiceType
  serviceZone: { code: string; name: string }
  openedAt: string
  expiresAt: string
  claimedByMe: boolean
  claimedAt: string | null
  cancelledAt: string | null
  myCandidate: MyCandidate | null
  service: DispatchService | null
  /** V1.8: who executes the service. Only the claim owner sees it; null while unassigned. */
  assignment: DeliveryAssignment | null
  /** Derived by the backend from claimedAt + TTL. Never computed here, never auto-released. */
  assignmentDeadline: string | null
  assignmentOverdue: boolean
}
export interface AdminDispatchCandidate {
  provider: { id: string; name: string; code: string }
  status: CandidateStatus
  offeredAt: string
  claimedAt: string | null
  releasedAt: string | null
  releaseReason: string | null
}
export interface AdminDispatch {
  id: string
  status: DispatchStatus
  openedAt: string
  expiresAt: string
  claimedByProviderId: string | null
  claimedAt: string | null
  expiredAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  createdAt: string
  updatedAt: string
  deliveryRequest: {
    publicId: string
    status: string
    integrationClientId: string
  }
  deliveryQuote: {
    publicId: string
    serviceType: ServiceType
    serviceZone: { id: string; name: string; code: string }
    amount: string
    currency: string
  }
  noProviderAvailable: boolean
  candidates: AdminDispatchCandidate[]
  goods: DispatchGoods | null
}
export interface ProviderDispatchFilters {
  page?: number
  pageSize?: number
  view?: DispatchView
  status?: string
}
export interface AdminDispatchFilters {
  page?: number
  pageSize?: number
  status?: string
  providerId?: string
  deliveryRequestPublicId?: string
}
