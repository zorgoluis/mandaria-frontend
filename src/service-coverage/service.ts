import { api } from '../services/api'
import { queryString } from '../services/query'
import type {
  CoverageStatus,
  ServiceCoverage,
  ServiceCoverageInput,
} from './types'

const admin = (providerId: string, coverageId?: string) =>
  `/admin/providers/${encodeURIComponent(providerId)}/service-coverages${
    coverageId ? `/${encodeURIComponent(coverageId)}` : ''
  }`

/**
 * SUPER_ADMIN administration. Deliberately without a remove call: the backend has no DELETE and
 * a coverage only moves between ACTIVE and INACTIVE.
 */
export const serviceCoverages = {
  list: (providerId: string, signal?: AbortSignal) =>
    api<ServiceCoverage[]>(admin(providerId), 'GET', undefined, signal),
  create: (providerId: string, input: ServiceCoverageInput) =>
    api<ServiceCoverage>(admin(providerId), 'POST', input),
  setStatus: (providerId: string, coverageId: string, status: CoverageStatus) =>
    api<ServiceCoverage>(admin(providerId, coverageId), 'PATCH', { status }),
}

/**
 * PROVIDER_ADMIN, read only. providerId only picks among the user's own memberships; the backend
 * membership guard decides.
 */
export const myServiceCoverages = {
  list: (providerId: string, signal?: AbortSignal) =>
    api<ServiceCoverage[]>(
      `/provider/service-coverages?${queryString({ providerId })}`,
      'GET',
      undefined,
      signal,
    ),
}
