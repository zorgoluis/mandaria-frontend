import { beforeEach, expect, it, vi } from 'vitest'
import {
  myServiceCoverages,
  serviceCoverages,
} from '../service-coverage/service'
import { normalizeError } from '../services/errors'

const PROVIDER = '11111111-1111-4111-8111-111111111111'
const ZONE = '22222222-2222-4222-8222-222222222222'
const COVERAGE = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

it('uses the real V1.7 coverage endpoints and never DELETE', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('[]', { status: 200 }))
  await serviceCoverages.list(PROVIDER)
  await serviceCoverages.create(PROVIDER, {
    serviceZoneId: ZONE,
    serviceType: 'LOCAL_DELIVERY',
  })
  await serviceCoverages.setStatus(PROVIDER, COVERAGE, 'INACTIVE')
  await myServiceCoverages.list(PROVIDER)
  const calls = fetcher.mock.calls
  const urls = calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    `/api/v1/admin/providers/${PROVIDER}/service-coverages`,
    `/api/v1/admin/providers/${PROVIDER}/service-coverages`,
    `/api/v1/admin/providers/${PROVIDER}/service-coverages/${COVERAGE}`,
    '/api/v1/provider/service-coverages',
  ])
  expect(calls.map(([, init]) => init?.method)).toEqual([
    'GET',
    'POST',
    'PATCH',
    'GET',
  ])
  expect(calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
  // The real module exposes no remove call at all.
  expect(Object.keys(serviceCoverages).sort()).toEqual([
    'create',
    'list',
    'setStatus',
  ])
  // WRITE is flat; the zone id never travels nested.
  expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
    serviceZoneId: ZONE,
    serviceType: 'LOCAL_DELIVERY',
  })
  expect(JSON.parse(String(calls[2][1]?.body))).toEqual({ status: 'INACTIVE' })
  // The provider view only selects among the user's memberships.
  expect(Object.fromEntries(urls[3].searchParams)).toEqual({
    providerId: PROVIDER,
  })
})

it('translates the coverage conflicts into actionable messages', () => {
  const exists = normalizeError(409, {
    code: 'SERVICE_COVERAGE_EXISTS',
    message: 'Provider already has coverage for this zone and service type',
  })
  expect(exists.code).toBe('SERVICE_COVERAGE_EXISTS')
  expect(exists.message).toMatch(/ya tiene cobertura para esa zona/)
  expect(exists.message).not.toMatch(/Provider already/)
  expect(normalizeError(404, { message: 'Coverage not found' }).message).toBe(
    'Esa cobertura ya no existe para este proveedor. Actualiza la lista.',
  )
  expect(
    normalizeError(404, { message: 'Service zone not found' }).message,
  ).toBe('La zona de servicio ya no está disponible.')
})

it.each([400, 401, 403, 404, 409, 429, 500])(
  'keeps HTTP %s errors safe',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ message: 'prisma internal detail' }), {
          status,
        }),
    )
    await expect(
      serviceCoverages.setStatus(PROVIDER, COVERAGE, 'ACTIVE'),
    ).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)
