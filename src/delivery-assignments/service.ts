import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  AdminDeliveryAssignment,
  AssignmentInput,
  AssignmentWithPayment,
  AvailableDriver,
  AvailableVehicle,
  CancelAssignmentInput,
  DeliveryAssignment,
  ReassignInput,
} from './types'

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const query = queryString(params)
  return query ? `${path}?${query}` : path
}
const dispatchPath = (id: string, action: string) =>
  `/provider/dispatches/${encodeURIComponent(id)}${action}`

/**
 * PROVIDER_ADMIN holding the claim. The provider is derived by the backend from the membership
 * and the Dispatch, never from the payload: providerId only picks among my own memberships.
 * Responses are the authority; the caller must refetch instead of trusting what it sent.
 */
export const deliveryAssignments = {
  assign: (providerId: string, dispatchId: string, input: AssignmentInput) =>
    api<AssignmentWithPayment>(
      withQuery(dispatchPath(dispatchId, '/assignment'), { providerId }),
      'POST',
      input,
    ),
  reassign: (providerId: string, dispatchId: string, input: ReassignInput) =>
    api<AssignmentWithPayment>(
      withQuery(dispatchPath(dispatchId, '/assignment/reassign'), {
        providerId,
      }),
      'POST',
      input,
    ),
  cancel: (
    providerId: string,
    dispatchId: string,
    input: CancelAssignmentInput,
  ) =>
    api<AssignmentWithPayment>(
      withQuery(dispatchPath(dispatchId, '/assignment/cancel'), { providerId }),
      'POST',
      input,
    ),
  /** Newest first; the ACTIVE one, if any, is the current assignment. */
  history: (providerId: string, dispatchId: string, signal?: AbortSignal) =>
    api<DeliveryAssignment[]>(
      withQuery(dispatchPath(dispatchId, '/assignments'), { providerId }),
      'GET',
      undefined,
      signal,
    ),
  availableDrivers: (
    providerId: string,
    dispatchId: string,
    signal?: AbortSignal,
  ) =>
    api<Page<AvailableDriver>>(
      withQuery(dispatchPath(dispatchId, '/available-drivers'), {
        providerId,
        page: 1,
        pageSize: 100,
      }),
      'GET',
      undefined,
      signal,
    ),
  availableVehicles: (
    providerId: string,
    dispatchId: string,
    signal?: AbortSignal,
  ) =>
    api<Page<AvailableVehicle>>(
      withQuery(dispatchPath(dispatchId, '/available-vehicles'), {
        providerId,
        page: 1,
        pageSize: 100,
      }),
      'GET',
      undefined,
      signal,
    ),
}

/** SUPER_ADMIN, read-only audit. There is no administrative assign, reassign or cancel. */
export const adminAssignments = {
  history: (dispatchId: string, signal?: AbortSignal) =>
    api<AdminDeliveryAssignment[]>(
      `/admin/dispatches/${encodeURIComponent(dispatchId)}/assignments`,
      'GET',
      undefined,
      signal,
    ),
}
