import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthContext, type AuthState } from '../auth/context'
import { AttemptRecovery } from '../customer/AttemptRecovery'
import { readAttempt, refreshApplied } from '../customer/reconciliation'
import {
  readPending,
  forgetBodies,
  command,
  type Pending,
} from '../customer/pending'
import { consentFromContext } from '../customer/consent'
import type {
  ConsentContext,
  HumanAttemptResult,
} from '../customer/reconciliation-contract'
import { customer } from '../customer/service'
import { api, apiOnce } from '../services/api'
import { ApiError, normalizeError } from '../services/errors'
vi.mock('../services/api', () => ({
  api: vi.fn(),
  apiOnce: vi.fn(),
  publicApi: vi.fn(),
}))
const marker: Pending = {
  actor: 'A',
  kind: 'prequote',
  ref: 'new',
  key: '11111111-1111-4111-8111-111111111111',
}
const session = { user: { id: 'A', role: 'CUSTOMER' } } as AuthState
const pendingResult: HumanAttemptResult = {
  operation: 'PREQUOTE_CREATE',
  resourcePublicId: null,
  state: 'PENDING_OR_UNKNOWN',
  canPrepareNewAttempt: false,
  closureScope: 'RESOURCE_OR_POLICY_ONLY',
  routingEffects: 'NONE_STARTED',
  closedAt: null,
  result: null,
}
const closed: HumanAttemptResult = {
  ...pendingResult,
  state: 'CLOSED_NO_EFFECTS',
  canPrepareNewAttempt: true,
  closedAt: '2026-10-06T00:00:00Z',
}
function save(p = marker) {
  localStorage.setItem('mandaria.customer.pending.v1', JSON.stringify([p]))
}
function mount(p = marker, auth = session) {
  const done = vi.fn()
  const view = render(
    <AuthContext.Provider value={auth}>
      <AttemptRecovery pending={p} onRecovered={done} />
    </AuthContext.Provider>,
  )
  return { ...view, done }
}
const query = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }))
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  forgetBodies()
  save()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_n: string, _o: unknown, f: (l: object) => unknown) => f({}),
    },
  })
})
it.each([
  [
    'prequote',
    'new',
    undefined,
    '/customer/command-attempt?operation=PREQUOTE_CREATE',
  ],
  [
    'convert',
    'MPQ-000001',
    undefined,
    '/customer/command-attempt?operation=PREQUOTE_CONVERT&resourcePublicId=MPQ-000001',
  ],
  [
    'accept',
    'MDR-000001',
    'MQ-000001',
    '/customer/command-attempt?operation=QUOTE_ACCEPT&resourcePublicId=MQ-000001',
  ],
  [
    'policy',
    'integration',
    undefined,
    '/admin/integrations/integration/shipping-policy/attempt',
  ],
] as const)(
  'uses exact %s route/key without original body',
  async (kind, ref, related, path) => {
    const p = { ...marker, kind, ref, related }
    save(p)
    const operation = {
      prequote: 'PREQUOTE_CREATE',
      convert: 'PREQUOTE_CONVERT',
      accept: 'QUOTE_ACCEPT',
      policy: 'SHIPPING_POLICY',
    }[kind]
    vi.mocked(apiOnce).mockResolvedValue({
      ...pendingResult,
      operation,
      resourcePublicId: kind === 'prequote' ? null : (related ?? ref),
    })
    await readAttempt(p, 'A')
    expect(apiOnce).toHaveBeenCalledWith(path, 'GET', undefined, undefined, {
      'Idempotency-Key': p.key,
    })
    await readAttempt(p, 'A', true)
    const [base, q] = path.split('?')
    expect(apiOnce).toHaveBeenLastCalledWith(
      base + '/close' + (q ? '?' + q : ''),
      'POST',
      undefined,
      undefined,
      { 'Idempotency-Key': p.key },
    )
  },
)
it('reload with lost body offers query, explicit close and explicit prepare; never resends command', async () => {
  forgetBodies()
  vi.mocked(apiOnce)
    .mockResolvedValueOnce(pendingResult)
    .mockResolvedValue(closed)
  const { done } = mount()
  query()
  await screen.findByText(/El resultado sigue pendiente/)
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Cerrar intento técnico' }),
  )
  await screen.findByText(/Intento cerrado para/)
  expect(readPending()).toHaveLength(1)
  expect(done).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Preparar otra intención' }),
  )
  await waitFor(() => expect(readPending()).toHaveLength(0))
  expect(done).toHaveBeenCalledTimes(1)
  expect(vi.mocked(apiOnce).mock.calls.map((c) => c[1])).toEqual([
    'GET',
    'POST',
    'GET',
  ])
})
it('close response lost preserves marker; GET reconciles rather than another close or command', async () => {
  vi.mocked(apiOnce)
    .mockResolvedValueOnce(pendingResult)
    .mockRejectedValueOnce(new ApiError(0, 'lost'))
    .mockResolvedValue(closed)
  mount()
  query()
  await screen.findByRole('checkbox')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Cerrar intento técnico' }),
  )
  await screen.findByText(/No se confirmó el cierre/)
  expect(readPending()).toHaveLength(1)
  expect(
    screen.queryByRole('button', { name: 'Cerrar intento técnico' }),
  ).not.toBeInTheDocument()
  query()
  await screen.findByText(/Intento cerrado para/)
  expect(apiOnce).toHaveBeenCalledTimes(3)
})
it('does not offer new intention without canPrepareNewAttempt', async () => {
  vi.mocked(apiOnce).mockResolvedValue({
    ...closed,
    canPrepareNewAttempt: false,
  })
  mount()
  query()
  await screen.findByText(/Intento cerrado para/)
  expect(
    screen.queryByRole('button', { name: 'Preparar otra intención' }),
  ).not.toBeInTheDocument()
  expect(readPending()).toHaveLength(1)
})
it('another account cannot query/close nor clear the previous marker', async () => {
  mount(marker, { user: { id: 'B', role: 'SUPER_ADMIN' } } as AuthState)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  await expect(readAttempt(marker, 'B', true)).rejects.toThrow(/iniciadora/)
  expect(apiOnce).not.toHaveBeenCalled()
  expect(readPending()).toHaveLength(1)
})
it('old policy receipt may differ from current policy; refresh current without overwriting it', async () => {
  const p = { ...marker, kind: 'policy' as const, ref: 'integration' }
  save(p)
  const result: HumanAttemptResult = {
    ...pendingResult,
    operation: 'SHIPPING_POLICY',
    resourcePublicId: p.ref,
    state: 'APPLIED',
    result: { payer: 'REQUESTER', revision: 2 },
  }
  vi.mocked(apiOnce).mockResolvedValue(result)
  vi.mocked(api).mockResolvedValue({ payer: 'RECIPIENT', revision: 4 })
  const { done } = mount(p, {
    user: { id: 'A', role: 'SUPER_ADMIN' },
  } as AuthState)
  query()
  await waitFor(() => expect(done).toHaveBeenCalled())
  expect(api).toHaveBeenCalledWith(
    '/admin/integrations/integration/shipping-policy',
  )
  expect(readPending()).toHaveLength(0)
})
it('incoherent receipt cannot unlock', async () => {
  vi.mocked(apiOnce).mockResolvedValue({
    ...pendingResult,
    operation: 'QUOTE_ACCEPT',
  })
  mount()
  query()
  await screen.findByText(/No se pudo reconciliar/)
  expect(readPending()).toHaveLength(1)
})
it('COMMAND_ATTEMPT_CLOSED keeps the marker until receipt reconciliation', async () => {
  localStorage.clear()
  vi.mocked(apiOnce).mockRejectedValue(
    new ApiError(409, 'closed', 'COMMAND_ATTEMPT_CLOSED'),
  )
  await expect(
    command('A', 'prequote', 'new', '/customer/delivery-prequotes', {
      privateContact: 'never persist',
    }),
  ).rejects.toThrow()
  expect(readPending()).toHaveLength(1)
  expect(JSON.stringify(localStorage)).not.toContain('never persist')
  expect(
    normalizeError(409, { code: 'COMMAND_ATTEMPT_CLOSED' }).message,
  ).toMatch(/Consulta el recibo/)
})
it('APPLIED refresh failure preserves marker', async () => {
  vi.mocked(apiOnce).mockResolvedValue({
    ...pendingResult,
    state: 'APPLIED',
    result: {
      prequotePublicId: 'MPQ-000001',
      amount: '25.10',
      currency: 'MXN',
      expiresAt: '2099-01-01T00:00:00Z',
      shippingTerms: null,
    },
  })
  vi.mocked(api).mockRejectedValue(new ApiError(503, 'offline'))
  mount()
  query()
  await screen.findByText(/No se pudo reconciliar/)
  expect(readPending()).toHaveLength(1)
})
it('terminal current request is read, never replaced by historical acceptance', async () => {
  const p = {
    ...marker,
    kind: 'accept' as const,
    ref: 'MDR-000001',
    related: 'MQ-000001',
  }
  save(p)
  vi.mocked(api).mockImplementation(async (path) =>
    path.endsWith('consent-context')
      ? {
          deliveryRequestPublicId: p.ref,
          quote: { publicId: p.related },
          canPrepareConsent: false,
        }
      : { publicId: p.ref, status: 'DELIVERED' },
  )
  await expect(
    refreshApplied(p, {
      ...pendingResult,
      state: 'APPLIED',
      result: {
        deliveryRequestPublicId: p.ref,
        deliveryQuotePublicId: p.related,
        amount: '25.10',
        currency: 'MXN',
        expiresAt: '2026-01-01',
        acceptedAt: '2026-01-01',
        shippingTerms: null,
      },
    }),
  ).resolves.toBe(p.ref)
  expect(api).toHaveBeenCalledTimes(3)
  expect(apiOnce).not.toHaveBeenCalled()
})
const context: ConsentContext = {
  deliveryRequestPublicId: 'MDR-000001',
  prequote: null,
  quote: {
    publicId: 'MQ-000001',
    amount: '25.10',
    currency: 'MXN',
    expiresAt: '2099-01-01T00:00:00Z',
    status: 'OFFERED',
    acceptedAt: null,
  },
  shippingTerms: {
    payer: 'REQUESTER',
    method: 'CASH',
    dueAt: 'PICKUP',
    component: 'DELIVERY_FEE',
    termsVersion: 1,
    termsHash: 'b'.repeat(64),
  },
  canPrepareConsent: true,
  automaticAcceptance: false,
}
it('other device reads final context from MDR without local MPQ mapping', async () => {
  localStorage.clear()
  vi.mocked(api).mockResolvedValue(context)
  const value = await customer.consentContext('MDR-000001')
  const body = consentFromContext(value)
  expect(body.customerAuthorization).toMatchObject({
    quotePublicId: 'MQ-000001',
    amount: '25.10',
    expiresAt: context.quote!.expiresAt,
    shippingTermsHash: 'b'.repeat(64),
  })
  expect(apiOnce).not.toHaveBeenCalled()
  expect(localStorage.length).toBe(0)
})
it.each([
  { ...context, quote: null },
  { ...context, shippingTerms: null },
  { ...context, canPrepareConsent: false },
  {
    ...context,
    quote: { ...context.quote!, expiresAt: '2020-01-01T00:00:00Z' },
  },
])('incomplete/expired/terminal context does not prepare consent', (value) => {
  expect(() => consentFromContext(value)).toThrow()
  expect(apiOnce).not.toHaveBeenCalled()
})
it('double click shares a single pending query and never sends a command', async () => {
  let finish!: (v: HumanAttemptResult) => void
  vi.mocked(apiOnce).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  mount()
  const button = screen.getByRole('button', { name: 'Consultar resultado' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(apiOnce).toHaveBeenCalledTimes(1)
  finish(pendingResult)
  await screen.findByText(/El resultado sigue pendiente/)
  expect(readPending()).toHaveLength(1)
})
it('resolution wins close: APPLIED refreshes and unlocks without another resolution', async () => {
  vi.mocked(apiOnce)
    .mockResolvedValueOnce(pendingResult)
    .mockResolvedValueOnce({
      ...pendingResult,
      state: 'APPLIED',
      result: {
        prequotePublicId: 'MPQ-000001',
        amount: '25.10',
        currency: 'MXN',
        expiresAt: '2099-01-01T00:00:00Z',
        shippingTerms: null,
      },
    })
  vi.mocked(api).mockResolvedValue({
    publicId: 'MPQ-000001',
    deliveryRequestPublicId: null,
  })
  const { done } = mount()
  query()
  await screen.findByRole('checkbox')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Cerrar intento técnico' }),
  )
  await waitFor(() => expect(done).toHaveBeenCalledWith('MPQ-000001'))
  expect(readPending()).toHaveLength(0)
  expect(vi.mocked(apiOnce).mock.calls.map((c) => c[1])).toEqual([
    'GET',
    'POST',
  ])
})
it('reload after technical closure still requires explicit preparation', async () => {
  vi.mocked(apiOnce).mockResolvedValue(closed)
  const first = mount()
  query()
  await screen.findByText(/Intento cerrado para/)
  first.unmount()
  forgetBodies()
  mount()
  expect(screen.queryByText(/Intento cerrado para/)).not.toBeInTheDocument()
  query()
  await screen.findByText(/Intento cerrado para/)
  expect(readPending()).toHaveLength(1)
  expect(vi.mocked(apiOnce).mock.calls.every((c) => c[1] === 'GET')).toBe(true)
})
it('administrator switch cannot query another administrator receipt', async () => {
  const p = { ...marker, kind: 'policy' as const, ref: 'integration' }
  save(p)
  mount(p, { user: { id: 'B', role: 'SUPER_ADMIN' } } as AuthState)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(apiOnce).not.toHaveBeenCalled()
})
it('late receipt after unmount cannot clear marker', async () => {
  let finish!: (v: HumanAttemptResult) => void
  vi.mocked(apiOnce).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const first = mount()
  query()
  first.unmount()
  finish({
    ...pendingResult,
    state: 'APPLIED',
    result: {
      prequotePublicId: 'MPQ-000001',
      amount: '25.10',
      currency: 'MXN',
      expiresAt: '2099-01-01T00:00:00Z',
      shippingTerms: null,
    },
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(readPending()).toHaveLength(1)
  expect(api).not.toHaveBeenCalled()
  expect(first.done).not.toHaveBeenCalled()
})
