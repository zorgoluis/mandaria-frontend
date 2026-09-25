import { queryClient } from '../services/query'
import type { LedgerFilters } from './types'

export const creditKeys = {
  all: ['credits'] as const,
  account: (scope: string, ownerId: string) =>
    ['credits', scope, ownerId, 'account'] as const,
  ledger: (scope: string, ownerId: string, filters: LedgerFilters) =>
    ['credits', scope, ownerId, 'ledger', filters] as const,
}
/**
 * The balance shown after a movement always comes back from the backend: a recharge or an
 * adjustment invalidates the account and its ledger instead of patching a local number.
 */
export const refreshCredits = (scope: string, ownerId: string) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: creditKeys.account(scope, ownerId),
    }),
    queryClient.invalidateQueries({
      queryKey: ['credits', scope, ownerId, 'ledger'],
    }),
  ])
