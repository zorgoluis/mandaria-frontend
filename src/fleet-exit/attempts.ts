import { env } from '../config/env'
import { commandPath, exits, validateBody } from './service'
import { uuid } from './validation'
import type { Scope, Operation, Body, Resource } from './types'
export interface Intent extends Resource {
  version: 1
  scope: Scope
  environment: string
  path: string
  key: string
  body: Body
  createdAt: string
}
interface Encrypted {
  commandKey: string
  key: CryptoKey
  iv: Uint8Array<ArrayBuffer>
  data: ArrayBuffer
}
export const storageId = (s: Scope) =>
  JSON.stringify([env.apiUrl, s.actor, s.surface, s.providerId ?? null])
export function makeIntent(
  scope: Scope,
  operation: Operation,
  resourceId: string,
  body: Body,
): Intent {
  validateBody(operation, body)
  if (!uuid(resourceId)) throw Error('Recurso inválido')
  return JSON.parse(
    JSON.stringify({
      version: 1,
      scope,
      environment: env.apiUrl,
      operation,
      resourceType: operation === 'START' ? 'AFFILIATION' : 'EXIT',
      resourceId,
      path: commandPath(scope, operation, resourceId),
      key: crypto.randomUUID(),
      body,
      createdAt: new Date().toISOString(),
    }),
  )
}
export function assertIntent(i: Intent, s: Scope) {
  if (
    i.version !== 1 ||
    i.environment !== env.apiUrl ||
    storageId(i.scope) !== storageId(s) ||
    !uuid(i.key) ||
    !uuid(i.resourceId) ||
    !['START', 'RECHECK'].includes(i.operation) ||
    i.resourceType !== (i.operation === 'START' ? 'AFFILIATION' : 'EXIT') ||
    i.path !== commandPath(s, i.operation, i.resourceId)
  )
    throw Error(
      'Selecciona la misma cuenta, entorno y proveedor de la intención.',
    )
  validateBody(i.operation, i.body)
}
export async function encryptIntent(i: Intent): Promise<Encrypted> {
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
export async function decryptIntent(e: Encrypted, s: Scope) {
  const i = JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: e.iv }, e.key, e.data),
    ),
  ) as Intent
  assertIntent(i, s)
  return i
}
function database() {
  return new Promise<IDBDatabase>((yes, no) => {
    const r = indexedDB.open('mandaria-fleet-exit-intents', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('intents')
    r.onsuccess = () => yes(r.result)
    r.onerror = () => no(r.error)
  })
}
export function announce() {
  window.dispatchEvent(new Event('fleet-exit-intent'))
  if (typeof BroadcastChannel !== 'undefined') {
    const c = new BroadcastChannel('mandaria-fleet-exit')
    c.postMessage('changed')
    c.close()
  }
}
export const intentStore = {
  async read(s: Scope) {
    const d = await database()
    try {
      const e = await new Promise<Encrypted | undefined>((yes, no) => {
        const r = d
          .transaction('intents')
          .objectStore('intents')
          .get(storageId(s))
        r.onsuccess = () => yes(r.result)
        r.onerror = () => no(r.error)
      })
      return e ? decryptIntent(e, s) : null
    } finally {
      d.close()
    }
  },
  async scopes(actor: string): Promise<Scope[]> {
    const d = await database()
    try {
      const keys = await new Promise<IDBValidKey[]>((yes, no) => {
        const r = d.transaction('intents').objectStore('intents').getAllKeys()
        r.onsuccess = () => yes(r.result)
        r.onerror = () => no(r.error)
      })
      return keys.flatMap((k) => {
        const [environment, owner, surface, providerId] = JSON.parse(String(k))
        return environment === env.apiUrl &&
          owner === actor &&
          ['provider', 'admin'].includes(surface)
          ? [{ actor, surface, ...(providerId ? { providerId } : {}) }]
          : []
      })
    } finally {
      d.close()
    }
  },
  async save(i: Intent) {
    const e = await encryptIntent(i),
      d = await database()
    try {
      await new Promise<void>((yes, no) => {
        const tx = d.transaction('intents', 'readwrite')
        tx.objectStore('intents').add(e, storageId(i.scope))
        tx.oncomplete = () => yes()
        tx.onabort = () =>
          no(
            Error(
              'Ya existe un intento pendiente o el almacenamiento falló. Consulta antes de enviar.',
            ),
          )
      })
      announce()
    } finally {
      d.close()
    }
  },
  async clear(s: Scope, key: string) {
    const d = await database()
    try {
      await new Promise<void>((yes, no) => {
        const tx = d.transaction('intents', 'readwrite'),
          store = tx.objectStore('intents'),
          r = store.get(storageId(s))
        r.onsuccess = () => {
          if ((r.result as Encrypted | undefined)?.commandKey !== key)
            tx.abort()
          else store.delete(storageId(s))
        }
        tx.oncomplete = () => yes()
        tx.onabort = () => no(Error('El intento cambió; consulta de nuevo.'))
      })
      announce()
    } finally {
      d.close()
    }
  },
}
export async function sendIntent(i: Intent, scope: Scope) {
  assertIntent(i, scope)
  return exits.send(scope, i.operation, i.resourceId, i.key, i.body)
}
export function recoverIntent(i: Intent, scope: Scope, close = false) {
  assertIntent(i, scope)
  return exits.attempt(
    i.key,
    {
      operation: i.operation,
      resourceType: i.resourceType,
      resourceId: i.resourceId,
    },
    close,
  )
}
