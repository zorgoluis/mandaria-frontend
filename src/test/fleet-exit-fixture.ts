import type { Scope, Context, Detail, Receipt } from '../fleet-exit/types'
export const eid = {
  provider: '10000000-0000-4000-8000-000000000001',
  driver: '10000000-0000-4000-8000-000000000002',
  affiliation: '10000000-0000-4000-8000-000000000003',
  exit: '10000000-0000-4000-8000-000000000004',
  key: '10000000-0000-4000-8000-000000000005',
}
export const exitScope: Scope = {
  actor: 'owner',
  surface: 'provider',
  providerId: eid.provider,
}
export const exitDetail = (): Detail => ({
  id: eid.exit,
  affiliationId: eid.affiliation,
  driverId: eid.driver,
  providerId: eid.provider,
  status: 'PENDING',
  revision: '9007199254740993',
  requestedAt: '2026-10-24T12:00:00.000Z',
  completedAt: null,
  initiatedByKinds: ['DRIVER_REQUEST'],
  blockers: [{ code: 'ACTIVE_ASSIGNMENT' }],
  hasPendingEconomics: true,
  capabilities: { canRecheck: true, recheckReason: null },
  lastEvaluatedAt: null,
  notices: [],
})
export const exitContext = (): Context => ({
  schemaVersion: 1,
  serverTime: '2026-10-24T12:00:00.000Z',
  affiliation: {
    id: eid.affiliation,
    driverId: eid.driver,
    providerId: eid.provider,
    state: 'ACTIVE',
    revision: '9007199254740993',
    startedAt: null,
    observedAt: '2026-10-24T12:00:00.000Z',
  },
  exit: null,
  capabilities: { canRequestExit: true, requestExitReason: null },
})
export const exitReceipt = (key = eid.key): Receipt => ({
  schemaVersion: 1,
  receiptId: eid.key,
  key,
  operation: 'START',
  resourceType: 'AFFILIATION',
  resourceId: eid.affiliation,
  status: 'APPLIED',
  exitId: eid.exit,
  exitRevision: '9007199254740993',
  exitStatus: 'PENDING',
  appliedAt: '2026-10-24T12:00:00.000Z',
})
