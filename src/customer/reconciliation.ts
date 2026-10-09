import { api, apiOnce } from '../services/api'
import { queryClient } from '../services/query'
import { customer } from './service'
import { readPending, type Pending } from './pending'
import type { HumanAttemptResult } from './reconciliation-contract'
import type { ShippingPolicyResponse } from './contract'

export function attemptScope(p: Pending) {
  const operation = {
    prequote: 'PREQUOTE_CREATE',
    convert: 'PREQUOTE_CONVERT',
    accept: 'QUOTE_ACCEPT',
    policy: 'SHIPPING_POLICY',
    cancel: null,
  }[p.kind]
  // Preserve old markers: acceptance stored MDR in ref and original MQ in related.
  const resource =
    p.kind === 'prequote' ? null : p.kind === 'accept' ? p.related : p.ref
  if (!operation || (p.kind === 'accept' && !resource?.startsWith('MQ-')))
    throw new Error(
      'La referencia original no está disponible. Conserva el marcador y solicita soporte.',
    )
  return { operation, resource: resource ?? null }
}
export async function readAttempt(
  p: Pending,
  actor: string,
  close = false,
): Promise<HumanAttemptResult> {
  if (
    p.actor !== actor ||
    !readPending().some((x) => x.actor === actor && x.key === p.key)
  )
    throw new Error(
      'Sólo la cuenta iniciadora puede consultar o cerrar este intento.',
    )
  const { operation, resource } = attemptScope(p)
  const base =
    p.kind === 'policy'
      ? `/admin/integrations/${encodeURIComponent(p.ref)}/shipping-policy/attempt`
      : '/customer/command-attempt'
  const query =
    p.kind === 'policy'
      ? ''
      : '?' +
        new URLSearchParams({
          operation,
          ...(resource ? { resourcePublicId: resource } : {}),
        })
  const value = await apiOnce<HumanAttemptResult>(
    base + (close ? '/close' : '') + query,
    close ? 'POST' : 'GET',
    undefined,
    undefined,
    { 'Idempotency-Key': p.key },
  )
  if (value.operation !== operation || value.resourcePublicId !== resource)
    throw new Error(
      'El recibo no corresponde al intento original. Se mantiene el bloqueo.',
    )
  return value
}
/** Historical receipts identify effects; live reads remain the authority for current actions. */
export async function refreshApplied(
  p: Pending,
  value: HumanAttemptResult,
): Promise<string | undefined> {
  const r = value.result
  if (value.state !== 'APPLIED' || !r)
    throw new Error('Recibo incompleto; conserva el bloqueo.')
  let target: string | undefined
  if (p.kind === 'policy') {
    if (!('payer' in r) || !Number.isInteger(r.revision))
      throw new Error('Recibo de política no válido.')
    await api<ShippingPolicyResponse>(
      `/admin/integrations/${encodeURIComponent(p.ref)}/shipping-policy`,
    )
  } else if (p.kind === 'prequote') {
    if (!('prequotePublicId' in r))
      throw new Error('Falta la referencia MPQ del recibo.')
    const current = await customer.prequote(r.prequotePublicId)
    if (current.publicId !== r.prequotePublicId)
      throw new Error('La MPQ consultada no coincide.')
    target = current.deliveryRequestPublicId ?? current.publicId
  } else {
    if (
      !('deliveryRequestPublicId' in r) ||
      !('deliveryQuotePublicId' in r) ||
      (p.kind === 'convert' &&
        (!('prequotePublicId' in r) || r.prequotePublicId !== p.ref)) ||
      (p.kind === 'accept' &&
        (r.deliveryQuotePublicId !== p.related ||
          r.deliveryRequestPublicId !== p.ref))
    )
      throw new Error(
        'Las referencias del recibo no coinciden. Se mantiene el bloqueo.',
      )
    const [detail, status, context] = await Promise.all([
      customer.detail(r.deliveryRequestPublicId),
      customer.status(r.deliveryRequestPublicId),
      customer.consentContext(r.deliveryRequestPublicId),
    ])
    if (
      detail.publicId !== r.deliveryRequestPublicId ||
      status.publicId !== r.deliveryRequestPublicId ||
      context.deliveryRequestPublicId !== r.deliveryRequestPublicId ||
      context.quote?.publicId !== r.deliveryQuotePublicId
    )
      throw new Error(
        'No se confirmó la coherencia con la solicitud vigente. Se mantiene el bloqueo.',
      )
    target = r.deliveryRequestPublicId
  }
  await refreshAttemptViews(p)
  return target
}
export async function refreshAttemptViews(p: Pending) {
  await queryClient.invalidateQueries(
    {
      queryKey: [p.kind === 'policy' ? 'shipping-policy' : 'customer'],
      refetchType: 'all',
    },
    { throwOnError: true },
  )
}
