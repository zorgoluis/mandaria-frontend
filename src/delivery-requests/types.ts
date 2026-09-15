// Mandaria Backend OpenAPI 1.5.0: delivery-requests.responses.ts and
// AdminDeliveryRequestListQueryDto. Admin endpoints are SUPER_ADMIN only.
export const deliveryRequestStatuses = ['CREATED', 'CANCELLED'] as const
export const packageCategories = [
  'FOOD',
  'GROCERIES',
  'MEDICINE',
  'DOCUMENT',
  'PARCEL',
  'MERCHANDISE',
  'OTHER',
] as const
export const goodsPaymentModes = ['PREPAID', 'COURIER_ADVANCE'] as const
export type DeliveryRequestStatus = (typeof deliveryRequestStatuses)[number]
export type PackageCategory = (typeof packageCategories)[number]
export type GoodsPaymentMode = (typeof goodsPaymentModes)[number]
export type DeliveryStopType = 'PICKUP' | 'DROPOFF'
export const PUBLIC_ID = /^MDR-\d{6,}$/

export interface IntegrationClientSummary {
  id: string
  name: string
  code: string
}
export interface DeliveryRequestSummary {
  id: string
  publicId: string
  integrationClientId: string
  integrationClient: IntegrationClientSummary
  externalReference: string | null
  status: DeliveryRequestStatus
  requestedAt: string
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}
export interface DeliveryStop {
  type: DeliveryStopType
  sequence: number
  address: string
  latitude: number
  longitude: number
  contactName: string
  contactPhone: string
  instructions: string | null
}
export interface DeliveryPackage {
  category: PackageCategory
  description: string
  quantity: number
  weightKg: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  isFragile: boolean
  handlingInstructions: string | null
}
export interface DeliveryFinancialContext {
  /** Decimal string with 2 decimals; never a float. */
  goodsValue: string | null
  goodsPaymentMode: GoodsPaymentMode
  currency: string
}
export interface DeliveryRequest extends DeliveryRequestSummary {
  cancellationReason: string | null
  stops: DeliveryStop[]
  packages: DeliveryPackage[]
  // The relation is optional in the schema although creation always writes it.
  financialContext: DeliveryFinancialContext | null
}
export interface DeliveryRequestFilters {
  page?: number
  pageSize?: number
  publicId?: string
  integrationClientId?: string
  externalReference?: string
  status?: string
  requestedFrom?: string
  requestedTo?: string
}
