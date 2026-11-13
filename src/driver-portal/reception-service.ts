import { api, apiOnce } from '../services/api'
import { uuid, revision } from '../fleet-exit/validation'
export interface Reception {
  schemaVersion: 1
  revision: string
  serverTime: string
  allowedZones: { id: string; name: string }[]
  selectedZoneId: string | null
  shift: { id: string; startsAt: string; expiresAt: string } | null
  state: 'OFF' | 'PAUSED' | 'PREVIEW' | 'READY'
  reason: string
  canAttemptTake: boolean
  limits: { defaultMinutes: number; minMinutes: number; maxMinutes: number }
  requestId?: string
}
export interface ReceptionCommand {
  requestId: string
  expectedRevision: string
  action: 'START' | 'RENEW' | 'STOP' | 'SELECT_ZONE'
  zoneId?: string
  durationMinutes?: number
}
export const receptionPath = () => '/driver/offer-reception'
export function validateCommand(b: ReceptionCommand) {
  if (
    !uuid(b.requestId) ||
    !revision(b.expectedRevision) ||
    !['START', 'RENEW', 'STOP', 'SELECT_ZONE'].includes(b.action) ||
    Object.keys(b).some(
      (k) =>
        ![
          'requestId',
          'expectedRevision',
          'action',
          'zoneId',
          'durationMinutes',
        ].includes(k),
    ) ||
    (b.zoneId !== undefined && !uuid(b.zoneId)) ||
    (b.durationMinutes !== undefined &&
      (!Number.isInteger(b.durationMinutes) ||
        b.durationMinutes < 60 ||
        b.durationMinutes > 720)) ||
    (b.action === 'STOP' &&
      (b.zoneId !== undefined || b.durationMinutes !== undefined)) ||
    (b.action === 'SELECT_ZONE' &&
      (!b.zoneId || b.durationMinutes !== undefined))
  )
    throw Error('Intención de recepción inválida.')
}
export function parseReception(r: Reception) {
  if (
    r?.schemaVersion !== 1 ||
    !revision(r.revision) ||
    !Array.isArray(r.allowedZones) ||
    !['OFF', 'PAUSED', 'PREVIEW', 'READY'].includes(r.state) ||
    typeof r.canAttemptTake !== 'boolean'
  )
    throw Error('Recepción no reconocida; no se autoriza tomar.')
  return r
}
export const reception = {
  get: async () => parseReception(await api<Reception>(receptionPath())),
  put: async (_scope: string, b: ReceptionCommand) => {
    validateCommand(b)
    const r = parseReception(
      await apiOnce<Reception>(receptionPath(), 'PUT', b),
    )
    if (r.requestId !== b.requestId)
      throw Error('Recibo de recepción incompatible.')
    return r
  },
  availability: (availability: 'AVAILABLE' | 'OFFLINE') =>
    apiOnce('/driver/availability', 'PATCH', { availability }),
}
export const ready = (r?: Reception) =>
  r?.state === 'READY' && r.canAttemptTake === true
export interface Feed {
  schemaVersion: 1
  receptionRevision: string
  items: { dispatchId: string; offerRevision: string; expiresAt: string }[]
  nextPageToken: string | null
  eventCursor: string
  snapshotId: string
  snapshotExpiresAt: string
}
export async function feed(): Promise<Feed> {
  const first = await api<Feed>('/driver/offer-feed?limit=100')
  const items = [...first.items],
    seen = new Set<string>()
  let token = first.nextPageToken
  while (token) {
    if (seen.has(token))
      throw Error('Cursor de ofertas repetido; actualiza la fotografía.')
    seen.add(token)
    const page = await api<Feed>(
      '/driver/offer-feed?pageToken=' + encodeURIComponent(token),
    )
    if (
      page.snapshotId !== first.snapshotId ||
      page.receptionRevision !== first.receptionRevision
    )
      throw Error('La recepción cambió; actualiza la fotografía.')
    items.push(...page.items)
    token = page.nextPageToken
  }
  return {
    ...first,
    items: [...new Map(items.map((i) => [i.dispatchId, i])).values()],
    nextPageToken: null,
  }
}
