import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto, createHash } from 'node:crypto'
import { api, apiOnce } from '../services/api'
import { assistance, commandPath, ownerOperations } from '../assistance/service'
import { commandRoutes, commandSchemas } from '../assistance/contract'
import {
  makeIntent,
  sendIntent,
  encryptIntent,
  decryptIntent,
  attachOriginalFile,
} from '../assistance/attempts'
import {
  hash,
  canonical,
  economicTerms,
  noObligationsTerms,
} from '../assistance/hashes'
import { validate } from '../assistance/form-model'
import { ids, scope } from './assistance-fixture'
vi.mock('../services/api', () => ({ api: vi.fn(), apiOnce: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('crypto', webcrypto)
})
it('owner is structurally denied every administrative command and collection', () => {
  for (const op of Object.keys(commandRoutes) as (keyof typeof commandRoutes)[])
    if (!ownerOperations.includes(op))
      expect(() => commandPath(scope, op, ids.case)).toThrow()
  expect(() => assistance.collection(scope, ids.case, 'parties')).toThrow()
  expect(() => assistance.proposal(scope, ids.case, ids.proposal)).toThrow()
  expect(api).not.toHaveBeenCalled()
})
it('exact controller paths and opaque history cursor are preserved', async () => {
  const admin = { ...scope, surface: 'admin' as const, providerId: undefined }
  expect(commandPath(admin, 'REVIEW', ids.case, ids.proposal)).toBe(
    `/admin/fleet-assistance-cases/${ids.case}/proposals/${ids.proposal}/reviews`,
  )
  expect(commandPath(admin, 'SEAL_EVIDENCE', ids.case, ids.evidence)).toBe(
    `/admin/fleet-assistance-cases/${ids.case}/evidence-uploads/${ids.evidence}/content`,
  )
  await assistance.collection(scope, ids.case, 'history', 'opaque+/=')
  expect(vi.mocked(api).mock.calls[0][0]).toContain('pageToken=opaque%2B%2F%3D')
  await assistance.attempt(ids.evidence, ids.case, 'SEAL_EVIDENCE', true)
  expect(api).toHaveBeenLastCalledWith(
    `/fleet-assistance-attempts/${ids.evidence}/close`,
    'POST',
    { caseId: ids.case, operation: 'SEAL_EVIDENCE' },
  )
})
it('frozen intention encrypts at rest, refuses different account and exact replay uses apiOnce', async () => {
  const body = { expectedCaseRevision: '3', text: 'Original', evidenceIds: [] }
  const i = makeIntent(scope, 'CONTRIBUTE', ids.case, body)
  body.text = 'Different'
  const encrypted = await encryptIntent(i)
  expect(new TextDecoder().decode(encrypted.data)).not.toContain('Original')
  expect(encrypted.key.extractable).toBe(false)
  expect(await decryptIntent(encrypted, scope)).toEqual(i)
  await expect(
    decryptIntent(encrypted, { ...scope, actor: 'other' }),
  ).rejects.toThrow()
  await sendIntent(i, scope)
  await sendIntent(i, scope)
  expect(vi.mocked(apiOnce).mock.calls[0]).toEqual(
    vi.mocked(apiOnce).mock.calls[1],
  )
  expect(vi.mocked(apiOnce).mock.calls[0][2]).toMatchObject({
    text: 'Original',
    expectedCaseRevision: '3',
  })
  await expect(sendIntent(i, { ...scope, actor: 'other' })).rejects.toThrow()
})
it('multipart retains original bytes/revision, never submits sanitized fields', async () => {
  const s = { ...scope, surface: 'admin' as const },
    i = makeIntent(
      s,
      'SEAL_EVIDENCE',
      ids.case,
      { expectedCaseRevision: '4' },
      ids.evidence,
    )
  i.file = { mime: 'image/png', bytes: btoa('synthetic') }
  await sendIntent(i, s)
  const body = vi.mocked(apiOnce).mock.calls[0][2] as FormData
  expect([...body.keys()]).toEqual(['expectedCaseRevision', 'file'])
  expect(body.get('expectedCaseRevision')).toBe('4')
})
it('persists only file fingerprints and requires identical reselected bytes after restart', async () => {
  const s = { ...scope, surface: 'admin' as const }
  const i = makeIntent(
    s,
    'SEAL_EVIDENCE',
    ids.case,
    { expectedCaseRevision: '9007199254740993' },
    ids.evidence,
  )
  i.file = { mime: 'image/png', bytes: btoa('synthetic') }
  i.fileMeta = {
    mime: 'image/png',
    bytes: 9,
    sha256: createHash('sha256').update('synthetic').digest('hex'),
  }
  const encrypted = await encryptIntent(i)
  const restored = await decryptIntent(encrypted, s)
  expect(restored.file).toBeUndefined()
  expect(restored.fileMeta).toEqual(i.fileMeta)
  await expect(sendIntent(restored, s)).rejects.toThrow('Contenido original')
  const file = new File(['synthetic'], 'original.png', { type: 'image/png' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new TextEncoder().encode('synthetic').buffer,
  })
  const attached = await attachOriginalFile(restored, file)
  expect(attached.key).toBe(i.key)
  expect(attached.body).toEqual(i.body)
  expect(attached.file).toEqual(i.file)
  const wrong = new File(['different'], 'original.png', { type: 'image/png' })
  Object.defineProperty(wrong, 'arrayBuffer', {
    value: async () => new TextEncoder().encode('different').buffer,
  })
  await expect(attachOriginalFile(restored, wrong)).rejects.toThrow('hash')
  await sendIntent(attached, s)
  expect(
    (vi.mocked(apiOnce).mock.calls[0][2] as FormData).get(
      'expectedCaseRevision',
    ),
  ).toBe('9007199254740993')
})
it('rejects an unknown administrative collection before transport', () => {
  expect(() =>
    assistance.collection(
      { ...scope, surface: 'admin' },
      ids.case,
      'movement-context' as never,
    ),
  ).toThrow('Colección no autorizada')
  expect(api).not.toHaveBeenCalled()
})
it('canonical terms match backend wire ordering, null and fixed money without floating point', async () => {
  const input = {
    z: 2,
    expectedAmount: '999999999999.9',
    amount: '25',
    a: { z: 0, a: null },
  }
  const expected =
    '{"a":{"a":null,"z":0},"amount":"25.00","expectedAmount":"999999999999.90","z":2}'
  expect(canonical(input)).toBe(expected)
  expect(await hash(input)).toBe(
    createHash('sha256').update(expected).digest('hex'),
  )
  const terms = noObligationsTerms(ids.assignment)
  expect(Object.keys(terms)).toEqual([
    'assignmentId',
    'concepts',
    'noPickup',
    'noCollection',
    'noAdvance',
    'noObligations',
  ])
  expect(
    economicTerms({
      id: ids.party,
      amount: '25.00',
      status: 'DECLARED',
      unknown: 'private',
    }),
  ).toEqual({ id: ids.party, amount: '25.00' })
})
it.each(['-1.00', '1.1', '1e2', 'NaN', '1000000000000.00'])(
  'rejects invalid exact money %s',
  (amount) => {
    expect(
      validate(commandSchemas.DECLARE_MOVEMENT.properties!.amount, amount),
    ).toBe(false)
  },
)
it('strict DTO rejects extra fields and distinguishes UNKNOWN/null', () => {
  const create = {
    caseId: ids.case,
    assignmentId: ids.assignment,
    reason: 'ACCESS_LOST',
    description: 'Solicitud sintética',
  }
  expect(validate(commandSchemas.CREATE, create)).toBe(true)
  expect(validate(commandSchemas.CREATE, { ...create, evidenceIds: [] })).toBe(
    false,
  )
  expect(
    validate(commandSchemas.RECORD_OBLIGATION.properties!.expectedAmount, null),
  ).toBe(true)
  expect(
    validate(
      commandSchemas.RECORD_OBLIGATION.properties!.expectedAmount,
      '0.00',
    ),
  ).toBe(true)
})
it.each(['WAIVER', 'COMPENSATION', 'LOSS'])(
  'freezes external %s exception terms without changing original obligation or converting to credits',
  async (exceptionType) => {
    const body = {
      expectedCaseRevision: '9007199254740993',
      assignmentId: ids.assignment,
      type: 'RECORD_EXCEPTION',
      occurredAt: '2026-10-23T12:00:00.000Z',
      reason: 'Decisión externa sintética',
      evidenceIds: [ids.evidence],
      confirmationIds: [ids.party],
      payload: {
        obligationId: ids.obligation,
        exceptionType,
        coveredAmount: '25.10',
        authorizationEvidenceId: ids.evidence,
        counterpartyConfirmationIds: [ids.party],
      },
    }
    expect(validate(commandSchemas.PROPOSE, body)).toBe(true)
    const admin = { ...scope, surface: 'admin' as const }
    const intent = makeIntent(admin, 'PROPOSE', ids.case, body)
    body.payload.coveredAmount = '50.00'
    await sendIntent(intent, admin)
    expect(apiOnce).toHaveBeenCalledTimes(1)
    expect(vi.mocked(apiOnce).mock.calls[0][2]).toMatchObject({
      expectedCaseRevision: '9007199254740993',
      payload: { coveredAmount: '25.10', obligationId: ids.obligation },
    })
  },
)
it('economic correction retains both original and replacement references in one proposal', async () => {
  const body = {
    expectedCaseRevision: '4',
    assignmentId: ids.assignment,
    type: 'CORRECT_ECONOMICS',
    occurredAt: '2026-10-23T12:00:00.000Z',
    reason: 'Corrección sintética revisable',
    evidenceIds: [ids.evidence],
    confirmationIds: [],
    payload: {
      targetType: 'OBLIGATION',
      targetId: ids.obligation,
      replacementId: ids.party,
      reverseAllocationIds: [ids.evidence],
      disputeId: ids.proposal,
    },
  }
  expect(validate(commandSchemas.PROPOSE, body)).toBe(true)
  const admin = { ...scope, surface: 'admin' as const }
  await sendIntent(makeIntent(admin, 'PROPOSE', ids.case, body), admin)
  expect(apiOnce).toHaveBeenCalledTimes(1)
  expect(vi.mocked(apiOnce).mock.calls[0][2]).toEqual(body)
})
