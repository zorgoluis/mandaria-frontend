import { useSyncExternalStore } from 'react'
import { env } from '../config/env'

/** Durable blocking marker, not a replay payload. No names, reasons or confirmations. */
export interface ResolutionMarker {
  actor: string
  dispatchId: string
  incidentId: string
  assignmentId: string
  expectedRevision: number
  type: 'TRANSFER' | 'RETURN_TO_ORIGIN'
  key: string
}
export const reconciliationStorageKey = `mandaria.resolution-pending.v1:${env.apiUrl}`
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const snapshot = () => {
  try {
    return localStorage.getItem(reconciliationStorageKey) ?? '[]'
  } catch {
    return 'unavailable'
  }
}
function decode(raw: string): {
  markers: ResolutionMarker[]
  unavailable: boolean
} {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      !Array.isArray(value) ||
      !value.every((m: unknown) => {
        if (!m || typeof m !== 'object') return false
        const v = m as Record<string, unknown>
        return (
          Object.keys(v).length === 7 &&
          ['actor', 'dispatchId', 'incidentId', 'assignmentId', 'key'].every(
            (k) =>
              typeof v[k] === 'string' && v[k].length > 0 && v[k].length <= 200,
          ) &&
          Number.isSafeInteger(v.expectedRevision) &&
          Number(v.expectedRevision) >= 0 &&
          (v.type === 'TRANSFER' || v.type === 'RETURN_TO_ORIGIN')
        )
      })
    )
      throw new Error('Invalid marker')
    return { markers: value as ResolutionMarker[], unavailable: false }
  } catch {
    return { markers: [], unavailable: true }
  }
}
export const readResolutionMarkers = () => decode(snapshot())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === reconciliationStorageKey || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
export function useResolutionMarkers() {
  return decode(useSyncExternalStore(subscribe, snapshot))
}
export function resolutionBlocked(dispatchId: string, incidentId: string) {
  const state = readResolutionMarkers()
  return (
    state.unavailable ||
    state.markers.some(
      (m) => m.dispatchId === dispatchId && m.incidentId === incidentId,
    )
  )
}
export function persistResolutionMarker(marker: ResolutionMarker) {
  const state = readResolutionMarkers()
  if (
    state.unavailable ||
    state.markers.some(
      (m) =>
        m.dispatchId === marker.dispatchId &&
        m.incidentId === marker.incidentId,
    )
  )
    return false
  try {
    localStorage.setItem(
      reconciliationStorageKey,
      JSON.stringify([...state.markers, marker]),
    )
    const saved = readResolutionMarkers().markers.some(
      (m) => m.key === marker.key,
    )
    emit()
    return saved
  } catch {
    emit()
    return false
  }
}
export function removeResolutionMarker(key: string) {
  const state = readResolutionMarkers()
  if (state.unavailable) return
  try {
    const remaining = state.markers.filter((m) => m.key !== key)
    if (remaining.length)
      localStorage.setItem(reconciliationStorageKey, JSON.stringify(remaining))
    else localStorage.removeItem(reconciliationStorageKey)
    emit()
  } catch {
    /* Keep blocking if storage cannot be updated. */
  }
}
