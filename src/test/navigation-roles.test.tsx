import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthState } from '../auth/context'
import { AdminLayout } from '../layouts/AdminLayout'
import { FeedbackProvider } from '../components/Feedback'
import type { Role } from '../types/api'

vi.mock('../execution/components', () => ({ ExecutionRecovery: () => null }))
vi.mock('../customer/pages', () => ({ CustomerOperationNotice: () => null }))
vi.mock('../driver-portal/execution', () => ({
  DriverExecutionRecovery: () => null,
}))
vi.mock('../driver-portal/recovery', () => ({
  IndependentRecovery: () => null,
}))

it.each<Role>(['SUPER_ADMIN', 'PROVIDER_ADMIN', 'DRIVER', 'CUSTOMER'])(
  'shows customer navigation only to CUSTOMER (%s)',
  (role) => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthContext.Provider
          value={
            {
              user: { id: 'actor', email: 'test@example.test', role },
              loading: false,
            } as AuthState
          }
        >
          <MemoryRouter>
            <FeedbackProvider>
              <AdminLayout />
            </FeedbackProvider>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    )
    const nav = within(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    )
    for (const name of ['Mis envíos', 'Cuenta Negocio']) {
      expect(!!nav.queryByRole('link', { name })).toBe(role === 'CUSTOMER')
    }
    expect(!!nav.queryByRole('link', { name: 'Despachos' })).toBe(
      role === 'SUPER_ADMIN',
    )
    expect(!!nav.queryByRole('link', { name: 'Mi servicio' })).toBe(false)
    expect(!!nav.queryByRole('link', { name: 'Mi proveedor' })).toBe(
      role === 'PROVIDER_ADMIN',
    )
    expect(nav.getByRole('link', { name: 'Mi perfil' })).toBeVisible()
  },
)
