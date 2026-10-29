import { env } from '../config/env'
import { sessionFence } from '../services/api'
import { uuid } from '../fleet-exit/validation'
import { driverPortal } from './service'
import { independentAttempt, type Operation } from './attempt-api'
import { releaseReasons } from './types'
export interface Scope {
  actor: string
  dispatchId: string
  operation: Operation
}
export interface Intent {
  scope: Scope
  environment: string
  key: string
  body: { vehicleId?: string; reason?: string; reasonDetail?: string }
  path: string
}
interface Encrypted {
  commandKey: string
  key: CryptoKey
  iv: Uint8Array<ArrayBuffer>
  data: ArrayBuffer
}
export const storageId = (s: Scope) =>
  JSON.stringify([env.apiUrl, s.actor, s.dispatchId, s.operation])
export function makeIntent(scope: Scope, body: Intent['body']): Intent {
  const i = {
    scope,
    body: structuredClone(body),
    environment: env.apiUrl,
    key: crypto.randomUUID(),
    path: `/driver/dispatches/${scope.dispatchId}/${scope.operation.toLowerCase()}`,
  }
  assertIntent(i, scope)
  return i
}
export function assertIntent(i: Intent, s: Scope) {
  if (
    i.environment !== env.apiUrl ||
    storageId(i.scope) !== storageId(s) ||
    !uuid(i.key) ||
    !uuid(s.dispatchId) ||
    !['TAKE', 'RELEASE'].includes(s.operation) ||
    i.path !== `/driver/dispatches/${s.dispatchId}/${s.operation.toLowerCase()}`
  )
    throw Error('Recupera con la misma cuenta y entorno.')
  const keys = Object.keys(i.body).sort().join(',')
  if (
    s.operation === 'TAKE'
      ? keys !== 'vehicleId' || !uuid(i.body.vehicleId)
      : !['reason', 'reason,reasonDetail'].includes(keys) ||
        !releaseReasons.includes(i.body.reason as never) ||
        (i.body.reason === 'OTHER' &&
          (i.body.reasonDetail?.trim().length ?? 0) < 3) ||
        (i.body.reasonDetail?.length ?? 0) > 500
  )
    throw Error('Intención inválida.')
}
export async function encrypt(i: Intent): Promise<Encrypted> {
  assertIntent(i, i.scope)
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return {
    commandKey: i.key,
    key,
    iv,
    data: await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(i)),
    ),
  }
}
export async function decrypt(e: Encrypted, s: Scope) {
  const i = JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: e.iv }, e.key, e.data),
    ),
  ) as Intent
  assertIntent(i, s)
  return i
}
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('mandaria-independent-intents', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('intents')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
export function announce() {
  window.dispatchEvent(new Event('independent-intent'))
  if (typeof BroadcastChannel !== 'undefined') {
    const c = new BroadcastChannel('mandaria-independent-intents')
    c.postMessage('changed')
    c.close()
  }
}
export const independentStore = {
  async list(actor: string): Promise<Intent[]> {
    const d = await database()
    try {
      const pairs = await new Promise<{
        keys: IDBValidKey[]
        values: Encrypted[]
      }>((resolve, reject) => {
        const t = d.transaction('intents')
        const s = t.objectStore('intents')
        const k = s.getAllKeys(),
          v = s.getAll()
        t.oncomplete = () => resolve({ keys: k.result, values: v.result })
        t.onerror = () => reject(t.error)
      })
      return Promise.all(
        pairs.keys.flatMap((k, n) => {
          const [environment, owner, dispatchId, operation] = JSON.parse(
            String(k),
          )
          return environment === env.apiUrl && owner === actor
            ? [decrypt(pairs.values[n], { actor, dispatchId, operation })]
            : []
        }),
      )
    } finally {
      d.close()
    }
  },
  async save(i: Intent) {
    const e = await encrypt(i),
      d = await database()
    try {
      await new Promise<void>((resolve, reject) => {
        const t = d.transaction('intents', 'readwrite')
        t.objectStore('intents').add(e, storageId(i.scope))
        t.oncomplete = () => resolve()
        t.onabort = () =>
          reject(
            Error(
              'Existe una intención pendiente o falló el almacenamiento. Consulta antes de continuar.',
            ),
          )
      })
      announce()
    } finally {
      d.close()
    }
  },
  async clear(i: Intent) {
    const d = await database()
    try {
      await new Promise<void>((resolve, reject) => {
        const t = d.transaction('intents', 'readwrite'),
          s = t.objectStore('intents'),
          r = s.get(storageId(i.scope))
        r.onsuccess = () => {
          if (r.result?.commandKey !== i.key) t.abort()
          else s.delete(storageId(i.scope))
        }
        t.oncomplete = () => resolve()
        t.onabort = () => reject(Error('La intención cambió.'))
      })
      announce()
    } finally {
      d.close()
    }
  },
}
// add() is the cross-tab fence. A saved intention is never automatically sent again.
export async function startIndependent(scope: Scope, body: Intent['body']) {
  const authorize = sessionFence()
  const i = makeIntent(scope, body)
  await independentStore.save(i)
  authorize()
  return scope.operation === 'TAKE'
    ? driverPortal.take(scope.dispatchId, body.vehicleId!, i.key)
    : driverPortal.release(
        scope.dispatchId,
        body.reason!,
        body.reasonDetail,
        i.key,
      )
}
export function recoverIndependent(i: Intent, actor: string, close = false) {
  assertIntent(i, { ...i.scope, actor })
  return independentAttempt(i.scope.dispatchId, i.scope.operation, i.key, close)
}
