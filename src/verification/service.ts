import { api, apiOnce, publicApi, apiBlob } from '../services/api'
import { uuid } from '../deletion/contract'
import { ApiError } from '../services/errors'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  Area,
  Terms,
  Requirements,
  Onboarding,
  VerificationCase,
  CaseSummary,
  Notice,
  Marker,
  Receipt,
  Attempt,
  Acceptance,
  Operation,
  CommandResult,
  PublicationReceipt,
  VerificationPolicy,
  RepresentativeLink,
  RepresentativePrivacy,
  PrivacyReceipt,
} from './types'
const enc = encodeURIComponent
export const verification = {
  representatives: (signal?: AbortSignal) =>
    api<{ items: RepresentativeLink[] }>(
      '/fleet-representatives/mine',
      'GET',
      undefined,
      signal,
    ),
  representativePrivacy: (id: string, signal?: AbortSignal) =>
    api<RepresentativePrivacy>(
      '/fleet-representatives/' + enc(id) + '/privacy',
      'GET',
      undefined,
      signal,
    ),
  privacyReceipt: (id: string, signal?: AbortSignal) =>
    api<Omit<PrivacyReceipt, 'status' | 'subjectId'>>(
      '/verification-terms/acceptances/' + enc(id),
      'GET',
      undefined,
      signal,
    ),
  policy: (signal?: AbortSignal) =>
    api<VerificationPolicy>(
      '/admin/verification-policy',
      'GET',
      undefined,
      signal,
    ),
  register: (email: string, resend = false) =>
    publicApi<{ status: string }>(
      '/independent-driver-registrations' + (resend ? '/resend' : ''),
      'POST',
      { email },
    ),
  confirm: (body: { token: string; password: string; name: string }) =>
    publicApi<{ status: string }>(
      '/independent-driver-registrations/confirm',
      'POST',
      body,
    ),
  emailRequest: () =>
    apiOnce<{ status: string }>('/verification-email/request', 'POST'),
  emailConfirm: (token: string) =>
    apiOnce<{ status: string }>('/verification-email/confirm', 'POST', {
      token,
    }),
  requirements: (signal?: AbortSignal) =>
    api<Requirements>('/verification-requirements', 'GET', undefined, signal),
  terms: (
    scope: 'DRIVER' | 'FLEET',
    providerId?: string,
    signal?: AbortSignal,
  ) =>
    api<Terms>(
      '/verification-terms?' + queryString({ scope, providerId }),
      'GET',
      undefined,
      signal,
    ),
  acceptance: (id: string, signal?: AbortSignal) =>
    api<Acceptance>(
      '/verification-terms/acceptances/' + enc(id),
      'GET',
      undefined,
      signal,
    ),
  acceptanceHistory: (page: number, signal?: AbortSignal, pageSize = 20) =>
    api<Page<{ id: string; version: string; acceptedAt: string }>>(
      '/driver/verification-acceptances?' + queryString({ page, pageSize }),
      'GET',
      undefined,
      signal,
    ),
  onboarding: (signal?: AbortSignal) =>
    api<Onboarding>('/driver/onboarding', 'GET', undefined, signal),
  list: (
    area: Area,
    page: number,
    status?: string,
    providerId?: string,
    signal?: AbortSignal,
  ) =>
    api<Page<CaseSummary>>(
      `/${area}/verification-cases?` +
        queryString({
          page,
          pageSize: 20,
          status: status || undefined,
          providerId,
        }),
      'GET',
      undefined,
      signal,
    ),
  get: (id: string, signal?: AbortSignal) =>
    api<VerificationCase>(
      '/verification-cases/' + enc(id),
      'GET',
      undefined,
      signal,
    ),
  notices: (area: 'driver' | 'provider', signal?: AbortSignal) =>
    api<Notice[]>(
      `/${area}/verification-notifications`,
      'GET',
      undefined,
      signal,
    ),
  access: (id: string, attachment: string, signal?: AbortSignal) =>
    apiBlob(
      `/verification-cases/${enc(id)}/attachments/${enc(attachment)}/access`,
      signal,
    ),
  attempt: (m: Marker, close = false) =>
    apiOnce<Attempt>(
      '/verification-command-attempts/' +
        enc(m.key) +
        (close
          ? '/close'
          : '?' + queryString({ operation: m.operation, target: m.target })),
      close ? 'POST' : 'GET',
      close ? { operation: m.operation, target: m.target } : undefined,
    ),
  command: async <O extends Operation>(
    m: Marker & { operation: O },
    path: string,
    body: unknown,
    method = 'POST',
  ): Promise<CommandResult<O>> => {
    const receipt = await apiOnce<Receipt | PublicationReceipt>(
      path,
      method,
      body,
      undefined,
      {
        'Idempotency-Key': m.key,
      },
    )
    if (
      m.operation === 'PUBLISH_TERMS'
        ? !isPublicationReceipt(receipt)
        : m.operation === 'REPRESENTATIVE_PRIVACY'
          ? !isPrivacyReceipt(receipt, m.target)
          : m.operation === 'FINAL_REJECTION'
            ? !receipt ||
              !('id' in receipt) ||
              !uuid.test(receipt.id) ||
              !Number.isInteger(receipt.revision) ||
              receipt.status !== 'INVENTORY'
            : !receipt ||
              !('id' in receipt) ||
              typeof receipt.id !== 'string' ||
              typeof receipt.status !== 'string'
    )
      throw new ApiError(
        0,
        'No se recibió el comprobante completo. Consulta el intento pendiente.',
      )
    return receipt as CommandResult<O>
  },
}
export function isPrivacyReceipt(
  value: unknown,
  subjectId: string,
): value is PrivacyReceipt {
  const r = value as PrivacyReceipt | null
  return (
    !!r &&
    typeof r.id === 'string' &&
    r.subjectId === subjectId &&
    r.scope === 'REPRESENTATIVE_PRIVACY' &&
    r.status === 'ACKNOWLEDGED' &&
    typeof r.version === 'string' &&
    typeof r.privacyVersion === 'string' &&
    /^[a-f0-9]{64}$/.test(r.privacyHash) &&
    r.acceptsFleetContract === false
  )
}
export function isPublicationReceipt(
  value: unknown,
): value is PublicationReceipt {
  const r = value as PublicationReceipt | null
  return (
    !!r &&
    typeof r.version === 'string' &&
    !!r.version &&
    typeof r.hash === 'string' &&
    /^[a-f0-9]{64}$/.test(r.hash) &&
    ['DRIVER', 'FLEET'].includes(r.scope) &&
    r.environment === 'PRODUCTION' &&
    typeof r.publishedAt === 'string' &&
    Number.isFinite(Date.parse(r.publishedAt)) &&
    Number.isSafeInteger(r.policyRevision) &&
    r.policyRevision > 0 &&
    typeof r.enforcementEnabled === 'boolean'
  )
}
/** Only a backend-issued PUT URL; never Mandaria auth, cookies, referrer or redirect. */
export async function putEvidence(
  url: string,
  file: File,
  expiresAt: string,
  signal?: AbortSignal,
) {
  if (Date.parse(expiresAt) <= Date.now())
    throw new Error(
      'La URL de carga caducó. Consulta el expediente; no se presentó el archivo.',
    )
  const parsed = new URL(url)
  if (
    parsed.protocol !== 'https:' &&
    !(
      parsed.protocol === 'http:' &&
      ['127.0.0.1', 'localhost'].includes(parsed.hostname)
    )
  )
    throw new Error('Destino de carga no permitido.')
  let response: Response
  try {
    response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'application/octet-stream' },
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal,
    })
  } catch {
    throw new Error(
      'La carga no se pudo confirmar. El archivo sigue incompleto; consulta su estado.',
    )
  }
  if (!response.ok)
    throw new Error(
      'La carga falló o su autorización caducó. El expediente no fue presentado.',
    )
}
export function validateFile(file: File, r: Requirements) {
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    !r.formats.includes(file.type)
  )
    throw new Error(
      'Sólo se admiten imágenes JPEG o PNG; PDF no está admitido.',
    )
  if (file.size === 0 || file.size > r.maxBytes)
    throw new Error(
      `El archivo debe contener datos y no exceder ${r.maxBytes} bytes.`,
    )
}
