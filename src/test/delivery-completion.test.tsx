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
import { providerDispatches } from '../dispatch/service'
import { deliveryAssignments } from '../delivery-assignments/service'
import { providers } from '../providers/service'
import { driverPortal } from '../driver-portal/service'
import { myDriverCredits, myProviderCredits } from '../credits/service'
import { dispatchStatusLabels } from '../dispatch/format'
import { assignmentStatusLabels } from '../delivery-assignments/format'
import { canDeliver, isClaimOwner } from '../dispatch/rules'
import type { DeliveryAssignment } from '../delivery-assignments/types'
import type { DispatchService, ProviderDispatch } from '../dispatch/types'
import type {
  DriverDispatch,
  DriverSelf,
  DriverVehicle,
} from '../driver-portal/types'
import type { CreditAccount } from '../credits/types'
import type { Role } from '../types/api'

vi.mock('../dispatch/service', () => ({
  providerDispatches: {
    list: vi.fn(),
    get: vi.fn(),
    claim: vi.fn(),
    release: vi.fn(),
    deliver: vi.fn(),
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
vi.mock('../driver-portal/service', () => ({
  driverPortal: {
    me: vi.fn(),
    vehicles: vi.fn(),
    available: vi.fn(),
    get: vi.fn(),
    take: vi.fn(),
    release: vi.fn(),
    deliver: vi.fn(),
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
vi.mock('../credits/service', () => ({
  providerCreditsAdmin: { account: vi.fn(), ledger: vi.fn() },
  independentCreditsAdmin: {
    account: vi.fn(),
    ledger: vi.fn(),
    recharge: vi.fn(),
    adjustment: vi.fn(),
  },
  myProviderCredits: { account: vi.fn(), ledger: vi.fn() },
  myDriverCredits: { account: vi.fn(), ledger: vi.fn() },
  movementKey: () => 'test-key',
}))

const stamp = '2026-09-23T12:00:00Z'
const DELIVERED_AT = '2026-09-23T13:30:00Z'
const A = '11111111-1111-4111-8111-111111111111'
const DISPATCH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const DRIVER_ID = 'c0000000-0000-4000-8000-000000000001'
const MOTO = 'd0000000-0000-4000-8000-000000000003'
const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / 20)),
  page: 1,
  pageSize: 20,
})
const account: CreditAccount = {
  id: 'account-1',
  ownerType: 'PROVIDER',
  providerId: A,
  independentDriverProfileId: null,
  balance: 40,
  createdAt: stamp,
  updatedAt: stamp,
}
const emptyLedger = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

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
      paymentMode: 'PREPAID',
      value: '800.00',
      currency: 'MXN',
      driverAdvancesGoods: false,
      driverAdvanceAmount: null,
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
    deliveredAt: null,
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
    creditCost: 7,
    ...over,
  }
}
const delivered = owned({ status: 'DELIVERED', deliveredAt: DELIVERED_AT })
const assignment = (
  over: Partial<DeliveryAssignment> = {},
): DeliveryAssignment => ({
  id: 'assignment-1',
  dispatchId: DISPATCH,
  providerId: A,
  status: 'ACTIVE',
  driver: { id: DRIVER_ID, name: 'Carlos' },
  vehicle: { id: MOTO, identifier: 'MOTO-03', type: 'MOTORCYCLE' },
  assignedAt: stamp,
  assignedByUserId: 'user-1',
  endedAt: null,
  endedByUserId: null,
  endReason: null,
  endReasonDetail: null,
  ...over,
})
const completed = assignment({
  status: 'COMPLETED',
  endedAt: DELIVERED_AT,
  endedByUserId: 'user-1',
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

const vehicle: DriverVehicle = {
  id: MOTO,
  independentDriverProfileId: 'profile-1',
  identifier: 'MOTO-IND-1',
  type: 'MOTORCYCLE',
  status: 'ACTIVE',
  brand: 'Italika',
  model: 'FT150',
  year: 2023,
  color: null,
  plate: null,
  createdAt: stamp,
  updatedAt: stamp,
}
function me(over: Partial<DriverSelf> = {}): DriverSelf {
  return {
    id: DRIVER_ID,
    name: 'Carlos',
    status: 'ACTIVE',
    availability: 'AVAILABLE',
    provider: { id: A, name: 'Rápidos', code: 'RAPIDOS', status: 'ACTIVE' },
    currentAssignment: null,
    activeDeliveryAssignment: {
      id: 'assignment-1',
      mode: 'INDEPENDENT',
      dispatchId: DISPATCH,
    },
    independent: {
      id: 'profile-1',
      status: 'APPROVED',
      approvedAt: stamp,
      suspendedAt: null,
      reason: null,
      canTakeServices: false,
    },
    ...over,
  }
}
function driverDispatch(over: Partial<DriverDispatch> = {}): DriverDispatch {
  return {
    id: DISPATCH,
    status: 'CLAIMED',
    access: 'OWNER',
    serviceType: 'LOCAL_DELIVERY',
    serviceZone: { code: 'OCOZO', name: 'Ocozocoautla' },
    openedAt: stamp,
    expiresAt: stamp,
    takenByMe: true,
    claimedAt: stamp,
    cancelledAt: null,
    deliveredAt: null,
    assignment: {
      id: 'assignment-1',
      mode: 'INDEPENDENT',
      assignedAt: stamp,
      vehicle: { id: MOTO, identifier: 'MOTO-IND-1', type: 'MOTORCYCLE' },
    },
    service: {
      route: { distanceMeters: 4300, durationSeconds: 720 },
      pickup: {
        address: 'El Fogón',
        latitude: 16.76,
        longitude: -93.37,
        contactName: 'Cocina El Fogón',
        contactPhone: '+52 961 000 0001',
        instructions: null,
      },
      dropoff: {
        address: 'Barrio San Ramón',
        latitude: 16.77,
        longitude: -93.38,
      },
      packages: [
        { category: 'FOOD', quantity: 1, weightKg: null, isFragile: false },
      ],
      deliveryRequestPublicId: 'MDR-000500',
    },
    paymentContext: {
      deliveryFee: { amount: '60.00', currency: 'MXN' },
      goodsValue: { amount: '800.00', currency: 'MXN' },
      goodsPaymentMode: 'PREPAID',
      driverAdvancesGoods: false,
      driverAdvanceAmount: null,
    },
    creditCost: 7,
    ...over,
  }
}

function mount(path: string, role: Role = 'PROVIDER_ADMIN') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider
          value={{
            user: {
              id: 'user-1',
              email: 'someone@example.test',
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
const dialog = () => within(screen.getByRole('dialog'))
const deliverButton = () =>
  screen.findByRole('button', { name: 'MARCAR COMO ENTREGADO' })

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(providers.profiles).mockResolvedValue(page([profile(A, 'Rápidos')]))
  vi.mocked(providers.profile).mockResolvedValue(profile(A, 'Rápidos'))
  vi.mocked(providerDispatches.get).mockResolvedValue(owned())
  vi.mocked(providerDispatches.list).mockResolvedValue(page([owned()]))
  vi.mocked(providerDispatches.deliver).mockResolvedValue(delivered)
  vi.mocked(deliveryAssignments.history).mockResolvedValue([assignment()])
  vi.mocked(myProviderCredits.account).mockResolvedValue(account)
  vi.mocked(myProviderCredits.ledger).mockResolvedValue(emptyLedger)
  vi.mocked(myDriverCredits.account).mockResolvedValue({
    ...account,
    ownerType: 'INDEPENDENT_DRIVER',
    providerId: null,
    independentDriverProfileId: 'profile-1',
  })
  vi.mocked(myDriverCredits.ledger).mockResolvedValue(emptyLedger)
  vi.mocked(driverPortal.me).mockResolvedValue(me())
  vi.mocked(driverPortal.get).mockResolvedValue(driverDispatch())
  vi.mocked(driverPortal.vehicles).mockResolvedValue([vehicle])
  vi.mocked(driverPortal.available).mockResolvedValue(page([]))
  vi.mocked(driverPortal.deliver).mockResolvedValue(
    driverDispatch({ status: 'DELIVERED', deliveredAt: DELIVERED_AT }),
  )
})

describe('provider completion', () => {
  it('offers the completion only with a claimed service and someone executing it', async () => {
    mount(detailPath)
    const button = await deliverButton()
    expect(button).toBeEnabled()
    // The identifying information is on the page before confirming anything.
    expect(screen.getByText('Av. Central 123')).toBeInTheDocument()
    expect(screen.getByText('Calle Norte 45')).toBeInTheDocument()
    const panel = within(screen.getByRole('region', { name: 'Asignación' }))
    expect((await panel.findAllByText('Carlos')).length).toBeGreaterThan(0)
    expect(panel.getAllByText(/MOTO-03/).length).toBeGreaterThan(0)
    expect(providerDispatches.deliver).not.toHaveBeenCalled()
  })
  it('confirms with an explicit dialog and refreshes from the backend', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await deliverButton())
    const modal = dialog()
    expect(
      screen.getByRole('dialog', { name: '¿Confirmar entrega?' }),
    ).toBeInTheDocument()
    expect(
      modal.getByText(
        'Confirma que el repartidor ya realizó la entrega al destino.',
      ),
    ).toBeInTheDocument()
    expect(modal.getByRole('note')).toHaveTextContent(
      'Esta acción no se puede deshacer.',
    )
    // "confirmar" contains "firma", so the words are matched with boundaries.
    // No payment, refund, customer confirmation or proof of delivery is implied.
    expect(screen.getByRole('dialog').textContent ?? '').not.toMatch(
      /\bpago\b|reembolso|devoluci|\bfoto\b|fotograf|\bfirma\b|evidencia|comprobante|OTP|PIN/i,
    )
    expect(modal.getAllByText('Carlos').length).toBeGreaterThan(0)
    vi.mocked(providerDispatches.get).mockResolvedValue(delivered)
    vi.mocked(deliveryAssignments.history).mockResolvedValue([completed])
    await user.click(modal.getByRole('button', { name: 'Confirmar entrega' }))
    await waitFor(() =>
      expect(providerDispatches.deliver).toHaveBeenCalledWith(A, DISPATCH),
    )
    // The dispatch and the assignment history are read back before anything is shown.
    await waitFor(() =>
      expect(
        vi.mocked(providerDispatches.get).mock.calls.length,
      ).toBeGreaterThan(1),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await screen.findAllByText('Entregado')).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
    ).toBeNull()
  })
  it('sends no body at all: the backend derives who confirmed and when', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await deliverButton())
    await user.click(
      dialog().getByRole('button', { name: 'Confirmar entrega' }),
    )
    await waitFor(() => expect(providerDispatches.deliver).toHaveBeenCalled())
    expect(vi.mocked(providerDispatches.deliver).mock.calls[0]).toEqual([
      A,
      DISPATCH,
    ])
  })
  it('cancelling the dialog calls no mutation', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await deliverButton())
    await user.click(dialog().getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(providerDispatches.deliver).not.toHaveBeenCalled()
  })
  it('a fast double click sends a single request', async () => {
    let resolve: ((value: ProviderDispatch) => void) | undefined
    vi.mocked(providerDispatches.deliver).mockReturnValue(
      new Promise<ProviderDispatch>((r) => {
        resolve = r
      }),
    )
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await deliverButton())
    const confirm = dialog().getByRole('button', { name: 'Confirmar entrega' })
    await user.click(confirm)
    await user.click(confirm)
    await user.click(confirm)
    expect(providerDispatches.deliver).toHaveBeenCalledTimes(1)
    expect(confirm).toBeDisabled()
    resolve?.(delivered)
  })
  it('shows a delivered service as terminal, with no incompatible action', async () => {
    vi.mocked(providerDispatches.get).mockResolvedValue(delivered)
    vi.mocked(deliveryAssignments.history).mockResolvedValue([completed])
    mount(detailPath)
    expect((await screen.findAllByText('Entregado')).length).toBeGreaterThan(0)
    for (const name of [
      'MARCAR COMO ENTREGADO',
      'LIBERAR SERVICIO',
      'ASIGNAR',
      'REASIGNAR',
      'CANCELAR ASIGNACIÓN',
      'TOMAR SERVICIO',
    ])
      expect(screen.queryByRole('button', { name })).toBeNull()
    // There is no undo: DELIVERED is terminal.
    expect(
      screen.queryByRole('button', {
        name: /Reabrir|Deshacer|Volver a activo/i,
      }),
    ).toBeNull()
  })
  it('keeps who delivered it and the completed assignment visible afterwards', async () => {
    vi.mocked(providerDispatches.get).mockResolvedValue(delivered)
    vi.mocked(deliveryAssignments.history).mockResolvedValue([completed])
    mount(detailPath)
    const panel = within(
      await screen.findByRole('region', { name: 'Asignación' }),
    )
    expect((await panel.findAllByText('Carlos')).length).toBeGreaterThan(0)
    expect(panel.getAllByText(/MOTO-03/).length).toBeGreaterThan(0)
    expect(panel.getAllByText('Entrega completada').length).toBeGreaterThan(0)
    expect(screen.getByText(/Servicio entregado/)).toBeInTheDocument()
  })
  it('does not offer the completion without an active assignment', async () => {
    vi.mocked(deliveryAssignments.history).mockResolvedValue([])
    mount(detailPath)
    expect(await screen.findByRole('button', { name: 'ASIGNAR' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
    ).toBeNull()
  })
  it('represents no credit movement for the delivery', async () => {
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(await deliverButton())
    const modal = dialog()
    expect(
      modal.queryByText(/cr[ée]dito|SERVICE_AWARD|SERVICE_REFUND|saldo/i),
    ).toBeNull()
    vi.mocked(providerDispatches.get).mockResolvedValue(delivered)
    await user.click(modal.getByRole('button', { name: 'Confirmar entrega' }))
    await waitFor(() => expect(providerDispatches.deliver).toHaveBeenCalled())
    expect(myProviderCredits.ledger).not.toHaveBeenCalled()
  })
  it.each<Role>(['SUPER_ADMIN', 'DRIVER'])(
    '%s never reaches the provider completion',
    async (role) => {
      mount(detailPath, role)
      await screen.findByRole('heading', { name: /Sin permisos|Servicio/ })
      expect(
        screen.queryByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
      ).toBeNull()
      expect(providerDispatches.deliver).not.toHaveBeenCalled()
    },
  )
})

describe('independent driver completion', () => {
  const portal = '/driver/my-service'
  it('offers the completion on my service and confirms it with a dialog', async () => {
    mount(portal, 'DRIVER')
    const user = userEvent.setup()
    await user.click(await deliverButton())
    const modal = dialog()
    expect(
      screen.getByRole('dialog', { name: '¿Confirmar entrega?' }),
    ).toBeInTheDocument()
    expect(
      modal.getByText('Confirma que realizaste la entrega al destino.'),
    ).toBeInTheDocument()
    expect(modal.getByRole('note')).toHaveTextContent(
      'Esta acción no se puede deshacer.',
    )
    expect(modal.getByText('El Fogón')).toBeInTheDocument()
    // Freed after the delivery: the portal reads its own state back from the backend.
    vi.mocked(driverPortal.me).mockResolvedValue(
      me({
        activeDeliveryAssignment: null,
        independent: {
          id: 'profile-1',
          status: 'APPROVED',
          approvedAt: stamp,
          suspendedAt: null,
          reason: null,
          canTakeServices: true,
        },
      }),
    )
    await user.click(modal.getByRole('button', { name: 'Confirmar entrega' }))
    await waitFor(() =>
      expect(driverPortal.deliver).toHaveBeenCalledWith(DISPATCH),
    )
    await waitFor(() =>
      expect(vi.mocked(driverPortal.me).mock.calls.length).toBeGreaterThan(1),
    )
    expect(
      await screen.findByRole('heading', { name: 'Servicios disponibles' }),
    ).toBeInTheDocument()
  })
  it('sends no body and no driver identity', async () => {
    mount(portal, 'DRIVER')
    const user = userEvent.setup()
    await user.click(await deliverButton())
    await user.click(
      dialog().getByRole('button', { name: 'Confirmar entrega' }),
    )
    await waitFor(() => expect(driverPortal.deliver).toHaveBeenCalled())
    expect(vi.mocked(driverPortal.deliver).mock.calls[0]).toEqual([DISPATCH])
  })
  it('cancelling the dialog calls no mutation', async () => {
    mount(portal, 'DRIVER')
    const user = userEvent.setup()
    await user.click(await deliverButton())
    await user.click(dialog().getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(driverPortal.deliver).not.toHaveBeenCalled()
  })
  it('a fast double click sends a single request', async () => {
    let resolve: ((value: DriverDispatch) => void) | undefined
    vi.mocked(driverPortal.deliver).mockReturnValue(
      new Promise<DriverDispatch>((r) => {
        resolve = r
      }),
    )
    mount(portal, 'DRIVER')
    const user = userEvent.setup()
    await user.click(await deliverButton())
    const confirm = dialog().getByRole('button', { name: 'Confirmar entrega' })
    await user.click(confirm)
    await user.click(confirm)
    expect(driverPortal.deliver).toHaveBeenCalledTimes(1)
    expect(confirm).toBeDisabled()
    resolve?.(driverDispatch({ status: 'DELIVERED' }))
  })
  it('represents no credit movement for the delivery', async () => {
    mount(portal, 'DRIVER')
    const user = userEvent.setup()
    await user.click(await deliverButton())
    expect(
      dialog().queryByText(/cr[ée]dito|SERVICE_AWARD|SERVICE_REFUND|saldo/i),
    ).toBeNull()
    await user.click(
      dialog().getByRole('button', { name: 'Confirmar entrega' }),
    )
    await waitFor(() => expect(driverPortal.deliver).toHaveBeenCalled())
    expect(myDriverCredits.ledger).not.toHaveBeenCalled()
  })
  it('shows a delivered service as delivered, with no completion action', async () => {
    vi.mocked(driverPortal.get).mockResolvedValue(
      driverDispatch({ status: 'DELIVERED', deliveredAt: DELIVERED_AT }),
    )
    mount(`/driver/services/${DISPATCH}`, 'DRIVER')
    await screen.findByRole('heading', { name: 'Cobro' })
    expect(
      screen.queryByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'TOMAR SERVICIO' })).toBeNull()
  })
  it.each<Role>(['PROVIDER_ADMIN', 'SUPER_ADMIN'])(
    '%s never reaches the driver completion',
    async (role) => {
      mount(portal, role)
      expect(
        await screen.findByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      expect(driverPortal.deliver).not.toHaveBeenCalled()
      expect(
        screen.queryByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
      ).toBeNull()
    },
  )
})

describe('status formatters and already-delivered handling', () => {
  it('labels DELIVERED and COMPLETED as successful closes', () => {
    expect(dispatchStatusLabels.DELIVERED).toBe('Entregado')
    expect(assignmentStatusLabels.COMPLETED).toBe('Entrega completada')
    // A completed assignment is never described as a cancellation.
    expect(assignmentStatusLabels.COMPLETED).not.toMatch(/cancel/i)
  })
  it('translates DISPATCH_DELIVERED for claim and take', () => {
    const error = normalizeError(409, {
      code: 'DISPATCH_DELIVERED',
      message: 'Dispatch was already delivered and is closed',
    })
    expect(error.message).toBe('Este servicio ya fue entregado.')
    expect(error.message).not.toMatch(/Dispatch|closed/)
  })
  it('translates the completion conflicts without technical text', () => {
    for (const [code, expected] of [
      [
        'DISPATCH_NOT_CLAIMED_BY_PROVIDER',
        /ya no está tomado por tu proveedor/i,
      ],
      ['DISPATCH_NOT_CLAIMED_BY_DRIVER', /ya no es tuyo/i],
      ['NO_ACTIVE_ASSIGNMENT', /no tiene una asignación vigente/i],
      ['DELIVERY_CONFLICT', /cambió mientras confirmabas la entrega/i],
    ] as const) {
      const error = normalizeError(409, { code, message: 'internal detail' })
      expect(error.message).toMatch(expected)
      expect(error.message).not.toMatch(/internal detail/)
    }
  })
  it('ends the claim dialog when the service is already delivered', async () => {
    vi.mocked(providerDispatches.get).mockResolvedValue(
      owned({
        access: 'OFFER',
        status: 'OPEN',
        claimedByMe: false,
        claimedAt: null,
        myCandidate: {
          status: 'OFFERED',
          offeredAt: stamp,
          claimedAt: null,
          releasedAt: null,
          releaseReason: null,
        },
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      }),
    )
    vi.mocked(providerDispatches.claim).mockRejectedValue(
      normalizeError(409, {
        code: 'DISPATCH_DELIVERED',
        message: 'Dispatch was already delivered and is closed',
      }),
    )
    mount(detailPath)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'TOMAR SERVICIO' }),
    )
    await user.click(
      dialog().getByRole('button', { name: 'Confirmar y tomar' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este servicio ya fue entregado.',
    )
  })
  it('keeps the UI hints honest about what can be delivered', () => {
    expect(canDeliver(owned(), assignment())).toBe(true)
    expect(canDeliver(owned(), null)).toBe(false)
    expect(canDeliver(delivered, assignment())).toBe(false)
    expect(canDeliver(owned({ access: 'OFFER' }), assignment())).toBe(false)
    // A delivered service is still mine: its detail and history stay reachable.
    expect(isClaimOwner(delivered)).toBe(true)
  })
})
