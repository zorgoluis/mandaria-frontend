import { api } from '../services/api'
import { scopedPath } from '../logistics/service'
import type { Page } from '../types/api'
import type { Assignment, Scope } from '../logistics/types'
export const assignments = {
  assign: (scope: Scope, driverId: string, vehicleId: string) =>
    api<Assignment>(
      scopedPath(scope, `drivers/${encodeURIComponent(driverId)}/vehicle`),
      'POST',
      { vehicleId },
    ),
  unassign: (scope: Scope, driverId: string) =>
    api<Assignment>(
      scopedPath(scope, `drivers/${encodeURIComponent(driverId)}/vehicle`),
      'DELETE',
    ),
  history: (
    scope: Scope,
    kind: 'drivers' | 'vehicles',
    id: string,
    page: number,
    signal?: AbortSignal,
  ) =>
    api<Page<Assignment>>(
      scopedPath(scope, `${kind}/${encodeURIComponent(id)}/assignments`, {
        page,
        pageSize: 20,
      }),
      'GET',
      undefined,
      signal,
    ),
}
