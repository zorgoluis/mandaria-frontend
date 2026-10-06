// Mandaria Backend 2026-10-04 (docs/PARTNER-APPLICATIONS-HANDOFF.md):
// partner-applications.dto.ts, partner-applications.responses.ts and
// partner-application-policy.ts. An application is a lead, never an account: approving
// it creates nothing. SUPER_ADMIN converts it with the existing provider and invitation
// flows and records the links here.
export const partnerApplicationStatuses = [
  'RECEIVED',
  'CONTACTED',
  'APPROVED',
  'REJECTED',
  'DISCARDED',
] as const
export const partnerApplicationTypes = ['INDIVIDUAL', 'FLEET'] as const
/** The landing offers only these; VAN/OTHER exist in VehicleType but never arrive here. */
export const partnerVehicleTypes = [
  'BICYCLE',
  'MOTORCYCLE',
  'CAR',
  'PICKUP',
  'TRUCK',
] as const
export type PartnerApplicationStatus =
  (typeof partnerApplicationStatuses)[number]
export type PartnerApplicationType = (typeof partnerApplicationTypes)[number]
export type PartnerVehicleType = (typeof partnerVehicleTypes)[number]
export const REVIEW_NOTE_MAX = 500
/** Public key: SOC-NNNNNN, case-insensitive. There is no internal id in the responses. */
export const REFERENCE = /^SOC-\d{6,}$/i

export interface PartnerApplication {
  reference: string
  type: PartnerApplicationType
  status: PartnerApplicationStatus
  contactName: string
  phone: string
  email: string
  city: string
  vehicleType: PartnerVehicleType
  fleetName: string | null
  fleetUnits: number | null
  privacyNoticeVersion: string
  privacyAcceptedAt: string
  source: string
  submissionCount: number
  lastSubmittedAt: string
  reviewNote: string | null
  statusChangedAt: string | null
  statusChangedByUserId: string | null
  providerId: string | null
  invitationId: string | null
  createdAt: string
  updatedAt: string
  /** Decided by the backend state machine; the web never recomputes it. */
  allowedTransitions: PartnerApplicationStatus[]
}
export interface PartnerApplicationFilters {
  page?: number
  pageSize?: number
  /** One status or several separated by commas (up to 5), e.g. "RECEIVED,CONTACTED". */
  status?: string
  type?: PartnerApplicationType
  q?: string
}
export interface StatusChangeInput {
  status: PartnerApplicationStatus
  reviewNote?: string
}
/** At least one; providerId is rejected on INDIVIDUAL applications. */
export interface LinkInput {
  providerId?: string
  invitationId?: string
}
