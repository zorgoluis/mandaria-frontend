import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../services/query'
import { capacity } from './service'
import type { Scope } from './types'
export const logisticsKey = (scope: Scope) =>
  ['logistics', scope.role, scope.providerId] as const
export const useCapacity = (scope: Scope) =>
  useQuery({
    queryKey: [...logisticsKey(scope), 'capacity'],
    queryFn: ({ signal }) => capacity(scope, signal),
  })
export async function invalidateLogistics(scope: Scope) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: logisticsKey(scope) }),
    queryClient.invalidateQueries({ queryKey: ['providers'] }),
  ])
}
