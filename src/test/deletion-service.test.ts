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

it('disabled privacy workflow is unavailable, never evidence of local-test mode or completed deletion', () => {
  const text = message(
    new ApiError(503, 'private detail', 'PRIVACY_WORKFLOW_UNAVAILABLE'),
  )
  expect(text).toContain('La baja documental no está disponible')
  expect(text).toContain('Conserva el folio y los intentos pendientes')
  expect(text).not.toMatch(/prueba local|private detail|eliminación completada/)
})
import { commandReceipt } from '../deletion/receipt'
import { actor, resource, caseId } from './verification-fixtures'
import { deletionFixture as fixture } from './deletion-fixtures'
import {
  operationalFixture,
  operationalItem,
  restrictionTask,
} from './deletion-v2-fixtures'

it('V2 own and private status project operational fields without admin data', async () => {
  const f = vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          ...operationalFixture,
          restrictions: [restrictionTask],
          bucket: 'synthetic-hidden',
        }),
      ),
  )
  for (const data of [
    await deletion.get(caseId),
    await deletion.privateStatus('synthetic-private-test'),
  ]) {
    expect(data).toMatchObject({
      cleanupPolicy: 'OPERATIONAL_RECONCILIATION_V2',
      nextReviewAt: operationalFixture.nextReviewAt,
    })
    expect(data).not.toHaveProperty('restrictions')
    expect(data).not.toHaveProperty('bucket')
  }
  expect(f.mock.calls[1][1]?.body).toBe(
    JSON.stringify({ token: 'synthetic-private-test' }),
  )
})
it('V2 administrative projections preserve partial task target, safe gate and real review dates only', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            ...restrictionTask,
            kind: 'RESTRICTION_REVIEW:' + resource,
            token: 'hidden',
          },
        ]),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { ...operationalItem, bucket: 'hidden', key: 'hidden' },
        ]),
      ),
    )
  const tasks = await deletion.tasks(caseId),
    items = await deletion.items(caseId)
  expect(tasks[0]).toMatchObject({
    objectId: resource,
    ownerId: actor,
    restrictions: restrictionTask.restrictions,
  })
  expect(tasks[0]).not.toHaveProperty('token')
  expect(items[0]).toMatchObject({
    baselineAt: operationalItem.baselineAt,
    reviewStep: 1,
  })
  expect(items[0]).not.toHaveProperty('key')
  expect(items[0]).not.toHaveProperty('bucket')
})
it('V2 resolve recovery uses original GET; 404 neither retries POST nor removes uncertainty', async () => {
  const marker = begin(actor, 'resolve', caseId)
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('synthetic lost response'))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'APPLIED',
          requestId: caseId,
          key: marker.key,
          recordedAt: fixture.receivedAt,
          result: operationalFixture,
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'COMMAND_RECEIPT_UNAVAILABLE' }), {
        status: 404,
      }),
    )
  await expect(
    deletion.command(marker.key, caseId, 'resolve', {
      action: 'REVIEW_RESTRICTION',
      gateId: resource,
      gateDecision: 'RELEASE',
      expectedRevision: 3,
      reason: 'Synthetic reason',
      evidenceRef: resource,
    }),
  ).rejects.toThrow()
  expect((await deletion.commandReceipt(caseId, marker.key)).status).toBe(
    'APPLIED',
  )
  await expect(
    deletion.commandReceipt(caseId, marker.key),
  ).rejects.toMatchObject({ status: 404 })
  expect(f.mock.calls.map((c) => c[1]?.method)).toEqual(['POST', 'GET', 'GET'])
  expect(readMarkers()).toEqual([marker])
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
it('admin list never interprets array position as a minimum request revision', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify(
        Array.from({ length: 5 }, () => ({
          ...operationalFixture,
          revision: 1,
        })),
      ),
    ),
  )
  expect(await deletion.list()).toHaveLength(5)
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
  { ...fixture, status: 'CANCELLED', revision: 4 },
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
it('unknown results and private persistence envelopes are not an HTTP fallback', () => {
  for (const result of [
    { ...fixture, status: 'FUTURE_STATE' },
    {
      receiptVersion: 1,
      operation: 'RESOLVE',
      result: { ...fixture, status: 'CANCELLED' },
    },
    { receiptVersion: 2, operation: 'RESOLVE', result: fixture },
    'CANCELLED',
    null,
    [],
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
it('request status CANCELLED alone is never an applied administrative receipt', () => {
  const result = { ...fixture, status: 'CANCELLED' }
  for (const raw of [
    result,
    {
      status: 'CANCELLED',
      requestId: caseId,
      key: resource,
      recordedAt: fixture.receivedAt,
      result,
    },
  ])
    expect(() => commandReceipt(raw, caseId, resource)).toThrow()
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
