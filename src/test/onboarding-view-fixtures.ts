import {
  caseFixture,
  onboarding,
  resource,
  terms,
} from './verification-fixtures'
import type { Onboarding, VerificationCase } from '../verification/types'

export const vehicleId = '66666666-6666-4666-8666-666666666666'
export const unitCaseId = '77777777-7777-4777-8777-777777777777'

export function inactiveOnboarding() {
  const identity = structuredClone(caseFixture)
  const unit: VerificationCase = {
    ...structuredClone(caseFixture),
    id: unitCaseId,
    subjectId: unitCaseId,
    resourceId: vehicleId,
    subjectType: 'VEHICLE',
    registrationCardRequired: false,
    data: {
      declaredOwnerName: 'Persona Sintética',
      serialNumber: 'SYNTHETIC-UNIT',
      ownershipEvidenceType: 'OWNED',
    },
  }
  const data: Onboarding = {
    ...structuredClone(onboarding),
    view: 'DOCUMENTARY',
    guidedRegistration: true,
    driver: {
      ...structuredClone(onboarding.driver),
      name: 'Persona Sintética',
      independentProfile: {
        ...onboarding.driver.independentProfile!,
        vehicles: [
          {
            id: vehicleId,
            identifier: 'Unidad sintética',
            status: 'INACTIVE',
            type: 'BICYCLE',
          },
        ],
      },
    },
    terms: {
      ...onboarding.terms,
      acceptance: {
        id: resource,
        version: terms.version,
        acceptedAt: '2026-11-16T12:00:00Z',
      },
    },
    subjects: [
      {
        id: identity.subjectId,
        driverId: resource,
        vehicleId: null,
        cases: [identity],
      },
      { id: unit.subjectId, driverId: null, vehicleId, cases: [unit] },
    ],
  }
  return { data, identity, unit }
}
