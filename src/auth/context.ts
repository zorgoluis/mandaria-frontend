import { createContext, useContext } from 'react'
import type { User } from '../types/api'
import type { RestrictedSession } from './session'
export interface AuthState {
  user: User | null
  restricted?: RestrictedSession | null
  loading: boolean
  expired: boolean
  error: unknown
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
  revalidate?: () => Promise<void>
}
export function useActorId() {
  const auth = useAuth()
  return auth.user?.id ?? auth.restricted?.identity.id
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider requerido')
  return auth
}
