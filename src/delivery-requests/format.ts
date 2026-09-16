import type {
  DeliveryPackage,
  DeliveryFinancialContext,
  GoodsPaymentMode,
  PackageCategory,
} from './types'

export const categoryLabels: Record<PackageCategory, string> = {
  FOOD: 'Comida',
  GROCERIES: 'Supermercado',
  MEDICINE: 'Medicamentos',
  DOCUMENT: 'Documento',
  PARCEL: 'Paquete',
  MERCHANDISE: 'Mercancía',
  OTHER: 'Otro',
}
export const paymentModes: Record<
  GoodsPaymentMode,
  { label: string; description: string }
> = {
  PREPAID: {
    label: 'Mercancía prepagada',
    description: 'El comercio ya recibió el pago de la mercancía.',
  },
  COURIER_ADVANCE: {
    label: 'Adelanto por repartidor',
    description:
      'El repartidor deberá adelantar el valor de la mercancía al recogerla.',
  },
}
export const NOT_PROVIDED = '—'

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 })
export function weight(value: number | null) {
  return value === null ? 'No informado' : `${number.format(value)} kg`
}
export function dimensions(
  item: Pick<DeliveryPackage, 'lengthCm' | 'widthCm' | 'heightCm'>,
) {
  const values = [item.lengthCm, item.widthCm, item.heightCm]
  if (values.every((value) => value === null)) return 'No informadas'
  return `${values
    .map((value) => (value === null ? NOT_PROVIDED : number.format(value)))
    .join(' × ')} cm`
}
/** Money arrives as a 2-decimal string; it is only formatted, never recomputed. */
export function money(context: DeliveryFinancialContext) {
  if (context.goodsValue === null) return 'No informado'
  const amount = Number(context.goodsValue)
  if (!Number.isFinite(amount)) return 'Valor no disponible'
  try {
    return `${new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: context.currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)} ${context.currency}`
  } catch {
    return `${context.goodsValue} ${context.currency}`
  }
}
export function coordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
/** Converts a local calendar day from <input type="date"> into an ISO instant. */
export function dayBoundary(value: string, end: boolean) {
  if (!DAY.test(value)) return undefined
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}
