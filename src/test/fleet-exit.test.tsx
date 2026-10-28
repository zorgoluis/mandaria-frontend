import { beforeEach, expect, it, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { FleetExitsPage, ContextPanel, SummaryPanel } from '../fleet-exit/pages'
import { ExitCommands } from '../fleet-exit/commands'
import { CommandContext } from '../fleet-exit/command-context'
import {
  intentStore,
  sendIntent,
  recoverIntent,
  makeIntent,
} from '../fleet-exit/attempts'
import { exits } from '../fleet-exit/service'
import { providers } from '../providers/service'
import { ApiError } from '../services/errors'
import {
  eid,
  exitScope,
  exitContext,
  exitDetail,
  exitReceipt,
} from './fleet-exit-fixture'
import type { Attempt } from '../fleet-exit/types'
import type { Role } from '../types/api'
vi.mock('../fleet-exit/service', async (orig) => ({
  ...(await orig<typeof import('../fleet-exit/service')>()),
  exits: { context: vi.fn(), detail: vi.fn(), list: vi.fn(), notices: vi.fn() },
}))
vi.mock('../fleet-exit/attempts', async (orig) => ({
  ...(await orig<typeof import('../fleet-exit/attempts')>()),
  intentStore: {
    read: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
    scopes: vi.fn(),
  },
  sendIntent: vi.fn(),
  recoverIntent: vi.fn(),
}))
vi.mock('../providers/service', () => ({
  providers: { profiles: vi.fn(), profile: vi.fn() },
}))
let client: QueryClient
const identity = (role: Role = 'PROVIDER_ADMIN'): AuthState => ({
  user: {
    id: 'owner',
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
function wrap(node: ReactNode, path = '/', role: Role = 'PROVIDER_ADMIN') {
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={identity(role)}>
        <MemoryRouter initialEntries={[path]}>
          <FeedbackProvider>{node}</FeedbackProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
function page(
  role: Role = 'PROVIDER_ADMIN',
  surface: 'provider' | 'admin' = 'provider',
  path = `/exits?providerId=${eid.provider}&driverId=${eid.driver}`,
) {
  return render(
    wrap(
      <Routes>
        <Route path="/exits" element={<FleetExitsPage surface={surface} />} />
        <Route
          path="/exits/:id"
          element={<FleetExitsPage surface={surface} />}
        />
      </Routes>,
      path,
      role,
    ),
  )
}
const empty = {
  items: [],
  nextPageToken: null,
  asOf: '2026-10-24T12:00:00.000Z',
}
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(intentStore.read).mockResolvedValue(null)
  vi.mocked(intentStore.save).mockResolvedValue()
  vi.mocked(intentStore.clear).mockResolvedValue()
  vi.mocked(exits.context).mockResolvedValue(exitContext())
  vi.mocked(exits.detail).mockResolvedValue(exitDetail())
  vi.mocked(exits.list).mockResolvedValue(empty)
  vi.mocked(exits.notices).mockResolvedValue(empty)
  const profile = {
    id: eid.provider,
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
  vi.mocked(sendIntent).mockImplementation(async (i) => exitReceipt(i.key))
})
it.each(['DRIVER', 'CUSTOMER', 'SUPER_ADMIN'] as Role[])(
  'rejects provider deep link for %s before HTTP',
  (role) => {
    page(role)
    expect(screen.getByRole('heading', { name: 'Sin permisos' })).toBeVisible()
    expect(exits.context).not.toHaveBeenCalled()
  },
)
it('admin has no START even when backend canRequestExit is true', async () => {
  page('SUPER_ADMIN', 'admin')
  await screen.findByText('Vinculado a la flotilla')
  expect(
    screen.queryByRole('button', { name: 'Solicitar retiro de flotilla' }),
  ).not.toBeInTheDocument()
})
it('multiple memberships require explicit selection before context or list HTTP', async () => {
  const one = (await providers.profiles(1)).items[0]
  vi.mocked(providers.profiles).mockResolvedValue({
    items: [one, { ...one, id: eid.exit }],
    page: 1,
    pageSize: 20,
    total: 2,
    totalPages: 1,
  })
  page('PROVIDER_ADMIN', 'provider', '/exits')
  await screen.findByRole('heading', { name: 'Selecciona un proveedor' })
  expect(exits.context).not.toHaveBeenCalled()
  expect(exits.list).not.toHaveBeenCalled()
})
it.each(['OWNER', 'ADMIN'] as const)(
  '%s uses capabilities and confirms exact frozen START before send',
  async (membershipRole) => {
    const profile = await providers.profile(eid.provider)
    vi.mocked(providers.profile).mockResolvedValue({
      ...profile,
      membershipRole,
    })
    page()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Solicitar retiro de flotilla',
      }),
    )
    const d = await screen.findByRole('dialog')
    expect(d).toHaveTextContent('No transfiere')
    expect(sendIntent).not.toHaveBeenCalled()
    const confirmButton = within(d).getByRole('button', { name: 'Confirmar' })
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)
    await screen.findByText('Estado del intento: APPLIED')
    expect(intentStore.save).toHaveBeenCalledTimes(1)
    expect(sendIntent).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendIntent).mock.calls[0][0]).toMatchObject({
      resourceType: 'AFFILIATION',
      resourceId: eid.affiliation,
      body: {
        expectedAffiliationRevision: '9007199254740993',
        reasonCode: 'PROVIDER_REMOVAL',
      },
    })
    expect(
      screen.getByText(
        /Solicitud registrada. La desvinculación sigue pendiente/,
      ),
    ).toBeVisible()
  },
)
it('storage failure prevents HTTP and keeps the draft recoverable', async () => {
  vi.mocked(intentStore.save).mockRejectedValue(Error('storage failed'))
  page()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Solicitar retiro de flotilla' }),
  )
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByText('storage failed')
  expect(sendIntent).not.toHaveBeenCalled()
})
it('driver-initiated exit is shown without approval or veto, economics separate and optional references absent', () => {
  render(wrap(<SummaryPanel scope={exitScope} item={exitDetail()} />))
  expect(screen.getByText(/No necesita aprobación/)).toBeVisible()
  expect(screen.getByText(/Pueden continuar tras la salida/)).toBeVisible()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('null affiliation with completed history is not a missing profile or permission grant', () => {
  const c = exitContext()
  c.affiliation = null
  c.exit = {
    ...exitDetail(),
    status: 'COMPLETED',
    completedAt: '2026-10-24T13:00:00.000Z',
  }
  c.capabilities = {
    canRequestExit: false,
    requestExitReason: 'NOT_AFFILIATED',
  }
  render(
    wrap(<ContextPanel scope={exitScope} context={c} driverId={eid.driver} />),
  )
  expect(screen.getByText('Desvinculación completada')).toBeVisible()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it.each(['FEATURE_DISABLED', 'EXIT_ALREADY_REQUESTED', 'ACCOUNT_RESTRICTED'])(
  'does not grant START on %s',
  (reason) => {
    const c = exitContext()
    c.capabilities = { canRequestExit: false, requestExitReason: reason }
    render(
      wrap(
        <ContextPanel scope={exitScope} context={c} driverId={eid.driver} />,
      ),
    )
    expect(
      screen.queryByRole('button', { name: 'Solicitar retiro de flotilla' }),
    ).not.toBeInTheDocument()
  },
)
it('historical detail uses exitId without reading exdriver context; RECHECK has no force', async () => {
  page(
    'PROVIDER_ADMIN',
    'provider',
    `/exits/${eid.exit}?providerId=${eid.provider}`,
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Solicitar reevaluación' }),
  )
  expect(await screen.findByRole('dialog')).toHaveTextContent('No fuerza')
  expect(exits.context).not.toHaveBeenCalled()
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await waitFor(() => expect(sendIntent).toHaveBeenCalled())
  expect(vi.mocked(sendIntent).mock.calls[0][0]).toMatchObject({
    operation: 'RECHECK',
    resourceType: 'EXIT',
    resourceId: eid.exit,
    body: { expectedExitRevision: '9007199254740993' },
  })
})
it.each([
  'APPLIED',
  'REJECTED',
  'PENDING',
  'UNKNOWN',
  'CLOSED_NO_EFFECTS',
] as Attempt['status'][])(
  'recovers START %s without exitId or resend',
  async (status) => {
    const i = makeIntent(exitScope, 'START', eid.affiliation, {
      expectedAffiliationRevision: '9',
      reasonCode: 'PROVIDER_REMOVAL',
    })
    vi.mocked(intentStore.read).mockResolvedValue(i)
    vi.mocked(recoverIntent).mockResolvedValue({
      schemaVersion: 1,
      key: i.key,
      operation: i.operation,
      resourceType: i.resourceType,
      resourceId: i.resourceId,
      status,
      receipt: null,
      redacted: status === 'APPLIED',
    })
    render(wrap(<ExitCommands scope={exitScope} />))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Consultar intento' }),
    )
    await screen.findByText(`Estado del intento: ${status}`)
    expect(recoverIntent).toHaveBeenCalledWith(i, exitScope)
    expect(sendIntent).not.toHaveBeenCalled()
    if (status === 'PENDING')
      expect(
        screen.getByRole('button', { name: 'Consultar intento' }),
      ).toBeDisabled()
  },
)
it('ACCOUNT_CLOSING recovery surface never offers send or close of UNKNOWN', async () => {
  const i = makeIntent(exitScope, 'START', eid.affiliation, {
    expectedAffiliationRevision: '1',
    reasonCode: 'PROVIDER_REMOVAL',
  })
  vi.mocked(intentStore.read).mockResolvedValue(i)
  vi.mocked(recoverIntent).mockResolvedValue({
    schemaVersion: 1,
    key: i.key,
    operation: i.operation,
    resourceType: i.resourceType,
    resourceId: i.resourceId,
    status: 'UNKNOWN',
    receipt: null,
    redacted: false,
  })
  render(wrap(<ExitCommands scope={exitScope} restricted />))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Consultar intento' }),
  )
  await screen.findByText('Estado del intento: UNKNOWN')
  expect(
    screen.queryByRole('button', { name: 'Cerrar intento técnico' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Reenviar misma intención' }),
  ).not.toBeInTheDocument()
})
it('expired cursor removes old rows and restarts from first page', async () => {
  vi.mocked(exits.list)
    .mockResolvedValueOnce({
      ...empty,
      items: [exitDetail()],
      nextPageToken: 'expired',
    })
    .mockRejectedValueOnce(new ApiError(400, '', 'INVALID_CURSOR'))
    .mockResolvedValue(empty)
  page('PROVIDER_ADMIN', 'provider', `/exits?providerId=${eid.provider}`)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Cargar más salidas' }),
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Reiniciar consulta' }),
  )
  await screen.findByText('Sin solicitudes para esta consulta.')
  expect(vi.mocked(exits.list).mock.calls.at(-1)?.[1].pageToken).toBeUndefined()
})
it('membership revocation removes private detail without deleting the intent', async () => {
  vi.mocked(exits.detail).mockRejectedValue(
    new ApiError(404, '', 'RESOURCE_NOT_FOUND'),
  )
  page(
    'PROVIDER_ADMIN',
    'provider',
    `/exits/${eid.exit}?providerId=${eid.provider}`,
  )
  await screen.findByText(/El acceso cambió/)
  expect(screen.queryByText('Salida pendiente')).not.toBeInTheDocument()
  expect(intentStore.clear).not.toHaveBeenCalled()
})
it('notice duplicates are collapsed and refocus refetches HTTP', async () => {
  const n = {
    id: eid.key,
    exitId: eid.exit,
    type: 'REQUESTED' as const,
    createdAt: '2026-10-24T12:00:00.000Z',
  }
  vi.mocked(exits.notices).mockResolvedValue({ ...empty, items: [n, n] })
  page('PROVIDER_ADMIN', 'provider', `/exits?providerId=${eid.provider}`)
  await screen.findByText(/Solicitud registrada ·/)
  expect(screen.getAllByText(/Solicitud registrada ·/)).toHaveLength(1)
  await act(async () => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
  await waitFor(() => expect(exits.notices).toHaveBeenCalledTimes(2))
})
it('unmounted old scope cannot render a late receipt or clear another intention', async () => {
  let resolve!: (r: ReturnType<typeof exitReceipt>) => void
  vi.mocked(sendIntent).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  const view = page()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Solicitar retiro de flotilla' }),
  )
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await waitFor(() => expect(sendIntent).toHaveBeenCalled())
  view.unmount()
  await act(async () =>
    resolve(exitReceipt(vi.mocked(sendIntent).mock.calls[0][0].key)),
  )
  expect(screen.queryByText(/Estado del intento/)).not.toBeInTheDocument()
  expect(intentStore.clear).not.toHaveBeenCalled()
})
it('provider never renders independent dimension even if a direct component receives extra data', () => {
  const c = {
    ...exitContext(),
    independent: {
      profileState: 'SECRET',
      canOperate: true,
      reasons: [],
      allowedZoneIds: [],
      selectedZoneId: null,
      requiresExplicitReceptionStart: true,
    },
  }
  render(
    wrap(
      <CommandContext.Provider
        value={{ blocked: false, prepare: vi.fn(), deny: vi.fn() }}
      >
        <ContextPanel scope={exitScope} context={c} driverId={eid.driver} />
      </CommandContext.Provider>,
    ),
  )
  expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument()
})

it.each([
  [401, 'UNAUTHORIZED'],
  [403, 'ACCOUNT_CLOSING'],
  [404, 'RESOURCE_NOT_FOUND'],
  [409, 'AFFILIATION_REVISION_CONFLICT'],
  [409, 'EXIT_REVISION_CONFLICT'],
  [409, 'FLEET_EXIT_DISABLED'],
  [503, 'RETRY_SAME_ATTEMPT'],
] as const)(
  'HTTP %s %s preserves original durable START without automatic retry',
  async (status, code) => {
    vi.mocked(sendIntent).mockRejectedValue(new ApiError(status, '', code))
    page()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Solicitar retiro de flotilla',
      }),
    )
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Confirmar',
      }),
    )
    await screen.findByRole('button', { name: 'Consultar intento' })
    await waitFor(() => expect(sendIntent).toHaveBeenCalledTimes(1))
    expect(intentStore.save).toHaveBeenCalledTimes(1)
    expect(intentStore.clear).not.toHaveBeenCalled()
    expect(
      screen.queryByText('Estado del intento: APPLIED'),
    ).not.toBeInTheDocument()
  },
)
it('RECHECK UNKNOWN closes exactly the original EXIT intention', async () => {
  const i = makeIntent(exitScope, 'RECHECK', eid.exit, {
    expectedExitRevision: '9007199254740993',
  })
  vi.mocked(intentStore.read).mockResolvedValue(i)
  const base = {
    schemaVersion: 1 as const,
    key: i.key,
    operation: i.operation,
    resourceType: i.resourceType,
    resourceId: i.resourceId,
    receipt: null,
    redacted: false,
  }
  vi.mocked(recoverIntent)
    .mockResolvedValueOnce({ ...base, status: 'UNKNOWN' })
    .mockResolvedValueOnce({ ...base, status: 'CLOSED_NO_EFFECTS' })
  render(wrap(<ExitCommands scope={exitScope} />))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Consultar intento' }),
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Cerrar intento técnico' }),
  )
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByText('Estado del intento: CLOSED_NO_EFFECTS')
  expect(recoverIntent).toHaveBeenLastCalledWith(i, exitScope, true)
  expect(sendIntent).not.toHaveBeenCalled()
})
it('redacted POST receipt removes private panels and never reconstructs exitId', async () => {
  vi.mocked(sendIntent).mockImplementation(async (i) => ({
    schemaVersion: 1,
    key: i.key,
    operation: i.operation,
    resourceType: i.resourceType,
    resourceId: i.resourceId,
    status: 'APPLIED',
    receipt: null,
    redacted: true,
  }))
  page()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Solicitar retiro de flotilla' }),
  )
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByText(/Resultado técnico redactado/)
  expect(
    screen.queryByRole('link', { name: 'Consultar salida actual' }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('Vinculado a la flotilla')).not.toBeInTheDocument()
})
it('COMPLETED receipt survives the expected ex-driver context404 without restoring capabilities', async () => {
  vi.mocked(exits.context)
    .mockResolvedValueOnce(exitContext())
    .mockRejectedValue(new ApiError(404, '', 'RESOURCE_NOT_FOUND'))
  vi.mocked(sendIntent).mockImplementation(async (i) => ({
    ...exitReceipt(i.key),
    exitStatus: 'COMPLETED',
  }))
  page()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Solicitar retiro de flotilla' }),
  )
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByText(/El acceso cambió/)
  expect(
    screen.getByRole('link', { name: 'Consultar salida actual' }),
  ).toHaveAttribute(
    'href',
    `/fleet-exits/${eid.exit}?providerId=${eid.provider}`,
  )
  expect(
    screen.queryByRole('button', { name: 'Solicitar retiro de flotilla' }),
  ).not.toBeInTheDocument()
})
