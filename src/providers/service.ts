import { api } from '../services/api'
import { queryString } from '../services/query'
import type {
  Member,
  Page,
  Provider,
  ProviderInput,
  ProviderProfile,
} from '../types/api'
const base = '/admin/providers'
export const providers = {
  list: (
    params: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) =>
    api<Page<Provider>>(
      `${base}?${queryString(params)}`,
      'GET',
      undefined,
      signal,
    ),
  get: (id: string, signal?: AbortSignal) =>
    api<Provider>(`${base}/${id}`, 'GET', undefined, signal),
  create: (data: ProviderInput) => api<Provider>(base, 'POST', data),
  update: (id: string, data: Partial<Omit<ProviderInput, 'type'>>) =>
    api<Provider>(`${base}/${id}`, 'PATCH', data),
  transition: (id: string, action: 'activate' | 'suspend') =>
    api<Provider>(`${base}/${id}/${action}`, 'POST', {}),
  members: (id: string, page: number, signal?: AbortSignal) =>
    api<Page<Member>>(
      `${base}/${id}/members?page=${page}&pageSize=20`,
      'GET',
      undefined,
      signal,
    ),
  addMember: (id: string, userId: string, role: Member['role']) =>
    api<Member>(`${base}/${id}/members`, 'POST', { userId, role }),
  removeMember: (id: string, memberId: string) =>
    api<void>(`${base}/${id}/members/${memberId}`, 'DELETE'),
  profiles: (page: number, signal?: AbortSignal) =>
    api<Page<ProviderProfile>>(
      `/provider/profiles?page=${page}&pageSize=20`,
      'GET',
      undefined,
      signal,
    ),
  profile: (id: string, signal?: AbortSignal) =>
    api<ProviderProfile>(
      `/provider/profile?providerId=${encodeURIComponent(id)}`,
      'GET',
      undefined,
      signal,
    ),
}
