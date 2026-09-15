import { beforeEach, expect, it, vi } from 'vitest'
import { deliveryRequests } from '../delivery-requests/service'
import { dayBoundary, dimensions, money } from '../delivery-requests/format'
import { normalizeError } from '../services/errors'
beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})
it('uses the real admin DeliveryRequest endpoints and payloads', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await deliveryRequests.list({
    page: 2,
    pageSize: 20,
    publicId: 'MDR-000123',
    integrationClientId: '11111111-1111-4111-8111-111111111111',
    externalReference: 'ORDER 1842&x=1',
    status: 'CANCELLED',
    requestedFrom: '2026-09-01T06:00:00.000Z',
    requestedTo: undefined,
  })
  await deliveryRequests.get('MDR-000123')
  await deliveryRequests.cancel('MDR-000123', 'Pedido duplicado')
  const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    '/api/v1/admin/delivery-requests',
    '/api/v1/admin/delivery-requests/MDR-000123',
    '/api/v1/admin/delivery-requests/MDR-000123/cancel',
  ])
  expect(Object.fromEntries(urls[0].searchParams)).toEqual({
    page: '2',
    pageSize: '20',
    publicId: 'MDR-000123',
    integrationClientId: '11111111-1111-4111-8111-111111111111',
    externalReference: 'ORDER 1842&x=1',
    status: 'CANCELLED',
    requestedFrom: '2026-09-01T06:00:00.000Z',
  })
  expect(fetcher.mock.calls[1][1]?.method).toBe('GET')
  expect(fetcher.mock.calls[2][1]?.method).toBe('POST')
  expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({
    reason: 'Pedido duplicado',
  })
})
it.each([400, 401, 403, 404, 409, 429, 500])(
  'keeps HTTP %s errors safe',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ message: 'contactPhone +52 961 123 4567' }),
          { status },
        ),
    )
    await expect(deliveryRequests.get('MDR-000123')).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)
it('translates the known not-found message and network failures', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ message: 'Delivery request not found' }), {
      status: 404,
    }),
  )
  await expect(deliveryRequests.get('MDR-000999')).rejects.toMatchObject({
    status: 404,
    message: 'La solicitud de entrega no existe o ya no está disponible.',
  })
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('socket detail'))
  await expect(deliveryRequests.list({})).rejects.toMatchObject({
    status: 0,
    message: normalizeError(0, null).message,
  })
})
it('formats values without inventing data', () => {
  expect(dimensions({ lengthCm: 50, widthCm: 40, heightCm: 30 })).toBe(
    '50 × 40 × 30 cm',
  )
  expect(dimensions({ lengthCm: null, widthCm: null, heightCm: null })).toBe(
    'No informadas',
  )
  expect(dimensions({ lengthCm: 50, widthCm: null, heightCm: 30 })).toBe(
    '50 × — × 30 cm',
  )
  expect(
    money({ goodsValue: null, goodsPaymentMode: 'PREPAID', currency: 'MXN' }),
  ).toBe('No informado')
  expect(
    money({
      goodsValue: '450.00',
      goodsPaymentMode: 'PREPAID',
      currency: 'MXN',
    }),
  ).toBe('$450.00 MXN')
  expect(dayBoundary('2026-02-31x', false)).toBeUndefined()
  expect(dayBoundary('2026-09-01', true)).toBe(
    new Date('2026-09-01T23:59:59.999').toISOString(),
  )
})
