import { beforeEach, expect, it, vi } from 'vitest'
import { fleetPage } from './fleet-fixture'
beforeEach(() => vi.resetModules())
it('translates the real shared-parser cursor error without retrying or changing its code', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'ECONOMIC_CONTEXT_CHANGED',
          message: 'ECONOMIC_CONTEXT_CHANGED',
        }),
        { status: 409 },
      ),
    )
  const { fleet } = await import('../fleet/service')
  await expect(fleet.services('provider', {}, 'invalid')).rejects.toMatchObject(
    {
      status: 409,
      code: 'ECONOMIC_CONTEXT_CHANGED',
      message:
        'No se pudo validar el cursor del historial. Refresca el historial para volver al inicio.',
    },
  )
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('list and detail use the provider envelope and an exact filter allowlist', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify(fleetPage())))
  const { fleet } = await import('../fleet/service')
  const filters = {
    from: '2026-10-01T00:00:00Z',
    to: '2026-10-23T00:00:00Z',
    status: 'ACTIVE' as const,
    driverId: 'driver',
    vehicleId: 'vehicle',
    pageSize: 999,
    contact: 'forbidden',
  }
  expect(
    (await fleet.services('provider', filters, 'signed')).items,
  ).toHaveLength(1)
  const url = new URL(String(fetch.mock.calls[0][0]))
  expect(url.pathname).toBe('/api/v1/provider/fleet-services')
  expect([...url.searchParams.keys()].sort()).toEqual([
    'driverId',
    'from',
    'pageToken',
    'providerId',
    'status',
    'to',
    'vehicleId',
  ])
  const detail = await fleet.services('provider', {}, undefined, 'dispatch/id')
  expect(detail).toEqual(fleetPage())
  expect(String(fetch.mock.calls[1][0])).toContain(
    '/provider/fleet-services/dispatch%2Fid?providerId=provider',
  )
})
it('spending and context never use driver/admin authority, and PUT preserves the body', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ enabled: false, revision: '9' })),
    )
  const { fleet } = await import('../fleet/service')
  await fleet.context('provider')
  await fleet.spending('provider', 'driver')
  const command = {
    requestId: '11111111-1111-4111-8111-111111111111',
    expectedRevision: '9',
    enabled: true,
  }
  await fleet.setSpending('provider', 'driver', command)
  await fleet.setSpending('provider', 'driver', command)
  expect(fetch.mock.calls.map((c) => new URL(String(c[0])).pathname)).toEqual([
    '/api/v1/provider/fleet-operation-context',
    '/api/v1/provider/drivers/driver/fleet-spending',
    '/api/v1/provider/drivers/driver/fleet-spending',
    '/api/v1/provider/drivers/driver/fleet-spending',
  ])
  expect(fetch.mock.calls[2][1]).toMatchObject({
    method: 'PUT',
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  expect(fetch.mock.calls[3][1]?.body).toBe(fetch.mock.calls[2][1]?.body)
})
