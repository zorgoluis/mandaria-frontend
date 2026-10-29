import { env } from '../config/env'
import {
  categories,
  validateCommand,
  categoryPath,
  type CategoryCommand,
} from './service'
export interface Scope {
  actor: string
  driverId: string
}
export interface Intent {
  version: 1
  scope: Scope
  environment: string
  path: string
  body: CategoryCommand
  createdAt: string
}
const id = (s: Scope) => JSON.stringify([env.apiUrl, s.actor, s.driverId])
export function makeIntent(s: Scope, body: CategoryCommand): Intent {
  validateCommand(body)
  return structuredClone({
    version: 1,
    scope: s,
    environment: env.apiUrl,
    path: categoryPath(s.driverId),
    body,
    createdAt: new Date().toISOString(),
  })
}
export function assertIntent(i: Intent, s: Scope) {
  if (
    i.version !== 1 ||
    i.environment !== env.apiUrl ||
    id(i.scope) !== id(s) ||
    i.path !== categoryPath(s.driverId) ||
    !Number.isFinite(Date.parse(i.createdAt))
  )
    throw Error('La intención pertenece a otra cuenta, entorno o perfil.')
  validateCommand(i.body)
}
interface Encrypted {
  key: CryptoKey
  iv: Uint8Array<ArrayBuffer>
  data: ArrayBuffer
  requestId: string
}
// Same durable mechanism as assistance/fleet-exit: non-exportable AES-GCM key,
// IndexedDB atomic insertion and compare-and-delete. Separate protocol/storage.
export async function encrypt(i: Intent): Promise<Encrypted> {
  assertIntent(i, i.scope)
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return {
    key,
    iv,
    requestId: i.body.requestId,
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
function db() {
  return new Promise<IDBDatabase>((yes, no) => {
    const r = indexedDB.open('mandaria-category-intents', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('intents')
    r.onsuccess = () => yes(r.result)
    r.onerror = () => no(r.error)
  })
}
function changed() {
  window.dispatchEvent(new Event('category-intent'))
  if (typeof BroadcastChannel !== 'undefined') {
    const c = new BroadcastChannel('category-intent')
    c.postMessage('changed')
    c.close()
  }
}
export const categoryStore = {
  async read(s: Scope) {
    const d = await db()
    try {
      const e = await new Promise<Encrypted | undefined>((yes, no) => {
        const r = d.transaction('intents').objectStore('intents').get(id(s))
        r.onsuccess = () => yes(r.result)
        r.onerror = () => no(r.error)
      })
      return e ? await decrypt(e, s) : null
    } finally {
      d.close()
    }
  },
  async save(i: Intent) {
    const e = await encrypt(i),
      d = await db()
    try {
      await new Promise<void>((yes, no) => {
        const t = d.transaction('intents', 'readwrite')
        t.objectStore('intents').add(e, id(i.scope))
        t.oncomplete = () => yes()
        t.onabort = () =>
          no(
            Error(
              'Ya existe una intención o falló el almacenamiento. No se enviará otro cambio.',
            ),
          )
      })
      changed()
    } finally {
      d.close()
    }
  },
  async clear(s: Scope, requestId: string) {
    const d = await db()
    try {
      await new Promise<void>((yes, no) => {
        const t = d.transaction('intents', 'readwrite'),
          store = t.objectStore('intents'),
          r = store.get(id(s))
        r.onsuccess = () => {
          if (r.result?.requestId !== requestId) t.abort()
          else store.delete(id(s))
        }
        t.oncomplete = () => yes()
        t.onabort = () => no(Error('La intención cambió. Consulta de nuevo.'))
      })
      changed()
    } finally {
      d.close()
    }
  },
}
export async function replay(i: Intent, s: Scope) {
  assertIntent(i, s)
  return categories.reconcile(s.driverId, i.body)
}
export async function locked<T>(s: Scope, fn: () => Promise<T>) {
  if (!navigator.locks)
    throw Error(
      'Se requiere un navegador con exclusión entre pestañas para enviar cambios.',
    )
  return navigator.locks.request(
    'category:' + id(s),
    { ifAvailable: true },
    async (lock) => {
      if (!lock)
        throw Error(
          'Otra pestaña está procesando esta intención. Consulta antes de continuar.',
        )
      return fn()
    },
  )
}
