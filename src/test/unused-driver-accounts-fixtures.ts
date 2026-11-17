import type { Page } from '../types/api'
import type { UnusedDriverAccount } from '../independent-drivers/types'

export function unusedAccount(
  overrides: Partial<UnusedDriverAccount> = {},
): UnusedDriverAccount {
  return {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'cuenta-sintetica@example.invalid',
    name: 'Mariana Sintética',
    driverId: '22222222-2222-4222-8222-222222222222',
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    active: true,
    driverStatus: 'PENDING',
    independentProfileId: '33333333-3333-4333-8333-333333333333',
    independentProfileStatus: 'PENDING',
    category: 'INDEPENDENT',
    hasServiceActivity: false,
    canDeactivate: true,
    blockReason: null,
    deactivatedAt: null,
    ...overrides,
  }
}

export function unusedPage(
  items: UnusedDriverAccount[] = [unusedAccount()],
  page = 1,
  total = items.length,
): Page<UnusedDriverAccount> {
  return { items, page, pageSize: 20, total, totalPages: Math.ceil(total / 20) }
}
