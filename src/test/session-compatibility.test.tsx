import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthState } from '../auth/context'
import { sessionIdentity } from '../auth/session'
import { App } from '../app/App'
import { actor } from './verification-fixtures'
import { normalizeError } from '../services/errors'
import { driverPortal } from '../driver-portal/service'
vi.mock('../driver-portal/service', () => ({
  driverPortal: {
    me: vi.fn(),
    get: vi.fn(),
    deliver: vi.fn(),
    release: vi.fn(),
    take: vi.fn(),
  },
}))
const restricted = {
  accessMode: 'DELETION_RESTRICTED' as const,
  identity: { id: actor },
  capabilities: {
    deletionFollowUp: true as const,
    activeDeliveryResolution: false,
  },
}
const auth: AuthState = {
  user: null,
  restricted,
  loading: false,
  expired: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  restore: vi.fn(),
}
function mount(path: string, state = auth) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={state}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
beforeEach(() => localStorage.clear())
it('restricted projection is kept separately, strips unauthorized identity fields', () => {
  expect(
    sessionIdentity({
      ...restricted,
      identity: {
        id: actor,
        email: 'private@example.test',
        role: 'SUPER_ADMIN',
      },
    }),
  ).toEqual(restricted)
  expect(() =>
    sessionIdentity({
      ...restricted,
      capabilities: { deletionFollowUp: false },
    }),
  ).toThrow()
  expect(() =>
    sessionIdentity({ accessMode: 'UNKNOWN', identity: { id: actor } }),
  ).toThrow()
})
it('standard projection accepts CUSTOMER and rejects unknown roles', () => {
  const identity = {
    id: actor,
    email: 'cliente@example.test',
    role: 'CUSTOMER',
    active: true,
    emailVerifiedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  }
  expect(sessionIdentity({ accessMode: 'STANDARD', identity })).toEqual({
    accessMode: 'STANDARD',
    identity,
  })
  expect(() =>
    sessionIdentity({
      accessMode: 'STANDARD',
      identity: { ...identity, role: 'GUEST' },
    }),
  ).toThrow()
})
it.each([
  '/dashboard',
  '/admin/privacy/deletion',
  '/driver/services',
  '/privacy/deletion/new',
])('restricted identity cannot mount operational route %s', (path) => {
  mount(path)
  expect(
    screen.getByText(/Identidad autenticada con acceso restringido/),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Preparar solicitud' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Revisión administrativa' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Servicio comprometido' }),
  ).not.toBeInTheDocument()
})
it('active resolution capability shows only the constrained link, never general driver navigation', () => {
  mount('/privacy/deletion', {
    ...auth,
    restricted: {
      ...restricted,
      capabilities: {
        ...restricted.capabilities,
        activeDeliveryResolution: true,
      },
    },
  })
  expect(
    screen.getByRole('link', { name: 'Servicio comprometido' }),
  ).toHaveAttribute('href', '/privacy/active-service')
  expect(
    screen.queryByRole('link', { name: /Disponibles|Vehículos/ }),
  ).not.toBeInTheDocument()
})
it('active capability does not grant an operation when the authorized driver read is denied', async () => {
  vi.mocked(driverPortal.me).mockRejectedValue(
    normalizeError(403, { code: 'HTTP_403' }),
  )
  mount('/privacy/active-service', {
    ...auth,
    restricted: {
      ...restricted,
      capabilities: {
        ...restricted.capabilities,
        activeDeliveryResolution: true,
      },
    },
  })
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No tienes autorización',
  )
  expect(driverPortal.get).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('button', { name: 'Revisar entrega' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Revisar liberación' }),
  ).not.toBeInTheDocument()
  expect(driverPortal.take).not.toHaveBeenCalled()
})
it('private code route renders even while authenticated bootstrap is pending', () => {
  mount('/privacy/deletion-access', {
    ...auth,
    restricted: null,
    loading: true,
  })
  expect(
    screen.getByRole('heading', { name: 'Seguimiento privado de baja' }),
  ).toBeInTheDocument()
})
it('Nest message semantics remain HTTP codes with safe translated messages', () => {
  const error = normalizeError(403, {
    code: 'HTTP_403',
    message: 'ACCOUNT_CLOSING',
  })
  expect(error.code).toBe('HTTP_403')
  expect(error.message).toContain('identidad sigue autenticada')
  expect(
    normalizeError(401, { code: 'HTTP_401', message: 'REAUTH_REQUIRED' })
      .message,
  ).toContain('nuevo inicio de sesión')
})
