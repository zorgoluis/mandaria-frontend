import type { AccountStatus, InvitationStatus, MembershipRole } from './types'

export const invitationStatusLabels: Record<InvitationStatus, string> = {
  PENDING: 'Invitación pendiente',
  EXPIRED: 'Expirada',
  ACCEPTED: 'Aceptada',
  REVOKED: 'Revocada',
}
export const accountStatusLabels: Record<AccountStatus, string> = {
  INVITED: 'Invitación pendiente',
  ACTIVE: 'Activo',
  DISABLED: 'Deshabilitado',
}
export const membershipRoleLabels: Record<MembershipRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
}
/** Reuses the existing badge palette; labels are specific to accounts and invitations. */
export const statusTone: Record<InvitationStatus | AccountStatus, string> = {
  PENDING: 'pending',
  INVITED: 'pending',
  EXPIRED: 'maintenance',
  ACCEPTED: 'active',
  ACTIVE: 'active',
  REVOKED: 'revoked',
  DISABLED: 'inactive',
}
/** Only PENDING and EXPIRED invitations can be resent or revoked (backend contract). */
export const isOpen = (status: InvitationStatus) =>
  status === 'PENDING' || status === 'EXPIRED'
