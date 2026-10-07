import { api, apiOnce } from '../services/api'
import { env } from '../config/env'
import { normalizeError } from '../services/errors'
import type {
  LinkAttempt,
  LinkMarker,
  LinkMetadata,
  LinkReceipt,
  LocationView,
} from './types'
const base = (id: string) =>
  `/customer/delivery-requests/${encodeURIComponent(id)}`
export const locationService = {
  view: (id: string, signal?: AbortSignal) =>
    api<LocationView>(`${base(id)}/location`, 'GET', undefined, signal),
  metadata: (id: string) => api<LinkMetadata>(`${base(id)}/tracking-link`),
  mutate: (m: LinkMarker) =>
    apiOnce<LinkReceipt>(
      `${base(m.publicId)}/tracking-link${m.operation === 'REVOKE' ? '/revoke' : ''}`,
      'POST',
      { expectedLinkRevision: m.expectedLinkRevision },
      undefined,
      { 'Idempotency-Key': m.key },
    ),
  attempt: (m: LinkMarker) =>
    api<LinkAttempt>(
      `${base(m.publicId)}/tracking-link/attempt?${new URLSearchParams({ operation: m.operation, expectedLinkRevision: m.expectedLinkRevision })}`,
      'GET',
      undefined,
      undefined,
      { 'Idempotency-Key': m.key },
    ),
}
/** No administrative JWT, refresh, cookies, query cache or token-bearing URLs. */
export async function sharedLocation(
  token: string,
  signal: AbortSignal,
): Promise<LocationView> {
  let response: Response
  try {
    response = await fetch(`${env.apiUrl}/api/v1/shared/delivery-tracking`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
      headers: { Authorization: `Tracking ${token}` },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw normalizeError(0, null)
  }
  if (!response.ok) {
    const error = normalizeError(response.status, null)
    error.retryAfterMs = retryAfter(response.headers.get('Retry-After'))
    throw error
  }
  try {
    return (await response.json()) as LocationView
  } catch {
    throw normalizeError(0, null)
  }
}
export function retryAfter(value: string | null) {
  if (!value) return 0
  const seconds = Number(value)
  return Number.isFinite(seconds)
    ? Math.max(0, seconds * 1000)
    : Math.max(0, Date.parse(value) - Date.now()) || 0
}
