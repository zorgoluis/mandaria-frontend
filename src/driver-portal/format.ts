import { labels } from '../utils/format'
import { money } from '../pricing/format'
import type { Money } from '../dispatch/types'
import type { DriverVehicle, ReleaseReason } from './types'

/** V1.9 has no reassignment for an independent driver: releasing returns the service to others. */
export const releaseReasonLabels: Record<ReleaseReason, string> = {
  VEHICLE_ISSUE: 'Problema con el vehículo',
  PERSONAL_EMERGENCY: 'Emergencia personal',
  CANNOT_COMPLETE: 'No puedo completarlo',
  OPERATIONAL_ISSUE: 'Problema operativo',
  OTHER: 'Otro motivo',
}
export const amount = (value: Money) => money(value.amount, value.currency)
export const vehicleLabel = (vehicle: { identifier: string; type: string }) =>
  `${vehicle.identifier} · ${labels[vehicle.type] ?? 'Vehículo'}`
export function vehicleDetail(vehicle: DriverVehicle) {
  const parts = [vehicle.brand, vehicle.model, vehicle.color].filter(Boolean)
  const plate = vehicle.plate ? `Placa ${vehicle.plate}` : null
  return [parts.join(' '), plate].filter(Boolean).join(' · ')
}
/**
 * Why the portal is not available, derived from the real profile. Being a fleet driver does
 * not grant the independent capability, and an active service blocks taking another.
 */
export function portalBlock(
  independent: {
    status: string
    canTakeServices: boolean
  } | null,
): string | null {
  if (!independent)
    return 'Mandaria todavía no te habilitó para tomar servicios por tu cuenta.'
  if (independent.status === 'PENDING')
    return 'Tu habilitación independiente está pendiente de revisión.'
  if (independent.status === 'SUSPENDED')
    return 'Mandaria suspendió tu habilitación para tomar servicios por tu cuenta.'
  if (independent.status === 'REJECTED')
    return 'Tu habilitación independiente no está vigente.'
  return null
}
