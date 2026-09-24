import type { GoodsPaymentMode } from '../delivery-requests/types'
import type { Money } from '../dispatch/types'
import type { VehicleType } from '../logistics/types'

// Mandaria Backend OpenAPI 1.8.0: delivery-assignments.dto.ts,
// delivery-assignments.responses.ts and assignment-policy.ts.
// COMPLETED (V1.11-A) is a successful close, not a cancellation: the delivery was confirmed.
export const assignmentStatuses = [
  'ACTIVE',
  'REASSIGNED',
  'CANCELLED',
  'COMPLETED',
] as const
export type AssignmentStatus = (typeof assignmentStatuses)[number]
/** DELIVERY_CANCELLED is reserved for the official service cancellation, never sent by us. */
export const providerEndReasons = [
  'DRIVER_UNAVAILABLE',
  'VEHICLE_ISSUE',
  'OPERATIONAL_CHANGE',
  'OTHER',
] as const
export type ProviderEndReason = (typeof providerEndReasons)[number]
export type AssignmentEndReason = ProviderEndReason | 'DELIVERY_CANCELLED'
export const REASON_DETAIL_MIN = 3
export const REASON_DETAIL_MAX = 500
export type DriverAvailability = 'OFFLINE' | 'AVAILABLE' | 'BUSY'

export interface AssignmentDriver {
  id: string
  name: string
}
export interface AssignmentVehicle {
  id: string
  identifier: string
  type: VehicleType
}
export interface DeliveryAssignment {
  id: string
  dispatchId: string
  providerId: string
  status: AssignmentStatus
  driver: AssignmentDriver
  vehicle: AssignmentVehicle
  assignedAt: string
  assignedByUserId: string
  endedAt: string | null
  endedByUserId: string | null
  endReason: AssignmentEndReason | null
  endReasonDetail: string | null
}
/**
 * deliveryFee and goodsValue are separate money and are never added together. Unlike
 * `service.goods` (V1.7: decimal string plus a sibling currency), every amount here is a Money.
 */
export interface PaymentContext {
  deliveryFee: Money
  goodsValue: Money | null
  goodsPaymentMode: GoodsPaymentMode | null
  driverAdvancesGoods: boolean
  driverAdvanceAmount: Money | null
}
export interface AssignmentWithPayment extends DeliveryAssignment {
  paymentContext: PaymentContext
}
export interface AdminDeliveryAssignment extends DeliveryAssignment {
  provider: { id: string; name: string; code: string }
}
/** Paired in V1.4: when present the assignment must use exactly that counterpart. */
export interface AvailableDriver {
  id: string
  name: string
  availability: DriverAvailability
  pairedVehicle: (AssignmentVehicle & { status: string }) | null
}
export interface AvailableVehicle {
  id: string
  identifier: string
  type: VehicleType
  brand: string | null
  model: string | null
  color: string | null
  plate: string | null
  pairedDriver: AssignmentDriver | null
}
export interface AssignmentInput {
  driverId: string
  vehicleId: string
}
export interface ReassignInput extends AssignmentInput {
  reason: ProviderEndReason
  reasonDetail?: string
}
export interface CancelAssignmentInput {
  reason: ProviderEndReason
  reasonDetail?: string
}
