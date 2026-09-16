import { beforeEach, expect, it, vi } from 'vitest'
import { deliveryQuotes } from '../quotes/service'
import {
  duration,
  quoteStatusLabels,
  routingProviderLabel,
} from '../quotes/format'
import { normalizeError } from '../services/errors'

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

it('uses the real read-only admin DeliveryQuote endpoints', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await deliveryQuotes.list({
    page: 2,
    pageSize: 20,
    publicId: 'MQ-000092',
    deliveryRequestPublicId: 'MDR-000123',
    integrationClientId: '11111111-1111-4111-8111-111111111111',
    serviceZoneId: '22222222-2222-4222-8222-222222222222',
    status: 'ACCEPTED',
    createdFrom: '2026-09-01T06:00:00.000Z',
    createdTo: undefined,
  })
  await deliveryQuotes.get('MQ-000092')
  await deliveryQuotes.forRequest('MDR-000123', 1, 20)
  const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    '/api/v1/admin/delivery-quotes',
    '/api/v1/admin/delivery-quotes/MQ-000092',
    '/api/v1/admin/delivery-requests/MDR-000123/quotes',
  ])
  expect(Object.fromEntries(urls[0].searchParams)).toEqual({
    page: '2',
    pageSize: '20',
    publicId: 'MQ-000092',
    deliveryRequestPublicId: 'MDR-000123',
    integrationClientId: '11111111-1111-4111-8111-111111111111',
    serviceZoneId: '22222222-2222-4222-8222-222222222222',
    status: 'ACCEPTED',
    createdFrom: '2026-09-01T06:00:00.000Z',
  })
  expect(Object.fromEntries(urls[2].searchParams)).toEqual({
    page: '1',
    pageSize: '20',
  })
  // The admin surface is read only: every call is a GET.
  expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual([
    'GET',
    'GET',
    'GET',
  ])
})

it.each([400, 401, 403, 404, 429, 500])(
  'keeps HTTP %s quote errors safe',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ message: 'internal route key abc' }), {
          status,
        }),
    )
    await expect(deliveryQuotes.get('MQ-000092')).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)

it('translates quoting failure codes instead of showing them raw', () => {
  const cases: [number, string, string][] = [
    [422, 'OUT_OF_SERVICE_AREA', 'Fuera de cobertura.'],
    [422, 'CROSS_ZONE_NOT_SUPPORTED', 'Entrega entre zonas no disponible.'],
    [422, 'ROUTE_NOT_FOUND', 'No se encontró una ruta.'],
    [
      422,
      'DISTANCE_NOT_SUPPORTED',
      'Distancia fuera de las tarifas disponibles.',
    ],
    [
      503,
      'ROUTING_UNAVAILABLE',
      'Servicio de rutas temporalmente no disponible.',
    ],
    [503, 'RATE_CONFIGURATION_UNAVAILABLE', 'No existe una tarifa activa.'],
  ]
  for (const [status, code, expected] of cases) {
    const error = normalizeError(status, {
      code,
      message: 'pickup 16.75,-93.11 outside OCOZOCOAUTLA',
    })
    expect(error.message).toBe(expected)
    expect(error.code).toBe(code)
    expect(error.message).not.toContain('16.75')
  }
  // A failure is never represented as a zero price anywhere in the UI.
  expect(cases.every(([, , text]) => !text.includes('0'))).toBe(true)
})

it('translates statuses and formats routing data', () => {
  expect(quoteStatusLabels).toEqual({
    OFFERED: 'Ofrecida',
    ACCEPTED: 'Aceptada',
    EXPIRED: 'Expirada',
    CANCELLED: 'Cancelada',
  })
  expect(duration(780)).toBe('13 min')
  expect(duration(0)).toBe('0 min')
  expect(duration(3600)).toBe('1 h')
  expect(duration(3900)).toBe('1 h 5 min')
  expect(duration(-1)).toBe('No disponible')
  expect(routingProviderLabel('google')).toBe('Google')
  expect(routingProviderLabel('local_fake')).toBe('Proveedor local de pruebas')
  expect(routingProviderLabel('AIzaSyKey')).toBe(
    'Proveedor de ruta configurado',
  )
})
