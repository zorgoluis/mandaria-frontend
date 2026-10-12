import type {
  DeliveryRequestResponse,
  DeliveryStatusResponse,
} from '../../customer/contract'
import type { ConsentContext } from '../../customer/reconciliation-contract'
import type { LinkMetadata, LocationView } from '../../location/types'
export const requestContext: ConsentContext = {
  deliveryRequestPublicId: 'MDR-000009',
  prequote: { publicId: 'MPQ-000009', expiresAt: '2099-01-01T00:00:00Z' },
  quote: {
    publicId: 'MQ-000009',
    amount: '45.50',
    currency: 'MXN',
    status: 'OFFERED',
    expiresAt: '2099-01-01T00:00:00Z',
    acceptedAt: null,
  },
  shippingTerms: {
    payer: 'REQUESTER',
    method: 'CASH',
    dueAt: 'PICKUP',
    component: 'DELIVERY_FEE',
    termsVersion: 1,
    termsHash: 'a'.repeat(64),
  },
  canPrepareConsent: true,
  automaticAcceptance: false,
}
export const requestDetail: DeliveryRequestResponse = {
  publicId: 'MDR-000009',
  serviceType: 'LOCAL_DELIVERY',
  status: 'CREATED',
  requestedAt: '2026-10-12T06:21:00Z',
  createdAt: '2026-10-12T06:21:00Z',
  updatedAt: '2026-10-12T06:21:00Z',
  shippingTerms: {
    payer: 'REQUESTER',
    method: 'CASH',
    dueAt: 'PICKUP',
    component: 'DELIVERY_FEE',
    termsVersion: 1,
    termsHash: 'a'.repeat(64),
    payerContact: {
      name: 'Ana Prueba',
      phone: '9615550011',
      capacity: 'REQUESTER',
    },
  },
  stops: [],
  packages: [],
  financialContext: {
    goodsPaymentMode: 'PREPAID',
    currency: 'MXN',
    goodsValue: null,
  },
}
export const requestStatus: DeliveryStatusResponse = {
  publicId: 'MDR-000009',
  publicVersion: '1',
  status: 'REQUESTED',
  trackingMode: null,
  assignmentState: 'NONE',
  terminalOutcome: null,
  executionProgress: null,
  requestedAt: '2026-10-12T06:21:00Z',
  shippingPayment: {
    payer: 'REQUESTER',
    method: 'CASH',
    dueAt: 'PICKUP',
    component: 'DELIVERY_FEE',
    termsVersion: 1,
    termsHash: 'a'.repeat(64),
    amount: null,
    currency: null,
    quotePublicId: null,
    instructionStatus: 'CURRENT',
    evidenceStatus: 'NOT_DECLARED',
    declaredAt: null,
    collectShipping: false,
  },
}
export const requestLocation: LocationView = {
  publicId: 'MDR-000009',
  progress: {
    publicVersion: '1',
    status: 'REQUESTED',
    trackingMode: null,
    assignmentState: 'NONE',
    phase: null,
    attentionRequired: false,
    terminalOutcome: null,
  },
  location: {
    locationVersion: '1',
    assignmentGeneration: '0',
    availability: 'UNAVAILABLE',
    unavailableReason: 'NO_ASSIGNMENT',
    sample: null,
  },
  observation: {
    evaluatedAt: '2026-10-12T06:21:00Z',
    freshness: 'UNAVAILABLE',
  },
}
export const requestLink: LinkMetadata = {
  linkRevision: '0',
  linkId: null,
  status: 'NONE',
  createdAt: null,
  expiresAt: null,
  terminalAccessUntil: null,
}
