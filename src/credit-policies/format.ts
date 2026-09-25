import { formatCredits, formatDistance } from '../credits/format'
import { serviceTypeLabels } from '../pricing/format'
import type {
  CalculationType,
  CreditPolicy,
  PolicyActorType,
  PolicyStatus,
  PolicyRange,
} from './types'

export const actorTypeLabels: Record<PolicyActorType, string> = {
  PROVIDER: 'Proveedor',
  INDEPENDENT_DRIVER: 'Repartidor independiente',
}
export const calculationTypeLabels: Record<CalculationType, string> = {
  PER_KM: 'Por kilómetro',
  FLAT: 'Tarifa fija',
  DISTANCE_RANGE: 'Por rangos de distancia',
}
export const policyStatusLabels: Record<PolicyStatus, string> = {
  ACTIVE: 'Vigente',
  INACTIVE: 'Histórica',
}
/** New actors or service types can appear later: an unknown value is shown, never hidden. */
export const actorLabel = (actor: string) =>
  actorTypeLabels[actor as PolicyActorType] ?? actor
export const serviceLabel = (serviceType: string) =>
  (serviceTypeLabels as Record<string, string>)[serviceType] ?? serviceType
export const calculationLabel = (type: string) =>
  calculationTypeLabels[type as CalculationType] ?? type

export const rangeLabel = (
  range: Pick<PolicyRange, 'minDistanceMeters' | 'maxDistanceMeters'>,
) =>
  range.maxDistanceMeters === null
    ? `Desde ${formatDistance(range.minDistanceMeters)}`
    : `${formatDistance(range.minDistanceMeters)} – ${formatDistance(range.maxDistanceMeters)}`

/** One line describing what a version charges, built only from the fields of its own type. */
export function policySummary(policy: CreditPolicy) {
  if (policy.calculationType === 'FLAT')
    return `${formatCredits(policy.flatCredits ?? 0)} por servicio`
  if (policy.calculationType === 'PER_KM')
    return `${formatCredits(policy.creditsPerKm ?? 0)} por kilómetro · mínimo ${formatCredits(
      policy.minimumCredits ?? 0,
    )}`
  return `${policy.ranges.length} ${policy.ranges.length === 1 ? 'rango' : 'rangos'} de distancia`
}
export const policyTitle = (policy: CreditPolicy) =>
  `${serviceLabel(policy.serviceType)} · ${actorLabel(policy.actorType)} · versión ${policy.version}`
