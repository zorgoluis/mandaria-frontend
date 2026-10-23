import { expect, it } from 'vitest'
import { snapshotAddress, stopAddresses } from '../customer/stop-addresses'
import type { DirectPrequoteResponse } from '../customer/contract'

const conditions = {
  conditionsVersion: 1 as const,
  serviceType: 'LOCAL_DELIVERY' as const,
  stops: [
    { type: 'PICKUP' as const, sequence: 1, latitude: 17, longitude: -93 },
    { type: 'DROPOFF' as const, sequence: 2, latitude: 18, longitude: -94 },
  ],
  packages: [],
}
const read = (stopAddresses: unknown, index: number) =>
  snapshotAddress(
    {
      conditions,
      stopAddresses: stopAddresses as DirectPrequoteResponse['stopAddresses'],
    },
    index,
  )

it('sends only real address text, trimmed, by stop sequence', () => {
  expect(stopAddresses([' Origen 1 ', undefined])).toEqual([
    { sequence: 1, address: 'Origen 1' },
  ])
  expect(stopAddresses(['', '   '])).toEqual([])
  expect(stopAddresses(['a'.repeat(301), 'Destino'])).toEqual([
    { sequence: 2, address: 'Destino' },
  ])
})
it('reads the snapshot matching each stop sequence', () => {
  const value = [
    { sequence: 2, address: ' Destino ' },
    { sequence: 1, address: 'Origen' },
  ]
  expect(read(value, 0)).toBe('Origen')
  expect(read(value, 1)).toBe('Destino')
})
it.each([
  ['absent', undefined],
  ['null', null],
  ['not an array', { sequence: 1, address: 'Origen' }],
  ['empty text', [{ sequence: 1, address: '  ' }]],
  ['too long', [{ sequence: 1, address: 'a'.repeat(301) }]],
  ['not text', [{ sequence: 1, address: 12 }]],
  [
    'duplicated sequence',
    [
      { sequence: 1, address: 'A' },
      { sequence: 1, address: 'B' },
    ],
  ],
  ['other sequence', [{ sequence: 3, address: 'Otro' }]],
])('ignores a %s snapshot', (_, value) => {
  expect(read(value, 0)).toBeUndefined()
})
