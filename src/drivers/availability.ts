import { api } from '../services/api'

/** Availability is declared by each driver; there is no heartbeat. */
export interface DriverAvailabilitySummary {
  asOf: string
  connected: number
  disconnected: number
  byAvailability: { available: number; busy: number; offline: number }
  byMembership: {
    fleet: { connected: number; disconnected: number }
    independent: { connected: number; disconnected: number }
  }
  /** Independents whose offer shift ended; already counted as disconnected. */
  expiredConnections: number
  /** Non-operational drivers: never connected, never in `disconnected`. */
  excluded: {
    total: number
    withDeclaredAvailability: number
    byReason: {
      userInactive: number
      accountClosing: number
      driverNotActive: number
      categoryUnresolved: number
      providerNotActive: number
      independentNotApproved: number
    }
  }
}

export const driverAvailability = {
  summary: (signal?: AbortSignal) =>
    api<DriverAvailabilitySummary>(
      '/admin/drivers/availability-summary',
      'GET',
      undefined,
      signal,
    ),
}
