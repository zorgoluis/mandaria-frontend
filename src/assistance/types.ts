export type Surface = 'provider' | 'admin'
export interface Scope {
  actor: string
  surface: Surface
  providerId?: string
}
export interface Schema {
  type?: string | string[]
  properties?: Record<string, Schema>
  required?: string[]
  enum?: string[]
  const?: string
  items?: Schema
  oneOf?: Schema[]
  anyOf?: Schema[]
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  minimum?: number
  maximum?: number
  additionalProperties?: boolean
  default?: unknown
  $schema?: string
}
export type RecordRow = { id: string; [key: string]: unknown }
export interface CursorPage<T> {
  items: T[]
  nextPageToken: string | null
  asOf: string
}
export interface Summary {
  id: string
  dispatchId: string
  assignmentId: string
  status: 'OPEN' | 'CLOSED'
  operationalState: string
  economicState: string
  revision: string
  updatedAt: string
  restrictions: { id: string; scope: string; publicReason: string }[]
  capabilities?: {
    canContribute?: boolean
    canDeclareMovement?: boolean
    canDispute?: boolean
    canReview?: boolean
    canApply?: boolean
  }
}
export interface CaseDetail {
  movementContext?: MovementContext | null
  summary: Summary
  participation: {
    assignmentId: string
    providerName: string | null
    driverDisplayName: string | null
    startedAt: string
    endedAt: string | null
  }
  economics: {
    obligationId: string
    concept: string
    currency: string
    expectedAmount: string | null
    creditedAmount: string
    remainingAmount: string | null
    state: string
  }[]
  history: RecordRow[]
  nextHistoryPageToken: string | null
  materialRevision?: string
  collections?: Partial<Record<Collection, CursorPage<RecordRow>>>
}
export interface MovementParty {
  partyId: string
  kind: 'DRIVER' | 'PROVIDER' | 'ORIGIN' | 'RECIPIENT' | 'EXTERNAL'
  label: string | null
  isOwn: boolean
}
export interface DeclarationOption {
  obligationId: string
  fromPartyId: string
  toPartyId: string
  beneficiaryPartyId: string
  concept:
    'SHIPPING_FEE' | 'GOODS' | 'COURIER_ADVANCE' | 'REFUND' | 'DIFFERENCE'
  currency: 'MXN'
}
export interface ParticipantMovement {
  id: string
  fromPartyId: string
  toPartyId: string
  beneficiaryPartyId: string
  declaredConcepts: string[]
  amount: string
  currency: 'MXN'
  occurredAt: string
  recordedAt: string
  status: 'DECLARED' | 'ACCREDITED' | 'RETRACTED'
  canDispute: boolean
  disputeReason: string | null
  canReverse: false
  reverseReason: 'MOVEMENT_ADMIN_REVIEW_REQUIRED'
}
export interface MovementContext {
  schemaVersion: 1
  caseRevision: string
  asOf: string
  parties: MovementParty[]
  declarationOptions: DeclarationOption[]
  capabilities: {
    canDeclareMovement: boolean
    declareMovementReason: string | null
    canReverseMovement: false
    reverseMovementReason: 'MOVEMENT_ADMIN_REVIEW_REQUIRED'
  }
  movements: ParticipantMovement[]
  nextPageToken: string | null
}
export const collections = [
  'parties',
  'verifications',
  'restrictions',
  'contributions',
  'evidence',
  'confirmations',
  'proposals',
  'approvals',
  'obligations',
  'movements',
  'allocations',
  'disputes',
  'resolutions',
  'audit',
  'history',
] as const
export type Collection = (typeof collections)[number]
export interface AttemptReceipt {
  status: 'APPLIED' | 'REJECTED' | 'PENDING' | 'UNKNOWN' | 'CLOSED_NO_EFFECTS'
  receipt?: Record<string, unknown> | null
  error?: { code: string; statusCode: number } | null
  canClose?: boolean
}
