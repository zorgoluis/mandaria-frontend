import { createContext, useContext } from 'react'
import type { User } from '../types/api'
export interface AuthState {
  user: User | null
  loading: boolean
  expired: boolean
  error: unknown
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider requerido')
  return auth
}
