import { useSyncExternalStore } from 'react'
import { env } from '../config/env'
import { ApiError } from '../services/errors'
import { uuid } from './contract'
export interface Marker {
  actor: string
  key: string
  op: string
  id?: string
  accepted?: true
}
export const storageKey = 'mandaria.deletion.references.v1:' + env.apiUrl
const changed = 'deletion-references-change'
const snap = () => {
  try {
    return localStorage.getItem(storageKey) || '[]'
  } catch {
    return '!unavailable'
  }
}
function subscribe(fn: () => void) {
  window.addEventListener(changed, fn)
  window.addEventListener('storage', fn)
  return () => {
    window.removeEventListener(changed, fn)
    window.removeEventListener('storage', fn)
  }
}
export function readMarkers(raw = snap()): Marker[] {
  const items: unknown = JSON.parse(raw)
  if (
    !Array.isArray(items) ||
    items.some(
      (m) =>
        !m ||
        !uuid.test(m.actor) ||
        !uuid.test(m.key) ||
        ![
          'create',
          'cancel',
          'resolve',
          'retention-decisions',
          'restore-policy',
        ].includes(m.op) ||
        (m.id && !uuid.test(m.id)) ||
        (['resolve', 'retention-decisions', 'restore-policy'].includes(m.op) &&
          !uuid.test(m.id ?? '')) ||
        (m.accepted !== undefined && m.accepted !== true) ||
        Object.keys(m).some(
          (k) => !['actor', 'key', 'op', 'id', 'accepted'].includes(k),
        ),
    )
  )
    throw Error('Marcadores no disponibles')
  return items
}
export function useMarkers() {
  const raw = useSyncExternalStore(subscribe, snap)
  try {
    return { items: readMarkers(raw), unavailable: false }
  } catch {
    return { items: [], unavailable: true }
  }
}
function write(items: Marker[]) {
  localStorage.setItem(storageKey, JSON.stringify(items))
  window.dispatchEvent(new Event(changed))
}
export function begin(actor: string, op: string, id?: string) {
  const all = readMarkers()
  if (all.some((m) => m.actor === actor && !m.accepted))
    throw Error('Hay un intento sin resolver')
  const marker = { actor, op, key: crypto.randomUUID(), ...(id ? { id } : {}) }
  readMarkers(JSON.stringify([marker]))
  write([...all, marker])
  return marker
}
export function accept(m: Marker, id?: string) {
  write(
    readMarkers().map((x) =>
      x.key === m.key && x.actor === m.actor
        ? { ...x, accepted: true, ...(id ? { id } : {}) }
        : x,
    ),
  )
}
export function reject(m: Marker) {
  write(readMarkers().filter((x) => x.actor !== m.actor || x.key !== m.key))
}
export function confirmedRejection(e: unknown) {
  return (
    e instanceof ApiError &&
    ((e.status >= 400 &&
      e.status < 500 &&
      ![401, 408, 429].includes(e.status) &&
      e.code !== 'IDEMPOTENCY_KEY_REUSED') ||
      e.code === 'PRIVACY_WORKFLOW_UNAVAILABLE')
  )
}
