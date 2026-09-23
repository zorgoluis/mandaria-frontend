import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  CalculationInput,
  CreditCost,
  CreditPolicy,
  PolicyFilters,
  PolicyInput,
  PolicyVersionInput,
} from './types'

const base = '/admin/credit-policies'
const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const query = queryString(params)
  return query ? `${path}?${query}` : path
}

/**
 * SUPER_ADMIN only. Versions are immutable: the API has no PATCH and no DELETE, so the web
 * offers "create a new version" instead of editing, and never reactivates an INACTIVE version.
 */
export const creditPolicies = {
  list: (filters: PolicyFilters, signal?: AbortSignal) =>
    api<Page<CreditPolicy>>(
      withQuery(base, { ...filters }),
      'GET',
      undefined,
      signal,
    ),
  get: (id: string, signal?: AbortSignal) =>
    api<CreditPolicy>(
      `${base}/${encodeURIComponent(id)}`,
      'GET',
      undefined,
      signal,
    ),
  /** Version 1 of a combination that has no policy yet; an existing one answers 409. */
  create: (input: PolicyInput) => api<CreditPolicy>(base, 'POST', input),
  /** New version from the ACTIVE one; if it was already replaced the backend answers 409. */
  createVersion: (activeId: string, input: PolicyVersionInput) =>
    api<CreditPolicy>(
      `${base}/${encodeURIComponent(activeId)}/versions`,
      'POST',
      input,
    ),
  /** The cost always comes from the backend: the web never runs its own policy engine. */
  calculate: (input: CalculationInput, signal?: AbortSignal) =>
    api<CreditCost>(
      withQuery(`${base}/calculation`, { ...input }),
      'GET',
      undefined,
      signal,
    ),
}
