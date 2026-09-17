import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { normalizeError } from '../services/errors'
import { adminDispatches, providerDispatches } from '../dispatch/service'
import { providers } from '../providers/service'
import type {
  AdminDispatch,
  DispatchService,
  ProviderDispatch,
} from '../dispatch/types'
import type { Role } from '../types/api'

vi.mock('../dispatch/service', () => ({
  providerDispatches: {
    list: vi.fn(),
    get: vi.fn(),
    claim: vi.fn(),
    release: vi.fn(),
  },
  adminDispatches: { list: vi.fn(), get: vi.fn() },
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
  },
}))

const stamp = '2026-09-16T12:00:00Z'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString()
const page = <T,>(items: T[], total = items.length) => ({
  items,
  total,
  totalPages: Math.max(1, Math.ceil(total / 20)),
  page: 1,
  pageSize: 20,
})
function service(overrides: Partial<DispatchService> = {}): DispatchService {
  return {
    deliveryFee: { amount: '50.00', currency: 'MXN' },
    route: { distanceMeters: 4700, durationSeconds: 780 },
    pickup: {
      address: 'Av. Central 123, Ocozocoautla',
      latitude: 16.7614,
      longitude: -93.3743,
    },
    dropoff: {
      address: 'Calle Norte 45, Ocozocoautla',
      latitude: 16.77,
      longitude: -93.38,
    },
    packages: [
      { category: 'FOOD', quantity: 2, weightKg: null, isFragile: false },
    ],
    goods: {
      paymentMode: 'COURIER_ADVANCE',
      value: '450.00',
      currency: 'MXN',
      driverAdvancesGoods: true,
    },
    ...overrides,
  }
}
function dispatch(overrides: Partial<ProviderDispatch> = {}): ProviderDispatch {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    status: 'OPEN',
    access: 'OFFER',
    serviceType: 'LOCAL_DELIVERY',
    serviceZone: { code: 'OCOZOCOAUTLA', name: 'Ocozocoautla' },
    openedAt: stamp,
    expiresAt: inMinutes(8),
    claimedByMe: false,
    claimedAt: null,
    cancelledAt: null,
    myCandidate: {
      status: 'OFFERED',
      offeredAt: stamp,
      claimedAt: null,
      releasedAt: null,
      releaseReason: null,
    },
    service: service(),
    ...overrides,
  }
}
const advance = dispatch()
const prepaid = dispatch({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  service: service({
    pickup: { address: 'Mercado Central', latitude: 16.76, longitude: -93.37 },
    goods: {
      paymentMode: 'PREPAID',
      value: '120.00',
      currency: 'MXN',
      driverAdvancesGoods: false,
    },
  }),
})
const owned = dispatch({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  status: 'CLAIMED',
  access: 'OWNER',
  claimedByMe: true,
  claimedAt: stamp,
  myCandidate: { ...advance.myCandidate!, status: 'CLAIMED', claimedAt: stamp },
  service: service({
    pickup: {
      address: 'Av. Central 123, Ocozocoautla',
      latitude: 16.7614,
      longitude: -93.3743,
      contactName: 'Restaurante Centro',
      contactPhone: '+52 961 000 0001',
      instructions: 'Entregar en mostrador',
    },
    dropoff: {
      address: 'Calle Norte 45, Ocozocoautla',
      latitude: 16.77,
      longitude: -93.38,
      contactName: 'Cliente Final',
      contactPhone: '+52 961 000 0002',
      instructions: null,
    },
    deliveryRequestPublicId: 'MDR-000900',
    externalReference: 'ORDER-9',
  }),
})
const takenByOther = dispatch({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  status: 'CLAIMED',
  access: 'SUMMARY',
  service: null,
})
const cancelled = dispatch({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  status: 'CANCELLED',
  access: 'SUMMARY',
  cancelledAt: stamp,
  service: null,
})
const releasedByMe = dispatch({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  status: 'OPEN',
  access: 'SUMMARY',
  myCandidate: {
    ...advance.myCandidate!,
    status: 'RELEASED',
    releasedAt: stamp,
    releaseReason: 'Sin repartidor disponible',
  },
  service: null,
})
const profile = (id: string, name: string) => ({
  id,
  name,
  code: name.toUpperCase().replace(/\W/g, '_'),
  type: 'FLEET' as const,
  status: 'ACTIVE' as const,
  membershipRole: 'OWNER' as const,
  limits: { maxDrivers: 10, maxVehicles: 10 },
})

function mount(path: string, role: Role = 'PROVIDER_ADMIN') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider
          value={{
            user: {
              id: 'user-1',
              email: 'central@example.test',
              role,
              active: true,
              emailVerifiedAt: null,
              createdAt: stamp,
              updatedAt: stamp,
            },
            loading: false,
            expired: false,
            error: null,
            login: vi.fn(),
            logout: vi.fn(),
            restore: vi.fn(),
          }}
        >
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const card = (address: string) =>
  screen
    .getAllByRole('article')
    .find((node) => node.textContent?.includes(address))!
const listCalls = () => vi.mocked(providerDispatches.list).mock.calls

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(providers.profiles).mockResolvedValue(
    page([profile(A, 'Rápidos A')]),
  )
  vi.mocked(providers.profile).mockImplementation(async (id) => {
    if (id !== A)
      throw normalizeError(403, { message: 'Provider access denied' })
    return profile(A, 'Rápidos A')
  })
  vi.mocked(providerDispatches.list).mockImplementation(async (_p, filters) =>
    page(
      filters.view === 'AVAILABLE'
        ? [advance, prepaid]
        : filters.view === 'CLAIMED'
          ? [owned]
          : [owned, takenByOther, cancelled, releasedByMe],
    ),
  )
})

describe('roles and navigation', () => {
  it('PROVIDER_ADMIN gets Servicios; SUPER_ADMIN gets Despachos without claiming', async () => {
    mount('/dashboard', 'PROVIDER_ADMIN')
    const nav = within(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    )
    expect(nav.getByRole('link', { name: 'Servicios' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Despachos' })).toBeNull()
    cleanup()
    vi.mocked(adminDispatches.list).mockResolvedValue(page([]))
    mount('/dispatches', 'SUPER_ADMIN')
    const adminNav = within(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    )
    expect(
      adminNav.getByRole('link', { name: 'Despachos' }),
    ).toBeInTheDocument()
    expect(adminNav.queryByRole('link', { name: 'Servicios' })).toBeNull()
    expect(await screen.findByText('No hay despachos.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /TOMAR|LIBERAR/i })).toBeNull()
  })
  it.each([
    ['/services', 'SUPER_ADMIN'],
    ['/services/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'SUPER_ADMIN'],
    ['/services', 'DRIVER'],
    ['/dispatches', 'PROVIDER_ADMIN'],
    ['/dispatches', 'DRIVER'],
  ] as [string, Role][])(
    '%s is blocked for %s without API calls',
    (path, role) => {
      mount(path, role)
      expect(
        screen.getByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      expect(providerDispatches.list).not.toHaveBeenCalled()
      expect(providerDispatches.get).not.toHaveBeenCalled()
      expect(adminDispatches.list).not.toHaveBeenCalled()
      if (role !== 'PROVIDER_ADMIN')
        expect(screen.queryByRole('link', { name: 'Servicios' })).toBeNull()
    },
  )
})

describe('available services', () => {
  it('lists claimable services with route, countdown and separated money', async () => {
    mount('/services')
    await screen.findByText('Av. Central 123, Ocozocoautla')
    expect(listCalls()[0]).toEqual([
      A,
      { page: 1, pageSize: 20, view: 'AVAILABLE', status: undefined },
      expect.any(AbortSignal),
    ])
    const first = within(card('Av. Central 123'))
    expect(first.getByText('Calle Norte 45, Ocozocoautla')).toBeInTheDocument()
    expect(first.getByText('4.7 km')).toBeInTheDocument()
    expect(first.getByText('13 min estimados')).toBeInTheDocument()
    expect(
      first.getByText('Costo del envío').nextElementSibling,
    ).toHaveTextContent('$50.00 MXN')
    expect(
      first.getByText('Valor de mercancía').nextElementSibling,
    ).toHaveTextContent('$450.00 MXN')
    expect(first.getByText('Adelanto por repartidor')).toBeInTheDocument()
    expect(
      first.getByText('El repartidor adelanta $450.00 MXN al recoger.'),
    ).toBeInTheDocument()
    expect(first.getByText(/Vence en \d+:\d{2}/)).toBeInTheDocument()
    expect(first.getByRole('button', { name: 'TOMAR SERVICIO' })).toBeEnabled()
    const second = within(card('Mercado Central'))
    expect(second.getByText('Mercancía prepagada')).toBeInTheDocument()
    expect(second.queryByText(/adelanta/)).toBeNull()
    const main = screen.getByRole('main')
    for (const raw of [
      'COURIER_ADVANCE',
      'PREPAID',
      'LOCAL_DELIVERY',
      'OFFERED',
      'OPEN',
    ])
      expect(main).not.toHaveTextContent(raw)
  })
  it('shows the empty state', async () => {
    vi.mocked(providerDispatches.list).mockResolvedValue(page([]))
    mount('/services')
    expect(
      await screen.findByRole('heading', {
        name: 'No hay servicios disponibles en este momento.',
      }),
    ).toBeInTheDocument()
  })
  it('does not reveal a non-candidate dispatch and cannot switch provider by query string', async () => {
    vi.mocked(providerDispatches.get).mockRejectedValue(
      normalizeError(404, { message: 'Dispatch not found' }),
    )
    mount(`/services/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1?providerId=${A}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El servicio no existe o no está disponible para tu proveedor.',
    )
    cleanup()
    queryClient.clear()
    mount(`/services?providerId=${B}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta no tiene una asociación vigente con este proveedor.',
    )
    expect(providers.profile).toHaveBeenCalledWith(B, expect.any(AbortSignal))
    expect(listCalls().some(([providerId]) => providerId === B)).toBe(false)
  })
  it('requires choosing among several memberships before listing', async () => {
    vi.mocked(providers.profiles).mockResolvedValue(
      page([profile(A, 'Rápidos A'), profile(B, 'Mandados B')]),
    )
    vi.mocked(providers.profile).mockImplementation(async (id) =>
      id === A ? profile(A, 'Rápidos A') : profile(B, 'Mandados B'),
    )
    mount('/services')
    expect(
      await screen.findByRole('heading', { name: 'Selecciona un proveedor' }),
    ).toBeInTheDocument()
    expect(providerDispatches.list).not.toHaveBeenCalled()
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Seleccionar proveedor'), B)
    await waitFor(() => expect(listCalls().at(-1)?.[0]).toBe(B))
  })
  it.each([
    [401, 'La sesión expiró'],
    [403, 'No tienes permisos'],
    [429, 'Demasiados intentos'],
    [500, 'no está disponible'],
    [0, 'No se pudo conectar'],
  ])('handles list error %i', async (status, text) => {
    vi.mocked(providerDispatches.list).mockRejectedValue(
      normalizeError(status, { message: 'raw' }),
    )
    mount('/services')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(alert).not.toHaveTextContent('raw')
  })
})

describe('claim', () => {
  async function openClaim(address = 'Av. Central 123') {
    mount('/services')
    const actor = userEvent.setup()
    await screen.findByText('Av. Central 123, Ocozocoautla')
    await actor.click(
      within(card(address)).getByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    return { actor, dialog: within(screen.getByRole('dialog')) }
  }
  it('confirms with route and money, waits for the backend and moves to Mis servicios', async () => {
    let resolve!: (value: ProviderDispatch) => void
    vi.mocked(providerDispatches.claim).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { actor, dialog } = await openClaim()
    expect(
      dialog.getByText('Av. Central 123, Ocozocoautla'),
    ).toBeInTheDocument()
    expect(dialog.getByText('Calle Norte 45, Ocozocoautla')).toBeInTheDocument()
    expect(dialog.getByText('$50.00 MXN')).toBeInTheDocument()
    expect(
      dialog.getByText('El repartidor adelanta $450.00 MXN al recoger.'),
    ).toBeInTheDocument()
    expect(providerDispatches.claim).not.toHaveBeenCalled()
    await actor.click(dialog.getByRole('button', { name: 'Confirmar y tomar' }))
    await waitFor(() =>
      expect(providerDispatches.claim).toHaveBeenCalledWith(A, advance.id),
    )
    // No optimistic ownership while the backend has not answered.
    expect(screen.queryByText('Servicio tomado correctamente.')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Disponibles' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    resolve(owned)
    expect(
      await screen.findByText('Servicio tomado correctamente.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: 'Mis servicios' }),
      ).toHaveAttribute('aria-selected', 'true'),
    )
    await waitFor(() =>
      expect(listCalls().some(([, f]) => f.view === 'CLAIMED')).toBe(true),
    )
    expect(
      await screen.findByRole('button', { name: 'LIBERAR SERVICIO' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Asignar/ })).toBeNull()
  })
  it('explains a lost race (409) and refreshes the list', async () => {
    vi.mocked(providerDispatches.claim).mockRejectedValue(
      normalizeError(409, {
        code: 'DISPATCH_ALREADY_CLAIMED',
        message: 'Dispatch was already claimed by another provider',
      }),
    )
    const { actor, dialog } = await openClaim()
    const before = listCalls().length
    await actor.click(dialog.getByRole('button', { name: 'Confirmar y tomar' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Este servicio ya fue tomado por otro proveedor.',
    )
    expect(screen.getByRole('dialog')).not.toHaveTextContent('already claimed')
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
    expect(screen.queryByText('Servicio tomado correctamente.')).toBeNull()
    await actor.click(dialog.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it.each([
    ['DISPATCH_EXPIRED', 409, 'El tiempo para tomar este servicio terminó.'],
    ['DISPATCH_CANCELLED', 409, 'La solicitud fue cancelada'],
    ['DISPATCH_RECLAIM_NOT_ALLOWED', 409, 'no puede volver a tomarlo'],
    ['PROVIDER_NOT_ELIGIBLE', 409, 'ya no está habilitado'],
    [
      undefined,
      404,
      'El servicio no existe o no está disponible para tu proveedor.',
    ],
  ])('ends the dialog for final outcome %s', async (code, status, text) => {
    vi.mocked(providerDispatches.claim).mockRejectedValue(
      normalizeError(status, {
        code,
        message: status === 404 ? 'Dispatch not found' : 'raw',
      }),
    )
    const { actor, dialog } = await openClaim()
    await actor.click(dialog.getByRole('button', { name: 'Confirmar y tomar' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(text)
    expect(
      dialog.queryByRole('button', { name: 'Confirmar y tomar' }),
    ).toBeNull()
  })
  it.each([
    [429, 'Demasiados intentos'],
    [500, 'no está disponible'],
    [0, 'No se pudo conectar'],
    [400, 'Revisa los campos'],
  ])('keeps the dialog retryable for %i', async (status, text) => {
    vi.mocked(providerDispatches.claim).mockRejectedValue(
      normalizeError(status, null),
    )
    const { actor, dialog } = await openClaim()
    await actor.click(dialog.getByRole('button', { name: 'Confirmar y tomar' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(text)
    expect(
      dialog.getByRole('button', { name: 'Confirmar y tomar' }),
    ).toBeEnabled()
  })
})

describe('expiration', () => {
  it('disables claiming a service whose window the UI already saw end', async () => {
    vi.mocked(providerDispatches.list).mockResolvedValue(
      page([
        dispatch({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
      ]),
    )
    mount('/services')
    const button = await screen.findByRole('button', {
      name: 'Tiempo terminado',
    })
    expect(button).toBeDisabled()
    expect(
      screen.getByText('Tiempo terminado', { selector: '.countdown' }),
    ).toBeInTheDocument()
    expect(providerDispatches.claim).not.toHaveBeenCalled()
  })
  it('does not send a claim when the window ends while confirming', async () => {
    vi.mocked(providerDispatches.list).mockResolvedValue(
      page([
        dispatch({ expiresAt: new Date(Date.now() + 1500).toISOString() }),
      ]),
    )
    mount('/services')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    await new Promise((r) => setTimeout(r, 1700))
    await actor.click(dialog.getByRole('button', { name: 'Confirmar y tomar' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'El tiempo para tomar este servicio terminó.',
    )
    expect(providerDispatches.claim).not.toHaveBeenCalled()
  })
})

describe('my services and release', () => {
  async function openRelease() {
    mount('/services?tab=claimed')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'LIBERAR SERVICIO' }),
    )
    return { actor, dialog: within(screen.getByRole('dialog')) }
  }
  it('lists claimed services and releases with a preset reason after the warning', async () => {
    const { actor, dialog } = await openRelease()
    expect(listCalls()[0][1]).toMatchObject({ view: 'CLAIMED' })
    expect(
      dialog.getByText('Si liberas este servicio, no podrás volver a tomarlo.'),
    ).toBeInTheDocument()
    vi.mocked(providerDispatches.release).mockResolvedValue({
      ...owned,
      status: 'OPEN',
      access: 'SUMMARY',
      claimedByMe: false,
      service: null,
    })
    vi.mocked(providerDispatches.list).mockResolvedValue(page([]))
    await actor.click(dialog.getByLabelText('Problema con vehículo'))
    await actor.click(dialog.getByRole('button', { name: 'Liberar servicio' }))
    await waitFor(() =>
      expect(providerDispatches.release).toHaveBeenCalledWith(
        A,
        owned.id,
        'Problema con vehículo',
      ),
    )
    expect(await screen.findByText('Servicio liberado.')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: 'No tienes servicios tomados.',
      }),
    ).toBeInTheDocument()
  })
  it('validates a free-text reason within the DTO limits', async () => {
    vi.mocked(providerDispatches.release).mockResolvedValue(owned)
    const { actor, dialog } = await openRelease()
    await actor.click(dialog.getByLabelText('Otro'))
    await actor.type(dialog.getByLabelText('Describe el motivo'), ' ab ')
    await actor.click(dialog.getByRole('button', { name: 'Liberar servicio' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'entre 3 y 500 caracteres',
    )
    expect(providerDispatches.release).not.toHaveBeenCalled()
    await actor.type(
      dialog.getByLabelText('Describe el motivo'),
      'c lluvia fuerte ',
    )
    await actor.click(dialog.getByRole('button', { name: 'Liberar servicio' }))
    await waitFor(() =>
      expect(providerDispatches.release).toHaveBeenCalledWith(
        A,
        owned.id,
        'ab c lluvia fuerte',
      ),
    )
  })
  it('explains a release that no longer applies (409)', async () => {
    vi.mocked(providerDispatches.release).mockRejectedValue(
      normalizeError(409, { code: 'DISPATCH_NOT_CLAIMED_BY_PROVIDER' }),
    )
    const { actor, dialog } = await openRelease()
    await actor.click(dialog.getByRole('button', { name: 'Liberar servicio' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Este servicio ya no está tomado por tu proveedor.',
    )
  })
  it('history shows summaries without invalid actions and filters by real status', async () => {
    mount('/services?tab=history')
    expect(
      await screen.findByText('Este servicio fue tomado por otro proveedor.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'La solicitud fue cancelada; el servicio ya no está disponible.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Tu proveedor liberó este servicio y no puede volver a tomarlo.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryAllByRole('button', { name: 'TOMAR SERVICIO' }),
    ).toHaveLength(0)
    expect(
      screen.getAllByRole('button', { name: 'LIBERAR SERVICIO' }),
    ).toHaveLength(1)
    await userEvent
      .setup()
      .selectOptions(
        screen.getByLabelText('Filtrar servicios por estado'),
        'EXPIRED',
      )
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]).toEqual({
        page: 1,
        pageSize: 20,
        view: 'ALL',
        status: 'EXPIRED',
      }),
    )
  })
  it('paginates with the backend contract', async () => {
    vi.mocked(providerDispatches.list).mockResolvedValue(page([advance], 25))
    mount('/services')
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]).toMatchObject({
        page: 2,
        view: 'AVAILABLE',
      }),
    )
  })
})

describe('detail', () => {
  it('OWNER sees contacts, release and no driver assignment yet', async () => {
    vi.mocked(providerDispatches.get).mockResolvedValue(owned)
    mount(`/services/${owned.id}?providerId=${A}`)
    expect(
      await screen.findByRole('heading', { name: 'MDR-000900', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Restaurante Centro')).toBeInTheDocument()
    expect(screen.getByText('+52 961 000 0001')).toBeInTheDocument()
    expect(
      screen.getByText(/asignación de repartidor y vehículo llegará/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'LIBERAR SERVICIO' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Asignar/ })).toBeNull()
    expect(providerDispatches.get).toHaveBeenCalledWith(
      A,
      owned.id,
      expect.any(AbortSignal),
    )
  })
  it('OFFER hides contacts until the claim and can claim from the detail', async () => {
    vi.mocked(providerDispatches.get)
      .mockResolvedValueOnce(advance)
      .mockResolvedValue(owned)
    vi.mocked(providerDispatches.claim).mockResolvedValue(owned)
    mount(`/services/${advance.id}?providerId=${A}`)
    expect(
      await screen.findByText(/contactos e instrucciones se muestran/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Restaurante Centro')).toBeNull()
    const actor = userEvent.setup()
    await actor.click(screen.getByRole('button', { name: 'TOMAR SERVICIO' }))
    await actor.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirmar y tomar',
      }),
    )
    expect(
      await screen.findByText('Servicio tomado correctamente.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Restaurante Centro')).toBeInTheDocument()
  })
})

describe('SUPER_ADMIN audit', () => {
  const audit: AdminDispatch = {
    id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    status: 'CANCELLED',
    openedAt: stamp,
    expiresAt: stamp,
    claimedByProviderId: A,
    claimedAt: stamp,
    expiredAt: null,
    cancelledAt: stamp,
    cancellationReason: 'DELIVERY_REQUEST_CANCELLED',
    createdAt: stamp,
    updatedAt: stamp,
    deliveryRequest: {
      publicId: 'MDR-000901',
      status: 'CANCELLED',
      integrationClientId: 'x',
    },
    deliveryQuote: {
      publicId: 'MQ-000901',
      serviceType: 'LOCAL_DELIVERY',
      serviceZone: { id: 'z', name: 'Ocozocoautla', code: 'OCO' },
      amount: '50.00',
      currency: 'MXN',
    },
    noProviderAvailable: false,
    candidates: [
      {
        provider: { id: A, name: 'Rápidos A', code: 'A' },
        status: 'CLAIMED',
        offeredAt: stamp,
        claimedAt: stamp,
        releasedAt: null,
        releaseReason: null,
      },
      {
        provider: { id: B, name: 'Mandados B', code: 'B' },
        status: 'RELEASED',
        offeredAt: stamp,
        claimedAt: stamp,
        releasedAt: stamp,
        releaseReason: 'Sin repartidor disponible',
      },
    ],
    goods: {
      paymentMode: 'PREPAID',
      value: '120.00',
      currency: 'MXN',
      driverAdvancesGoods: false,
    },
  }
  it('lists and filters dispatches read-only', async () => {
    vi.mocked(adminDispatches.list).mockResolvedValue(
      page([
        audit,
        {
          ...audit,
          id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
          status: 'OPEN',
          claimedByProviderId: null,
          noProviderAvailable: true,
        },
      ]),
    )
    mount('/dispatches', 'SUPER_ADMIN')
    const table = await screen.findByRole('table')
    expect(table).toHaveTextContent('MDR-000901')
    expect(table).toHaveTextContent('Rápidos A')
    expect(table).toHaveTextContent('Sin proveedor disponible')
    expect(table).toHaveTextContent('$50.00 MXN')
    await userEvent
      .setup()
      .selectOptions(
        screen.getByLabelText('Filtrar despachos por estado'),
        'CLAIMED',
      )
    await waitFor(() =>
      expect(
        vi.mocked(adminDispatches.list).mock.calls.at(-1)?.[0],
      ).toMatchObject({ status: 'CLAIMED', page: 1 }),
    )
    expect(screen.queryByRole('button', { name: /TOMAR|LIBERAR/ })).toBeNull()
  })
  it('shows candidates, release reasons and a translated cancellation', async () => {
    vi.mocked(adminDispatches.get).mockResolvedValue(audit)
    mount(`/dispatches/${audit.id}`, 'SUPER_ADMIN')
    expect(
      await screen.findByRole('heading', { name: 'Despacho de MDR-000901' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('La solicitud de entrega fue cancelada.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sin repartidor disponible')).toBeInTheDocument()
    const released = within(
      screen.getByRole('region', { name: /Candidatos/ }),
    ).getByRole('row', { name: /Mandados B/ })
    expect(released).toHaveTextContent('Liberado')
    expect(screen.getByText('Mercancía prepagada')).toBeInTheDocument()
    expect(screen.getByRole('main')).not.toHaveTextContent(
      'DELIVERY_REQUEST_CANCELLED',
    )
    expect(screen.queryByRole('button', { name: /TOMAR|LIBERAR/ })).toBeNull()
  })
})
