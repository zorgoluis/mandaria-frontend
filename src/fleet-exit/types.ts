export interface Scope {
  actor: string
  surface: 'provider' | 'admin'
  providerId?: string
}
export type Operation = 'START' | 'RECHECK'
export type Status = 'PENDING' | 'COMPLETED'
export interface Notice {
  id: string
  exitId: string
  type: 'REQUESTED' | 'COMPLETED'
  createdAt: string
}
export interface Summary {
  id: string
  affiliationId: string
  driverId: string
  providerId: string
  status: Status
  revision: string
  requestedAt: string
  completedAt: string | null
  initiatedByKinds: ('DRIVER_REQUEST' | 'PROVIDER_REMOVAL')[]
  blockers: { code: string; assignmentId?: string; assistanceCaseId?: string }[]
  hasPendingEconomics: boolean
  capabilities: { canRecheck: boolean; recheckReason: string | null }
  lastEvaluatedAt?: string | null
}
export interface Detail extends Summary {
  lastEvaluatedAt: string | null
  notices: Notice[]
}
export interface Context {
  schemaVersion: 1
  serverTime: string
  affiliation: null | {
    id: string
    driverId: string
    providerId: string
    state: 'ACTIVE' | 'EXIT_PENDING'
    revision: string
    startedAt: string | null
    observedAt: string
  }
  exit: Summary | null
  capabilities: { canRequestExit: boolean; requestExitReason: string | null }
  independent?: {
    profileState: string
    canOperate: boolean
    reasons: string[]
    allowedZoneIds: string[]
    selectedZoneId: string | null
    requiresExplicitReceptionStart: boolean
  }
}
export interface Page<T> {
  items: T[]
  nextPageToken: string | null
  asOf: string
}
export interface Filters {
  status?: Status
  driverId?: string
  providerId?: string
  limit?: number
  pageToken?: string
}
export interface Resource {
  operation: Operation
  resourceType: 'AFFILIATION' | 'EXIT'
  resourceId: string
}
export type Receipt = Resource & {
  schemaVersion: 1
  receiptId: string
  key: string
  appliedAt: string
} & (
    | {
        status: 'APPLIED'
        exitId: string
        exitRevision: string
        exitStatus: Status
      }
    | { status: 'REJECTED'; code: string; httpStatus: number }
  )
export type Attempt = Resource & {
  schemaVersion: 1
  key: string
  status: 'APPLIED' | 'REJECTED' | 'PENDING' | 'UNKNOWN' | 'CLOSED_NO_EFFECTS'
  receipt: Receipt | null
  redacted: boolean
}
export type CommandResult =
  | Receipt
  | (Resource & {
      schemaVersion: 1
      key: string
      status: 'APPLIED' | 'REJECTED'
      receipt: null
      redacted: true
    })
export type Body =
  | { expectedAffiliationRevision: string; reasonCode: 'PROVIDER_REMOVAL' }
  | { expectedExitRevision: string }
