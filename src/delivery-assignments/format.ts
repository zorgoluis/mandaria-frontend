import { money } from '../pricing/format'
import { labels } from '../utils/format'
import type {
  AssignmentEndReason,
  AssignmentStatus,
  AssignmentVehicle,
  AvailableVehicle,
  DriverAvailability,
  ProviderEndReason,
} from './types'
import type { DispatchService, Money } from '../dispatch/types'
import type { PaymentContext } from './types'

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  ACTIVE: 'Asignado',
  REASSIGNED: 'Reasignado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Entrega completada',
}
export const endReasonLabels: Record<AssignmentEndReason, string> = {
  DRIVER_UNAVAILABLE: 'Repartidor no disponible',
  VEHICLE_ISSUE: 'Problema con el vehículo',
  OPERATIONAL_CHANGE: 'Cambio operativo',
  DELIVERY_CANCELLED: 'El servicio fue cancelado',
  OTHER: 'Otro motivo',
}
export const providerReasonLabels: Record<ProviderEndReason, string> = {
  DRIVER_UNAVAILABLE: endReasonLabels.DRIVER_UNAVAILABLE,
  VEHICLE_ISSUE: endReasonLabels.VEHICLE_ISSUE,
  OPERATIONAL_CHANGE: endReasonLabels.OPERATIONAL_CHANGE,
  OTHER: endReasonLabels.OTHER,
}
/**
 * Informative only: V1.8 has no realtime presence, so a driver is never shown as "online".
 * Availability comes from V1.4 and does not gate assignment — the backend decides.
 */
export const availabilityLabels: Record<DriverAvailability, string> = {
  AVAILABLE: 'Sin servicio en curso',
  BUSY: 'Marcado como ocupado',
  OFFLINE: 'Sin conexión reciente',
}
/** Money in paymentContext is always {amount, currency}; goods in V1.7 is not. */
export const amount = (value: Money) => money(value.amount, value.currency)

export const vehicleLabel = (vehicle: AssignmentVehicle) =>
  `${vehicle.identifier} · ${labels[vehicle.type] ?? 'Vehículo'}`
export function vehicleDetail(vehicle: AvailableVehicle) {
  const parts = [vehicle.brand, vehicle.model, vehicle.color].filter(Boolean)
  const plate = vehicle.plate ? `Placa ${vehicle.plate}` : null
  return [parts.join(' '), plate].filter(Boolean).join(' · ')
}

/** Remaining time to assign, from the backend's assignmentDeadline. Never a local rule. */
export function assignmentCountdown(deadline: string, now: number) {
  const ms = Date.parse(deadline) - now
  if (!Number.isFinite(ms)) return null
  if (ms <= 0) return null
  const total = Math.ceil(ms / 1000)
  const two = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours
    ? `${hours}:${two(minutes)}:${two(seconds)}`
    : `${minutes}:${two(seconds)}`
}

/**
 * One payment shape for the whole flow. The dispatch detail carries the V1.7 goods contract
 * (decimal string plus sibling currency) while the assignment endpoints return PaymentContext
 * with Money objects; both are normalised here so nothing downstream guesses the shape.
 */
export function paymentFromService(service: DispatchService): PaymentContext {
  const goods = service.goods
  const asMoney = (value: string | null): Money | null =>
    value === null || goods === null
      ? null
      : { amount: value, currency: goods.currency }
  return {
    deliveryFee: service.deliveryFee,
    goodsValue: asMoney(goods?.value ?? null),
    goodsPaymentMode: goods?.paymentMode ?? null,
    driverAdvancesGoods: goods?.driverAdvancesGoods ?? false,
    driverAdvanceAmount: asMoney(goods?.driverAdvanceAmount ?? null),
  }
}
