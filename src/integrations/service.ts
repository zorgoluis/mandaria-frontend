import { api } from '../services/api'
import type {
  Credential,
  CredentialInput,
  Integration,
  IntegrationList,
  IntegrationStatus,
  OneTimeSecret,
} from '../types/api'
const base = '/admin/integrations'
export const integrations = {
  list: (signal?: AbortSignal) =>
    api<IntegrationList[]>(base, 'GET', undefined, signal),
  get: (id: string, signal?: AbortSignal) =>
    api<Integration>(`${base}/${id}`, 'GET', undefined, signal),
  create: (data: { name: string; code: string }) =>
    api<Integration>(base, 'POST', data),
  status: (id: string, status: IntegrationStatus) =>
    api<void>(`${base}/${id}`, 'PATCH', { status }),
  credentials: (id: string, signal?: AbortSignal) =>
    api<Credential[]>(`${base}/${id}/credentials`, 'GET', undefined, signal),
  createCredential: (id: string, data: CredentialInput) =>
    api<OneTimeSecret>(`${base}/${id}/credentials`, 'POST', data),
  rotate: (id: string, credentialId: string) =>
    api<OneTimeSecret>(
      `${base}/${id}/credentials/${credentialId}/rotate`,
      'POST',
    ),
  revoke: (id: string, credentialId: string) =>
    api<void>(`${base}/${id}/credentials/${credentialId}/revoke`, 'POST'),
}
