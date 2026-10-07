import { expect, it, vi } from 'vitest'
import { apiOnce } from '../services/api'
import { executionApi } from '../execution/service'
vi.mock('../services/api', () => ({ api: vi.fn(), apiOnce: vi.fn() }))
it.each([false, true])(
  'attempt transport close=%s uses original key only in header, no body',
  async (close) => {
    vi.mocked(apiOnce).mockResolvedValue({
      state: 'PENDING_OR_UNKNOWN',
      resolutionId: null,
      canStartNewAttempt: false,
    })
    await executionApi.attempt('dispatch', 'incident', 'synthetic-key', close)
    expect(apiOnce).toHaveBeenLastCalledWith(
      `/admin/dispatches/dispatch/custody-incidents/incident/resolution-attempt${close ? '/close' : ''}`,
      close ? 'POST' : 'GET',
      undefined,
      undefined,
      { 'Idempotency-Key': 'synthetic-key' },
    )
  },
)

it('old DRIVER receipt uses exact assignment, operation and original key, with no new write', async () => {
  await executionApi.driverAttempt(
    'dispatch',
    'assignment',
    'ADVANCE',
    'original-key',
  )
  expect(apiOnce).toHaveBeenLastCalledWith(
    '/driver/dispatches/dispatch/assignments/assignment/attempt?operation=ADVANCE',
    'GET',
    undefined,
    undefined,
    { 'Idempotency-Key': 'original-key' },
  )
})

it.each([false, true])(
  'provider historical transport close=%s preserves original provider/key and no body',
  async (close) => {
    await executionApi.providerAttempt(
      'dispatch',
      'provider-A',
      'original-key',
      close,
    )
    expect(apiOnce).toHaveBeenLastCalledWith(
      '/provider/dispatches/dispatch/execution-attempt' +
        (close ? '/close' : '') +
        '?providerId=provider-A',
      close ? 'POST' : 'GET',
      undefined,
      undefined,
      { 'Idempotency-Key': 'original-key' },
    )
  },
)
