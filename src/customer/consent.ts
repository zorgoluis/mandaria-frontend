import type {
  DirectPrequoteResponse,
  OwnedShippingTermsResponse,
  DirectAcceptanceDto,
} from './contract'
export function consent(
  p: DirectPrequoteResponse,
  t: OwnedShippingTermsResponse,
): DirectAcceptanceDto {
  if (!p.deliveryQuotePublicId || !t.termsHash || t.termsVersion !== 1)
    throw new Error('Faltan los términos finales de la solicitud convertida.')
  return {
    customerAuthorization: {
      version: 1,
      status: 'AUTHORIZED_BY_CUSTOMER',
      reference: crypto.randomUUID(),
      authorizedAt: new Date().toISOString(),
      quotePublicId: p.deliveryQuotePublicId,
      amount: p.amount,
      currency: 'MXN',
      expiresAt: p.expiresAt,
      shippingTermsVersion: t.termsVersion,
      shippingTermsHash: t.termsHash,
    },
  }
}

import type { ConsentContext } from './reconciliation-contract'
export function consentFromContext(
  context: ConsentContext,
): DirectAcceptanceDto {
  const q = context.quote,
    t = context.shippingTerms
  if (
    !context.canPrepareConsent ||
    !q ||
    q.status !== 'OFFERED' ||
    Date.parse(q.expiresAt) <= Date.now() ||
    !t ||
    t.termsVersion !== 1 ||
    !t.termsHash ||
    q.currency !== 'MXN'
  )
    throw new Error(
      'La cotización no está vigente o faltan términos finales. Actualiza antes de consentir.',
    )
  return {
    customerAuthorization: {
      version: 1,
      status: 'AUTHORIZED_BY_CUSTOMER',
      reference: crypto.randomUUID(),
      authorizedAt: new Date().toISOString(),
      quotePublicId: q.publicId,
      amount: q.amount,
      currency: q.currency,
      expiresAt: q.expiresAt,
      shippingTermsVersion: 1,
      shippingTermsHash: t.termsHash,
    },
  }
}
