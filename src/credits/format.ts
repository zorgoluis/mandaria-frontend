import type { LedgerEntryType, RechargeMethod } from './types'

const integers = new Intl.NumberFormat('es-MX')
/**
 * Credits are a Mandaria unit of consumption, never money: no currency symbol, no decimals and
 * never mixed with deliveryFee, goodsValue or driverAdvanceAmount.
 */
export const formatCredits = (credits: number) =>
  `${integers.format(credits)} ${Math.abs(credits) === 1 ? 'crédito' : 'créditos'}`
/** Signed amount of a ledger movement: the sign is text, never only a colour. */
export const signedCredits = (amount: number) =>
  `${amount > 0 ? '+' : ''}${formatCredits(amount)}`
/**
 * `creditCost: null` means a Dispatch opened before credit snapshots existed: no cost was ever
 * recorded. It is not zero and must never be shown as "0 créditos".
 */
export const creditCostLabel = (cost: number | null | undefined) =>
  cost === null || cost === undefined
    ? 'Sin costo registrado'
    : formatCredits(cost)

const ledgerLabels: Record<LedgerEntryType, string> = {
  RECHARGE: 'Recarga',
  ADMIN_ADJUSTMENT: 'Ajuste administrativo',
  SERVICE_AWARD: 'Cargo por servicio',
  SERVICE_REFUND: 'Devolución de servicio',
}
/** The enum can grow on the backend: an unknown movement is still shown, never hidden. */
export const formatLedgerType = (type: string) =>
  ledgerLabels[type as LedgerEntryType] ?? 'Movimiento de créditos'
export const rechargeMethodLabels: Record<RechargeMethod, string> = {
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  OTHER: 'Otro medio',
}
export const formatRechargeMethod = (method: string | null) =>
  method
    ? (rechargeMethodLabels[method as RechargeMethod] ?? 'Otro medio')
    : '—'

const km = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })
/**
 * The contract works in whole metres; kilometres are only for reading. The conversion lives here
 * so no screen invents its own.
 */
export const formatDistance = (meters: number) =>
  `${km.format(meters / 1000)} km (${integers.format(meters)} m)`
