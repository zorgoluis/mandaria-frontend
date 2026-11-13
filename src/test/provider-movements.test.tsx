import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Context } from '../assistance/command-context'
import { ProviderMovements } from '../assistance/movements'
import {
  declarationBody,
  exactPositiveMoney,
  optionLabel,
  validMovementContext,
} from '../assistance/movement-model'
import { assistance } from '../assistance/service'
import { ApiError } from '../services/errors'
import { ids, scope, assistanceDetail } from './assistance-fixture'
import type { MovementContext } from '../assistance/types'
vi.mock('../assistance/service', () => ({
  assistance: { movementContext: vi.fn() },
}))
const prepare = vi.fn(),
  deny = vi.fn()
function fixture(): MovementContext {
  return {
    schemaVersion: 1,
    caseRevision: '9007199254740993',
    asOf: '2026-10-24T00:00:00.000Z',
    parties: [
      { partyId: ids.party, kind: 'PROVIDER', label: null, isOwn: true },
      { partyId: ids.evidence, kind: 'RECIPIENT', label: null, isOwn: false },
    ],
    declarationOptions: [
      {
        obligationId: ids.obligation,
        fromPartyId: ids.party,
        toPartyId: ids.evidence,
        beneficiaryPartyId: ids.evidence,
        concept: 'GOODS',
        currency: 'MXN',
      },
    ],
    capabilities: {
      canDeclareMovement: true,
      declareMovementReason: null,
      canReverseMovement: false,
      reverseMovementReason: 'MOVEMENT_ADMIN_REVIEW_REQUIRED',
    },
    movements: [
      {
        id: ids.proposal,
        fromPartyId: ids.party,
        toPartyId: ids.evidence,
        beneficiaryPartyId: ids.evidence,
        declaredConcepts: ['GOODS'],
        amount: '25.10',
        currency: 'MXN',
        occurredAt: '2026-10-23T13:00:00.000Z',
        recordedAt: '2026-10-23T14:00:00.000Z',
        status: 'DECLARED',
        canDispute: true,
        disputeReason: null,
        canReverse: false,
        reverseReason: 'MOVEMENT_ADMIN_REVIEW_REQUIRED',
      },
    ],
    nextPageToken: null,
  }
}
function mount(context: MovementContext | null = fixture()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const detail = { ...assistanceDetail(), movementContext: context }
  return render(
    <QueryClientProvider client={client}>
      <Context.Provider value={{ prepare, deny, blocked: false }}>
        <ProviderMovements scope={scope} detail={detail} />
      </Context.Provider>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(assistance.movementContext).mockResolvedValue(fixture())
})
it('accepts null labels and additive fields, rejects malformed and unsafe capabilities', () => {
  expect(validMovementContext(fixture())).toBe(true)
  expect(validMovementContext({ ...fixture(), added: 'ignored' })).toBe(true)
  expect(validMovementContext(null)).toBe(false)
  expect(
    validMovementContext({
      ...fixture(),
      capabilities: { canDeclareMovement: true },
    }),
  ).toBe(false)
  expect(
    validMovementContext({
      ...fixture(),
      caseRevision: Number.MAX_SAFE_INTEGER,
    }),
  ).toBe(false)
  expect(validMovementContext({ ...fixture(), schemaVersion: 2 })).toBe(false)
})
it.each([
  ['25,1', '25.10'],
  ['00025.10', '25.10'],
  ['999999999999.99', '999999999999.99'],
  ['1', '1.00'],
])('normalizes exact money %s without float', (input, expected) =>
  expect(exactPositiveMoney(input)).toBe(expected),
)
it.each([
  '0',
  '0.00',
  '-1.00',
  '1e3',
  '1.001',
  '1,000.00',
  '1000000000000.00',
  'NaN',
])('rejects invalid money %s', (input) =>
  expect(() => exactPositiveMoney(input)).toThrow(),
)
it('rejects arbitrary combinations, future/pre-segment dates and ambiguous counterparts', () => {
  const c = fixture(),
    o = c.declarationOptions[0]
  expect(() =>
    declarationBody(
      c,
      { ...o, toPartyId: ids.dispatch },
      '1',
      '2026-10-23T13:00:00Z',
      '2026-10-23T12:00:00Z',
    ),
  ).toThrow()
  expect(() =>
    declarationBody(c, o, '1', '2099-01-01T00:00:00Z', '2026-10-23T12:00:00Z'),
  ).toThrow()
  expect(() =>
    declarationBody(c, o, '1', '2026-10-22T00:00:00Z', '2026-10-23T12:00:00Z'),
  ).toThrow()
  c.parties.push({
    ...c.parties[1],
    partyId: ids.dispatch,
    label: 'Private internal name',
  })
  expect(optionLabel(o, c)).toBeNull()
})
it('absent context stays readable without trying DRIVER/admin or granting commands', () => {
  mount(null)
  expect(screen.getByText(/Este backend no ofrece contexto/)).toBeVisible()
  expect(assistance.movementContext).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('button', { name: 'Revisar declaración' }),
  ).not.toBeInTheDocument()
})
it.each([
  'ASSISTANCE_DISABLED',
  'CASE_CLOSED',
  'NO_AUTHORIZED_MOVEMENT_REFERENCES',
])('shows unavailable reason %s while retaining reads', (reason) => {
  const c = fixture()
  c.capabilities.canDeclareMovement = false
  c.capabilities.declareMovementReason = reason
  mount(c)
  expect(
    screen.queryByLabelText('Combinación autorizada'),
  ).not.toBeInTheDocument()
  expect(
    screen.getByText('Declaración registrada, pendiente de acreditación'),
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Actualizar movimientos' }),
  ).toBeEnabled()
})
it('blocks ambiguous null-label parties instead of guessing names', () => {
  const c = fixture()
  c.parties.push({ ...c.parties[1], partyId: ids.dispatch })
  mount(c)
  expect(
    screen.getByText(/no permiten distinguir la contraparte/),
  ).toBeVisible()
  expect(
    screen.queryByLabelText('Combinación autorizada'),
  ).not.toBeInTheDocument()
})
it('prepares one complete option with exact money, case revision and no forbidden fields', async () => {
  mount()
  fireEvent.change(screen.getByLabelText('Combinación autorizada'), {
    target: { value: '0' },
  })
  fireEvent.change(screen.getByLabelText('Importe declarado MXN'), {
    target: { value: '25,10' },
  })
  fireEvent.change(screen.getByLabelText('Fecha física del movimiento (UTC)'), {
    target: { value: '2026-10-23T13:00' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar declaración' }))
  expect(
    await screen.findByLabelText('Vista previa de declaración'),
  ).toHaveTextContent('25.10 MXN')
  expect(prepare).not.toHaveBeenCalled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar declaración revisada' }),
  )
  const [op, caseId, body] = prepare.mock.calls[0]
  expect(op).toBe('DECLARE_MOVEMENT')
  expect(caseId).toBe(ids.case)
  expect(body).toEqual({
    expectedCaseRevision: '9007199254740993',
    physicalMovementId: expect.any(String),
    sourceKind: 'DECLARATION',
    fromPartyId: ids.party,
    toPartyId: ids.evidence,
    beneficiaryPartyId: ids.evidence,
    declaredConcepts: ['GOODS'],
    amount: '25.10',
    currency: 'MXN',
    occurredAt: '2026-10-23T13:00:00.000Z',
  })
})
it.each(['DECLARED', 'RETRACTED'] as const)(
  'disputes projected %s movement.id without reversal or an obligation',
  (status) => {
    const c = fixture()
    c.movements[0].status = status
    mount(c)
    fireEvent.change(
      screen.getByLabelText('Motivo de disputa del movimiento'),
      { target: { value: 'Revisión sintética del importe' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Revisar disputa del movimiento' }),
    )
    expect(prepare).toHaveBeenCalledWith('DISPUTE', ids.case, {
      expectedCaseRevision: c.caseRevision,
      movementId: ids.proposal,
      reason: 'Revisión sintética del importe',
    })
    expect(
      screen.queryByRole('button', { name: /Revertir/ }),
    ).not.toBeInTheDocument()
  },
)
it('continues the initial opaque cursor by movement-context, deduplicates and uses fresh capabilities', async () => {
  const c = fixture()
  c.nextPageToken = 'opaque+/='
  const next = fixture()
  next.capabilities.canDeclareMovement = false
  next.capabilities.declareMovementReason = 'CASE_CLOSED'
  vi.mocked(assistance.movementContext).mockResolvedValue(next)
  mount(c)
  fireEvent.click(
    screen.getByRole('button', { name: 'Cargar más movimientos' }),
  )
  await waitFor(() =>
    expect(assistance.movementContext).toHaveBeenCalledWith(
      scope,
      ids.case,
      { limit: 25, pageToken: 'opaque+/=' },
      expect.any(AbortSignal),
    ),
  )
  await waitFor(() =>
    expect(
      screen.queryByLabelText('Combinación autorizada'),
    ).not.toBeInTheDocument(),
  )
  expect(
    screen.getAllByText('Declaración registrada, pendiente de acreditación'),
  ).toHaveLength(1)
})
it('INVALID_CURSOR hides previous rows and restarts at page one', async () => {
  const c = fixture()
  c.nextPageToken = 'expired'
  vi.mocked(assistance.movementContext)
    .mockRejectedValueOnce(new ApiError(400, 'cursor', 'INVALID_CURSOR'))
    .mockResolvedValueOnce({ ...fixture(), movements: [] })
  mount(c)
  fireEvent.click(
    screen.getByRole('button', { name: 'Cargar más movimientos' }),
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Reiniciar movimientos' }),
  )
  expect(await screen.findByText(/Sin movimientos registrados/)).toBeVisible()
  expect(
    vi.mocked(assistance.movementContext).mock.calls[1][2]?.pageToken,
  ).toBeUndefined()
})
it('membership loss on continuation fences private data and retains technical recovery outside this component', async () => {
  const c = fixture()
  c.nextPageToken = 'old'
  vi.mocked(assistance.movementContext).mockRejectedValue(
    new ApiError(404, 'private', 'RESOURCE_NOT_FOUND'),
  )
  mount(c)
  fireEvent.click(
    screen.getByRole('button', { name: 'Cargar más movimientos' }),
  )
  await waitFor(() => expect(deny).toHaveBeenCalled())
  expect(
    screen.queryByText('Declaración registrada, pendiente de acreditación'),
  ).not.toBeInTheDocument()
})
