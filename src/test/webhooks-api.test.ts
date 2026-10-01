import { afterEach, expect, it, vi } from 'vitest'
import { webhooks } from '../webhooks/service'
import { ApiError, normalizeError } from '../services/errors'
it('retains backend code and requestId without exposing internal messages', () => {
  const error = normalizeError(400, {
    code: 'VALIDATION_ERROR',
    requestId: 'synthetic-request-id',
    message: 'internal SQL or remote response',
  })
  expect(error.code).toBe('VALIDATION_ERROR')
  expect(error.requestId).toBe('synthetic-request-id')
  expect(error.message).not.toContain('internal')
  expect(normalizeError(500, { requestId: {} }).requestId).toBeNull()
})
afterEach(() => vi.restoreAllMocks())
it.each([401, 403, 500])(
  'generation makes exactly one request on HTTP %s',
  async (status) => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status }))
    await expect(webhooks.issue('client')).rejects.toBeInstanceOf(ApiError)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0][0])).toContain(
      '/admin/integrations/client/webhook/secret',
    )
  },
)
it('generation never retries a network failure', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new TypeError('network'))
  await expect(webhooks.issue('client')).rejects.toBeInstanceOf(ApiError)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('only 404 means no endpoint', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 404 }))
  expect(await webhooks.endpoint('client')).toBeNull()
  fetcher.mockResolvedValue(new Response('{}', { status: 403 }))
  await expect(webhooks.endpoint('client')).rejects.toBeInstanceOf(ApiError)
})
it('event query encodes exact filters and explicit client scope', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 200 }))
  await webhooks.events('client-id', {
    page: 2,
    externalReference: 'A&B',
    deliveryRequestPublicId: 'MDR-000101',
    transportState: 'PENDING',
  })
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.searchParams.get('integrationClientId')).toBe('client-id')
  expect(url.searchParams.get('externalReference')).toBe('A&B')
  expect(url.searchParams.get('page')).toBe('2')
})
