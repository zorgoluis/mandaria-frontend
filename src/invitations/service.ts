import { api, publicApi } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  AccountUser,
  ActivationResult,
  InvitationDispatch,
  InvitationFilters,
  InvitationScope,
  MembershipRole,
  UserInvitation,
} from './types'

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const query = queryString(params)
  return query ? `${path}?${query}` : path
}
/** providerId travels as a query value only for the membership guard; the backend verifies it. */
const providerQuery = (scope: InvitationScope) =>
  scope.kind === 'provider' ? { providerId: scope.providerId } : {}
const itemPath = (scope: InvitationScope, id: string, action: string) =>
  withQuery(
    scope.kind === 'admin'
      ? `/admin/user-invitations/${encodeURIComponent(id)}/${action}`
      : `/provider/driver-invitations/${encodeURIComponent(id)}/${action}`,
    providerQuery(scope),
  )

export const invitations = {
  list: (
    scope: InvitationScope,
    filters: InvitationFilters,
    signal?: AbortSignal,
  ) =>
    api<Page<UserInvitation>>(
      scope.kind === 'admin'
        ? withQuery('/admin/user-invitations', {
            ...filters,
            providerId: scope.providerId ?? filters.providerId,
            role: scope.role ?? filters.role,
          })
        : withQuery('/provider/driver-invitations', {
            page: filters.page,
            pageSize: filters.pageSize,
            status: filters.status,
            search: filters.search,
            providerId: scope.providerId,
          }),
      'GET',
      undefined,
      signal,
    ),
  /** The role is fixed by the flow, never taken from form data. */
  inviteProviderAdmin: (
    providerId: string,
    data: { email: string; membershipRole: MembershipRole },
  ) =>
    api<InvitationDispatch>(
      `/admin/providers/${encodeURIComponent(providerId)}/invitations`,
      'POST',
      {
        email: data.email,
        role: 'PROVIDER_ADMIN',
        membershipRole: data.membershipRole,
      },
    ),
  inviteDriver: (
    scope: InvitationScope & { providerId: string },
    data: { email: string; driverName: string },
  ) =>
    scope.kind === 'admin'
      ? api<InvitationDispatch>(
          `/admin/providers/${encodeURIComponent(scope.providerId)}/invitations`,
          'POST',
          { email: data.email, role: 'DRIVER', driverName: data.driverName },
        )
      : api<InvitationDispatch>(
          withQuery('/provider/driver-invitations', providerQuery(scope)),
          'POST',
          { email: data.email, driverName: data.driverName },
        ),
  resend: (scope: InvitationScope, id: string) =>
    api<InvitationDispatch>(itemPath(scope, id, 'resend'), 'POST'),
  revoke: (scope: InvitationScope, id: string) =>
    api<UserInvitation>(itemPath(scope, id, 'revoke'), 'POST'),
}

export const accounts = {
  list: (status: string | undefined, signal?: AbortSignal) =>
    api<AccountUser[]>(
      withQuery('/users', { status }),
      'GET',
      undefined,
      signal,
    ),
  /** Public: no session header, no refresh, the token is only sent in the body. */
  activate: (token: string, password: string) =>
    publicApi<ActivationResult>('/auth/activate-account', 'POST', {
      token,
      password,
    }),
}
