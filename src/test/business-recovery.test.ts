import { beforeEach, expect, it, vi } from 'vitest'
import { business } from '../customer-business/service'
import { customer } from '../customer/service'
import { queryClient } from '../services/query'
import {
  forgetBusinessBodies,
  startBusiness,
  recoverBusiness,
  readMarkers,
  storageKey,
  hasOriginalBody,
} from '../customer-business/pending'
import {
  hasBusinessContract,
  type Marker,
  type Receipt,
} from '../customer-business/contract'
import { ApiError } from '../services/errors'
import {
  accountId,
  applicationId,
  profile,
  capabilities,
  application,
  administration,
  receipt,
} from './business-fixtures'
vi.mock('../customer-business/service', () => ({
  business: {
    send: vi.fn(),
    attempt: vi.fn(),
    detail: vi.fn(),
    access: vi.fn(),
    adminDetail: vi.fn(),
  },
}))
vi.mock('../customer/service', () => ({
  customer: { profile: vi.fn(), capabilities: vi.fn() },
}))
const intent = {
  operation: 'SUBMIT' as const,
  body: {
    expectedAccountRevision: 1,
    businessName: 'Private synthetic',
    activity: 'Tienda',
    city: 'Ciudad',
    estimatedDeliveryVolume: '10 / semana',
    note: 'Private note',
  },
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  forgetBusinessBodies()
  queryClient.clear()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (
        _name: string,
        _options: unknown,
        callback: (lock: object) => unknown,
      ) => Promise.resolve(callback({})),
    },
  })
  vi.mocked(customer.profile).mockResolvedValue(profile)
  vi.mocked(customer.capabilities).mockResolvedValue(capabilities)
  vi.mocked(business.detail).mockResolvedValue(application)
  vi.mocked(business.adminDetail).mockResolvedValue({
    ...application,
    ...administration,
    decisionActorId: null,
    internalNote: null,
  })
  vi.mocked(business.access).mockResolvedValue(administration)
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'NOT_OBSERVED',
    receipt: null,
  })
  vi.mocked(business.send).mockImplementation(async (m) => receipt(m))
})
async function lost() {
  vi.mocked(business.send).mockRejectedValueOnce(new ApiError(0, 'lost'))
  await expect(startBusiness('A', accountId, intent)).rejects.toThrow()
  return readMarkers()[0]
}
it('persists only minimal scope; immutable same-key replay refreshes current state and never caches receipt as profile', async () => {
  const m = await lost()
  const raw = localStorage.getItem(storageKey)!
  expect(JSON.parse(raw)[0]).toEqual(m)
  expect(raw).not.toMatch(/Private|activity|note|token|password/)
  const original = structuredClone(vi.mocked(business.send).mock.calls[0][1])
  intent.body.city = 'Changed'
  vi.mocked(business.send).mockImplementation(async (marker) => receipt(marker))
  await recoverBusiness('A', m.key, 'replay')
  expect(vi.mocked(business.send).mock.calls[1]).toEqual([m, original])
  expect(readMarkers()).toEqual([])
  expect(customer.capabilities).toHaveBeenCalled()
  expect(queryClient.getQueryData(['customer', 'A', 'profile'])).toBeUndefined()
})
it('reload loses body but APPLIED can recover against newer current state', async () => {
  const m = await lost()
  forgetBusinessBodies()
  expect(hasOriginalBody(m.key)).toBe(false)
  const historical = receipt(m)
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'APPLIED',
    receipt: historical,
  })
  vi.mocked(customer.profile).mockResolvedValue({
    ...profile,
    revision: 9,
    type: 'BUSINESS',
    businessAccess: { ...profile.businessAccess, state: 'RESTRICTED' },
  })
  expect(await recoverBusiness('A', m.key)).toEqual(historical)
  expect(readMarkers()).toEqual([])
  expect(business.send).toHaveBeenCalledTimes(1)
})
it('NOT_OBSERVED after reload keeps lock and cannot reconstruct a body or start another intention', async () => {
  const m = await lost()
  forgetBusinessBodies()
  expect(await recoverBusiness('A', m.key)).toBeNull()
  await expect(recoverBusiness('A', m.key, 'replay')).rejects.toThrow('memoria')
  await expect(startBusiness('A', accountId, intent)).rejects.toThrow(
    'pendiente',
  )
  expect(readMarkers()).toHaveLength(1)
  expect(business.send).toHaveBeenCalledTimes(1)
})
it.each(['CLOSED', 'REJECTED', 'APPLIED'] as const)(
  'explicit close inspects %s receipt, refreshes and never automatically resubmits',
  async (outcome) => {
    const m = await lost()
    forgetBusinessBodies()
    vi.mocked(business.attempt).mockResolvedValue({
      state: outcome,
      receipt: receipt(m, outcome),
    })
    expect((await recoverBusiness('A', m.key, 'close'))?.outcome).toBe(outcome)
    expect(business.attempt).toHaveBeenLastCalledWith(m, true)
    expect(readMarkers()).toEqual([])
    expect(business.send).toHaveBeenCalledTimes(1)
  },
)
it('lost close response retains marker until scoped GET, even after session changes', async () => {
  const m = await lost()
  vi.mocked(business.attempt).mockRejectedValueOnce(
    new ApiError(0, 'close lost'),
  )
  await expect(recoverBusiness('A', m.key, 'close')).rejects.toThrow()
  forgetBusinessBodies()
  await expect(recoverBusiness('B', m.key)).rejects.toThrow('identidad')
  await expect(startBusiness('B', accountId, intent)).rejects.toThrow(
    'pendiente',
  )
  expect(readMarkers()).toHaveLength(1)
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'CLOSED',
    receipt: receipt(m, 'CLOSED'),
  })
  await recoverBusiness('A', m.key)
  expect(readMarkers()).toEqual([])
})
it('late applied response after logout does not clear marker or update caches', async () => {
  let done!: (r: Receipt) => void
  vi.mocked(business.send).mockImplementation(
    () =>
      new Promise((resolve) => {
        done = resolve
      }),
  )
  const work = startBusiness('A', accountId, intent)
  const m = readMarkers()[0]
  forgetBusinessBodies()
  done(receipt(m))
  await expect(work).rejects.toThrow('sesión')
  expect(readMarkers()).toEqual([m])
  expect(customer.profile).not.toHaveBeenCalled()
})
it('double click preserves a single request and marker', async () => {
  let done!: (r: Receipt) => void
  vi.mocked(business.send).mockImplementation(
    () =>
      new Promise((resolve) => {
        done = resolve
      }),
  )
  const first = startBusiness('A', accountId, intent)
  await expect(startBusiness('A', accountId, intent)).rejects.toThrow(
    'pendiente',
  )
  done(receipt(readMarkers()[0]))
  await first
  expect(business.send).toHaveBeenCalledTimes(1)
})
it('unavailable tab lock or storage prevents sending', async () => {
  localStorage.setItem(storageKey, 'broken')
  await expect(startBusiness('A', accountId, intent)).rejects.toThrow(
    'marcador',
  )
  expect(business.send).not.toHaveBeenCalled()
  localStorage.clear()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: undefined,
  })
  await expect(startBusiness('A', accountId, intent)).rejects.toThrow(
    'navegador',
  )
  expect(business.send).not.toHaveBeenCalled()
})
it('429 honors Retry-After without fixed delay or automatic resend', async () => {
  const e = new ApiError(429, 'rate', 'BUSINESS_RATE_LIMITED')
  e.retryAfterMs = 12000
  vi.mocked(business.send).mockRejectedValueOnce(e)
  await expect(startBusiness('A', accountId, intent)).rejects.toThrow()
  const m = readMarkers()[0]
  await expect(recoverBusiness('A', m.key, 'replay')).rejects.toThrow(
    'Retry-After',
  )
  expect(business.send).toHaveBeenCalledTimes(1)
})
it('wrong receipt resource and stale revision keep uncertainty', async () => {
  const m = await lost()
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'APPLIED',
    receipt: { ...receipt(m), operation: 'DECIDE' },
  })
  await expect(recoverBusiness('A', m.key)).rejects.toThrow('incompatible')
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'APPLIED',
    receipt: {
      ...receipt(m),
      result: { ...receipt(m).result, accountRevision: 8 },
    },
  })
  await expect(recoverBusiness('A', m.key)).rejects.toThrow('vigente')
  expect(readMarkers()).toHaveLength(1)
})
it('APPLIED administrative rejection is distinct from REJECTED command and uses admin reads', async () => {
  vi.mocked(business.send).mockImplementation(async (m) => ({
    ...receipt(m),
    result: { ...receipt(m).result, applicationStatus: 'REJECTED' },
  }))
  const r = await startBusiness('admin', accountId, {
    operation: 'DECIDE',
    target: applicationId,
    body: {
      decision: 'REJECT',
      expectedAccountRevision: 1,
      expectedApplicationRevision: 1,
      publicReason: 'Datos incompletos',
      internalNote: 'Private admin',
    },
  })
  expect(r.outcome).toBe('APPLIED')
  expect(r.result.applicationStatus).toBe('REJECTED')
  expect(business.access).toHaveBeenCalledWith(accountId)
  expect(customer.profile).not.toHaveBeenCalled()
  expect(localStorage.getItem(storageKey)).not.toContain('Private')
})
it('downgrade receipt never substitutes current restricted profile', async () => {
  const marker: Marker = {
    actor: 'A',
    account: accountId,
    key: crypto.randomUUID(),
    operation: 'DOWNGRADE',
    target: accountId,
  }
  localStorage.setItem(storageKey, JSON.stringify([marker]))
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'APPLIED',
    receipt: receipt(marker),
  })
  vi.mocked(customer.profile).mockResolvedValue({
    ...profile,
    businessAccess: { ...profile.businessAccess, reapplicationBlocked: true },
  })
  await recoverBusiness('A', marker.key)
  expect(readMarkers()).toEqual([])
  expect(customer.profile).toHaveBeenCalled()
})
it('missing and unknown projection fields never permit new demand', () => {
  expect(hasBusinessContract({})).toBe(false)
  expect(
    hasBusinessContract({ ...profile, businessApplication: undefined }),
  ).toBe(false)
  expect(hasBusinessContract(profile)).toBe(true)
})

it('another SUPER_ADMIN cannot recover or bypass the initiating administrator after reload', async () => {
  vi.mocked(business.send).mockRejectedValue(new ApiError(0, 'Lost decision'))
  await expect(
    startBusiness('admin-A', accountId, {
      operation: 'DECIDE',
      target: applicationId,
      body: {
        decision: 'APPROVE',
        expectedAccountRevision: 1,
        expectedApplicationRevision: 1,
      },
    }),
  ).rejects.toThrow()
  const m = readMarkers()[0]
  forgetBusinessBodies()
  vi.mocked(business.attempt).mockClear()
  await expect(recoverBusiness('admin-B', m.key, 'close')).rejects.toThrow(
    'identidad',
  )
  await expect(
    startBusiness('admin-B', accountId, {
      operation: 'DECIDE',
      target: applicationId,
      body: {
        decision: 'APPROVE',
        expectedAccountRevision: 1,
        expectedApplicationRevision: 1,
      },
    }),
  ).rejects.toThrow('pendiente')
  expect(business.attempt).not.toHaveBeenCalled()
  expect(business.send).toHaveBeenCalledTimes(1)
  expect(readMarkers()).toEqual([m])
})
