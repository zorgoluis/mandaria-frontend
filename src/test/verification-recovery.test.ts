import { beforeEach, expect, it, vi } from 'vitest'
import {
  runVerification,
  readMarkers,
  reconcile,
} from '../verification/pending'
import { verification } from '../verification/service'
import { ApiError } from '../services/errors'
import {
  actor,
  resource,
  caseId,
  caseFixture,
  terms,
} from './verification-fixtures'
vi.mock('../verification/service', () => ({
  verification: {
    command: vi.fn(),
    attempt: vi.fn(),
    get: vi.fn(),
    acceptance: vi.fn(),
    onboarding: vi.fn(),
  },
}))
const refresh = vi.fn().mockResolvedValue(undefined)
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(verification.get).mockResolvedValue(caseFixture)
})
async function lost() {
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(
      actor,
      'SUBMIT',
      caseId,
      '/verification-cases/' + caseId + '/submit',
      { expectedVersion: 3, privateSynthetic: 'never-store' },
      refresh,
    ),
  ).rejects.toThrow()
  return readMarkers()[0]
}
it('lost response stores only actor/key/operation/target and survives reload without body', async () => {
  const m = await lost()
  expect(Object.keys(m).sort()).toEqual(['actor', 'key', 'operation', 'target'])
  expect(JSON.stringify(localStorage)).not.toContain('never-store')
  expect(readMarkers()).toEqual([m])
  await expect(
    runVerification(actor, 'SUBMIT', caseId, '/', {}, refresh),
  ).rejects.toThrow(/pendiente/)
  expect(verification.command).toHaveBeenCalledOnce()
})
it('APPLIED original receipt refreshes current state without replacing it', async () => {
  const m = await lost()
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    status: 'APPROVED',
    revision: 9,
  })
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { id: caseId, status: 'SUBMITTED', revision: 4 },
  })
  expect(await reconcile(m, actor, refresh)).toBe('APPLIED')
  expect(readMarkers()).toEqual([])
  expect(verification.get).toHaveBeenCalledWith(caseId)
  expect(refresh).toHaveBeenCalledOnce()
  expect(verification.command).toHaveBeenCalledOnce()
})
it('ABSENT remains uncertain, including after reload', async () => {
  const m = await lost()
  vi.mocked(verification.attempt).mockResolvedValue({ state: 'ABSENT' })
  await reconcile(m, actor, refresh)
  expect(readMarkers()).toEqual([m])
  expect(refresh).not.toHaveBeenCalled()
})
it('explicit close wins; new intent is prepared only by another user action', async () => {
  const m = await lost()
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'CLOSED_NO_EFFECTS',
  })
  await reconcile(m, actor, refresh, true)
  expect(verification.attempt).toHaveBeenCalledWith(m, true)
  expect(readMarkers()).toEqual([])
  expect(verification.command).toHaveBeenCalledOnce()
})
it('original wins versus close: APPLIED is read, not undone', async () => {
  const m = await lost()
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { id: caseId, status: 'SUBMITTED' },
  })
  await reconcile(m, actor, refresh, true)
  expect(verification.get).toHaveBeenCalledWith(caseId)
  expect(readMarkers()).toEqual([])
})
it('lost close response preserves marker and next action is GET', async () => {
  const m = await lost()
  vi.mocked(verification.attempt).mockRejectedValueOnce(new ApiError(0, 'lost'))
  await expect(reconcile(m, actor, refresh, true)).rejects.toThrow()
  expect(readMarkers()).toEqual([m])
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'CLOSED_NO_EFFECTS',
  })
  await reconcile(m, actor, refresh)
  expect(verification.attempt).toHaveBeenLastCalledWith(m, false)
})
it('changing account cannot inspect or bypass pending operation', async () => {
  const m = await lost()
  await expect(reconcile(m, resource, refresh)).rejects.toThrow(/iniciadora/)
  await expect(
    runVerification(resource, 'SUBMIT', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  expect(verification.attempt).not.toHaveBeenCalled()
  expect(readMarkers()).toEqual([m])
})
it('corrupt storage blocks commands instead of dropping markers', async () => {
  await lost()
  const key = localStorage.key(0)!
  localStorage.setItem(key, 'broken')
  await expect(
    runVerification(actor, 'SUBMIT', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  expect(verification.command).toHaveBeenCalledOnce()
})
it('double click sends once while original request is in flight', async () => {
  let resolve!: (v: { id: string; status: string }) => void
  vi.mocked(verification.command).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const pending = runVerification(
    actor,
    'SUBMIT',
    caseId,
    '/',
    { expectedVersion: 3 },
    refresh,
  )
  await expect(
    runVerification(actor, 'SUBMIT', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  resolve({ id: caseId, status: 'SUBMITTED' })
  await pending
  expect(verification.command).toHaveBeenCalledOnce()
})
it('definitive revision conflict refreshes without automatic replay', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(409, 'conflict', 'VERIFICATION_VERSION_CONFLICT'),
  )
  await expect(
    runVerification(actor, 'UPDATE_CASE', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  expect(refresh).toHaveBeenCalled()
  expect(readMarkers()).toEqual([])
  expect(verification.command).toHaveBeenCalledOnce()
})
it('closed key response retains marker until explicit consultation', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(409, 'closed', 'VERIFICATION_ATTEMPT_CLOSED'),
  )
  await expect(
    runVerification(actor, 'SUBMIT', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  expect(readMarkers()).toHaveLength(1)
})
it('terms receipt never automatically accepts the newer version', async () => {
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(
      actor,
      'ACCEPT_TERMS',
      'DRIVER',
      '/',
      { version: terms.version, hash: terms.hash },
      refresh,
    ),
  ).rejects.toThrow()
  const m = readMarkers()[0]
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { id: caseId, status: 'ACCEPTED', version: terms.version },
  })
  vi.mocked(verification.acceptance).mockResolvedValue({
    id: caseId,
    userId: actor,
    scope: 'DRIVER',
    providerId: null,
    contractuallyEffective: false,
    terms,
  })
  await reconcile(m, actor, refresh)
  expect(verification.acceptance).toHaveBeenCalledWith(caseId)
  expect(verification.command).toHaveBeenCalledOnce()
})
it('mismatched receipt keeps blocker', async () => {
  const m = await lost()
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { id: resource, status: 'SUBMITTED' },
  })
  await expect(reconcile(m, actor, refresh)).rejects.toThrow(/corresponde/)
  expect(readMarkers()).toEqual([m])
})

it('HTTP timeout does not prove no effect and preserves the original marker', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(408, 'timeout'),
  )
  await expect(
    runVerification(actor, 'SUBMIT', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  expect(readMarkers()).toHaveLength(1)
  expect(refresh).not.toHaveBeenCalled()
})
