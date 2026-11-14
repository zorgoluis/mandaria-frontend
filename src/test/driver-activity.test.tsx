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
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id: actor,
      email: 'admin@example.test',
      role: 'SUPER_ADMIN' as const,
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
          <MemoryRouter>
            <DriverActivity driverId={resource} />
          </MemoryRouter>
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
  expect(within(table).getByText('Moto roja · ABC-12')).toBeVisible()
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
