import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext, type AuthState } from '../auth/context'
import { Login } from '../auth/Login'
import { ApiError } from '../services/errors'

function mount(login = vi.fn().mockResolvedValue(undefined), path = '/login') {
  const auth: AuthState = {
    user: null,
    loading: false,
    expired: false,
    error: null,
    login,
    logout: vi.fn(),
    restore: vi.fn(),
  }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<h1>Panel operativo</h1>} />
          <Route path="/verification-entry" element={<h1>Verificación</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return login
}
it('explains empty and malformed fields without calling login and clears corrected errors', async () => {
  const login = mount()
  const actor = userEvent.setup()
  await actor.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  expect(screen.getByText('Escribe tu correo electrónico.')).toBeInTheDocument()
  expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
  const email = screen.getByLabelText('Correo electrónico')
  expect(email).toHaveFocus()
  await actor.type(email, 'correo-invalido')
  expect(email).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText(/Escribe un correo válido/)).toBeInTheDocument()
  await actor.clear(email)
  await actor.type(email, 'operador@example.test')
  expect(email).not.toHaveAttribute('aria-invalid')
  expect(login).not.toHaveBeenCalled()
})
it('toggles password visibility without submitting or changing the value', async () => {
  const login = mount()
  const actor = userEvent.setup()
  const password = screen.getByLabelText('Contraseña')
  await actor.type(password, 'mis datos')
  await actor.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
  expect(password).toHaveAttribute('type', 'text')
  expect(password).toHaveValue('mis datos')
  expect(
    screen.getByRole('button', { name: 'Ocultar contraseña' }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(login).not.toHaveBeenCalled()
})
it('locks pending submission, preserves credentials and permits retry after a network error', async () => {
  let reject!: (error: unknown) => void
  const login = mount(
    vi.fn(
      () =>
        new Promise<void>((_, no) => {
          reject = no
        }),
    ),
  )
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'operador@example.test' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: ' password con espacios ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  expect(
    screen.getByRole('button', { name: 'Iniciando sesión…' }),
  ).toBeDisabled()
  expect(screen.getByLabelText('Contraseña')).toBeDisabled()
  expect(login).toHaveBeenCalledExactlyOnceWith(
    'operador@example.test',
    ' password con espacios ',
  )
  await act(async () =>
    reject(
      new ApiError(0, 'No se pudo conectar con Mandaria. Inténtalo de nuevo.'),
    ),
  )
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar')
  expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
  expect(screen.getByLabelText('Contraseña')).toHaveValue(
    ' password con espacios ',
  )
  expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
})
it.each([
  ['/login', 'Panel operativo'],
  ['/login?next=onboarding', 'Verificación'],
  ['/login?next=https://example.test', 'Panel operativo'],
])('preserves the destination for %s', async (path, heading) => {
  mount(undefined, path)
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'operador@example.test' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'password' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  expect(
    await screen.findByRole('heading', { name: heading }),
  ).toBeInTheDocument()
})
