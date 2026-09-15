import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { integrations } from '../integrations/service'
import { providers } from '../providers/service'
import { users } from '../users/service'
import type { Integration, Provider, Role, User } from '../types/api'
import { ApiError } from '../services/errors'
vi.mock('../integrations/service', () => ({
  integrations: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    status: vi.fn(),
    credentials: vi.fn(),
    createCredential: vi.fn(),
    rotate: vi.fn(),
    revoke: vi.fn(),
  },
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    members: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
  },
}))
vi.mock('../users/service', () => ({ users: { list: vi.fn() } }))
const stamp = '2026-09-15T12:00:00Z'
const provider: Provider = {
  id: 'provider-1',
  name: 'Red del Sur',
  code: 'RED_SUR',
  type: 'FLEET',
  status: 'ACTIVE',
  maxDrivers: 10,
  maxVehicles: 12,
  createdAt: stamp,
  updatedAt: stamp,
}
const integration: Integration = {
  id: 'integration-1',
  name: 'Cliente Demo',
  code: 'DEMO',
  status: 'ACTIVE',
  createdAt: stamp,
  updatedAt: stamp,
}
const human: User = {
  id: 'user-1',
  email: 'admin@example.test',
  role: 'SUPER_ADMIN',
  active: true,
  emailVerifiedAt: null,
  createdAt: stamp,
  updatedAt: stamp,
}
const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  totalPages: items.length ? 1 : 0,
  page: 1,
  pageSize: 20,
})
function mount(
  path: string,
  role: Role | null = 'SUPER_ADMIN',
  overrides: Partial<AuthState> = {},
) {
  const auth: AuthState = {
    user: role ? { ...human, role } : null,
    loading: false,
    expired: false,
    error: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={auth}>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return auth
}
beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
  vi.mocked(providers.list).mockResolvedValue(page([provider]))
  vi.mocked(providers.get).mockResolvedValue(provider)
  vi.mocked(providers.members).mockResolvedValue(page([]))
  vi.mocked(users.list).mockResolvedValue([])
  vi.mocked(integrations.list).mockResolvedValue([
    { ...integration, credentials: [] },
  ])
  vi.mocked(integrations.get).mockResolvedValue(integration)
  vi.mocked(integrations.credentials).mockResolvedValue([])
})
describe('auth and permissions UX', () => {
  it.each([
    '/integrations/new',
    '/integrations/another-client',
    '/providers',
    '/providers/new',
    '/providers/another-provider',
    '/users',
    '/settings',
  ])(
    'PROVIDER_ADMIN cannot open global route %s or fetch privileged data',
    (path) => {
      mount(path, 'PROVIDER_ADMIN')
      expect(
        screen.getByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      expect(integrations.list).not.toHaveBeenCalled()
      expect(integrations.get).not.toHaveBeenCalled()
      expect(integrations.credentials).not.toHaveBeenCalled()
      expect(providers.list).not.toHaveBeenCalled()
      expect(providers.get).not.toHaveBeenCalled()
      expect(users.list).not.toHaveBeenCalled()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Crear|Guardar|Activar|Revocar/ }),
      ).not.toBeInTheDocument()
    },
  )
  it('shows the associated provider and exact limited navigation on the provider dashboard', async () => {
    const own = {
      id: provider.id,
      name: provider.name,
      code: provider.code,
      type: provider.type,
      status: provider.status,
      limits: { maxDrivers: 10, maxVehicles: 12 },
      membershipRole: 'OWNER' as const,
    }
    vi.mocked(providers.profiles).mockResolvedValue(page([own]))
    vi.mocked(providers.profile).mockResolvedValue(own)
    mount('/dashboard', 'PROVIDER_ADMIN')
    expect(
      await screen.findByRole('heading', { name: provider.name }),
    ).toBeInTheDocument()
    expect(providers.profile).toHaveBeenCalledWith(
      provider.id,
      expect.any(AbortSignal),
    )
    expect(
      within(screen.getByRole('navigation', { name: 'Navegación principal' }))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dashboard', 'Mi proveedor', 'Mi perfil'])
    expect(providers.list).not.toHaveBeenCalled()
    expect(integrations.list).not.toHaveBeenCalled()
    expect(screen.queryByText('Proveedores recientes')).not.toBeInTheDocument()
  })
  it('redirects unauthenticated protected routes to login', async () => {
    mount('/integrations', null)
    expect(
      await screen.findByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })
  it('shows session expired message', () => {
    mount('/login', null, { expired: true })
    expect(screen.getByText(/Tu sesión expiró/)).toBeInTheDocument()
  })
  it('SUPER_ADMIN sees integrations and providers', async () => {
    mount('/dashboard')
    expect(
      await screen.findByRole('link', { name: 'Integraciones' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Proveedores' }),
    ).toBeInTheDocument()
  })
  it('PROVIDER_ADMIN cannot open integrations manually', () => {
    mount('/integrations', 'PROVIDER_ADMIN')
    expect(
      screen.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Integraciones' }),
    ).not.toBeInTheDocument()
    expect(integrations.list).not.toHaveBeenCalled()
  })
  it('PROVIDER_ADMIN only sees own profile and supports empty memberships', async () => {
    vi.mocked(providers.profiles).mockResolvedValue(page([]))
    mount('/provider/profile', 'PROVIDER_ADMIN')
    expect(
      await screen.findByText('Aún no tienes un proveedor asociado'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Integraciones' }),
    ).not.toBeInTheDocument()
    expect(providers.list).not.toHaveBeenCalled()
  })
  it('renders 404', () => {
    mount('/missing')
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
  })
  it('submits login and displays an incorrect password error', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, 'El correo o la contraseña son incorrectos.'),
      )
    mount('/login', null, { login })
    const actor = userEvent.setup()
    await actor.type(
      screen.getByLabelText('Correo electrónico'),
      'admin@example.test',
    )
    await actor.type(screen.getByLabelText('Contraseña'), 'wrong')
    await actor.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('incorrectos')
    expect(login).toHaveBeenCalledWith('admin@example.test', 'wrong')
  })
  it('logs out through user menu', async () => {
    const auth = mount('/profile')
    const actor = userEvent.setup()
    await actor.click(screen.getByRole('button', { name: /admin@example/ }))
    await actor.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(auth.logout).toHaveBeenCalledOnce()
  })
})
describe('integrations', () => {
  it('lists clients', async () => {
    mount('/integrations')
    expect(await screen.findByText('Cliente Demo')).toBeInTheDocument()
  })
  it('creates only admitted fields', async () => {
    vi.mocked(integrations.create).mockResolvedValue(integration)
    mount('/integrations/new')
    const actor = userEvent.setup()
    await actor.type(screen.getByLabelText('Nombre'), 'Cliente Demo')
    await actor.type(screen.getByLabelText(/Código/), 'DEMO')
    await actor.click(screen.getByRole('button', { name: 'Crear integración' }))
    await waitFor(() =>
      expect(integrations.create).toHaveBeenCalledWith({
        name: 'Cliente Demo',
        code: 'DEMO',
      }),
    )
  })
  it.each(['ACTIVE', 'SUSPENDED'] as const)(
    'confirms status transition from %s',
    async (status) => {
      vi.mocked(integrations.get).mockResolvedValue({ ...integration, status })
      mount('/integrations/integration-1')
      const actor = userEvent.setup()
      await actor.click(
        await screen.findByRole('button', {
          name:
            status === 'ACTIVE'
              ? 'Suspender integración'
              : 'Activar integración',
        }),
      )
      expect(integrations.status).not.toHaveBeenCalled()
      await actor.click(screen.getByRole('button', { name: 'Confirmar' }))
      await waitFor(() =>
        expect(integrations.status).toHaveBeenCalledWith(
          'integration-1',
          status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
        ),
      )
    },
  )
  it('shows secret once without persistence or query cache', async () => {
    vi.mocked(integrations.createCredential).mockResolvedValue({
      clientId: 'credential-1',
      integrationId: integration.id,
      clientSecret: 'one-time-test-secret',
    })
    mount('/integrations/integration-1')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Crear credencial' }),
    )
    await actor.click(screen.getByLabelText('deliveries:read'))
    await actor.click(
      screen.getByRole('button', { name: 'Generar credencial' }),
    )
    expect(
      await screen.findByText('Este secreto sólo se mostrará una vez.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Client secret')).toHaveValue(
      'one-time-test-secret',
    )
    expect(JSON.stringify(sessionStorage)).not.toContain('one-time-test-secret')
    expect(localStorage.length).toBe(0)
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('one-time-test-secret')
    await actor.click(
      screen.getByRole('button', { name: 'Ya lo guardé, cerrar' }),
    )
    expect(
      screen.queryByDisplayValue('one-time-test-secret'),
    ).not.toBeInTheDocument()
  })
  it('requires confirmation before revoking credential', async () => {
    vi.mocked(integrations.credentials).mockResolvedValue([
      {
        id: 'credential-1',
        clientId: integration.id,
        status: 'ACTIVE',
        scopes: [],
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ])
    mount('/integrations/integration-1')
    const actor = userEvent.setup()
    await actor.click(await screen.findByRole('button', { name: 'Revocar' }))
    expect(integrations.revoke).not.toHaveBeenCalled()
    await actor.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Revocar',
      }),
    )
    await waitFor(() =>
      expect(integrations.revoke).toHaveBeenCalledWith(
        integration.id,
        'credential-1',
      ),
    )
  })
})
describe('providers', () => {
  it('associates an existing administrator with a local role', async () => {
    mount('/providers/provider-1')
    const actor = userEvent.setup()
    const field = await screen.findByLabelText(/ID del usuario/)
    await actor.type(field, '00000000-0000-4000-8000-000000000001')
    await actor.selectOptions(
      screen.getByLabelText('Rol dentro del proveedor'),
      'OWNER',
    )
    await actor.click(
      screen.getByRole('button', { name: 'Asociar administrador' }),
    )
    await waitFor(() =>
      expect(providers.addMember).toHaveBeenCalledWith(
        provider.id,
        '00000000-0000-4000-8000-000000000001',
        'OWNER',
      ),
    )
  })
  it('handles a rejected provider profile without showing another provider', async () => {
    vi.mocked(providers.profiles).mockResolvedValue(
      page([
        {
          id: provider.id,
          name: provider.name,
          code: provider.code,
          type: provider.type,
          status: provider.status,
          limits: { maxDrivers: 10, maxVehicles: 10 },
          membershipRole: 'ADMIN',
        },
      ]),
    )
    vi.mocked(providers.profile).mockRejectedValue(
      new ApiError(403, 'Sin asociación vigente.'),
    )
    mount('/provider/profile?providerId=foreign-provider', 'PROVIDER_ADMIN')
    expect(await screen.findByText('403 — Sin permisos')).toBeInTheDocument()
    expect(screen.queryByText(provider.name)).not.toBeInTheDocument()
  })
  it('lists and sends server filters', async () => {
    mount('/providers')
    expect(await screen.findByText('Red del Sur')).toBeInTheDocument()
    const actor = userEvent.setup()
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      'INDEPENDENT',
    )
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'PENDING',
    )
    await waitFor(() =>
      expect(providers.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'INDEPENDENT',
          status: 'PENDING',
          page: 1,
        }),
        expect.any(AbortSignal),
      ),
    )
  })
  it.each(['FLEET', 'INDEPENDENT'] as const)(
    'creates %s using backend limit defaults',
    async (type) => {
      vi.mocked(providers.create).mockResolvedValue(provider)
      mount('/providers/new')
      const actor = userEvent.setup()
      await actor.type(screen.getByLabelText('Nombre'), 'Red del Sur')
      await actor.type(screen.getByLabelText(/Código/), 'RED_SUR')
      await actor.selectOptions(
        screen.getByLabelText('Tipo de proveedor'),
        type,
      )
      await actor.click(screen.getByRole('button', { name: 'Crear proveedor' }))
      await waitFor(() =>
        expect(providers.create).toHaveBeenCalledWith({
          name: 'Red del Sur',
          code: 'RED_SUR',
          type,
        }),
      )
    },
  )
  it('edits limits from real provider detail', async () => {
    mount('/providers/provider-1')
    const actor = userEvent.setup()
    const field = await screen.findByLabelText('Máximo de repartidores')
    await actor.clear(field)
    await actor.type(field, '25')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() =>
      expect(providers.update).toHaveBeenCalledWith(
        provider.id,
        expect.objectContaining({ maxDrivers: 25, maxVehicles: 12 }),
      ),
    )
  })
  it.each(['ACTIVE', 'PENDING'] as const)(
    'confirms provider transition from %s',
    async (status) => {
      vi.mocked(providers.get).mockResolvedValue({ ...provider, status })
      mount('/providers/provider-1')
      const actor = userEvent.setup()
      await actor.click(
        await screen.findByRole('button', {
          name:
            status === 'ACTIVE' ? 'Suspender proveedor' : 'Activar proveedor',
        }),
      )
      expect(providers.transition).not.toHaveBeenCalled()
      await actor.click(screen.getByRole('button', { name: 'Confirmar' }))
      await waitFor(() =>
        expect(providers.transition).toHaveBeenCalledWith(
          provider.id,
          status === 'ACTIVE' ? 'suspend' : 'activate',
        ),
      )
    },
  )
  it('removes only membership after confirmation', async () => {
    vi.mocked(providers.members).mockResolvedValue(
      page([
        {
          id: 'membership-1',
          userId: human.id,
          providerId: provider.id,
          role: 'ADMIN',
          user: human,
          createdAt: stamp,
        },
      ]),
    )
    mount('/providers/provider-1')
    const actor = userEvent.setup()
    await actor.click(await screen.findByRole('button', { name: 'Retirar' }))
    expect(
      screen.getByText(/Su cuenta de usuario no se eliminará/),
    ).toBeInTheDocument()
    await actor.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Retirar',
      }),
    )
    await waitFor(() =>
      expect(providers.removeMember).toHaveBeenCalledWith(
        provider.id,
        'membership-1',
      ),
    )
  })
})
