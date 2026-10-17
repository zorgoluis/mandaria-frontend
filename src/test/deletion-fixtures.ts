import type { Snapshot } from '../deletion/contract'
import { caseId } from './verification-fixtures'
// Synthetic projection of DocumentDeletionService.view; no storage or real subject.
export const deletionFixture: Snapshot = {
  id: caseId,
  scope: 'ACCOUNT',
  status: 'DELETING',
  revision: 3,
  receivedAt: '2026-10-16T12:00:00.000Z',
  confirmedAt: '2026-10-16T12:01:00.000Z',
  deadline: '2026-11-16T12:01:00.000Z',
  replacementDeadline: null,
  closedAt: null,
  auditUntil: null,
  contactUntil: null,
  irreversibleStarted: true,
  blockingReason: 'WRITER_QUIESCENCE_NOT_VERIFIED',
  providerBackups: 'NOT_ATTESTED',
  productionReady: false,
  completedDocumentaryScopes: 0,
  pendingActions: [
    { kind: 'MIXED_REPLACEMENT', dueAt: '2026-10-20T12:00:00.000Z' },
  ],
}
export const partialFixture: Snapshot = {
  ...deletionFixture,
  completedDocumentaryScopes: 1,
  evidenceLevel: 'PARTIAL_CONTROLLED_SUBSCOPES',
  fullErasureAttested: false,
}
