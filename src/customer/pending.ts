import { queryClient } from '../services/query'
import { useSyncExternalStore } from 'react'
import { apiOnce } from '../services/api'
import { ApiError, errorMessage } from '../services/errors'
export interface Pending {
  actor: string
  key: string
  kind: 'prequote' | 'convert' | 'accept' | 'cancel' | 'policy'
  ref: string
  related?: string
}
const storage = 'mandaria.customer.pending.v1'
const listeners = new Set<() => void>()
const bodies = new Map<string, { path: string; json: string; keyed: boolean }>()
let lastError = ''
export const useCommandError = () =>
  useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => {
        listeners.delete(f)
      }
    },
    () => lastError,
  )
const emit = () => listeners.forEach((f) => f())
window.addEventListener('storage', emit)
export function readPending(): Pending[] {
  const raw = localStorage.getItem(storage)
  if (!raw) return []
  const data: unknown = JSON.parse(raw)
  if (
    !Array.isArray(data) ||
    data.some(
      (m) =>
        !m ||
        typeof m.actor !== 'string' ||
        typeof m.key !== 'string' ||
        typeof m.ref !== 'string' ||
        !['prequote', 'convert', 'accept', 'cancel', 'policy'].includes(m.kind),
    )
  )
    throw new Error(
      'No se puede leer la recuperación local. No borres el almacenamiento; solicita soporte.',
    )
  return data
}
function save(values: Pending[]) {
  localStorage.setItem(storage, JSON.stringify(values))
  emit()
}
export function clearPending(key: string) {
  save(readPending().filter((p) => p.key !== key))
  bodies.delete(key)
}
export function usePending() {
  useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => {
        listeners.delete(f)
      }
    },
    () => localStorage.getItem(storage),
  )
  return readPending()
}
export function forgetBodies() {
  bodies.clear()
  lastError = ''
  emit()
}
export async function command<T>(
  actor: string,
  kind: Pending['kind'],
  ref: string,
  path: string,
  body: unknown,
  related?: string,
): Promise<T> {
  if (!navigator.locks)
    throw new Error(
      'Este navegador no permite coordinar pestañas. Usa un navegador actualizado.',
    )
  return navigator.locks.request(
    'mandaria-customer-operations',
    { ifAvailable: true },
    async (lock) => {
      if (!lock)
        throw new Error('Ya hay una operación en curso en otra pestaña.')
      if (
        readPending().some(
          (p) =>
            p.actor === actor ||
            p.kind !== 'policy' ||
            (kind === 'policy' && p.ref === ref),
        )
      )
        throw new Error(
          'Hay una operación pendiente de reconciliación. Consulta antes de continuar.',
        )
      const pending: Pending = {
        actor,
        kind,
        ref,
        ...(kind === 'accept' && related ? { related } : {}),
        key: crypto.randomUUID(),
      }
      save([...readPending(), pending])
      bodies.set(pending.key, {
        path,
        json: JSON.stringify(body),
        keyed: kind !== 'cancel',
      })
      return send<T>(pending, true)
    },
  )
}
async function send<T>(p: Pending, initial = false): Promise<T> {
  const b = bodies.get(p.key)
  if (!b)
    throw new Error(
      'El cuerpo original ya no está en memoria. Consulta el resultado; no reconstruyas ni repitas la operación.',
    )
  try {
    const result = await apiOnce<T>(
      b.path,
      'POST',
      JSON.parse(b.json),
      undefined,
      b.keyed ? { 'Idempotency-Key': p.key } : undefined,
    )
    await queryClient.invalidateQueries({
      queryKey: [p.kind === 'policy' ? 'shipping-policy' : 'customer'],
    })
    lastError = ''
    clearPending(p.key)
    return result
  } catch (e) {
    lastError = errorMessage(e)
    emit()
    if (
      initial &&
      e instanceof ApiError &&
      ([400, 403, 404, 410, 422, 429].includes(e.status) ||
        [
          'CUSTOMER_ACTIVE_REQUEST_LIMIT',
          'CUSTOMER_ACTIVE_REQUESTS',
          'PROFILE_REVISION_CONFLICT',
          'SHIPPING_POLICY_CHANGED',
          'SHIPPING_TERMS_MISMATCH',
          'CUSTOMER_AUTHORIZATION_MISMATCH',
          'QUOTE_EXPIRED',
          'QUOTE_NOT_ACCEPTABLE',
          'SHIPPING_POLICY_REVISION_CONFLICT',
        ].includes(e.code ?? ''))
    )
      clearPending(p.key)
    throw e
  }
}
export async function retryCommand<T>(actor: string, key: string): Promise<T> {
  return navigator.locks.request(
    'mandaria-customer-operations',
    { ifAvailable: true },
    async (lock) => {
      if (!lock) throw new Error('Otra operación está en curso.')
      const p = readPending().find((p) => p.key === key && p.actor === actor)
      if (!p) throw new Error('Intento no disponible para esta cuenta.')
      return send<T>(p)
    },
  )
}
export const canReplay = (key: string) => bodies.has(key)
