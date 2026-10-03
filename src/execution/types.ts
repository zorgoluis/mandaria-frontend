import type { Page } from '../types/api'
export const phases = [
  'TO_PICKUP',
  'AT_PICKUP',
  'PICKED_UP',
  'TO_DROPOFF',
  'AT_DROPOFF',
] as const
export type Phase = (typeof phases)[number]
export const reasons = [
  'RECIPIENT_UNAVAILABLE',
  'DELIVERY_REFUSED',
  'VEHICLE_FAILURE',
  'SAFETY_CONCERN',
  'OTHER',
] as const
export type Reason = (typeof reasons)[number]
export interface Execution {
  trackingMode: 'DETAILED'
  revision: number
  phase: Phase | null
  activeAssignmentId: string | null
  custodyStatus: 'NOT_COLLECTED' | 'HELD' | 'RETURNED' | 'DELIVERED'
  openIncidentId: string | null
  allowedActions: string[]
  lastRecordedAt: string
}
export interface ExecutionFields {
  execution?: Execution
  collectionActionAllowed?: boolean
  advanceToOriginAllowed?: boolean
}
export interface ExecutionEvent {
  kind: string
  phase: number
  revision: number
  assignmentId: string
  actorUserId: string | null
  actorRole: string | null
  source: string
  recordedAt: string
}
export interface ExecutionDetail {
  execution: Execution | null
  events: Page<ExecutionEvent>
}
export interface Scope {
  surface: 'provider' | 'driver' | 'admin'
  dispatchId: string
  providerId?: string
}
export interface Command {
  assignmentId: string
  expectedRevision: number
}
export interface Advance extends Command {
  phase: Phase
}
export interface Report extends Command {
  reasonCode: Reason
  reasonDetail: string
}
export interface Recipient {
  mode: 'FLEET' | 'INDEPENDENT'
  driverId: string
  vehicleId: string
  providerId?: string
}
export interface ResolutionBase extends Command {
  reason: string
  occurredAt: string
  confirmationMethod: 'PHONE'
}
export type Resolution = ResolutionBase &
  (
    | {
        type: 'RETURN_TO_ORIGIN'
        custodianConfirmed: true
        originConfirmed: true
        originContactLabel: string
        originContactRole: string
      }
    | {
        type: 'TRANSFER'
        recipient: Recipient
        releasingCustodianConfirmed: true
        receivingCustodianConfirmed: true
        atCurrentStageLocation: true
        recipientProviderAdminUserId?: string
        recipientProviderAdminConfirmed?: true
      }
  )
export interface Candidate {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleIdentifier: string
  providerId: string | null
  mode: 'FLEET' | 'INDEPENDENT'
}
export interface Incident {
  id: string
  dispatchId: string
  reportedAt: string
  reasonCode: string
  resolvedAt: string | null
}
export interface IncidentDetail {
  incident: Incident & {
    assignmentId: string
    chainId: string
    reportedByUserId: string
    reasonDetail: string
  }
  resolution: null | {
    id: string
    type: 'RETURN_TO_ORIGIN' | 'TRANSFER'
    reason: string
    actorUserId: string
    occurredAt: string
    recordedAt: string
    fromAssignmentId: string
    toAssignmentId: string | null
    confirmations: Resolution
  }
}
