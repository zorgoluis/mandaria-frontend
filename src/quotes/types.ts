// Mandaria Backend OpenAPI 1.6.0: delivery-quotes.responses.ts. The admin surface is read
// only: there is no administrative creation, acceptance, edition or deletion of a Quote.
export const quoteStatuses = [
  'OFFERED',
  'ACCEPTED',
  'EXPIRED',
  'CANCELLED',
] as const
export type QuoteStatus = (typeof quoteStatuses)[number]
export const QUOTE_PUBLIC_ID = /^MQ-\d{6,}$/

export interface QuoteRequestRef {
  publicId: string
  integrationClientId: string
  status: string
}
export interface QuoteZoneRef {
  id: string
  code: string
  name: string
}
export interface QuotePlanRef {
  id: string
  version: number
}
export interface QuoteBandRef {
  id: string
  minDistanceMeters: number
  maxDistanceMeters: number
}
export interface DeliveryQuote {
  id: string
  publicId: string
  deliveryRequestId: string
  deliveryRequest: QuoteRequestRef
  serviceType: 'LOCAL_DELIVERY'
  serviceZoneId: string
  serviceZone: QuoteZoneRef
  ratePlanId: string
  ratePlan: QuotePlanRef
  rateBandId: string
  rateBand: QuoteBandRef
  distanceMeters: number
  durationSeconds: number
  /** Frozen 2-decimal string. Only the delivery price; never the goods value. */
  amount: string
  currency: string
  routingProvider: string
  routeCalculatedAt: string
  /** Effective status: the backend reports an expired OFFERED quote as EXPIRED. */
  status: QuoteStatus
  expiresAt: string
  acceptedAt: string | null
  expiredAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  createdAt: string
  updatedAt: string
}
export interface QuoteFilters {
  page?: number
  pageSize?: number
  publicId?: string
  deliveryRequestPublicId?: string
  integrationClientId?: string
  serviceZoneId?: string
  status?: string
  createdFrom?: string
  createdTo?: string
}
