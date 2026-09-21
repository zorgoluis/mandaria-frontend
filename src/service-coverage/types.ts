// Mandaria Backend V1.7: dispatch/provider-coverages.service.ts (coverageSelect),
// dispatch.responses.ts (ServiceCoverageResponse) and dispatch.dto.ts. Managed by SUPER_ADMIN;
// PROVIDER_ADMIN only reads its own. There is no DELETE: a coverage is deactivated, never removed.
import type { ServiceType, ServiceZoneStatus } from '../pricing/types'

export const coverageStatuses = ['ACTIVE', 'INACTIVE'] as const
export type CoverageStatus = (typeof coverageStatuses)[number]

/**
 * READ shape. The zone arrives nested: responses carry no serviceZoneId, so the zone id is
 * always serviceZone.id. The combination (providerId, serviceZone, serviceType) is unique.
 */
export interface ServiceCoverage {
  id: string
  providerId: string
  serviceType: ServiceType
  status: CoverageStatus
  createdAt: string
  updatedAt: string
  serviceZone: {
    id: string
    code: string
    name: string
    status: ServiceZoneStatus
  }
}

/** WRITE shape of POST: the zone travels flat as serviceZoneId. */
export interface ServiceCoverageInput {
  serviceZoneId: string
  serviceType: ServiceType
}
