import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { fireEvent, render, screen } from '@testing-library/react'
import { api, apiOnce } from '../services/api'
import {
  referenceSections,
  parseReferences,
  referencePage,
  loadReferences,
} from '../assistance/admin-references'
import {
  bindReferences,
  referenceOptions,
} from '../assistance/admin-reference-bindings'
import {
  encryptIntent,
  decryptIntent,
  makeIntent,
  sendIntent,
} from '../assistance/attempts'
import { CommandForm } from '../assistance/forms'
import { Context } from '../assistance/command-context'
import { assistanceDetail, ids } from './assistance-fixture'
import { referenceCatalog } from './admin-references-fixture'
vi.mock('../services/api', () => ({ api: vi.fn(), apiOnce: vi.fn() }))
const scope = { actor: 'admin', surface: 'admin' as const }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('crypto', webcrypto)
})
it.each(referenceSections)(
  'validates exact envelope and items for %s',
  (section) => {
    const page = referenceCatalog()[section]
    expect(parseReferences(page, ids.case, section)).toEqual(page)
    for (const bad of [
      { ...page, commandsEnabled: 'true' },
      { ...page, caseRevision: 3 },
      { ...page, asOf: '2026-10-25' },
      { ...page, items: [{ id: 'invented' }] },
      { ...page, privateData: 'unexpected' },
    ])
      expect(() => parseReferences(bad, ids.case, section)).toThrow()
    expect(() => parseReferences(page, ids.party, section)).toThrow()
  },
)
it('preserves large revisions, nullable fields and decimal strings', () => {
  const page = {
    ...referenceCatalog().participations,
    caseRevision: '900719925474099312345',
  }
  expect(parseReferences(page, ids.case, 'participations').caseRevision).toBe(
    page.caseRevision,
  )
  const money = referenceCatalog()['shipping-declarations']
  expect(
    parseReferences(money, ids.case, 'shipping-declarations').items[0].amount,
  ).toBe('123456789012.34')
  expect(() =>
    parseReferences(
      { ...money, items: [{ ...money.items[0], amount: 123 }] },
      ids.case,
      'shipping-declarations',
    ),
  ).toThrow()
})
it('rejects provider, inherited filters and invalid limits without HTTP', async () => {
  await expect(
    referencePage({ actor: 'owner', surface: 'provider' }, ids.case, 'parties'),
  ).rejects.toThrow()
  for (const limit of [0, 101, 1.5, NaN])
    await expect(
      referencePage(scope, ids.case, 'parties', { limit }),
    ).rejects.toThrow()
  await expect(
    referencePage(scope, ids.case, 'parties', { providerId: 'x' } as never),
  ).rejects.toThrow()
  expect(api).not.toHaveBeenCalled()
})
it('loads all pages with exact cursor and deduplicates by reference id', async () => {
  const page = referenceCatalog().parties
  vi.mocked(api)
    .mockResolvedValueOnce({ ...page, nextPageToken: 'opaque+/=' })
    .mockResolvedValueOnce({
      ...page,
      items: [...page.items, { ...page.items[0], id: ids.evidence }],
    })
  expect((await loadReferences(scope, ids.case, 'parties')).items).toHaveLength(
    2,
  )
  expect(vi.mocked(api).mock.calls[1][0]).toContain('pageToken=opaque%2B%2F%3D')
  expect(vi.mocked(api).mock.calls[0][0]).not.toContain('providerId')
})
it.each(['caseRevision', 'materialRevision', 'asOf', 'commandsEnabled'])(
  'rejects mutable page drift in %s',
  (field) => {
    const p = referenceCatalog().parties
    vi.mocked(api)
      .mockResolvedValueOnce({ ...p, nextPageToken: 'next' })
      .mockResolvedValueOnce({
        ...p,
        [field]:
          field === 'commandsEnabled'
            ? false
            : field === 'asOf'
              ? '2026-10-26T00:00:00Z'
              : '4',
      })
    return expect(loadReferences(scope, ids.case, 'parties')).rejects.toThrow()
  },
)
it('invalid cursor does not publish partial results and a new read starts without it', async () => {
  const p = referenceCatalog().parties
  vi.mocked(api)
    .mockResolvedValueOnce({ ...p, nextPageToken: 'expired' })
    .mockRejectedValueOnce(Error('INVALID_CURSOR'))
    .mockResolvedValueOnce(p)
  await expect(loadReferences(scope, ids.case, 'parties')).rejects.toThrow(
    'INVALID_CURSOR',
  )
  await loadReferences(scope, ids.case, 'parties')
  expect(vi.mocked(api).mock.calls[2][0]).not.toContain('pageToken')
})
it('first obligation uses participation id, never assignment id', () => {
  const c = referenceCatalog(),
    d = assistanceDetail(true)
  expect(referenceOptions(c, {}, d).participationId[0].value).toBe(
    ids.obligation,
  )
  expect(() =>
    bindReferences(
      c,
      'RECORD_OBLIGATION',
      { participationId: ids.obligation },
      {},
      d,
    ),
  ).not.toThrow()
  expect(() =>
    bindReferences(
      c,
      'RECORD_OBLIGATION',
      { participationId: ids.assignment },
      {},
      d,
    ),
  ).toThrow()
})
it('stop copies exact channel only for an offered registration kind', () => {
  const c = referenceCatalog(),
    b = { kind: 'ORIGIN' } as Record<string, unknown>
  bindReferences(
    c,
    'REGISTER_PARTY',
    b,
    { stopReference: ids.dispatch },
    assistanceDetail(true),
  )
  expect(b.contactSourceRef).toBe('STOP:canonical')
  expect(() =>
    bindReferences(
      c,
      'REGISTER_PARTY',
      { kind: 'RECIPIENT' },
      { stopReference: ids.dispatch },
      assistanceDetail(true),
    ),
  ).toThrow()
})
it('contact uses offered method and same-party evidence; absence blocks', () => {
  const c = referenceCatalog(),
    d = assistanceDetail(true),
    value = {
      partyId: ids.party,
      method: 'REGISTERED_CHANNEL_CALLBACK',
      verificationNoteEvidenceId: ids.evidence,
    }
  d.collections!.evidence = {
    items: [
      { id: ids.evidence, kind: 'VERIFIED_CONTACT_NOTE', status: 'AVAILABLE' },
    ],
    asOf: c.parties.asOf,
    nextPageToken: null,
  }
  expect(() =>
    bindReferences(c, 'VERIFY_IDENTITY', { ...value }, value, d),
  ).toThrow()
  const b = { ...value } as Record<string, unknown>
  bindReferences(c, 'VERIFY_IDENTITY', b, value, d, {
    [`${ids.case}:${ids.evidence}`]: ids.party,
  })
  expect(b.contactSourceRef).toBe('USER:canonical')
  d.collections!.evidence.items[0].sourceRef =
    c['evidence-sources'].items[0].sourceRef
  expect(() =>
    bindReferences(c, 'VERIFY_IDENTITY', { ...value }, value, d),
  ).not.toThrow()
  c['evidence-sources'].items[0].partyId = ids.assignment
  expect(() =>
    bindReferences(c, 'VERIFY_IDENTITY', { ...value }, value, d),
  ).toThrow()
  c['evidence-sources'].items[0].partyId = ids.party
  expect(() =>
    bindReferences(
      c,
      'VERIFY_IDENTITY',
      { ...value, method: 'AUTHENTICATED_SELF' },
      value,
      d,
    ),
  ).toThrow()
  c.parties.items[0].contactSourceRef = null
  expect(() =>
    bindReferences(c, 'VERIFY_IDENTITY', { ...value }, value, d),
  ).toThrow()
})
it('evidence copies server hash, filters other party and omits UI metadata', () => {
  const c = referenceCatalog(),
    value = {
      kind: 'VERIFIED_CONTACT_NOTE',
      evidenceReference: 'opaque:note',
      referenceParty: ids.party,
    },
    b = { ...value }
  bindReferences(c, 'RECORD_EVIDENCE', b, value, assistanceDetail(true))
  expect(b).toEqual({
    kind: value.kind,
    sourceRef: c['evidence-sources'].items[0].sourceRef,
  })
  expect(
    referenceOptions(
      c,
      { ...value, referenceParty: ids.assignment },
      assistanceDetail(true),
    ).evidenceReference,
  ).toEqual([])
})
it('shipping copies original values, validates receiver and does not credit', () => {
  const c = referenceCatalog(),
    value = {
      sourceKind: 'SHIPPING_DECLARATION',
      shippingReference: ids.dispatch,
      toPartyId: ids.party,
    },
    b = { ...value } as Record<string, unknown>
  bindReferences(c, 'DECLARE_MOVEMENT', b, value, assistanceDetail(true))
  expect(b).toMatchObject({
    sourceRef: ids.assignment,
    amount: '123456789012.34',
    currency: 'MXN',
    occurredAt: c['shipping-declarations'].items[0].occurredAt,
    declaredConcepts: ['SHIPPING_FEE'],
  })
  expect(b).not.toHaveProperty('status')
  expect(b).not.toHaveProperty('shippingReference')
  expect(() =>
    bindReferences(
      c,
      'DECLARE_MOVEMENT',
      { ...b, toPartyId: ids.evidence },
      value,
      assistanceDetail(true),
    ),
  ).toThrow()
})
it('session expiry and original release identity are checked without applying proposals', () => {
  const c = referenceCatalog(),
    d = assistanceDetail(true)
  expect(referenceOptions(c, {}, d).existingReceiptId[0].value).toBe(
    ids.dispatch,
  )
  expect(() =>
    bindReferences(
      c,
      'PROPOSE',
      {
        type: 'ASSISTED_RELEASE',
        payload: {
          proofSource: 'EXISTING_RELEASE',
          existingReceiptId: 'opaque:release',
        },
      },
      {},
      d,
    ),
  ).toThrow()
  c['recovery-sessions'].items[0].expiresAt = '2000-01-01T00:00:00Z'
  expect(referenceOptions(c, {}, d).newSessionId).toEqual([])
  expect(() =>
    bindReferences(
      c,
      'PROPOSE',
      { type: 'ACCESS_RECOVERED', payload: { newSessionId: ids.proposal } },
      {},
      d,
    ),
  ).toThrow()
})
it('flag off and stale revision block new mutations', () => {
  const c = referenceCatalog(),
    d = assistanceDetail(true)
  c.parties.commandsEnabled = false
  expect(() => bindReferences(c, 'CONTRIBUTE', {}, {}, d)).toThrow()
  c.parties.commandsEnabled = true
  c.parties.caseRevision = '4'
  expect(() => bindReferences(c, 'CONTRIBUTE', {}, {}, d)).toThrow()
})
it('private body is memory-only; restart keeps identity but forbids replay', async () => {
  const body = {
      type: 'ACCESS_RECOVERED',
      expectedCaseRevision: '9007199254740993',
      payload: { newSessionId: ids.proposal },
    },
    i = makeIntent(scope, 'PROPOSE', ids.case, body)
  const restored = await decryptIntent(await encryptIntent(i), scope)
  expect(restored.key).toBe(i.key)
  expect(restored.body).toEqual({})
  expect(restored.recoveryOnly).toBe(true)
  await expect(sendIntent(restored, scope)).rejects.toThrow('Cuerpo privado')
  await sendIntent(i, scope)
  await sendIntent(i, scope)
  expect(vi.mocked(apiOnce).mock.calls[0]).toEqual(
    vi.mocked(apiOnce).mock.calls[1],
  )
  await expect(
    decryptIntent(await encryptIntent(i), { ...scope, actor: 'other' }),
  ).rejects.toThrow()
})
it('renders canonical source selectors and disables commands with flag off', () => {
  const c = referenceCatalog()
  c.parties.commandsEnabled = false
  render(
    <Context.Provider
      value={{ blocked: false, deny: vi.fn(), prepare: vi.fn() }}
    >
      <CommandForm
        operation="RECORD_EVIDENCE"
        detail={assistanceDetail(true)}
        admin
        administrativeReferences={c}
      />
    </Context.Provider>,
  )
  fireEvent.change(screen.getByLabelText('Tipo'), {
    target: { value: 'VERIFIED_CONTACT_NOTE' },
  })
  expect(
    screen.getByLabelText('Parte de la nota de verificación'),
  ).toBeInTheDocument()
  expect(
    screen.getByLabelText('Fuente canónica de evidencia'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Revisar intención' }),
  ).toBeDisabled()
})
it('UNKNOWN inventory does not require a numeric amount in the human form', () => {
  render(
    <Context.Provider
      value={{ blocked: false, deny: vi.fn(), prepare: vi.fn() }}
    >
      <CommandForm
        operation="RECORD_OBLIGATION"
        detail={assistanceDetail(true)}
        admin
        administrativeReferences={referenceCatalog()}
      />
    </Context.Provider>,
  )
  fireEvent.change(screen.getByLabelText('Conocimiento'), {
    target: { value: 'UNKNOWN' },
  })
  expect(
    screen.queryByLabelText('Importe esperado MXN'),
  ).not.toBeInTheDocument()
})
