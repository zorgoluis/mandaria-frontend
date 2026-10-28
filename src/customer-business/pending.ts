import { useSyncExternalStore } from 'react'
import { ApiError } from '../services/errors'
import { queryClient } from '../services/query'
import { customer } from '../customer/service'
import { business } from './service'
import {
  hasBusinessContract,
  isAdmin,
  type Intention,
  type Marker,
  type Receipt,
} from './contract'
export const storageKey = 'mandaria.business.pending.v1'
let generation = 0
const bodies = new Map<string, string>()
const cooldowns = new Map<string, number>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())
const failure = (message: string) => new ApiError(409, message)
export function forgetBusinessBodies() {
  generation++
  bodies.clear()
  cooldowns.clear()
  notify()
}
function snapshot() {
  try {
    return localStorage.getItem(storageKey) ?? '[]'
  } catch {
    return 'unavailable'
  }
}
export function readMarkers(): Marker[] {
  try {
    const rows: unknown = JSON.parse(snapshot())
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (m) =>
          m &&
          typeof m.actor === 'string' &&
          typeof m.account === 'string' &&
          typeof m.key === 'string' &&
          [
            'SUBMIT',
            'WITHDRAW',
            'DOWNGRADE',
            'DECIDE',
            'REVOKE',
            'ALLOW_REAPPLICATION',
          ].includes(m.operation) &&
          (m.operation === 'SUBMIT'
            ? m.target === undefined
            : typeof m.target === 'string'),
      )
    )
      throw new Error()
    return rows
  } catch {
    throw failure(
      'No se pudo leer el marcador comercial. La operación permanece bloqueada; solicita soporte sin borrar el almacenamiento.',
    )
  }
}
function write(rows: Marker[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rows))
    notify()
  } catch {
    throw failure(
      'No se pudo conservar el marcador. No se enviará otra operación.',
    )
  }
}
export function useBusinessMarkers() {
  useSyncExternalStore((fn) => {
    listeners.add(fn)
    window.addEventListener('storage', fn)
    return () => {
      listeners.delete(fn)
      window.removeEventListener('storage', fn)
    }
  }, snapshot)
  try {
    return { markers: readMarkers(), error: null }
  } catch (error) {
    return { markers: [] as Marker[], error }
  }
}
function owned(actor: string, key: string) {
  const m = readMarkers().find((m) => m.key === key)
  if (!m || m.actor !== actor)
    throw failure(
      'Sólo la identidad iniciadora puede recuperar este intento. No cambies de usuario para repetirlo.',
    )
  return m
}
async function locked<T>(work: () => Promise<T>) {
  if (!navigator.locks)
    throw failure(
      'Este navegador no permite proteger operaciones entre pestañas. Usa un navegador compatible.',
    )
  return navigator.locks.request(
    'mandaria.business.commands',
    { ifAvailable: true },
    async (lock) => {
      if (!lock)
        throw failure(
          'Hay una operación comercial en otra pestaña. Consulta su resultado antes de continuar.',
        )
      return work()
    },
  )
}
function current(epoch: number) {
  if (epoch !== generation)
    throw failure(
      'La sesión cambió. El marcador se conserva para la identidad iniciadora.',
    )
}
export function validateReceipt(r: Receipt, m: Marker) {
  if (
    !r ||
    r.key !== m.key ||
    r.operation !== m.operation ||
    !['APPLIED', 'REJECTED', 'CLOSED'].includes(r.outcome) ||
    !r.result ||
    typeof r.committedAt !== 'string' ||
    !Number.isFinite(Date.parse(r.committedAt)) ||
    !(r.code === null || typeof r.code === 'string') ||
    !(r.resourceId === null || typeof r.resourceId === 'string') ||
    !['applicationStatus', 'accessState', 'accountType', 'grantId'].every(
      (k) => {
        const v = r.result[k as keyof Receipt['result']]
        return v === null || typeof v === 'string'
      },
    ) ||
    !['applicationRevision', 'accountRevision'].every((k) => {
      const v = r.result[k as keyof Receipt['result']]
      return (
        v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 1)
      )
    }) ||
    !(
      r.result.reapplicationBlocked === null ||
      typeof r.result.reapplicationBlocked === 'boolean'
    ) ||
    (m.operation !== 'SUBMIT' && r.resourceId !== m.target) ||
    (r.outcome === 'APPLIED' && !r.resourceId)
  )
    throw failure(
      'Recibo incompatible. Pendiente de reconciliación; no repitas la operación.',
    )
  return r
}
async function settle(m: Marker, r: Receipt, epoch: number) {
  validateReceipt(r, m)
  current(epoch)
  if (isAdmin(m.operation)) {
    const a = await business.access(m.account)
    current(epoch)
    if (
      a.customerAccount.id !== m.account ||
      !Number.isInteger(a.customerAccount.revision) ||
      a.customerAccount.revision < 1 ||
      !hasBusinessContract({
        customerAccountId: a.customerAccount.id,
        businessAccess: a.customerAccount.businessAccess,
        businessApplication: null,
      }) ||
      (r.result.accountRevision !== null &&
        a.customerAccount.revision < r.result.accountRevision)
    )
      throw failure(
        'Estado vigente todavía no confirmado. Conservamos el bloqueo.',
      )
  } else {
    const [p, c] = await Promise.all([
      customer.profile(),
      customer.capabilities(),
    ])
    current(epoch)
    if (
      !hasBusinessContract(p) ||
      !hasBusinessContract(c) ||
      p.customerAccountId !== m.account ||
      !Number.isInteger(p.revision) ||
      p.revision < 1 ||
      c.customerAccountId !== m.account ||
      (r.result.accountRevision !== null &&
        p.revision < r.result.accountRevision)
    )
      throw failure('Perfil vigente incompatible. Conservamos el bloqueo.')
  }
  if (['SUBMIT', 'WITHDRAW', 'DECIDE'].includes(m.operation) && r.resourceId) {
    const app = await (isAdmin(m.operation)
      ? business.adminDetail(r.resourceId)
      : business.detail(r.resourceId))
    current(epoch)
    if (
      app.id !== r.resourceId ||
      !Number.isInteger(app.revision) ||
      app.revision < 1 ||
      (r.result.applicationRevision !== null &&
        app.revision < r.result.applicationRevision)
    )
      throw failure('Solicitud vigente todavía no confirmada.')
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customer', m.actor] }),
    queryClient.invalidateQueries({ queryKey: ['business', m.actor] }),
  ])
  current(epoch)
  // Historical result is never written into profile/application caches.
  write(readMarkers().filter((row) => row.key !== m.key))
  bodies.delete(m.key)
  cooldowns.delete(m.key)
  return r
}
async function send(m: Marker, epoch: number) {
  current(epoch)
  const original = bodies.get(m.key)
  if (!original)
    throw failure(
      'El cuerpo original ya no está en memoria. Consulta o cierra el intento; no reconstruyas sus datos.',
    )
  if (Date.now() < (cooldowns.get(m.key) ?? 0))
    throw failure('Respeta el tiempo Retry-After indicado antes de reenviar.')
  let r: Receipt
  try {
    r = await business.send(m, JSON.parse(original))
  } catch (error) {
    current(epoch)
    if (error instanceof ApiError && error.retryAfterMs > 0)
      cooldowns.set(m.key, Date.now() + error.retryAfterMs)
    // Errors may carry a receipt; the scoped GET is authoritative and avoids persisting raw errors.
    if (!(error instanceof ApiError && error.status === 429)) {
      try {
        const a = await business.attempt(m)
        current(epoch)
        if (a.receipt && a.state === a.receipt.outcome)
          return await settle(m, a.receipt, epoch)
      } catch {
        current(epoch)
      }
    }
    throw error
  }
  return settle(m, r, epoch)
}
export async function startBusiness(
  actor: string,
  account: string,
  intent: Intention,
) {
  const epoch = generation
  return locked(async () => {
    current(epoch)
    if (readMarkers().some((m) => m.account === account))
      throw failure(
        'Hay una operación pendiente de reconciliación en esta cuenta.',
      )
    const m: Marker = {
      actor,
      account,
      operation: intent.operation,
      key: crypto.randomUUID(),
      ...(intent.target ? { target: intent.target } : {}),
    }
    write([...readMarkers(), m])
    bodies.set(m.key, JSON.stringify(intent.body))
    return send(m, epoch)
  })
}
export async function recoverBusiness(
  actor: string,
  key: string,
  mode: 'read' | 'close' | 'replay' = 'read',
) {
  const m = owned(actor, key),
    epoch = generation
  return locked(async () => {
    current(epoch)
    owned(actor, key)
    if (mode === 'replay') return send(m, epoch)
    const a = await business.attempt(m, mode === 'close')
    current(epoch)
    if (a.state === 'NOT_OBSERVED' && a.receipt === null) return null
    if (!a.receipt || a.state !== a.receipt.outcome)
      throw failure('Resultado incompatible. Pendiente de reconciliación.')
    return settle(m, a.receipt, epoch)
  })
}
export const hasOriginalBody = (key: string) => bodies.has(key)
