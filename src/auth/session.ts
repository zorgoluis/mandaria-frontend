import type { User } from '../types/api'
import { ApiError } from '../services/errors'
export type RestrictedSession = {
  accessMode: 'DELETION_RESTRICTED'
  identity: { id: string }
  capabilities: { deletionFollowUp: true; activeDeliveryResolution: boolean }
}
export type SessionIdentity =
  { accessMode: 'STANDARD'; identity: User } | RestrictedSession
export function sessionIdentity(value: unknown): SessionIdentity {
  const r = value as SessionIdentity | null
  const id = r?.identity?.id
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
    throw new ApiError(502, 'Identidad de sesión no válida.')
  if (
    r?.accessMode === 'DELETION_RESTRICTED' &&
    r.capabilities?.deletionFollowUp === true &&
    typeof r.capabilities.activeDeliveryResolution === 'boolean'
  )
    return {
      accessMode: r.accessMode,
      identity: { id },
      capabilities: {
        deletionFollowUp: true,
        activeDeliveryResolution: r.capabilities.activeDeliveryResolution,
      },
    }
  if (r?.accessMode === 'STANDARD') {
    const u = r.identity
    if (
      typeof u.email === 'string' &&
      ['DRIVER', 'PROVIDER_ADMIN', 'SUPER_ADMIN'].includes(u.role) &&
      u.active === true &&
      (u.emailVerifiedAt === null || typeof u.emailVerifiedAt === 'string') &&
      typeof u.createdAt === 'string' &&
      typeof u.updatedAt === 'string'
    )
      return {
        accessMode: 'STANDARD',
        identity: {
          id,
          email: u.email,
          role: u.role,
          active: u.active,
          emailVerifiedAt: u.emailVerifiedAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
      }
  }
  throw new ApiError(502, 'Identidad de sesión no válida.')
}
