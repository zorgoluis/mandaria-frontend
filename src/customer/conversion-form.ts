import type { DirectPrequoteResponse } from './contract'
export type ConversionValues = Record<string, string>
export function conversionErrors(
  values: ConversionValues,
  quote: DirectPrequoteResponse,
) {
  const errors: Record<string, string> = {}
  const required = [
    'address0',
    'address1',
    'name0',
    'phone0',
    'name1',
    'phone1',
    'description',
    ...(quote.shippingTerms?.payer === 'REQUESTER'
      ? ['payerName', 'payerPhone']
      : []),
  ]
  for (const key of required)
    if (!values[key]?.trim()) errors[key] = 'Completa este campo.'
  for (const key of [
    'phone0',
    'phone1',
    ...(quote.shippingTerms?.payer === 'REQUESTER' ? ['payerPhone'] : []),
  ]) {
    if (values[key]?.trim() && !/^\+?[0-9 ()-]{7,20}$/.test(values[key].trim()))
      errors[key] = 'Escribe un teléfono válido; puedes incluir código de país.'
  }
  const amount = values.goodsValue?.trim()
  if (!amount && values.mode === 'COURIER_ADVANCE')
    errors.goodsValue =
      'El adelanto requiere un valor de mercancía mayor a cero.'
  else if (
    amount &&
    (!/^\d{1,12}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)
  )
    errors.goodsValue =
      'Escribe un importe mayor a cero, con hasta dos decimales.'
  return errors
}
export function quoteExpired(quote: DirectPrequoteResponse, now: number) {
  const expires = Date.parse(quote.expiresAt)
  return (
    quote.status !== 'OFFERED' || !Number.isFinite(expires) || now >= expires
  )
}
