import { beforeEach, expect, it, vi } from 'vitest'
import { api, apiOnce } from '../services/api'
import { business } from '../customer-business/service'
import type { Marker, Operation } from '../customer-business/contract'
import { accountId, applicationId } from './business-fixtures'
vi.mock('../services/api', () => ({ api: vi.fn(), apiOnce: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
it.each([
  'SUBMIT',
  'WITHDRAW',
  'DOWNGRADE',
  'DECIDE',
  'REVOKE',
  'ALLOW_REAPPLICATION',
] as Operation[])('exact %s targets/query/close body', async (operation) => {
  const admin = ['DECIDE', 'REVOKE', 'ALLOW_REAPPLICATION'].includes(operation)
  const m: Marker = {
    actor: 'actor',
    account: accountId,
    key: 'original-key',
    operation,
    ...(operation === 'SUBMIT'
      ? {}
      : {
          target: ['WITHDRAW', 'DECIDE'].includes(operation)
            ? applicationId
            : accountId,
        }),
  }
  await business.attempt(m)
  const path = vi.mocked(api).mock.calls[0][0],
    url = new URL('https://synthetic.test' + path)
  expect(url.pathname).toBe(
    `${admin ? '/admin/customer-business-application-attempts' : '/customer/business-application-attempts'}/original-key`,
  )
  expect(Object.fromEntries(url.searchParams)).toEqual({
    operation,
    ...(m.target ? { target: m.target } : {}),
    ...(admin ? { customerAccountId: accountId } : {}),
  })
  await business.attempt(m, true)
  expect(apiOnce).toHaveBeenLastCalledWith(
    url.pathname + '/close',
    'POST',
    Object.fromEntries(url.searchParams),
  )
})
it.each([
  ['SUBMIT', '/customer/business-applications'],
  ['WITHDRAW', `/customer/business-applications/${applicationId}/withdraw`],
  ['DOWNGRADE', '/customer/profile/type'],
  ['DECIDE', `/admin/customer-business-applications/${applicationId}/decision`],
  ['REVOKE', `/admin/customer-business-access/${accountId}/revoke`],
  [
    'ALLOW_REAPPLICATION',
    `/admin/customer-business-access/${accountId}/allow-reapplication`,
  ],
] as [Operation, string][])(
  '%s preserves UUID key and body',
  async (operation, path) => {
    const m: Marker = {
      actor: 'A',
      account: accountId,
      key: crypto.randomUUID(),
      operation,
      target: ['WITHDRAW', 'DECIDE'].includes(operation)
        ? applicationId
        : accountId,
    }
    const body = { expectedAccountRevision: 3 }
    await business.send(m, body)
    expect(apiOnce).toHaveBeenCalledExactlyOnceWith(
      path,
      'POST',
      body,
      undefined,
      { 'Idempotency-Key': m.key },
    )
  },
)
it('pagination has supported filters and no invented totalPages', async () => {
  await business.list(true, 2, 'PENDING', accountId)
  expect(api).toHaveBeenLastCalledWith(
    `/admin/customer-business-applications?page=2&pageSize=20&status=PENDING&customerAccountId=${accountId}`,
  )
  await business.list(false, 1, 'WITHDRAWN', accountId)
  expect(api).toHaveBeenLastCalledWith(
    '/customer/business-applications?page=1&pageSize=20&status=WITHDRAWN',
  )
})
