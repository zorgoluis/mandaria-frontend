import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { api, apiOnce } from '../services/api'
import { exits, commandPath, validateBody } from '../fleet-exit/service'
import { parse, revision } from '../fleet-exit/validation'
import {
  makeIntent,
  encryptIntent,
  decryptIntent,
  sendIntent,
  recoverIntent,
} from '../fleet-exit/attempts'
import {
  eid,
  exitScope,
  exitContext,
  exitDetail,
  exitReceipt,
} from './fleet-exit-fixture'
import { exitError } from '../fleet-exit/messages'
import { ApiError } from '../services/errors'
vi.mock('../services/api', () => ({ api: vi.fn(), apiOnce: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('crypto', webcrypto)
})
it.each([
  '-1',
  '01',
  '9223372036854775808',
  '1.0',
  '1e3',
  '',
  9007199254740992,
])('rejects revision %s', (v) => expect(revision(v)).toBe(false))
it.each(['0', '9007199254740993', '9223372036854775807'])(
  'keeps revision %s exact',
  (v) => expect(revision(v)).toBe(true),
)
it('adapts nullable affiliation/start/evaluation and completed history', () => {
  expect(parse('context', exitContext())).toEqual(exitContext())
  expect(
    parse('context', {
      ...exitContext(),
      affiliation: null,
      exit: {
        ...Object.fromEntries(
          Object.entries(exitDetail()).filter(([k]) => k !== 'notices'),
        ),
        status: 'COMPLETED',
        completedAt: '2026-10-24T13:00:00.000Z',
      },
    }),
  ).toBeDefined()
  expect(parse('detail', exitDetail())).toBeDefined()
  expect(() =>
    parse('context', {
      ...exitContext(),
      affiliation: { ...exitContext().affiliation, state: 'ENDED' },
    }),
  ).toThrow()
  expect(() =>
    parse('detail', { ...exitDetail(), revision: '9223372036854775808' }),
  ).toThrow()
  expect(() => parse('context', null)).toThrow()
})
it('provider privacy fails closed instead of using an independent dimension', async () => {
  vi.mocked(api).mockResolvedValue({
    ...exitContext(),
    independent: {
      profileState: 'APPROVED',
      canOperate: true,
      reasons: [],
      allowedZoneIds: [],
      selectedZoneId: null,
      requiresExplicitReceptionStart: true,
    },
  })
  await expect(exits.context(exitScope, eid.driver)).rejects.toThrow(
    /privacidad/,
  )
})
it('provider preserves scope and exact cursor filters; admin is not allowed START', async () => {
  vi.mocked(api).mockResolvedValue({
    items: [],
    nextPageToken: null,
    asOf: '2026-10-24T12:00:00.000Z',
  })
  await exits.list(exitScope, {
    providerId: eid.exit,
    driverId: eid.driver,
    status: 'PENDING',
    limit: 25,
    pageToken: 'opaque+/=',
  })
  const url = new URL(
    String(vi.mocked(api).mock.calls[0][0]),
    'http://local.test',
  )
  expect(Object.fromEntries(url.searchParams)).toEqual({
    providerId: eid.provider,
    driverId: eid.driver,
    status: 'PENDING',
    limit: '25',
    pageToken: 'opaque+/=',
  })
  expect(() =>
    commandPath({ ...exitScope, surface: 'admin' }, 'START', eid.affiliation),
  ).toThrow()
  expect(() =>
    commandPath(
      { ...exitScope, providerId: undefined },
      'START',
      eid.affiliation,
    ),
  ).toThrow()
})
it('START encrypts frozen body and replays original key, affiliation and route without exitId', async () => {
  const body = {
    expectedAffiliationRevision: '9007199254740993',
    reasonCode: 'PROVIDER_REMOVAL' as const,
  }
  const i = makeIntent(exitScope, 'START', eid.affiliation, body)
  const encrypted = await encryptIntent(i),
    restored = await decryptIntent(encrypted, exitScope)
  expect(encrypted.key.extractable).toBe(false)
  body.expectedAffiliationRevision = '8'
  vi.mocked(apiOnce).mockResolvedValue(exitReceipt(i.key))
  await sendIntent(restored, exitScope)
  await sendIntent(restored, exitScope)
  expect(vi.mocked(apiOnce).mock.calls[0]).toEqual(
    vi.mocked(apiOnce).mock.calls[1],
  )
  expect(vi.mocked(apiOnce).mock.calls[0][2]).toEqual({
    expectedAffiliationRevision: '9007199254740993',
    reasonCode: 'PROVIDER_REMOVAL',
  })
  expect(vi.mocked(apiOnce).mock.calls[0][4]).toEqual({
    'Idempotency-Key': i.key,
  })
  await expect(
    decryptIntent(encrypted, { ...exitScope, actor: 'another' }),
  ).rejects.toThrow()
  await expect(
    sendIntent(restored, { ...exitScope, providerId: eid.exit }),
  ).rejects.toThrow()
  await expect(
    sendIntent(
      { ...restored, environment: 'http://elsewhere.invalid' },
      exitScope,
    ),
  ).rejects.toThrow()
})
it('lookup and close use only original START/AFFILIATION resource; no new header', async () => {
  const i = makeIntent(exitScope, 'START', eid.affiliation, {
    expectedAffiliationRevision: '1',
    reasonCode: 'PROVIDER_REMOVAL',
  })
  const r = {
    operation: 'START' as const,
    resourceType: 'AFFILIATION' as const,
    resourceId: eid.affiliation,
  }
  vi.mocked(apiOnce).mockResolvedValue({
    schemaVersion: 1,
    key: i.key,
    ...r,
    status: 'CLOSED_NO_EFFECTS',
    receipt: null,
    redacted: false,
  })
  await recoverIntent(i, exitScope)
  await recoverIntent(i, exitScope, true)
  const url = new URL(
    String(vi.mocked(apiOnce).mock.calls[0][0]),
    'http://local.test',
  )
  expect(Object.fromEntries(url.searchParams)).toEqual(r)
  expect(vi.mocked(apiOnce).mock.calls[1]).toEqual([
    `/fleet-exit-attempts/${i.key}/close`,
    'POST',
    r,
  ])
})
it('accepts a redacted POST replay without fabricating private receipt fields', async () => {
  const r = {
    schemaVersion: 1,
    key: eid.key,
    operation: 'START',
    resourceType: 'AFFILIATION',
    resourceId: eid.affiliation,
    status: 'APPLIED',
    receipt: null,
    redacted: true,
  }
  vi.mocked(apiOnce).mockResolvedValue(r)
  expect(
    await exits.send(exitScope, 'START', eid.affiliation, eid.key, {
      expectedAffiliationRevision: '1',
      reasonCode: 'PROVIDER_REMOVAL',
    }),
  ).toEqual(r)
})
it('rejects extra command fields and wrong roles/recovery resource', async () => {
  expect(() =>
    validateBody('RECHECK', {
      expectedExitRevision: '1',
      force: true,
    } as never),
  ).toThrow()
  expect(() =>
    validateBody(
      'START',
      {
        expectedAffiliationRevision: '1',
        reasonCode: 'VOLUNTARY_EXIT',
      } as never,
      'provider',
    ),
  ).toThrow()
  await expect(
    exits.attempt(eid.key, {
      operation: 'START',
      resourceType: 'EXIT',
      resourceId: eid.exit,
    }),
  ).rejects.toThrow()
})
it.each([
  'FLEET_EXIT_DISABLED',
  'FLEET_EXIT_PENDING',
  'AFFILIATION_REVISION_CONFLICT',
  'EXIT_REVISION_CONFLICT',
  'AFFILIATION_ENDED',
  'IDEMPOTENCY_KEY_REUSED',
  'ATTEMPT_CLOSED',
  'RETRY_SAME_ATTEMPT',
  'ACCOUNT_CLOSING',
  'INVALID_CURSOR',
])('handles %s by code', (code) =>
  expect(
    exitError(new ApiError(409, 'private raw message', code)),
  ).not.toContain('private raw'),
)
it('does not claim every 404 is an old server', () => {
  expect(exitError(new ApiError(404, '', 'RESOURCE_NOT_FOUND'))).toContain(
    'cuenta',
  )
  expect(exitError(new ApiError(404, ''))).toContain('Ruta o recurso')
})

it('driver uses own routes and header key without provider query or requestId body', async () => {
  const scope = { actor: 'driver-own', surface: 'driver' as const }
  vi.mocked(api).mockResolvedValue(exitContext())
  vi.mocked(apiOnce).mockResolvedValue(exitReceipt())
  await exits.context(scope, '')
  const body = {
    expectedAffiliationRevision: '9007199254740993',
    reasonCode: 'VOLUNTARY_EXIT' as const,
  }
  await exits.send(scope, 'START', eid.affiliation, eid.key, body)
  expect(api).toHaveBeenCalledWith(
    '/driver/fleet-affiliation-context',
    'GET',
    undefined,
    undefined,
  )
  expect(apiOnce).toHaveBeenCalledWith(
    '/driver/fleet-affiliations/' + eid.affiliation + '/exit-requests',
    'POST',
    body,
    undefined,
    { 'Idempotency-Key': eid.key },
  )
  await expect(
    exits.send(scope, 'START', eid.affiliation, eid.key, {
      expectedAffiliationRevision: '1',
      reasonCode: 'PROVIDER_REMOVAL',
    }),
  ).rejects.toThrow()
  await expect(
    exits.send(exitScope, 'START', eid.affiliation, eid.key, {
      expectedAffiliationRevision: '1',
      reasonCode: 'VOLUNTARY_EXIT',
    }),
  ).rejects.toThrow()
  await expect(
    exits.list(scope, { providerId: eid.provider }),
  ).rejects.toThrow()
  const intent = makeIntent(scope, 'START', eid.affiliation, body)
  expect(intent.path).toBe(
    '/driver/fleet-affiliations/' + eid.affiliation + '/exit-requests',
  )
  expect(
    (await decryptIntent(await encryptIntent(intent), scope)).body,
  ).toEqual(body)
})
