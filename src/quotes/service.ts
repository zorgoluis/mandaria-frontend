import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type { DeliveryQuote, QuoteFilters } from './types'

const base = '/admin/delivery-quotes'
export const deliveryQuotes = {
  list: (filters: QuoteFilters, signal?: AbortSignal) => {
    const query = queryString({ ...filters })
    return api<Page<DeliveryQuote>>(
      `${base}${query ? `?${query}` : ''}`,
      'GET',
      undefined,
      signal,
    )
  },
  get: (publicId: string, signal?: AbortSignal) =>
    api<DeliveryQuote>(
      `${base}/${encodeURIComponent(publicId)}`,
      'GET',
      undefined,
      signal,
    ),
  /** Quote history of any delivery request, newest first. */
  forRequest: (
    requestPublicId: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ) =>
    api<Page<DeliveryQuote>>(
      `/admin/delivery-requests/${encodeURIComponent(requestPublicId)}/quotes?${queryString({ page, pageSize })}`,
      'GET',
      undefined,
      signal,
    ),
}
