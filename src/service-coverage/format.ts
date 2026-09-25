import { serviceTypeLabels } from '../pricing/format'
import type { CoverageStatus, ServiceCoverage } from './types'

export const coverageStatusLabels: Record<CoverageStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}

/**
 * Human label for a ServiceType. The catalog lives in V1.6 pricing; a value the backend adds
 * later (FREIGHT, PRIVATE_TRANSPORT…) shows a neutral label instead of the raw enum until it
 * gets its own entry there.
 */
export function serviceTypeLabel(type: string) {
  return (
    (serviceTypeLabels as Record<string, string | undefined>)[type] ??
    'Otro tipo de servicio'
  )
}

/** Active first, then by zone name: what the provider can receive is read first. */
export function sortCoverages(items: ServiceCoverage[]) {
  return [...items].sort(
    (a, b) =>
      Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') ||
      a.serviceZone.name.localeCompare(b.serviceZone.name, 'es') ||
      a.serviceType.localeCompare(b.serviceType),
  )
}

/** The row a create collided with; the 409 carries no id, so it is found in the list. */
export function findCoverage(
  items: ServiceCoverage[],
  serviceZoneId: string,
  serviceType: string,
) {
  return items.find(
    (item) =>
      item.serviceZone.id === serviceZoneId && item.serviceType === serviceType,
  )
}

export const FROZEN_ON_DEACTIVATE =
  'La desactivación afectará los nuevos servicios. Los servicios que ya fueron abiertos conservan los candidatos calculados al momento de su apertura, pero este proveedor ya no podrá reclamarlos mientras la cobertura esté inactiva.'
export const FROZEN_ON_ACTIVATE =
  'La cobertura se aplicará a nuevos servicios. Los servicios abiertos anteriormente no recalculan automáticamente sus candidatos.'
