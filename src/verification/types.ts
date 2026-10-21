import type { Snapshot } from '../deletion/contract'
// Human documentary contract: backend DTO/controllers/service, 2026-10-19.
export type EvidenceEnvironment = 'LOCAL_TEST' | 'PRODUCTION'
export type Area = 'driver' | 'provider' | 'admin'
export type SubjectType = 'DRIVER_IDENTITY' | 'VEHICLE' | 'REPRESENTATIVE'
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
export interface RepresentativeData {
  fullName: string
  representedName: string
  capacity: 'SELF' | 'APPOINTMENT' | 'POWER'
  representedPersonType: 'NATURAL_PERSON' | 'LEGAL_PERSON'
  declarationCurrent: true
  identityValidUntil: string
  authorityValidFrom: string
  authorityValidUntil?: string
  limits: string
  jointSignatureRequired: boolean
  authorityPages: string[]
}
export interface RepresentativeLink {
  id: string
  providerId: string
  status: 'LINKED' | 'REVOKED'
  revision: number
  restricted: boolean
  approvedCaseId: string | null
  canAcceptFleet: boolean
  environment: EvidenceEnvironment
  cases: {
    id: string
    status: CaseStatus
    revision: number
    environment: EvidenceEnvironment
  }[]
}
export interface RepresentativePrivacy {
  subjectId: string
  scope: 'REPRESENTATIVE_PRIVACY'
  version: string
  environment: EvidenceEnvironment
  privacyVersion: string
  privacyText: string
  privacyHash: string
  specificConsents: { id: string; text: string; hash: string }[]
  acceptsFleetContract: false
}
export interface PrivacyReceipt {
  id: string
  subjectId: string
  scope: 'REPRESENTATIVE_PRIVACY'
  status: 'ACKNOWLEDGED'
  version: string
  privacyVersion: string
  privacyHash: string
  acceptsFleetContract: false
}
export interface Terms {
  version: string
  scope: 'DRIVER' | 'FLEET'
  environment: EvidenceEnvironment
  text: string
  hash: string
  createdAt: string
  privacyVersion?: string | null
  privacyText?: string | null
  privacyHash?: string | null
  publishedAt?: string | null
  specificConsents?: { id: string; text: string; hash: string }[]
}
export interface VerificationPolicy {
  runtimeEnvironment?: EvidenceEnvironment
  revision: number
  enabled: boolean
  environment: EvidenceEnvironment
  driverTermsVersion: string
  fleetTermsVersion: string
  productionDriverTermsVersion: string | null
  productionFleetTermsVersion: string | null
}
export interface Publication {
  expectedVersion: number
  scope: 'DRIVER' | 'FLEET'
  version: string
  text: string
  privacyVersion: string
  privacyText: string
  specificConsents: { id: string; text: string }[]
  approvalReference: string
  publicationAuthorized: true
}
export interface PublicationReceipt {
  version: string
  hash: string
  scope: 'DRIVER' | 'FLEET'
  environment: 'PRODUCTION'
  publishedAt: string
  policyRevision: number
  enforcementEnabled: boolean
}
export type CommandResult<O extends Operation> = O extends 'PUBLISH_TERMS'
  ? PublicationReceipt
  : O extends 'REPRESENTATIVE_PRIVACY'
    ? PrivacyReceipt
    : Receipt
export interface Receipt {
  id: string
  status: string
  revision?: number
  version?: string
  acceptedAt?: string
  environment?: string
  productionApplicable?: boolean
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
  environment?: EvidenceEnvironment
  productionApplicable?: boolean
  privacyVersion?: string | null
  privacyHash?: string | null
  specificConsents?: { id: string; hash: string }[]
  terms: Terms
  representationEvidence?:
    'ACCREDITED_AT_ACCEPTANCE' | 'HISTORICAL_UNACCREDITED'
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
  registrationCardRequired?: boolean | null
  retention?: {
    executionEnabled: boolean
    eligibility:
      | 'RECORDED_CALENDAR'
      | 'NO_RELIABLE_ANCHOR'
      | 'FINAL_REJECTION_UNCONFIRMED'
      | 'NOT_ELIGIBLE'
      | 'HISTORICAL_ONLY'
      | 'NOT_DISCLOSED'
    historyTruncated: boolean
    plans: Snapshot[]
  }
  resourceId: string
  subjectType: SubjectType
  environment: EvidenceEnvironment
  policyVersion: string
  data: Partial<IdentityData & UnitData & RepresentativeData>
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
  environment: EvidenceEnvironment
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
  representative?: {
    categories: string[]
    checks: string[]
    priorPersonalPrivacyRequired: true
    accreditedBeforeFleetAcceptance: true
    pagesField: 'authorityPages'
  }
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
    cases: {
      id: string
      status: CaseStatus
      revision: number
      environment?: EvidenceEnvironment
    }[]
  }[]
  terms: {
    requiredVersion: string | null
    blockingReason?: string | null
    acceptance: { id: string; version: string; acceptedAt: string } | null
  }
  enforcementEnabled: boolean
  environment: EvidenceEnvironment
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
  'LINK_REPRESENTATIVE',
  'REVOKE_REPRESENTATIVE',
  'REPRESENTATIVE_PRIVACY',
  'PUBLISH_TERMS',
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
  'FINAL_REJECTION',
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
  result?: Receipt | PublicationReceipt | PrivacyReceipt
}
