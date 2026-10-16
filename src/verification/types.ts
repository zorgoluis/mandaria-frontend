// Human, LOCAL_TEST contract: backend verification.dto/responses/service, 2026-10-13.
export type Area = 'driver' | 'provider' | 'admin'
export type SubjectType = 'DRIVER_IDENTITY' | 'VEHICLE'
export type CaseStatus =
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type MotorType = 'MOTORCYCLE' | 'CAR' | 'PICKUP' | 'VAN' | 'TRUCK'
export const motorTypes: MotorType[] = [
  'MOTORCYCLE',
  'CAR',
  'PICKUP',
  'VAN',
  'TRUCK',
]
export type Ownership = 'OWNED' | 'RENTED' | 'BORROWED'
export interface IdentityData {
  fullName: string
  contactPhone: string
  operatingCity: string
  documentType: 'INE'
  license?: {
    issuer: string
    category: string
    expiresAt: string
    vehicleTypes: MotorType[]
  }
}
export interface UnitData {
  declaredOwnerName: string
  serialNumber: string
  ownershipEvidenceType: Ownership
  authorizationExpiresAt?: string
}
export interface Terms {
  version: string
  scope: 'DRIVER' | 'FLEET'
  environment: 'LOCAL_TEST'
  text: string
  hash: string
  createdAt: string
}
export interface Receipt {
  id: string
  status: string
  revision?: number
  version?: string
  acceptedAt?: string
  environment?: string
  contractuallyEffective?: false
  expiresAt?: string
  uploadUrl?: string
  contentType?: string
}
export interface Acceptance {
  id: string
  userId: string
  scope: 'DRIVER' | 'FLEET'
  providerId: string | null
  acceptedAt?: string
  contractuallyEffective: false
  terms: Terms
}
export interface Attachment {
  id: string
  category: string
  status: 'CREATED' | 'VALIDATED' | 'REMOVED'
  bytes: number | null
  mime: string | null
  hash: string | null
  createdAt: string
}
export interface CaseSummary {
  id: string
  subjectId: string
  status: CaseStatus
  revision: number
  createdAt: string
  decidedAt: string | null
  publicReason: string | null
}
export interface VerificationCase extends CaseSummary {
  resourceId: string
  subjectType: SubjectType
  environment: 'LOCAL_TEST'
  policyVersion: string
  data: Partial<IdentityData & UnitData>
  scope: { providerId: string | null; independentProfileId: string | null }
  verificationStatus: string
  attachments: Attachment[]
  events: { id: string; kind: string; createdAt: string }[]
  internalNote?: string | null
  submittedAt: string | null
  validUntil: string | null
  licenseValidUntil: string | null
  licenseVehicleTypes: string[]
}
export interface Requirements {
  policyVersion: string
  environment: 'LOCAL_TEST'
  formats: string[]
  maxBytes: number
  maxPixels: number
  maxFiles: number
  malwareScan: false
  pdfSupported: false
  identity: { required: string[]; motorizedLicense: string; checks: string[] }
  vehicle: {
    required: string[]
    OWNED: string
    RENTED: string
    BORROWED: string
    checks: string[]
  }
  productionReady: false
}
export interface Onboarding {
  driver: {
    id: string
    providerId: string | null
    status: string
    availability: string
    independentProfile: {
      id: string
      status: string
      vehicles: {
        id: string
        identifier: string
        status: string
        type: string
      }[]
    } | null
  }
  subjects: {
    id: string
    driverId: string | null
    vehicleId: string | null
    cases: { id: string; status: CaseStatus; revision: number }[]
  }[]
  terms: {
    requiredVersion: string
    acceptance: { id: string; version: string; acceptedAt: string } | null
  }
  enforcementEnabled: boolean
  environment: 'LOCAL_TEST'
  contractuallyEffective: false
  productionReady: false
}
export interface Notice {
  id: string
  caseId: string
  status: string
  createdAt: string
  case: {
    status: CaseStatus
    publicReason: string | null
    decidedAt: string | null
  }
}
export const operations = [
  'ACCEPT_TERMS',
  'CREATE_CASE',
  'CREATE_VEHICLE',
  'UPDATE_CASE',
  'CREATE_UPLOAD',
  'COMPLETE_UPLOAD',
  'REMOVE_ATTACHMENT',
  'SUBMIT',
  'WITHDRAW',
  'DECIDE',
] as const
export type Operation = (typeof operations)[number]
export interface Marker {
  actor: string
  key: string
  operation: Operation
  target: string
}
export interface Attempt {
  state: 'ABSENT' | 'APPLIED' | 'CLOSED_NO_EFFECTS'
  result?: Receipt
}
