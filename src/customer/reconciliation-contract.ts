// Internal types from the human OpenAPI. Never publish this contract in portal assets.
export type RecoveredShippingTerms = {
  payer: 'REQUESTER' | 'RECIPIENT'
  method: 'CASH'
  dueAt: 'PICKUP' | 'DELIVERY'
  component: 'DELIVERY_FEE'
  termsVersion: number
  termsHash: string
  policyRevision?: number
}
export type RecoveredPrequote = {
  prequotePublicId: string
  amount: string
  currency: string
  expiresAt: string
  shippingTerms: RecoveredShippingTerms | null
}
export type RecoveredConversion = {
  prequotePublicId: string
  amount: string
  currency: string
  expiresAt: string
  shippingTerms: RecoveredShippingTerms | null
  deliveryRequestPublicId: string
  deliveryQuotePublicId: string
}
export type RecoveredAcceptance = {
  deliveryRequestPublicId: string
  deliveryQuotePublicId: string
  amount: string
  currency: string
  expiresAt: string
  acceptedAt: string
  shippingTerms: RecoveredShippingTerms | null
}
export type RecoveredPolicy = {
  payer: 'REQUESTER' | 'RECIPIENT'
  revision: number
}
export type HumanAttemptResult = {
  operation:
    'PREQUOTE_CREATE' | 'PREQUOTE_CONVERT' | 'QUOTE_ACCEPT' | 'SHIPPING_POLICY'
  resourcePublicId: string | null
  state: 'APPLIED' | 'PENDING_OR_UNKNOWN' | 'CLOSED_NO_EFFECTS'
  canPrepareNewAttempt: boolean
  closureScope: 'RESOURCE_OR_POLICY_ONLY'
  routingEffects: 'NONE_STARTED' | 'POSSIBLE_RETAINED'
  closedAt: string | null
  result:
    | (
        | RecoveredPrequote
        | RecoveredConversion
        | RecoveredAcceptance
        | RecoveredPolicy
      )
    | null
}
export type ConsentPrequote = { publicId: string; expiresAt: string }
export type ConsentQuote = {
  publicId: string
  expiresAt: string
  amount: string
  currency: string
  status: 'OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  acceptedAt: string | null
}
export type ConsentContext = {
  deliveryRequestPublicId: string
  prequote: ConsentPrequote | null
  quote: ConsentQuote | null
  shippingTerms: RecoveredShippingTerms | null
  canPrepareConsent: boolean
  automaticAcceptance: false
}
