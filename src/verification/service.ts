import { api, apiOnce, publicApi, apiBlob } from '../services/api'
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
} from './types'
const enc = encodeURIComponent
export const verification = {
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
  command: async (m: Marker, path: string, body: unknown, method = 'POST') => {
    const receipt = await apiOnce<Receipt>(path, method, body, undefined, {
      'Idempotency-Key': m.key,
    })
    if (
      !receipt ||
      typeof receipt.id !== 'string' ||
      typeof receipt.status !== 'string'
    )
      throw new ApiError(
        0,
        'No se recibió el comprobante completo. Consulta el intento pendiente.',
      )
    return receipt
  },
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
