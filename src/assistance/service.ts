import { api } from '../services/api'
import { collections } from './types'
import { queryString } from '../services/query'
import { commandRoutes, type CommandBodies } from './contract'
import type {
  Scope,
  Summary,
  CaseDetail,
  Collection,
  CursorPage,
  RecordRow,
  AttemptReceipt,
} from './types'
export type Operation = keyof CommandBodies | 'SEAL_EVIDENCE'
export const ownerOperations: Operation[] = [
  'CREATE',
  'CONTRIBUTE',
  'DECLARE_MOVEMENT',
  'DISPUTE',
]
const base = (s: Scope) => `/${s.surface}/fleet-assistance-cases`
export const scoped = (s: Scope, path: string) =>
  path + (s.providerId ? `?${queryString({ providerId: s.providerId })}` : '')
export function commandPath(s: Scope, op: Operation, id: string, ref?: string) {
  if (s.surface === 'provider' && !ownerOperations.includes(op))
    throw Error('Acción administrativa no autorizada')
  if (op === 'SEAL_EVIDENCE')
    return scoped(
      s,
      `${base(s)}/${encodeURIComponent(id)}/evidence-uploads/${encodeURIComponent(ref ?? '')}/content`,
    )
  return scoped(
    s,
    base(s) +
      commandRoutes[op]
        .replace('{id}', encodeURIComponent(id))
        .replace('{p}', encodeURIComponent(ref ?? '')),
  )
}
export interface Filters {
  status?: 'OPEN' | 'CLOSED'
  dispatchId?: string
  pageToken?: string
  limit?: number
}
const query = (s: Scope, f: Filters) =>
  queryString({
    status: f.status,
    dispatchId: f.dispatchId,
    providerId: s.providerId,
    limit: f.limit ?? 25,
    pageToken: f.pageToken,
  })
export const assistance = {
  list: (s: Scope, f: Filters, signal?: AbortSignal) =>
    api<CursorPage<Summary>>(
      `${base(s)}?${query(s, f)}`,
      'GET',
      undefined,
      signal,
    ),
  detail: (s: Scope, id: string, signal?: AbortSignal) =>
    api<CaseDetail>(
      scoped(s, `${base(s)}/${encodeURIComponent(id)}`),
      'GET',
      undefined,
      signal,
    ),
  collection: (
    s: Scope,
    id: string,
    name: Collection,
    pageToken?: string,
    signal?: AbortSignal,
  ) => {
    if (!collections.includes(name)) throw Error('Colección no autorizada')
    if (s.surface !== 'admin' && name !== 'history')
      throw Error('Colección administrativa no autorizada')
    return api<CursorPage<RecordRow>>(
      `${base(s)}/${encodeURIComponent(id)}/${name}?${query(s, { pageToken })}`,
      'GET',
      undefined,
      signal,
    )
  },
  proposal: (s: Scope, id: string, p: string, signal?: AbortSignal) => {
    if (s.surface !== 'admin')
      throw Error('Propuesta administrativa no autorizada')
    return api<RecordRow>(
      `${base(s)}/${encodeURIComponent(id)}/proposals/${encodeURIComponent(p)}`,
      'GET',
      undefined,
      signal,
    )
  },
  send: <K extends keyof CommandBodies>(
    s: Scope,
    op: K,
    id: string,
    key: string,
    body: CommandBodies[K],
    ref?: string,
  ) =>
    api<Record<string, unknown>>(
      commandPath(s, op, id, ref),
      'POST',
      body,
      undefined,
      { 'Idempotency-Key': key },
    ),
  attempt: (key: string, caseId: string, operation: Operation, close = false) =>
    api<AttemptReceipt>(
      `/fleet-assistance-attempts/${encodeURIComponent(key)}${close ? '/close' : `?${queryString({ caseId, operation })}`}`,
      close ? 'POST' : 'GET',
      close ? { caseId, operation } : undefined,
    ),
}
