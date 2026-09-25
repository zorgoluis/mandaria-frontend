import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  IndependentDriverProfile,
  IndependentFilters,
  IndependentVehicle,
  IndependentVehicleInput,
} from './types'

const profiles = '/admin/independent-drivers'
const forDriver = (driverId: string, action = '') =>
  `/admin/drivers/${encodeURIComponent(driverId)}/independent${action}`

/**
 * SUPER_ADMIN only. Enabling requires a real, operational Driver: V1.9 never creates users,
 * drivers or fictional providers; account provisioning stays in V1.6.1.
 */
export const independentDrivers = {
  list: (filters: IndependentFilters, signal?: AbortSignal) => {
    const query = queryString({ ...filters })
    return api<Page<IndependentDriverProfile>>(
      `${profiles}${query ? `?${query}` : ''}`,
      'GET',
      undefined,
      signal,
    )
  },
  /** A Driver without an independent profile answers 404: being a fleet driver is not enough. */
  get: (driverId: string, signal?: AbortSignal) =>
    api<IndependentDriverProfile>(
      forDriver(driverId),
      'GET',
      undefined,
      signal,
    ),
  enable: (driverId: string, reason?: string) =>
    api<IndependentDriverProfile>(
      forDriver(driverId),
      'POST',
      reason ? { reason } : {},
    ),
  /** Refused with 409 while the driver is executing a service; nothing changes then. */
  suspend: (driverId: string, reason: string) =>
    api<IndependentDriverProfile>(forDriver(driverId, '/suspend'), 'POST', {
      reason,
    }),
  reject: (driverId: string, reason: string) =>
    api<IndependentDriverProfile>(forDriver(driverId, '/reject'), 'POST', {
      reason,
    }),
  vehicles: (driverId: string, signal?: AbortSignal) =>
    api<IndependentVehicle[]>(
      forDriver(driverId, '/vehicles'),
      'GET',
      undefined,
      signal,
    ),
  addVehicle: (driverId: string, input: IndependentVehicleInput) =>
    api<IndependentVehicle>(forDriver(driverId, '/vehicles'), 'POST', input),
  updateVehicle: (
    driverId: string,
    vehicleId: string,
    input: Partial<IndependentVehicleInput> & { status?: string },
  ) =>
    api<IndependentVehicle>(
      forDriver(driverId, `/vehicles/${encodeURIComponent(vehicleId)}`),
      'PATCH',
      input,
    ),
}
