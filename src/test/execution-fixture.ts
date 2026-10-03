import type {
  Execution,
  ExecutionDetail,
  IncidentDetail,
} from '../execution/types'
import type { ProviderDispatch } from '../dispatch/types'
export const dispatchFixture: ProviderDispatch = {
  id: 'dispatch',
  status: 'CLAIMED',
  access: 'OWNER',
  serviceType: 'LOCAL_DELIVERY',
  serviceZone: { code: 'TEST', name: 'Zona sintética' },
  openedAt: '2026-10-02T12:00:00Z',
  expiresAt: '2026-10-02T13:00:00Z',
  claimedByMe: true,
  claimedAt: '2026-10-02T12:00:00Z',
  cancelledAt: null,
  myCandidate: null,
  service: null,
  assignment: null,
  assignmentDeadline: null,
  assignmentOverdue: false,
  creditCost: null,
  deliveredAt: null,
}
export const executionFixture: Execution = {
  trackingMode: 'DETAILED',
  revision: 4,
  phase: 'PICKED_UP',
  activeAssignmentId: '11111111-1111-4111-8111-111111111111',
  custodyStatus: 'HELD',
  openIncidentId: null,
  allowedActions: ['ADVANCE', 'REPORT_INCIDENT'],
  lastRecordedAt: '2026-10-02T12:00:00Z',
}
export const detailFixture: ExecutionDetail = {
  execution: executionFixture,
  events: {
    items: [
      {
        kind: 'ADVANCED',
        phase: 3,
        revision: 4,
        assignmentId: executionFixture.activeAssignmentId!,
        actorUserId: 'synthetic-operator',
        actorRole: 'PROVIDER_ADMIN',
        source: 'PHONE_REPORT',
        recordedAt: '2026-10-02T12:00:00Z',
      },
    ],
    total: 21,
    totalPages: 2,
    page: 1,
    pageSize: 20,
  },
}
export const incidentFixture: IncidentDetail = {
  incident: {
    id: 'incident',
    dispatchId: 'dispatch',
    assignmentId: executionFixture.activeAssignmentId!,
    chainId: 'chain',
    reportedByUserId: 'synthetic-operator',
    reasonCode: 'VEHICLE_FAILURE',
    reasonDetail: 'Vehículo detenido en lugar seguro.',
    reportedAt: '2026-10-02T12:05:00Z',
    resolvedAt: null,
  },
  resolution: null,
}
