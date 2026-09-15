import { api } from '../services/api'
import { scopedPath } from '../logistics/service'
import type { Page } from '../types/api'
import type {
  Driver,
  DriverInput,
  DriverStatus,
  DriverFilters,
  Scope,
} from '../logistics/types'
export const drivers = {
  list: (scope: Scope, filters: DriverFilters, signal?: AbortSignal) =>
    api<Page<Driver>>(
      scopedPath(scope, 'drivers', { ...filters }),
      'GET',
      undefined,
      signal,
    ),
  get: (scope: Scope, id: string, signal?: AbortSignal) =>
    api<Driver>(
      scopedPath(scope, `drivers/${encodeURIComponent(id)}`),
      'GET',
      undefined,
      signal,
    ),
  create: (scope: Scope, data: DriverInput) =>
    api<Driver>(scopedPath(scope, 'drivers'), 'POST', data),
  update: (
    scope: Scope,
    id: string,
    data: { name?: string; status?: DriverStatus },
  ) =>
    api<Driver>(
      scopedPath(scope, `drivers/${encodeURIComponent(id)}`),
      'PATCH',
      data,
    ),
}
