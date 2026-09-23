import { queryClient } from '../services/query'
import type { PolicyFilters } from './types'

export const policyKeys = {
  all: ['credit-policies'] as const,
  list: (filters: PolicyFilters) =>
    ['credit-policies', 'list', filters] as const,
  detail: (id: string) => ['credit-policies', 'detail', id] as const,
  calculation: (input: object) =>
    ['credit-policies', 'calculation', input] as const,
}
/**
 * Creating a version replaces the ACTIVE one, so the whole tree is read back: a stale list would
 * show two versions as current and a stale detail would invite a second version from a replaced id.
 */
export const refreshPolicies = () =>
  queryClient.invalidateQueries({ queryKey: policyKeys.all })
