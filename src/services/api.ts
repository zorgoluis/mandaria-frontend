import { env } from '../config/env'
import type { Tokens } from '../types/api'
import { sessionIdentity, type SessionIdentity } from '../auth/session'
import { ApiError, normalizeError } from './errors'

const key = 'mandaria.refresh'
let accessToken: string | null = null
let generation = 0
/** Fence async preparation (IndexedDB/locks) against a logout/account switch. */
export const sessionFence = () => {
  const original = generation
  return () => {
    if (generation !== original) throw normalizeError(401, null)
  }
}
let refreshing: Promise<SessionIdentity> | null = null
const listeners = new Set<() => void>()
const identityListeners = new Set<(identity: SessionIdentity) => void>()
export const onSessionIdentity = (
  listener: (identity: SessionIdentity) => void,
) => {
  identityListeners.add(listener)
  return () => {
    identityListeners.delete(listener)
  }
}
async function readSession(signal?: AbortSignal) {
  const current = generation
  const value = sessionIdentity(
    await transport<unknown>(
      '/auth/me?projection=session',
      'GET',
      undefined,
      accessToken,
      signal,
    ),
  )
  if (current !== generation) throw normalizeError(401, null)
  identityListeners.forEach((listener) => listener(value))
  return value
}
export const onSessionExpired = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const storedRefresh = () => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}
function clearSession() {
  generation++
  accessToken = null
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* Storage can be disabled. */
  }
}
function expire() {
  clearSession()
  listeners.forEach((listener) => listener())
}
function save(tokens: Tokens) {
  if (!tokens.accessToken || !tokens.refreshToken)
    throw new ApiError(500, 'Respuesta de autenticación no válida.')
  try {
    sessionStorage.setItem(key, tokens.refreshToken)
  } catch {
    throw new ApiError(
      0,
      'Permite el almacenamiento de sesión del navegador para iniciar sesión.',
    )
  }
  accessToken = tokens.accessToken
}
async function transport<T>(
  path: string,
  method: string,
  body?: unknown,
  token?: string | null,
  signal?: AbortSignal,
  /** Extra request headers (V1.10 credit movements require Idempotency-Key). */
  extra?: Record<string, string>,
  responseType: 'json' | 'blob' | 'private-image' = 'json',
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${env.apiUrl}/api/v1${path}`, {
      method,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      headers: {
        ...(body !== undefined && !(body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      ...(body !== undefined
        ? { body: body instanceof FormData ? body : JSON.stringify(body) }
        : {}),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw normalizeError(0, null)
  }
  if (response.ok && responseType !== 'json') {
    const mime = response.headers.get('Content-Type')?.split(';')[0]
    if (
      mime !== 'image/png' &&
      !(responseType === 'private-image' && mime === 'image/jpeg')
    )
      throw new ApiError(502, 'Formato de evidencia inesperado.')
    return (await response.blob()) as T
  }
  let data: unknown
  if (response.status !== 204) {
    try {
      data = await response.json()
    } catch (error) {
      // A received status does not prove we received the command receipt.
      // Never turn an interrupted/truncated successful response into success.
      if (signal?.aborted) throw error
      throw normalizeError(response.ok ? 0 : response.status, null)
    }
  }
  if (!response.ok) {
    const error = normalizeError(response.status, data)
    const value = response.headers.get('Retry-After')
    if (value)
      error.retryAfterMs = Number.isFinite(Number(value))
        ? Math.max(0, Number(value) * 1000)
        : Math.max(0, Date.parse(value) - Date.now()) || 0
    throw error
  }
  return data as T
}
async function refresh() {
  if (!refreshing) {
    const current = generation
    refreshing = (async () => {
      const token = storedRefresh()
      if (!token) {
        expire()
        throw normalizeError(401, null)
      }
      try {
        const tokens = await transport<Tokens>('/auth/refresh', 'POST', {
          refreshToken: token,
        })
        if (generation !== current) throw normalizeError(401, null)
        save(tokens)
        return await readSession()
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          generation === current
        )
          expire()
        throw error
      }
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
  headers?: Record<string, string>,
  responseType: 'json' | 'blob' | 'private-image' = 'json',
): Promise<T> {
  const current = generation
  const usedToken = accessToken
  try {
    const result = await transport<T>(
      path,
      method,
      body,
      usedToken,
      signal,
      headers,
      responseType,
    )
    if (generation !== current) throw normalizeError(401, null)
    return result
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    if (generation !== current) throw error
    if (usedToken === accessToken) await refresh()
    if (generation !== current) throw error
    try {
      const result = await transport<T>(
        path,
        method,
        body,
        accessToken,
        signal,
        headers,
        responseType,
      )
      if (generation !== current) throw normalizeError(401, null)
      return result
    } catch (retryError) {
      if (
        retryError instanceof ApiError &&
        retryError.status === 401 &&
        generation === current
      )
        expire()
      throw retryError
    }
  }
}
/** Exactly one attempt, including on HTTP 401: secrets and explicit command recovery. */
export async function apiOnce<T>(
  path: string,
  method: string,
  body?: unknown,
  signal?: AbortSignal,
  headers?: Record<string, string>,
): Promise<T> {
  const current = generation
  try {
    const result = await transport<T>(
      path,
      method,
      body,
      accessToken,
      signal,
      headers,
    )
    if (generation !== current) throw normalizeError(401, null)
    return result
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      generation === current
    )
      expire()
    throw error
  }
}
/** Unauthenticated endpoint (e.g. account activation): never sends or refreshes a session. */
export const publicApi = <T>(
  path: string,
  method: string,
  body?: unknown,
  signal?: AbortSignal,
) => transport<T>(path, method, body, null, signal)
export const authService = {
  async session() {
    const value = sessionIdentity(
      await api<unknown>('/auth/me?projection=session'),
    )
    identityListeners.forEach((listener) => listener(value))
    return value
  },
  async login(email: string, password: string) {
    clearSession()
    save(
      await transport<Tokens>('/auth/login', 'POST', {
        email: email.trim().toLowerCase(),
        password,
      }),
    )
    return readSession()
  },
  async restore() {
    if (!storedRefresh()) return null
    return refresh()
  },
  async logout() {
    if (refreshing) await refreshing.catch(() => undefined)
    const token = storedRefresh()
    clearSession()
    if (token)
      await transport<void>('/auth/logout', 'POST', { refreshToken: token })
  },
}

/** Authorized private evidence proxy, keeping session handling centralized. */
export const apiBlob = (path: string, signal?: AbortSignal) =>
  api<Blob>(path, 'POST', undefined, signal, undefined, 'blob')
