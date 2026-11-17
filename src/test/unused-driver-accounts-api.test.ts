import { beforeEach, expect, it, vi } from 'vitest'
import {
  unusedDriverAccounts,
  unusedAccountMessages,
} from '../independent-drivers/unused-accounts-service'
import { unusedAccount, unusedPage } from './unused-driver-accounts-fixtures'

const account = unusedAccount()
const input = {
  requestId: '44444444-4444-4444-8444-444444444444',
  expectedUpdatedAt: account.updatedAt,
  reason: 'Registro abandonado',
}
const receipt = {
  userId: account.userId,
  active: false,
  requestId: input.requestId,
  deactivatedAt: '2026-11-17T18:00:00.000Z',
}
beforeEach(() => sessionStorage.clear())

it('uses the account catalog with server filters and a cancellable read', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json(unusedPage()))
  const controller = new AbortController()
  await unusedDriverAccounts.list(
    {
      page: 2,
      pageSize: 20,
      search: 'correo+sintetico@example.invalid',
      accountStatus: 'DISABLED',
    },
    controller.signal,
  )
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.pathname).toBe('/api/v1/admin/independent-drivers/unused-accounts')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: '2',
    pageSize: '20',
    search: 'correo+sintetico@example.invalid',
    accountStatus: 'DISABLED',
  })
  controller.abort()
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
})

it('uses the user identifier and exact receipt contract for an individual deactivation', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(account))
    .mockResolvedValueOnce(Response.json(receipt))
  await unusedDriverAccounts.get(account.userId)
  await expect(
    unusedDriverAccounts.deactivate(account.userId, input),
  ).resolves.toEqual(receipt)
  expect(
    fetcher.mock.calls.map(([url]) => new URL(String(url)).pathname),
  ).toEqual([
    `/api/v1/admin/independent-drivers/unused-accounts/${account.userId}`,
    `/api/v1/admin/independent-drivers/unused-accounts/${account.userId}/deactivate`,
  ])
  expect(fetcher.mock.calls[1][1]?.method).toBe('POST')
  expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual(input)
})

it.each([401, 409, 503])(
  'never automatically repeats a rejected command (%s)',
  async (status) => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json(
          { code: 'ACCOUNT_STATE_CHANGED', message: 'private internal text' },
          { status },
        ),
      )
    await expect(
      unusedDriverAccounts.deactivate(account.userId, input),
    ).rejects.toMatchObject({ status })
    expect(fetcher).toHaveBeenCalledOnce()
  },
)

it('never replays a lost response', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('network'))
  await expect(
    unusedDriverAccounts.deactivate(account.userId, input),
  ).rejects.toMatchObject({ status: 0 })
  expect(fetcher).toHaveBeenCalledOnce()
})

it.each(Object.keys(unusedAccountMessages))(
  'translates %s without exposing raw backend text',
  async (code) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { code, message: 'private internal text' },
        { status: 409 },
      ),
    )
    await expect(
      unusedDriverAccounts.deactivate(account.userId, input),
    ).rejects.toMatchObject({ code, message: unusedAccountMessages[code] })
  },
)

it.each([
  { userId: 'another-user' },
  { requestId: 'another-request' },
  { active: true },
  { deactivatedAt: null },
])(
  'treats a mismatched or incomplete receipt as uncertain (%j)',
  async (change) => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ...receipt, ...change }))
    await expect(
      unusedDriverAccounts.deactivate(account.userId, input),
    ).rejects.toMatchObject({ status: 0 })
    expect(fetcher).toHaveBeenCalledOnce()
  },
)

it('reads changed activity without pretending the account still qualifies', async () => {
  const current = {
    ...account,
    hasServiceActivity: true,
    canDeactivate: false,
    blockReason: 'ACCOUNT_HAS_SERVICE_ACTIVITY',
  }
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(current))
  await expect(unusedDriverAccounts.get(account.userId)).resolves.toEqual(
    current,
  )
})
