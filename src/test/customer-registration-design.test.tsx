import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RegistrationPage } from '../customer/RegistrationPage'
import { customer } from '../customer/service'
import { ApiError } from '../services/errors'
vi.mock('../customer/service', () => ({ customer: { register: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
function mount() {
  render(
    <MemoryRouter>
      <RegistrationPage />
    </MemoryRouter>,
  )
}
function fill() {
  fireEvent.change(screen.getByLabelText(/^Correo electrónico/), {
    target: { value: ' Person@Example.test ' },
  })
  fireEvent.change(screen.getByLabelText(/^Nombre\s*\*?$/), {
    target: { value: ' Persona Sintética ' },
  })
}
it('defaults to personal, marks required fields and validates on blur', () => {
  mount()
  expect(screen.getByRole('radio', { name: 'Personal' })).toBeChecked()
  expect(
    screen.getByRole('button', { name: 'Solicitar registro' }),
  ).toBeDisabled()
  fireEvent.blur(screen.getByLabelText(/^Correo electrónico/))
  expect(
    screen.getByText('Introduce un correo electrónico válido.'),
  ).toBeInTheDocument()
  expect(screen.getByLabelText(/^Correo electrónico/)).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  expect(screen.queryByLabelText(/Teléfono/)).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  fill()
  expect(
    screen.getByRole('button', { name: 'Solicitar registro' }),
  ).toBeEnabled()
})
it('sends exact normalized DTO without phone, no automatic retry and focuses generic acknowledgement', async () => {
  vi.mocked(customer.register).mockResolvedValue({ status: 'ACCEPTED' })
  mount()
  fill()
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar registro' }))
  const heading = await screen.findByRole('heading', {
    name: 'Solicitud enviada',
  })
  expect(heading).toHaveFocus()
  expect(customer.register).toHaveBeenCalledExactlyOnceWith(
    {
      email: 'person@example.test',
      type: 'PERSONAL',
      displayName: 'Persona Sintética',
    },
    false,
  )
  expect(screen.getByText(/no confirma la aprobación/)).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Ir a iniciar sesión' }),
  ).toHaveAttribute('href', '/login')
})
it('business requires business name and switching back retains the entered text', () => {
  mount()
  fill()
  fireEvent.click(screen.getByRole('radio', { name: 'Negocio' }))
  expect(screen.getByLabelText(/^Nombre del negocio/)).toBeRequired()
  expect(
    screen.getByRole('button', { name: 'Solicitar registro' }),
  ).toBeDisabled()
  fireEvent.change(screen.getByLabelText(/^Nombre del negocio/), {
    target: { value: 'Negocio Sintético' },
  })
  fireEvent.click(screen.getByRole('radio', { name: 'Personal' }))
  expect(screen.getByLabelText(/^Nombre del negocio/)).toHaveValue(
    'Negocio Sintético',
  )
  expect(screen.getByLabelText(/^Nombre del negocio/)).not.toBeRequired()
})
it('guards double submit during a pending request', async () => {
  let done!: (value: unknown) => void
  vi.mocked(customer.register).mockReturnValue(
    new Promise((resolve) => {
      done = resolve
    }),
  )
  mount()
  fill()
  const button = screen.getByRole('button', { name: 'Solicitar registro' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(customer.register).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  await act(async () => done({ status: 'ACCEPTED' }))
})
it('keeps fields on admission failure and does not infer account existence', async () => {
  vi.mocked(customer.register).mockRejectedValue(
    new ApiError(
      403,
      'El registro de nuevos clientes está deshabilitado.',
      'CUSTOMER_ADMISSION_DISABLED',
    ),
  )
  mount()
  fill()
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar registro' }))
  await screen.findByRole('alert')
  expect(screen.getByLabelText(/^Nombre\s*\*?$/)).toHaveValue(
    ' Persona Sintética ',
  )
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(customer.register).toHaveBeenCalledTimes(1)
})
it('maps backend field validation without exposing technical strings', async () => {
  vi.mocked(customer.register).mockRejectedValue(
    new ApiError(400, 'Revisa los campos.', null, [
      'email internal validator synthetic detail',
    ]),
  )
  mount()
  fill()
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar registro' }))
  await waitFor(() =>
    expect(screen.getByLabelText(/^Correo electrónico/)).toHaveAttribute(
      'aria-invalid',
      'true',
    ),
  )
  expect(
    screen.getByText('Revisa el formato del correo electrónico.'),
  ).toBeInTheDocument()
  expect(screen.queryByText(/internal validator/)).not.toBeInTheDocument()
})
