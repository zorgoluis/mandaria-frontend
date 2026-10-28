import { createContext, useContext, useEffect } from 'react'
import { ApiError } from '../services/errors'
import type { Operation } from './service'
import type { Intent } from './attempts'
interface Commands {
  evidenceParties?: Record<string, string>
  forgetEvidenceParties?: () => void
  deny: () => void
  blocked: boolean
  prepare: (
    operation: Operation,
    caseId: string,
    body: Record<string, unknown>,
    ref?: string,
    file?: Intent['file'],
    evidenceParty?: string,
  ) => void
}
export const Context = createContext<Commands | null>(null)
export function useAssistanceAccess(error: unknown) {
  const deny = useContext(Context)?.deny
  useEffect(() => {
    if (error instanceof ApiError && [401, 403].includes(error.status)) deny?.()
  }, [error, deny])
}
export function useCommands() {
  const value = useContext(Context)
  if (!value) throw Error('Falta contexto de asistencia')
  return value
}
