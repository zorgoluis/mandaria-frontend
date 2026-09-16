import type { Role } from '../types/api'

// Mandaria Backend OpenAPI 1.6.1: invitations.dto.ts, invitations.responses.ts and
// invitation-policy.ts. SUPER_ADMIN is never invitable.
export const invitableRoles = ['PROVIDER_ADMIN', 'DRIVER'] as const
/** EXPIRED is derived by the backend (PENDING with expiresAt <= now), never persisted. */
export const invitationStatuses = [
  'PENDING',
  'EXPIRED',
  'ACCEPTED',
  'REVOKED',
] as const
export const accountStatuses = ['INVITED', 'ACTIVE', 'DISABLED'] as const
export const membershipRoles = ['OWNER', 'ADMIN'] as const
export type InvitableRole = (typeof invitableRoles)[number]
export type InvitationStatus = (typeof invitationStatuses)[number]
export type AccountStatus = (typeof accountStatuses)[number]
export type MembershipRole = (typeof membershipRoles)[number]
/** Shared by the SUPER_ADMIN bootstrap and account activation (common/password-policy.ts). */
export const PASSWORD_MIN_LENGTH = 16
export const PASSWORD_MAX_LENGTH = 128

export interface UserInvitation {
  id: string
  userId: string
  email: string
  role: InvitableRole
  providerId: string
  provider: { id: string; name: string; code: string }
  membershipRole: MembershipRole | null
  driverName: string | null
  status: InvitationStatus
  expiresAt: string
  tokenIssuedAt: string
  resendCount: number
  acceptedAt: string | null
  revokedAt: string | null
  revokedByUserId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
}
/** Result of the email sent after commit. The link and token are never returned. */
export interface InvitationDispatch extends UserInvitation {
  emailDelivery: 'SENT' | 'FAILED'
}
export interface AccountUser {
  id: string
  email: string
  role: Role
  active: boolean
  status: AccountStatus
  emailVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}
export interface ActivationResult {
  status: 'ACTIVE'
  email: string
  role: InvitableRole
}
export interface InvitationFilters {
  page?: number
  pageSize?: number
  status?: string
  search?: string
  role?: string
  providerId?: string
}
/**
 * SUPER_ADMIN uses /admin endpoints (any provider, both roles). PROVIDER_ADMIN uses
 * /provider/driver-invitations: DRIVER only, provider authorized by membership.
 */
export type InvitationScope =
  | { kind: 'admin'; providerId?: string; role?: InvitableRole }
  | { kind: 'provider'; providerId: string }
