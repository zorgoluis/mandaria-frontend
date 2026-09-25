import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  AdminDispatch,
  AdminDispatchFilters,
  ProviderDispatch,
  ProviderDispatchFilters,
} from './types'

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const query = queryString(params)
  return query ? `${path}?${query}` : path
}
const item = (id: string, action = '') =>
  `/provider/dispatches/${encodeURIComponent(id)}${action}`

/**
 * PROVIDER_ADMIN. providerId only selects among the user's own memberships; the backend
 * membership guard is the authority. Claim sends no body: the provider never comes from payload.
 */
export const providerDispatches = {
  list: (
    providerId: string,
    filters: ProviderDispatchFilters,
    signal?: AbortSignal,
  ) =>
    api<Page<ProviderDispatch>>(
      withQuery('/provider/dispatches', { ...filters, providerId }),
      'GET',
      undefined,
      signal,
    ),
  get: (providerId: string, id: string, signal?: AbortSignal) =>
    api<ProviderDispatch>(
      withQuery(item(id), { providerId }),
      'GET',
      undefined,
      signal,
    ),
  claim: (providerId: string, id: string) =>
    api<ProviderDispatch>(
      withQuery(item(id, '/claim'), { providerId }),
      'POST',
    ),
  /**
   * V1.11: no body at all. The backend rejects any field: who confirms comes from the JWT and
   * the timestamp from the server. DELIVERED is terminal, so there is no undo call.
   */
  deliver: (providerId: string, id: string) =>
    api<ProviderDispatch>(
      withQuery(item(id, '/deliver'), { providerId }),
      'POST',
    ),
  release: (providerId: string, id: string, reason: string) =>
    api<ProviderDispatch>(
      withQuery(item(id, '/release'), { providerId }),
      'POST',
      { reason },
    ),
}

/** SUPER_ADMIN, read-only audit. There is no admin claim or release in the API. */
export const adminDispatches = {
  list: (filters: AdminDispatchFilters, signal?: AbortSignal) =>
    api<Page<AdminDispatch>>(
      withQuery('/admin/dispatches', { ...filters }),
      'GET',
      undefined,
      signal,
    ),
  get: (id: string, signal?: AbortSignal) =>
    api<AdminDispatch>(
      `/admin/dispatches/${encodeURIComponent(id)}`,
      'GET',
      undefined,
      signal,
    ),
}
