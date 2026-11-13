import type { Requirements, VerificationCase } from './types'

// Only explicit null waives the OWNED document. Missing or malformed data fails closed.
export function unitRequirements(
  requirements: Requirements,
  record: VerificationCase,
) {
  const vehicle = requirements.vehicle
  const ownership = record.data.ownershipEvidenceType
  const extra = ownership && vehicle?.[ownership]
  const valid =
    !!vehicle &&
    Array.isArray(vehicle.required) &&
    vehicle.required.includes('REGISTRATION_CARD') &&
    vehicle.required.every(
      (c) => typeof c === 'string' && c.trim().length > 0,
    ) &&
    (ownership === 'OWNED'
      ? extra === null || extra === 'OWNERSHIP_PROOF'
      : ownership === 'RENTED'
        ? extra === 'RENTAL_CONTRACT'
        : ownership === 'BORROWED' && extra === 'OWNER_AUTHORIZATION')
  const categories = valid
    ? [
        ...vehicle.required.filter(
          (c) =>
            c !== 'REGISTRATION_CARD' ||
            record.registrationCardRequired !== false,
        ),
        ...(typeof extra === 'string' ? [extra] : []),
      ]
    : []
  return {
    blocked: !valid || categories.includes('OWNERSHIP_PROOF'),
    categories: categories.filter((c) => c !== 'OWNERSHIP_PROOF'),
  }
}
