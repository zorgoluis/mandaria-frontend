import { api, apiOnce } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  Scope,
  ExecutionDetail,
  Incident,
  IncidentDetail,
  Candidate,
} from './types'
export const executionPath = (scope: Scope, suffix: string) =>
  `/${scope.surface}/dispatches/${encodeURIComponent(scope.dispatchId)}/${suffix}${scope.surface === 'provider' ? `?providerId=${encodeURIComponent(scope.providerId ?? '')}` : ''}`
export const executionApi = {
  detail: (scope: Scope, page: number, signal?: AbortSignal) =>
    api<ExecutionDetail>(
      executionPath(scope, 'execution') +
        (scope.surface === 'provider' ? '&' : '?') +
        queryString({ page, pageSize: 20 }),
      'GET',
      undefined,
      signal,
    ),
  incidents: (status: string, page: number, signal?: AbortSignal) =>
    api<Page<Incident>>(
      `/admin/custody-incidents?${queryString({ status, page, pageSize: 20 })}`,
      'GET',
      undefined,
      signal,
    ),
  incident: (id: string, incident: string, signal?: AbortSignal) =>
    api<IncidentDetail>(
      executionPath(
        { surface: 'admin', dispatchId: id },
        `custody-incidents/${encodeURIComponent(incident)}`,
      ),
      'GET',
      undefined,
      signal,
    ),
  candidates: (id: string, mode: string, page: number, signal?: AbortSignal) =>
    api<Page<Candidate>>(
      executionPath(
        { surface: 'admin', dispatchId: id },
        'custody-transfer-candidates',
      ) + `?${queryString({ mode, page, pageSize: 20 })}`,
      'GET',
      undefined,
      signal,
    ),
  command: (path: string, body: unknown, key: string) =>
    apiOnce<unknown>(path, 'POST', body, undefined, { 'Idempotency-Key': key }),
}
