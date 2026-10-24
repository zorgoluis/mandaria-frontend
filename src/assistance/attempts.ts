import { env } from '../config/env'
import { apiOnce } from '../services/api'
import { commandPath, type Operation, assistance } from './service'
import { commandSchemas } from './contract'
import type { Scope } from './types'
import { sha256 } from './hashes'
export interface Intent {
  version: 1
  scope: Scope
  environment: string
  caseId: string
  operation: Operation
  path: string
  key: string
  body: Record<string, unknown>
  ref?: string
  file?: { mime: string; bytes: string }
  fileMeta?: { mime: string; bytes: number; sha256: string }
  createdAt: string
}
const storageId = (scope: Scope) => `${env.apiUrl}|${scope.actor}`
const db = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('mandaria-assistance-intents', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('intents')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
interface Encrypted {
  commandKey?: string
  key: CryptoKey
  iv: Uint8Array<ArrayBuffer>
  data: ArrayBuffer
}
export async function encryptIntent(intent: Intent): Promise<Encrypted> {
  // Bytes live only in this mounted session. A restart requires the same file.
  const persisted = { ...intent, file: undefined }
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(persisted)),
  )
  return { key, iv, data, commandKey: intent.key }
}
export async function decryptIntent(
  value: Encrypted,
  scope: Scope,
): Promise<Intent> {
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: value.iv },
    value.key,
    value.data,
  )
  const i = JSON.parse(new TextDecoder().decode(raw)) as Intent
  if (
    i.version !== 1 ||
    i.environment !== env.apiUrl ||
    i.scope.actor !== scope.actor ||
    !i.body ||
    !i.caseId ||
    !/^[-0-9a-f]{36}$/i.test(i.key) ||
    !(i.operation === 'SEAL_EVIDENCE' || i.operation in commandSchemas) ||
    i.path !== commandPath(i.scope, i.operation, i.caseId, i.ref)
  )
    throw Error('Intento guardado no verificable. No se enviará otro comando.')
  return i
}
export async function attachOriginalFile(
  intent: Intent,
  file: File,
): Promise<Intent> {
  const expected = intent.fileMeta
  if (!expected || file.size !== expected.bytes || file.type !== expected.mime)
    throw Error('El archivo no coincide con la reserva original.')
  const bytes = await file.arrayBuffer()
  if ((await sha256(bytes)) !== expected.sha256)
    throw Error('El hash del archivo no coincide con la reserva original.')
  let raw = ''
  for (const byte of new Uint8Array(bytes)) raw += String.fromCharCode(byte)
  return { ...intent, file: { mime: file.type, bytes: btoa(raw) } }
}
export const intentStore = {
  async read(scope: Scope) {
    const database = await db()
    try {
      const value = await new Promise<Encrypted | undefined>((yes, no) => {
        const r = database
          .transaction('intents')
          .objectStore('intents')
          .get(storageId(scope))
        r.onsuccess = () => yes(r.result)
        r.onerror = () => no(r.error)
      })
      return value ? await decryptIntent(value, scope) : null
    } finally {
      database.close()
    }
  },
  async save(intent: Intent, resolvedKey?: string) {
    const value = await encryptIntent(intent),
      database = await db()
    try {
      await new Promise<void>((yes, no) => {
        const tx = database.transaction('intents', 'readwrite')
        const store = tx.objectStore('intents')
        if (resolvedKey) {
          const request = store.get(storageId(intent.scope))
          request.onsuccess = () => {
            if (
              (request.result as Encrypted | undefined)?.commandKey !==
              resolvedKey
            ) {
              tx.abort()
              return
            }
            store.put(value, storageId(intent.scope))
          }
        } else store.add(value, storageId(intent.scope))
        tx.oncomplete = () => yes()
        tx.onabort = () =>
          no(
            Error(
              'Existe un intento pendiente o no se pudo persistir. Recupera antes de continuar.',
            ),
          )
      })
    } finally {
      database.close()
    }
  },
  async clear(scope: Scope, key: string) {
    const current = await this.read(scope)
    if (current?.key !== key)
      throw Error('El intento cambió; vuelve a consultar.')
    const database = await db()
    try {
      await new Promise<void>((yes, no) => {
        const tx = database.transaction('intents', 'readwrite')
        const store = tx.objectStore('intents')
        const request = store.get(storageId(scope))
        request.onsuccess = () => {
          if ((request.result as Encrypted | undefined)?.commandKey !== key) {
            tx.abort()
            return
          }
          store.delete(storageId(scope))
        }
        tx.oncomplete = () => yes()
        tx.onabort = () => no(tx.error)
      })
    } finally {
      database.close()
    }
  },
}
export function makeIntent(
  scope: Scope,
  operation: Operation,
  caseId: string,
  body: Record<string, unknown>,
  ref?: string,
): Intent {
  return JSON.parse(
    JSON.stringify({
      version: 1,
      scope,
      environment: env.apiUrl,
      caseId,
      operation,
      path: commandPath(scope, operation, caseId, ref),
      key: crypto.randomUUID(),
      body,
      ref,
      createdAt: new Date().toISOString(),
    }),
  )
}
export async function sendIntent(intent: Intent, scope: Scope) {
  if (
    intent.environment !== env.apiUrl ||
    intent.scope.actor !== scope.actor ||
    intent.scope.surface !== scope.surface
  )
    throw Error('Reautentica la misma cuenta y rol para recuperar.')
  if (
    intent.path !==
    commandPath(intent.scope, intent.operation, intent.caseId, intent.ref)
  )
    throw Error('Ruta del intento inválida')
  let body: unknown = intent.body
  if (intent.operation === 'SEAL_EVIDENCE') {
    if (!intent.file)
      throw Error(
        'Contenido original no disponible; consulta o cierra el intento.',
      )
    const form = new FormData()
    form.append(
      'expectedCaseRevision',
      String(intent.body.expectedCaseRevision),
    )
    form.append(
      'file',
      new Blob(
        [Uint8Array.from(atob(intent.file.bytes), (c) => c.charCodeAt(0))],
        { type: intent.file.mime },
      ),
      'evidence',
    )
    body = form
  }
  return apiOnce<Record<string, unknown>>(
    intent.path,
    'POST',
    body,
    undefined,
    { 'Idempotency-Key': intent.key },
  )
}
export const recoverIntent = (i: Intent, close = false) =>
  assistance.attempt(i.key, i.caseId, i.operation, close)
