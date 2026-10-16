import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthState } from '../auth/context'
import { AdminLayout } from '../layouts/AdminLayout'
import type { Role } from '../types/api'

const logout = vi.fn().mockResolvedValue(undefined)
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})
afterEach(() => vi.unstubAllGlobals())
function mount(role: Role = 'SUPER_ADMIN') {
  const auth: AuthState = {
    user: {
      id: 'u1',
      email: 'operador@mandaria.test',
      role,
      active: true,
      createdAt: '',
      updatedAt: '',
      emailVerifiedAt: null,
    },
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout,
    restore: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="*" element={<h1>Contenido operativo</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}
it.each(['SUPER_ADMIN', 'PROVIDER_ADMIN', 'DRIVER'] as const)(
  'keeps navigation scoped to %s',
  (role) => {
    mount(role)
    const nav = within(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    )
    expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(nav.queryByRole('link', { name: 'Integraciones' }) !== null).toBe(
      role === 'SUPER_ADMIN',
    )
    expect(nav.queryByRole('link', { name: 'Mi servicio' }) !== null).toBe(
      role === 'DRIVER',
    )
    expect(nav.queryByRole('link', { name: 'Mi proveedor' }) !== null).toBe(
      role === 'PROVIDER_ADMIN',
    )
  },
)
it('opens a modal drawer, locks scroll and closes it on navigation', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
  const dialog = screen.getByRole('dialog', { name: 'Navegación' })
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(within(dialog).getByRole('link', { name: 'Proveedores' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(document.body.style.overflow).toBe('')
  expect(screen.getByRole('link', { name: 'Proveedores' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})
it('dismisses account options with Escape or an outside pointer and keeps logout', () => {
  mount()
  const trigger = screen.getByRole('button', { name: /Opciones de cuenta/ })
  fireEvent.click(trigger)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(trigger).toHaveFocus()
  expect(
    screen.queryByRole('button', { name: 'Cerrar sesión' }),
  ).not.toBeInTheDocument()
  fireEvent.click(trigger)
  fireEvent.pointerDown(
    screen.getByRole('heading', { name: 'Contenido operativo' }),
  )
  expect(
    screen.queryByRole('button', { name: 'Cerrar sesión' }),
  ).not.toBeInTheDocument()
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(logout).toHaveBeenCalledTimes(1)
})
