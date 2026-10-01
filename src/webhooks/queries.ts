import { queryOptions } from '@tanstack/react-query'
import { queryClient } from '../services/query'
import { webhooks } from './service'
import type { EventFilters } from './types'
export const webhookQueries = {
  endpoint: (id: string) =>
    queryOptions({
      queryKey: ['webhooks', id, 'endpoint'],
      queryFn: ({ signal }) => webhooks.endpoint(id, signal),
      retry: false,
      staleTime: 0,
    }),
  summary: (id: string) =>
    queryOptions({
      queryKey: ['webhooks', id, 'summary'],
      queryFn: ({ signal }) => webhooks.summary(id, signal),
      retry: false,
    }),
  events: (id: string, filters: EventFilters) =>
    queryOptions({
      queryKey: ['webhooks', id, 'events', filters],
      queryFn: ({ signal }) => webhooks.events(id, filters, signal),
      retry: false,
    }),
  event: (client: string, id: string) =>
    queryOptions({
      queryKey: ['webhooks', client, 'event', id],
      queryFn: ({ signal }) => webhooks.event(id, signal),
      retry: false,
    }),
  health: () =>
    queryOptions({
      queryKey: ['webhooks', 'health'],
      queryFn: ({ signal }) => webhooks.health(signal),
      retry: false,
    }),
}
export const refreshWebhooks = () =>
  queryClient.invalidateQueries({ queryKey: ['webhooks'] })
