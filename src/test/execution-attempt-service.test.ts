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
