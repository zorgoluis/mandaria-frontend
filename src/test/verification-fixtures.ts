import type {
  Requirements,
  VerificationCase,
  Terms,
  Onboarding,
} from '../verification/types'
export const actor = '11111111-1111-4111-8111-111111111111',
  resource = '22222222-2222-4222-8222-222222222222',
  caseId = '33333333-3333-4333-8333-333333333333',
  attachmentId = '44444444-4444-4444-8444-444444444444',
  providerId = '55555555-5555-4555-8555-555555555555'
export const terms: Terms = {
  version: 'DRIVER-LOCAL-TEST-1',
  scope: 'DRIVER',
  environment: 'LOCAL_TEST',
  text: 'PRUEBA LOCAL. Texto completo sintético sin vigencia contractual. Cada conductor acepta personalmente.',
  hash: 'a'.repeat(64),
  createdAt: '2026-10-13T12:00:00Z',
}
export const requirements: Requirements = {
  policyVersion: 'LOCAL-TEST-1',
  environment: 'LOCAL_TEST',
  formats: ['image/jpeg', 'image/png'],
  maxBytes: 10485760,
  maxPixels: 20000000,
  maxFiles: 10,
  malwareScan: false,
  pdfSupported: false,
  identity: {
    required: ['FACE_PHOTO', 'INE_FRONT', 'INE_BACK'],
    motorizedLicense: 'LICENSE',
    checks: [
      'IDENTITY_MATCH',
      'LEGIBLE',
      'LICENSE_HOLDER',
      'LICENSE_VALIDITY',
      'LICENSE_CATEGORY',
    ],
  },
  vehicle: {
    required: ['REGISTRATION_CARD'],
    OWNED: 'OWNERSHIP_PROOF',
    RENTED: 'RENTAL_CONTRACT',
    BORROWED: 'OWNER_AUTHORIZATION',
    checks: ['UNIT_MATCH', 'LEGIBLE', 'AUTHORIZED_USE'],
  },
  productionReady: false,
}
export const caseFixture: VerificationCase = {
  id: caseId,
  subjectId: attachmentId,
  resourceId: resource,
  subjectType: 'DRIVER_IDENTITY',
  status: 'DRAFT',
  revision: 3,
  createdAt: '2026-10-13T12:00:00Z',
  decidedAt: null,
  publicReason: null,
  environment: 'LOCAL_TEST',
  policyVersion: 'LOCAL-TEST-1',
  data: {
    fullName: 'Persona Sintética',
    contactPhone: '0000000000',
    operatingCity: 'Ciudad sintética',
    documentType: 'INE',
  },
  scope: { providerId: null, independentProfileId: resource },
  verificationStatus: 'NOT_SUBMITTED',
  attachments: [],
  events: [
    { id: resource, kind: 'CREATE_CASE', createdAt: '2026-10-13T12:00:00Z' },
  ],
  submittedAt: null,
  validUntil: null,
  licenseValidUntil: null,
  licenseVehicleTypes: [],
}
export const onboarding: Onboarding = {
  driver: {
    id: resource,
    providerId: null,
    status: 'PENDING',
    availability: 'OFFLINE',
    independentProfile: { id: attachmentId, status: 'PENDING', vehicles: [] },
  },
  subjects: [],
  terms: { requiredVersion: terms.version, acceptance: null },
  enforcementEnabled: true,
  environment: 'LOCAL_TEST',
  contractuallyEffective: false,
  productionReady: false,
}
export const emptyPage = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}
