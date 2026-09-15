import { api } from '../services/api'
import { scopedPath } from '../logistics/service'
import type { Page } from '../types/api'
import type {
  Vehicle,
  VehicleInput,
  VehicleFilters,
  Scope,
} from '../logistics/types'
export const vehicles = {
  list: (scope: Scope, filters: VehicleFilters, signal?: AbortSignal) =>
    api<Page<Vehicle>>(
      scopedPath(scope, 'vehicles', { ...filters }),
      'GET',
      undefined,
      signal,
    ),
  get: (scope: Scope, id: string, signal?: AbortSignal) =>
    api<Vehicle>(
      scopedPath(scope, `vehicles/${encodeURIComponent(id)}`),
      'GET',
      undefined,
      signal,
    ),
  create: (scope: Scope, data: VehicleInput) =>
    api<Vehicle>(scopedPath(scope, 'vehicles'), 'POST', data),
  update: (scope: Scope, id: string, data: Partial<VehicleInput>) =>
    api<Vehicle>(
      scopedPath(scope, `vehicles/${encodeURIComponent(id)}`),
      'PATCH',
      data,
    ),
}
