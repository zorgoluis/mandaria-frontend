import { useSyncExternalStore } from 'react'
import type { LinkMarker } from './types'
export const markerStorage = 'mandaria.tracking.pending.v1'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
window.addEventListener('storage', emit)
export function linkMarkers(): LinkMarker[] {
  const raw: unknown = JSON.parse(localStorage.getItem(markerStorage) ?? '[]')
  if (
    !Array.isArray(raw) ||
    raw.some(
      (m) =>
        !m ||
        typeof m.actor !== 'string' ||
        typeof m.publicId !== 'string' ||
        typeof m.key !== 'string' ||
        !['ISSUE', 'REVOKE'].includes(m.operation) ||
        !/^[1-9]\d{0,18}$/.test(m.expectedLinkRevision),
    )
  )
    throw new Error(
      'Recuperación local ilegible. No borres el almacenamiento; solicita soporte.',
    )
  // Explicit projection prevents persisting unexpected properties from API responses.
  return raw.map(
    ({ actor, publicId, key, operation, expectedLinkRevision }) => ({
      actor,
      publicId,
      key,
      operation,
      expectedLinkRevision,
    }),
  )
}
export function addLinkMarker(m: LinkMarker) {
  localStorage.setItem(
    markerStorage,
    JSON.stringify([
      ...linkMarkers(),
      {
        actor: m.actor,
        publicId: m.publicId,
        operation: m.operation,
        key: m.key,
        expectedLinkRevision: m.expectedLinkRevision,
      },
    ]),
  )
  emit()
}
export function removeLinkMarker(key: string) {
  localStorage.setItem(
    markerStorage,
    JSON.stringify(linkMarkers().filter((m) => m.key !== key)),
  )
  emit()
}
export function useLinkMarkers() {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    () => localStorage.getItem(markerStorage),
  )
  return linkMarkers()
}
