// Internal types derived from backend OpenAPI V1.17. Never distributes the human OpenAPI.
export type CustomerProfileViewDto = {
  type: 'PERSONAL' | 'BUSINESS'
  displayName: string
  businessName: string | null
  revision: number
  active: boolean
}
export type RegisterCustomerDto = {
  email: string
  type: 'PERSONAL' | 'BUSINESS'
  displayName: string
  businessName?: string
}
export type DirectPrequoteDto = {
  conditions: DirectPrequoteConditionsDto
  shippingPayer?: 'REQUESTER' | 'RECIPIENT'
}
export type DirectPrequoteCreatedResponse = {
  prequote: DirectPrequoteResponse
  replayed: boolean
}
export type DirectPrequoteResponse = {
  shippingTerms: ShippingTermsResponse | null
  publicId: string
  status: 'OFFERED' | 'EXPIRED' | 'CONVERTED'
  conditionsVersion: 1
  conditions: DirectPrequoteConditionsDto
  serviceZone: PrequoteZoneResponse
  distanceMeters: number
  durationSeconds: number
  amount: string
  currency: 'MXN'
  createdAt: string
  expiresAt: string
  convertedAt: string | null
  deliveryRequestPublicId: string | null
  deliveryQuotePublicId: string | null
  availabilityGuaranteed: false
}
export type DirectConversionDto = {
  conditionsVersion: 1
  deliveryRequest: CreateDeliveryRequestDto
  payerContact?: PayerContactDto
}
export type DirectConversionResponse = {
  result: PrequoteConversionResponse
  replayed: boolean
}
export type DirectAcceptanceDto = {
  customerAuthorization: DirectAuthorizationDto
}
export type DirectAcceptedResponse = {
  quote: DeliveryQuoteResponse
  replayed: boolean
}
export type DeliveryRequestResponse = {
  publicId: string
  externalReference?: string | null
  serviceType: 'LOCAL_DELIVERY'
  status: 'CREATED' | 'CANCELLED'
  requestedAt: string
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string
  shippingTerms: OwnedShippingTermsResponse | null
  cancellationReason?: string | null
  stops: Array<DeliveryStopResponse>
  packages: Array<DeliveryPackageResponse>
  financialContext: DeliveryFinancialContextResponse
}
export type DeliveryStatusResponse = {
  shippingPayment: ShippingPaymentResponse | null
  publicVersion: string
  trackingMode: ('LEGACY' | 'DETAILED') | null
  assignmentState: 'NONE' | 'ACTIVE' | 'ENDED'
  terminalOutcome: PublicTerminalOutcomeResponse | null
  executionProgress?: PublicExecutionProgressResponse | null
  executionOutcome?: PublicExecutionOutcomeResponse | null
  publicId: string
  externalReference?: string | null
  status:
    'REQUESTED' | 'OPEN' | 'ASSIGNED' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED'
  execution?: DeliveryExecutionResponse | null
  requestedAt: string
  deliveredAt?: string | null
  cancelledAt?: string | null
}
export type ShippingPaymentResponse = {
  payer: 'REQUESTER' | 'RECIPIENT'
  method: 'CASH'
  dueAt: 'PICKUP' | 'DELIVERY'
  component: 'DELIVERY_FEE'
  termsVersion: 1
  termsHash: string
  policyRevision?: number | null
  amount: string | null
  currency: string | null
  quotePublicId?: string | null
  instructionStatus: 'CURRENT' | 'HISTORICAL' | 'OFFER'
  evidenceStatus: 'DECLARED' | 'NOT_DECLARED'
  declaredAt: string | null
  collectShipping: boolean
}
export type ShippingPolicyResponse = {
  payer: 'REQUESTER' | 'RECIPIENT'
  revision: number
}
export type ShippingPolicyDto = {
  payer: 'REQUESTER' | 'RECIPIENT'
  expectedRevision: number
}
export type DirectPrequoteConditionsDto = {
  conditionsVersion: 1
  serviceType: 'LOCAL_DELIVERY'
  stops: Array<PrequoteStop>
  packages: Array<PrequotePackage>
}
export type ShippingTermsResponse = {
  payer: 'REQUESTER' | 'RECIPIENT'
  method: 'CASH'
  dueAt: 'PICKUP' | 'DELIVERY'
  component: 'DELIVERY_FEE'
  termsVersion: 1
  termsHash: string
  policyRevision?: number | null
}
export type PrequoteZoneResponse = { code: string; name: string }
export type CreateDeliveryRequestDto = {
  payerContact?: PayerContactDto
  serviceType?: 'LOCAL_DELIVERY'
  externalReference?: string | null
  stops: Array<DeliveryStopDto>
  packages: Array<DeliveryPackageDto>
  financialContext: DeliveryFinancialContextDto
}
export type PayerContactDto = {
  name: string
  phone: string
  capacity: 'REQUESTER' | 'AUTHORIZED_REPRESENTATIVE'
}
export type PrequoteConversionResponse = {
  shippingTerms: ShippingTermsResponse | null
  prequotePublicId: string
  convertedAt: string
  deliveryRequestPublicId: string
  externalReference: string | null
  deliveryRequestStatus: 'CREATED' | 'CANCELLED'
  deliveryCollectionInstruction: CollectionInstructionDto
  quote: DeliveryQuoteResponse
  availabilityGuaranteed: false
}
export type DirectAuthorizationDto = {
  version: 1 | 2
  shippingTermsVersion?: 1
  shippingTermsHash?: string
  status: 'AUTHORIZED_BY_CUSTOMER'
  reference: string
  authorizedAt: string
  quotePublicId: string
  amount: string
  currency: 'MXN'
  expiresAt: string
}
export type DeliveryQuoteResponse = {
  publicId: string
  deliveryRequestPublicId: string
  serviceType: 'LOCAL_DELIVERY'
  serviceZone: QuoteZoneResponse
  distanceMeters: number
  durationSeconds: number
  amount: string
  currency: string
  status: 'OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
  expiresAt: string
  acceptedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
}
export type OwnedShippingTermsResponse = {
  payer: 'REQUESTER' | 'RECIPIENT'
  method: 'CASH'
  dueAt: 'PICKUP' | 'DELIVERY'
  component: 'DELIVERY_FEE'
  termsVersion: 1
  termsHash: string
  policyRevision?: number | null
  payerContact: PayerContactDto | null
}
export type DeliveryStopResponse = {
  type: 'PICKUP' | 'DROPOFF'
  sequence: number
  address: string
  latitude: number
  longitude: number
  contactName: string
  contactPhone: string
  instructions?: string | null
}
export type DeliveryPackageResponse = {
  category:
    | 'FOOD'
    | 'GROCERIES'
    | 'MEDICINE'
    | 'DOCUMENT'
    | 'PARCEL'
    | 'MERCHANDISE'
    | 'OTHER'
  description: string
  quantity: number
  weightKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  isFragile: boolean
  handlingInstructions?: string | null
}
export type DeliveryFinancialContextResponse = {
  goodsValue?: string | null
  goodsPaymentMode: 'PREPAID' | 'COURIER_ADVANCE'
  currency: string
}
export type PublicTerminalOutcomeResponse = {
  type: 'DELIVERED' | 'RETURNED_TO_ORIGIN' | 'CANCELLED' | 'EXPIRED'
  occurredAt: string | null
}
export type PublicExecutionProgressResponse = {
  phase:
    | ('TO_PICKUP' | 'AT_PICKUP' | 'PICKED_UP' | 'TO_DROPOFF' | 'AT_DROPOFF')
    | null
  revision: number
  registeredAt: string
  attentionRequired: boolean
}
export type PublicExecutionOutcomeResponse = {
  type: 'RETURNED_TO_ORIGIN'
  occurredAt: string
}
export type DeliveryExecutionResponse = {
  mode: 'PROVIDER' | 'INDEPENDENT'
  provider: PublicExecutionNameResponse | null
  driver: PublicExecutionNameResponse | null
}
export type PrequoteStop = {
  type: 'PICKUP' | 'DROPOFF'
  sequence: number
  latitude: number
  longitude: number
}
export type PrequotePackage = {
  category:
    | 'FOOD'
    | 'GROCERIES'
    | 'MEDICINE'
    | 'DOCUMENT'
    | 'PARCEL'
    | 'MERCHANDISE'
    | 'OTHER'
  quantity: number
  weightKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  isFragile?: boolean
}
export type DeliveryStopDto = {
  type: 'PICKUP' | 'DROPOFF'
  sequence: number
  address: string
  latitude: number
  longitude: number
  contactName: string
  contactPhone: string
  instructions?: string | null
}
export type DeliveryPackageDto = {
  category:
    | 'FOOD'
    | 'GROCERIES'
    | 'MEDICINE'
    | 'DOCUMENT'
    | 'PARCEL'
    | 'MERCHANDISE'
    | 'OTHER'
  description: string
  quantity: number
  weightKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  isFragile?: boolean
  handlingInstructions?: string | null
}
export type DeliveryFinancialContextDto = {
  goodsValue?: (string | number) | null
  goodsPaymentMode: 'PREPAID' | 'COURIER_ADVANCE'
  currency: string
}
export type CollectionInstructionDto = {
  payer: 'RECIPIENT' | 'REQUESTER'
  method: 'CASH'
  dueAt: 'DELIVERY' | 'PICKUP'
  components: Array<'DELIVERY_FEE'>
}
export type QuoteZoneResponse = { code: string; name: string }
export type PublicExecutionNameResponse = { displayName: string }
