import { beforeEach, expect, it, vi } from 'vitest'
import { deletion } from '../deletion/service'
import { snapshot, newer, known, message } from '../deletion/contract'
import {
  begin,
  accept,
  readMarkers,
  storageKey,
  confirmedRejection,
} from '../deletion/pending'
import { ApiError } from '../services/errors'
import { commandReceipt } from '../deletion/receipt'
import { actor, resource, caseId } from './verification-fixtures'
import { deletionFixture as fixture } from './deletion-fixtures'
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
it('administrative receipt GET binds resource/key and never sends body or mutation header', async () => {
  const receipt = {
    status: 'APPLIED',
    requestId: caseId,
    key: resource,
    recordedAt: fixture.receivedAt,
    result: { recorded: true },
  }
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(receipt)))
  expect(await deletion.commandReceipt(caseId, resource)).toEqual(receipt)
  expect(String(f.mock.calls[0][0])).toContain(
    '/admin/privacy/deletion-requests/' +
      caseId +
      '/commands/by-key/' +
      resource,
  )
  expect(f.mock.calls[0][1]).toMatchObject({ method: 'GET', cache: 'no-store' })
  expect(f.mock.calls[0][1]?.body).toBeUndefined()
  expect(f.mock.calls[0][1]?.headers).not.toHaveProperty('Idempotency-Key')
})
it.each([
  { recorded: true },
  { restoreBlocked: true, externalRestoreScriptsProtected: false },
  { ...fixture, revision: 0 },
])(
  'projects each historical receipt union independently from live state',
  (result) => {
    const raw = {
      status: 'APPLIED',
      requestId: caseId,
      key: resource,
      recordedAt: fixture.receivedAt,
      result,
    }
    const receipt = commandReceipt(raw, caseId, resource)
    expect(receipt.result).not.toHaveProperty('blockingReason')
    expect(receipt.result).not.toHaveProperty('pendingActions')
    expect(() => commandReceipt(raw, actor, resource)).toThrow()
    expect(() => commandReceipt(raw, caseId, actor)).toThrow()
  },
)
it('cancelled or unknown receipt cannot authorize a new decision', () => {
  for (const result of [
    { ...fixture, status: 'CANCELLED' },
    { recorded: false },
    { restoreBlocked: true, externalRestoreScriptsProtected: true },
  ])
    expect(() =>
      commandReceipt(
        {
          status: 'APPLIED',
          requestId: caseId,
          key: resource,
          recordedAt: fixture.receivedAt,
          result,
        },
        caseId,
        resource,
      ),
    ).toThrow()
})
it('sends exact create DTO and original UUID once; no automatic replay on lost response', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new TypeError('network'))
  const body = {
    scope: 'ACCOUNT' as const,
    password: 'synthetic-secret',
    acknowledgment: true as const,
  }
  await expect(deletion.create(resource, body)).rejects.toMatchObject({
    status: 0,
  })
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[0][0]).toBe(
    'http://localhost:3000/api/v1/privacy/deletion-requests',
  )
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    cache: 'no-store',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': resource },
  })
})
it('recovery and receipt are separate read endpoints, never another create', async () => {
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify(fixture)))
  await deletion.byKey(resource)
  await deletion.receipt(caseId)
  expect(String(f.mock.calls[0][0])).toContain(
    '/privacy/deletion-requests/by-key/' + resource,
  )
  expect(String(f.mock.calls[1][0])).toContain(
    '/privacy/deletion-requests/' + caseId + '/receipt',
  )
  expect(f.mock.calls.every((c) => c[1]?.method === 'GET')).toBe(true)
})
it('public token only in POST body, never auth header or URL', async () => {
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(fixture)))
  await deletion.privateStatus('synthetic-private-token')
  expect(String(f.mock.calls[0][0])).toMatch(
    /\/privacy\/deletion-access\/status$/,
  )
  expect(f.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    body: '{"token":"synthetic-private-token"}',
    cache: 'no-store',
  })
  expect(f.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization')
  expect(localStorage.length).toBe(0)
})
it.each([401, 403])(
  'does not refresh or retry rejected mutation %s',
  async (status) => {
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status }))
    await expect(
      deletion.command(resource, caseId, 'cancel', { expectedRevision: 3 }),
    ).rejects.toMatchObject({ status })
    expect(f).toHaveBeenCalledOnce()
  },
)
it('validates administrative acknowledgments before accepting outcome', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
  await expect(
    deletion.command(resource, caseId, 'retention-decisions', {}),
  ).rejects.toMatchObject({ status: 0 })
})
it('projects task and replacement internals out of private query data', async () => {
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: caseId,
            kind: 'ACTIVE_SERVICE:private-third-party',
            status: 'OPEN',
            dueAt: null,
            raw: 'secret',
          },
        ]),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            newCaseId: caseId,
            oldCaseId: resource,
            presenterId: actor,
            acceptedAt: null,
            storageKey: 'secret',
          },
        ]),
      ),
    )
  expect(await deletion.tasks(caseId)).toEqual([
    { id: caseId, kind: 'ACTIVE_SERVICE', status: 'OPEN', dueAt: null },
  ])
  expect(await deletion.replacements(caseId)).toEqual([
    { newCaseId: caseId, oldCaseId: resource, acceptedAt: null },
  ])
  expect(f).toHaveBeenCalledTimes(2)
})
it('projects away internals and preserves unknown states without actions', () => {
  const result = snapshot({
    ...fixture,
    status: 'FUTURE',
    bucket: 'private',
    thirdParty: 'hidden',
  })
  expect(result).not.toHaveProperty('bucket')
  expect(result).not.toHaveProperty('thirdParty')
  expect(known(result)).toBe(false)
  expect(() => snapshot({ ...fixture, deadline: { secret: true } })).toThrow()
})
it('older revision cannot replace latest state; server dates remain exact', () => {
  expect(newer(fixture, { ...fixture, revision: 2 })).toBe(fixture)
  expect(snapshot(fixture).deadline).toBe(fixture.deadline)
})
it('markers contain references only, isolated by account and environment; unknown result stays blocked', () => {
  const m = begin(actor, 'create')
  expect(storageKey).toContain('http://localhost:3000')
  expect(Object.keys(readMarkers()[0]).sort()).toEqual(['actor', 'key', 'op'])
  expect(() => begin(actor, 'create')).toThrow()
  expect(() => begin(resource, 'create')).not.toThrow()
  expect(confirmedRejection(new ApiError(0, 'timeout'))).toBe(false)
  expect(confirmedRejection(new ApiError(401, 'revoked'))).toBe(false)
  accept(m, caseId)
  expect(readMarkers().find((x) => x.actor === actor)).toMatchObject({
    accepted: true,
    id: caseId,
  })
})
it('rejects corrupted or secret-bearing markers, hides all raw errors', () => {
  expect(() =>
    readMarkers(
      JSON.stringify([
        { actor, key: resource, op: 'create', password: 'secret' },
      ]),
    ),
  ).toThrow()
  expect(() =>
    readMarkers(
      JSON.stringify([{ actor, key: resource, op: 'create', accepted: 'yes' }]),
    ),
  ).toThrow()
  expect(message(new ApiError(500, 'bucket secret stack'))).not.toMatch(
    /bucket|secret|stack/,
  )
})
