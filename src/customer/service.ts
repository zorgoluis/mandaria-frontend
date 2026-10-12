import type {
  CompatibleProjection,
  Receipt,
} from '../customer-business/contract'
import type { ConsentContext } from './reconciliation-contract'
import { api, apiOnce, publicApi } from '../services/api'
import type { Page } from '../types/api'
import type {
  CustomerProfileViewDto,
  RegisterCustomerDto,
  DirectPrequoteResponse,
  DeliveryRequestResponse,
  DeliveryStatusResponse,
} from './contract'
export interface Capabilities extends CompatibleProjection {
  type: 'PERSONAL' | 'BUSINESS'
  allowedShippingPayers: ('REQUESTER' | 'RECIPIENT')[]
  defaultShippingPayer: 'REQUESTER'
  capacity: {
    maxActiveRequests: number | null
    occupied: boolean
    activeCount: number
    activeRequestPublicId: string | null
  }
  canCreateRequest: boolean
  canPrequote: boolean
  reason: string | null
}
export const customer = {
  consentContext: (id: string) =>
    api<ConsentContext>(
      `/customer/delivery-requests/${encodeURIComponent(id)}/consent-context`,
    ),
  register: (data: RegisterCustomerDto, resend = false) =>
    publicApi(
      '/customer-registration' + (resend ? '/resend' : ''),
      'POST',
      data,
    ),
  recover: (email: string) =>
    publicApi('/auth/password-recovery', 'POST', { email }),
  confirm: (purpose: string, token: string, password?: string) =>
    purpose === 'VERIFY'
      ? apiOnce<{
          status: 'CONFIRMED'
          profileType?: 'PERSONAL'
          businessApplicationRequired?: boolean
        }>('/customer/contact-verification/confirm', 'POST', { token })
      : publicApi<{
          status: 'CONFIRMED'
          profileType?: 'PERSONAL'
          businessApplicationRequired?: boolean
        }>(
          purpose === 'RESET'
            ? '/auth/password-reset'
            : '/customer-registration/confirm',
          'POST',
          { token, password },
        ),
  verify: () => apiOnce('/customer/contact-verification', 'POST'),
  profile: () => api<CustomerProfileViewDto>('/customer/profile'),
  capabilities: () => api<Capabilities>('/customer/capabilities'),
  attach: (body: Omit<RegisterCustomerDto, 'email'>) =>
    apiOnce<CustomerProfileViewDto>('/customer/profile', 'POST', body),
  update: (body: {
    expectedRevision: number
    displayName: string
    businessName?: string
  }) => apiOnce<CustomerProfileViewDto>('/customer/profile', 'PATCH', body),
  type: (body: { type: 'PERSONAL'; expectedRevision: number }, key: string) =>
    apiOnce<Receipt>('/customer/profile/type', 'POST', body, undefined, {
      'Idempotency-Key': key,
    }),
  prequote: (id: string) =>
    api<DirectPrequoteResponse>(
      `/customer/delivery-prequotes/${encodeURIComponent(id)}`,
    ),
  requests: (page: number) =>
    api<Page<DeliveryRequestResponse>>(
      `/customer/delivery-requests?page=${page}&pageSize=20`,
    ),
  detail: (id: string) =>
    api<DeliveryRequestResponse>(
      `/customer/delivery-requests/${encodeURIComponent(id)}`,
    ),
  status: (id: string) =>
    api<DeliveryStatusResponse>(
      `/customer/delivery-requests/${encodeURIComponent(id)}/status`,
    ),
}

/** Non-sensitive lookup references only; never contacts or request bodies. */
export function rememberConversion(actor: string, mdr: string, mpq: string) {
  localStorage.setItem('mandaria.customer.reference.' + actor + '.' + mdr, mpq)
}
export function conversionReference(actor: string, mdr: string) {
  const value = localStorage.getItem(
    'mandaria.customer.reference.' + actor + '.' + mdr,
  )
  return value && /^MPQ-\d{6,}$/.test(value) ? value : null
}
