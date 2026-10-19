import { useSyncExternalStore } from 'react'
import { env } from '../config/env'
import { ApiError } from '../services/errors'
import { verification, isPublicationReceipt, isPrivacyReceipt } from './service'
import {
  operations,
  type Marker,
  type Operation,
  type CommandResult,
  type PublicationReceipt,
  type PrivacyReceipt,
} from './types'
const storageKey = 'mandaria.verification.pending:' + env.apiUrl
const event = 'verification-pending-change'
const busy = new Set<string>()
function snapshot() {
  try {
    return localStorage.getItem(storageKey) || '[]'
  } catch {
    return '!unavailable'
  }
}
function subscribe(fn: () => void) {
  window.addEventListener(event, fn)
  window.addEventListener('storage', fn)
  return () => {
    window.removeEventListener(event, fn)
    window.removeEventListener('storage', fn)
  }
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function readMarkers(raw = snapshot()): Marker[] {
  const data: unknown = JSON.parse(raw)
  if (
    !Array.isArray(data) ||
    data.some(
      (m) =>
        !m ||
        Object.keys(m).sort().join(',') !== 'actor,key,operation,target' ||
        !uuid.test(m.actor) ||
        !uuid.test(m.key) ||
        !operations.includes(m.operation) ||
        !(
          uuid.test(m.target) ||
          m.target === 'SELF' ||
          (m.target === 'POLICY' && m.operation === 'PUBLISH_TERMS') ||
          m.target === 'DRIVER' ||
          (/^FLEET:/.test(m.target) && uuid.test(m.target.slice(6)))
        ),
    )
  )
    throw new Error(
      'No se puede leer el marcador documental. Conserva el almacenamiento y solicita soporte.',
    )
  return data as Marker[]
}
function write(items: Marker[]) {
  localStorage.setItem(storageKey, JSON.stringify(items))
  window.dispatchEvent(new Event(event))
}
export function useMarkers() {
  const raw = useSyncExternalStore(subscribe, snapshot)
  try {
    return { items: readMarkers(raw), unavailable: false }
  } catch {
    return { items: [], unavailable: true }
  }
}
export function forgetMarker(m: Marker) {
  write(readMarkers().filter((x) => x.key !== m.key || x.actor !== m.actor))
}
export async function runVerification<O extends Operation>(
  actor: string,
  operation: O,
  target: string,
  path: string,
  body: unknown,
  refresh: () => Promise<unknown>,
  method = 'POST',
): Promise<CommandResult<O>> {
  const items = readMarkers()
  // One unresolved command per origin. Other accounts cannot bypass it or see its details.
  if (items.length || busy.size)
    throw new Error(
      'Hay una operación documental pendiente de reconciliación. Consúltala con la cuenta iniciadora.',
    )
  const m = { actor, operation, target, key: crypto.randomUUID() }
  busy.add(m.key)
  try {
    write([...items, m])
    let receipt: CommandResult<O>
    try {
      receipt = await verification.command(m, path, body, method)
    } catch (e) {
      // A complete business rejection has no effect. Conflicting/closed keys require explicit consultation.
      if (
        e instanceof ApiError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 408 &&
        !['IDEMPOTENCY_KEY_REUSED', 'VERIFICATION_ATTEMPT_CLOSED'].includes(
          e.code || '',
        )
      ) {
        await refresh()
        forgetMarker(m)
      }
      throw e
    }
    await refresh() // Never replace current state with a historical receipt.
    forgetMarker(m)
    return receipt
  } finally {
    busy.delete(m.key)
  }
}
export async function reconcile(
  m: Marker,
  actor: string,
  refresh: () => Promise<unknown>,
  close = false,
  onPublication?: (receipt: PublicationReceipt) => void,
  onPrivacy?: (receipt: PrivacyReceipt) => void,
) {
  if (
    m.actor !== actor ||
    !readMarkers().some((x) => x.key === m.key && x.actor === actor)
  )
    throw new Error(
      'Sólo la cuenta iniciadora puede consultar o cerrar este intento.',
    )
  if (busy.has(m.key)) throw new Error('La operación todavía está en curso.')
  busy.add(m.key)
  try {
    const result = await verification.attempt(m, close)
    if (result.state === 'APPLIED') {
      const r = result.result
      if (m.operation === 'PUBLISH_TERMS') {
        if (m.target !== 'POLICY' || !isPublicationReceipt(r))
          throw new Error(
            'Comprobante de publicación incompleto; se conserva el bloqueo.',
          )
        // Current pointers may already refer to a newer publication. Never overwrite them.
        const policy = await verification.policy()
        if (
          !Number.isSafeInteger(policy.revision) ||
          policy.revision < r.policyRevision
        )
          throw new Error(
            'No se confirmó la política vigente; conserva el bloqueo.',
          )
        onPublication?.(r)
      } else {
        if (!r || !('id' in r) || !r.id || !r.status)
          throw new Error('Comprobante incompleto; se conserva el bloqueo.')
        if (m.operation === 'REPRESENTATIVE_PRIVACY') {
          const receipt = await verification.privacyReceipt(r.id)
          if (
            !isPrivacyReceipt(r, m.target) ||
            receipt.id !== r.id ||
            receipt.scope !== r.scope ||
            receipt.version !== r.version ||
            receipt.privacyVersion !== r.privacyVersion ||
            receipt.privacyHash !== r.privacyHash ||
            receipt.acceptsFleetContract !== false
          )
            throw new Error(
              'No se confirmó el reconocimiento personal original; conserva el intento.',
            )
          onPrivacy?.(r)
        } else if (
          ['LINK_REPRESENTATIVE', 'REVOKE_REPRESENTATIVE'].includes(m.operation)
        ) {
          if (
            (m.operation === 'REVOKE_REPRESENTATIVE' &&
              (r.id !== m.target || r.status !== 'REVOKED')) ||
            (m.operation === 'LINK_REPRESENTATIVE' && r.status !== 'LINKED')
          )
            throw new Error('El recibo no corresponde al vínculo original.')
          // No administrative GET of links exists. Refresh authorized case lists; never infer current authority from this receipt.
        } else if (m.operation === 'ACCEPT_TERMS') {
          const acceptance = await verification.acceptance(r.id)
          if (
            acceptance.id !== r.id ||
            acceptance.userId !== actor ||
            (acceptance.scope === 'DRIVER'
              ? 'DRIVER'
              : 'FLEET:' + acceptance.providerId) !== m.target
          )
            throw new Error(
              'El comprobante no corresponde al firmante o ámbito original.',
            )
        } else if (m.operation === 'CREATE_VEHICLE') {
          const current = await verification.onboarding()
          if (
            !current.driver.independentProfile?.vehicles.some(
              (v) => v.id === r.id,
            )
          )
            throw new Error(
              'No se confirmó el recurso actual; conserva el bloqueo.',
            )
        } else {
          const current = await verification.get(
            m.operation === 'CREATE_CASE' ? r.id : m.target,
          )
          if (m.operation === 'CREATE_CASE' && current.resourceId !== m.target)
            throw new Error(
              'El comprobante no corresponde al recurso original.',
            )
          if (
            ['UPDATE_CASE', 'SUBMIT', 'WITHDRAW', 'DECIDE'].includes(
              m.operation,
            ) &&
            r.id !== m.target
          )
            throw new Error('El comprobante no corresponde al expediente.')
          if (
            ['CREATE_UPLOAD', 'COMPLETE_UPLOAD', 'REMOVE_ATTACHMENT'].includes(
              m.operation,
            ) &&
            !current.attachments.some((a) => a.id === r.id)
          )
            throw new Error(
              'No se pudo confirmar el adjunto; conserva el bloqueo.',
            )
        }
      }
      await refresh()
      forgetMarker(m)
    } else if (result.state === 'CLOSED_NO_EFFECTS') {
      await refresh()
      forgetMarker(m)
    } else if (result.state !== 'ABSENT')
      throw new Error('Estado desconocido; conserva el bloqueo.')
    return result.state
  } finally {
    busy.delete(m.key)
  }
}
