import { queryClient } from '../services/query'
import { dispatchKeys } from '../dispatch/queries'

export const assignmentKeys = {
  all: ['delivery-assignments'] as const,
  dispatch: (providerId: string, dispatchId: string) =>
    ['delivery-assignments', providerId, dispatchId] as const,
  history: (providerId: string, dispatchId: string) =>
    ['delivery-assignments', providerId, dispatchId, 'history'] as const,
  drivers: (providerId: string, dispatchId: string) =>
    ['delivery-assignments', providerId, dispatchId, 'drivers'] as const,
  vehicles: (providerId: string, dispatchId: string) =>
    ['delivery-assignments', providerId, dispatchId, 'vehicles'] as const,
  admin: (dispatchId: string) =>
    ['delivery-assignments', 'admin', dispatchId] as const,
}

/**
 * The backend is the only authority on which assignment is ACTIVE. Two administrators can
 * reassign concurrently and both get a 200, so a successful response never proves that what this
 * browser sent is still the active one. Every mutation refetches the dispatch, the history and
 * both availability lists before the UI renders anything.
 */
export async function refreshAfterAssignment(
  providerId: string,
  dispatchId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dispatchKeys.provider(providerId),
    }),
    queryClient.invalidateQueries({
      queryKey: assignmentKeys.dispatch(providerId, dispatchId),
    }),
    queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  ])
  // Awaiting the refetch keeps the dialog open until the real state is on screen.
  await Promise.all([
    queryClient.refetchQueries({
      queryKey: dispatchKeys.providerDetail(providerId, dispatchId),
    }),
    queryClient.refetchQueries({
      queryKey: assignmentKeys.history(providerId, dispatchId),
    }),
  ])
}
