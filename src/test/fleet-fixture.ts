import type {
  FleetPage,
  OperationContext,
  OperationMode,
  Participation,
} from '../fleet/types'
export function fleetContext(
  operationMode: OperationMode = 'ADMIN_DISPATCH',
): OperationContext {
  const historical = ['ADMIN_DISPATCH', 'DRAINING'].includes(operationMode)
  return {
    operationMode,
    revision: '3',
    capabilities: {
      canManageResources: true,
      canObserveServices: true,
      canClaim: operationMode === 'ADMIN_DISPATCH',
      canAssign: historical,
      canReassign: historical,
      canRelease: historical,
      canDeliver: historical,
      canMutateIncidents: historical,
    },
  }
}
export const segment: Participation = {
  assignmentId: 'assignment-1',
  dispatchId: 'dispatch',
  reference: 'MDQ-SYNTHETIC',
  status: 'REASSIGNED',
  driver: { id: 'driver', name: null },
  vehicle: { id: 'vehicle', identifier: null },
  assignedAt: '2026-10-22T10:00:00Z',
  endedAt: '2026-10-22T11:00:00Z',
  zone: { id: 'zone', name: 'Zona sintética' },
  events: [{ kind: 'ADVANCED', phase: 2, recordedAt: '2026-10-22T10:30:00Z' }],
  incidents: [{ id: 'incident', resolvedAt: null }],
  deliveryFee: { amount: '45.00', currency: 'MXN' },
  credits: [
    {
      id: 'credit',
      type: 'DEBIT',
      amount: -2,
      createdAt: '2026-10-22T10:00:00Z',
    },
  ],
}
export const fleetPage = (
  items: Participation[] = [segment],
  nextPageToken: string | null = null,
): FleetPage => ({ items, nextPageToken, serverTime: '2026-10-23T12:00:00Z' })
