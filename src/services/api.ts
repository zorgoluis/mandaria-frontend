import { env } from '../config/env'
import type { Tokens, User } from '../types/api'
import { ApiError, normalizeError } from './errors'

const key = 'mandaria.refresh'
let accessToken: string | null = null
let generation = 0
let refreshing: Promise<void> | null = null
const listeners = new Set<() => void>()
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
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw normalizeError(0, null)
  }
  const data: unknown =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined)
  if (!response.ok) throw normalizeError(response.status, data)
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
): Promise<T> {
  const current = generation
  const usedToken = accessToken
  try {
    const result = await transport<T>(path, method, body, usedToken, signal)
    if (generation !== current) throw normalizeError(401, null)
    return result
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    if (generation !== current) throw error
    if (usedToken === accessToken) await refresh()
    if (generation !== current) throw error
    try {
      const result = await transport<T>(path, method, body, accessToken, signal)
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
export const authService = {
  async login(email: string, password: string) {
    clearSession()
    save(
      await transport<Tokens>('/auth/login', 'POST', {
        email: email.trim().toLowerCase(),
        password,
      }),
    )
    return api<User>('/auth/me')
  },
  async restore() {
    if (!storedRefresh()) return null
    await refresh()
    return api<User>('/auth/me')
  },
  async logout() {
    if (refreshing) await refreshing.catch(() => undefined)
    const token = storedRefresh()
    clearSession()
    if (token)
      await transport<void>('/auth/logout', 'POST', { refreshToken: token })
  },
}
