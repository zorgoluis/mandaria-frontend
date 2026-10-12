import { remaining } from './format'

/** DispatchSearchResponse, backend OpenAPI / automatic-search handoff 2026-10-10. */
export interface DispatchSearch {
  state:
    | 'SEARCHING'
    | 'RETRY_PENDING'
    | 'EXECUTOR_FOUND'
    | 'CANCELLED'
    | 'EXHAUSTED'
    | 'STOPPED'
  attempt: number
  maxAttempts: 5
  windowExpiresAt: string
  stoppedReason: string | null
}

/** A previous award may be released: EXECUTOR_FOUND never starts another search. */
export function searchAllowsTake(search?: DispatchSearch, now = Date.now()) {
  return (
    !search ||
    ((search.state === 'SEARCHING' || search.state === 'EXECUTOR_FOUND') &&
      remaining(search.windowExpiresAt, now) !== null)
  )
}

/** Reuse React Query polling; errors slow reads, never cause a business retry. */
export function dispatchPollInterval(query: {
  state: { error: unknown; fetchFailureCount: number }
}) {
  return query.state.error
    ? Math.min(
        120_000,
        30_000 * 2 ** Math.min(query.state.fetchFailureCount, 2),
      )
    : 15_000
}
