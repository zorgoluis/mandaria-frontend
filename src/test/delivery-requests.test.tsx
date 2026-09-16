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
import { deliveryRequests } from '../delivery-requests/service'
import { integrations } from '../integrations/service'
import { providers } from '../providers/service'
import type {
  DeliveryRequest,
  DeliveryRequestSummary,
} from '../delivery-requests/types'
import type { Role } from '../types/api'

vi.mock('../delivery-requests/service', () => ({
  deliveryRequests: { list: vi.fn(), get: vi.fn(), cancel: vi.fn() },
}))
vi.mock('../integrations/service', () => ({
  integrations: { list: vi.fn(), get: vi.fn(), credentials: vi.fn() },
}))
vi.mock('../providers/service', () => ({
  providers: { list: vi.fn(), profiles: vi.fn(), profile: vi.fn() },
}))

const stamp = '2026-09-15T12:00:00Z'
const client = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Coita Eats',
  code: 'COITA_EATS',
}
const pickupPhone = '+52 961 123 4567'
function request(overrides: Partial<DeliveryRequest> = {}): DeliveryRequest {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    publicId: 'MDR-000123',
    integrationClientId: client.id,
    integrationClient: client,
    externalReference: 'ORDER-1842',
    status: 'CREATED',
    requestedAt: stamp,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: stamp,
    updatedAt: stamp,
    stops: [
      {
        type: 'PICKUP',
        sequence: 1,
        address: 'Av. Central 123, Tuxtla Gutiérrez',
        latitude: 16.753554,
        longitude: -93.115983,
        contactName: 'Restaurante Centro',
        contactPhone: pickupPhone,
        instructions: 'Entregar en mostrador',
      },
      {
        type: 'DROPOFF',
        sequence: 2,
        address: 'Calle Norte 45, Col. Moctezuma',
        latitude: 16.76,
        longitude: -93.12,
        contactName: 'Ana López',
        contactPhone: '+52 961 765 4321',
        instructions: null,
      },
    ],
    packages: [
      {
        category: 'FOOD',
        description: 'Pedido preparado de restaurante',
        quantity: 2,
        weightKg: null,
        lengthCm: null,
        widthCm: null,
        heightCm: null,
        isFragile: false,
        handlingInstructions: 'Mantener vertical',
      },
    ],
    financialContext: {
      goodsValue: '450.00',
      goodsPaymentMode: 'PREPAID',
      currency: 'MXN',
    },
    ...overrides,
  }
}
const mdrA = request()
const mdrB = request({
  id: '33333333-3333-4333-8333-333333333333',
  publicId: 'MDR-000124',
  externalReference: 'ORDER-2941',
  packages: [
    mdrA.packages[0],
    {
      category: 'GROCERIES',
      description: 'Despensa',
      quantity: 1,
      weightKg: 1.5,
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30,
      isFragile: true,
      handlingInstructions: null,
    },
  ],
  financialContext: {
    goodsValue: '1250.50',
    goodsPaymentMode: 'COURIER_ADVANCE',
    currency: 'MXN',
  },
})
const mdrC = request({
  id: '44444444-4444-4444-8444-444444444444',
  publicId: 'MDR-000125',
  externalReference: null,
  status: 'CANCELLED',
  cancelledAt: '2026-09-15T13:00:00Z',
  cancellationReason: 'El cliente canceló el pedido',
  packages: [
    { ...mdrA.packages[0], category: 'PARCEL', description: 'Caja mediana' },
  ],
})
const summary = (item: DeliveryRequest): DeliveryRequestSummary => ({
  id: item.id,
  publicId: item.publicId,
  integrationClientId: item.integrationClientId,
  integrationClient: item.integrationClient,
  externalReference: item.externalReference,
  status: item.status,
  requestedAt: item.requestedAt,
  cancelledAt: item.cancelledAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
})
const page = <T,>(items: T[], total = items.length) => ({
  items,
  total,
  totalPages: Math.ceil(total / 20),
  page: 1,
  pageSize: 20,
})
function mount(path: string, role: Role = 'SUPER_ADMIN') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider
          value={{
            user: {
              id: 'user-1',
              email: 'admin@example.test',
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
const details: Record<string, DeliveryRequest> = {
  [mdrA.publicId]: mdrA,
  [mdrB.publicId]: mdrB,
  [mdrC.publicId]: mdrC,
}
const section = (name: string) => within(screen.getByRole('region', { name }))
const value = (scope: ReturnType<typeof section>, label: string) =>
  scope.getByText(label, { selector: 'dt' }).nextElementSibling

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(deliveryRequests.list).mockResolvedValue(
    page([mdrA, mdrB, mdrC].map(summary)),
  )
  vi.mocked(deliveryRequests.get).mockImplementation(async (publicId) => {
    const item = details[publicId]
    if (!item)
      throw normalizeError(404, { message: 'Delivery request not found' })
    return item
  })
  vi.mocked(integrations.list).mockResolvedValue([
    {
      ...client,
      status: 'ACTIVE',
      createdAt: stamp,
      updatedAt: stamp,
      credentials: [],
    },
  ])
  vi.mocked(providers.list).mockResolvedValue(page([]))
})

describe('SUPER_ADMIN navigation and list', () => {
  it('shows Solicitudes in the menu and opens the list', async () => {
    mount('/dashboard')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(links.indexOf('Solicitudes')).toBe(links.indexOf('Vehículos') + 1)
    await userEvent
      .setup()
      .click(within(nav).getByRole('link', { name: 'Solicitudes' }))
    expect(
      await screen.findByRole('heading', { name: 'Solicitudes', level: 1 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('MDR-000123')).toBeInTheDocument()
  })
  it('lists publicId, integration, reference, translated status and date', async () => {
    mount('/delivery-requests')
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(
      within(rows[0]).getByRole('link', { name: 'MDR-000123' }),
    ).toHaveAttribute('href', '/delivery-requests/MDR-000123')
    expect(rows[0]).toHaveTextContent('Coita Eats')
    expect(rows[0]).toHaveTextContent('ORDER-1842')
    expect(rows[0]).toHaveTextContent('Creada')
    expect(rows[2]).toHaveTextContent('Cancelada')
    expect(rows[2]).toHaveTextContent('—')
    expect(table).not.toHaveTextContent('null')
    expect(table).not.toHaveTextContent('CREATED')
    expect(deliveryRequests.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 }),
      expect.any(AbortSignal),
    )
  })
  it('shows the empty state instead of a blank screen', async () => {
    vi.mocked(deliveryRequests.list).mockResolvedValue(page([]))
    mount('/delivery-requests')
    expect(
      await screen.findByRole('heading', {
        name: 'No hay solicitudes de entrega.',
      }),
    ).toBeInTheDocument()
  })
  it('sends only backend-supported filters and paginates on the server', async () => {
    vi.mocked(deliveryRequests.list).mockResolvedValue(
      page([summary(mdrA)], 45),
    )
    mount('/delivery-requests')
    await screen.findByRole('table')
    const actor = userEvent.setup()
    await actor.type(screen.getByLabelText('Identificador'), ' mdr-000123 ')
    await actor.type(screen.getByLabelText('Referencia externa'), 'ORDER-1842')
    await actor.type(screen.getByLabelText('Solicitadas desde'), '2026-09-01')
    await actor.type(screen.getByLabelText('Solicitadas hasta'), '2026-09-15')
    await actor.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por integración'),
      client.id,
    )
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'CREATED',
    )
    await waitFor(() =>
      expect(deliveryRequests.list).toHaveBeenLastCalledWith(
        {
          page: 1,
          pageSize: 20,
          publicId: 'MDR-000123',
          integrationClientId: client.id,
          externalReference: 'ORDER-1842',
          status: 'CREATED',
          requestedFrom: new Date('2026-09-01T00:00:00').toISOString(),
          requestedTo: new Date('2026-09-15T23:59:59.999').toISOString(),
        },
        expect.any(AbortSignal),
      ),
    )
    // Typed values survive applying a select filter.
    expect(screen.getByLabelText('Referencia externa')).toHaveValue(
      'ORDER-1842',
    )
    await actor.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(deliveryRequests.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, status: 'CREATED' }),
        expect.any(AbortSignal),
      ),
    )
    await actor.click(screen.getByRole('button', { name: 'Limpiar' }))
    // Unfiltered page 1 was already fetched at mount; React Query may serve it from cache.
    await waitFor(() =>
      expect(screen.getByLabelText('Filtrar por estado')).toHaveValue(''),
    )
    await waitFor(() =>
      expect(deliveryRequests.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          status: undefined,
          publicId: undefined,
        }),
        expect.any(AbortSignal),
      ),
    )
    expect(screen.getByLabelText('Identificador')).toHaveValue('')
  })
  it('clearing filters and immediately selecting a status drops old filters', async () => {
    mount('/delivery-requests?publicId=MDR-000123&externalReference=ORDER-1842')
    await screen.findByRole('table')
    const actor = userEvent.setup()
    await actor.click(screen.getByRole('button', { name: 'Limpiar' }))
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'CANCELLED',
    )
    await waitFor(() =>
      expect(deliveryRequests.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'CANCELLED',
          publicId: undefined,
          externalReference: undefined,
        }),
        expect.any(AbortSignal),
      ),
    )
  })
  it.each([
    ['/delivery-requests?publicId=123', 'MDR-000123'],
    ['/delivery-requests?from=2026-09-10&to=2026-09-01', 'fecha inicial'],
    ['/delivery-requests?status=DISPATCHED', 'estado'],
    ['/delivery-requests?integrationClientId=abc', 'integración'],
  ])(
    'rejects invalid filter %s without calling the API',
    async (path, text) => {
      mount(path)
      expect(await screen.findByRole('alert')).toHaveTextContent(text)
      expect(deliveryRequests.list).not.toHaveBeenCalled()
    },
  )
  it.each([403, 429, 500, 0])('handles list HTTP %s safely', async (status) => {
    vi.mocked(deliveryRequests.list).mockRejectedValue(
      normalizeError(status, { message: 'SELECT * FROM "DeliveryStop"' }),
    )
    mount('/delivery-requests')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(normalizeError(status, null).message)
    expect(alert).not.toHaveTextContent('SELECT')
  })
})

describe('detail', () => {
  it('shows header, pickup, dropoff, package and PREPAID context', async () => {
    mount('/delivery-requests/MDR-000123')
    await screen.findByRole('region', { name: 'Resumen' })
    expect(
      screen.getByRole('heading', { name: 'MDR-000123', level: 1 }),
    ).toBeInTheDocument()
    const summaryPanel = section('Resumen')
    expect(value(summaryPanel, 'Estado')).toHaveTextContent('Creada')
    expect(value(summaryPanel, 'Referencia externa')).toHaveTextContent(
      'ORDER-1842',
    )
    expect(
      summaryPanel.getByRole('link', { name: /Coita Eats/ }),
    ).toHaveAttribute('href', `/integrations/${client.id}`)

    const pickup = section('Recogida')
    expect(value(pickup, 'Dirección')).toHaveTextContent('Av. Central 123')
    expect(value(pickup, 'Contacto')).toHaveTextContent('Restaurante Centro')
    expect(value(pickup, 'Teléfono')).toHaveTextContent(pickupPhone)
    expect(value(pickup, 'Instrucciones')).toHaveTextContent(
      'Entregar en mostrador',
    )
    expect(value(pickup, 'Coordenadas')).toHaveTextContent(
      '16.753554, -93.115983',
    )
    const dropoff = section('Entrega')
    expect(value(dropoff, 'Contacto')).toHaveTextContent('Ana López')
    expect(value(dropoff, 'Instrucciones')).toHaveTextContent(
      'Sin instrucciones',
    )

    const packages = section('Paquetes')
    expect(packages.getAllByRole('listitem')).toHaveLength(1)
    expect(packages.getByText('Comida')).toBeInTheDocument()
    expect(
      packages.getByText('Pedido preparado de restaurante'),
    ).toBeInTheDocument()
    expect(value(packages, 'Cantidad')).toHaveTextContent('2')
    expect(value(packages, 'Peso')).toHaveTextContent('No informado')
    expect(value(packages, 'Dimensiones')).toHaveTextContent('No informadas')
    expect(value(packages, 'Frágil')).toHaveTextContent('No')
    expect(value(packages, 'Manejo')).toHaveTextContent('Mantener vertical')

    const financial = section('Contexto económico')
    expect(value(financial, 'Valor de mercancía')).toHaveTextContent(
      '$450.00 MXN',
    )
    expect(value(financial, 'Modalidad')).toHaveTextContent(
      'Mercancía prepagada',
    )
    expect(value(financial, 'Modalidad')).toHaveTextContent('PREPAID')
    expect(
      financial.getByText('El comercio ya recibió el pago de la mercancía.'),
    ).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(main).not.toHaveTextContent('null')
    expect(main).not.toHaveTextContent(/Costo de envío/i)
    expect(main).not.toHaveTextContent(/Cotización/i)
    expect(
      screen.queryByRole('button', { name: /Editar|Eliminar/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cancelar solicitud' }),
    ).toBeInTheDocument()
    expect(deliveryRequests.get).toHaveBeenCalledWith(
      'MDR-000123',
      expect.any(AbortSignal),
    )
  })
  it('shows multiple packages, dimensions and COURIER_ADVANCE', async () => {
    mount('/delivery-requests/MDR-000124')
    const packages = await screen
      .findByRole('region', { name: 'Paquetes' })
      .then((node) => within(node))
    const cards = packages.getAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(packages.getByText('2 paquetes · 3 unidades')).toBeInTheDocument()
    const second = within(cards[1])
    expect(second.getByText('Supermercado')).toBeInTheDocument()
    expect(value(second, 'Peso')).toHaveTextContent('1.5 kg')
    expect(value(second, 'Dimensiones')).toHaveTextContent('50 × 40 × 30 cm')
    expect(value(second, 'Frágil')).toHaveTextContent('Sí')
    expect(value(second, 'Manejo')).toHaveTextContent('Sin indicaciones')
    const financial = section('Contexto económico')
    expect(value(financial, 'Valor de mercancía')).toHaveTextContent(
      '$1,250.50 MXN',
    )
    expect(value(financial, 'Modalidad')).toHaveTextContent(
      'Adelanto por repartidor',
    )
    expect(value(financial, 'Modalidad')).toHaveTextContent('COURIER_ADVANCE')
    expect(
      financial.getByText(
        'El repartidor deberá adelantar el valor de la mercancía al recogerla.',
      ),
    ).toBeInTheDocument()
  })
  it('shows a cancelled request read-only with date, reason and null reference', async () => {
    mount('/delivery-requests/MDR-000125')
    const cancellation = await screen
      .findByRole('region', { name: 'Cancelación' })
      .then((node) => within(node))
    expect(value(cancellation, 'Estado')).toHaveTextContent('Cancelada')
    expect(value(cancellation, 'Fecha')).not.toHaveTextContent('Sin registro')
    expect(value(cancellation, 'Motivo')).toHaveTextContent(
      'El cliente canceló el pedido',
    )
    expect(value(section('Resumen'), 'Referencia externa')).toHaveTextContent(
      '—',
    )
    expect(section('Paquetes').getByText('Paquete')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Cancelar|Editar|Eliminar/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('main')).not.toHaveTextContent('null')
  })
  it('does not call the API for a malformed publicId', () => {
    mount('/delivery-requests/not-an-id')
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    expect(deliveryRequests.get).not.toHaveBeenCalled()
  })
  it.each([
    [404, 'no existe'],
    [403, '403'],
    [429, 'Demasiados intentos'],
    [500, 'no está disponible'],
    [0, 'Error de conexión'],
  ])('handles detail HTTP %s', async (status, text) => {
    vi.mocked(deliveryRequests.get).mockRejectedValue(
      normalizeError(status, {
        message: status === 404 ? 'Delivery request not found' : 'raw detail',
      }),
    )
    mount('/delivery-requests/MDR-000999')
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute(
      'href',
      '/delivery-requests',
    )
  })
  it('keeps personal data out of console and browser storage', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method),
    )
    mount('/delivery-requests/MDR-000123')
    await screen.findByRole('region', { name: 'Recogida' })
    for (const spy of spies)
      expect(JSON.stringify(spy.mock.calls)).not.toContain(pickupPhone)
    const stored = JSON.stringify({ ...localStorage, ...sessionStorage })
    expect(stored).not.toContain(pickupPhone)
    expect(stored).not.toContain('Restaurante Centro')
  })
})

describe('cancel', () => {
  async function openDialog() {
    mount('/delivery-requests/MDR-000123')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Cancelar solicitud' }),
    )
    return { actor, dialog: within(screen.getByRole('dialog')) }
  }
  it('requires confirmation and a reason, then updates the state', async () => {
    const cancelled = {
      ...mdrA,
      status: 'CANCELLED' as const,
      cancelledAt: '2026-09-15T14:00:00Z',
      cancellationReason: 'Pedido duplicado',
    }
    vi.mocked(deliveryRequests.cancel).mockResolvedValue(cancelled)
    const { actor, dialog } = await openDialog()
    expect(dialog.getByText(/pasará a Cancelada/)).toBeInTheDocument()
    await actor.click(dialog.getByRole('button', { name: 'Volver' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deliveryRequests.cancel).not.toHaveBeenCalled()

    await actor.click(
      screen.getByRole('button', { name: 'Cancelar solicitud' }),
    )
    const again = within(screen.getByRole('dialog'))
    await actor.type(again.getByLabelText('Motivo de cancelación'), '   ')
    await actor.click(
      again.getByRole('button', { name: 'Confirmar cancelación' }),
    )
    expect(await again.findByRole('alert')).toHaveTextContent(
      'Escribe el motivo de cancelación.',
    )
    expect(deliveryRequests.cancel).not.toHaveBeenCalled()

    await actor.clear(again.getByLabelText('Motivo de cancelación'))
    await actor.type(
      again.getByLabelText('Motivo de cancelación'),
      ' Pedido duplicado ',
    )
    await actor.click(
      again.getByRole('button', { name: 'Confirmar cancelación' }),
    )
    await waitFor(() =>
      expect(deliveryRequests.cancel).toHaveBeenCalledWith(
        'MDR-000123',
        'Pedido duplicado',
      ),
    )
    expect(
      await screen.findByText('Solicitud cancelada correctamente.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const cancellation = within(
      screen.getByRole('region', { name: 'Cancelación' }),
    )
    expect(value(cancellation, 'Motivo')).toHaveTextContent('Pedido duplicado')
    expect(value(section('Resumen'), 'Estado')).toHaveTextContent('Cancelada')
    expect(
      screen.queryByRole('button', { name: 'Cancelar solicitud' }),
    ).not.toBeInTheDocument()
  })
  it('shows a safe error and keeps the request unchanged', async () => {
    vi.mocked(deliveryRequests.cancel).mockRejectedValue(
      normalizeError(409, { message: 'raw conflict detail' }),
    )
    const { actor, dialog } = await openDialog()
    await actor.type(dialog.getByLabelText('Motivo de cancelación'), 'Motivo')
    await actor.click(
      dialog.getByRole('button', { name: 'Confirmar cancelación' }),
    )
    const alert = await dialog.findByRole('alert')
    expect(alert).toHaveTextContent(normalizeError(409, null).message)
    expect(alert).not.toHaveTextContent('raw conflict')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(value(section('Resumen'), 'Estado')).toHaveTextContent('Creada')
  })
  it('reports a double cancellation with the original reason preserved', async () => {
    vi.mocked(deliveryRequests.cancel).mockResolvedValue({
      ...mdrA,
      status: 'CANCELLED',
      cancelledAt: '2026-09-15T13:00:00Z',
      cancellationReason: 'Cancelada por la integración',
    })
    const { actor, dialog } = await openDialog()
    await actor.type(dialog.getByLabelText('Motivo de cancelación'), 'Otro')
    await actor.click(
      dialog.getByRole('button', { name: 'Confirmar cancelación' }),
    )
    expect(await screen.findByText(/ya estaba cancelada/)).toBeInTheDocument()
    expect(value(section('Cancelación'), 'Motivo')).toHaveTextContent(
      'Cancelada por la integración',
    )
  })
})

describe('PROVIDER_ADMIN and DRIVER', () => {
  it.each(['PROVIDER_ADMIN', 'DRIVER'] as Role[])(
    '%s has no menu entry and is blocked from list and detail',
    (role) => {
      for (const path of [
        '/delivery-requests',
        '/delivery-requests/MDR-000123',
      ]) {
        mount(path, role)
        expect(
          screen.getByRole('heading', { name: 'Sin permisos' }),
        ).toBeInTheDocument()
        expect(
          screen.queryByRole('link', { name: 'Solicitudes' }),
        ).not.toBeInTheDocument()
        cleanup()
      }
      expect(deliveryRequests.list).not.toHaveBeenCalled()
      expect(deliveryRequests.get).not.toHaveBeenCalled()
      expect(deliveryRequests.cancel).not.toHaveBeenCalled()
    },
  )
})

describe('dashboard', () => {
  it('counts created and cancelled requests with server totals only', async () => {
    vi.mocked(deliveryRequests.list).mockImplementation(async (filters) =>
      page([], filters.status === 'CREATED' ? 7 : 2),
    )
    mount('/dashboard')
    const created = await screen.findByText('Solicitudes creadas')
    await waitFor(() =>
      expect(created.closest('.stat-card')).toHaveTextContent('7'),
    )
    expect(
      screen.getByText('Solicitudes canceladas').closest('.stat-card'),
    ).toHaveTextContent('2')
    expect(deliveryRequests.list).toHaveBeenCalledTimes(2)
    for (const [filters] of vi.mocked(deliveryRequests.list).mock.calls)
      expect(filters.pageSize).toBe(1)
  })
})
