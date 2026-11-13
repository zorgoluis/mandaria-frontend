import { beforeEach, expect, it, vi } from 'vitest'
import {
  offerZones,
  validateCommand,
  type ZonesCommand,
} from '../independent-zones/service'
import {
  decrypt,
  encrypt,
  makeIntent,
  replay,
} from '../independent-zones/intent'
const profile = '11111111-1111-4111-8111-111111111111',
  zone = '22222222-2222-4222-8222-222222222222'
const scope = { actor: 'admin', profileId: profile }
const body = (): ZonesCommand => ({
  requestId: crypto.randomUUID(),
  expectedRevision: '9007199254740993',
  zoneIds: [zone],
  reason: 'Motivo explícito',
})
beforeEach(() => vi.restoreAllMocks())
it.each([
  { reason: 'ab' },
  { reason: ' '.repeat(4) },
  { reason: 'x'.repeat(501) },
  { zoneIds: [zone, zone] },
  { zoneIds: ['invented'] },
  {
    zoneIds: Array.from(
      { length: 101 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    ),
  },
  { expectedRevision: '9223372036854775808' },
  { expectedRevision: '01' },
  { force: true },
])('rejects invalid input %j', (over) =>
  expect(() => validateCommand({ ...body(), ...over })).toThrow(),
)
it('allows explicit empty authorization list, 100 UUIDs and max revision string', () =>
  expect(() =>
    validateCommand({
      ...body(),
      zoneIds: [],
      expectedRevision: '9223372036854775807',
    }),
  ).not.toThrow())
it('uses profileId, requestId only in body and exact revision without exit protocol', async () => {
  const b = body()
  const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        revision: '9007199254740994',
        zoneIds: b.zoneIds,
        requestId: b.requestId,
      }),
    ),
  )
  await offerZones.put(profile, b)
  expect(String(f.mock.calls[0][0])).toContain(
    `/admin/independent-drivers/${profile}/offer-zones`,
  )
  const init = f.mock.calls[0][1]!
  expect(init.method).toBe('PUT')
  expect(JSON.parse(String(init.body))).toEqual(b)
  expect(new Headers(init.headers).has('Idempotency-Key')).toBe(false)
  expect(init.cache).toBe('no-store')
})
it('lost response replays identical encrypted body; rejects another account/profile/environment', async () => {
  const i = makeIntent(scope, body()),
    sealed = await encrypt(i),
    restored = await decrypt(sealed, scope)
  expect(sealed.key.extractable).toBe(false)
  expect(restored).toEqual(i)
  await expect(decrypt(sealed, { ...scope, actor: 'other' })).rejects.toThrow()
  await expect(decrypt(sealed, { ...scope, profileId: zone })).rejects.toThrow()
  const send = vi
    .spyOn(offerZones, 'put')
    .mockRejectedValueOnce(Error('timeout'))
    .mockResolvedValueOnce({
      revision: '9007199254740994',
      zoneIds: i.body.zoneIds,
      requestId: i.body.requestId,
    })
  await expect(replay(restored, scope)).rejects.toThrow('timeout')
  await replay(restored, scope)
  expect(send.mock.calls[0]).toEqual(send.mock.calls[1])
  await expect(
    replay({ ...i, environment: 'foreign' }, scope),
  ).rejects.toThrow()
})
it('never replays after the seven-day retention horizon', async () => {
  const i = makeIntent(scope, body())
  i.createdAt = new Date(Date.now() - 7 * 86400000).toISOString()
  const f = vi.spyOn(offerZones, 'put')
  await expect(replay(i, scope)).rejects.toThrow('retención')
  expect(f).not.toHaveBeenCalled()
})
it('GET matching zones carries no mutation proof; mismatched PUT receipt fails closed', async () => {
  const b = body()
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ revision: '9007199254740994', zoneIds: b.zoneIds }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          revision: '9007199254740994',
          zoneIds: b.zoneIds,
          requestId: crypto.randomUUID(),
        }),
      ),
    )
  expect(await offerZones.get(profile)).not.toHaveProperty('requestId')
  await expect(offerZones.put(profile, b)).rejects.toThrow()
})
it('accepts exactly 100 distinct authorized zone UUIDs', () => {
  expect(() =>
    validateCommand({
      ...body(),
      zoneIds: Array.from(
        { length: 100 },
        (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      ),
    }),
  ).not.toThrow()
})
