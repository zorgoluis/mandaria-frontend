import { beforeEach, expect, it, vi } from 'vitest'
import { ratePlans, serviceZones } from '../pricing/service'
import {
  amountFrom,
  bandError,
  bandErrors,
  boundaryText,
  km,
  kmValue,
  metersFrom,
  money,
  parseBoundary,
  positionCount,
  validityText,
} from '../pricing/format'
import { normalizeError } from '../services/errors'

const zoneId = '11111111-1111-4111-8111-111111111111'
const planId = '22222222-2222-4222-8222-222222222222'
const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-93.41, 16.735],
      [-93.34, 16.735],
      [-93.34, 16.79],
      [-93.41, 16.79],
      [-93.41, 16.735],
    ],
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

it('uses the real admin ServiceZone endpoints and payloads', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await serviceZones.list({
    page: 2,
    pageSize: 20,
    search: 'ocoz',
    status: 'ACTIVE',
  })
  await serviceZones.get(zoneId)
  await serviceZones.create({
    code: 'OCOZOCOAUTLA',
    name: 'Ocozocoautla de Espinosa, Chiapas, México',
    currency: 'MXN',
    boundary: polygon,
  })
  await serviceZones.rename(zoneId, 'Ocozocoautla, Chiapas')
  await serviceZones.replaceBoundary(zoneId, polygon)
  await serviceZones.transition(zoneId, 'activate')
  await serviceZones.transition(zoneId, 'deactivate')
  const calls = fetcher.mock.calls
  const urls = calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    '/api/v1/admin/service-zones',
    `/api/v1/admin/service-zones/${zoneId}`,
    '/api/v1/admin/service-zones',
    `/api/v1/admin/service-zones/${zoneId}`,
    `/api/v1/admin/service-zones/${zoneId}/boundary`,
    `/api/v1/admin/service-zones/${zoneId}/activate`,
    `/api/v1/admin/service-zones/${zoneId}/deactivate`,
  ])
  expect(Object.fromEntries(urls[0].searchParams)).toEqual({
    page: '2',
    pageSize: '20',
    search: 'ocoz',
    status: 'ACTIVE',
  })
  expect(calls.map(([, init]) => init?.method)).toEqual([
    'GET',
    'GET',
    'POST',
    'PATCH',
    'PUT',
    'POST',
    'POST',
  ])
  expect(JSON.parse(String(calls[2][1]?.body))).toEqual({
    code: 'OCOZOCOAUTLA',
    name: 'Ocozocoautla de Espinosa, Chiapas, México',
    currency: 'MXN',
    boundary: polygon,
  })
  expect(JSON.parse(String(calls[3][1]?.body))).toEqual({
    name: 'Ocozocoautla, Chiapas',
  })
  expect(JSON.parse(String(calls[4][1]?.body))).toEqual({ boundary: polygon })
})

it('uses the real admin RatePlan endpoints and metre-based bands', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await ratePlans.list({
    page: 1,
    pageSize: 20,
    serviceZoneId: zoneId,
    serviceType: 'LOCAL_DELIVERY',
    status: 'ACTIVE',
  })
  await ratePlans.get(planId)
  await ratePlans.create({
    serviceZoneId: zoneId,
    serviceType: 'LOCAL_DELIVERY',
    quoteValidityMinutes: 15,
  })
  await ratePlans.clone(planId)
  await ratePlans.updateValidity(planId, 20)
  await ratePlans.replaceBands(planId, [
    { minDistanceMeters: 0, maxDistanceMeters: 2000, amount: '30.00' },
    { minDistanceMeters: 2000, maxDistanceMeters: 4000, amount: '40.00' },
  ])
  await ratePlans.validate(planId)
  await ratePlans.transition(planId, 'activate')
  await ratePlans.transition(planId, 'deactivate')
  const calls = fetcher.mock.calls
  const urls = calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    '/api/v1/admin/rate-plans',
    `/api/v1/admin/rate-plans/${planId}`,
    '/api/v1/admin/rate-plans',
    `/api/v1/admin/rate-plans/${planId}/clone`,
    `/api/v1/admin/rate-plans/${planId}`,
    `/api/v1/admin/rate-plans/${planId}/bands`,
    `/api/v1/admin/rate-plans/${planId}/validate`,
    `/api/v1/admin/rate-plans/${planId}/activate`,
    `/api/v1/admin/rate-plans/${planId}/deactivate`,
  ])
  expect(Object.fromEntries(urls[0].searchParams)).toEqual({
    page: '1',
    pageSize: '20',
    serviceZoneId: zoneId,
    serviceType: 'LOCAL_DELIVERY',
    status: 'ACTIVE',
  })
  expect(calls[5][1]?.method).toBe('PUT')
  expect(JSON.parse(String(calls[5][1]?.body))).toEqual({
    bands: [
      { minDistanceMeters: 0, maxDistanceMeters: 2000, amount: '30.00' },
      { minDistanceMeters: 2000, maxDistanceMeters: 4000, amount: '40.00' },
    ],
  })
  expect(JSON.parse(String(calls[4][1]?.body))).toEqual({
    quoteValidityMinutes: 20,
  })
})

it.each([400, 401, 403, 404, 409, 422, 429, 500, 503])(
  'keeps HTTP %s errors safe for pricing',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ message: 'SELECT boundary FROM "ServiceZone"' }),
          { status },
        ),
    )
    await expect(serviceZones.get(zoneId)).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)

it('translates the V1.6 domain codes instead of the raw message', async () => {
  const cases: [number, string, string][] = [
    [409, 'SERVICE_ZONE_OVERLAP', 'Boundary intersects active zone TUXTLA'],
    [409, 'SERVICE_ZONE_NOT_EDITABLE', 'Deactivate the zone first'],
    [409, 'RATE_PLAN_NOT_EDITABLE', 'Only DRAFT rate plans can be edited'],
    [422, 'RATE_PLAN_INVALID', 'gap between 4000 and 5000 meters'],
  ]
  for (const [status, code, message] of cases) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ statusCode: status, code, message }), {
        status,
      }),
    )
    const error = await ratePlans
      .transition(planId, 'activate')
      .catch((err: unknown) => err)
    expect(error).toMatchObject({ status, code })
    expect(String((error as Error).message)).not.toContain(message)
    expect((error as Error).message).toBe(
      normalizeError(status, { code }).message,
    )
  }
})

it('keeps backend validation details out of the message but available to translate', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: ['band 0-2000: amount must be greater than 0'],
      }),
      { status: 400 },
    ),
  )
  const error = await ratePlans
    .replaceBands(planId, [
      { minDistanceMeters: 0, maxDistanceMeters: 2000, amount: '0.00' },
    ])
    .catch((err: unknown) => err)
  expect((error as Error).message).not.toContain('amount must be greater')
  expect(bandErrors((error as { details: string[] }).details)).toEqual([
    'Banda 0 – 2 km: el precio debe ser mayor que cero.',
  ])
})

it('converts between kilometres shown and metres sent', () => {
  expect(km(2000)).toBe('2 km')
  expect(km(4700)).toBe('4.7 km')
  expect(kmValue(4500)).toBe('4.5')
  expect(metersFrom('2')).toBe(2000)
  expect(metersFrom('4.7')).toBe(4700)
  expect(metersFrom('4,7')).toBe(4700)
  expect(metersFrom('0')).toBe(0)
  expect(metersFrom('')).toBeNull()
  expect(metersFrom('-1')).toBeNull()
  expect(metersFrom('1.2345')).toBeNull()
  expect(metersFrom('2000')).toBeNull()
  expect(amountFrom('30')).toBe('30')
  expect(amountFrom('30.50')).toBe('30.50')
  expect(amountFrom('30,50')).toBe('30.50')
  expect(amountFrom('0')).toBeNull()
  expect(amountFrom('30.555')).toBeNull()
  expect(amountFrom('abc')).toBeNull()
  expect(money('50.00', 'MXN')).toBe('$50.00 MXN')
  expect(validityText(15)).toBe('15 minutos')
  expect(validityText(1)).toBe('1 minuto')
})

it('translates every band diagnosis the backend can emit', () => {
  expect(bandError('Rate plan requires at least one band')).toBe(
    'La tarifa necesita al menos una banda.',
  )
  expect(bandError('gap between 4000 and 5000 meters')).toBe(
    'Hueco entre rangos: 4 – 5 km sin banda.',
  )
  expect(bandError('overlap between band[0-4000) and band[2000-6000)')).toBe(
    'Rangos superpuestos: 0 – 4 km y 2 – 6 km.',
  )
  expect(
    bandError(
      'band[2000-1000): maxDistanceMeters must be greater than minDistanceMeters',
    ),
  ).toBe('Banda 2 – 1 km: la distancia final debe ser mayor que la inicial.')
  expect(bandError('band[0-2000): amount must be greater than 0')).toBe(
    'Banda 0 – 2 km: el precio debe ser mayor que cero.',
  )
  expect(bandError('band[0-2000): currency must be MXN')).toBe(
    'Banda 0 – 2 km: la moneda debe ser MXN.',
  )
  expect(bandError('band[1000-2000): first band must start at 0')).toBe(
    'Banda 1 – 2 km: la primera banda debe empezar en 0 km.',
  )
  expect(
    bandError('band[0-2000): limits must be non-negative integer meters'),
  ).toBe(
    'Banda 0 – 2 km: las distancias deben ser metros enteros no negativos.',
  )
  expect(bandError('bands must not share the same minDistanceMeters')).toBe(
    'Dos bandas no pueden empezar en la misma distancia.',
  )
  expect(
    bandError(
      'quoteValidityMinutes must be between 1 and 120 for LOCAL_DELIVERY',
    ),
  ).toBe('La vigencia de cotización debe estar entre 1 y 120 minutos.')
  // Anything unexpected never reaches the screen verbatim.
  expect(bandError('unexpected internal detail user@example.test')).toBe(
    'Revisa los rangos y los precios de las bandas.',
  )
  expect(
    bandErrors([
      'gap between 4000 and 5000 meters',
      'gap between 4000 and 5000 meters',
    ]),
  ).toHaveLength(1)
})

it('accepts only GeoJSON polygons for the boundary editor', () => {
  expect(parseBoundary(JSON.stringify(polygon))).toEqual(polygon)
  expect(
    parseBoundary(
      JSON.stringify({
        type: 'MultiPolygon',
        coordinates: [polygon.coordinates],
      }),
    ),
  ).not.toBeNull()
  expect(parseBoundary('not json')).toBeNull()
  expect(parseBoundary('[]')).toBeNull()
  expect(
    parseBoundary(JSON.stringify({ type: 'Point', coordinates: [0, 0] })),
  ).toBeNull()
  expect(
    parseBoundary(JSON.stringify({ type: 'Polygon', coordinates: [] })),
  ).toBeNull()
  expect(positionCount(polygon as never)).toBe(5)
  expect(boundaryText(polygon)).toContain('"Polygon"')
  expect(boundaryText(null)).toBe('')
})
