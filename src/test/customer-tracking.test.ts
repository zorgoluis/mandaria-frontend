import { expect, it } from 'vitest'
import { retainCustomerSnapshot } from '../customer/tracking'
it('retains newer publicVersion with arbitrary precision and never compares across requests', () => {
  const old = { publicId: 'MDR-000001', publicVersion: '9007199254740994' }
  expect(
    retainCustomerSnapshot(old, { ...old, publicVersion: '9007199254740993' }),
  ).toBe(old)
  const other = { publicId: 'MDR-000002', publicVersion: '1' }
  expect(retainCustomerSnapshot(old, other)).toBe(other)
})
