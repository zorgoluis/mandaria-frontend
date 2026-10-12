import type {
  Projection,
  Administration,
  Application,
  Receipt,
  Marker,
} from '../customer-business/contract'
export const accountId = '11111111-1111-4111-8111-111111111111'
export const applicationId = '22222222-2222-4222-8222-222222222222'
export const projection: Projection = {
  customerAccountId: accountId,
  businessAccess: {
    state: 'NONE',
    source: null,
    restrictionReason: null,
    canApply: true,
    canDowngrade: false,
    reapplicationBlocked: false,
  },
  businessApplication: null,
}
export const profile = {
  ...projection,
  type: 'PERSONAL' as const,
  displayName: 'Cliente sintético',
  businessName: null,
  revision: 1,
  active: true,
}
export const capabilities = {
  ...projection,
  type: 'PERSONAL' as const,
  allowedShippingPayers: ['REQUESTER' as const],
  defaultShippingPayer: 'REQUESTER' as const,
  capacity: {
    occupied: false,
    activeCount: 0,
    maxActiveRequests: 1,
    activeRequestPublicId: null,
  },
  canPrequote: true,
  canCreateRequest: true,
  reason: null,
}
export const application: Application = {
  id: applicationId,
  status: 'PENDING',
  revision: 1,
  submittedAt: '2026-10-12T12:00:00Z',
  resolvedAt: null,
  snapshot: {
    businessName: 'Negocio sintético',
    activity: 'Panadería',
    city: 'Ciudad sintética',
    estimatedDeliveryVolume: '10 por semana',
    note: null,
  },
  publicReason: null,
}
export const administration: Administration = {
  customerAccount: {
    id: accountId,
    type: 'PERSONAL',
    revision: 1,
    active: true,
    verifiedEmail: 'synthetic@example.test',
    businessAccess: projection.businessAccess,
    activeRequestCount: 0,
  },
  businessAccessAdministration: {
    activeGrant: null,
    lastAdministrativeRevocation: null,
    canRevoke: false,
    canAllowReapplication: false,
  },
}
export function receipt(
  m: Marker,
  outcome: Receipt['outcome'] = 'APPLIED',
): Receipt {
  return {
    key: m.key,
    operation: m.operation,
    outcome,
    code: outcome === 'CLOSED' ? 'BUSINESS_ATTEMPT_CLOSED' : null,
    resourceId: m.target ?? (outcome === 'APPLIED' ? applicationId : null),
    committedAt: '2026-10-12T12:00:00Z',
    result: {
      applicationStatus: outcome === 'APPLIED' ? 'PENDING' : null,
      applicationRevision: outcome === 'APPLIED' ? 1 : null,
      accountRevision: 1,
      accessState: 'NONE',
      accountType: 'PERSONAL',
      grantId: null,
      reapplicationBlocked: false,
    },
  }
}
