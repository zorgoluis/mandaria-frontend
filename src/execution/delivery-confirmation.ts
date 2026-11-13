export interface DeliveryConfirmation {
  policy: 'REQUIRED' | 'NOT_REQUIRED'
  method: null | 'CODE_VERIFIED' | 'ADMIN_ASSISTED'
}
export function confirmation(value: unknown): DeliveryConfirmation | null {
  const v = value as DeliveryConfirmation | null
  return v &&
    ['REQUIRED', 'NOT_REQUIRED'].includes(v.policy) &&
    [null, 'CODE_VERIFIED', 'ADMIN_ASSISTED'].includes(v.method)
    ? v
    : null
}
export const deliveryCodeFormat = (value: string) => /^[0-9]{6}$/.test(value)
export function confirmationLabel(value: unknown) {
  const v = confirmation(value)
  return v?.method === 'ADMIN_ASSISTED'
    ? 'Entrega acreditada por asistencia administrativa'
    : v?.method === 'CODE_VERIFIED'
      ? 'Código de entrega verificado'
      : v?.policy === 'REQUIRED'
        ? 'Código requerido al recibir'
        : v?.policy === 'NOT_REQUIRED'
          ? 'Entrega sin requisito de código'
          : 'Confirmación no informada'
}
