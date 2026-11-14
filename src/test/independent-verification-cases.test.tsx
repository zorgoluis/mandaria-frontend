import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { IndependentVerificationCases } from '../independent-drivers/verification-cases'
import { AdminVerification } from '../verification/admin-review'
import {
  actor,
  caseId,
  emptyPage,
  providerId,
  resource,
} from './verification-fixtures'

const profileId = '66666666-6666-4666-8666-666666666666'
const otherProfile = '77777777-7777-4777-8777-777777777777'
const counts = {
  DRAFT: 0,
  SUBMITTED: 1,
  APPROVED: 1,
  REJECTED: 0,
  WITHDRAWN: 0,
}
const row = (patch: object = {}) => ({
  id: caseId,
  subjectId: resource,
  status: 'SUBMITTED',
  revision: 2,
  createdAt: '2026-11-10T12:00:00Z',
  updatedAt: '2026-11-12T12:00:00Z',
  decidedAt: null,
  publicReason: null,
  subjectType: 'DRIVER_IDENTITY',
  driverId: resource,
  independentProfileId: profileId,
  driverName: 'Repartidor Sintético',
  ...patch,
})
const page = (items: object[]) => ({
  ...emptyPage,
  items,
  total: items.length,
  totalPages: items.length ? 1 : 0,
  counts,
  oldest: [],
  asOf: '2026-11-13T00:00:00Z',
})
function mount(child: ReactNode) {
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
          <MemoryRouter>{child}</MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
const respond = (body: object, status = 200) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(body, { status })))
afterEach(() => vi.restoreAllMocks())

it('lists identity and unit cases of the profile with links to each case', async () => {
  const fetcher = respond(
    page([
      row(),
      row({
        id: '88888888-8888-4888-8888-888888888888',
        subjectType: 'VEHICLE',
        status: 'APPROVED',
        revision: 1,
      }),
    ]),
  )
  mount(<IndependentVerificationCases profileId={profileId} />)
  const review = await screen.findByRole('link', { name: 'Revisar revisión 2' })
  expect(review).toHaveAttribute('href', '/verification/cases/' + caseId)
  expect(screen.getByRole('link', { name: 'Ver revisión 1' })).toBeVisible()
  const table = screen.getByRole('table')
  expect(within(table).getByText('Identidad')).toBeVisible()
  expect(within(table).getByText('Unidad')).toBeVisible()
  expect(within(table).getByText('En revisión')).toHaveClass(
    'badge',
    'submitted',
  )
  expect(screen.getByText(/1 en revisión/)).toBeVisible()
  const url = String(fetcher.mock.calls[0][0])
  expect(url).toContain('/admin/verification-cases?')
  expect(url).toContain('independentProfileId=' + profileId)
  expect(url).not.toContain('providerId=')
})
it('explains an empty history', async () => {
  respond(page([]))
  mount(<IndependentVerificationCases profileId={profileId} />)
  expect(await screen.findByText('Sin revisiones documentales')).toBeVisible()
})
it('never shows rows of another profile as this independent history', async () => {
  respond(page([row({ independentProfileId: otherProfile })]))
  mount(<IndependentVerificationCases profileId={profileId} />)
  expect(
    await screen.findByText(
      /no confirmó el filtro por repartidor independiente/,
    ),
  ).toBeVisible()
  expect(screen.queryByRole('table')).toBeNull()
})
it('older backends that reject the filter point to the global queue', async () => {
  respond({ message: ['property independentProfileId should not exist'] }, 400)
  mount(<IndependentVerificationCases profileId={profileId} />)
  expect(
    await screen.findByText(/requiere la versión actualizada del backend/),
  ).toBeVisible()
  expect(
    screen.getByRole('link', { name: 'Revisión documental' }),
  ).toHaveAttribute('href', '/admin/verification-cases')
})
it('admin queue names the driver and links independents to their profile', async () => {
  respond(
    page([
      row(),
      row({
        id: '99999999-9999-4999-8999-999999999999',
        revision: 5,
        driverId: providerId,
        independentProfileId: null,
        driverName: 'Repartidor de Flotilla',
      }),
    ]),
  )
  mount(<AdminVerification />)
  expect(
    await screen.findByRole('link', { name: 'Repartidor Sintético' }),
  ).toHaveAttribute('href', '/independent-drivers/' + resource)
  expect(screen.getByText(/Repartidor de Flotilla/)).toBeVisible()
  expect(
    screen.queryByRole('link', { name: 'Repartidor de Flotilla' }),
  ).toBeNull()
})
