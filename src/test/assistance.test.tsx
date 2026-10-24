import { beforeEach, expect, it, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { AssistancePage, CollectionView } from '../assistance/pages'
import { AssistanceCommands } from '../assistance/commands'
import { CommandForm } from '../assistance/forms'
import { assistance } from '../assistance/service'
import {
  intentStore,
  sendIntent,
  recoverIntent,
  makeIntent,
} from '../assistance/attempts'
import { providers } from '../providers/service'
import { adminAssignments } from '../delivery-assignments/service'
import { ApiError } from '../services/errors'
import { assistanceDetail, ids, scope } from './assistance-fixture'
import type { Role } from '../types/api'
import type { AttemptReceipt } from '../assistance/types'
vi.mock('../assistance/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../assistance/service')>()),
  assistance: {
    detail: vi.fn(),
    list: vi.fn(),
    collection: vi.fn(),
    proposal: vi.fn(),
  },
}))
vi.mock('../assistance/attempts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../assistance/attempts')>()),
  intentStore: { read: vi.fn(), save: vi.fn(), clear: vi.fn() },
  sendIntent: vi.fn(),
  recoverIntent: vi.fn(),
}))
vi.mock('../providers/service', () => ({
  providers: { profiles: vi.fn(), profile: vi.fn() },
}))
vi.mock('../delivery-assignments/service', () => ({
  adminAssignments: { history: vi.fn() },
}))
let client: QueryClient
const identity = (role: Role = 'PROVIDER_ADMIN', id = 'owner'): AuthState => ({
  user: {
    id,
    role,
    email: 'synthetic@example.test',
    active: true,
    emailVerifiedAt: null,
    createdAt: '',
    updatedAt: '',
  },
  loading: false,
  expired: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  restore: vi.fn(),
})
function wrap(
  children: ReactNode,
  role: Role = 'PROVIDER_ADMIN',
  path = '/',
  id = 'owner',
) {
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={identity(role, id)}>
        <MemoryRouter initialEntries={[path]}>
          <FeedbackProvider>{children}</FeedbackProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
function mount(
  role: Role = 'PROVIDER_ADMIN',
  surface: 'admin' | 'provider' = 'provider',
) {
  return render(
    wrap(
      <Routes>
        <Route
          path="/cases/:id"
          element={<AssistancePage surface={surface} />}
        />
      </Routes>,
      role,
      `/cases/${ids.case}?providerId=provider`,
    ),
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(intentStore.read).mockResolvedValue(null)
  vi.mocked(intentStore.save).mockResolvedValue()
  vi.mocked(intentStore.clear).mockResolvedValue()
  vi.mocked(assistance.detail).mockResolvedValue(assistanceDetail())
  vi.mocked(assistance.collection).mockResolvedValue({
    items: [],
    nextPageToken: null,
    asOf: '2026-10-23',
  })
  vi.mocked(adminAssignments.history).mockResolvedValue([])
  const profile = {
    id: 'provider',
    name: 'Flotilla sintética',
    code: 'TEST',
    type: 'FLEET' as const,
    status: 'ACTIVE' as const,
    membershipRole: 'OWNER' as const,
    limits: { maxDrivers: 10, maxVehicles: 10 },
  }
  vi.mocked(providers.profile).mockResolvedValue(profile)
  vi.mocked(providers.profiles).mockResolvedValue({
    items: [profile],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  })
})
it.each(['DRIVER', 'CUSTOMER', 'SUPER_ADMIN'] as Role[])(
  'owner deep link rejects %s before HTTP',
  (role) => {
    mount(role)
    expect(screen.getByRole('alert')).toHaveTextContent('Sin acceso')
    expect(assistance.detail).not.toHaveBeenCalled()
  },
)
it('provider cannot enter administrative deep link', () => {
  mount('PROVIDER_ADMIN', 'admin')
  expect(assistance.detail).not.toHaveBeenCalled()
})
it('an old projection without capabilities stays readable and grants no commands', async () => {
  const d = assistanceDetail()
  delete d.summary.capabilities
  vi.mocked(assistance.detail).mockResolvedValue(d)
  mount()
  expect(await screen.findByText(/Caso /, { selector: 'h2' })).toBeVisible()
  expect(
    screen.queryByRole('heading', { name: 'Aportar información' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Declarar movimiento' }),
  ).not.toBeInTheDocument()
})
it('owner ignores additive DRIVER movementContext and cannot reverse a movement', async () => {
  const d = {
    ...assistanceDetail(),
    movementContext: {
      parties: [{ partyId: ids.party }],
      capabilities: { canDeclareMovement: true },
    },
  }
  vi.mocked(assistance.detail).mockResolvedValue(d)
  mount()
  expect(
    await screen.findByText(
      /La proyección propia no incluye partes ni movimientos/,
    ),
  ).toBeVisible()
  expect(screen.queryByLabelText('Movimiento original')).not.toBeInTheDocument()
  expect(assistance.collection).not.toHaveBeenCalled()
})
it.each(['PENDIENTE', 'PARCIAL'])(
  'accredited delivery does not reconcile %s cash',
  async (economicState) => {
    const d = assistanceDetail()
    d.summary.economicState = economicState
    d.economics = [
      {
        ...d.economics[0],
        expectedAmount: '350.00',
        creditedAmount: '25.00',
        remainingAmount: '325.00',
        state: economicState,
      },
    ]
    vi.mocked(assistance.detail).mockResolvedValue(d)
    mount()
    await screen.findByText('ENTREGA_ACREDITADA')
    expect(screen.getByText(/Esperado: 350.00/)).toHaveTextContent(
      'Pendiente: 325.00 MXN',
    )
    expect(
      screen.queryByRole('button', { name: 'Cerrar caso' }),
    ).not.toBeInTheDocument()
    expect(sendIntent).not.toHaveBeenCalled()
  },
)
it('logout unmounts private assistance and prevents further detail reads', async () => {
  const v = mount()
  await screen.findByText('ENTREGA_ACREDITADA')
  const calls = vi.mocked(assistance.detail).mock.calls.length
  v.rerender(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={{ ...identity(), user: null }}>
        <MemoryRouter>
          <AssistancePage surface="provider" />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  expect(screen.queryByText('ENTREGA_ACREDITADA')).not.toBeInTheDocument()
  expect(assistance.detail).toHaveBeenCalledTimes(calls)
})
it('owner separates accredited delivery, disputed money, unknown amounts and unavailable names without admin reads', async () => {
  mount()
  await screen.findByText('ENTREGA_ACREDITADA')
  expect(screen.getAllByText('EN_DISPUTA').length).toBeGreaterThan(0)
  expect(screen.getAllByText('No disponible')).toHaveLength(2)
  expect(screen.getByText(/Esperado: Desconocido/)).toHaveTextContent(
    'Acreditado: 25.00',
  )
  expect(screen.getByText(/proyección propia no incluye partes/)).toBeVisible()
  expect(assistance.proposal).not.toHaveBeenCalled()
  expect(assistance.collection).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('button', { name: /Aplicar propuesta/ }),
  ).not.toBeInTheDocument()
})
it('lost authorization clears private detail after refetch', async () => {
  mount()
  await screen.findByText('ENTREGA_ACREDITADA')
  vi.mocked(assistance.detail).mockRejectedValue(new ApiError(403, 'Forbidden'))
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar expediente' }))
  await waitFor(() =>
    expect(screen.queryByText('ENTREGA_ACREDITADA')).not.toBeInTheDocument(),
  )
})
it('expired history cursor removes earlier rows and explicit refresh resets cursor', async () => {
  vi.mocked(assistance.collection).mockRejectedValueOnce(
    new ApiError(400, 'Invalid', 'INVALID_CURSOR'),
  )
  render(
    wrap(
      <CollectionView
        scope={scope}
        id={ids.case}
        name="history"
        initial={{
          items: [{ id: ids.party, type: 'VISIBLE' }],
          nextPageToken: 'signed',
          asOf: '2026-10-23',
        }}
      />,
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más history' }))
  await waitFor(() =>
    expect(screen.queryByText(/VISIBLE/)).not.toBeInTheDocument(),
  )
  expect(assistance.collection).toHaveBeenCalledWith(
    scope,
    ids.case,
    'history',
    'signed',
    expect.any(AbortSignal),
  )
})
it('permission loss on a history page removes the entire private case while preserving recovery', async () => {
  vi.mocked(assistance.collection).mockRejectedValue(
    new ApiError(403, 'Forbidden'),
  )
  render(
    wrap(
      <AssistanceCommands scope={scope}>
        <p>Private case data</p>
        <CollectionView
          scope={scope}
          id={ids.case}
          name="history"
          initial={{ items: [], nextPageToken: 'signed', asOf: '2026-10-23' }}
        />
      </AssistanceCommands>,
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más history' }))
  await screen.findByText(/Se retiró el expediente privado/)
  expect(screen.queryByText('Private case data')).not.toBeInTheDocument()
  expect(
    screen.getByRole('region', { name: 'Recuperación de asistencia' }),
  ).toBeInTheDocument()
})
it('late old provider response is discarded after scope change', async () => {
  let resolve!: (v: ReturnType<typeof assistanceDetail>) => void
  vi.mocked(assistance.detail)
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )
    .mockResolvedValue({
      ...assistanceDetail(),
      summary: {
        ...assistanceDetail().summary,
        operationalState: 'NEW_PROVIDER',
      },
    })
  const v = mount()
  await waitFor(() => expect(assistance.detail).toHaveBeenCalled())
  v.unmount()
  client.clear()
  mount()
  await screen.findByText('NEW_PROVIDER')
  await act(async () => resolve(assistanceDetail()))
  expect(screen.queryByText('ENTREGA_ACREDITADA')).not.toBeInTheDocument()
})
async function prepareContribution() {
  render(
    wrap(
      <AssistanceCommands scope={scope}>
        <CommandForm
          operation="CONTRIBUTE"
          detail={assistanceDetail()}
          admin={false}
        />
      </AssistanceCommands>,
    ),
  )
  fireEvent.change(screen.getByLabelText('Información'), {
    target: { value: 'Declaración sintética pendiente' },
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar intención' }),
    ).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Revisar intención' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirmar revisión' }),
  )
  const button = within(screen.getByRole('dialog')).getByRole('button', {
    name: 'Confirmar',
  })
  fireEvent.click(button)
  fireEvent.click(button)
}
it('persists before transport, double click sends one frozen intention', async () => {
  vi.mocked(sendIntent).mockImplementation(async (i) => {
    expect(intentStore.save).toHaveBeenCalledWith(i)
    return { status: 'APPLIED', receiptId: ids.evidence }
  })
  await prepareContribution()
  await waitFor(() => expect(sendIntent).toHaveBeenCalledTimes(1))
  expect(vi.mocked(sendIntent).mock.calls[0][0].body).toEqual({
    expectedCaseRevision: '3',
    text: 'Declaración sintética pendiente',
    evidenceIds: [],
  })
})
it('storage failure prevents network mutation', async () => {
  vi.mocked(intentStore.save).mockRejectedValue(Error('Storage unavailable'))
  await prepareContribution()
  await screen.findByText('Storage unavailable')
  expect(sendIntent).not.toHaveBeenCalled()
})
it.each([
  'ASSISTANCE_DISABLED',
  'CASE_REVISION_CONFLICT',
  'PROPOSAL_STALE',
  'RETRY_SAME_ATTEMPT',
])('retains same intent on %s without automatic rekey', async (code) => {
  vi.mocked(sendIntent).mockRejectedValue(new ApiError(409, code, code))
  await prepareContribution()
  await waitFor(() => expect(sendIntent).toHaveBeenCalledTimes(1))
  expect(intentStore.clear).not.toHaveBeenCalled()
  expect(
    await screen.findByRole('button', { name: 'Consultar intento' }),
  ).toBeEnabled()
})
it.each([
  'UNKNOWN',
  'PENDING',
  'APPLIED',
  'REJECTED',
  'CLOSED_NO_EFFECTS',
] as AttemptReceipt['status'][])(
  'recovers %s after restart, without resend',
  async (status) => {
    const i = makeIntent(scope, 'CONTRIBUTE', ids.case, {
      expectedCaseRevision: '3',
      text: 'original',
      evidenceIds: [],
    })
    vi.mocked(intentStore.read).mockResolvedValue(i)
    vi.mocked(recoverIntent).mockResolvedValue({
      status,
      canClose: status === 'UNKNOWN' || status === 'PENDING',
    })
    render(
      wrap(
        <AssistanceCommands scope={scope}>
          <p>Expediente</p>
        </AssistanceCommands>,
      ),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Consultar intento' }),
    )
    await screen.findByText(`Estado del intento: ${status}`)
    expect(sendIntent).not.toHaveBeenCalled()
    if (status === 'UNKNOWN')
      expect(screen.getByText(/no prueba ausencia de efectos/)).toBeVisible()
  },
)
it('technical close uses original operation/key and never claims operational success', async () => {
  const i = makeIntent(scope, 'CONTRIBUTE', ids.case, {
    expectedCaseRevision: '3',
    text: 'original',
    evidenceIds: [],
  })
  vi.mocked(intentStore.read).mockResolvedValue(i)
  vi.mocked(recoverIntent)
    .mockResolvedValueOnce({ status: 'UNKNOWN', canClose: true })
    .mockResolvedValueOnce({ status: 'CLOSED_NO_EFFECTS' })
  render(
    wrap(
      <AssistanceCommands scope={scope}>
        <p>Expediente</p>
      </AssistanceCommands>,
    ),
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Consultar intento' }),
  )
  await screen.findByText('Estado del intento: UNKNOWN')
  fireEvent.click(
    screen.getByRole('button', { name: 'Cerrar intento técnico' }),
  )
  await screen.findByText('Estado del intento: CLOSED_NO_EFFECTS')
  expect(recoverIntent).toHaveBeenLastCalledWith(i, true)
  expect(sendIntent).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('button', { name: 'Reenviar mismo intento' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Reconocer resultado y continuar' }),
  ).toBeEnabled()
})
it('admin review shows effective identity votes and freezes server proposal hash', async () => {
  vi.mocked(assistance.detail).mockResolvedValue(assistanceDetail(true))
  vi.mocked(assistance.proposal).mockResolvedValue({
    id: ids.proposal,
    type: 'ACCREDIT_DELIVERY',
    status: 'READY',
    revision: '0',
    snapshotHash: 'a'.repeat(64),
    effectiveApprovalCount: 1,
    requiredApprovals: 2,
    occurredAt: '2026-10-23T10:00:00Z',
    recordedAt: '2026-10-23T12:00:00Z',
    reason: 'Synthetic',
    payload: { proofSource: 'NEW_ACTION' },
  })
  mount('SUPER_ADMIN', 'admin')
  await screen.findByText('Votos efectivos: 1 / 2')
  expect(
    screen.getByRole('button', { name: 'Aplicar propuesta revisada' }),
  ).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Motivo de revisión'), {
    target: { value: 'Revisión independiente' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar voto' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('REVIEW')
  expect(screen.getByText(/Dos sesiones del mismo usuario/)).toBeVisible()
  expect(sendIntent).not.toHaveBeenCalled()
})
it('identity verification is blocked because the real projection strips the registered channel', async () => {
  const d = assistanceDetail(true)
  render(
    wrap(
      <AssistanceCommands scope={{ ...scope, surface: 'admin' }}>
        <CommandForm operation="VERIFY_IDENTITY" detail={d} admin />
      </AssistanceCommands>,
      'SUPER_ADMIN',
    ),
  )
  expect(
    await screen.findByText(/proyección administrativa omite contactSourceRef/),
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Revisar intención' }),
  ).toBeDisabled()
  expect(sendIntent).not.toHaveBeenCalled()
})
it('admin can register a historical driver from an authorized party, without a pasted identity', async () => {
  const d = assistanceDetail(true)
  d.collections!.parties!.items[0].userId = ids.party
  render(
    wrap(
      <AssistanceCommands scope={{ ...scope, surface: 'admin' }}>
        <CommandForm operation="REGISTER_PARTY" detail={d} admin />
      </AssistanceCommands>,
      'SUPER_ADMIN',
    ),
  )
  fireEvent.change(screen.getByLabelText('Tipo'), {
    target: { value: 'DRIVER' },
  })
  fireEvent.change(screen.getByLabelText('Usuario histórico'), {
    target: { value: ids.party },
  })
  fireEvent.change(screen.getByLabelText('Nombre de referencia'), {
    target: { value: 'Conductor histórico' },
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar intención' }),
    ).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Revisar intención' }))
  expect(
    await screen.findByLabelText('Vista previa de efectos'),
  ).toHaveTextContent(ids.party)
  expect(screen.queryByLabelText('Canal registrado')).not.toBeInTheDocument()
  expect(sendIntent).not.toHaveBeenCalled()
})
it('admin uses participation references from authorized obligations but never substitutes assignmentId', async () => {
  const d = assistanceDetail(true)
  d.collections!.obligations = {
    items: [{ id: ids.obligation, participationId: ids.evidence }],
    nextPageToken: null,
    asOf: '2026-10-23',
  }
  render(
    wrap(
      <AssistanceCommands scope={{ ...scope, surface: 'admin' }}>
        <CommandForm operation="RECORD_OBLIGATION" detail={d} admin />
      </AssistanceCommands>,
      'SUPER_ADMIN',
    ),
  )
  expect(screen.getByLabelText('Participación histórica')).toContainHTML(
    ids.evidence,
  )
  expect(screen.getByLabelText('Participación histórica')).not.toContainHTML(
    ids.assignment,
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar intención' }),
    ).toBeEnabled(),
  )
})
it('status/dispatch filters restart the opaque list cursor and honor the selected limit', async () => {
  const d = assistanceDetail()
  vi.mocked(assistance.list).mockResolvedValue({
    items: [d.summary],
    nextPageToken: 'old-cursor',
    asOf: '2026-10-23',
  })
  render(
    wrap(
      <AssistancePage surface="provider" />,
      'PROVIDER_ADMIN',
      '/fleet-assistance?providerId=provider',
    ),
  )
  await screen.findByRole('link', { name: /Caso / })
  fireEvent.change(screen.getByLabelText('Estado del caso'), {
    target: { value: 'CLOSED' },
  })
  fireEvent.change(screen.getByLabelText('Envío de un expediente visible'), {
    target: { value: ids.dispatch },
  })
  fireEvent.change(screen.getByLabelText('Casos por página'), {
    target: { value: '100' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await waitFor(() =>
    expect(assistance.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ actor: 'owner', providerId: 'provider' }),
      {
        status: 'CLOSED',
        dispatchId: ids.dispatch,
        limit: 100,
        pageToken: undefined,
      },
      expect.any(AbortSignal),
    ),
  )
})
