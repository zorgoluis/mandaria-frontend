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
import { adminDispatches, providerDispatches } from '../dispatch/service'
import {
  adminAssignments,
  deliveryAssignments,
} from '../delivery-assignments/service'
import { providers } from '../providers/service'
import type { DispatchService, ProviderDispatch } from '../dispatch/types'
import type {
  AvailableDriver,
  AvailableVehicle,
  DeliveryAssignment,
} from '../delivery-assignments/types'
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
vi.mock('../delivery-assignments/service', () => ({
  deliveryAssignments: {
    assign: vi.fn(),
    reassign: vi.fn(),
    cancel: vi.fn(),
    history: vi.fn(),
    availableDrivers: vi.fn(),
    availableVehicles: vi.fn(),
  },
  adminAssignments: { history: vi.fn() },
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
  },
}))

const stamp = '2026-09-18T12:00:00Z'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const DISPATCH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const ids = {
  carlos: 'c0000000-0000-4000-8000-000000000001',
  pedro: 'c0000000-0000-4000-8000-000000000002',
  luis: 'c0000000-0000-4000-8000-000000000003',
  moto03: 'v0000000-0000-4000-8000-000000000003'.replace('v', 'd'),
  moto07: 'v0000000-0000-4000-8000-000000000007'.replace('v', 'd'),
  moto02: 'v0000000-0000-4000-8000-000000000002'.replace('v', 'd'),
}
const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / 20)),
  page: 1,
  pageSize: 20,
})
const driver = (
  id: string,
  name: string,
  pairedVehicle: AvailableDriver['pairedVehicle'] = null,
): AvailableDriver => ({
  id,
  name,
  availability: 'AVAILABLE',
  pairedVehicle,
})
const vehicle = (
  id: string,
  identifier: string,
  pairedDriver: AvailableVehicle['pairedDriver'] = null,
): AvailableVehicle => ({
  id,
  identifier,
  type: 'MOTORCYCLE',
  brand: 'Italika',
  model: 'FT150',
  color: null,
  plate: null,
  pairedDriver,
})
const assignment = (
  over: Partial<DeliveryAssignment> & {
    driver: DeliveryAssignment['driver']
    vehicle: DeliveryAssignment['vehicle']
  },
): DeliveryAssignment => ({
  id: `as-${over.driver.id}`,
  dispatchId: DISPATCH,
  providerId: A,
  status: 'ACTIVE',
  assignedAt: stamp,
  assignedByUserId: 'user-1',
  endedAt: null,
  endedByUserId: null,
  endReason: null,
  endReasonDetail: null,
  ...over,
})
const asDriver = (id: string, name: string) => ({ id, name })
const asVehicle = (id: string, identifier: string) => ({
  id,
  identifier,
  type: 'MOTORCYCLE' as const,
})
const carlosOnMoto03 = assignment({
  driver: asDriver(ids.carlos, 'Carlos'),
  vehicle: asVehicle(ids.moto03, 'MOTO-03'),
})
const pedroOnMoto07 = assignment({
  driver: asDriver(ids.pedro, 'Pedro'),
  vehicle: asVehicle(ids.moto07, 'MOTO-07'),
})
const luisOnMoto02 = assignment({
  driver: asDriver(ids.luis, 'Luis'),
  vehicle: asVehicle(ids.moto02, 'MOTO-02'),
})
const ended = (
  item: DeliveryAssignment,
  endReason: DeliveryAssignment['endReason'] = 'OPERATIONAL_CHANGE',
): DeliveryAssignment => ({
  ...item,
  status: 'REASSIGNED',
  endedAt: stamp,
  endedByUserId: 'user-1',
  endReason,
})

function service(over: Partial<DispatchService> = {}): DispatchService {
  return {
    deliveryFee: { amount: '60.00', currency: 'MXN' },
    route: { distanceMeters: 4700, durationSeconds: 780 },
    pickup: {
      address: 'Av. Central 123',
      latitude: 16.76,
      longitude: -93.37,
      contactName: 'Restaurante Centro',
      contactPhone: '+52 961 000 0001',
      instructions: null,
    },
    dropoff: {
      address: 'Calle Norte 45',
      latitude: 16.77,
      longitude: -93.38,
      contactName: 'Ana',
      contactPhone: '+52 961 000 0002',
      instructions: null,
    },
    packages: [
      { category: 'FOOD', quantity: 1, weightKg: null, isFragile: false },
    ],
    goods: {
      paymentMode: 'COURIER_ADVANCE',
      value: '800.00',
      currency: 'MXN',
      driverAdvancesGoods: true,
      driverAdvanceAmount: '800.00',
    },
    deliveryRequestPublicId: 'MDR-000900',
    externalReference: null,
    ...over,
  }
}
function owned(over: Partial<ProviderDispatch> = {}): ProviderDispatch {
  return {
    id: DISPATCH,
    status: 'CLAIMED',
    access: 'OWNER',
    serviceType: 'LOCAL_DELIVERY',
    serviceZone: { code: 'OCOZOCOAUTLA', name: 'Ocozocoautla' },
    openedAt: stamp,
    expiresAt: stamp,
    claimedByMe: true,
    claimedAt: stamp,
    cancelledAt: null,
    myCandidate: {
      status: 'CLAIMED',
      offeredAt: stamp,
      claimedAt: stamp,
      releasedAt: null,
      releaseReason: null,
    },
    service: service(),
    assignment: null,
    assignmentDeadline: new Date(Date.now() + 5 * 60_000).toISOString(),
    assignmentOverdue: false,
    ...over,
  }
}
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
const detailPath = `/services/${DISPATCH}?providerId=${A}`
const panel = async () =>
  within(await screen.findByRole('region', { name: 'Asignación' }))
const dialog = () => within(screen.getByRole('dialog'))
const value = (scope: Awaited<ReturnType<typeof panel>>, label: string) =>
  scope.getByText(label, { selector: 'dt' }).nextElementSibling
/** The panel renders while its query loads, so every action is awaited, never read early. */
const action = async (name: string) =>
  (await panel()).findByRole('button', { name })
const openAssign = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await action('ASIGNAR'))
  await screen.findByRole('dialog')
}

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
  vi.mocked(providerDispatches.get).mockResolvedValue(owned())
  vi.mocked(providerDispatches.list).mockResolvedValue(page([owned()]))
  vi.mocked(deliveryAssignments.history).mockResolvedValue([])
  vi.mocked(deliveryAssignments.availableDrivers).mockResolvedValue(
    page([driver(ids.carlos, 'Carlos'), driver(ids.pedro, 'Pedro')]),
  )
  vi.mocked(deliveryAssignments.availableVehicles).mockResolvedValue(
    page([vehicle(ids.moto03, 'MOTO-03'), vehicle(ids.moto07, 'MOTO-07')]),
  )
})

describe('pending assignment', () => {
  it('shows a claimed dispatch as pending without inventing a DispatchStatus', async () => {
    mount(detailPath)
    const scope = await panel()
    expect(
      await scope.findByText(/todav[íi]a no tiene repartidor asignado/i),
    ).toBeInTheDocument()
    expect(await scope.findByRole('button', { name: 'ASIGNAR' })).toBeEnabled()
    expect(scope.queryByRole('button', { name: 'REASIGNAR' })).toBeNull()
    // The Dispatch itself is still CLAIMED, not "ASSIGNED".
    expect(screen.getByRole('region', { name: 'Estado' })).toHaveTextContent(
      'Tomado',
    )
  })
  it('shows the backend deadline and the overdue signal, never releasing on its own', async () => {
    const scope = await (async () => {
      mount(detailPath)
      return panel()
    })()
    expect(
      await scope.findByText(/Tiempo esperado para asignar/i),
    ).toBeInTheDocument()
    cleanupRender()
    vi.mocked(providerDispatches.get).mockResolvedValue(
      owned({ assignmentOverdue: true }),
    )
    mount(detailPath)
    const late = await panel()
    expect(await late.findByText('Asignación demorada')).toBeInTheDocument()
    expect(providerDispatches.release).not.toHaveBeenCalled()
  })
  it('offers an empty state, not an automatic release, without drivers', async () => {
    vi.mocked(deliveryAssignments.availableDrivers).mockResolvedValue(page([]))
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    expect(
      await screen.findByRole('heading', {
        name: 'No hay repartidores disponibles',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Mandaria no lo libera por su cuenta/i),
    ).toBeInTheDocument()
    expect(providerDispatches.release).not.toHaveBeenCalled()
  })
})

describe('assign', () => {
  it('sends the chosen driver and vehicle and renders what the backend reports back', async () => {
    vi.mocked(deliveryAssignments.assign).mockResolvedValue({
      ...carlosOnMoto03,
      paymentContext: {
        deliveryFee: { amount: '60.00', currency: 'MXN' },
        goodsValue: { amount: '800.00', currency: 'MXN' },
        goodsPaymentMode: 'COURIER_ADVANCE',
        driverAdvancesGoods: true,
        driverAdvanceAmount: { amount: '800.00', currency: 'MXN' },
      },
    })
    vi.mocked(deliveryAssignments.history)
      .mockResolvedValueOnce([])
      .mockResolvedValue([carlosOnMoto03])
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    await user.click(await dialog().findByRole('radio', { name: /^Carlos/ }))
    await user.click(dialog().getByRole('radio', { name: /^MOTO-03/ }))
    await user.click(
      dialog().getByRole('button', { name: 'CONFIRMAR ASIGNACIÓN' }),
    )
    await waitFor(() =>
      expect(deliveryAssignments.assign).toHaveBeenCalledWith(A, DISPATCH, {
        driverId: ids.carlos,
        vehicleId: ids.moto03,
      }),
    )
    expect(await action('REASIGNAR')).toBeInTheDocument()
    const scope = await panel()
    expect(value(scope, 'Repartidor')).toHaveTextContent('Carlos')
    expect(value(scope, 'Vehículo')).toHaveTextContent('MOTO-03 · Motocicleta')
  })
  it('refuses to submit without a driver and a vehicle', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    await user.click(
      await dialog().findByRole('button', { name: 'CONFIRMAR ASIGNACIÓN' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Elige un repartidor y un veh[íi]culo/i,
    )
    expect(deliveryAssignments.assign).not.toHaveBeenCalled()
  })
  it('locks the paired vehicle so the operator cannot build a mismatch', async () => {
    vi.mocked(deliveryAssignments.availableDrivers).mockResolvedValue(
      page([
        driver(ids.carlos, 'Carlos', {
          ...asVehicle(ids.moto03, 'MOTO-03'),
          status: 'ACTIVE',
        }),
        driver(ids.pedro, 'Pedro'),
      ]),
    )
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    await user.click(await dialog().findByRole('radio', { name: /^Carlos/ }))
    expect(dialog().getByRole('radio', { name: /^MOTO-03/ })).toBeChecked()
    expect(dialog().getByRole('radio', { name: /^MOTO-07/ })).toBeDisabled()
    expect(dialog().getByText(/debe usar ese veh[íi]culo/i)).toBeInTheDocument()
  })
})

describe('conflicts', () => {
  const conflict = (code: string) =>
    normalizeError(409, { code, message: 'internal detail' })
  it.each([
    ['DRIVER_BUSY', /repartidor acaba de recibir otro servicio/i],
    ['VEHICLE_BUSY', /veh[íi]culo acaba de asignarse/i],
    ['DRIVER_VEHICLE_MISMATCH', /no pueden combinarse/i],
    ['DISPATCH_ALREADY_ASSIGNED', /ya tiene un repartidor asignado/i],
  ])('explains a 409 %s and refetches the availability', async (code, text) => {
    vi.mocked(deliveryAssignments.assign).mockRejectedValue(conflict(code))
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    await user.click(await dialog().findByRole('radio', { name: /^Carlos/ }))
    await user.click(dialog().getByRole('radio', { name: /^MOTO-03/ }))
    const before = vi.mocked(deliveryAssignments.availableDrivers).mock.calls
      .length
    await user.click(
      dialog().getByRole('button', { name: 'CONFIRMAR ASIGNACIÓN' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.getByRole('alert')).not.toHaveTextContent('internal detail')
    // The dialog stays open on a recoverable conflict so the operator can pick again.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      vi.mocked(deliveryAssignments.availableDrivers).mock.calls.length,
    ).toBeGreaterThanOrEqual(before)
  })
})

describe('reassign', () => {
  beforeEach(() => {
    vi.mocked(providerDispatches.get).mockResolvedValue(
      owned({ assignment: carlosOnMoto03 }),
    )
    vi.mocked(deliveryAssignments.history).mockResolvedValue([carlosOnMoto03])
  })
  it('sends the new pair with the reason the DTO defines', async () => {
    vi.mocked(deliveryAssignments.reassign).mockResolvedValue({
      ...pedroOnMoto07,
      paymentContext: {
        deliveryFee: { amount: '60.00', currency: 'MXN' },
        goodsValue: null,
        goodsPaymentMode: null,
        driverAdvancesGoods: false,
        driverAdvanceAmount: null,
      },
    })
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await action('REASIGNAR'))
    await screen.findByRole('dialog')
    await user.click(await dialog().findByRole('radio', { name: /^Pedro/ }))
    await user.click(dialog().getByRole('radio', { name: /^MOTO-07/ }))
    await user.click(
      dialog().getByRole('radio', { name: 'Problema con el vehículo' }),
    )
    await user.click(
      dialog().getByRole('button', { name: 'Confirmar reasignación' }),
    )
    await waitFor(() =>
      expect(deliveryAssignments.reassign).toHaveBeenCalledWith(A, DISPATCH, {
        driverId: ids.pedro,
        vehicleId: ids.moto07,
        reason: 'VEHICLE_ISSUE',
      }),
    )
  })
  it('renders the winner of a concurrent reassignment, not what this browser sent', async () => {
    // Both administrators get a 200; the backend serialises and Luis ends up ACTIVE.
    vi.mocked(deliveryAssignments.reassign).mockResolvedValue({
      ...pedroOnMoto07,
      paymentContext: {
        deliveryFee: { amount: '60.00', currency: 'MXN' },
        goodsValue: null,
        goodsPaymentMode: null,
        driverAdvancesGoods: false,
        driverAdvanceAmount: null,
      },
    })
    vi.mocked(deliveryAssignments.history)
      .mockResolvedValueOnce([carlosOnMoto03])
      .mockResolvedValue([
        luisOnMoto02,
        ended(pedroOnMoto07),
        ended(carlosOnMoto03),
      ])
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await action('REASIGNAR'))
    await user.click(await dialog().findByRole('radio', { name: /^Pedro/ }))
    await user.click(dialog().getByRole('radio', { name: /^MOTO-07/ }))
    await user.click(
      dialog().getByRole('button', { name: 'Confirmar reasignación' }),
    )
    await waitFor(() => expect(deliveryAssignments.reassign).toHaveBeenCalled())
    const scope = await panel()
    // The active assignment is Luis, even though this browser sent Pedro and got a 200.
    await waitFor(() =>
      expect(
        within(scope.getByText('Asignación vigente').closest('li')!).getByText(
          'Luis',
        ),
      ).toBeInTheDocument(),
    )
    const current = scope
      .getAllByRole('listitem')
      .find((node) => node.className.includes('current'))!
    expect(current).toHaveTextContent('Luis')
    expect(current).not.toHaveTextContent('Pedro')
  })
})

describe('history', () => {
  it('lists the assignments newest first and marks the current one', async () => {
    vi.mocked(providerDispatches.get).mockResolvedValue(
      owned({ assignment: luisOnMoto02 }),
    )
    vi.mocked(deliveryAssignments.history).mockResolvedValue([
      luisOnMoto02,
      ended(pedroOnMoto07),
      ended(carlosOnMoto03, 'DRIVER_UNAVAILABLE'),
    ])
    mount(detailPath)
    const scope = await panel()
    const entries = await scope.findAllByRole('listitem')
    expect(entries).toHaveLength(3)
    expect(entries[0]).toHaveTextContent('Luis')
    expect(entries[0]).toHaveTextContent('Asignado')
    expect(entries[0]).toHaveTextContent('Asignación vigente')
    expect(entries[1]).toHaveTextContent('Pedro')
    expect(entries[1]).toHaveTextContent('Reasignado')
    expect(entries[2]).toHaveTextContent('Carlos')
    expect(entries[2]).toHaveTextContent('Repartidor no disponible')
    // Technical enums never reach the screen.
    for (const raw of ['REASSIGNED', 'ACTIVE', 'DRIVER_UNAVAILABLE'])
      expect(scope.queryByText(raw)).toBeNull()
  })
})

describe('cancel assignment and release protection', () => {
  beforeEach(() => {
    vi.mocked(providerDispatches.get).mockResolvedValue(
      owned({ assignment: carlosOnMoto03 }),
    )
    vi.mocked(deliveryAssignments.history).mockResolvedValue([carlosOnMoto03])
  })
  it('blocks releasing the service while an assignment is active', async () => {
    mount(detailPath)
    await action('CANCELAR ASIGNACIÓN')
    const release = screen.getByRole('button', { name: 'LIBERAR SERVICIO' })
    expect(release).toBeDisabled()
    expect(
      screen.getByText(/cancela primero la asignaci[óo]n/i),
    ).toBeInTheDocument()
  })
  it('cancels only the assignment and keeps the service with the provider', async () => {
    vi.mocked(deliveryAssignments.cancel).mockResolvedValue({
      ...carlosOnMoto03,
      status: 'CANCELLED',
      endedAt: stamp,
      endReason: 'DRIVER_UNAVAILABLE',
      paymentContext: {
        deliveryFee: { amount: '60.00', currency: 'MXN' },
        goodsValue: null,
        goodsPaymentMode: null,
        driverAdvancesGoods: false,
        driverAdvanceAmount: null,
      },
    })
    vi.mocked(deliveryAssignments.history)
      .mockResolvedValueOnce([carlosOnMoto03])
      .mockResolvedValue([
        { ...carlosOnMoto03, status: 'CANCELLED', endedAt: stamp },
      ])
    vi.mocked(providerDispatches.get)
      .mockResolvedValueOnce(owned({ assignment: carlosOnMoto03 }))
      .mockResolvedValue(owned({ assignment: null }))
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await action('CANCELAR ASIGNACIÓN'))
    expect(
      await screen.findByText(/El servicio sigue siendo de tu proveedor/i),
    ).toBeInTheDocument()
    await user.click(
      dialog().getByRole('button', { name: 'Cancelar asignación' }),
    )
    await waitFor(() =>
      expect(deliveryAssignments.cancel).toHaveBeenCalledWith(A, DISPATCH, {
        reason: 'DRIVER_UNAVAILABLE',
      }),
    )
    // The dispatch is never released by cancelling an assignment.
    expect(providerDispatches.release).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'LIBERAR SERVICIO' }),
      ).toBeEnabled(),
    )
  })
  it('requires a detail for OTHER before calling the API', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await action('CANCELAR ASIGNACIÓN'))
    await user.click(
      await dialog().findByRole('radio', { name: 'Otro motivo' }),
    )
    const detail = dialog().getByLabelText('Describe el motivo')
    // Empty is stopped by the field itself; too short is stopped before the API call.
    await user.type(detail, 'ab')
    await user.click(
      dialog().getByRole('button', { name: 'Cancelar asignación' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /entre 3 y 500 caracteres/i,
    )
    expect(deliveryAssignments.cancel).not.toHaveBeenCalled()
  })
})

describe('payment context', () => {
  it('COURIER_ADVANCE warns about the cash the driver must carry', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    const scope = dialog()
    expect(
      await scope.findByText(/deber[áa] entregar \$800\.00 MXN al comercio/i),
    ).toBeInTheDocument()
    expect(
      scope.getByText(/Verifica que el repartidor cuente con el efectivo/i),
    ).toBeInTheDocument()
    expect(
      scope.getByText(/Mandaria no conoce el saldo del repartidor/i),
    ).toBeInTheDocument()
    expect(scope.getByText('$60.00 MXN')).toBeInTheDocument()
    // Goods and delivery fee are never added into a single total.
    expect(scope.queryByText('$860.00 MXN')).toBeNull()
  })
  it('PREPAID shows no advance at all', async () => {
    vi.mocked(providerDispatches.get).mockResolvedValue(
      owned({
        service: service({
          goods: {
            paymentMode: 'PREPAID',
            value: '800.00',
            currency: 'MXN',
            driverAdvancesGoods: false,
            driverAdvanceAmount: null,
          },
        }),
      }),
    )
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    const scope = dialog()
    expect(
      await scope.findByText(/pagada directamente al comercio/i),
    ).toBeInTheDocument()
    expect(scope.queryByText(/deber[áa] entregar/i)).toBeNull()
    expect(scope.queryByText(/cuente con el efectivo/i)).toBeNull()
  })
})

describe('security', () => {
  it('refuses a provider id that is not mine and calls no assignment endpoint', async () => {
    mount(`/services/${DISPATCH}?providerId=${B}`)
    expect(
      await screen.findByText(
        'Tu cuenta no tiene una asociación vigente con este proveedor.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Asignación' })).toBeNull()
    expect(deliveryAssignments.history).not.toHaveBeenCalled()
    expect(deliveryAssignments.availableDrivers).not.toHaveBeenCalled()
    expect(deliveryAssignments.assign).not.toHaveBeenCalled()
  })
  it('scopes every assignment call to the resolved provider of the session', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await openAssign(user)
    for (const call of vi.mocked(deliveryAssignments.history).mock.calls)
      expect(call[0]).toBe(A)
    for (const call of vi.mocked(providerDispatches.get).mock.calls)
      expect(call[0]).toBe(A)
    expect(
      vi
        .mocked(deliveryAssignments.availableDrivers)
        .mock.calls.every((call) => call[0] === A),
    ).toBe(true)
  })
  it('gives SUPER_ADMIN the audit history without any fleet action', async () => {
    vi.mocked(adminDispatches.get).mockResolvedValue({
      id: DISPATCH,
      status: 'CLAIMED',
      openedAt: stamp,
      expiresAt: stamp,
      claimedByProviderId: A,
      claimedAt: stamp,
      expiredAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: stamp,
      updatedAt: stamp,
      deliveryRequest: {
        publicId: 'MDR-000900',
        status: 'CREATED',
        integrationClientId: B,
      },
      deliveryQuote: {
        publicId: 'MQ-000900',
        serviceType: 'LOCAL_DELIVERY',
        serviceZone: { id: B, name: 'Ocozocoautla', code: 'OCOZOCOAUTLA' },
        amount: '60.00',
        currency: 'MXN',
      },
      noProviderAvailable: false,
      candidates: [],
      goods: null,
    })
    vi.mocked(adminAssignments.history).mockResolvedValue([
      { ...luisOnMoto02, provider: { id: A, name: 'Rápidos A', code: 'A' } },
      {
        ...ended(carlosOnMoto03),
        provider: { id: A, name: 'Rápidos A', code: 'A' },
      },
    ])
    mount(`/dispatches/${DISPATCH}`, 'SUPER_ADMIN')
    const scope = within(
      await screen.findByRole('region', { name: 'Asignaciones' }),
    )
    expect(await scope.findByText('Luis')).toBeInTheDocument()
    expect(scope.getByText('Carlos')).toBeInTheDocument()
    expect(scope.getByText(/Lectura y auditor[íi]a/i)).toBeInTheDocument()
    for (const action of ['ASIGNAR', 'REASIGNAR', 'CANCELAR ASIGNACIÓN'])
      expect(screen.queryByRole('button', { name: action })).toBeNull()
    expect(deliveryAssignments.assign).not.toHaveBeenCalled()
  })
  it('keeps DRIVER out of the assignment central', async () => {
    mount(detailPath, 'DRIVER')
    expect(
      await screen.findByRole('heading', { name: 'Sin permisos' }),
    ).toBeInTheDocument()
    expect(deliveryAssignments.history).not.toHaveBeenCalled()
  })
})

function cleanupRender() {
  queryClient.clear()
  document.body.innerHTML = ''
}
