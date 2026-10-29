import { beforeEach, describe, it, expect, vi } from 'vitest'
import { api, apiOnce } from '../services/api'
import { independentAttempt, receipt } from '../driver-portal/attempt-api'
import {
  makeIntent,
  assertIntent,
  encrypt,
  decrypt,
  independentStore,
  startIndependent,
} from '../driver-portal/attempts'
import { driverPortal } from '../driver-portal/service'
import {
  ready,
  feed,
  validateCommand,
} from '../driver-portal/reception-service'
import { categories } from '../driver-category/service'
vi.mock('../services/api', () => ({
  api: vi.fn(),
  apiOnce: vi.fn(),
  sessionFence: () => () => {},
}))
const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const scope = { actor: id(1), dispatchId: id(2), operation: 'TAKE' as const }
const result = {
  operation: 'TAKE' as const,
  dispatchId: id(2),
  assignmentId: id(3),
  dispatchStatus: 'CLAIMED' as const,
  assignmentStatus: 'ACTIVE' as const,
  credits: { awardEntryId: id(4), refundEntryId: null, amount: -4 },
}
beforeEach(() => vi.restoreAllMocks())
describe('durable independent commands', () => {
  it('parses keyed receipt, never a legacy dispatch', () => {
    expect(receipt(result, 'TAKE', id(2))).toEqual(result)
    expect(() => receipt({ id: id(2) }, 'TAKE', id(2))).toThrow()
    expect(() => receipt(result, 'RELEASE', id(2))).toThrow()
  })
  it('persists before one POST with header key and exact body', async () => {
    const order: string[] = []
    vi.spyOn(independentStore, 'save').mockImplementation(async () => {
      order.push('save')
    })
    vi.mocked(apiOnce).mockImplementation(async () => {
      order.push('http')
      return result
    })
    await startIndependent(scope, { vehicleId: id(5) })
    expect(order).toEqual(['save', 'http'])
    expect(apiOnce).toHaveBeenCalledWith(
      `/driver/dispatches/${id(2)}/take`,
      'POST',
      { vehicleId: id(5) },
      undefined,
      { 'Idempotency-Key': expect.any(String) },
    )
  })
  it('storage failure prevents send', async () => {
    vi.mocked(apiOnce).mockClear()
    vi.spyOn(independentStore, 'save').mockRejectedValue(Error('duplicate'))
    await expect(
      startIndependent(scope, { vehicleId: id(5) }),
    ).rejects.toThrow()
    expect(apiOnce).not.toHaveBeenCalled()
  })
  it('encrypts body and rejects another actor/environment', async () => {
    const i = makeIntent(scope, { vehicleId: id(5) })
    expect(await decrypt(await encrypt(i), scope)).toEqual(i)
    expect(() => assertIntent(i, { ...scope, actor: id(6) })).toThrow()
    expect(() =>
      assertIntent({ ...i, environment: 'elsewhere' }, scope),
    ).toThrow()
  })
  it.each(['PENDING_OR_UNKNOWN', 'CLOSED_NO_EFFECTS', 'APPLIED'] as const)(
    'recovers %s without resending',
    async (state) => {
      vi.mocked(apiOnce)
        .mockClear()
        .mockResolvedValue({
          operation: 'TAKE',
          dispatchId: id(2),
          state,
          result: state === 'APPLIED' ? result : null,
          canPrepareNewAttempt: state === 'CLOSED_NO_EFFECTS',
        })
      expect((await independentAttempt(id(2), 'TAKE', id(8))).state).toBe(state)
      expect(apiOnce).toHaveBeenCalledTimes(1)
      expect(apiOnce).toHaveBeenCalledWith(
        `/driver/dispatches/${id(2)}/independent-attempt?operation=TAKE`,
        'GET',
        undefined,
        undefined,
        { 'Idempotency-Key': id(8) },
      )
    },
  )
  it('close has no body and preserves original key; release parses receipt after lost authority', async () => {
    vi.mocked(apiOnce).mockResolvedValue({
      operation: 'RELEASE',
      dispatchId: id(2),
      state: 'CLOSED_NO_EFFECTS',
      result: null,
      canPrepareNewAttempt: true,
    })
    await independentAttempt(id(2), 'RELEASE', id(8), true)
    expect(apiOnce).toHaveBeenLastCalledWith(
      `/driver/dispatches/${id(2)}/independent-attempt/close?operation=RELEASE`,
      'POST',
      undefined,
      undefined,
      { 'Idempotency-Key': id(8) },
    )
    vi.mocked(apiOnce).mockResolvedValue({
      ...result,
      operation: 'RELEASE',
      assignmentStatus: 'CANCELLED',
      dispatchStatus: 'OPEN',
    })
    await driverPortal.release(id(2), 'OTHER', 'Motivo explícito', id(8))
    expect(apiOnce).toHaveBeenLastCalledWith(
      `/driver/dispatches/${id(2)}/release`,
      'POST',
      { reason: 'OTHER', reasonDetail: 'Motivo explícito' },
      undefined,
      { 'Idempotency-Key': id(8) },
    )
  })
})
it.each(['OFF', 'PAUSED', 'PREVIEW', undefined])(
  'does not allow TAKE for %s',
  (state) =>
    expect(ready({ state, canAttemptTake: true } as never)).toBe(false),
)
it('reception preserves large revisions and validates explicit actions', () => {
  expect(() =>
    validateCommand({
      requestId: id(1),
      expectedRevision: '9007199254740993',
      action: 'STOP',
    }),
  ).not.toThrow()
  expect(() =>
    validateCommand({
      requestId: id(1),
      expectedRevision: '1',
      action: 'STOP',
      zoneId: id(2),
    }),
  ).toThrow()
  expect(() =>
    validateCommand({
      requestId: id(1),
      expectedRevision: '1',
      action: 'START',
      durationMinutes: 721,
    }),
  ).toThrow()
})
it('fetches paginated snapshots using opaque token only', async () => {
  vi.mocked(api)
    .mockClear()
    .mockResolvedValueOnce({
      items: [{ dispatchId: id(1) }],
      snapshotId: id(3),
      receptionRevision: '9007199254740993',
      nextPageToken: 'opaque token',
    })
    .mockResolvedValueOnce({
      items: [{ dispatchId: id(2) }],
      snapshotId: id(3),
      receptionRevision: '9007199254740993',
      nextPageToken: null,
    })
  expect((await feed()).items).toHaveLength(2)
  expect(api).toHaveBeenLastCalledWith(
    '/driver/offer-feed?pageToken=opaque%20token',
  )
})
it('category NONE is obtained from the dedicated authorized route, not profile404', async () => {
  const value = {
    contractVersion: '1.0.0',
    category: 'NONE',
    categoryRevision: '9007199254740993',
    providerId: null,
    independentMembershipState: null,
    independentApprovalStatus: null,
    resolutionRequired: false,
  }
  vi.mocked(api).mockResolvedValue(value)
  expect(await categories.get(id(2))).toEqual(value)
  expect(api).toHaveBeenLastCalledWith(
    `/admin/drivers/${id(2)}/category`,
    'GET',
    undefined,
    undefined,
  )
})
