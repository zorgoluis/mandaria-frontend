import { beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { FleetGate } from '../fleet/gate'
import { FleetResourceScope } from '../fleet/resources'
import { FleetHistory } from '../fleet/pages'
import { SpendingEditor } from '../fleet/spending'
import { allows } from '../fleet/permissions'
import { fleet } from '../fleet/service'
import { providers } from '../providers/service'
import { providerDispatches } from '../dispatch/service'
import { ProviderServiceDetail, ProviderServicesPage } from '../dispatch/pages'
import { ApiError } from '../services/errors'
import { fleetContext, fleetPage, segment } from './fleet-fixture'
import { dispatchFixture } from './execution-fixture'
import type { FleetPage, OperationMode } from '../fleet/types'

it('resource management respects capabilities even in PAUSED', async () => {
  const context = fleetContext('PAUSED')
  context.capabilities.canManageResources = false
  vi.mocked(fleet.context).mockResolvedValue(context)
  render(
    wrap(
      <FleetResourceScope>
        {() => <button>Mutar recursos</button>}
      </FleetResourceScope>,
    ),
  )
  await screen.findByText(
    'Sin permiso para administrar recursos de esta flotilla.',
  )
  expect(
    screen.queryByRole('button', { name: 'Mutar recursos' }),
  ).not.toBeInTheDocument()
})
it('spending confirmation retains the reviewed intention if a background read changes state', async () => {
  render(wrap(<SpendingEditor providerId="provider" driverId="driver" />))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Habilitar gasto' }),
  )
  act(() =>
    client.setQueryData(['fleet', 'owner', 'provider', 'spending', 'driver'], {
      enabled: true,
      revision: '9',
    }),
  )
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Confirmar habilitación de gasto',
  )
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await waitFor(() =>
    expect(fleet.setSpending).toHaveBeenCalledWith(
      'provider',
      'driver',
      expect.objectContaining({ enabled: true, expectedRevision: '0' }),
    ),
  )
})
it('corrupt pending marker blocks a new spending mutation', async () => {
  sessionStorage.setItem(
    'mandaria.fleet-spending:owner:provider:driver',
    '{broken',
  )
  render(wrap(<SpendingEditor providerId="provider" driverId="driver" />))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'No se enviará otra autorización',
  )
  expect(fleet.setSpending).not.toHaveBeenCalled()
})
it('canceling spending confirmation sends no command and persists no intent', async () => {
  render(wrap(<SpendingEditor providerId="provider" driverId="driver" />))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Habilitar gasto' }),
  )
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Cancelar',
    }),
  )
  expect(fleet.setSpending).not.toHaveBeenCalled()
  expect(
    sessionStorage.getItem('mandaria.fleet-spending:owner:provider:driver'),
  ).toBeNull()
})
it('an old account spending command is never offered to a different actor', async () => {
  sessionStorage.setItem(
    'mandaria.fleet-spending:owner:provider:driver',
    JSON.stringify({
      requestId: '11111111-1111-4111-8111-111111111111',
      expectedRevision: '0',
      enabled: true,
    }),
  )
  render(
    wrap(
      <SpendingEditor providerId="provider" driverId="driver" />,
      'different-owner',
    ),
  )
  await screen.findByRole('button', { name: 'Habilitar gasto' })
  expect(
    screen.queryByRole('button', { name: 'Recuperar comando pendiente' }),
  ).not.toBeInTheDocument()
})

vi.mock('../fleet/service', () => ({
  fleet: {
    context: vi.fn(),
    services: vi.fn(),
    spending: vi.fn(),
    setSpending: vi.fn(),
  },
}))
vi.mock('../providers/service', () => ({
  providers: { profiles: vi.fn(), profile: vi.fn() },
}))
vi.mock('../dispatch/service', () => ({
  providerDispatches: {
    list: vi.fn(),
    get: vi.fn(),
    claim: vi.fn(),
    release: vi.fn(),
  },
}))
const identity = (id = 'owner'): AuthState => ({
  user: {
    id,
    email: 'owner@example.test',
    role: 'PROVIDER_ADMIN',
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
let client: QueryClient
function wrap(children: ReactNode, actor = 'owner', path = '/') {
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={identity(actor)}>
        <MemoryRouter initialEntries={[path]}>
          <FeedbackProvider>{children}</FeedbackProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.resetAllMocks()
  vi.mocked(fleet.context).mockResolvedValue(fleetContext('DRIVER_TAKE'))
  vi.mocked(fleet.services).mockResolvedValue(fleetPage())
  vi.mocked(fleet.spending).mockResolvedValue({ enabled: false, revision: '0' })
  vi.mocked(fleet.setSpending).mockResolvedValue({
    enabled: true,
    revision: '1',
    requestId: 'receipt',
  })
  const profile = {
    id: 'provider',
    name: 'Flotilla sintética',
    code: 'TEST',
    type: 'FLEET' as const,
    status: 'ACTIVE' as const,
    membershipRole: 'OWNER' as const,
    limits: { maxDrivers: 10, maxVehicles: 10 },
  }
  vi.mocked(providers.profiles).mockResolvedValue({
    items: [profile],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  })
  vi.mocked(providers.profile).mockResolvedValue(profile)
  vi.mocked(providerDispatches.list).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  })
})
it.each(['DRIVER_TAKE', 'PAUSED'] as OperationMode[])(
  '%s: old deep link reads only own segments, never operational projection',
  async (mode) => {
    vi.mocked(fleet.context).mockResolvedValue(fleetContext(mode))
    render(
      wrap(
        <Routes>
          <Route path="/services/:id" element={<ProviderServiceDetail />} />
        </Routes>,
        'owner',
        '/services/dispatch?providerId=provider',
      ),
    )
    expect(await screen.findByText('MDQ-SYNTHETIC')).toBeInTheDocument()
    expect(screen.getAllByText('No disponible')).toHaveLength(2)
    expect(
      screen.queryByRole('button', {
        name: /TOMAR|LIBERAR|ENTREGADO|ASIGNAR|incidencia/i,
      }),
    ).not.toBeInTheDocument()
    expect(providerDispatches.get).not.toHaveBeenCalled()
    expect(fleet.services).toHaveBeenCalledWith(
      'provider',
      {},
      undefined,
      'dispatch',
      expect.any(AbortSignal),
    )
  },
)
it.each([401, 403, 404, 500, 0])(
  'context failure %i never authorizes legacy or history',
  async (status) => {
    vi.mocked(fleet.context).mockRejectedValue(
      new ApiError(status, 'Contexto no disponible'),
    )
    render(wrap(<ProviderServicesPage />))
    await screen.findByText('Contexto no disponible')
    expect(providerDispatches.list).not.toHaveBeenCalled()
    expect(fleet.services).not.toHaveBeenCalled()
  },
)
it('ADMIN_DISPATCH preserves the historical list; DRAINING cannot claim even if capability is inconsistent', async () => {
  vi.mocked(fleet.context).mockResolvedValue(fleetContext())
  render(wrap(<ProviderServicesPage />))
  await waitFor(() => expect(providerDispatches.list).toHaveBeenCalled())
  expect(fleet.services).not.toHaveBeenCalled()
  const draining = fleetContext('DRAINING')
  draining.capabilities.canClaim = true
  expect(allows(draining, 'canClaim')).toBe(false)
  expect(allows(draining, 'canRelease')).toBe(true)
})
it('DRAINING removes the claim button while retaining authorized historical reads', async () => {
  vi.mocked(fleet.context).mockResolvedValue(fleetContext('DRAINING'))
  vi.mocked(providerDispatches.list).mockResolvedValue({
    items: [
      {
        ...dispatchFixture,
        access: 'OFFER',
        status: 'OPEN',
        claimedByMe: false,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  })
  render(wrap(<ProviderServicesPage />))
  await screen.findByRole('link', { name: /Ver detalle/ })
  expect(
    screen.queryByRole('button', { name: /TOMAR/ }),
  ).not.toBeInTheDocument()
})
it.each([
  'ADMIN_DISPATCH',
  'DRAINING',
  'DRIVER_TAKE',
  'PAUSED',
] as OperationMode[])(
  '%s respects every server capability and fails closed without context',
  (mode) => {
    const context = fleetContext(mode)
    for (const key of Object.keys(
      context.capabilities,
    ) as (keyof typeof context.capabilities)[]) {
      expect(allows(null, key)).toBe(false)
      context.capabilities[key] = false
      expect(allows(context, key)).toBe(false)
    }
  },
)
it('detail renders multiple own segments, null snapshots and no unexpected private fields', async () => {
  vi.mocked(fleet.services).mockResolvedValue(
    fleetPage([
      {
        ...segment,
        contact: 'SECRET-CONTACT',
        gps: 'SECRET-GPS',
      } as typeof segment,
      { ...segment, assignmentId: 'second', reference: 'SEGMENT-2' },
    ]),
  )
  render(wrap(<FleetHistory providerId="provider" dispatchId="dispatch" />))
  await screen.findByText('MDQ-SYNTHETIC')
  expect(screen.getByText('SEGMENT-2')).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument()
  expect(screen.getAllByText('No disponible')).toHaveLength(4)
  expect(providerDispatches.get).not.toHaveBeenCalled()
})
it('retains filters for cursor, deduplicates assignments and resets on changed filters', async () => {
  vi.mocked(fleet.services).mockImplementation(async (_p, filters, token) =>
    token
      ? fleetPage([
          segment,
          { ...segment, assignmentId: 'second', reference: 'SECOND' },
        ])
      : fleetPage(
          [
            {
              ...segment,
              reference: filters.status ? 'FILTERED' : segment.reference,
            },
          ],
          'signed-token',
        ),
  )
  render(wrap(<FleetHistory providerId="provider" />))
  await screen.findByText('MDQ-SYNTHETIC')
  fireEvent.change(screen.getByLabelText('Estado de asignación'), {
    target: { value: 'ACTIVE' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await screen.findByText('FILTERED')
  expect(screen.queryByText('MDQ-SYNTHETIC')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
  await screen.findByText('SECOND')
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(fleet.services).toHaveBeenLastCalledWith(
    'provider',
    { status: 'ACTIVE' },
    'signed-token',
    undefined,
    expect.any(AbortSignal),
  )
})
it.each([400, 410, 403, 404, 0])(
  'page failure %i hides earlier rows; refresh starts without a cursor',
  async (status) => {
    vi.mocked(fleet.services)
      .mockResolvedValueOnce(fleetPage([segment], 'token'))
      .mockRejectedValueOnce(new ApiError(status, 'Fallo de página'))
      .mockResolvedValue(fleetPage([]))
    render(wrap(<FleetHistory providerId="provider" />))
    await screen.findByText('MDQ-SYNTHETIC')
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    await screen.findByText('Fallo de página')
    expect(screen.queryByText('MDQ-SYNTHETIC')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar historial' }))
    await screen.findByText('Sin participaciones')
    expect(fleet.services).toHaveBeenLastCalledWith(
      'provider',
      {},
      undefined,
      undefined,
      expect.any(AbortSignal),
    )
  },
)
it('late responses from a prior provider or account never appear', async () => {
  let resolve!: (value: FleetPage) => void
  vi.mocked(fleet.services).mockImplementation((p) =>
    p === 'A'
      ? new Promise((r) => {
          resolve = r
        })
      : Promise.resolve(fleetPage([{ ...segment, reference: 'PROVIDER-B' }])),
  )
  const view = render(wrap(<FleetHistory providerId="A" />))
  await waitFor(() => expect(fleet.services).toHaveBeenCalled())
  view.rerender(wrap(<FleetHistory providerId="B" />, 'other-owner'))
  await screen.findByText('PROVIDER-B')
  await act(async () => resolve(fleetPage()))
  expect(screen.queryByText('MDQ-SYNTHETIC')).not.toBeInTheDocument()
  expect(
    client
      .getQueryCache()
      .getAll()
      .filter((q) => q.queryKey[0] === 'fleet')
      .every((q) => q.queryKey[1] === 'other-owner'),
  ).toBe(true)
})
it('membership revocation after context success removes private history and never falls back', async () => {
  render(
    wrap(
      <FleetGate providerId="provider">
        {() => <FleetHistory providerId="provider" />}
      </FleetGate>,
    ),
  )
  await screen.findByText('MDQ-SYNTHETIC')
  vi.mocked(fleet.context).mockRejectedValue(
    new ApiError(403, 'Membership revocada'),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar modo' }))
  await screen.findByText('Membership revocada')
  expect(screen.queryByText('MDQ-SYNTHETIC')).not.toBeInTheDocument()
  expect(
    client.getQueriesData({
      queryKey: ['fleet', 'owner', 'provider', 'services'],
    }),
  ).toEqual([])
})
it.each([false, true])(
  'spending %s requires explicit confirmation and sends exact revision',
  async (enabled) => {
    vi.mocked(fleet.spending).mockResolvedValue({
      enabled,
      revision: '9007199254740993',
    })
    render(wrap(<SpendingEditor providerId="provider" driverId="driver" />))
    fireEvent.click(
      await screen.findByRole('button', {
        name: enabled ? 'Revocar gasto' : 'Habilitar gasto',
      }),
    )
    expect(fleet.setSpending).not.toHaveBeenCalled()
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirmar',
      }),
    )
    await waitFor(() =>
      expect(fleet.setSpending).toHaveBeenCalledWith('provider', 'driver', {
        requestId: expect.any(String),
        expectedRevision: '9007199254740993',
        enabled: !enabled,
      }),
    )
  },
)
it('lost spending response survives remount and repeats only the original body', async () => {
  vi.mocked(fleet.setSpending)
    .mockRejectedValueOnce(new ApiError(0, 'Sin respuesta'))
    .mockResolvedValue({ enabled: true, revision: '1' })
  const view = render(
    wrap(<SpendingEditor providerId="provider" driverId="driver" />),
  )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Habilitar gasto' }),
  )
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByRole('button', { name: 'Recuperar comando pendiente' })
  const original = vi.mocked(fleet.setSpending).mock.calls[0][2]
  view.unmount()
  vi.mocked(fleet.spending).mockResolvedValue({ enabled: true, revision: '99' })
  render(wrap(<SpendingEditor providerId="provider" driverId="driver" />))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Recuperar comando pendiente' }),
    ).toBeEnabled(),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Recuperar comando pendiente' }),
  )
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await waitFor(() => expect(fleet.setSpending).toHaveBeenCalledTimes(2))
  expect(vi.mocked(fleet.setSpending).mock.calls[1][2]).toEqual(original)
})
it('revision conflict rereads state, closes confirmation and requires new explicit review', async () => {
  vi.mocked(fleet.setSpending).mockRejectedValueOnce(
    new ApiError(409, 'Cambió', 'REVISION_CONFLICT'),
  )
  vi.mocked(fleet.spending)
    .mockResolvedValueOnce({ enabled: false, revision: '0' })
    .mockResolvedValue({ enabled: true, revision: '2' })
  render(wrap(<SpendingEditor providerId="provider" driverId="driver" />))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Habilitar gasto' }),
  )
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByRole('button', { name: 'Revocar gasto' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText(/La revisión cambió/)).toBeInTheDocument()
  expect(fleet.setSpending).toHaveBeenCalledTimes(1)
})
