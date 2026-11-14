import { afterEach, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { DriverActivity } from '../driver-activity/panels'
import { lastDays } from '../driver-activity/service'
import { duration, money, percent } from '../driver-activity/format'
import { actor, resource } from './verification-fixtures'
import { ProfilePage } from '../users/pages'
import type { ReactNode } from 'react'
import type { Role } from '../types/api'

const analytics = {
  driverId: resource,
  from: '2026-10-15T00:00:00.000Z',
  to: '2026-11-14T00:00:00.000Z',
  totals: {
    participations: 6,
    inProgress: 1,
    delivered: 3,
    returned: 1,
    transferred: 0,
    reassigned: 0,
    released: 1,
    cancelled: 0,
  },
  deliveryRate: 0.6,
  avgAssignmentToDeliverySeconds: 3900,
  activeDays: 4,
  lastAssignedAt: '2026-11-12T15:00:00.000Z',
  deliveredAmount: [{ currency: 'MXN', amount: '165.00' }],
  dailyDelivered: [
    { date: '2026-11-11', delivered: 0 },
    { date: '2026-11-12', delivered: 2 },
    { date: '2026-11-13', delivered: 1 },
  ],
}
const delivery = {
  assignmentId: '88888888-8888-4888-8888-888888888888',
  dispatchId: '99999999-9999-4999-8999-999999999999',
  deliveryRequestPublicId: 'MDR-000042',
  mode: 'INDEPENDENT',
  provider: null,
  outcome: 'DELIVERED',
  assignmentStatus: 'COMPLETED',
  dispatchStatus: 'DELIVERED',
  assignedAt: '2026-11-12T15:00:00.000Z',
  pickedUpAt: null,
  deliveredAt: '2026-11-12T16:05:00.000Z',
  endedAt: '2026-11-12T16:05:00.000Z',
  serviceZone: { id: resource, code: 'OCO_01', name: 'Ocozocoautla' },
  deliveryFee: { amount: '55.00', currency: 'MXN' },
  vehicle: {
    id: resource,
    identifier: 'Moto roja',
    type: 'MOTORCYCLE',
    plate: 'ABC-12',
  },
}
const page = (items: object[]) => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: items.length ? 1 : 0,
})
function serve(
  answer: (url: string) => { body: object; status?: number } = (url) => ({
    body: url.includes('/analytics') ? analytics : page([delivery]),
  }),
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const { body, status = 200 } = answer(String(input))
    return Promise.resolve(Response.json(body, { status }))
  })
}
const urls = (fetcher: ReturnType<typeof serve>, part: string) =>
  fetcher.mock.calls.map(([u]) => String(u)).filter((u) => u.includes(part))
function mount(
  node: ReactNode = <DriverActivity driverId={resource} />,
  role: Role = 'SUPER_ADMIN',
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id: actor,
      email: 'admin@example.test',
      role,
      active: true,
      emailVerifiedAt: '2026-11-01T00:00:00Z',
      createdAt: '',
      updatedAt: '',
    },
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <FeedbackProvider>
          <MemoryRouter>{node}</MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
afterEach(() => vi.restoreAllMocks())

it('builds whole UTC day windows with an exclusive end', () => {
  expect(lastDays(30, new Date('2026-11-13T23:30:00Z'))).toEqual({
    from: '2026-10-15',
    to: '2026-11-14',
  })
  expect(lastDays(7, new Date('2026-01-03T00:00:00Z'))).toEqual({
    from: '2025-12-28',
    to: '2026-01-04',
  })
})
it('formats rates, durations and quoted amounts without inventing data', () => {
  expect(percent(null)).toBe('Sin datos')
  expect(percent(0.6)).toMatch(/60\s?%/)
  expect(duration(null)).toBe('Sin entregas')
  expect(duration(1500)).toBe('25 min')
  expect(duration(3900)).toBe('1 h 5 min')
  expect(duration(7200)).toBe('2 h')
  expect(money('55.00', 'MXN')).toMatch(/\$55\.00/)
})
it('shows the analytics of the selected window and never calls the amount earnings', async () => {
  const fetcher = serve()
  mount()
  expect(await screen.findByText('1 h 5 min')).toBeVisible()
  expect(screen.getByText(/60\s?%/)).toBeVisible()
  expect(screen.getByText('6 servicios asignados')).toBeVisible()
  expect(screen.getByText(/no la ganancia del\s+conductor/)).toBeVisible()
  const chart = screen.getByRole('list', { name: /3 entregados del/ })
  expect(within(chart).getAllByRole('listitem')).toHaveLength(3)
  const [url] = urls(fetcher, '/analytics')
  expect(url).toContain(`/admin/drivers/${resource}/analytics?`)
  expect(url).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/)
  fireEvent.click(screen.getByRole('button', { name: '7 días' }))
  await waitFor(() => expect(urls(fetcher, '/analytics')).toHaveLength(2))
  const window = (u: string) => {
    const q = new URL(u).searchParams
    return (Date.parse(q.get('to')!) - Date.parse(q.get('from')!)) / 86400000
  }
  expect(urls(fetcher, '/analytics').map(window)).toEqual([30, 7])
})
it('lists the delivery history and filters it by outcome from the first page', async () => {
  const fetcher = serve()
  mount()
  const order = await screen.findByRole('link', { name: 'MDR-000042' })
  expect(order).toHaveAttribute('href', '/delivery-requests/MDR-000042')
  const table = screen.getByRole('table')
  expect(within(table).getByText('Entregado')).toHaveClass('badge', 'delivered')
  expect(within(table).getByText('Independiente')).toBeVisible()
  expect(within(table).getByText('ABC-12')).toBeVisible()
  expect(within(table).getByText('Ocozocoautla')).toBeVisible()
  expect(within(table).getByText(/^Cierre: /)).toBeVisible()
  fireEvent.change(screen.getByRole('combobox', { name: 'Resultado' }), {
    target: { value: 'RETURNED' },
  })
  await waitFor(() => expect(urls(fetcher, 'outcome=RETURNED')).toHaveLength(1))
  expect(urls(fetcher, 'outcome=RETURNED')[0]).toContain('page=1')
})
it('explains an empty window instead of drawing an empty chart', async () => {
  serve((url) => ({
    body: url.includes('/analytics')
      ? {
          ...analytics,
          dailyDelivered: analytics.dailyDelivered.map((d) => ({
            ...d,
            delivered: 0,
          })),
        }
      : page([]),
  }))
  mount()
  expect(await screen.findByText('Sin entregas en este periodo')).toBeVisible()
  expect(await screen.findByText('Sin pedidos en este periodo')).toBeVisible()
})
it('older backends point to the update; a missing driver is an error', async () => {
  serve(() => ({ body: { message: 'Cannot GET' }, status: 404 }))
  const view = mount()
  await waitFor(() =>
    expect(
      screen.getAllByText(/requiere la versión actualizada del backend/),
    ).toHaveLength(2),
  )
  view.unmount()
  vi.restoreAllMocks()
  serve(() => ({
    body: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' },
    status: 404,
  }))
  mount()
  await waitFor(() =>
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0),
  )
  expect(screen.queryByText(/versión actualizada/)).toBeNull()
})

it('a driver sees only their own activity, without admin links', async () => {
  const fetcher = serve((url) => ({
    body: url.includes('/analytics')
      ? { ...analytics, deliveredAmount: [] }
      : page([
          {
            ...delivery,
            mode: 'FLEET',
            provider: { id: resource, name: 'Rápidos' },
            outcome: 'RELEASED',
            // The service continued with another executor.
            dispatchStatus: null,
            // Defensive only: the API always sends it.
            deliveryFee: null,
          },
        ]),
  }))
  mount(<DriverActivity />, 'DRIVER')
  const table = await screen.findByRole('table')
  expect(within(table).getByText('MDR-000042')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'MDR-000042' })).toBeNull()
  expect(within(table).getByText('Flotilla · Rápidos')).toBeVisible()
  expect(within(table).getByText('—')).toBeVisible()
  expect(await screen.findByText('1 h 5 min')).toBeVisible()
  expect(within(table).getByText('Liberado')).toHaveClass('badge', 'released')
  expect(screen.getByText('Importe cotizado entregado')).toBeVisible()
  expect(screen.getByText(/\$0\.00/)).toBeVisible()
  const called = fetcher.mock.calls.map(([u]) => new URL(String(u)).pathname)
  expect(called).toEqual(
    expect.arrayContaining([
      '/api/v1/driver/activity/analytics',
      '/api/v1/driver/activity/deliveries',
    ]),
  )
  expect(called.some((p) => p.includes('/admin/'))).toBe(false)
})
it('a driver reads delivered amounts as quoted, not earnings', async () => {
  serve()
  mount(<DriverActivity />, 'DRIVER')
  expect(await screen.findByText('Importe cotizado entregado')).toBeVisible()
  expect(screen.getByText(/no tu ganancia/)).toBeVisible()
})
it.each([
  ['DRIVER', true],
  ['PROVIDER_ADMIN', false],
  ['SUPER_ADMIN', false],
] as const)(
  'profile shows the activity only to a %s driver: %s',
  async (role, shown) => {
    serve((url) => ({
      body: url.includes('/driver/activity/analytics')
        ? analytics
        : url.includes('/driver/activity/deliveries')
          ? page([delivery])
          : {},
      status: url.includes('/driver/activity/') ? 200 : 404,
    }))
    mount(<ProfilePage />, role)
    expect(
      await screen.findByRole('heading', { name: 'Mi perfil' }),
    ).toBeVisible()
    if (shown)
      expect(
        await screen.findByRole('heading', { name: 'Historial de pedidos' }),
      ).toBeVisible()
    else expect(screen.queryByRole('heading', { name: 'Analítico' })).toBeNull()
  },
)
