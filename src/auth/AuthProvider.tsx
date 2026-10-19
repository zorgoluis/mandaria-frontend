import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  authService,
  onSessionExpired,
  onSessionIdentity,
} from '../services/api'
import { queryClient } from '../services/query'
import { ApiError } from '../services/errors'
import type { User } from '../types/api'
import { AuthContext } from './context'
import type { SessionIdentity } from './session'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionIdentity | null>(null)
  const user: User | null =
    session?.accessMode === 'STANDARD' ? session.identity : null
  const restricted =
    session?.accessMode === 'DELETION_RESTRICTED' ? session : null
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const authority = useRef('')
  const restore = useCallback(async () => {
    try {
      const restored = await authService.restore()
      queryClient.clear()
      setSession(restored)
      setError(null)
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(err)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    let active = true
    void authService
      .restore()
      .then((restored) => {
        if (active) setSession(restored)
      })
      .catch((err: unknown) => {
        if (active && !(err instanceof ApiError && err.status === 401))
          setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const unsubscribe = onSessionExpired(() => {
      setSession(null)
      setExpired(true)
      setError(null)
      queryClient.clear()
    })
    const unsubscribeIdentity = onSessionIdentity((next) => {
      const stamp = JSON.stringify(next)
      if (authority.current && authority.current !== stamp) queryClient.clear()
      authority.current = stamp
      setSession(next)
      setError(null)
    })
    return () => {
      active = false
      unsubscribe()
      unsubscribeIdentity()
    }
  }, [])
  async function login(email: string, password: string) {
    queryClient.clear()
    const next = await authService.login(email, password)
    setSession(next)
    setExpired(false)
    setError(null)
  }
  async function logout() {
    setLoading(true)
    try {
      await authService.logout()
    } finally {
      setSession(null)
      setExpired(false)
      setError(null)
      queryClient.clear()
      setLoading(false)
    }
  }
  return (
    // The restricted identity never becomes a fabricated User.
    <AuthContext.Provider
      value={{
        user,
        restricted,
        loading,
        expired,
        error,
        login,
        logout,
        restore,
        revalidate: async () => {
          setSession(await authService.session())
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
