import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  DeliveryRequest,
  DeliveryRequestFilters,
  DeliveryRequestSummary,
} from './types'
const base = '/admin/delivery-requests'
export const deliveryRequests = {
  list: (filters: DeliveryRequestFilters, signal?: AbortSignal) => {
    const query = queryString({ ...filters })
    return api<Page<DeliveryRequestSummary>>(
      `${base}${query ? `?${query}` : ''}`,
      'GET',
      undefined,
      signal,
    )
  },
  get: (publicId: string, signal?: AbortSignal) =>
    api<DeliveryRequest>(
      `${base}/${encodeURIComponent(publicId)}`,
      'GET',
      undefined,
      signal,
    ),
  cancel: (publicId: string, reason: string) =>
    api<DeliveryRequest>(
      `${base}/${encodeURIComponent(publicId)}/cancel`,
      'POST',
      { reason },
    ),
}
