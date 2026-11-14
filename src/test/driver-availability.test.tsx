import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DriverAvailabilityPanel } from '../dashboard/DriverAvailability'

const summary = {
  asOf: '2026-11-14T18:30:00.000Z',
  connected: 12,
  disconnected: 30,
  byAvailability: { available: 9, busy: 3, offline: 30 },
  byMembership: {
    fleet: { connected: 8, disconnected: 21 },
    independent: { connected: 4, disconnected: 9 },
  },
  expiredConnections: 2,
  excluded: {
    total: 7,
    withDeclaredAvailability: 5,
    byReason: {
      userInactive: 1,
      accountClosing: 1,
      driverNotActive: 2,
      categoryUnresolved: 1,
      providerNotActive: 1,
      independentNotApproved: 1,
    },
  },
}
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <DriverAvailabilityPanel />
    </QueryClientProvider>,
  )
}
const respond = (body: object, status = 200) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(body, { status })))
afterEach(() => vi.restoreAllMocks())

it('shows connected and disconnected drivers with their split', async () => {
  const fetcher = respond(summary)
  mount()
  expect(await screen.findByText('12')).toBeVisible()
  expect(screen.getByText('30')).toBeVisible()
  expect(screen.getByText('9 disponibles · 3 en servicio')).toBeVisible()
  expect(screen.getByText('8 conectados · 21 no conectados')).toBeVisible()
  expect(screen.getByText('4 conectados · 9 no conectados')).toBeVisible()
  expect(screen.getByText('Fuera de línea · 2 con turno vencido')).toBeVisible()
  expect(
    screen.getByText('7 no operativos (suspendidos, pendientes o en baja)'),
  ).toBeVisible()
  expect(
    screen.getByText(/Según la disponibilidad que declara cada conductor ·/),
  ).toBeVisible()
  expect(String(fetcher.mock.calls[0][0])).toMatch(
    /\/api\/v1\/admin\/drivers\/availability-summary$/,
  )
})
it.each([400, 404])(
  'older backends (%s) get an update notice, not a broken card',
  async (status) => {
    respond({ message: 'Cannot GET' }, status)
    mount()
    expect(
      await screen.findByText(/requiere la versión actualizada/),
    ).toBeVisible()
  },
)
it('other failures can be retried', async () => {
  respond({ message: 'down' }, 503)
  mount()
  expect(
    await screen.findByRole('button', { name: /Reintentar/ }),
  ).toBeVisible()
})
