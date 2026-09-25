import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { normalizeError } from '../services/errors'
import { accounts, invitations } from '../invitations/service'
import { providers } from '../providers/service'
import { drivers } from '../drivers/service'
import { capacity } from '../logistics/service'
import type {
  AccountUser,
  InvitationDispatch,
  UserInvitation,
} from '../invitations/types'
import type { Provider, Role } from '../types/api'

vi.mock('../invitations/service', () => ({
  invitations: {
    list: vi.fn(),
    inviteProviderAdmin: vi.fn(),
    inviteDriver: vi.fn(),
    resend: vi.fn(),
    revoke: vi.fn(),
  },
  accounts: { list: vi.fn(), activate: vi.fn() },
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    members: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
    update: vi.fn(),
  },
}))
vi.mock('../users/service', () => ({
  users: { list: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../drivers/service', () => ({
  drivers: { list: vi.fn(), get: vi.fn() },
}))
vi.mock('../vehicles/service', () => ({ vehicles: { list: vi.fn() } }))
vi.mock('../logistics/service', () => ({ capacity: vi.fn() }))

const stamp = '2026-09-16T12:00:00Z'
const TOKEN = 'tok_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v'
const PASSWORD = 'una frase larga y segura'
const providerA: Provider = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Rápidos de Coita',
  code: 'RAPIDOS_COITA',
  type: 'FLEET',
  status: 'ACTIVE',
  maxDrivers: 10,
  maxVehicles: 10,
  createdAt: stamp,
  updatedAt: stamp,
}
function invitation(overrides: Partial<UserInvitation> = {}): UserInvitation {
  return {
    id: 'inv-1',
    userId: 'user-inv-1',
    email: 'ana@example.test',
    role: 'PROVIDER_ADMIN',
    providerId: providerA.id,
    provider: { id: providerA.id, name: providerA.name, code: providerA.code },
    membershipRole: 'ADMIN',
    driverName: null,
    status: 'PENDING',
    expiresAt: '2026-09-17T12:00:00Z',
    tokenIssuedAt: stamp,
    resendCount: 0,
    acceptedAt: null,
    revokedAt: null,
    revokedByUserId: null,
    createdByUserId: 'admin-1',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}
const dispatch = (
  item: UserInvitation,
  emailDelivery: 'SENT' | 'FAILED' = 'SENT',
): InvitationDispatch => ({ ...item, emailDelivery })
const pending = invitation()
const expired = invitation({
  id: 'inv-2',
  email: 'beto@example.test',
  role: 'DRIVER',
  membershipRole: null,
  driverName: 'Beto Ruiz',
  status: 'EXPIRED',
  expiresAt: '2026-09-15T12:00:00Z',
})
const accepted = invitation({
  id: 'inv-3',
  email: 'caro@example.test',
  status: 'ACCEPTED',
  acceptedAt: stamp,
})
const page = <T,>(items: T[], total = items.length) => ({
  items,
  total,
  totalPages: Math.ceil(total / 20),
  page: 1,
  pageSize: 20,
})
function Probe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  )
}
function mount(path: string, role: Role | null = 'SUPER_ADMIN') {
  const auth: AuthState = {
    user: role
      ? {
          id: 'admin-1',
          email: 'admin@example.test',
          role,
          active: true,
          emailVerifiedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        }
      : null,
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={auth}>
          <FeedbackProvider>
            <App />
            <Probe />
          </FeedbackProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return auth
}
const noSecrets = () => {
  expect(document.body).not.toHaveTextContent(TOKEN)
  expect(document.body).not.toHaveTextContent(
    /passwordHash|contraseña temporal/i,
  )
}

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(invitations.list).mockResolvedValue(
    page([pending, expired, accepted]),
  )
  vi.mocked(accounts.list).mockResolvedValue([])
  vi.mocked(providers.list).mockResolvedValue(page([providerA]))
  vi.mocked(providers.get).mockResolvedValue(providerA)
  vi.mocked(providers.members).mockResolvedValue(page([]))
  const profile = {
    ...providerA,
    membershipRole: 'OWNER' as const,
    limits: { maxDrivers: 10, maxVehicles: 10 },
  }
  vi.mocked(providers.profiles).mockResolvedValue(page([profile]))
  vi.mocked(providers.profile).mockResolvedValue(profile)
  vi.mocked(capacity).mockResolvedValue({
    providerId: providerA.id,
    drivers: { count: 1, max: 10 },
    vehicles: { count: 0, max: 10 },
  })
  vi.mocked(drivers.list).mockResolvedValue(page([]))
})

describe('SUPER_ADMIN accounts and admin invitations', () => {
  const people: AccountUser[] = (
    [
      ['ACTIVE', 'PROVIDER_ADMIN'],
      ['INVITED', 'PROVIDER_ADMIN'],
      ['DISABLED', 'DRIVER'],
    ] as const
  ).map(([status, role], index) => ({
    id: `u-${index}`,
    email: `u${index}@example.test`,
    role,
    status,
    active: status === 'ACTIVE',
    emailVerifiedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  }))

  it('shows real account statuses and filters them on the server', async () => {
    vi.mocked(accounts.list).mockResolvedValue(people)
    mount('/users')
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Activo')
    expect(rows[1]).toHaveTextContent('Invitación pendiente')
    expect(rows[2]).toHaveTextContent('Deshabilitado')
    await userEvent
      .setup()
      .selectOptions(
        screen.getByLabelText('Filtrar por estado de cuenta'),
        'INVITED',
      )
    await waitFor(() =>
      expect(accounts.list).toHaveBeenLastCalledWith(
        'INVITED',
        expect.any(AbortSignal),
      ),
    )
    noSecrets()
  })
  it('shows the empty state for accounts', async () => {
    mount('/users')
    expect(
      await screen.findByRole('heading', { name: 'No hay administradores' }),
    ).toBeInTheDocument()
  })
  it('invites a PROVIDER_ADMIN with a role fixed by the flow', async () => {
    vi.mocked(invitations.inviteProviderAdmin).mockResolvedValue(
      dispatch(pending),
    )
    mount('/users')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Invitar administrador' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    expect(
      dialog.queryByRole('option', { name: /Superadministrador/ }),
    ).toBeNull()
    expect(
      dialog.getByText(/Rol de la cuenta: Administrador de proveedor/),
    ).toBeInTheDocument()
    await actor.type(
      dialog.getByLabelText('Correo electrónico'),
      ' Ana@Example.test ',
    )
    await waitFor(() =>
      expect(
        dialog.getByRole('option', { name: /Rápidos de Coita/ }),
      ).toBeInTheDocument(),
    )
    await actor.selectOptions(dialog.getByLabelText('Proveedor'), providerA.id)
    await actor.selectOptions(
      dialog.getByLabelText('Rol dentro del proveedor'),
      'OWNER',
    )
    await actor.click(dialog.getByRole('button', { name: 'Enviar invitación' }))
    await waitFor(() =>
      expect(invitations.inviteProviderAdmin).toHaveBeenCalledWith(
        providerA.id,
        {
          email: 'ana@example.test',
          membershipRole: 'OWNER',
        },
      ),
    )
    expect(
      await screen.findByText('Invitación enviada a ana@example.test.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    noSecrets()
  })
  it.each([
    ['USER_INVITATION_PENDING', 409, 'Ya existe una invitación pendiente'],
    ['USER_ALREADY_ACTIVE', 409, 'Ya existe una cuenta activa'],
    ['USER_DISABLED', 409, 'deshabilitada'],
    [undefined, 429, 'Demasiados intentos. Intenta nuevamente más tarde.'],
    [undefined, 403, 'No tienes permisos'],
    [undefined, 400, 'Revisa los campos'],
    [undefined, 500, 'no está disponible'],
    [undefined, 0, 'No se pudo conectar'],
  ])('shows a clear invite error for %s (%i)', async (code, status, text) => {
    vi.mocked(invitations.inviteProviderAdmin).mockRejectedValue(
      normalizeError(status, { code, message: 'raw internal detail' }),
    )
    mount(`/providers/${providerA.id}`)
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Invitar administrador' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    // Inside a provider the provider is fixed: no picker.
    expect(dialog.queryByLabelText('Proveedor')).not.toBeInTheDocument()
    await actor.type(
      dialog.getByLabelText('Correo electrónico'),
      'ana@example.test',
    )
    await actor.click(dialog.getByRole('button', { name: 'Enviar invitación' }))
    const alert = await dialog.findByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(alert).not.toHaveTextContent('raw internal detail')
    expect(invitations.inviteProviderAdmin).toHaveBeenCalledWith(providerA.id, {
      email: 'ana@example.test',
      membershipRole: 'ADMIN',
    })
  })
})

describe('invitation list, resend and revoke', () => {
  it('lists useful data without tokens and only offers valid actions', async () => {
    mount('/invitations')
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('ana@example.test')
    expect(rows[0]).toHaveTextContent('Administrador de proveedor')
    expect(rows[0]).toHaveTextContent('Rápidos de Coita')
    expect(rows[0]).toHaveTextContent('Invitación pendiente')
    expect(rows[1]).toHaveTextContent('Repartidor')
    expect(rows[1]).toHaveTextContent('Beto Ruiz')
    expect(rows[1]).toHaveTextContent('Expirada')
    expect(
      within(rows[1]).getByRole('button', { name: /Reenviar/ }),
    ).toBeInTheDocument()
    expect(rows[2]).toHaveTextContent('Aceptada')
    expect(within(rows[2]).queryByRole('button')).not.toBeInTheDocument()
    expect(invitations.list).toHaveBeenCalledWith(
      { kind: 'admin' },
      expect.objectContaining({ page: 1, pageSize: 20 }),
      expect.any(AbortSignal),
    )
    noSecrets()
  })
  it('filters by status, role and email on the server', async () => {
    mount('/invitations')
    await screen.findByRole('table')
    const actor = userEvent.setup()
    await actor.selectOptions(
      screen.getByLabelText('Filtrar invitaciones por estado'),
      'EXPIRED',
    )
    await actor.selectOptions(
      screen.getByLabelText('Filtrar invitaciones por rol'),
      'DRIVER',
    )
    await actor.type(
      screen.getByLabelText('Buscar invitación por correo'),
      'beto',
    )
    await actor.click(
      screen.getByRole('button', { name: 'Buscar invitaciones' }),
    )
    await waitFor(() =>
      expect(invitations.list).toHaveBeenLastCalledWith(
        { kind: 'admin' },
        {
          page: 1,
          pageSize: 20,
          status: 'EXPIRED',
          role: 'DRIVER',
          search: 'beto',
        },
        expect.any(AbortSignal),
      ),
    )
  })
  it('shows "No hay invitaciones pendientes"', async () => {
    vi.mocked(invitations.list).mockResolvedValue(page([]))
    mount('/invitations')
    await screen.findByRole('heading', { name: 'No hay invitaciones' })
    await userEvent
      .setup()
      .selectOptions(
        screen.getByLabelText('Filtrar invitaciones por estado'),
        'PENDING',
      )
    expect(
      await screen.findByRole('heading', {
        name: 'No hay invitaciones pendientes',
      }),
    ).toBeInTheDocument()
  })
  it('resends after confirmation and reports delivery', async () => {
    vi.mocked(invitations.resend).mockResolvedValue(
      dispatch({ ...expired, status: 'PENDING', resendCount: 1 }),
    )
    mount('/invitations')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', {
        name: 'Reenviar invitación a beto@example.test',
      }),
    )
    const dialog = within(screen.getByRole('dialog'))
    expect(
      dialog.getByText(/El enlace anterior dejará de funcionar/),
    ).toBeInTheDocument()
    expect(invitations.resend).not.toHaveBeenCalled()
    await actor.click(
      dialog.getByRole('button', { name: 'Reenviar invitación' }),
    )
    await waitFor(() =>
      expect(invitations.resend).toHaveBeenCalledWith(
        { kind: 'admin' },
        'inv-2',
      ),
    )
    expect(
      await screen.findByText('Invitación reenviada correctamente.'),
    ).toBeInTheDocument()
  })
  it('warns when the invitation was saved but the email failed', async () => {
    vi.mocked(invitations.resend).mockResolvedValue(dispatch(pending, 'FAILED'))
    mount('/invitations')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', {
        name: 'Reenviar invitación a ana@example.test',
      }),
    )
    await actor.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Reenviar invitación',
      }),
    )
    expect(
      await screen.findByText(/el correo no pudo enviarse/),
    ).toBeInTheDocument()
  })
  it.each([
    [
      'INVITATION_RESEND_COOLDOWN',
      429,
      'Espera un momento antes de reenviarla',
    ],
    [undefined, 429, 'Demasiados intentos. Intenta nuevamente más tarde.'],
    ['INVITATION_NOT_PENDING', 409, 'ya fue aceptada o revocada'],
    ['PROVIDER_DRIVER_LIMIT_REACHED', 409, 'Límite de repartidores'],
    ['MAIL_NOT_CONFIGURED', 503, 'no está configurado'],
  ])(
    'keeps the dialog open with a safe resend error %s',
    async (code, status, text) => {
      vi.mocked(invitations.resend).mockRejectedValue(
        normalizeError(status, { code, message: 'raw' }),
      )
      mount('/invitations')
      const actor = userEvent.setup()
      await actor.click(
        await screen.findByRole('button', {
          name: 'Reenviar invitación a ana@example.test',
        }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await actor.click(
        dialog.getByRole('button', { name: 'Reenviar invitación' }),
      )
      expect(await dialog.findByRole('alert')).toHaveTextContent(text)
    },
  )
  it('revokes only after confirmation', async () => {
    vi.mocked(invitations.revoke).mockResolvedValue({
      ...pending,
      status: 'REVOKED',
      revokedAt: stamp,
    })
    mount('/invitations')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', {
        name: 'Revocar invitación de ana@example.test',
      }),
    )
    const dialog = within(screen.getByRole('dialog'))
    await actor.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(invitations.revoke).not.toHaveBeenCalled()
    await actor.click(
      screen.getByRole('button', {
        name: 'Revocar invitación de ana@example.test',
      }),
    )
    await actor.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Revocar invitación',
      }),
    )
    await waitFor(() =>
      expect(invitations.revoke).toHaveBeenCalledWith(
        { kind: 'admin' },
        'inv-1',
      ),
    )
    expect(
      await screen.findByText('Invitación revocada correctamente.'),
    ).toBeInTheDocument()
  })
  it('scopes the provider detail list to that provider', async () => {
    mount(`/providers/${providerA.id}`)
    await screen.findByRole('region', { name: 'Invitaciones del proveedor' })
    expect(invitations.list).toHaveBeenCalledWith(
      { kind: 'admin', providerId: providerA.id },
      expect.anything(),
      expect.any(AbortSignal),
    )
  })
})

describe('driver invitations', () => {
  it('PROVIDER_ADMIN invites a driver of its own provider only', async () => {
    vi.mocked(invitations.inviteDriver).mockResolvedValue(dispatch(expired))
    mount('/drivers', 'PROVIDER_ADMIN')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Invitar repartidor' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.queryByLabelText('Proveedor')).not.toBeInTheDocument()
    expect(dialog.queryByLabelText(/Rol/)).not.toBeInTheDocument()
    await actor.type(
      dialog.getByLabelText('Correo electrónico'),
      'beto@example.test',
    )
    await actor.type(dialog.getByLabelText('Nombre operativo'), ' Beto Ruiz ')
    await actor.click(dialog.getByRole('button', { name: 'Enviar invitación' }))
    await waitFor(() =>
      expect(invitations.inviteDriver).toHaveBeenCalledWith(
        { kind: 'provider', providerId: providerA.id },
        { email: 'beto@example.test', driverName: 'Beto Ruiz' },
      ),
    )
    expect(
      await screen.findByText('Invitación enviada a beto@example.test.'),
    ).toBeInTheDocument()
    expect(invitations.list).toHaveBeenCalledWith(
      { kind: 'provider', providerId: providerA.id },
      expect.anything(),
      expect.any(AbortSignal),
    )
    expect(
      screen.queryByRole('button', { name: 'Invitar administrador' }),
    ).not.toBeInTheDocument()
    expect(providers.list).not.toHaveBeenCalled()
  })
  it('SUPER_ADMIN invites a driver for the selected provider', async () => {
    vi.mocked(invitations.inviteDriver).mockResolvedValue(dispatch(expired))
    mount(`/drivers?providerId=${providerA.id}`)
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Invitar repartidor' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    await actor.type(
      dialog.getByLabelText('Correo electrónico'),
      'beto@example.test',
    )
    await actor.type(dialog.getByLabelText('Nombre operativo'), 'Beto')
    await actor.click(dialog.getByRole('button', { name: 'Enviar invitación' }))
    await waitFor(() =>
      expect(invitations.inviteDriver).toHaveBeenCalledWith(
        { kind: 'admin', providerId: providerA.id, role: 'DRIVER' },
        { email: 'beto@example.test', driverName: 'Beto' },
      ),
    )
  })
  it('shows the driver seat limit conflict and the empty drivers state', async () => {
    vi.mocked(invitations.inviteDriver).mockRejectedValue(
      normalizeError(409, { code: 'PROVIDER_DRIVER_LIMIT_REACHED' }),
    )
    mount('/drivers', 'PROVIDER_ADMIN')
    expect(
      await screen.findByRole('heading', { name: 'No hay repartidores' }),
    ).toBeInTheDocument()
    const actor = userEvent.setup()
    await actor.click(
      screen.getByRole('button', { name: 'Invitar repartidor' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    await actor.type(
      dialog.getByLabelText('Correo electrónico'),
      'x@example.test',
    )
    await actor.type(dialog.getByLabelText('Nombre operativo'), 'X')
    await actor.click(dialog.getByRole('button', { name: 'Enviar invitación' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Límite de repartidores',
    )
  })
})

describe('role visibility and route protection', () => {
  it('SUPER_ADMIN navigation offers invitations', async () => {
    mount('/dashboard')
    const nav = within(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    )
    expect(
      nav.getByRole('link', { name: 'Administradores' }),
    ).toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'Invitaciones' })).toBeInTheDocument()
  })
  it.each(['PROVIDER_ADMIN', 'DRIVER'] as Role[])(
    '%s cannot see or open user administration',
    (role) => {
      for (const path of ['/users', '/invitations']) {
        mount(path, role)
        expect(
          screen.getByRole('heading', { name: 'Sin permisos' }),
        ).toBeInTheDocument()
        expect(
          screen.queryByRole('link', { name: 'Administradores' }),
        ).toBeNull()
        expect(screen.queryByRole('link', { name: 'Invitaciones' })).toBeNull()
        expect(
          screen.queryByRole('button', { name: /Invitar administrador/ }),
        ).toBeNull()
        cleanup()
      }
      expect(accounts.list).not.toHaveBeenCalled()
      expect(invitations.list).not.toHaveBeenCalled()
    },
  )
  it('DRIVER has no invitation UI in drivers', () => {
    mount('/drivers', 'DRIVER')
    expect(
      screen.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Invitar repartidor' }),
    ).toBeNull()
  })
})

describe('account activation', () => {
  async function fill(password = PASSWORD, confirmation = password) {
    const actor = userEvent.setup()
    await actor.type(screen.getByLabelText('Crear contraseña'), password)
    await actor.type(
      screen.getByLabelText('Confirmar contraseña'),
      confirmation,
    )
    await actor.click(screen.getByRole('button', { name: 'Activar cuenta' }))
    return actor
  }
  it('is public, hides the token and activates without logging in', async () => {
    vi.mocked(accounts.activate).mockResolvedValue({
      status: 'ACTIVE',
      email: 'ana@example.test',
      role: 'PROVIDER_ADMIN',
    })
    const auth = mount(`/activate-account?token=${TOKEN}`, null)
    expect(
      await screen.findByRole('heading', { name: 'Crea tu contraseña' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        /^\/activate-account$/,
      ),
    )
    expect(screen.getByText(/Entre 16 y 128 caracteres/)).toBeInTheDocument()
    noSecrets()
    await fill()
    await waitFor(() =>
      expect(accounts.activate).toHaveBeenCalledWith(TOKEN, PASSWORD),
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Cuenta activada correctamente.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ir a iniciar sesión' }),
    ).toHaveAttribute('href', '/login')
    expect(auth.login).not.toHaveBeenCalled()
    expect(document.body).not.toHaveTextContent(PASSWORD)
    const stored = JSON.stringify({ ...localStorage, ...sessionStorage })
    expect(stored).not.toContain(TOKEN)
    expect(stored).not.toContain(PASSWORD)
  })
  it('activates a DRIVER account too', async () => {
    vi.mocked(accounts.activate).mockResolvedValue({
      status: 'ACTIVE',
      email: 'beto@example.test',
      role: 'DRIVER',
    })
    mount(`/activate-account?token=${TOKEN}`, null)
    await fill()
    expect(await screen.findByText(/como repartidor/)).toBeInTheDocument()
  })
  it('enforces the real password policy and confirmation before calling the API', async () => {
    mount(`/activate-account?token=${TOKEN}`, null)
    const actor = await fill('corta', 'corta')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'entre 16 y 128 caracteres',
    )
    await actor.clear(screen.getByLabelText('Crear contraseña'))
    await actor.clear(screen.getByLabelText('Confirmar contraseña'))
    await fill(PASSWORD, `${PASSWORD}x`)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Las contraseñas no coinciden.',
      ),
    )
    expect(accounts.activate).not.toHaveBeenCalled()
  })
  it.each([
    ['INVITATION_TOKEN_INVALID', 400, 'La invitación no es válida.'],
    ['INVITATION_EXPIRED', 410, 'Esta invitación ha expirado.'],
    ['INVITATION_ALREADY_ACCEPTED', 409, 'Esta invitación ya fue utilizada.'],
    ['INVITATION_REVOKED', 410, 'Esta invitación ya no está disponible.'],
    ['ACCOUNT_NOT_ACTIVATABLE', 409, 'Esta cuenta no puede activarse.'],
    ['PROVIDER_DRIVER_LIMIT_REACHED', 409, 'No fue posible activar la cuenta.'],
  ])('shows a safe final state for %s', async (code, status, title) => {
    vi.mocked(accounts.activate).mockRejectedValue(
      normalizeError(status, { code, message: 'internal detail' }),
    )
    mount(`/activate-account?token=${TOKEN}`, null)
    await fill()
    expect(
      await screen.findByRole('heading', { name: title }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Crear contraseña')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('internal detail')
    if (code === 'INVITATION_EXPIRED')
      expect(
        screen.getByText('Solicita una nueva invitación a tu administrador.'),
      ).toBeInTheDocument()
  })
  it('treats a missing token as an invalid invitation', () => {
    mount('/activate-account', null)
    expect(
      screen.getByRole('heading', { name: 'La invitación no es válida.' }),
    ).toBeInTheDocument()
    expect(accounts.activate).not.toHaveBeenCalled()
  })
  it.each([
    [429, undefined, 'Demasiados intentos. Intenta nuevamente más tarde.'],
    [0, undefined, 'No se pudo conectar'],
    [500, undefined, 'no está disponible'],
    [400, 'VALIDATION_ERROR', 'Revisa tu contraseña'],
  ])('keeps the form for retryable error %i', async (status, code, text) => {
    vi.mocked(accounts.activate).mockRejectedValue(
      normalizeError(status, code ? { code } : null),
    )
    mount(`/activate-account?token=${TOKEN}`, null)
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.getByLabelText('Crear contraseña')).toBeInTheDocument()
  })
  it('login explains activation without revealing account state', () => {
    mount('/login', null)
    expect(
      screen.getByText(/Activa tu cuenta desde el enlace del correo/),
    ).toBeInTheDocument()
  })
  it.each(['/login', `/activate-account?token=${TOKEN}`])(
    '%s only guards unload after real edits',
    async (path) => {
      const listen = vi.spyOn(window, 'addEventListener')
      const guards = () =>
        listen.mock.calls.filter(([type]) => type === 'beforeunload').length
      mount(path, null)
      const submit = await screen.findByRole('button', {
        name: /Iniciar sesión|Activar cuenta/,
      })
      expect(submit).toBeEnabled()
      expect(guards()).toBe(0)
      expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
      await userEvent
        .setup()
        .type(
          screen.getByLabelText(/^Contraseña$|^Crear contraseña$/),
          'escribiendo',
        )
      expect(guards()).toBe(1)
    },
  )
})
