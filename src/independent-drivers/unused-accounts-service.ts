import { api, apiOnce } from '../services/api'
import { ApiError } from '../services/errors'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  DeactivateUnusedAccount,
  UnusedAccountFilters,
  UnusedAccountReceipt,
  UnusedDriverAccount,
} from './types'

const base = '/admin/independent-drivers/unused-accounts'
const accountPath = (userId: string) => `${base}/${encodeURIComponent(userId)}`

export const unusedAccountMessages: Record<string, string> = {
  ACCOUNT_ALREADY_DISABLED: 'La cuenta ya está dada de baja.',
  ACCOUNT_NOT_REGISTERED: 'Esta cuenta todavía no ha completado su registro.',
  ACCOUNT_NOT_INDEPENDENT:
    'La pertenencia de esta cuenta cambió. No se puede dar de baja desde este listado.',
  ACCOUNT_HAS_SERVICE_ACTIVITY:
    'La cuenta ya tiene actividad en servicios. No se puede dar de baja desde este listado.',
  ACCOUNT_CLOSING:
    'La cuenta tiene un proceso de baja en curso. Revisa ese proceso antes de continuar.',
  ACCOUNT_STATE_CHANGED:
    'La cuenta cambió. Consulta su estado y revisa la decisión antes de continuar.',
  IDEMPOTENCY_KEY_REUSED:
    'La solicitud no coincide con la confirmación original. Consulta el estado de la cuenta.',
}

export const unusedAccountKeys = {
  all: ['independent-drivers', 'unused-accounts'] as const,
  list: (actor: string, filters: UnusedAccountFilters) =>
    ['independent-drivers', 'unused-accounts', actor, 'list', filters] as const,
  detail: (actor: string, userId: string) =>
    [
      'independent-drivers',
      'unused-accounts',
      actor,
      'detail',
      userId,
    ] as const,
}

export const unusedDriverAccounts = {
  list: (filters: UnusedAccountFilters, signal?: AbortSignal) =>
    api<Page<UnusedDriverAccount>>(
      `${base}?${queryString({ ...filters })}`,
      'GET',
      undefined,
      signal,
    ),
  get: (userId: string, signal?: AbortSignal) =>
    api<UnusedDriverAccount>(accountPath(userId), 'GET', undefined, signal),
  deactivate: async (userId: string, input: DeactivateUnusedAccount) => {
    try {
      const receipt = await apiOnce<UnusedAccountReceipt>(
        `${accountPath(userId)}/deactivate`,
        'POST',
        input,
      )
      if (
        receipt.userId !== userId ||
        receipt.requestId !== input.requestId ||
        receipt.active !== false ||
        !receipt.deactivatedAt
      )
        throw new ApiError(0, 'No se pudo confirmar el resultado de la baja.')
      return receipt
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code &&
        unusedAccountMessages[error.code]
      )
        throw new ApiError(
          error.status,
          unusedAccountMessages[error.code],
          error.code,
          error.details,
          error.requestId,
        )
      throw error
    }
  },
}
