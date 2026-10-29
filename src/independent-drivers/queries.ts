import { queryClient } from '../services/query'

export const independentKeys = {
  all: ['independent-drivers'] as const,
  list: (filters: object) => ['independent-drivers', 'list', filters] as const,
  detail: (driverId: string) =>
    ['independent-drivers', 'detail', driverId] as const,
  vehicles: (driverId: string) =>
    ['independent-drivers', 'vehicles', driverId] as const,
}
/** No sockets in V1.9: every administrative change is read back from the backend. */
export const refreshIndependent = (driverId?: string) =>
  Promise.all([
    ...[
      'driver-portal',
      'fleet-exit',
      'independent-offer-zones',
      'fleet',
      'drivers',
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    queryClient.invalidateQueries({ queryKey: independentKeys.all }),
    ...(driverId
      ? [
          queryClient.refetchQueries({
            queryKey: independentKeys.detail(driverId),
          }),
        ]
      : []),
  ])
