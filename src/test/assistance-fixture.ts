import type { CaseDetail, Scope } from '../assistance/types'
export const ids = {
  case: '11111111-1111-4111-8111-111111111111',
  assignment: '22222222-2222-4222-8222-222222222222',
  dispatch: '33333333-3333-4333-8333-333333333333',
  party: '44444444-4444-4444-8444-444444444444',
  evidence: '55555555-5555-4555-8555-555555555555',
  proposal: '66666666-6666-4666-8666-666666666666',
  obligation: '77777777-7777-4777-8777-777777777777',
}
export const scope: Scope = {
  actor: 'owner',
  surface: 'provider',
  providerId: 'provider',
}
// Mirrors AssistanceService.read/summary, including deliberately absent names/references.
export function assistanceDetail(admin = false): CaseDetail {
  return {
    summary: {
      id: ids.case,
      assignmentId: ids.assignment,
      dispatchId: ids.dispatch,
      status: 'OPEN',
      operationalState: 'ENTREGA_ACREDITADA',
      economicState: 'EN_DISPUTA',
      revision: '3',
      updatedAt: '2026-10-23T12:00:00.000Z',
      restrictions: [
        { id: ids.evidence, scope: 'TAKE_BOTH', publicReason: 'CASH_REVIEW' },
      ],
      capabilities: {
        canContribute: true,
        canDeclareMovement: true,
        canDispute: true,
        canReview: admin,
        canApply: admin,
      },
    },
    participation: {
      assignmentId: ids.assignment,
      providerName: null,
      driverDisplayName: null,
      startedAt: '2026-10-23T10:00:00.000Z',
      endedAt: null,
    },
    economics: [
      {
        obligationId: ids.obligation,
        concept: 'GOODS',
        currency: 'MXN',
        expectedAmount: null,
        creditedAmount: '25.00',
        remainingAmount: null,
        state: 'EN_DISPUTA',
      },
    ],
    history: [
      {
        id: ids.party,
        type: 'CONTRIBUTE',
        recordedAt: '2026-10-23T12:00:00.000Z',
        publicReason: 'CASE_UPDATED',
      },
    ],
    nextHistoryPageToken: null,
    ...(admin
      ? {
          materialRevision: '2',
          collections: {
            parties: {
              items: [
                {
                  id: ids.party,
                  kind: 'DRIVER',
                  label: 'Conductor histórico',
                  userId: 'driver-user',
                },
              ],
              nextPageToken: null,
              asOf: '2026-10-23T12:00:00.000Z',
            },
            proposals: {
              items: [
                {
                  id: ids.proposal,
                  type: 'ACCREDIT_DELIVERY',
                  status: 'READY',
                  revision: '0',
                  snapshotHash: 'a'.repeat(64),
                },
              ],
              nextPageToken: null,
              asOf: '2026-10-23T12:00:00.000Z',
            },
          },
        }
      : {}),
  }
}
