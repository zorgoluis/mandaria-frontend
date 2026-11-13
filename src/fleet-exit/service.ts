import { api, apiOnce } from '../services/api'
import { queryString } from '../services/query'
import { parse, revision, uuid } from './validation'
import type {
  Scope,
  Filters,
  Context,
  Detail,
  Summary,
  Notice,
  Page,
  Operation,
  Body,
  Resource,
  Attempt,
  CommandResult,
} from './types'
const id = (v: string) => {
  if (!uuid(v)) throw Error('Referencia de salida no válida.')
  return encodeURIComponent(v)
}
function scoped(s: Scope, route: string, filters: Filters = {}) {
  if (
    s.surface === 'driver' &&
    (s.providerId || filters.providerId || filters.driverId)
  )
    throw Error('La consulta DRIVER sólo admite el contexto propio.')
  if (s.surface === 'provider' && !uuid(s.providerId))
    throw Error('Selecciona un proveedor autorizado.')
  const q = queryString({
    status: filters.status,
    driverId: filters.driverId,
    limit: filters.limit,
    pageToken: filters.pageToken,
    providerId: s.surface === 'provider' ? s.providerId : filters.providerId,
  })
  return `/${s.surface}/${route}${q ? '?' + q : ''}`
}
export function commandPath(
  s: Scope,
  operation: Operation,
  resourceId: string,
) {
  if (operation === 'START' && s.surface === 'admin')
    throw Error('SUPER_ADMIN no inicia salidas.')
  return scoped(
    s,
    operation === 'START'
      ? `fleet-affiliations/${id(resourceId)}/exit-requests`
      : `fleet-exit-requests/${id(resourceId)}/recheck`,
  )
}
export function validateBody(
  op: Operation,
  body: Body,
  surface?: Scope['surface'],
) {
  const keys = Object.keys(body).sort().join(',')
  if (
    op === 'START'
      ? keys !== 'expectedAffiliationRevision,reasonCode' ||
        !('expectedAffiliationRevision' in body) ||
        !revision(body.expectedAffiliationRevision) ||
        !['PROVIDER_REMOVAL', 'VOLUNTARY_EXIT'].includes(body.reasonCode) ||
        (surface !== undefined &&
          body.reasonCode !==
            (surface === 'driver' ? 'VOLUNTARY_EXIT' : 'PROVIDER_REMOVAL'))
      : keys !== 'expectedExitRevision' ||
        !('expectedExitRevision' in body) ||
        !revision(body.expectedExitRevision)
  )
    throw Error('Intención incompatible con el contrato de salida.')
}
export const exits = {
  context: async (s: Scope, driverId: string, signal?: AbortSignal) => {
    const c = parse<Context>(
      'context',
      await api(
        scoped(
          s,
          s.surface === 'driver'
            ? 'fleet-affiliation-context'
            : `drivers/${id(driverId)}/fleet-affiliation-context`,
        ),
        'GET',
        undefined,
        signal,
      ),
    )
    if (s.surface === 'provider' && c.independent !== undefined)
      throw Error('Proyección incompatible con la privacidad del proveedor.')
    return c
  },
  detail: async (s: Scope, exitId: string, signal?: AbortSignal) =>
    parse<Detail>(
      'detail',
      await api(
        scoped(s, `fleet-exit-requests/${id(exitId)}`),
        'GET',
        undefined,
        signal,
      ),
    ),
  list: async (s: Scope, f: Filters, signal?: AbortSignal) =>
    parse<Page<Summary>>(
      'list',
      await api(scoped(s, 'fleet-exit-requests', f), 'GET', undefined, signal),
    ),
  notices: async (s: Scope, f: Filters, signal?: AbortSignal) =>
    parse<Page<Notice>>(
      'notices',
      await api(scoped(s, 'fleet-exit-notices', f), 'GET', undefined, signal),
    ),
  send: async (
    s: Scope,
    op: Operation,
    resourceId: string,
    key: string,
    body: Body,
  ) => {
    validateBody(op, body, s.surface)
    return parse<CommandResult>(
      'command',
      await apiOnce(commandPath(s, op, resourceId), 'POST', body, undefined, {
        'Idempotency-Key': id(key),
      }),
    )
  },
  attempt: async (key: string, r: Resource, close = false) => {
    if (
      r.resourceType !== (r.operation === 'START' ? 'AFFILIATION' : 'EXIT') ||
      !uuid(r.resourceId)
    )
      throw Error('Recurso de recuperación no válido.')
    const path = `/fleet-exit-attempts/${id(key)}`
    return parse<Attempt>(
      'attempt',
      await apiOnce(
        close ? path + '/close' : path + '?' + queryString({ ...r }),
        close ? 'POST' : 'GET',
        close ? r : undefined,
      ),
    )
  },
}

export const exitLink = (s: Scope, id?: string) =>
  `${s.surface === 'admin' ? '/admin' : s.surface === 'driver' ? '/driver' : ''}/fleet-exits${id ? '/' + encodeURIComponent(id) : ''}${s.providerId ? '?providerId=' + encodeURIComponent(s.providerId) : ''}`
