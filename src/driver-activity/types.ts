// Mandaria Backend: GET /admin/drivers/:driverId/deliveries and /analytics
// (docs/ADMIN-DRIVER-ACTIVITY-HANDOFF-20261113.md). SUPER_ADMIN only.
export const deliveryOutcomes = [
  'IN_PROGRESS',
  'DELIVERED',
  'RETURNED',
  'TRANSFERRED',
  'REASSIGNED',
  'RELEASED',
  'CANCELLED',
] as const
export type DeliveryOutcome = (typeof deliveryOutcomes)[number]

/** One participation of the driver; a service may appear for several drivers. */
export interface DriverDelivery {
  assignmentId: string
  dispatchId: string
  deliveryRequestPublicId: string
  mode: 'INDEPENDENT' | 'FLEET'
  provider: { id: string; name: string } | null
  outcome: DeliveryOutcome
  assignmentStatus: string
  dispatchStatus: string
  assignedAt: string
  pickedUpAt: string | null
  deliveredAt: string | null
  endedAt: string | null
  serviceZone: { id: string; code: string; name: string }
  /** Quoted shipping amount; never the driver's earnings. */
  deliveryFee: { amount: string; currency: string }
  vehicle: {
    id: string
    identifier: string
    type: string
    plate: string | null
  }
}

export interface DriverAnalytics {
  driverId: string
  from: string
  to: string
  totals: {
    participations: number
    inProgress: number
    delivered: number
    returned: number
    transferred: number
    reassigned: number
    released: number
    cancelled: number
  }
  /** delivered / finished participations, 0..1; null without finished ones. */
  deliveryRate: number | null
  avgAssignmentToDeliverySeconds: number | null
  activeDays: number
  /** Latest participation in the whole history, not only the window. */
  lastAssignedAt: string | null
  deliveredAmount: { currency: string; amount: string }[]
  /** UTC day of assignment, zero-filled from `from` to `to`. */
  dailyDelivered: { date: string; delivered: number }[]
}

export interface ActivityWindow {
  from: string
  to: string
}
