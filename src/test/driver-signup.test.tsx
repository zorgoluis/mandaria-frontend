import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DriverSignup } from '../verification/signup'
import { AuthContext } from '../auth/context'
import { verification } from '../verification/service'
import { ApiError } from '../services/errors'
import { newPasswordCases } from './password-policy-fixtures'
vi.mock('../verification/service', () => ({
  verification: { signupStart: vi.fn(), signupComplete: vi.fn() },
}))
const login = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  vi.mocked(verification.signupStart).mockResolvedValue({
    status: 'CHECK_EMAIL',
    challengeId: '11111111-1111-4111-8111-111111111111',
    resendAfterSeconds: 60,
  })
  vi.mocked(verification.signupComplete).mockResolvedValue({
    status: 'CREATED_LOGIN_REQUIRED',
    email: 'driver@example.invalid',
  })
  login.mockResolvedValue(undefined)
})
function mount() {
  return render(
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        expired: false,
        error: null,
        login,
        logout: vi.fn(),
        restore: vi.fn(),
      }}
    >
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DriverSignup />} />
          <Route path="/driver/onboarding" element={<p>Registro guiado</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}
async function begin() {
  fireEvent.change(screen.getByLabelText('Tu correo electrónico'), {
    target: { value: 'driver@example.invalid' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Recibir código' }))
  await screen.findByLabelText('Código de 6 dígitos')
}
function fill(password = 'password-example') {
  fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
    target: { value: '012345' },
  })
  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: 'Persona sintética' },
  })
  fireEvent.change(screen.getByLabelText('Crea una contraseña'), {
    target: { value: password },
  })
  fireEvent.submit(
    screen.getByLabelText('Crea una contraseña').closest('form')!,
  )
}
it('keeps leading zero, logs in with the chosen credentials and enters onboarding without storing signup secrets', async () => {
  mount()
  await begin()
  fill()
  expect(await screen.findByText('Registro guiado')).toBeInTheDocument()
  expect(verification.signupComplete).toHaveBeenCalledWith(
    expect.objectContaining({ code: '012345', name: 'Persona sintética' }),
  )
  expect(login).toHaveBeenCalledWith(
    'driver@example.invalid',
    'password-example',
  )
  expect(localStorage.length + sessionStorage.length).toBe(0)
})
it('does not log in when the code is rejected and lets the person retry', async () => {
  vi.mocked(verification.signupComplete).mockRejectedValue(
    new ApiError(400, 'invalid', 'SIGNUP_CODE_INVALID'),
  )
  mount()
  await begin()
  fill()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'El código no es válido',
  )
  expect(login).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: 'Crear cuenta y continuar' }),
  ).toBeEnabled()
})
it('offers login when account creation succeeds but login fails, without replaying registration', async () => {
  login.mockRejectedValue(new Error('Connection lost'))
  mount()
  await begin()
  fill()
  expect(
    await screen.findByRole('link', { name: 'Entrar a mi cuenta' }),
  ).toHaveAttribute('href', '/login?next=onboarding')
  expect(verification.signupComplete).toHaveBeenCalledTimes(1)
})
it('resend is cooled down and email can be corrected', async () => {
  mount()
  await begin()
  expect(
    screen.getByRole('button', { name: 'Reenviar en 60 s' }),
  ).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }))
  expect(screen.getByLabelText('Tu correo electrónico')).toHaveValue(
    'driver@example.invalid',
  )
  expect(screen.queryByLabelText('Código de 6 dígitos')).not.toBeInTheDocument()
})
it.each(newPasswordCases)(
  'new signup password $name',
  async ({ value, valid }) => {
    mount()
    await begin()
    fill(value)
    if (valid)
      await waitFor(() =>
        expect(verification.signupComplete).toHaveBeenCalled(),
      )
    else {
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'La contraseña debe tener entre',
      )
      expect(verification.signupComplete).not.toHaveBeenCalled()
    }
  },
)
