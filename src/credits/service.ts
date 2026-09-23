import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  AdminCreditLedgerEntry,
  AdjustmentInput,
  CreditAccount,
  CreditLedgerEntry,
  CreditMovement,
  LedgerFilters,
  RechargeInput,
} from './types'

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const query = queryString(params)
  return query ? `${path}?${query}` : path
}
/**
 * Every credit movement carries an Idempotency-Key: a double click, a browser retry or a network
 * retry must never recharge twice. One key per intentional operation, generated here.
 */
const idempotent = <T>(path: string, body: unknown, key: string) =>
  api<T>(path, 'POST', body, undefined, { 'Idempotency-Key': key })
export const movementKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `mandaria-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`

/** SUPER_ADMIN. The account belongs to the owner named by the route; no id travels in the body. */
function adminCredits(base: (id: string, suffix?: string) => string) {
  return {
    account: (ownerId: string, signal?: AbortSignal) =>
      api<CreditAccount>(base(ownerId), 'GET', undefined, signal),
    ledger: (ownerId: string, filters: LedgerFilters, signal?: AbortSignal) =>
      api<Page<AdminCreditLedgerEntry>>(
        withQuery(base(ownerId, '/ledger'), { ...filters }),
        'GET',
        undefined,
        signal,
      ),
    /** Registers credits already paid outside Mandaria. Mandaria never processes that payment. */
    recharge: (ownerId: string, input: RechargeInput, key: string) =>
      idempotent<CreditMovement>(base(ownerId, '/recharge'), input, key),
    /** Administrative correction, separate from a recharge. Signed amount, reason required. */
    adjustment: (ownerId: string, input: AdjustmentInput, key: string) =>
      idempotent<CreditMovement>(base(ownerId, '/adjustment'), input, key),
  }
}

export const providerCreditsAdmin = adminCredits(
  (providerId, suffix = '') =>
    `/admin/providers/${encodeURIComponent(providerId)}/credits${suffix}`,
)
/** The independent driver's own account: never the provider's, even for the same person. */
export const independentCreditsAdmin = adminCredits(
  (driverId, suffix = '') =>
    `/admin/drivers/${encodeURIComponent(driverId)}/independent/credits${suffix}`,
)

/** PROVIDER_ADMIN, read only: providerId selects among my memberships and never travels in a body. */
export const myProviderCredits = {
  account: (providerId: string, signal?: AbortSignal) =>
    api<CreditAccount>(
      withQuery('/provider/credits', { providerId }),
      'GET',
      undefined,
      signal,
    ),
  ledger: (providerId: string, filters: LedgerFilters, signal?: AbortSignal) =>
    api<Page<CreditLedgerEntry>>(
      withQuery('/provider/credits/ledger', { providerId, ...filters }),
      'GET',
      undefined,
      signal,
    ),
}
/** DRIVER, read only: the account is resolved from the session, never from an id sent by the web. */
export const myDriverCredits = {
  account: (signal?: AbortSignal) =>
    api<CreditAccount>('/driver/credits', 'GET', undefined, signal),
  ledger: (filters: LedgerFilters, signal?: AbortSignal) =>
    api<Page<CreditLedgerEntry>>(
      withQuery('/driver/credits/ledger', { ...filters }),
      'GET',
      undefined,
      signal,
    ),
}
