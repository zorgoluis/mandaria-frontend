import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type { DriverDispatch, DriverSelf, DriverVehicle } from './types'

/**
 * The authenticated DRIVER's own surface. The driver is always derived from the token: no
 * driverId, providerId or profileId ever travels from the client.
 */
export const driverPortal = {
  me: (signal?: AbortSignal) =>
    api<DriverSelf>('/driver/me', 'GET', undefined, signal),
  /** Own vehicles only; never the provider fleet the driver belongs to in V1.4. */
  vehicles: (signal?: AbortSignal) =>
    api<DriverVehicle[]>('/driver/vehicles', 'GET', undefined, signal),
  available: (page: number, pageSize: number, signal?: AbortSignal) =>
    api<Page<DriverDispatch>>(
      `/driver/dispatches/available?${queryString({ page, pageSize })}`,
      'GET',
      undefined,
      signal,
    ),
  get: (dispatchId: string, signal?: AbortSignal) =>
    api<DriverDispatch>(
      `/driver/dispatches/${encodeURIComponent(dispatchId)}`,
      'GET',
      undefined,
      signal,
    ),
  /**
   * One atomic backend operation: the Dispatch becomes CLAIMED for this driver and the ACTIVE
   * assignment is created in the same transaction. The web never sends claim and assignment
   * as two requests.
   */
  take: (dispatchId: string, vehicleId: string) =>
    api<DriverDispatch>(
      `/driver/dispatches/${encodeURIComponent(dispatchId)}/take`,
      'POST',
      { vehicleId },
    ),
  /** Atomic too: the assignment is cancelled with a reason and the dispatch returns to OPEN. */
  release: (dispatchId: string, reason: string, reasonDetail?: string) =>
    api<DriverDispatch>(
      `/driver/dispatches/${encodeURIComponent(dispatchId)}/release`,
      'POST',
      { reason, ...(reasonDetail ? { reasonDetail } : {}) },
    ),
}
