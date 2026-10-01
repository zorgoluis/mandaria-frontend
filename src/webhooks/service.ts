import { api, apiOnce } from '../services/api'
import { ApiError } from '../services/errors'
import { queryString } from '../services/query'
import type {
  EndpointInput,
  EventFilters,
  EventPage,
  WebhookDetail,
  WebhookEndpoint,
  WebhookHealth,
  WebhookSecret,
  WebhookSummary,
} from './types'
const base = (id: string) =>
  `/admin/integrations/${encodeURIComponent(id)}/webhook`
export const webhooks = {
  async endpoint(id: string, signal?: AbortSignal) {
    try {
      return await api<WebhookEndpoint>(base(id), 'GET', undefined, signal)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },
  save: (id: string, data: EndpointInput) =>
    api<WebhookEndpoint>(base(id), 'PUT', data),
  issue: (id: string, signal?: AbortSignal) =>
    apiOnce<WebhookSecret>(`${base(id)}/secret`, 'POST', undefined, signal),
  summary: (id: string, signal?: AbortSignal) =>
    api<WebhookSummary>(`${base(id)}/summary`, 'GET', undefined, signal),
  events: (id: string, filters: EventFilters, signal?: AbortSignal) =>
    api<EventPage>(
      `/admin/b2b-events?${queryString({ ...filters, integrationClientId: id, pageSize: 20 })}`,
      'GET',
      undefined,
      signal,
    ),
  event: (id: string, signal?: AbortSignal) =>
    api<WebhookDetail>(
      `/admin/b2b-events/${encodeURIComponent(id)}`,
      'GET',
      undefined,
      signal,
    ),
  health: (signal?: AbortSignal) =>
    api<WebhookHealth>('/admin/webhooks/health', 'GET', undefined, signal),
}
