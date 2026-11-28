import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { ReportsPage } from '../admin-reports/page'
import { initialFilters, validReportRange } from '../admin-reports/service'
import fixture from './admin-reports.fixture.json'
import type { Role } from '../types/api'
function serve(data: object = fixture, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input)
    if (url.includes('/options'))
      return Promise.resolve(Response.json({ zones: [], providers: [] }))
    if (url.includes('/export'))
      return Promise.resolve(
        Response.json({ fileName: 'report.csv', content: '\uFEFF"Reporte"' }),
      )
    return Promise.resolve(Response.json(data, { status }))
  })
}
function mount(role: Role = 'SUPER_ADMIN') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          user: {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'admin@example.test',
            role,
            active: true,
            emailVerifiedAt: '2026-01-01T00:00:00Z',
            createdAt: '',
            updatedAt: '',
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
          <MemoryRouter>
            <ReportsPage />
          </MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('shows totals, distinct points, zero activity and partial connection history', async () => {
  serve()
  mount()
  expect(await screen.findByText('Ana de prueba')).toBeInTheDocument()
  expect(screen.getByText('Luis sin servicios')).toBeInTheDocument()
  expect(
    screen.getByText('Historial de conexiones parcial'),
  ).toBeInTheDocument()
  expect(screen.getByText('8 (parcial)')).toBeInTheDocument()
  expect(screen.getByText('80 consumidos − 20 devueltos.')).toBeInTheDocument()
  expect(screen.getByText(/No representa utilidad neta/)).toBeInTheDocument()
})
it('applies inclusive date range and filters to the report', async () => {
  const fetcher = serve()
  mount()
  await screen.findByText('Ana de prueba')
  fireEvent.change(screen.getByLabelText('Desde'), {
    target: { value: '2024-01-01' },
  })
  fireEvent.change(screen.getByLabelText('Hasta'), {
    target: { value: '2024-12-31' },
  })
  fireEvent.change(screen.getByLabelText('Actividad del conductor'), {
    target: { value: 'NEVER' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(
        ([u]) =>
          String(u).includes('from=2024-01-01') &&
          String(u).includes('activity=NEVER'),
      ),
    ).toBe(true),
  )
})
it('rejects more than one calendar year before making a report request', async () => {
  const fetcher = serve()
  mount()
  await screen.findByText('Ana de prueba')
  const before = fetcher.mock.calls.length
  fireEvent.change(screen.getByLabelText('Desde'), {
    target: { value: '2024-01-01' },
  })
  fireEvent.change(screen.getByLabelText('Hasta'), {
    target: { value: '2025-01-01' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('máximo de un año')
  expect(fetcher.mock.calls.length).toBe(before)
})
it('focuses one driver without losing dates', async () => {
  const fetcher = serve()
  mount()
  await screen.findByText('Ana de prueba')
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Ver sólo este conductor' })[0],
  )
  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(([u]) =>
        String(u).includes('driverId=' + fixture.drivers.items[0].id),
      ),
    ).toBe(true),
  )
})
it('shows unknown connection history without presenting zero as a fact', async () => {
  serve({ ...fixture, coverage: { ...fixture.coverage, available: false } })
  mount()
  expect(
    await screen.findByText('Sin datos históricos de conexiones'),
  ).toBeInTheDocument()
  expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0)
  expect(screen.queryByText('8 (parcial)')).not.toBeInTheDocument()
})
it('handles empty report and API failure', async () => {
  serve({ ...fixture, drivers: { ...fixture.drivers, items: [], total: 0 } })
  const mounted = mount()
  expect(
    await screen.findByRole('heading', { name: 'Conductores y actividad' }),
  ).toBeInTheDocument()
  expect(screen.queryByText('Ana de prueba')).not.toBeInTheDocument()
  mounted.unmount()
  vi.restoreAllMocks()
  serve({ message: 'Reporte no disponible' }, 503)
  mount()
  expect(
    await screen.findByText('No se pudo cargar la información'),
  ).toBeInTheDocument()
})
it('does not request administrative data for a DRIVER', () => {
  const fetcher = serve()
  mount('DRIVER')
  expect(fetcher).not.toHaveBeenCalled()
  expect(
    screen.getByText(/disponible para administración general/),
  ).toBeInTheDocument()
})
it('downloads full filtered export instead of just rendering the page', async () => {
  const fetcher = serve()
  const create = vi.fn(() => 'blob:report')
  const revoke = vi.fn()
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = create
      static revokeObjectURL = revoke
    },
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  mount()
  await screen.findByText('Ana de prueba')
  fireEvent.click(
    screen.getByRole('button', { name: 'Descargar CSV completo' }),
  )
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
  expect(
    fetcher.mock.calls.some(([u]) =>
      String(u).includes('/admin/reports/export?'),
    ),
  ).toBe(true)
})
it('uses Mexico dates and calendar years including leap years', () => {
  expect(initialFilters(new Date('2026-11-27T03:00:00Z')).to).toBe('2026-11-26')
  expect(validReportRange('2024-01-01', '2024-12-31')).toBe(true)
  expect(validReportRange('2024-01-01', '2025-01-01')).toBe(false)
  expect(validReportRange('2026-02-30', '2026-03-01')).toBe(false)
})

it('switches the chart between points and delivery amounts', async () => {
  serve()
  mount()
  await screen.findByText('Ana de prueba')
  fireEvent.change(screen.getByLabelText('Indicador de la gráfica'), {
    target: { value: 'net_points' },
  })
  expect(
    screen.getByRole('img', { name: /Puntos netos por fecha/ }),
  ).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Indicador de la gráfica'), {
    target: { value: 'money:MXN' },
  })
  expect(
    screen.getByRole('img', { name: /Importe de envíos \(MXN\) por fecha/ }),
  ).toBeInTheDocument()
})
