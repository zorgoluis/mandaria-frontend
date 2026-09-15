import { beforeEach, expect, it, vi } from 'vitest'
import { drivers } from '../drivers/service'
import { vehicles } from '../vehicles/service'
import { assignments } from '../assignments/service'
import { capacity } from '../logistics/service'
import { normalizeError } from '../services/errors'
import type { LogisticsRole } from '../logistics/types'
beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})
it.each(['SUPER_ADMIN', 'PROVIDER_ADMIN'] as LogisticsRole[])(
  'uses actual scoped API paths and payloads for %s',
  async (role) => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response('{}', { status: 200 }))
    const scope = { role, providerId: 'provider-a' }
    await drivers.list(scope, {
      page: 2,
      search: 'Carlos',
      availability: 'OFFLINE',
    })
    await drivers.create(scope, { userId: 'user-id', name: 'Carlos' })
    await vehicles.create(scope, {
      identifier: 'BICI-01',
      type: 'BICYCLE',
      plate: null,
    })
    await vehicles.update(scope, 'vehicle-id', { status: 'MAINTENANCE' })
    await assignments.assign(scope, 'driver-id', 'vehicle-id')
    await assignments.unassign(scope, 'driver-id')
    await assignments.history(scope, 'vehicles', 'vehicle-id', 2)
    await capacity(scope)
    const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)))
    const prefix = `/api/v1/${role === 'SUPER_ADMIN' ? 'admin/providers/provider-a' : 'provider'}`
    expect(urls.map((u) => u.pathname)).toEqual(
      [
        'drivers',
        'drivers',
        'vehicles',
        'vehicles/vehicle-id',
        'drivers/driver-id/vehicle',
        'drivers/driver-id/vehicle',
        'vehicles/vehicle-id/assignments',
        'capacity',
      ].map((p) => `${prefix}/${p}`),
    )
    for (const url of urls)
      expect(url.searchParams.get('providerId')).toBe(
        role === 'PROVIDER_ADMIN' ? 'provider-a' : null,
      )
    expect(urls[0].searchParams.get('availability')).toBe('OFFLINE')
    expect(JSON.parse(String(fetcher.mock.calls[4][1]?.body))).toEqual({
      vehicleId: 'vehicle-id',
    })
    expect(fetcher.mock.calls[5][1]?.method).toBe('DELETE')
    expect(fetcher.mock.calls[5][1]?.body).toBeUndefined()
  },
)
it.each([400, 403, 404, 409, 429, 500])(
  'keeps HTTP %s errors safe in logistics services',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'SELECT passwordHash FROM private_table; stack trace',
        }),
        { status },
      ),
    )
    await expect(
      drivers.list({ role: 'PROVIDER_ADMIN', providerId: 'a' }, {}),
    ).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)
it('handles network errors without exposing internal details', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(
    new Error('private network detail'),
  )
  await expect(
    vehicles.list({ role: 'PROVIDER_ADMIN', providerId: 'a' }, {}),
  ).rejects.toMatchObject({
    status: 0,
    message: normalizeError(0, null).message,
  })
})
