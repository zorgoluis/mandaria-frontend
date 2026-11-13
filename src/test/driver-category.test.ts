import { describe, expect, it, vi } from 'vitest'
import {
  categoryBlock,
  canApprove,
  validCategory,
  type DriverCategory,
} from '../driver-category/contract'
import { categories, validateCommand } from '../driver-category/service'
import {
  makeIntent,
  assertIntent,
  encrypt,
  decrypt,
} from '../driver-category/intent'
const id = '11111111-1111-4111-8111-111111111111'
const base: DriverCategory = {
  contractVersion: '1.0.0',
  categoryRevision: '900719925474099312345',
  category: 'INDEPENDENT',
  providerId: null,
  independentMembershipState: 'CURRENT',
  independentApprovalStatus: 'APPROVED',
  resolutionRequired: false,
}
const command = {
  requestId: id,
  expectedRevision: base.categoryRevision,
  reason: 'Conciliación explícita sintética',
}
describe('exclusive category contract', () => {
  it.each(['FLEET', 'NONE', 'REVIEW_REQUIRED'] as const)(
    'blocks new independent takes for %s',
    (category) => {
      expect(
        categoryBlock({
          ...base,
          category,
          resolutionRequired: category === 'REVIEW_REQUIRED',
        }),
      ).toBeTruthy()
    },
  )
  it.each(['PENDING', 'SUSPENDED', 'REJECTED'] as const)(
    'approval %s never ends independent membership',
    (status) => {
      const c = { ...base, independentApprovalStatus: status }
      expect(categoryBlock(c)).toBeTruthy()
      expect(canApprove(c)).toBe(true)
      expect(c.category).toBe('INDEPENDENT')
    },
  )
  it('fails closed without canonical projection and does not infer from old approval', () => {
    expect(validCategory(undefined)).toBe(false)
    expect(canApprove(undefined)).toBe(false)
    expect(categoryBlock(undefined)).toMatch(/no confirmada/)
    expect(canApprove({ ...base, category: 'FLEET', providerId: id })).toBe(
      false,
    )
    expect(
      canApprove({
        ...base,
        category: 'REVIEW_REQUIRED',
        resolutionRequired: true,
        providerId: id,
      }),
    ).toBe(false)
    expect(
      canApprove({
        ...base,
        category: 'REVIEW_REQUIRED',
        resolutionRequired: true,
      }),
    ).toBe(false)
  })
  it('historical profile is not latent independent permission; revisions remain exact strings', () => {
    expect(
      categoryBlock({
        ...base,
        category: 'FLEET',
        providerId: id,
        independentMembershipState: 'HISTORICAL',
      }),
    ).toBeTruthy()
    expect(validCategory(base)).toBe(true)
    expect(base.categoryRevision).toBe('900719925474099312345')
  })
  it('validates command before transport', () => {
    expect(() => validateCommand(command)).not.toThrow()
    for (const c of [
      { ...command, reason: 'x' },
      { ...command, expectedRevision: '1e3' },
      { ...command, requestId: 'bad' },
    ])
      expect(() => validateCommand(c)).toThrow()
  })
  it('uses POST with requestId in body, preserves large revision and validates receipt', async () => {
    const receipt = {
      ...base,
      category: 'FLEET',
      providerId: id,
      independentMembershipState: 'HISTORICAL',
      requestId: id,
      reason: command.reason,
    }
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(receipt), { status: 200 }))
    try {
      expect(await categories.reconcile(id, command)).toEqual(receipt)
      expect(fetcher.mock.calls[0][0]).toContain(
        '/admin/drivers/' + id + '/category/reconcile-legacy-fleet',
      )
      expect(fetcher.mock.calls[0][1]?.method).toBe('POST')
      expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(
        command,
      )
    } finally {
      fetcher.mockRestore()
    }
  })
  it('isolates durable intent by account/environment/driver and encrypts exact replay body', async () => {
    const scope = { actor: id, driverId: id },
      i = makeIntent(scope, command)
    expect(() => assertIntent(i, { ...scope, actor: 'other' })).toThrow()
    expect(() =>
      assertIntent({ ...i, environment: 'https://other.invalid' }, scope),
    ).toThrow()
    expect(() => assertIntent(i, { ...scope, driverId: 'other' })).toThrow()
    expect((await decrypt(await encrypt(i), scope)).body).toEqual(command)
  })
})
