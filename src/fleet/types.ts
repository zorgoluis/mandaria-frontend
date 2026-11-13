export type OperationMode =
  'ADMIN_DISPATCH' | 'DRAINING' | 'DRIVER_TAKE' | 'PAUSED'
export interface OperationContext {
  operationMode: OperationMode
  revision: string
  capabilities: Record<
    | 'canManageResources'
    | 'canObserveServices'
    | 'canClaim'
    | 'canAssign'
    | 'canReassign'
    | 'canRelease'
    | 'canDeliver'
    | 'canMutateIncidents',
    boolean
  >
}
export interface Spending {
  enabled: boolean
  revision: string
  requestId?: string
}
export interface SpendingCommand {
  requestId: string
  expectedRevision: string
  enabled: boolean
}
export interface FleetFilters {
  from?: string
  to?: string
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REASSIGNED'
  driverId?: string
  vehicleId?: string
}
// FleetService.history: OpenAPI declares routes, but not these response subfields.
export interface Participation {
  assignmentId: string
  dispatchId: string
  reference: string
  // History returns the persisted enum; filters intentionally accept only four values.
  status: NonNullable<FleetFilters['status']> | 'RETURNED' | 'TRANSFERRED'
  driver: { id: string; name: string | null }
  vehicle: { id: string; identifier: string | null }
  assignedAt: string
  endedAt: string | null
  zone: { id: string; name: string }
  events: { kind: string; phase: number; recordedAt: string }[]
  incidents: { id: string; resolvedAt: string | null }[]
  deliveryFee: { amount: string; currency: string }
  credits: { id: string; type: string; amount: number; createdAt: string }[]
}
export interface FleetPage {
  items: Participation[]
  nextPageToken: string | null
  serverTime: string
}
