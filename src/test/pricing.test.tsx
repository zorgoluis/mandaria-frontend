import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
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
import { ratePlans, serviceZones } from '../pricing/service'
import { deliveryQuotes } from '../quotes/service'
import { integrations } from '../integrations/service'
import type { RatePlan, ServiceZone } from '../pricing/types'
import type { Role } from '../types/api'

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
vi.mock('../quotes/service', () => ({
  deliveryQuotes: { list: vi.fn(), get: vi.fn(), forRequest: vi.fn() },
}))
vi.mock('../integrations/service', () => ({
  integrations: { list: vi.fn(), get: vi.fn(), credentials: vi.fn() },
}))

const stamp = '2026-09-15T12:00:00Z'
const zoneId = '11111111-1111-4111-8111-111111111111'
const ids = {
  v3: '33333333-3333-4333-8333-333333333333',
  v2: '44444444-4444-4444-8444-444444444444',
  v1: '55555555-5555-4555-8555-555555555555',
  v4: '66666666-6666-4666-8666-666666666666',
}
const boundary = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-93.41, 16.735],
      [-93.34, 16.735],
      [-93.34, 16.79],
      [-93.41, 16.79],
      [-93.41, 16.735],
    ],
  ],
}
function zone(overrides: Partial<ServiceZone> = {}): ServiceZone {
  return {
    id: zoneId,
    code: 'OCOZOCOAUTLA',
    name: 'Ocozocoautla',
    status: 'ACTIVE',
    currency: 'MXN',
    minLatitude: 16.735,
    maxLatitude: 16.79,
    minLongitude: -93.41,
    maxLongitude: -93.34,
    createdAt: stamp,
    updatedAt: stamp,
    boundary,
    ...overrides,
  }
}
const bands = (values: [number, number, string][]) =>
  values.map(([min, max, amount], index) => ({
    id: `band-${index}`,
    minDistanceMeters: min,
    maxDistanceMeters: max,
    amount,
    currency: 'MXN',
  }))
function plan(overrides: Partial<RatePlan> = {}): RatePlan {
  return {
    id: ids.v3,
    serviceZoneId: zoneId,
    serviceType: 'LOCAL_DELIVERY',
    version: 3,
    status: 'ACTIVE',
    calculationType: 'DISTANCE_BANDS',
    quoteValidityMinutes: 15,
    currency: 'MXN',
    serviceZone: {
      id: zoneId,
      code: 'OCOZOCOAUTLA',
      name: 'Ocozocoautla',
      status: 'ACTIVE',
    },
    bands: bands([
      [0, 2000, '30.00'],
      [2000, 4000, '40.00'],
      [4000, 6000, '50.00'],
    ]),
    createdAt: stamp,
    updatedAt: stamp,
    activatedAt: stamp,
    deactivatedAt: null,
    ...overrides,
  }
}
const v3 = plan()
const v2 = plan({
  id: ids.v2,
  version: 2,
  status: 'INACTIVE',
  activatedAt: '2026-08-01T12:00:00Z',
  deactivatedAt: stamp,
  bands: bands([[0, 3000, '25.00']]),
})
const v1 = plan({
  id: ids.v1,
  version: 1,
  status: 'INACTIVE',
  activatedAt: '2026-07-01T12:00:00Z',
  deactivatedAt: '2026-08-01T12:00:00Z',
  bands: bands([[0, 3000, '20.00']]),
})
const draft = plan({
  id: ids.v4,
  version: 4,
  status: 'DRAFT',
  activatedAt: null,
  deactivatedAt: null,
})
const plans: Record<string, RatePlan> = {
  [ids.v3]: v3,
  [ids.v2]: v2,
  [ids.v1]: v1,
  [ids.v4]: draft,
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
const section = (name: string) => within(screen.getByRole('region', { name }))
const value = (scope: ReturnType<typeof section>, label: string) =>
  scope.getByText(label, { selector: 'dt' }).nextElementSibling

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(serviceZones.list).mockResolvedValue(page([zone()]))
  vi.mocked(serviceZones.get).mockImplementation(async (id) => {
    if (id !== zoneId)
      throw normalizeError(404, { message: 'Service zone not found' })
    return zone()
  })
  vi.mocked(ratePlans.list).mockImplementation(async (filters) =>
    page(
      [v3, v2, v1].filter(
        (item) => !filters.status || item.status === filters.status,
      ),
    ),
  )
  vi.mocked(ratePlans.get).mockImplementation(async (id) => {
    const item = plans[id]
    if (!item) throw normalizeError(404, { message: 'Rate plan not found' })
    return item
  })
  vi.mocked(ratePlans.validate).mockResolvedValue({
    ratePlanId: draft.id,
    valid: true,
    errors: [],
  })
  vi.mocked(deliveryQuotes.list).mockResolvedValue(page([]))
  vi.mocked(deliveryQuotes.forRequest).mockResolvedValue(page([]))
  vi.mocked(integrations.list).mockResolvedValue([])
})

describe('service zones list', () => {
  it('opens from the menu and shows name, code, status, currency and the active rate', async () => {
    mount('/dashboard')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    await userEvent
      .setup()
      .click(within(nav).getByRole('link', { name: 'Zonas de servicio' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Zonas de servicio',
        level: 1,
      }),
    ).toBeInTheDocument()
    const row = within(await screen.findByRole('table')).getAllByRole('row')[1]
    expect(
      within(row).getByRole('link', { name: 'OcozocoautlaOCOZOCOAUTLA' }),
    ).toHaveAttribute('href', `/service-zones/${zoneId}`)
    expect(row).toHaveTextContent('OCOZOCOAUTLA')
    expect(row).toHaveTextContent('Activa')
    expect(row).toHaveTextContent('MXN')
    expect(
      await within(row).findByText(/Entrega local · v3/),
    ).toBeInTheDocument()
    expect(row).not.toHaveTextContent('ACTIVE')
  })
  it('shows an empty state instead of a blank table', async () => {
    vi.mocked(serviceZones.list).mockResolvedValue(page([]))
    mount('/service-zones')
    expect(
      await screen.findByRole('heading', { name: 'No hay zonas de servicio.' }),
    ).toBeInTheDocument()
  })
  it('reports when a zone has no active rate plan', async () => {
    vi.mocked(ratePlans.list).mockResolvedValue(page([]))
    mount('/service-zones')
    expect(await screen.findByText('Sin tarifa activa')).toBeInTheDocument()
  })
  it('sends the search and status filters the backend accepts', async () => {
    mount('/service-zones')
    await screen.findByRole('table')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Buscar zona'), 'ocoz')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'INACTIVE',
    )
    await waitFor(() =>
      expect(serviceZones.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'ocoz', status: 'INACTIVE' }),
        expect.any(AbortSignal),
      ),
    )
  })
})

describe('service zone detail', () => {
  it('shows status, currency and the coverage without a map editor', async () => {
    mount(`/service-zones/${zoneId}`)
    expect(
      await screen.findByRole('heading', { name: 'Ocozocoautla', level: 1 }),
    ).toBeInTheDocument()
    const summary = section('Resumen')
    expect(value(summary, 'Estado')).toHaveTextContent('Activa')
    expect(value(summary, 'Moneda')).toHaveTextContent('MXN')
    const coverage = section('Cobertura')
    expect(value(coverage, 'Geometría')).toHaveTextContent('Polygon')
    expect(value(coverage, 'Posiciones')).toHaveTextContent('5')
    expect(
      coverage.getByLabelText('GeoJSON de la cobertura'),
    ).toHaveTextContent('"Polygon"')
  })
  it('keeps the coverage read-only while the zone is active', async () => {
    mount(`/service-zones/${zoneId}`)
    await screen.findByRole('heading', { name: 'Cobertura' })
    expect(
      screen.queryByRole('button', { name: 'Reemplazar cobertura' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Desactivar zona' }),
    ).toBeInTheDocument()
  })
  it('allows replacing the coverage of an inactive zone and rejects invalid GeoJSON', async () => {
    const inactive = zone({ status: 'INACTIVE' })
    vi.mocked(serviceZones.get).mockResolvedValue(inactive)
    vi.mocked(serviceZones.replaceBoundary).mockResolvedValue(inactive)
    mount(`/service-zones/${zoneId}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Reemplazar cobertura' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    const field = dialog.getByLabelText('Cobertura (GeoJSON)')
    fireEvent.change(field, { target: { value: '{"type":"Point"}' } })
    await user.click(
      dialog.getByRole('button', { name: 'Reemplazar cobertura' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /GeoJSON Polygon o MultiPolygon/,
    )
    expect(serviceZones.replaceBoundary).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: JSON.stringify(boundary) } })
    await user.click(
      dialog.getByRole('button', { name: 'Reemplazar cobertura' }),
    )
    await waitFor(() =>
      expect(serviceZones.replaceBoundary).toHaveBeenCalledWith(
        zoneId,
        boundary,
      ),
    )
  })
  it('explains the overlap conflict returned when activating', async () => {
    vi.mocked(serviceZones.get).mockResolvedValue(zone({ status: 'INACTIVE' }))
    vi.mocked(serviceZones.transition).mockRejectedValue(
      normalizeError(409, {
        code: 'SERVICE_ZONE_OVERLAP',
        message: 'Boundary intersects or touches active zone TUXTLA',
      }),
    )
    mount(`/service-zones/${zoneId}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Activar zona' }),
    )
    await user.click(screen.getByRole('button', { name: 'Activar' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/se superpone con otra zona activa/)
    expect(alert).not.toHaveTextContent('TUXTLA')
  })
})

describe('rate plan versions inside a zone', () => {
  it('lists v3 active and the inactive history', async () => {
    mount(`/service-zones/${zoneId}`)
    await screen.findByRole('heading', { name: 'Ocozocoautla', level: 1 })
    const panel = section('Entrega local')
    await waitFor(() =>
      expect(value(panel, 'Tarifa activa')).toHaveTextContent('Versión 3'),
    )
    expect(value(panel, 'Vigencia de cotización')).toHaveTextContent(
      '15 minutos',
    )
    const rows = within(await panel.findByRole('table')).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Versión 3')
    expect(rows[1]).toHaveTextContent('Activa')
    expect(rows[2]).toHaveTextContent('Versión 2')
    expect(rows[2]).toHaveTextContent('Inactiva')
    expect(rows[3]).toHaveTextContent('Versión 1')
    expect(
      within(rows[1]).getByRole('link', { name: /Versión 3/ }),
    ).toHaveAttribute('href', `/rate-plans/${ids.v3}`)
  })
  it('warns and offers the first version when the zone has no rate plan', async () => {
    vi.mocked(ratePlans.list).mockResolvedValue(page([]))
    vi.mocked(ratePlans.create).mockResolvedValue(draft)
    mount(`/service-zones/${zoneId}`)
    await screen.findByRole('heading', { name: 'Ocozocoautla', level: 1 })
    const panel = section('Entrega local')
    expect(await panel.findByText(/No hay tarifa activa/)).toHaveAttribute(
      'role',
      'status',
    )
    expect(
      panel.getByRole('heading', { name: 'No hay versiones históricas.' }),
    ).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(panel.getByRole('button', { name: 'Crear nueva versión' }))
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await waitFor(() =>
      expect(ratePlans.create).toHaveBeenCalledWith({
        serviceZoneId: zoneId,
        serviceType: 'LOCAL_DELIVERY',
        quoteValidityMinutes: 15,
      }),
    )
  })
  it('clones the active version into a new draft', async () => {
    vi.mocked(ratePlans.clone).mockResolvedValue(draft)
    mount(`/service-zones/${zoneId}`)
    await screen.findByRole('heading', { name: 'Ocozocoautla', level: 1 })
    const panel = section('Entrega local')
    const user = userEvent.setup()
    await user.click(
      await panel.findByRole('button', { name: 'Crear nueva versión' }),
    )
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await waitFor(() => expect(ratePlans.clone).toHaveBeenCalledWith(ids.v3))
    expect(
      await screen.findByRole('heading', { name: 'Versión 4', level: 1 }),
    ).toBeInTheDocument()
  })
})

describe('rate plan detail', () => {
  it('keeps the active version read-only and shows its bands in kilometres', async () => {
    mount(`/rate-plans/${ids.v3}`)
    expect(
      await screen.findByRole('heading', { name: 'Versión 3', level: 1 }),
    ).toBeInTheDocument()
    expect(value(section('Resumen'), 'Estado')).toHaveTextContent('Activa')
    const rows = within(
      within(
        screen.getByRole('region', { name: 'Bandas de distancia' }),
      ).getByRole('table'),
    ).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('0 km')
    expect(rows[1]).toHaveTextContent('2 km')
    expect(rows[1]).toHaveTextContent('$30.00 MXN')
    expect(rows[3]).toHaveTextContent('6 km')
    expect(screen.queryByLabelText('Editor de bandas')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar bandas' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('spinbutton', { name: 'Minutos' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Crear nueva versión' }),
    ).toBeInTheDocument()
  })
  it('keeps an inactive version as read-only history', async () => {
    mount(`/rate-plans/${ids.v2}`)
    expect(
      await screen.findByRole('heading', { name: 'Versión 2', level: 1 }),
    ).toBeInTheDocument()
    expect(value(section('Resumen'), 'Estado')).toHaveTextContent('Inactiva')
    expect(screen.queryByLabelText('Editor de bandas')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Activar tarifa' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Desactivar tarifa' }),
    ).not.toBeInTheDocument()
  })
  it('answers 404 for an identifier that is not a UUID', async () => {
    mount('/rate-plans/not-a-uuid')
    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(ratePlans.get).not.toHaveBeenCalled()
  })
})

describe('draft editing', () => {
  it('saves bands converting kilometres into metres', async () => {
    vi.mocked(ratePlans.replaceBands).mockResolvedValue(draft)
    mount(`/rate-plans/${ids.v4}`)
    const editor = within(await screen.findByLabelText('Editor de bandas'))
    const user = userEvent.setup()
    const max = editor.getByLabelText('Banda 3: hasta, en kilómetros')
    expect(max).toHaveValue('6')
    await user.clear(max)
    await user.type(max, '7.5')
    const amount = editor.getByLabelText('Banda 3: precio en MXN')
    await user.clear(amount)
    await user.type(amount, '55.50')
    await user.click(editor.getByRole('button', { name: 'Guardar bandas' }))
    await waitFor(() =>
      expect(ratePlans.replaceBands).toHaveBeenCalledWith(ids.v4, [
        { minDistanceMeters: 0, maxDistanceMeters: 2000, amount: '30.00' },
        { minDistanceMeters: 2000, maxDistanceMeters: 4000, amount: '40.00' },
        { minDistanceMeters: 4000, maxDistanceMeters: 7500, amount: '55.50' },
      ]),
    )
  })
  it('adds and removes bands, prefilling the next start', async () => {
    vi.mocked(ratePlans.replaceBands).mockResolvedValue(draft)
    mount(`/rate-plans/${ids.v4}`)
    const editor = within(await screen.findByLabelText('Editor de bandas'))
    const user = userEvent.setup()
    await user.click(editor.getByRole('button', { name: 'Agregar banda' }))
    expect(editor.getByLabelText('Banda 4: desde, en kilómetros')).toHaveValue(
      '6',
    )
    await user.click(editor.getByRole('button', { name: 'Quitar banda 4' }))
    expect(
      editor.queryByLabelText('Banda 4: desde, en kilómetros'),
    ).not.toBeInTheDocument()
  })
  it('refuses unusable values before calling the API', async () => {
    mount(`/rate-plans/${ids.v4}`)
    const editor = within(await screen.findByLabelText('Editor de bandas'))
    const user = userEvent.setup()
    const amount = editor.getByLabelText('Banda 1: precio en MXN')
    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(editor.getByRole('button', { name: 'Guardar bandas' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /precio debe ser mayor que cero/,
    )
    expect(ratePlans.replaceBands).not.toHaveBeenCalled()
  })
  it('shows the translated backend band errors, never the raw text', async () => {
    vi.mocked(ratePlans.replaceBands).mockRejectedValue(
      normalizeError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: [
          'band 4000-7000: amount must be greater than 0',
          'bands must not share the same minDistanceMeters',
        ],
      }),
    )
    mount(`/rate-plans/${ids.v4}`)
    const editor = within(await screen.findByLabelText('Editor de bandas'))
    const user = userEvent.setup()
    await user.click(editor.getByRole('button', { name: 'Guardar bandas' }))
    const alerts = await screen.findAllByRole('alert')
    const text = alerts.map((node) => node.textContent ?? '').join(' ')
    expect(text).toContain('Banda 4 – 7 km: el precio debe ser mayor que cero.')
    expect(text).toContain(
      'Dos bandas no pueden empezar en la misma distancia.',
    )
    expect(text).not.toContain('minDistanceMeters')
  })
  it('edits the quote validity only in a draft and explains what it means', async () => {
    vi.mocked(ratePlans.updateValidity).mockResolvedValue(draft)
    mount(`/rate-plans/${ids.v4}`)
    await screen.findByRole('heading', { name: 'Versión 4', level: 1 })
    const panel = section('Vigencia de cotización')
    const user = userEvent.setup()
    const input = await panel.findByRole('spinbutton', { name: 'Minutos' })
    expect(input).toHaveValue(15)
    await user.clear(input)
    await user.type(input, '20')
    await user.click(panel.getByRole('button', { name: 'Guardar vigencia' }))
    await waitFor(() =>
      expect(ratePlans.updateValidity).toHaveBeenCalledWith(ids.v4, 20),
    )
    expect(
      screen.getByText(/No determina cuándo se realizará el servicio/),
    ).toBeInTheDocument()
  })
  it('rejects a validity outside the LOCAL_DELIVERY policy before calling the API', async () => {
    mount(`/rate-plans/${ids.v4}`)
    await screen.findByRole('heading', { name: 'Versión 4', level: 1 })
    const panel = section('Vigencia de cotización')
    const user = userEvent.setup()
    const input = await panel.findByRole('spinbutton', { name: 'Minutos' })
    // The backend policy is 1..120 minutes for LOCAL_DELIVERY, enforced in the field too.
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '120')
    fireEvent.change(input, { target: { value: '500' } })
    await user.click(panel.getByRole('button', { name: 'Guardar vigencia' }))
    await waitFor(() => expect(input).toBeInvalid())
    expect(ratePlans.updateValidity).not.toHaveBeenCalled()
  })
})

describe('validation and activation', () => {
  it('translates the validation report of a draft', async () => {
    vi.mocked(ratePlans.validate).mockResolvedValue({
      ratePlanId: draft.id,
      valid: false,
      errors: [
        'gap between 4000 and 5000 meters',
        'band[0-2000): first band must start at 0',
      ],
    })
    mount(`/rate-plans/${ids.v4}`)
    await screen.findByRole('heading', { name: 'Versión 4', level: 1 })
    const panel = section('Validación')
    expect(await panel.findByRole('alert')).toHaveTextContent(
      'Hueco entre rangos: 4 – 5 km sin banda.',
    )
    expect(panel.getByRole('alert')).toHaveTextContent(
      'Banda 0 – 2 km: la primera banda debe empezar en 0 km.',
    )
  })
  it('confirms the activation and explains what happens to existing quotes', async () => {
    vi.mocked(ratePlans.transition).mockResolvedValue(
      plan({ ...draft, status: 'ACTIVE', activatedAt: stamp }),
    )
    mount(`/rate-plans/${ids.v4}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Activar tarifa' }),
    )
    expect(
      screen.getByText(/Las cotizaciones existentes no cambiarán/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Activar versión' }))
    await waitFor(() =>
      expect(ratePlans.transition).toHaveBeenCalledWith(ids.v4, 'activate'),
    )
  })
  it('explains a 422 refusing an invalid draft without leaking the raw report', async () => {
    vi.mocked(ratePlans.transition).mockRejectedValue(
      normalizeError(422, {
        code: 'RATE_PLAN_INVALID',
        message: 'gap between 4000 and 5000 meters',
      }),
    )
    mount(`/rate-plans/${ids.v4}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Activar tarifa' }),
    )
    await user.click(screen.getByRole('button', { name: 'Activar versión' }))
    const alerts = await screen.findAllByRole('alert')
    const text = alerts.map((node) => node.textContent ?? '').join(' ')
    expect(text).toContain('Las bandas de la tarifa no son válidas')
    expect(text).not.toContain('gap between')
  })
  it('deactivates an active version with a warning', async () => {
    vi.mocked(ratePlans.transition).mockResolvedValue(
      plan({ status: 'INACTIVE', deactivatedAt: stamp }),
    )
    mount(`/rate-plans/${ids.v3}`)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Desactivar tarifa' }),
    )
    expect(screen.getByText(/quedará sin tarifa activa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desactivar versión' }))
    await waitFor(() =>
      expect(ratePlans.transition).toHaveBeenCalledWith(ids.v3, 'deactivate'),
    )
  })
})

describe('security', () => {
  it('hides pricing from PROVIDER_ADMIN and blocks the routes typed by hand', async () => {
    mount('/dashboard', 'PROVIDER_ADMIN')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(links).not.toContain('Zonas de servicio')
    expect(links).not.toContain('Cotizaciones')
    for (const path of [
      '/service-zones',
      '/service-zones/new',
      `/service-zones/${zoneId}`,
      `/rate-plans/${ids.v3}`,
      '/delivery-quotes',
    ]) {
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
    expect(serviceZones.list).not.toHaveBeenCalled()
    expect(serviceZones.get).not.toHaveBeenCalled()
    expect(ratePlans.get).not.toHaveBeenCalled()
  })
  it('shows the 403 state when the backend refuses the zone list', async () => {
    vi.mocked(serviceZones.list).mockRejectedValue(normalizeError(403, null))
    mount('/service-zones')
    expect(
      await screen.findByRole('heading', { name: '403 — Sin permisos' }),
    ).toBeInTheDocument()
  })
})
