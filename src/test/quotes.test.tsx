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
import { deliveryQuotes } from '../quotes/service'
import { deliveryRequests } from '../delivery-requests/service'
import { serviceZones, ratePlans } from '../pricing/service'
import { integrations } from '../integrations/service'
import type { DeliveryQuote } from '../quotes/types'
import type { DeliveryRequest } from '../delivery-requests/types'
import type { Role } from '../types/api'

vi.mock('../quotes/service', () => ({
  deliveryQuotes: { list: vi.fn(), get: vi.fn(), forRequest: vi.fn() },
}))
vi.mock('../delivery-requests/service', () => ({
  deliveryRequests: { list: vi.fn(), get: vi.fn(), cancel: vi.fn() },
}))
vi.mock('../pricing/service', () => ({
  serviceZones: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    replaceBoundary: vi.fn(),
    transition: vi.fn(),
  },
  ratePlans: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    clone: vi.fn(),
    updateValidity: vi.fn(),
    replaceBands: vi.fn(),
    validate: vi.fn(),
    transition: vi.fn(),
  },
}))
vi.mock('../integrations/service', () => ({
  integrations: { list: vi.fn(), get: vi.fn(), credentials: vi.fn() },
}))

const stamp = '2026-09-15T12:00:00Z'
const zoneId = '11111111-1111-4111-8111-111111111111'
const planId = '33333333-3333-4333-8333-333333333333'
const client = {
  id: '99999999-9999-4999-8999-999999999999',
  name: 'Coita Eats',
  code: 'COITA_EATS',
}
function quote(overrides: Partial<DeliveryQuote> = {}): DeliveryQuote {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    publicId: 'MQ-000092',
    deliveryRequestId: '88888888-8888-4888-8888-888888888888',
    deliveryRequest: {
      publicId: 'MDR-000123',
      integrationClientId: client.id,
      status: 'CREATED',
    },
    serviceType: 'LOCAL_DELIVERY',
    serviceZoneId: zoneId,
    serviceZone: { id: zoneId, code: 'OCOZOCOAUTLA', name: 'Ocozocoautla' },
    ratePlanId: planId,
    ratePlan: { id: planId, version: 3 },
    rateBandId: 'band-3',
    rateBand: {
      id: 'band-3',
      minDistanceMeters: 4000,
      maxDistanceMeters: 6000,
    },
    distanceMeters: 4700,
    durationSeconds: 720,
    amount: '50.00',
    currency: 'MXN',
    routingProvider: 'google',
    routeCalculatedAt: stamp,
    status: 'ACCEPTED',
    expiresAt: '2026-09-15T12:15:00Z',
    acceptedAt: '2026-09-15T12:07:00Z',
    expiredAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}
const accepted = quote()
const offered = quote({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  publicId: 'MQ-000093',
  status: 'OFFERED',
  acceptedAt: null,
})
const expired = quote({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  publicId: 'MQ-000094',
  status: 'EXPIRED',
  acceptedAt: null,
  expiredAt: '2026-09-15T12:15:00Z',
})
const cancelled = quote({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  publicId: 'MQ-000095',
  status: 'CANCELLED',
  acceptedAt: null,
  cancelledAt: '2026-09-15T12:30:00Z',
  cancellationReason: 'DELIVERY_REQUEST_CANCELLED',
})
const quotes: Record<string, DeliveryQuote> = {
  'MQ-000092': accepted,
  'MQ-000093': offered,
  'MQ-000094': expired,
  'MQ-000095': cancelled,
}
const request: DeliveryRequest = {
  id: '88888888-8888-4888-8888-888888888888',
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
      address: 'Av. Central 123',
      latitude: 16.753554,
      longitude: -93.115983,
      contactName: 'Restaurante Centro',
      contactPhone: '+52 961 123 4567',
      instructions: null,
    },
    {
      type: 'DROPOFF',
      sequence: 2,
      address: 'Calle Norte 45',
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
      description: 'Pedido preparado',
      quantity: 1,
      weightKg: null,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      isFragile: false,
      handlingInstructions: null,
    },
  ],
  financialContext: {
    goodsValue: '450.00',
    goodsPaymentMode: 'PREPAID',
    currency: 'MXN',
  },
}
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
/** Panels render after their query resolves, so the region is always awaited. */
const section = async (name: string) =>
  within(await screen.findByRole('region', { name }))
const value = (scope: Awaited<ReturnType<typeof section>>, label: string) =>
  scope.getByText(label, { selector: 'dt' }).nextElementSibling

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(deliveryQuotes.list).mockResolvedValue(
    page([accepted, offered, expired, cancelled]),
  )
  vi.mocked(deliveryQuotes.get).mockImplementation(async (publicId) => {
    const item = quotes[publicId]
    if (!item)
      throw normalizeError(404, { message: 'Delivery quote not found' })
    return item
  })
  vi.mocked(deliveryQuotes.forRequest).mockResolvedValue(page([accepted]))
  vi.mocked(deliveryRequests.list).mockResolvedValue(page([request]))
  vi.mocked(deliveryRequests.get).mockResolvedValue(request)
  vi.mocked(serviceZones.list).mockResolvedValue(page([]))
  vi.mocked(ratePlans.list).mockResolvedValue(page([]))
  vi.mocked(integrations.list).mockResolvedValue([])
})

describe('quote list', () => {
  it('opens from the menu with translated statuses, price, distance and duration', async () => {
    mount('/dashboard')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    await userEvent
      .setup()
      .click(within(nav).getByRole('link', { name: 'Cotizaciones' }))
    expect(
      await screen.findByRole('heading', { name: 'Cotizaciones', level: 1 }),
    ).toBeInTheDocument()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('MQ-000092')
    expect(rows[0]).toHaveTextContent('MDR-000123')
    expect(rows[0]).toHaveTextContent('$50.00 MXN')
    expect(rows[0]).toHaveTextContent('4.7 km')
    expect(rows[0]).toHaveTextContent('12 min')
    expect(rows[0]).toHaveTextContent('Aceptada')
    expect(rows[1]).toHaveTextContent('Ofrecida')
    expect(rows[2]).toHaveTextContent('Expirada')
    expect(rows[3]).toHaveTextContent('Cancelada')
    for (const technical of ['OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED'])
      expect(table).not.toHaveTextContent(technical)
    expect(table).not.toHaveTextContent('$0')
  })
  it('shows an empty state when there are no quotes', async () => {
    vi.mocked(deliveryQuotes.list).mockResolvedValue(page([]))
    mount('/delivery-quotes')
    expect(
      await screen.findByRole('heading', { name: 'No hay cotizaciones.' }),
    ).toBeInTheDocument()
  })
  it('sends the filters the admin DTO accepts', async () => {
    mount('/delivery-quotes')
    await screen.findByRole('table')
    const user = userEvent.setup()
    await user.type(
      screen.getByLabelText('Identificador de cotización'),
      'mq-000092',
    )
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() =>
      expect(deliveryQuotes.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ publicId: 'MQ-000092' }),
        expect.any(AbortSignal),
      ),
    )
    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'EXPIRED',
    )
    await waitFor(() =>
      expect(deliveryQuotes.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'EXPIRED' }),
        expect.any(AbortSignal),
      ),
    )
  })
  it('refuses a malformed identifier typed into the URL without calling the API', async () => {
    mount('/delivery-quotes?publicId=MQ-1')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /formato MQ-000092/,
    )
    expect(deliveryQuotes.list).not.toHaveBeenCalled()
  })
})

describe('quote detail', () => {
  it('shows the persisted snapshot: price, distance, duration, zone, plan version', async () => {
    mount('/delivery-quotes/MQ-000092')
    expect(
      await screen.findByRole('heading', { name: 'MQ-000092', level: 1 }),
    ).toBeInTheDocument()
    const summary = await section('Resumen')
    expect(value(summary, 'Precio')).toHaveTextContent('$50.00 MXN')
    expect(value(summary, 'Distancia')).toHaveTextContent('4.7 km')
    expect(value(summary, 'Duración estimada')).toHaveTextContent('12 min')
    expect(value(summary, 'Zona')).toHaveTextContent('Ocozocoautla')
    expect(value(summary, 'Servicio')).toHaveTextContent('Entrega local')
    expect(value(summary, 'Tarifa')).toHaveTextContent('Versión 3')
    expect(value(summary, 'Estado')).toHaveTextContent('Aceptada')
    // The rate plan of the snapshot, never the currently active one.
    expect(
      within(
        summary.getByText('Tarifa', { selector: 'dt' })
          .nextElementSibling as HTMLElement,
      ).getByRole('link'),
    ).toHaveAttribute('href', `/rate-plans/${planId}`)
    expect(ratePlans.list).not.toHaveBeenCalled()
  })
  it('shows the acceptance time and never presents an accepted quote as expired', async () => {
    mount('/delivery-quotes/MQ-000092')
    const panel = await section('Vigencia y estado')
    expect(
      await panel.findByText('Aceptada', { selector: 'dt' }),
    ).toBeInTheDocument()
    expect(panel.queryByText('Válida hasta', { selector: 'dt' })).toBeNull()
    expect(panel.queryByText('Expiró', { selector: 'dt' })).toBeNull()
  })
  it('shows the validity deadline for an offered quote', async () => {
    mount('/delivery-quotes/MQ-000093')
    const panel = await section('Vigencia y estado')
    expect(
      await panel.findByText('Válida hasta', { selector: 'dt' }),
    ).toBeInTheDocument()
    expect(panel.queryByText('Aceptada', { selector: 'dt' })).toBeNull()
    expect(
      screen.getByText(/no determina cuándo se realizará el servicio/i),
    ).toBeInTheDocument()
  })
  it('marks an expired quote and offers no administrative acceptance', async () => {
    mount('/delivery-quotes/MQ-000094')
    expect(
      await screen.findByRole('heading', { name: 'MQ-000094', level: 1 }),
    ).toBeInTheDocument()
    expect(value(await section('Resumen'), 'Estado')).toHaveTextContent(
      'Expirada',
    )
    expect(
      (await section('Vigencia y estado')).getByText('Expiró', {
        selector: 'dt',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aceptar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull()
  })
  it('shows the cancellation reason of a cancelled quote', async () => {
    mount('/delivery-quotes/MQ-000095')
    const panel = await section('Vigencia y estado')
    expect(
      await panel.findByText('Cancelada', { selector: 'dt' }),
    ).toBeInTheDocument()
    expect(value(panel, 'Motivo')).toHaveTextContent(
      'DELIVERY_REQUEST_CANCELLED',
    )
  })
  it('names the routing provider without exposing any configuration', async () => {
    mount('/delivery-quotes/MQ-000092')
    const technical = await section('Información técnica y fechas')
    expect(
      await technical.findByText('Proveedor de ruta', { selector: 'dt' }),
    ).toBeInTheDocument()
    expect(value(technical, 'Proveedor de ruta')).toHaveTextContent('Google')
  })
  it('answers 404 for an identifier that is not a quote id', async () => {
    mount('/delivery-quotes/MDR-000123')
    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(deliveryQuotes.get).not.toHaveBeenCalled()
  })
  it('explains a quote that no longer exists', async () => {
    mount('/delivery-quotes/MQ-000999')
    expect(
      await screen.findByText('La cotización ya no está disponible.'),
    ).toBeInTheDocument()
  })
})

describe('quotes inside a delivery request', () => {
  it('adds the quotes section keeping the V1.5 panels intact', async () => {
    mount('/delivery-requests/MDR-000123')
    expect(
      await screen.findByRole('heading', { name: 'MDR-000123', level: 1 }),
    ).toBeInTheDocument()
    for (const name of [
      'Recogida',
      'Entrega',
      'Paquetes',
      'Contexto económico',
      'Cotizaciones',
    ])
      expect(await screen.findByRole('region', { name })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cancelar solicitud' }),
    ).toBeInTheDocument()
    const quotesPanel = await section('Cotizaciones')
    const row = within(await quotesPanel.findByRole('table')).getAllByRole(
      'row',
    )[1]
    expect(row).toHaveTextContent('MQ-000092')
    expect(row).toHaveTextContent('$50.00 MXN')
    expect(deliveryQuotes.forRequest).toHaveBeenCalledWith(
      'MDR-000123',
      1,
      20,
      expect.any(AbortSignal),
    )
  })
  it('keeps the goods value and the delivery cost as separate amounts', async () => {
    mount('/delivery-requests/MDR-000123')
    await screen.findByRole('heading', { name: 'MDR-000123', level: 1 })
    const financial = await section('Contexto económico')
    expect(value(financial, 'Valor de mercancía')).toHaveTextContent(
      '$450.00 MXN',
    )
    expect(value(financial, 'Modalidad')).toHaveTextContent(
      'Mercancía prepagada',
    )
    const quotesPanel = await section('Cotizaciones')
    expect(await quotesPanel.findByRole('table')).toHaveTextContent(
      '$50.00 MXN',
    )
    // The operational total does not exist yet, so it is never presented.
    expect(document.body).not.toHaveTextContent('$500')
  })
  it('shows an empty state when the request has no quote yet', async () => {
    vi.mocked(deliveryQuotes.forRequest).mockResolvedValue(page([]))
    mount('/delivery-requests/MDR-000123')
    const quotesPanel = await section('Cotizaciones')
    expect(
      await quotesPanel.findByRole('heading', { name: 'No hay cotizaciones.' }),
    ).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('$0')
  })
  it('keeps the request readable when the quote history fails', async () => {
    vi.mocked(deliveryQuotes.forRequest).mockRejectedValue(
      normalizeError(500, null),
    )
    mount('/delivery-requests/MDR-000123')
    await screen.findByRole('heading', { name: 'MDR-000123', level: 1 })
    const quotesPanel = await section('Cotizaciones')
    expect(
      await quotesPanel.findByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Contexto económico' }),
    ).toBeInTheDocument()
  })
})

describe('security', () => {
  it('blocks PROVIDER_ADMIN from the global quote routes', async () => {
    for (const path of ['/delivery-quotes', '/delivery-quotes/MQ-000092']) {
      queryClient.clear()
      const view = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <AuthContext.Provider
              value={{
                user: {
                  id: 'user-2',
                  email: 'provider@example.test',
                  role: 'PROVIDER_ADMIN',
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
    expect(deliveryQuotes.list).not.toHaveBeenCalled()
    expect(deliveryQuotes.get).not.toHaveBeenCalled()
  })
  it('shows the 403 state when the backend refuses the quote list', async () => {
    vi.mocked(deliveryQuotes.list).mockRejectedValue(normalizeError(403, null))
    mount('/delivery-quotes')
    expect(
      await screen.findByRole('heading', { name: '403 — Sin permisos' }),
    ).toBeInTheDocument()
  })
})
