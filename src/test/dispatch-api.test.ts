import { beforeEach, expect, it, vi } from 'vitest'
import { adminDispatches, providerDispatches } from '../dispatch/service'
import { normalizeError } from '../services/errors'
import { remaining, summaryReason } from '../dispatch/format'

const A = '11111111-1111-4111-8111-111111111111'
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})
const calls = (fetcher: { mock: { calls: unknown[][] } }) =>
  fetcher.mock.calls.map(([url, init]) => {
    const u = new URL(String(url))
    const request = init as RequestInit
    return {
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      method: request.method,
      body: request.body ? JSON.parse(String(request.body)) : undefined,
    }
  })

it('uses the real provider dispatch endpoints; claim has no body', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await providerDispatches.list(A, { page: 2, pageSize: 20, view: 'AVAILABLE' })
  await providerDispatches.get(A, ID)
  await providerDispatches.claim(A, ID)
  await providerDispatches.release(A, ID, 'Sin repartidor disponible')
  const [list, get, claim, release] = calls(fetcher)
  expect(list).toEqual({
    path: '/api/v1/provider/dispatches',
    query: { page: '2', pageSize: '20', view: 'AVAILABLE', providerId: A },
    method: 'GET',
    body: undefined,
  })
  expect(get).toMatchObject({
    path: `/api/v1/provider/dispatches/${ID}`,
    query: { providerId: A },
  })
  expect(claim).toEqual({
    path: `/api/v1/provider/dispatches/${ID}/claim`,
    query: { providerId: A },
    method: 'POST',
    body: undefined,
  })
  expect(release).toMatchObject({
    path: `/api/v1/provider/dispatches/${ID}/release`,
    method: 'POST',
    body: { reason: 'Sin repartidor disponible' },
  })
})

it('uses the read-only admin dispatch endpoints', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await adminDispatches.list({
    page: 1,
    pageSize: 20,
    status: 'OPEN',
    deliveryRequestPublicId: 'MDR-000001',
  })
  await adminDispatches.get(ID)
  const [list, get] = calls(fetcher)
  expect(list).toMatchObject({
    path: '/api/v1/admin/dispatches',
    query: {
      page: '1',
      pageSize: '20',
      status: 'OPEN',
      deliveryRequestPublicId: 'MDR-000001',
    },
  })
  expect(get.path).toBe(`/api/v1/admin/dispatches/${ID}`)
})

it.each([
  [
    'DISPATCH_ALREADY_CLAIMED',
    'Este servicio ya fue tomado por otro proveedor.',
  ],
  ['DISPATCH_EXPIRED', 'El tiempo para tomar este servicio terminó.'],
  ['DISPATCH_RECLAIM_NOT_ALLOWED', 'no puede volver a tomarlo'],
  ['DISPATCH_NOT_CLAIMED_BY_PROVIDER', 'ya no está tomado por tu proveedor'],
])('translates %s without raw backend text', async (code, text) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        code,
        message: 'Dispatch was already claimed by another provider',
      }),
      { status: 409 },
    ),
  )
  const error = await providerDispatches.claim(A, ID).catch((e: unknown) => e)
  expect(error).toMatchObject({ status: 409, code })
  expect((error as Error).message).toContain(text)
  expect((error as Error).message).not.toContain('provider')
})

it('keeps 404 and generic errors safe', () => {
  expect(normalizeError(404, { message: 'Dispatch not found' }).message).toBe(
    'El servicio no existe o no está disponible para tu proveedor.',
  )
  expect(normalizeError(429, null).message).toBe(
    'Demasiados intentos. Intenta nuevamente más tarde.',
  )
})

it('formats the countdown and summary reasons from real fields only', () => {
  const now = Date.parse('2026-09-16T12:00:00Z')
  expect(remaining('2026-09-16T12:08:05Z', now)).toBe('8:05')
  expect(remaining('2026-09-16T13:00:01Z', now)).toBe('1:00:01')
  expect(remaining('2026-09-16T12:00:00Z', now)).toBeNull()
  expect(remaining('not a date', now)).toBeNull()
  expect(
    summaryReason({
      status: 'EXPIRED',
      claimedByMe: false,
      myCandidate: { status: 'OFFERED' },
    }),
  ).toContain('terminó')
  expect(
    summaryReason({
      status: 'CLAIMED',
      claimedByMe: false,
      myCandidate: { status: 'OFFERED' },
    }),
  ).toContain('otro proveedor')
})
