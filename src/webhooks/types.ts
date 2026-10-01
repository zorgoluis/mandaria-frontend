import type { Page } from '../types/api'
export interface WebhookEndpoint {
  id: string
  integrationClientId: string
  url: string
  enabled: boolean
  secretConfigured: boolean
  secretSetAt: string | null
  deliverFrom: string
  createdAt: string
  updatedAt: string
}
export type EndpointInput = Pick<WebhookEndpoint, 'url' | 'enabled'>
export interface WebhookSecret {
  secret: string
  secretSetAt: string
  algorithm: string
  signatureHeader: string
  signedMessage: string
  note: string
}
export type TransportState =
  'PENDING' | 'DELIVERED' | 'EXHAUSTED' | 'NO_DELIVERY'
export type NoDeliveryReason =
  'NO_ENDPOINT' | 'BEFORE_BOUNDARY' | 'NOT_YET_PICKED_UP'
export interface WebhookEvent {
  eventId: string
  type: string
  integrationClientId: string
  deliveryRequestPublicId: string
  externalReference: string | null
  occurredAt: string
  transportState: TransportState
  noDeliveryReason: NoDeliveryReason | null
  attemptCount: number
  nextAttemptAt: string | null
  inFlight: boolean
}
export interface WebhookAttempt {
  id: string
  attemptNumber: number | null
  attemptedAt: string
  result: 'SUCCEEDED' | 'FAILED'
  httpStatus: number | null
  failureKind: string | null
  durationMs: number
  endpointUrl: string
}
export interface WebhookDetail extends WebhookEvent {
  payload: unknown
  attempts: WebhookAttempt[]
  endpoint: Pick<
    WebhookEndpoint,
    'url' | 'enabled' | 'secretConfigured' | 'secretSetAt' | 'deliverFrom'
  > | null
}
export interface EventFilters {
  page: number
  transportState?: string
  deliveryRequestPublicId?: string
  externalReference?: string
  occurredFrom?: string
  occurredTo?: string
}
export type EventPage = Page<WebhookEvent>
export interface WebhookSummary {
  events: number
  pending: number
  delivered: number
  exhausted: number
}
export interface WebhookHealth extends Omit<WebhookSummary, 'events'> {
  leased: number
  oldestPendingDueAt: string | null
  thisInstance: {
    workerEnabled: boolean
    lastPollAt: string | null
    pollSeconds: number
    leaseSeconds: number
  }
}
