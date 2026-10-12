// Internal human contract: backend QA 9ad39b9; never exported to the public portal.
export type ApplicationStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type Operation =
  | 'SUBMIT'
  | 'WITHDRAW'
  | 'DOWNGRADE'
  | 'DECIDE'
  | 'REVOKE'
  | 'ALLOW_REAPPLICATION'
export interface BusinessAccess {
  state: 'NONE' | 'REVIEW_REQUIRED' | 'ACTIVE' | 'RESTRICTED'
  source: 'MANUAL_ADMIN' | 'LEGACY_REVIEW' | null
  restrictionReason: 'REVIEW_REQUIRED' | 'REJECTED' | 'REVOKED' | null
  canApply: boolean
  canDowngrade: boolean
  reapplicationBlocked: boolean
}
export interface Projection {
  customerAccountId: string
  businessAccess: BusinessAccess
  businessApplication: {
    id: string
    status: ApplicationStatus
    revision: number
  } | null
}
// Old servers may omit the projection. Only unrelated operations can continue then.
export type CompatibleProjection = Partial<Projection>
export function hasBusinessContract(
  value: CompatibleProjection | undefined,
): value is Projection {
  const a = value?.businessAccess
  const s = value?.businessApplication
  return (
    !!value?.customerAccountId &&
    !!a &&
    ['NONE', 'REVIEW_REQUIRED', 'ACTIVE', 'RESTRICTED'].includes(a.state) &&
    [null, 'MANUAL_ADMIN', 'LEGACY_REVIEW'].includes(a.source) &&
    [null, 'REVIEW_REQUIRED', 'REJECTED', 'REVOKED'].includes(
      a.restrictionReason,
    ) &&
    typeof a.canApply === 'boolean' &&
    typeof a.canDowngrade === 'boolean' &&
    typeof a.reapplicationBlocked === 'boolean' &&
    (s === null ||
      (!!s?.id &&
        ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'].includes(s.status) &&
        Number.isInteger(s.revision) &&
        s.revision >= 1))
  )
}
export interface Application {
  id: string
  status: ApplicationStatus
  revision: number
  submittedAt: string
  resolvedAt: string | null
  snapshot: {
    businessName: string
    activity: string
    city: string
    estimatedDeliveryVolume: string
    note: string | null
  }
  publicReason: string | null
}
export interface Administration {
  customerAccount: {
    id: string
    type: 'PERSONAL' | 'BUSINESS'
    revision: number
    active: boolean
    verifiedEmail: string | null
    businessAccess: BusinessAccess
    activeRequestCount: number
  }
  businessAccessAdministration: {
    activeGrant: { id: string; applicationId: string; grantedAt: string } | null
    lastAdministrativeRevocation: {
      grantId: string
      revokedAt: string
      publicReason: string | null
      reapplicationAllowedAt: string | null
    } | null
    canRevoke: boolean
    canAllowReapplication: boolean
  }
}
export type AdminApplication = Application &
  Administration & {
    decisionActorId: string | null
    internalNote: string | null
  }
export interface BusinessPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
export interface Receipt {
  key: string
  operation: Operation
  outcome: 'APPLIED' | 'REJECTED' | 'CLOSED'
  code: string | null
  resourceId: string | null
  committedAt: string
  result: {
    applicationStatus: string | null
    applicationRevision: number | null
    accountRevision: number | null
    accessState: string | null
    accountType: string | null
    grantId: string | null
    reapplicationBlocked: boolean | null
  }
}
export interface Attempt {
  state: 'NOT_OBSERVED' | 'APPLIED' | 'REJECTED' | 'CLOSED'
  receipt: Receipt | null
}
export type Submit = {
  expectedAccountRevision: number
  businessName: string
  activity: string
  city: string
  estimatedDeliveryVolume: string
  note?: string
}
export type Decision = {
  decision: 'APPROVE' | 'REJECT'
  expectedApplicationRevision: number
  expectedAccountRevision: number
  publicReason?: string
  internalNote?: string
}
export type Revoke = {
  grantId: string
  expectedAccountRevision: number
  publicReason: string
  internalNote?: string
}
export type Allow = {
  revokedGrantId: string
  expectedAccountRevision: number
  publicReason: string
  internalNote?: string
}
export type Intention =
  | { operation: 'SUBMIT'; body: Submit; target?: never }
  | {
      operation: 'WITHDRAW'
      target: string
      body: { expectedApplicationRevision: number }
    }
  | {
      operation: 'DOWNGRADE'
      target: string
      body: { type: 'PERSONAL'; expectedRevision: number }
    }
  | { operation: 'DECIDE'; target: string; body: Decision }
  | { operation: 'REVOKE'; target: string; body: Revoke }
  | { operation: 'ALLOW_REAPPLICATION'; target: string; body: Allow }
export interface Marker {
  actor: string
  account: string
  operation: Operation
  key: string
  target?: string
}
export const isAdmin = (op: Operation) =>
  ['DECIDE', 'REVOKE', 'ALLOW_REAPPLICATION'].includes(op)
export const applicationLabels: Record<ApplicationStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  WITHDRAWN: 'Retirada',
}
export const accessLabels: Record<BusinessAccess['state'], string> = {
  NONE: 'Sin acceso Negocio',
  REVIEW_REQUIRED: 'Revisión obligatoria',
  ACTIVE: 'Acceso Negocio activo',
  RESTRICTED: 'Acceso restringido',
}
