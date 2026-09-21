import { queryClient } from '../services/query'

export const driverKeys = {
  all: ['driver-portal'] as const,
  me: ['driver-portal', 'me'] as const,
  vehicles: ['driver-portal', 'vehicles'] as const,
  available: (page: number) => ['driver-portal', 'available', page] as const,
  dispatch: (id: string) => ['driver-portal', 'dispatch', id] as const,
}

/**
 * Several drivers and providers compete for the same dispatch, so a successful take or release
 * is never treated as the truth. Everything the portal shows is read back from the backend:
 * the driver's own state, the available list and the dispatch itself.
 */
export async function refreshDriverPortal(dispatchId?: string) {
  await queryClient.invalidateQueries({ queryKey: driverKeys.all })
  await Promise.all([
    queryClient.refetchQueries({ queryKey: driverKeys.me }),
    ...(dispatchId
      ? [
          queryClient.refetchQueries({
            queryKey: driverKeys.dispatch(dispatchId),
          }),
        ]
      : []),
  ])
}
