import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Scope, Capacity } from './types'

export function scopedPath(
  scope: Scope,
  resource: string,
  params: Record<string, string | number | undefined> = {},
) {
  const prefix =
    scope.role === 'SUPER_ADMIN'
      ? `/admin/providers/${encodeURIComponent(scope.providerId)}`
      : '/provider'
  const query = queryString({
    ...params,
    ...(scope.role === 'PROVIDER_ADMIN'
      ? { providerId: scope.providerId }
      : {}),
  })
  return `${prefix}/${resource}${query ? `?${query}` : ''}`
}
export const capacity = (scope: Scope, signal?: AbortSignal) =>
  api<Capacity>(scopedPath(scope, 'capacity'), 'GET', undefined, signal)
