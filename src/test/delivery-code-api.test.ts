import { afterEach, expect, it, vi } from 'vitest'
import { customer } from '../customer/service'
afterEach(() => vi.restoreAllMocks())
it('private CUSTOMER code uses no-store GET with abort and no secret in URL', async () => {
  const code = '0' + '83729'
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({ publicId: 'MDR-SYNTHETIC', deliveryCode: code }),
        { status: 200 },
      ),
    )
  const controller = new AbortController()
  const value = await customer.deliveryCode('MDR-SYNTHETIC', controller.signal)
  expect(value.deliveryCode).toBe(code)
  expect(fetcher).toHaveBeenCalledOnce()
  const [url, options] = fetcher.mock.calls[0]
  expect(String(url)).toBe(
    'http://localhost:3000/api/v1/customer/delivery-requests/MDR-SYNTHETIC/delivery-code',
  )
  expect(String(url)).not.toContain(code)
  expect(options).toMatchObject({
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
  })
  expect(options?.body).toBeUndefined()
  controller.abort()
  expect(options?.signal?.aborted).toBe(true)
})
