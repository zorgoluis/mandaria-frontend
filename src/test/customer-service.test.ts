import { beforeEach, expect, it, vi } from 'vitest'
import { api, apiOnce, publicApi } from '../services/api'
import { customer } from '../customer/service'
import {
  command,
  readPending,
  retryCommand,
  forgetBodies,
} from '../customer/pending'
import { ApiError } from '../services/errors'
vi.mock('../services/api', () => ({
  api: vi.fn(),
  apiOnce: vi.fn(),
  publicApi: vi.fn(),
}))
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  forgetBodies()
  let queue = Promise.resolve()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (
        _name: string,
        _options: unknown,
        callback: (lock: object) => Promise<unknown>,
      ) => {
        const result = queue.then(() => callback({}))
        queue = result.then(
          () => undefined,
          () => undefined,
        )
        return result
      },
    },
  })
})
it('resend sends the full profile; reset uses public endpoint', async () => {
  const profile = {
    email: 'synthetic@example.test',
    type: 'BUSINESS' as const,
    displayName: 'Sintético',
    businessName: 'Local',
  }
  await customer.register(profile, true)
  expect(publicApi).toHaveBeenCalledWith(
    '/customer-registration/resend',
    'POST',
    profile,
  )
  await customer.confirm('RESET', 'synthetic-token', 'synthetic-long-password')
  expect(publicApi).toHaveBeenLastCalledWith('/auth/password-reset', 'POST', {
    token: 'synthetic-token',
    password: 'synthetic-long-password',
  })
})
it('VERIFY requires human transport and type change has revision without idempotency header', async () => {
  await customer.confirm('VERIFY', 'synthetic-token')
  expect(apiOnce).toHaveBeenCalledWith(
    '/customer/contact-verification/confirm',
    'POST',
    { token: 'synthetic-token' },
  )
  await customer.type({ type: 'BUSINESS', expectedRevision: 4 })
  expect(apiOnce).toHaveBeenLastCalledWith('/customer/profile/type', 'POST', {
    type: 'BUSINESS',
    expectedRevision: 4,
  })
})
it('all customer reads use authorized own-resource endpoints', async () => {
  await customer.capabilities()
  await customer.prequote('MPQ-000001')
  await customer.detail('MDR-000001')
  await customer.status('MDR-000001')
  await customer.requests(2)
  expect(api).toHaveBeenCalledWith('/customer/capabilities')
  expect(api).toHaveBeenCalledWith('/customer/delivery-prequotes/MPQ-000001')
  expect(api).toHaveBeenCalledWith(
    '/customer/delivery-requests/MDR-000001/status',
  )
  expect(api).toHaveBeenCalledWith(
    '/customer/delivery-requests?page=2&pageSize=20',
  )
})
it('lost response preserves original key and immutable body, never contacts in durable marker', async () => {
  const body = {
    payerContact: { name: 'Private synthetic', phone: '0000000000' },
  }
  vi.mocked(apiOnce)
    .mockRejectedValueOnce(new ApiError(0, 'lost'))
    .mockResolvedValueOnce({ ok: true })
  await expect(
    command(
      'actor',
      'convert',
      'MPQ-000001',
      '/customer/delivery-prequotes/MPQ-000001/convert',
      body,
    ),
  ).rejects.toThrow()
  const original = vi.mocked(apiOnce).mock.calls[0]
  const p = readPending()[0]
  expect(JSON.stringify(localStorage)).not.toContain('Private synthetic')
  body.payerContact.name = 'Changed'
  await retryCommand('actor', p.key)
  expect(vi.mocked(apiOnce).mock.calls[1]).toEqual(original)
  expect(readPending()).toEqual([])
})
it('reload retains lock but discards body and prevents unsafe reconstruction', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    command('actor', 'prequote', 'new', '/customer/delivery-prequotes', {
      conditions: 'synthetic',
    }),
  ).rejects.toThrow()
  const p = readPending()[0]
  forgetBodies()
  await expect(retryCommand('actor', p.key)).rejects.toThrow('memoria')
  await expect(
    command('actor', 'prequote', 'new', '/customer/delivery-prequotes', {}),
  ).rejects.toThrow('pendiente')
  expect(apiOnce).toHaveBeenCalledTimes(1)
})
it('another user cannot replay or bypass pending customer intent', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    command('A', 'convert', 'MPQ-000001', '/convert', {}),
  ).rejects.toThrow()
  await expect(retryCommand('B', readPending()[0].key)).rejects.toThrow(
    'cuenta',
  )
  await expect(command('B', 'prequote', 'new', '/new', {})).rejects.toThrow(
    'pendiente',
  )
  expect(apiOnce).toHaveBeenCalledTimes(1)
})
it('double click/tabs cannot submit another request while first result is uncertain', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  const results = await Promise.allSettled([
    command('A', 'prequote', 'new', '/new', {}),
    command('A', 'prequote', 'new', '/new', {}),
  ])
  expect(results.every((r) => r.status === 'rejected')).toBe(true)
  expect(apiOnce).toHaveBeenCalledTimes(1)
})
it.each([401, 503, 500, 409])(
  'uncertain HTTP %s preserves marker and never retries automatically',
  async (status) => {
    vi.mocked(apiOnce).mockRejectedValue(new ApiError(status, 'error'))
    await expect(
      command('A', 'accept', 'MDR-000001', '/accept', {}, 'MQ-000001'),
    ).rejects.toThrow()
    expect(readPending()).toHaveLength(1)
    expect(apiOnce).toHaveBeenCalledTimes(1)
  },
)
it.each([
  'CUSTOMER_ACTIVE_REQUEST_LIMIT',
  'SHIPPING_POLICY_CHANGED',
  'QUOTE_EXPIRED',
])('definitive %s allows explicit new decision', async (code) => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(409, 'error', code))
  await expect(command('A', 'prequote', 'new', '/new', {})).rejects.toThrow()
  expect(readPending()).toHaveLength(0)
})
it('429 releases rejected intention without an automatic resend', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(429, 'limit'))
  await expect(command('A', 'prequote', 'new', '/new', {})).rejects.toThrow()
  expect(readPending()).toHaveLength(0)
  expect(apiOnce).toHaveBeenCalledTimes(1)
})
it('cancellation does not invent an idempotency header and policy uses UUID', async () => {
  vi.mocked(apiOnce).mockResolvedValue({})
  await command(
    'A',
    'cancel',
    'MDR-000001',
    '/customer/delivery-requests/MDR-000001/cancel',
    { reason: 'Sintético' },
  )
  expect(vi.mocked(apiOnce).mock.calls[0][4]).toBeUndefined()
  await command(
    'A',
    'policy',
    'integration',
    '/admin/integrations/integration/shipping-policy',
    { payer: 'REQUESTER', expectedRevision: 1 },
  )
  expect(vi.mocked(apiOnce).mock.calls[1][4]?.['Idempotency-Key']).toMatch(
    /^[a-f0-9-]{36}$/,
  )
})
it('a forbidden replay after uncertainty does not erase the original unknown outcome', async () => {
  vi.mocked(apiOnce)
    .mockRejectedValueOnce(new ApiError(0, 'lost'))
    .mockRejectedValueOnce(new ApiError(403, 'denied'))
  await expect(
    command('A', 'convert', 'MPQ-000001', '/convert', {}),
  ).rejects.toThrow()
  const marker = readPending()[0]
  await expect(retryCommand('A', marker.key)).rejects.toThrow()
  expect(readPending()).toEqual([marker])
})
it('an unavailable cross-tab lock prevents a successful double submission', async () => {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (
        _name: string,
        _options: unknown,
        callback: (lock: null) => unknown,
      ) => Promise.resolve(callback(null)),
    },
  })
  await expect(command('A', 'prequote', 'new', '/new', {})).rejects.toThrow(
    'pestaña',
  )
  expect(apiOnce).not.toHaveBeenCalled()
})
