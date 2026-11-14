import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  ActivityWindow,
  DeliveryOutcome,
  DriverAnalytics,
  DriverDelivery,
} from './types'

/** `null` is the signed-in driver; an id is the SUPER_ADMIN view of that Driver. */
export type ActivitySubject = string | null
const base = (driverId: ActivitySubject) =>
  driverId === null
    ? '/driver/activity'
    : `/admin/drivers/${encodeURIComponent(driverId)}`

export const driverActivity = {
  deliveries: (
    driverId: ActivitySubject,
    filters: ActivityWindow & { page: number; outcome?: DeliveryOutcome },
    signal?: AbortSignal,
  ) =>
    api<Page<DriverDelivery>>(
      `${base(driverId)}/deliveries?` +
        queryString({ pageSize: 20, ...filters }),
      'GET',
      undefined,
      signal,
    ),
  analytics: (
    driverId: ActivitySubject,
    window: ActivityWindow,
    signal?: AbortSignal,
  ) =>
    api<DriverAnalytics>(
      `${base(driverId)}/analytics?` + queryString({ ...window }),
      'GET',
      undefined,
      signal,
    ),
}

/** Whole UTC days ending today; `to` is exclusive, so it is tomorrow. */
export function lastDays(days: number, now = new Date()): ActivityWindow {
  const day = (offset: number) =>
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + offset,
      ),
    )
      .toISOString()
      .slice(0, 10)
  return { from: day(1 - days), to: day(1) }
}
