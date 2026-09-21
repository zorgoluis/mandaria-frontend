import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { normalizeError } from '../services/errors'
import { driverPortal } from '../driver-portal/service'
import { independentDrivers } from '../independent-drivers/service'
import { providers } from '../providers/service'
import { drivers as providerDrivers } from '../drivers/service'
import type {
  DriverDispatch,
  DriverSelf,
  DriverVehicle,
} from '../driver-portal/types'
import type { IndependentDriverProfile } from '../independent-drivers/types'
import type { Role } from '../types/api'

vi.mock('../driver-portal/service', () => ({
  driverPortal: {
    me: vi.fn(),
    vehicles: vi.fn(),
    available: vi.fn(),
    get: vi.fn(),
    take: vi.fn(),
    release: vi.fn(),
  },
}))
vi.mock('../independent-drivers/service', () => ({
  independentDrivers: {
    list: vi.fn(),
    get: vi.fn(),
    enable: vi.fn(),
    suspend: vi.fn(),
    reject: vi.fn(),
    vehicles: vi.fn(),
    addVehicle: vi.fn(),
    updateVehicle: vi.fn(),
  },
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
  },
}))
vi.mock('../drivers/service', () => ({
  drivers: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))

const stamp = '2026-09-20T12:00:00Z'
const DRIVER_ID = '11111111-1111-4111-8111-111111111111'
const PROVIDER = '22222222-2222-4222-8222-222222222222'
const DISPATCH = '33333333-3333-4333-8333-333333333333'
const OTHER_DISPATCH = '44444444-4444-4444-8444-444444444444'
const MOTO = '55555555-5555-4555-8555-555555555555'
const BICI = '66666666-6666-4666-8666-666666666666'

const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / 20)),
  page: 1,
  pageSize: 20,
})
const vehicle = (
  id: string,
  identifier: string,
  status: DriverVehicle['status'] = 'ACTIVE',
): DriverVehicle => ({
  id,
  independentDriverProfileId: 'profile-1',
  identifier,
  type: 'MOTORCYCLE',
  status,
  brand: 'Italika',
  model: 'FT150',
  year: 2023,
  color: null,
  plate: null,
  createdAt: stamp,
  updatedAt: stamp,
})
function me(over: Partial<DriverSelf> = {}): DriverSelf {
  return {
    id: DRIVER_ID,
    name: 'Carlos',
    status: 'ACTIVE',
    availability: 'AVAILABLE',
    provider: {
      id: PROVIDER,
      name: 'Rápidos',
      code: 'RAPIDOS',
      status: 'ACTIVE',
    },
    currentAssignment: null,
    activeDeliveryAssignment: null,
    independent: {
      id: 'profile-1',
      status: 'APPROVED',
      approvedAt: stamp,
      suspendedAt: null,
      reason: null,
      canTakeServices: true,
    },
    ...over,
  }
}
function dispatch(over: Partial<DriverDispatch> = {}): DriverDispatch {
  return {
    id: DISPATCH,
    status: 'OPEN',
    access: 'OFFER',
    serviceType: 'LOCAL_DELIVERY',
    serviceZone: { code: 'OCOZO', name: 'Ocozocoautla' },
    openedAt: stamp,
    expiresAt: '2026-09-20T12:10:00Z',
    takenByMe: false,
    claimedAt: null,
    cancelledAt: null,
    assignment: null,
    service: {
      route: { distanceMeters: 4300, durationSeconds: 720 },
      pickup: { address: 'El Fogón', latitude: 16.76, longitude: -93.37 },
      dropoff: {
        address: 'Barrio San Ramón',
        latitude: 16.77,
        longitude: -93.38,
      },
      packages: [
        { category: 'FOOD', quantity: 1, weightKg: null, isFragile: false },
      ],
    },
    paymentContext: {
      deliveryFee: { amount: '60.00', currency: 'MXN' },
      goodsValue: { amount: '800.00', currency: 'MXN' },
      goodsPaymentMode: 'COURIER_ADVANCE',
      driverAdvancesGoods: true,
      driverAdvanceAmount: { amount: '800.00', currency: 'MXN' },
    },
    ...over,
  }
}
const prepaid = dispatch({
  id: OTHER_DISPATCH,
  paymentContext: {
    deliveryFee: { amount: '60.00', currency: 'MXN' },
    goodsValue: { amount: '800.00', currency: 'MXN' },
    goodsPaymentMode: 'PREPAID',
    driverAdvancesGoods: false,
    driverAdvanceAmount: null,
  },
})
const taken = dispatch({
  status: 'CLAIMED',
  access: 'OWNER',
  takenByMe: true,
  claimedAt: stamp,
  assignment: {
    id: 'assignment-1',
    mode: 'INDEPENDENT',
    assignedAt: stamp,
    vehicle: { id: MOTO, identifier: 'MOTO-IND-1', type: 'MOTORCYCLE' },
  },
  service: {
    ...dispatch().service,
    deliveryRequestPublicId: 'MDR-000500',
    pickup: {
      address: 'El Fogón',
      latitude: 16.76,
      longitude: -93.37,
      contactName: 'Cocina El Fogón',
      contactPhone: '+52 961 000 0001',
      instructions: null,
    },
  },
})
function profile(
  over: Partial<IndependentDriverProfile> = {},
): IndependentDriverProfile {
  return {
    id: 'profile-1',
    driverId: DRIVER_ID,
    status: 'APPROVED',
    approvedAt: stamp,
    approvedByUserId: 'admin-1',
    suspendedAt: null,
    suspendedByUserId: null,
    rejectedAt: null,
    rejectedByUserId: null,
    reason: null,
    createdAt: stamp,
    updatedAt: stamp,
    driver: {
      id: DRIVER_ID,
      name: 'Carlos',
      status: 'ACTIVE',
      availability: 'AVAILABLE',
      providerId: PROVIDER,
    },
    ...over,
  }
}

function mount(path: string, role: Role = 'DRIVER') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider
          value={{
            user: {
              id: 'user-1',
              email: 'carlos@example.test',
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
const section = async (name: string) =>
  within(await screen.findByRole('region', { name }))
const dialog = () => within(screen.getByRole('dialog'))

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(driverPortal.me).mockResolvedValue(me())
  vi.mocked(driverPortal.vehicles).mockResolvedValue([
    vehicle(MOTO, 'MOTO-IND-1'),
    vehicle(BICI, 'BICI-2', 'INACTIVE'),
  ])
  vi.mocked(driverPortal.available).mockResolvedValue(
    page([dispatch(), prepaid]),
  )
  vi.mocked(driverPortal.get).mockImplementation(async (id) =>
    id === OTHER_DISPATCH ? prepaid : dispatch(),
  )
  vi.mocked(independentDrivers.list).mockResolvedValue(page([profile()]))
  vi.mocked(independentDrivers.get).mockResolvedValue(profile())
  vi.mocked(independentDrivers.vehicles).mockResolvedValue([])
  vi.mocked(providers.list).mockResolvedValue(page([]))
  vi.mocked(providerDrivers.list).mockResolvedValue(page([]))
})

describe('portal access', () => {
  it('opens for an APPROVED independent driver', async () => {
    mount('/driver/services')
    expect(
      await screen.findByRole('heading', {
        name: 'Servicios disponibles',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Portal del repartidor' }),
    ).toBeInTheDocument()
  })
  it.each([
    [null, /todav[íi]a no te habilit[óo]/i],
    ['PENDING', /pendiente de revisi[óo]n/i],
    ['SUSPENDED', /suspendi[óo]/i],
    ['REJECTED', /no est[áa] vigente/i],
  ])('closes the portal when the capability is %s', async (status, text) => {
    vi.mocked(driverPortal.me).mockResolvedValue(
      me({
        independent:
          status === null
            ? null
            : {
                id: 'profile-1',
                status: status as 'PENDING',
                approvedAt: null,
                suspendedAt: null,
                reason: null,
                canTakeServices: false,
              },
      }),
    )
    mount('/driver/services')
    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no puedes tomar servicios',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(driverPortal.available).not.toHaveBeenCalled()
  })
})

describe('available services', () => {
  it('lists the services the backend returns with origin, destination, distance and fee', async () => {
    mount('/driver/services')
    const cards = await screen.findAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('El Fogón')
    expect(cards[0]).toHaveTextContent('Barrio San Ramón')
    expect(cards[0]).toHaveTextContent('4.3 km')
    expect(cards[0]).toHaveTextContent('$60.00 MXN')
    expect(
      within(cards[0]).getByRole('link', { name: 'VER SERVICIO' }),
    ).toHaveAttribute('href', `/driver/services/${DISPATCH}`)
    // The advance is flagged already in the list.
    expect(cards[0]).toHaveTextContent(/Requiere adelanto de \$800\.00 MXN/i)
    expect(cards[1]).not.toHaveTextContent(/Requiere adelanto/i)
  })
  it('shows an empty state without inventing services', async () => {
    vi.mocked(driverPortal.available).mockResolvedValue(page([]))
    mount('/driver/services')
    expect(
      await screen.findByRole('heading', {
        name: 'No hay servicios disponibles',
      }),
    ).toBeInTheDocument()
  })
})

describe('payment context', () => {
  it('COURIER_ADVANCE states the cash the driver must hand over', async () => {
    mount(`/driver/services/${DISPATCH}`)
    const money = await section('Cobro')
    expect(
      money.getByText(
        /Este servicio requiere que entregues \$800\.00 MXN al comercio al recoger el pedido/i,
      ),
    ).toBeInTheDocument()
    expect(money.getByText(/Mandaria no conoce tu saldo/i)).toBeInTheDocument()
    expect(money.getByText('$60.00 MXN')).toBeInTheDocument()
    // Fee and goods are never added together.
    expect(money.queryByText('$860.00 MXN')).toBeNull()
  })
  it('PREPAID shows no advance at all', async () => {
    mount(`/driver/services/${OTHER_DISPATCH}`)
    const money = await section('Cobro')
    expect(
      money.getByText(/ya está pagada al comercio: no adelantas dinero/i),
    ).toBeInTheDocument()
    expect(money.queryByText(/requiere que entregues/i)).toBeNull()
  })
})

describe('take', () => {
  it('sends one atomic call with the chosen vehicle and refetches afterwards', async () => {
    vi.mocked(driverPortal.take).mockResolvedValue(taken)
    vi.mocked(driverPortal.me)
      .mockResolvedValueOnce(me())
      .mockResolvedValue(
        me({
          activeDeliveryAssignment: {
            id: 'assignment-1',
            mode: 'INDEPENDENT',
            dispatchId: DISPATCH,
          },
        }),
      )
    mount(`/driver/services/${DISPATCH}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    await user.selectOptions(await dialog().findByLabelText('Vehículo'), MOTO)
    await user.click(dialog().getByRole('button', { name: 'CONFIRMAR' }))
    await waitFor(() =>
      expect(driverPortal.take).toHaveBeenCalledWith(DISPATCH, MOTO),
    )
    expect(driverPortal.take).toHaveBeenCalledTimes(1)
    // The driver's own state is read back instead of assumed.
    await waitFor(() =>
      expect(vi.mocked(driverPortal.me).mock.calls.length).toBeGreaterThan(1),
    )
  })
  it('offers only the active vehicles the backend returned', async () => {
    mount(`/driver/services/${DISPATCH}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    const select = await dialog().findByLabelText('Vehículo')
    const options = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toContain('MOTO-IND-1 · Motocicleta')
    expect(options.join(' ')).not.toContain('BICI-2')
  })
  it('refuses to confirm without a vehicle', async () => {
    mount(`/driver/services/${DISPATCH}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    await user.click(await dialog().findByRole('button', { name: 'CONFIRMAR' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Elige el veh[íi]culo/i,
    )
    expect(driverPortal.take).not.toHaveBeenCalled()
  })
  // TAKE_CONFLICT is the same lost race, detected by the database instead of the service.
  it.each(['DISPATCH_ALREADY_CLAIMED', 'TAKE_CONFLICT'])(
    'explains that a service someone else took is gone, and refreshes (%s)',
    async (code) => {
      vi.mocked(driverPortal.take).mockRejectedValue(
        normalizeError(409, {
          code,
          message: 'internal detail',
        }),
      )
      mount(`/driver/services/${DISPATCH}`)
      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
      )
      await user.selectOptions(await dialog().findByLabelText('Vehículo'), MOTO)
      await user.click(dialog().getByRole('button', { name: 'CONFIRMAR' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Este servicio ya no está disponible.',
      )
      expect(screen.getByRole('alert')).not.toHaveTextContent('internal detail')
      await waitFor(() =>
        expect(vi.mocked(driverPortal.me).mock.calls.length).toBeGreaterThan(1),
      )
    },
  )
  // Real backend: after losing the race the refetched detail is a 404 (ids cannot be probed).
  it('keeps saying the service is gone when the refetch after a lost race is a 404', async () => {
    vi.mocked(driverPortal.get)
      .mockResolvedValueOnce(dispatch())
      .mockRejectedValue(normalizeError(404, { message: 'Dispatch not found' }))
    vi.mocked(driverPortal.take).mockRejectedValue(
      normalizeError(409, { code: 'DISPATCH_ALREADY_CLAIMED', message: 'x' }),
    )
    mount(`/driver/services/${DISPATCH}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    await user.selectOptions(await dialog().findByLabelText('Vehículo'), MOTO)
    await user.click(dialog().getByRole('button', { name: 'CONFIRMAR' }))
    await waitFor(() =>
      expect(vi.mocked(driverPortal.get).mock.calls.length).toBeGreaterThan(1),
    )
    expect(
      await screen.findByText('Este servicio ya no está disponible.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver otros servicios' }),
    ).toHaveAttribute('href', '/driver/services')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    expect(screen.queryByText(/tu proveedor/i)).toBeNull()
  })
  it('treats a direct link to a service taken by someone else as gone', async () => {
    vi.mocked(driverPortal.get).mockRejectedValue(
      normalizeError(404, { message: 'Dispatch not found' }),
    )
    mount(`/driver/services/${DISPATCH}`)
    expect(
      await screen.findByText('Este servicio ya no está disponible.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'TOMAR SERVICIO' })).toBeNull()
  })
  it('does not offer a second service to a busy driver', async () => {
    vi.mocked(driverPortal.me).mockResolvedValue(
      me({
        activeDeliveryAssignment: {
          id: 'assignment-1',
          mode: 'INDEPENDENT',
          dispatchId: DISPATCH,
        },
      }),
    )
    mount('/driver/services')
    expect(
      await screen.findByRole('heading', {
        name: 'Ya tienes un servicio en curso',
      }),
    ).toBeInTheDocument()
    expect(driverPortal.available).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'TOMAR SERVICIO' })).toBeNull()
  })
})

describe('my service', () => {
  beforeEach(() => {
    vi.mocked(driverPortal.me).mockResolvedValue(
      me({
        activeDeliveryAssignment: {
          id: 'assignment-1',
          mode: 'INDEPENDENT',
          dispatchId: DISPATCH,
        },
      }),
    )
    vi.mocked(driverPortal.get).mockResolvedValue(taken)
  })
  it('shows origin, destination, vehicle, fee and payment context', async () => {
    mount('/driver/my-service')
    const panel = await section('Servicio actual')
    const value = (label: string) =>
      panel.getByText(label, { selector: 'dt' }).nextElementSibling
    expect(value('Origen')).toHaveTextContent('El Fogón')
    expect(value('Destino')).toHaveTextContent('Barrio San Ramón')
    expect(value('Vehículo')).toHaveTextContent('MOTO-IND-1 · Motocicleta')
    expect(value('Envío')).toHaveTextContent('$60.00 MXN')
    expect(panel.getByText(/Mandaria no conoce tu saldo/i)).toBeInTheDocument()
    // Contacts appear only once the service is owned.
    expect(value('Contacto en origen')).toHaveTextContent('Cocina El Fogón')
  })
  it('offers no execution steps and no reassignment', async () => {
    mount('/driver/my-service')
    await section('Servicio actual')
    for (const label of [
      'Llegué',
      'Recogí',
      'En camino',
      'Entregado',
      'REASIGNAR',
    ])
      expect(screen.queryByRole('button', { name: label })).toBeNull()
    expect(
      screen.getByText(/llegar[áa]n en una próxima versión/i),
    ).toBeInTheDocument()
  })
  it('releases with a reason and warns it returns to others', async () => {
    vi.mocked(driverPortal.release).mockResolvedValue(dispatch())
    mount('/driver/my-service')
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'LIBERAR SERVICIO' }),
    )
    expect(
      screen.getByText(/volver[áa] a estar disponible para otros/i),
    ).toBeInTheDocument()
    await user.click(
      dialog().getByRole('radio', { name: 'Emergencia personal' }),
    )
    await user.click(dialog().getByRole('button', { name: 'Liberar servicio' }))
    await waitFor(() =>
      expect(driverPortal.release).toHaveBeenCalledWith(
        DISPATCH,
        'PERSONAL_EMERGENCY',
        undefined,
      ),
    )
    await waitFor(() =>
      expect(vi.mocked(driverPortal.me).mock.calls.length).toBeGreaterThan(1),
    )
  })
  it('requires a detail for OTHER before calling the API', async () => {
    mount('/driver/my-service')
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'LIBERAR SERVICIO' }),
    )
    await user.click(dialog().getByRole('radio', { name: 'Otro motivo' }))
    await user.type(dialog().getByLabelText('Describe el motivo'), 'ab')
    await user.click(dialog().getByRole('button', { name: 'Liberar servicio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /entre 3 y 500 caracteres/i,
    )
    expect(driverPortal.release).not.toHaveBeenCalled()
  })
})

describe('super admin administration', () => {
  it('lists independent drivers and separates account from capability', async () => {
    mount('/independent-drivers', 'SUPER_ADMIN')
    expect(
      await screen.findByRole('heading', {
        name: 'Repartidores independientes',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/capacidad operativa adicional/i).length,
    ).toBeGreaterThan(0)
    const row = within(await screen.findByRole('table')).getAllByRole('row')[1]
    expect(row).toHaveTextContent('Carlos')
    expect(row).toHaveTextContent('Habilitado')
    expect(row).not.toHaveTextContent('APPROVED')
  })
  it('enables an existing eligible driver without creating accounts', async () => {
    vi.mocked(providers.list).mockResolvedValue(
      page([
        {
          id: PROVIDER,
          name: 'Rápidos',
          code: 'RAPIDOS',
          type: 'FLEET' as const,
          status: 'ACTIVE' as const,
          maxDrivers: 10,
          maxVehicles: 10,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ]),
    )
    vi.mocked(providerDrivers.list).mockResolvedValue(
      page([
        {
          id: DRIVER_ID,
          name: 'Carlos',
          status: 'ACTIVE' as const,
          availability: 'AVAILABLE' as const,
          userId: 'user-1',
          providerId: PROVIDER,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ]) as never,
    )
    vi.mocked(independentDrivers.enable).mockResolvedValue(profile())
    mount('/independent-drivers', 'SUPER_ADMIN')
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Habilitar repartidor' }),
    )
    await user.selectOptions(
      await dialog().findByLabelText('Proveedor'),
      PROVIDER,
    )
    await user.selectOptions(
      await dialog().findByLabelText('Repartidor'),
      DRIVER_ID,
    )
    await user.click(dialog().getByRole('button', { name: 'Habilitar' }))
    await waitFor(() =>
      expect(independentDrivers.enable).toHaveBeenCalledWith(
        DRIVER_ID,
        undefined,
      ),
    )
  })
  it('suspends with a mandatory reason and never changes the state locally first', async () => {
    vi.mocked(independentDrivers.suspend).mockResolvedValue(
      profile({ status: 'SUSPENDED', suspendedAt: stamp, reason: 'Papeles' }),
    )
    mount(`/independent-drivers/${DRIVER_ID}`, 'SUPER_ADMIN')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Suspender' }))
    // Empty is stopped by the field itself; too short is stopped before the API call.
    await user.type(dialog().getByLabelText('Motivo'), 'ab')
    await user.click(dialog().getByRole('button', { name: 'Suspender' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /entre 3 y 500 caracteres/i,
    )
    expect(independentDrivers.suspend).not.toHaveBeenCalled()
    await user.clear(dialog().getByLabelText('Motivo'))
    await user.type(dialog().getByLabelText('Motivo'), 'Documentación vencida')
    await user.click(dialog().getByRole('button', { name: 'Suspender' }))
    await waitFor(() =>
      expect(independentDrivers.suspend).toHaveBeenCalledWith(
        DRIVER_ID,
        'Documentación vencida',
      ),
    )
  })
  it('explains the 409 when the driver is executing a service', async () => {
    vi.mocked(independentDrivers.suspend).mockRejectedValue(
      normalizeError(409, {
        code: 'INDEPENDENT_DRIVER_HAS_ACTIVE_ASSIGNMENT',
        message: 'driver 1111 busy',
      }),
    )
    mount(`/independent-drivers/${DRIVER_ID}`, 'SUPER_ADMIN')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Suspender' }))
    await user.type(dialog().getByLabelText('Motivo'), 'Documentación vencida')
    await user.click(dialog().getByRole('button', { name: 'Suspender' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/est[áa] ejecutando un servicio/i)
    expect(alert).not.toHaveTextContent('1111')
  })
})

describe('role isolation', () => {
  it('keeps the driver portal away from SUPER_ADMIN and PROVIDER_ADMIN', async () => {
    for (const role of ['SUPER_ADMIN', 'PROVIDER_ADMIN'] as Role[]) {
      queryClient.clear()
      const view = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/driver/services']}>
            <AuthContext.Provider
              value={{
                user: {
                  id: 'user-2',
                  email: 'staff@example.test',
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
      expect(
        await screen.findByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      view.unmount()
    }
    expect(driverPortal.take).not.toHaveBeenCalled()
    expect(driverPortal.available).not.toHaveBeenCalled()
  })
  it('keeps independent administration away from DRIVER and PROVIDER_ADMIN', async () => {
    for (const role of ['DRIVER', 'PROVIDER_ADMIN'] as Role[]) {
      queryClient.clear()
      const view = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/independent-drivers']}>
            <AuthContext.Provider
              value={{
                user: {
                  id: 'user-3',
                  email: 'x@example.test',
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
      expect(
        await screen.findByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      view.unmount()
    }
    expect(independentDrivers.list).not.toHaveBeenCalled()
    expect(independentDrivers.enable).not.toHaveBeenCalled()
  })
  it('hides provider and admin sections from the driver menu', async () => {
    mount('/driver/services')
    await screen.findByRole('heading', { name: 'Servicios disponibles' })
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    for (const forbidden of [
      'Proveedores',
      'Administradores',
      'Integraciones',
      'Independientes',
      'Despachos',
    ])
      expect(links).not.toContain(forbidden)
    expect(links).toContain('Mi servicio')
  })
})
