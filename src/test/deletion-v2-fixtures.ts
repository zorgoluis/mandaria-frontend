import type { Snapshot, Task, WorkItem } from '../deletion/contract'
import { deletionFixture } from './deletion-fixtures'
import { actor, resource, caseId } from './verification-fixtures'
// Synthetic values, shapes from service.view/progress/tasks/workItems and
// operational-cleanup.e2e-spec (delayed observations, post-H, selective review).
export const operationalFixture: Snapshot = {
  ...deletionFixture,
  receivedAt: '2027-02-01T11:59:00.000Z',
  confirmedAt: '2027-02-01T12:00:00.000Z',
  cleanupPolicy: 'OPERATIONAL_RECONCILIATION_V2',
  authorizationState: 'ACTIVE',
  authorizationGeneration: 1,
  incidentPending: false,
  complianceOverdue: false,
  blockingReason: null,
  pendingActions: [],
  deadline: '2027-02-08T12:00:00.000Z',
  lastReviewAt: '2027-02-02T12:00:00.000Z',
  nextReviewAt: '2027-02-03T12:00:00.000Z',
  surveillanceEndsAt: '2027-02-09T12:00:00.000Z',
}
export const operationalItem: WorkItem = {
  id: resource,
  attachmentId: caseId,
  caseId,
  classification: 'DELETE',
  status: 'PENDING',
  attempts: 1,
  retryAt: null,
  errorCode: null,
  baselineAt: '2027-02-01T12:00:00.000Z',
  reviewStep: 1,
  nextReviewAt: '2027-02-01T13:00:00.000Z',
  lastReviewedAt: '2027-02-01T12:15:00.000Z',
  finalVerifiedAt: null,
  watchUntil: null,
  incidentCode: null,
  incidentAt: null,
}
export const secondGate = '99999999-9999-4999-8999-999999999999'
export const restrictionTask: Task = {
  id: caseId,
  kind: 'RESTRICTION_REVIEW',
  status: 'ACKNOWLEDGED',
  dueAt: null,
  ownerId: actor,
  deputyId: resource,
  restrictions: [
    {
      id: resource,
      kind: 'SUBJECT',
      active: true,
      reviewReason: null,
      reviewedAt: null,
      reviewDueAt: null,
    },
    {
      id: secondGate,
      kind: 'USER',
      active: true,
      reviewReason: null,
      reviewedAt: null,
      reviewDueAt: null,
    },
  ],
}
// Presentation-only cases: the contract exposes the last decision, not a history.
export const restrictionReviewNow = '2027-02-04T12:00:00.000Z'
export const restrictionPresentation: Task = {
  ...restrictionTask,
  dueAt: '2027-02-05T12:00:00.000Z',
  restrictions: [
    { ...restrictionTask.restrictions![0], kind: 'DRIVER' },
    {
      ...restrictionTask.restrictions![1],
      reviewReason: 'Conservación sintética con seguimiento',
      reviewedAt: '2027-02-03T12:00:00.000Z',
      reviewDueAt: '2027-02-05T12:00:00.000Z',
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      kind: 'SUBJECT',
      active: false,
      reviewReason: 'Retirada sintética de esta restricción',
      reviewedAt: '2027-02-03T12:00:00.000Z',
      reviewDueAt: null,
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      kind: 'PROVIDER',
      active: true,
      reviewReason: 'Conservación sintética pendiente de seguimiento',
      reviewedAt: '2027-02-02T12:00:00.000Z',
      reviewDueAt: '2027-02-03T12:00:00.000Z',
    },
  ],
}
