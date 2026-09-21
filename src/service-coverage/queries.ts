import { queryClient } from '../services/query'

export const coverageKeys = {
  all: ['service-coverages'] as const,
  admin: (providerId: string) =>
    ['service-coverages', 'admin', providerId] as const,
  mine: (providerId: string) =>
    ['service-coverages', 'mine', providerId] as const,
}

/**
 * Every mutation waits for the backend's list before the dialog closes: the screen shows what
 * PostgreSQL holds, never an optimistic guess.
 */
export async function refreshCoverages(providerId: string) {
  await queryClient.invalidateQueries({ queryKey: coverageKeys.all })
  await queryClient.refetchQueries({ queryKey: coverageKeys.admin(providerId) })
}
