import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { authService, onSessionExpired } from '../services/api'
import { queryClient } from '../services/query'
import { ApiError } from '../services/errors'
import type { User } from '../types/api'
import { AuthContext } from './context'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const restore = useCallback(async () => {
    try {
      const restored = await authService.restore()
      setUser(restored)
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
        if (active) setUser(restored)
      })
      .catch((err: unknown) => {
        if (active && !(err instanceof ApiError && err.status === 401))
          setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const unsubscribe = onSessionExpired(() => {
      setUser(null)
      setExpired(true)
      setError(null)
      queryClient.clear()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])
  async function login(email: string, password: string) {
    queryClient.clear()
    const next = await authService.login(email, password)
    setUser(next)
    setExpired(false)
    setError(null)
  }
  async function logout() {
    setLoading(true)
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setExpired(false)
      setError(null)
      queryClient.clear()
      setLoading(false)
    }
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, expired, error, login, logout, restore }}
    >
      {children}
    </AuthContext.Provider>
  )
}
