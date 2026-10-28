import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminLayout } from '../layouts/AdminLayout'
import { CustomerProfilePage } from '../customer/ProfilePage'
import { customer } from '../customer/service'
import type { CustomerProfileViewDto } from '../customer/contract'
vi.mock('../auth/context', () => ({
  useAuth: () => ({
    user: {
      id: 'synthetic',
      email: 'profile@example.test',
      role: 'CUSTOMER',
      emailVerifiedAt: null,
    },
  }),
}))
vi.mock('../customer/service', () => ({
  customer: {
    profile: vi.fn(),
    capabilities: vi.fn(),
    update: vi.fn(),
    type: vi.fn(),
    verify: vi.fn(),
  },
}))
vi.mock('../execution/components', () => ({ ExecutionRecovery: () => null }))
vi.mock('../customer/pages', () => ({ CustomerOperationNotice: () => null }))
let profile: CustomerProfileViewDto
beforeEach(() => {
  vi.resetAllMocks()
  profile = {
    displayName: 'Laura Sintética',
    businessName: null,
    type: 'PERSONAL',
    revision: 1,
    active: true,
  }
  vi.mocked(customer.profile).mockImplementation(async () => ({ ...profile }))
  vi.mocked(customer.capabilities).mockResolvedValue({
    type: 'PERSONAL',
    allowedShippingPayers: ['REQUESTER'],
    defaultShippingPayer: 'REQUESTER',
    capacity: {
      occupied: false,
      activeCount: 0,
      maxActiveRequests: 1,
      activeRequestPublicId: null,
    },
    canPrequote: true,
    canCreateRequest: true,
    reason: null,
  })
  vi.mocked(customer.update).mockImplementation(async (body) => {
    profile = { ...profile, ...body, revision: 2 }
    return profile
  })
})
async function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CustomerProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByDisplayValue('Laura Sintética')
  await waitFor(() => expect(customer.capabilities).toHaveBeenCalled())
  return client
}
it('preloads identity and only saves valid changed data, then refreshes identity', async () => {
  await mount()
  expect(screen.getByText('LS')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar perfil' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Nombre *'), {
    target: { value: 'Laura Actualizada' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
  await screen.findByRole('heading', { name: 'Laura Actualizada' })
  expect(customer.update).toHaveBeenCalledWith({
    displayName: 'Laura Actualizada',
    expectedRevision: 1,
  })
})
it('links to approval without enabling direct upgrade or losing contact edits', async () => {
  await mount()
  fireEvent.change(screen.getByLabelText('Nombre *'), {
    target: { value: 'Edición pendiente' },
  })
  expect(
    screen.queryByRole('radio', { name: 'Negocio' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Solicitar cuenta Negocio' }),
  ).toHaveAttribute('href', '/customer/business')
  expect(screen.getByLabelText('Nombre *')).toHaveValue('Edición pendiente')
  expect(customer.type).not.toHaveBeenCalled()
})
it('confirms discard and never overwrites edits when refresh fails', async () => {
  await mount()
  fireEvent.change(screen.getByLabelText('Nombre *'), {
    target: { value: 'Conservar edición' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar perfil actual' }),
  )
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  vi.mocked(customer.profile).mockRejectedValueOnce(new Error('Sin conexión'))
  fireEvent.click(screen.getByRole('button', { name: 'Descartar y consultar' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(screen.getByLabelText('Nombre *')).toHaveValue('Conservar edición')
})
it('blocks repeat after lost response until explicit current-profile read', async () => {
  await mount()
  vi.mocked(customer.update).mockRejectedValueOnce(new Error('Timeout'))
  fireEvent.change(screen.getByLabelText('Nombre *'), {
    target: { value: 'Nuevo nombre' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
  await screen.findByText(/Cambio pendiente de consulta/)
  expect(screen.getByRole('button', { name: 'Guardar perfil' })).toBeDisabled()
  expect(customer.update).toHaveBeenCalledTimes(1)
})
it('does not allow clearing an existing business name unsupported by DTO', async () => {
  profile.businessName = 'Negocio sintético'
  await mount()
  fireEvent.change(screen.getByLabelText('Nombre del negocio (opcional)'), {
    target: { value: '' },
  })
  expect(screen.getByRole('button', { name: 'Guardar perfil' })).toBeDisabled()
  expect(screen.getByText(/no permite borrar/)).toBeInTheDocument()
})
it('capacity failure does not enable direct upgrade nor block independent profile editing', async () => {
  vi.mocked(customer.capabilities).mockRejectedValue(new Error('Sin conexión'))
  await mount()
  expect(
    screen.queryByRole('button', { name: 'Cambiar tipo' }),
  ).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Nombre *'), {
    target: { value: 'Nuevo nombre' },
  })
  expect(screen.getByRole('button', { name: 'Guardar perfil' })).toBeEnabled()
})
it('prevents duplicate verification requests and explains accepted is not delivered', async () => {
  await mount()
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Solicitar verificación de mi correo',
    }),
  )
  const sent = await screen.findByRole('button', {
    name: 'Verificación solicitada',
  })
  fireEvent.click(sent)
  expect(sent).toBeDisabled()
  expect(customer.verify).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status')).toHaveTextContent('no confirma su entrega')
})

it('keeps Mi perfil active and updates header name from the same profile cache without changing role', async () => {
  const client = new QueryClient()
  client.setQueryData(['customer', 'synthetic', 'profile'], profile)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/customer/profile']}>
        <AdminLayout />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveClass('active')
  expect(screen.getByRole('link', { name: 'Mis envíos' })).not.toHaveClass(
    'active',
  )
  expect(screen.getByText('Laura Sintética')).toBeInTheDocument()
  await act(async () => {
    client.setQueryData(['customer', 'synthetic', 'profile'], {
      ...profile,
      displayName: 'Nombre actualizado',
    })
  })
  await screen.findByText('Nombre actualizado')
  expect(customer.profile).not.toHaveBeenCalled()
})
