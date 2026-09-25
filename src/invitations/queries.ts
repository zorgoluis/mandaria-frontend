import { queryClient } from '../services/query'
import type { InvitationScope } from './types'

export const invitationKeys = {
  all: ['invitations'] as const,
  list: (scope: InvitationScope, filters: object) =>
    ['invitations', scope, filters] as const,
}
/** Invitations change user statuses too (INVITED accounts appear in /users). */
export async function invalidateInvitations() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['users'] }),
  ])
}
