import { useSyncExternalStore } from 'react'
import { env } from '../config/env'

/** Original receipt coordinates only; never a replay payload. */
export interface HistoricalAdvanceMarker {
  actor: string
  dispatchId: string
  providerId?: string
  key: string
}
export const historicalStorageKey = `mandaria.provider-advance-pending.v1:${env.apiUrl}`
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
const snapshot = () => {
  try {
    return localStorage.getItem(historicalStorageKey) ?? '[]'
  } catch {
    return 'unavailable'
  }
}
function decode(raw: string): {
  markers: HistoricalAdvanceMarker[]
  unavailable: boolean
} {
  try {
    const values: unknown = JSON.parse(raw)
    if (
      !Array.isArray(values) ||
      !values.every(
        (v) =>
          v &&
          typeof v === 'object' &&
          Object.keys(v).every((k) =>
            ['actor', 'dispatchId', 'providerId', 'key'].includes(k),
          ) &&
          ['actor', 'dispatchId', 'key'].every(
            (k) =>
              typeof v[k] === 'string' && v[k].length > 0 && v[k].length <= 200,
          ) &&
          (v.providerId === undefined ||
            (typeof v.providerId === 'string' &&
              v.providerId.length > 0 &&
              v.providerId.length <= 200)),
      )
    )
      throw new Error('Invalid marker')
    return { markers: values as HistoricalAdvanceMarker[], unavailable: false }
  } catch {
    return { markers: [], unavailable: true }
  }
}
export const readHistoricalMarkers = () => decode(snapshot())
export function persistHistoricalMarker(marker: HistoricalAdvanceMarker) {
  const state = readHistoricalMarkers()
  if (state.unavailable) return false
  const existing = state.markers.find(
    (m) => m.key === marker.key && m.actor === marker.actor,
  )
  if (existing)
    return (
      existing.dispatchId === marker.dispatchId &&
      existing.providerId === marker.providerId
    )
  try {
    localStorage.setItem(
      historicalStorageKey,
      JSON.stringify([...state.markers, marker]),
    )
    emit()
    return true
  } catch {
    return false
  }
}
export function removeHistoricalMarker(key: string, actor: string) {
  const state = readHistoricalMarkers()
  if (state.unavailable) return false
  try {
    localStorage.setItem(
      historicalStorageKey,
      JSON.stringify(
        state.markers.filter((m) => m.key !== key || m.actor !== actor),
      ),
    )
    emit()
    return true
  } catch {
    return false
  }
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  const changed = (event: StorageEvent) => {
    if (event.key === historicalStorageKey || event.key === null) fn()
  }
  window.addEventListener('storage', changed)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', changed)
  }
}
export const useHistoricalMarkers = () =>
  decode(useSyncExternalStore(subscribe, snapshot))
