import { queryClient } from '../services/query'

export const dispatchKeys = {
  all: ['dispatches'] as const,
  provider: (providerId: string) =>
    ['dispatches', 'provider', providerId] as const,
  providerList: (providerId: string, filters: object) =>
    ['dispatches', 'provider', providerId, 'list', filters] as const,
  providerDetail: (providerId: string, id: string) =>
    ['dispatches', 'provider', providerId, 'detail', id] as const,
  adminList: (filters: object) =>
    ['dispatches', 'admin', 'list', filters] as const,
  adminDetail: (id: string) => ['dispatches', 'admin', 'detail', id] as const,
}
/** No sockets in V1.7: every claim/release outcome refetches what the backend now says. */
export const refreshProviderDispatches = (providerId: string) =>
  queryClient.invalidateQueries({ queryKey: dispatchKeys.provider(providerId) })
