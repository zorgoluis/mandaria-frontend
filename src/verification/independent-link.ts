import type { VerificationCase } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Driver whose independent profile owns this case, for the admin link.
 * Identity cases carry the driver as resourceId; unit cases need the
 * backend's scope.driverId. Fleet and representative cases never link.
 */
export function independentDriverId(record: VerificationCase) {
  if (!record.scope.independentProfileId || record.scope.providerId) return
  const driverId =
    record.scope.driverId ??
    (record.subjectType === 'DRIVER_IDENTITY' ? record.resourceId : undefined)
  return driverId && UUID.test(driverId) ? driverId : undefined
}
