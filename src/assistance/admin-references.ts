import { api } from '../services/api'
import schema from './admin-reference-schema.json'
import type { Scope } from './types'

export interface ReferenceItems {
  parties: {
    id: string
    kind: string
    label: string
    contactSourceRef: string | null
    methods: ('REGISTERED_CHANNEL_CALLBACK' | 'AUTHENTICATED_SELF')[]
  }
  stops: {
    id: string
    type: string
    sequence: number
    contactSourceRef: string
    registrationKinds: ('ORIGIN' | 'RECIPIENT' | 'EXTERNAL')[]
  }
  participations: {
    id: string
    assignmentId: string
    driverId: string
    providerId: string | null
    vehicleId: string | null
    startedAt: string
    endedAt: string | null
  }
  'recovery-sessions': { id: string; newSessionId: string; expiresAt: string }
  'release-receipts': {
    id: string
    existingReceiptId: string
    assignmentId: string
    createdAt: string
  }
  'shipping-declarations': {
    id: string
    sourceRef: string
    amount: string
    currency: 'MXN'
    occurredAt: string
    toPartyIds: string[]
    declaredConcepts: ['SHIPPING_FEE']
  }
  'evidence-sources': {
    id: string
    kind: 'VERIFIED_CONTACT_NOTE' | 'EXISTING_INTERNAL_RECORD'
    sourceRef: {
      type:
        | 'CONTACT_VERIFICATION_NOTE'
        | 'ASSIGNMENT'
        | 'EXECUTION_EVENT'
        | 'CUSTODY_RESOLUTION'
        | 'SHIPPING_DECLARATION'
        | 'COMMAND_RECEIPT'
      id: string
      sha256: string
    }
    partyId: string | null
  }
}
export type ReferenceSection = keyof ReferenceItems
export const referenceSections: ReferenceSection[] = [
  'parties',
  'stops',
  'participations',
  'recovery-sessions',
  'release-receipts',
  'shipping-declarations',
  'evidence-sources',
]
export interface ReferencePage<S extends ReferenceSection> {
  schemaVersion: 1
  caseId: string
  caseRevision: string
  materialRevision: string
  section: S
  commandsEnabled: boolean
  asOf: string
  items: ReferenceItems[S][]
  nextPageToken: string | null
}
export type ReferenceCatalog = { [S in ReferenceSection]: ReferencePage<S> }
type JsonSchema = {
  type?: string | string[]
  const?: unknown
  anyOf?: JsonSchema[]
  enum?: unknown[]
  pattern?: string
  required?: string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  prefixItems?: JsonSchema[]
  minItems?: number
  maxItems?: number
}
function matches(s: JsonSchema, v: unknown): boolean {
  if (s.anyOf) return s.anyOf.some((x) => matches(x, v))
  if (Array.isArray(s.type))
    return s.type.some((type) => matches({ ...s, type }, v))
  if ('const' in s && s.const !== v) return false
  if (s.enum && !s.enum.includes(v)) return false
  if (s.type === 'null') return v === null
  if (s.type === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false
    const r = v as Record<string, unknown>
    return (
      (s.required ?? []).every((k) => k in r) &&
      Object.entries(r).every(
        ([k, val]) => !!s.properties?.[k] && matches(s.properties[k], val),
      )
    )
  }
  if (s.type === 'array')
    return (
      Array.isArray(v) &&
      v.length >= (s.minItems ?? 0) &&
      v.length <= (s.maxItems ?? Infinity) &&
      v.every((val, i) => matches(s.prefixItems?.[i] ?? s.items ?? {}, val))
    )
  if (s.type === 'string')
    return (
      typeof v === 'string' && (!s.pattern || new RegExp(s.pattern).test(v))
    )
  if (s.type === 'number' || s.type === 'integer')
    return (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      (s.type !== 'integer' || Number.isInteger(v))
    )
  if (s.type === 'boolean') return typeof v === 'boolean'
  return true
}
export function parseReferences<S extends ReferenceSection>(
  value: unknown,
  caseId: string,
  section: S,
): ReferencePage<S> {
  if (!matches(schema as unknown as JsonSchema, value))
    throw Error('Respuesta de referencias administrativas no válida.')
  const page = value as ReferencePage<S>
  if (page.caseId !== caseId || page.section !== section)
    throw Error('Las referencias pertenecen a otro contexto.')
  return page
}
export async function referencePage<S extends ReferenceSection>(
  scope: Scope,
  caseId: string,
  section: S,
  query: { limit?: number; pageToken?: string } = {},
  signal?: AbortSignal,
): Promise<ReferencePage<S>> {
  if (
    scope.surface !== 'admin' ||
    scope.providerId ||
    !referenceSections.includes(section)
  )
    throw Error('Referencias exclusivas de administración.')
  if (
    Object.keys(query).some((k) => !['limit', 'pageToken'].includes(k)) ||
    (query.limit !== undefined &&
      (!Number.isInteger(query.limit) ||
        query.limit < 1 ||
        query.limit > 100)) ||
    (query.pageToken !== undefined &&
      (typeof query.pageToken !== 'string' || query.pageToken.length > 3000))
  )
    throw Error('Consulta de referencias no válida.')
  const params = new URLSearchParams({ limit: String(query.limit ?? 25) })
  if (query.pageToken !== undefined) params.set('pageToken', query.pageToken)
  return parseReferences(
    await api<unknown>(
      `/admin/fleet-assistance-cases/${encodeURIComponent(caseId)}/administrative-references/${section}?${params}`,
      'GET',
      undefined,
      signal,
    ),
    caseId,
    section,
  )
}
export async function loadReferences<S extends ReferenceSection>(
  scope: Scope,
  caseId: string,
  section: S,
  signal?: AbortSignal,
): Promise<ReferencePage<S>> {
  let page = await referencePage(scope, caseId, section, {}, signal)
  const initial = page,
    items = new Map(page.items.map((item) => [item.id, item])),
    tokens = new Set<string>()
  while (page.nextPageToken !== null) {
    if (tokens.has(page.nextPageToken) || tokens.size >= 1000)
      throw Error('Paginación incompleta. Recarga las referencias.')
    tokens.add(page.nextPageToken)
    page = await referencePage(
      scope,
      caseId,
      section,
      { pageToken: page.nextPageToken },
      signal,
    )
    if (
      page.asOf !== initial.asOf ||
      page.caseRevision !== initial.caseRevision ||
      page.materialRevision !== initial.materialRevision ||
      page.commandsEnabled !== initial.commandsEnabled
    )
      throw Error('Las referencias cambiaron. Recarga y revisa la intención.')
    page.items.forEach((item) => items.set(item.id, item))
  }
  return { ...page, items: [...items.values()] }
}
