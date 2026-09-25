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
import { AdminCreditsPanel } from '../credits/components'
import {
  independentCreditsAdmin,
  myDriverCredits,
  myProviderCredits,
  providerCreditsAdmin,
} from '../credits/service'
import { creditPolicies } from '../credit-policies/service'
import { independentDrivers } from '../independent-drivers/service'
import { providerDispatches } from '../dispatch/service'
import { providers } from '../providers/service'
import type { AdminCreditLedgerEntry, CreditAccount } from '../credits/types'
import type { CreditPolicy } from '../credit-policies/types'
import type { ProviderDispatch } from '../dispatch/types'
import type { Role } from '../types/api'

vi.mock('../credits/service', () => ({
  providerCreditsAdmin: {
    account: vi.fn(),
    ledger: vi.fn(),
    recharge: vi.fn(),
    adjustment: vi.fn(),
  },
  independentCreditsAdmin: {
    account: vi.fn(),
    ledger: vi.fn(),
    recharge: vi.fn(),
    adjustment: vi.fn(),
  },
  myProviderCredits: { account: vi.fn(), ledger: vi.fn() },
  myDriverCredits: { account: vi.fn(), ledger: vi.fn() },
  movementKey: () => 'test-movement-key',
}))
vi.mock('../credit-policies/service', () => ({
  creditPolicies: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    createVersion: vi.fn(),
    calculate: vi.fn(),
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
    availableDrivers: vi.fn(),
    availableVehicles: vi.fn(),
    history: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    reassign: vi.fn(),
    cancel: vi.fn(),
  },
  adminAssignments: { history: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    members: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
  },
}))

const stamp = '2026-09-22T12:00:00Z'
const PROVIDER = '11111111-1111-4111-8111-111111111111'
const DRIVER = '22222222-2222-4222-8222-222222222222'
const POLICY = '33333333-3333-4333-8333-333333333333'
const DISPATCH = '44444444-4444-4444-8444-444444444444'
const page = <T,>(items: T[], total = items.length) => ({
  items,
  total,
  totalPages: Math.max(1, Math.ceil(total / 20)),
  page: 1,
  pageSize: 20,
})
const account = (overrides: Partial<CreditAccount> = {}): CreditAccount => ({
  id: 'account-1',
  ownerType: 'PROVIDER',
  providerId: PROVIDER,
  independentDriverProfileId: null,
  balance: 143,
  createdAt: stamp,
  updatedAt: stamp,
  ...overrides,
})
const entry = (
  overrides: Partial<AdminCreditLedgerEntry> = {},
): AdminCreditLedgerEntry => ({
  id: 'entry-1',
  sequence: 1,
  type: 'RECHARGE',
  amount: 100,
  balanceBefore: 43,
  balanceAfter: 143,
  rechargeMethod: 'TRANSFER',
  externalReference: 'SPEI 0123456789',
  reason: null,
  referenceType: null,
  referenceId: null,
  createdAt: stamp,
  creditAccountId: 'account-1',
  createdByUserId: 'admin-user',
  idempotencyKey: 'test-movement-key',
  ...overrides,
})
const award = entry({
  id: 'entry-2',
  sequence: 2,
  type: 'SERVICE_AWARD',
  amount: -7,
  balanceBefore: 143,
  balanceAfter: 136,
  rechargeMethod: null,
  externalReference: null,
  referenceType: 'DISPATCH',
  referenceId: DISPATCH,
  createdByUserId: null,
})
const refund = entry({
  id: 'entry-3',
  sequence: 3,
  type: 'SERVICE_REFUND',
  amount: 7,
  balanceBefore: 136,
  balanceAfter: 143,
  rechargeMethod: null,
  externalReference: null,
  referenceType: 'DISPATCH',
  referenceId: DISPATCH,
  createdByUserId: null,
})
const adjustment = entry({
  id: 'entry-4',
  sequence: 4,
  type: 'ADMIN_ADJUSTMENT',
  amount: -20,
  balanceBefore: 143,
  balanceAfter: 123,
  rechargeMethod: null,
  externalReference: null,
  reason: 'Corrección de una recarga duplicada',
})
const movement = (overrides: Partial<AdminCreditLedgerEntry> = {}) => ({
  account: account({ balance: 643 }),
  entry: entry(overrides),
})
const policy = (overrides: Partial<CreditPolicy> = {}): CreditPolicy => ({
  id: POLICY,
  serviceType: 'LOCAL_DELIVERY',
  actorType: 'PROVIDER',
  version: 2,
  status: 'ACTIVE',
  calculationType: 'PER_KM',
  creditsPerKm: 2,
  minimumCredits: 5,
  flatCredits: null,
  ranges: [],
  effectiveFrom: stamp,
  effectiveUntil: null,
  reason: 'Ajuste comercial',
  createdByUserId: 'admin-user',
  createdAt: stamp,
  ...overrides,
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
function dispatch(overrides: Partial<ProviderDispatch> = {}): ProviderDispatch {
  return {
    id: DISPATCH,
    status: 'OPEN',
    access: 'OFFER',
    serviceType: 'LOCAL_DELIVERY',
    serviceZone: { code: 'OCOZOCOAUTLA', name: 'Ocozocoautla' },
    openedAt: stamp,
    expiresAt: new Date(Date.now() + 8 * 60_000).toISOString(),
    claimedByMe: false,
    claimedAt: null,
    cancelledAt: null,
    deliveredAt: null,
    myCandidate: {
      status: 'OFFERED',
      offeredAt: stamp,
      claimedAt: null,
      releasedAt: null,
      releaseReason: null,
    },
    service: {
      deliveryFee: { amount: '50.00', currency: 'MXN' },
      route: { distanceMeters: 4200, durationSeconds: 780 },
      pickup: {
        address: 'Av. Central 123, Ocozocoautla',
        latitude: 16.76,
        longitude: -93.37,
      },
      dropoff: {
        address: 'Calle Norte 45, Ocozocoautla',
        latitude: 16.77,
        longitude: -93.38,
      },
      packages: [
        { category: 'FOOD', quantity: 1, weightKg: null, isFragile: false },
      ],
      goods: null,
    },
    assignment: null,
    assignmentDeadline: null,
    assignmentOverdue: false,
    creditCost: 7,
    ...overrides,
  }
}

function mount(path: string, role: Role = 'SUPER_ADMIN') {
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
/** The administrative panel as it is embedded in the provider and independent driver files. */
function mountPanel(scope: 'provider' | 'independent', ownerId = PROVIDER) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FeedbackProvider>
          <AdminCreditsPanel
            scope={scope}
            ownerId={ownerId}
            ownerName={
              scope === 'provider' ? 'Rápidos de Coita' : 'Carlos Ruiz'
            }
            missingDescription="Sin cuenta todavía."
          />
        </FeedbackProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const panel = () =>
  within(screen.getByRole('region', { name: 'Créditos Mandaria' }))
const dialog = () => within(screen.getByRole('dialog'))

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(providerCreditsAdmin.account).mockResolvedValue(account())
  vi.mocked(providerCreditsAdmin.ledger).mockResolvedValue(page([entry()]))
  vi.mocked(independentCreditsAdmin.account).mockResolvedValue(
    account({
      ownerType: 'INDEPENDENT_DRIVER',
      providerId: null,
      independentDriverProfileId: 'profile-1',
      balance: 40,
    }),
  )
  vi.mocked(independentCreditsAdmin.ledger).mockResolvedValue(page([entry()]))
  vi.mocked(myProviderCredits.account).mockResolvedValue(account())
  vi.mocked(myProviderCredits.ledger).mockResolvedValue(page([entry()]))
  vi.mocked(myDriverCredits.account).mockResolvedValue(
    account({
      ownerType: 'INDEPENDENT_DRIVER',
      providerId: null,
      independentDriverProfileId: 'profile-1',
      balance: 40,
    }),
  )
  vi.mocked(myDriverCredits.ledger).mockResolvedValue(page([award, refund]))
  vi.mocked(providers.profiles).mockResolvedValue(
    page([profile(PROVIDER, 'Rápidos de Coita')]),
  )
  vi.mocked(providers.profile).mockResolvedValue(
    profile(PROVIDER, 'Rápidos de Coita'),
  )
})

describe('SUPER_ADMIN · créditos de un proveedor', () => {
  it('muestra el saldo y el historial reales, nunca como dinero', async () => {
    mountPanel('provider')
    expect(await panel().findByText('143 créditos')).toBeInTheDocument()
    expect(providerCreditsAdmin.account).toHaveBeenCalledWith(
      PROVIDER,
      expect.any(AbortSignal),
    )
    const body = (await panel().findByText('Recarga')).closest('table')!
    expect(within(body).getByText('+100 créditos')).toBeInTheDocument()
    expect(
      within(body).getByText('SPEI 0123456789', { exact: false }),
    ).toBeInTheDocument()
    // Credits never carry an amount of money: no currency symbol and no currency code.
    expect(body.textContent).not.toMatch(/\$|MXN/)
    const text = screen.getByRole('region', {
      name: 'Créditos Mandaria',
    }).textContent!
    expect(text).not.toMatch(/\$\d|MXN/)
    for (const raw of ['RECHARGE', 'ADMIN_ADJUSTMENT', 'TRANSFER'])
      expect(text).not.toContain(raw)
  })

  it('registra una recarga con el DTO real y vuelve a leer la cuenta', async () => {
    vi.mocked(providerCreditsAdmin.recharge).mockResolvedValue(
      movement({ amount: 500, balanceAfter: 643 }),
    )
    mountPanel('provider')
    const actor = userEvent.setup()
    await actor.click(
      await panel().findByRole('button', { name: 'Registrar recarga' }),
    )
    expect(
      dialog().getByText(/Registra los créditos después de confirmar el pago/),
    ).toBeInTheDocument()
    await actor.type(dialog().getByLabelText('Créditos a sumar'), '500')
    await actor.selectOptions(
      dialog().getByLabelText('Medio de pago confirmado'),
      'TRANSFER',
    )
    await actor.type(
      dialog().getByLabelText('Referencia externa (opcional)'),
      'SPEI 0123456789',
    )
    await actor.click(dialog().getByRole('button', { name: 'Continuar' }))
    // The summary states who receives the credits and how much, before anything is sent.
    expect(dialog().getByText('Rápidos de Coita')).toBeInTheDocument()
    expect(dialog().getByText('500 créditos')).toBeInTheDocument()
    expect(dialog().getByText('Transferencia')).toBeInTheDocument()
    expect(providerCreditsAdmin.recharge).not.toHaveBeenCalled()
    vi.mocked(providerCreditsAdmin.account).mockResolvedValue(
      account({ balance: 643 }),
    )
    await actor.click(
      dialog().getByRole('button', { name: 'Registrar recarga' }),
    )
    await waitFor(() =>
      expect(providerCreditsAdmin.recharge).toHaveBeenCalledWith(
        PROVIDER,
        {
          credits: 500,
          method: 'TRANSFER',
          externalReference: 'SPEI 0123456789',
        },
        'test-movement-key',
      ),
    )
    expect(
      await screen.findByText('Recarga registrada: +500 créditos.'),
    ).toBeInTheDocument()
    // The balance shown afterwards comes from the backend, not from local arithmetic.
    expect(await panel().findByText('643 créditos')).toBeInTheDocument()
    expect(providerCreditsAdmin.account).toHaveBeenCalledTimes(2)
  })

  it('no permite un doble envío de la misma recarga', async () => {
    let resolve: (value: ReturnType<typeof movement>) => void = () => {}
    vi.mocked(providerCreditsAdmin.recharge).mockImplementation(
      () => new Promise((done) => (resolve = done)),
    )
    mountPanel('provider')
    const actor = userEvent.setup()
    await actor.click(
      await panel().findByRole('button', { name: 'Registrar recarga' }),
    )
    await actor.type(dialog().getByLabelText('Créditos a sumar'), '50')
    await actor.click(dialog().getByRole('button', { name: 'Continuar' }))
    const submit = dialog().getByRole('button', { name: 'Registrar recarga' })
    await actor.click(submit)
    expect(dialog().getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    await actor
      .click(dialog().getByRole('button', { name: 'Guardando…' }))
      .catch(() => undefined)
    expect(providerCreditsAdmin.recharge).toHaveBeenCalledTimes(1)
    resolve(movement({ amount: 50 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('distingue el ajuste administrativo y avisa cuando resta créditos', async () => {
    vi.mocked(providerCreditsAdmin.adjustment).mockResolvedValue({
      account: account({ balance: 123 }),
      entry: adjustment,
    })
    mountPanel('provider')
    const actor = userEvent.setup()
    await actor.click(
      await panel().findByRole('button', { name: 'Ajuste administrativo' }),
    )
    expect(
      dialog().getByText(/Para registrar un pago confirmado usa una recarga/),
    ).toBeInTheDocument()
    await actor.type(dialog().getByLabelText('Créditos del ajuste'), '-20')
    await actor.type(
      dialog().getByLabelText('Motivo'),
      'Corrección de una recarga duplicada',
    )
    await actor.click(dialog().getByRole('button', { name: 'Continuar' }))
    expect(dialog().getByText('-20 créditos')).toBeInTheDocument()
    expect(
      dialog().getByText(/Este ajuste disminuye los créditos de la cuenta/),
    ).toBeInTheDocument()
    await actor.click(dialog().getByRole('button', { name: 'Aplicar ajuste' }))
    await waitFor(() =>
      expect(providerCreditsAdmin.adjustment).toHaveBeenCalledWith(
        PROVIDER,
        { amount: -20, reason: 'Corrección de una recarga duplicada' },
        'test-movement-key',
      ),
    )
    expect(
      await screen.findByText('Ajuste aplicado: -20 créditos.'),
    ).toBeInTheDocument()
  })

  it('exige un motivo para el ajuste y no llama al backend sin él', async () => {
    mountPanel('provider')
    const actor = userEvent.setup()
    await actor.click(
      await panel().findByRole('button', { name: 'Ajuste administrativo' }),
    )
    await actor.type(dialog().getByLabelText('Créditos del ajuste'), '10')
    await actor.click(dialog().getByRole('button', { name: 'Continuar' }))
    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'Describe el motivo con al menos 3 caracteres.',
    )
    expect(providerCreditsAdmin.adjustment).not.toHaveBeenCalled()
  })

  it('trata un historial vacío como estado normal, no como error', async () => {
    vi.mocked(providerCreditsAdmin.ledger).mockResolvedValue(page([]))
    mountPanel('provider')
    expect(
      await panel().findByText('No hay movimientos todavía.'),
    ).toBeInTheDocument()
    expect(panel().queryByRole('alert')).toBeNull()
    expect(panel().getByText('143 créditos')).toBeInTheDocument()
  })

  it('una cuenta inexistente no se convierte en saldo cero', async () => {
    vi.mocked(providerCreditsAdmin.account).mockRejectedValue(
      normalizeError(404, { code: 'CREDIT_ACCOUNT_NOT_FOUND' }),
    )
    mountPanel('provider')
    expect(
      await panel().findByText('Sin cuenta de créditos'),
    ).toBeInTheDocument()
    expect(panel().queryByText('0 créditos')).toBeNull()
    expect(
      panel().queryByRole('button', { name: 'Registrar recarga' }),
    ).toBeNull()
    expect(providerCreditsAdmin.ledger).not.toHaveBeenCalled()
  })

  it('muestra un error del historial con opción de reintentar', async () => {
    vi.mocked(providerCreditsAdmin.ledger).mockRejectedValue(
      normalizeError(500, { message: 'raw backend text' }),
    )
    mountPanel('provider')
    const alert = await panel().findByRole('alert')
    expect(alert).not.toHaveTextContent('raw backend text')
    vi.mocked(providerCreditsAdmin.ledger).mockResolvedValue(page([entry()]))
    await userEvent
      .setup()
      .click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await panel().findByText('+100 créditos')).toBeInTheDocument()
  })
})

describe('SUPER_ADMIN · créditos de un repartidor independiente', () => {
  it('usa exclusivamente las rutas independientes, nunca las del proveedor', async () => {
    vi.mocked(independentCreditsAdmin.recharge).mockResolvedValue(
      movement({
        amount: 100,
        rechargeMethod: 'CASH',
        externalReference: null,
      }),
    )
    mountPanel('independent', DRIVER)
    expect(await panel().findByText('40 créditos')).toBeInTheDocument()
    expect(independentCreditsAdmin.account).toHaveBeenCalledWith(
      DRIVER,
      expect.any(AbortSignal),
    )
    const actor = userEvent.setup()
    await actor.click(
      panel().getByRole('button', { name: 'Registrar recarga' }),
    )
    await actor.type(dialog().getByLabelText('Créditos a sumar'), '100')
    await actor.selectOptions(
      dialog().getByLabelText('Medio de pago confirmado'),
      'CASH',
    )
    await actor.click(dialog().getByRole('button', { name: 'Continuar' }))
    expect(dialog().getByText('Carlos Ruiz')).toBeInTheDocument()
    await actor.click(
      dialog().getByRole('button', { name: 'Registrar recarga' }),
    )
    await waitFor(() =>
      expect(independentCreditsAdmin.recharge).toHaveBeenCalledWith(
        DRIVER,
        { credits: 100, method: 'CASH' },
        'test-movement-key',
      ),
    )
    expect(providerCreditsAdmin.account).not.toHaveBeenCalled()
    expect(providerCreditsAdmin.recharge).not.toHaveBeenCalled()
  })

  it('aparece dentro de la ficha del repartidor independiente', async () => {
    vi.mocked(independentDrivers.get).mockResolvedValue({
      id: 'profile-1',
      driverId: DRIVER,
      status: 'APPROVED',
      approvedAt: stamp,
      approvedByUserId: 'admin-user',
      suspendedAt: null,
      suspendedByUserId: null,
      rejectedAt: null,
      rejectedByUserId: null,
      reason: null,
      createdAt: stamp,
      updatedAt: stamp,
      driver: {
        id: DRIVER,
        name: 'Carlos Ruiz',
        status: 'ACTIVE',
        availability: 'AVAILABLE',
        providerId: PROVIDER,
      },
    })
    vi.mocked(independentDrivers.vehicles).mockResolvedValue([])
    mount(`/independent-drivers/${DRIVER}`)
    expect(await screen.findByText('40 créditos')).toBeInTheDocument()
    expect(panel().getByText('40 créditos')).toBeInTheDocument()
    expect(independentCreditsAdmin.account).toHaveBeenCalledWith(
      DRIVER,
      expect.any(AbortSignal),
    )
  })
})

describe('historial inmutable', () => {
  it('muestra el cargo y su devolución como dos movimientos, sin neteo', async () => {
    vi.mocked(providerCreditsAdmin.ledger).mockResolvedValue(
      page([refund, award]),
    )
    mountPanel('provider')
    expect(await panel().findByText('Cargo por servicio')).toBeInTheDocument()
    expect(panel().getByText('Devolución de servicio')).toBeInTheDocument()
    expect(panel().getByText('-7 créditos')).toBeInTheDocument()
    expect(panel().getByText('+7 créditos')).toBeInTheDocument()
    // Netting the two would destroy the audit trail.
    expect(panel().queryByText('0 créditos')).toBeNull()
    expect(
      panel().getAllByRole('link', { name: 'Servicio del despacho' }),
    ).toHaveLength(2)
    // The ledger is read only: no movement can be edited or deleted.
    for (const name of [
      /editar/i,
      /eliminar/i,
      /borrar/i,
      /corregir movimiento/i,
    ])
      expect(panel().queryByRole('button', { name })).toBeNull()
  })
})

describe('PROVIDER_ADMIN · mis créditos', () => {
  it('consulta su saldo sin acciones administrativas ni llamadas de administración', async () => {
    mount('/provider/credits', 'PROVIDER_ADMIN')
    expect(await screen.findByText('143 créditos')).toBeInTheDocument()
    expect(myProviderCredits.account).toHaveBeenCalledWith(
      PROVIDER,
      expect.any(AbortSignal),
    )
    expect(await screen.findByText('Recarga')).toBeInTheDocument()
    for (const name of [
      'Registrar recarga',
      'Ajuste administrativo',
      'Nueva política',
    ])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(
      screen.getByText(/Las recargas y los ajustes los registra Mandaria/),
    ).toBeInTheDocument()
    expect(providerCreditsAdmin.account).not.toHaveBeenCalled()
    expect(providerCreditsAdmin.recharge).not.toHaveBeenCalled()
    expect(independentCreditsAdmin.account).not.toHaveBeenCalled()
    expect(creditPolicies.list).not.toHaveBeenCalled()
  })

  it('no alcanza la administración de políticas ni la de otras cuentas', () => {
    mount('/credit-policies', 'PROVIDER_ADMIN')
    expect(
      screen.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeInTheDocument()
    expect(creditPolicies.list).not.toHaveBeenCalled()
    expect(creditPolicies.calculate).not.toHaveBeenCalled()
    expect(providerCreditsAdmin.account).not.toHaveBeenCalled()
  })
})

describe('DRIVER · mis créditos', () => {
  it('consulta su propia cuenta, resuelta por la sesión', async () => {
    mount('/driver/credits', 'DRIVER')
    expect(await screen.findByText('40 créditos')).toBeInTheDocument()
    expect(myDriverCredits.account).toHaveBeenCalled()
    expect(await screen.findByText('Cargo por servicio')).toBeInTheDocument()
    expect(screen.getByText('Devolución de servicio')).toBeInTheDocument()
    for (const name of ['Registrar recarga', 'Ajuste administrativo'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(providerCreditsAdmin.account).not.toHaveBeenCalled()
    expect(independentCreditsAdmin.account).not.toHaveBeenCalled()
  })

  it.each([
    ['/credit-policies'],
    ['/credit-policies/new'],
    ['/provider/credits'],
    [`/providers/${PROVIDER}`],
  ])('bloquea %s sin pedir nada al backend', (path) => {
    mount(path, 'DRIVER')
    expect(
      screen.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeInTheDocument()
    expect(creditPolicies.list).not.toHaveBeenCalled()
    expect(providerCreditsAdmin.account).not.toHaveBeenCalled()
    expect(myProviderCredits.account).not.toHaveBeenCalled()
  })
})

describe('los créditos no son dinero', () => {
  it('muestra el costo del servicio en créditos, nunca en pesos', async () => {
    vi.mocked(providerDispatches.list).mockResolvedValue(page([dispatch()]))
    mount('/services', 'PROVIDER_ADMIN')
    const card = await screen.findByRole('article')
    expect(within(card).getByText('Cuesta 7 créditos')).toBeInTheDocument()
    expect(card.textContent).not.toContain('$7')
    expect(card.textContent).not.toContain('7 MXN')
    // The delivery fee stays money and stays separate.
    expect(within(card).getByText('$50.00 MXN')).toBeInTheDocument()
  })

  it('un costo no registrado no se muestra como cero créditos', async () => {
    vi.mocked(providerDispatches.list).mockResolvedValue(
      page([dispatch({ creditCost: null })]),
    )
    mount('/services', 'PROVIDER_ADMIN')
    const card = await screen.findByRole('article')
    expect(
      within(card).getByText('Cuesta Sin costo registrado'),
    ).toBeInTheDocument()
    expect(card.textContent).not.toContain('0 créditos')
  })
})

describe('políticas de créditos', () => {
  it('permite crear una nueva versión desde la vigente, nunca editarla', async () => {
    vi.mocked(creditPolicies.get).mockResolvedValue(policy())
    vi.mocked(creditPolicies.list).mockResolvedValue(
      page([policy(), policy({ id: 'old', version: 1, status: 'INACTIVE' })]),
    )
    vi.mocked(creditPolicies.createVersion).mockResolvedValue(
      policy({ id: 'new', version: 3 }),
    )
    mount(`/credit-policies/${POLICY}`)
    expect(
      await screen.findByRole('heading', {
        name: /Entrega local · Proveedor · versión 2/,
      }),
    ).toBeInTheDocument()
    for (const name of [/editar política/i, /eliminar política/i])
      expect(screen.queryByRole('button', { name })).toBeNull()
    const actor = userEvent.setup()
    await actor.click(
      screen.getByRole('button', { name: 'Crear nueva versión' }),
    )
    await actor.selectOptions(
      dialog().getByLabelText('Tipo de cálculo'),
      'FLAT',
    )
    await actor.type(dialog().getByLabelText('Créditos por servicio'), '9')
    await actor.click(dialog().getByRole('button', { name: 'Crear versión' }))
    await waitFor(() =>
      expect(creditPolicies.createVersion).toHaveBeenCalledWith(POLICY, {
        calculationType: 'FLAT',
        flatCredits: 9,
      }),
    )
    expect(
      await screen.findByText('Versión 3 creada correctamente.'),
    ).toBeInTheDocument()
  })

  it('una versión histórica es inmutable: sin editar, sin eliminar y sin nueva versión', async () => {
    vi.mocked(creditPolicies.get).mockResolvedValue(
      policy({ version: 1, status: 'INACTIVE', effectiveUntil: stamp }),
    )
    vi.mocked(creditPolicies.list).mockResolvedValue(page([policy()]))
    mount(`/credit-policies/${POLICY}`)
    expect(await screen.findByText('Histórica')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Crear nueva versión' }),
    ).toBeNull()
    for (const name of [/editar/i, /eliminar/i, /desactivar/i, /reactivar/i])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(
      screen.getByText(/se conserva tal como se publicó/),
    ).toBeInTheDocument()
  })

  it('la calculadora toma el resultado del backend y nunca inventa un cero', async () => {
    vi.mocked(creditPolicies.list).mockResolvedValue(page([policy()]))
    vi.mocked(creditPolicies.calculate).mockResolvedValue({
      policyId: POLICY,
      policyVersion: 2,
      serviceType: 'LOCAL_DELIVERY',
      actorType: 'PROVIDER',
      calculationType: 'PER_KM',
      distanceMeters: 4200,
      distanceKm: '4.200',
      billableKm: 5,
      calculatedCredits: 10,
      minimumCredits: 5,
      minimumApplied: false,
      rangePosition: null,
      credits: 10,
    })
    mount('/credit-policies')
    const actor = userEvent.setup()
    await actor.click(await screen.findByRole('button', { name: 'Calcular' }))
    await waitFor(() =>
      expect(creditPolicies.calculate).toHaveBeenCalledWith(
        {
          serviceType: 'LOCAL_DELIVERY',
          actorType: 'PROVIDER',
          distanceMeters: 4200,
        },
        expect.any(AbortSignal),
      ),
    )
    expect(await screen.findByText('10 créditos')).toBeInTheDocument()
    expect(screen.getByText('4.2 km (4,200 m)')).toBeInTheDocument()
  })

  it('sin política vigente explica el conflicto y no muestra un costo', async () => {
    vi.mocked(creditPolicies.list).mockResolvedValue(page([]))
    vi.mocked(creditPolicies.calculate).mockRejectedValue(
      normalizeError(409, { code: 'CREDIT_POLICY_UNAVAILABLE' }),
    )
    mount('/credit-policies')
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Calcular' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No existe una política de créditos vigente',
    )
    expect(screen.queryByText('0 créditos')).toBeNull()
  })
})
