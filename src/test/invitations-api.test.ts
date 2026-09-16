import { beforeEach, expect, it, vi } from 'vitest'
import { accounts, invitations } from '../invitations/service'
import { authService } from '../services/api'
import { normalizeError } from '../services/errors'

const provider = '11111111-1111-4111-8111-111111111111'
const ok = (body: unknown = {}) =>
  new Response(JSON.stringify(body), { status: 200 })
beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})
const calls = (fetcher: { mock: { calls: unknown[][] } }) =>
  fetcher.mock.calls.map(([url, init]) => {
    const u = new URL(String(url))
    const request = init as RequestInit
    return {
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      method: request.method,
      body: request.body ? JSON.parse(String(request.body)) : undefined,
      headers: request.headers as Record<string, string>,
    }
  })

it('uses the real SUPER_ADMIN invitation endpoints and fixed roles', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => ok())
  const scope = { kind: 'admin' as const }
  await invitations.list(scope, {
    page: 2,
    pageSize: 20,
    status: 'EXPIRED',
    role: 'DRIVER',
    search: 'ana',
  })
  await invitations.inviteProviderAdmin(provider, {
    email: 'ana@example.test',
    membershipRole: 'OWNER',
  })
  await invitations.inviteDriver(
    { kind: 'admin', providerId: provider, role: 'DRIVER' },
    { email: 'beto@example.test', driverName: 'Beto' },
  )
  await invitations.resend(scope, 'inv-1')
  await invitations.revoke(scope, 'inv-1')
  await invitations.list({ kind: 'admin', providerId: provider }, {})
  const [list, admin, driver, resend, revoke, scoped] = calls(fetcher)
  expect(list).toMatchObject({
    path: '/api/v1/admin/user-invitations',
    query: {
      page: '2',
      pageSize: '20',
      status: 'EXPIRED',
      role: 'DRIVER',
      search: 'ana',
    },
  })
  expect(admin).toMatchObject({
    path: `/api/v1/admin/providers/${provider}/invitations`,
    method: 'POST',
    body: {
      email: 'ana@example.test',
      role: 'PROVIDER_ADMIN',
      membershipRole: 'OWNER',
    },
  })
  expect(driver.body).toEqual({
    email: 'beto@example.test',
    role: 'DRIVER',
    driverName: 'Beto',
  })
  expect(resend).toMatchObject({
    path: '/api/v1/admin/user-invitations/inv-1/resend',
    method: 'POST',
    body: undefined,
  })
  expect(revoke).toMatchObject({
    path: '/api/v1/admin/user-invitations/inv-1/revoke',
    method: 'POST',
  })
  expect(scoped.query).toEqual({ providerId: provider })
})

it('PROVIDER_ADMIN calls never carry role or providerId in the body', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => ok())
  const scope = { kind: 'provider' as const, providerId: provider }
  await invitations.list(scope, {
    page: 1,
    status: 'PENDING',
    role: 'PROVIDER_ADMIN',
  })
  await invitations.inviteDriver(scope, {
    email: 'beto@example.test',
    driverName: 'Beto',
  })
  await invitations.resend(scope, 'inv-2')
  await invitations.revoke(scope, 'inv-2')
  const [list, invite, resend, revoke] = calls(fetcher)
  expect(list).toMatchObject({
    path: '/api/v1/provider/driver-invitations',
    query: { page: '1', status: 'PENDING', providerId: provider },
  })
  expect(list.query.role).toBeUndefined()
  expect(invite).toMatchObject({
    path: '/api/v1/provider/driver-invitations',
    query: { providerId: provider },
    body: { email: 'beto@example.test', driverName: 'Beto' },
  })
  expect(resend).toMatchObject({
    path: '/api/v1/provider/driver-invitations/inv-2/resend',
    query: { providerId: provider },
  })
  expect(revoke).toMatchObject({
    path: '/api/v1/provider/driver-invitations/inv-2/revoke',
    query: { providerId: provider },
  })
})

it('activates publicly without session headers even while logged in', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'access',
          refreshToken: 'refresh',
          tokenType: 'Bearer',
          expiresIn: 900,
        }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      ok({ id: 'u', email: 'admin@example.test', role: 'SUPER_ADMIN' }),
    )
    .mockResolvedValueOnce(
      ok({
        status: 'ACTIVE',
        email: 'ana@example.test',
        role: 'PROVIDER_ADMIN',
      }),
    )
  await authService.login('admin@example.test', 'secret')
  await expect(
    accounts.activate('the-token', 'una frase larga y segura'),
  ).resolves.toMatchObject({ status: 'ACTIVE' })
  const activation = calls(fetcher)[2]
  expect(activation).toMatchObject({
    path: '/api/v1/auth/activate-account',
    method: 'POST',
    body: { token: 'the-token', password: 'una frase larga y segura' },
  })
  expect(activation.headers.Authorization).toBeUndefined()
})

it('does not refresh sessions on activation errors and translates codes', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        code: 'INVITATION_EXPIRED',
        message: 'Invitation has expired',
      }),
      { status: 410 },
    ),
  )
  await expect(accounts.activate('t', 'x'.repeat(16))).rejects.toMatchObject({
    status: 410,
    code: 'INVITATION_EXPIRED',
    message:
      'Esta invitación ha expirado. Solicita una nueva invitación a tu administrador.',
  })
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('lists accounts with the server-side status filter', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => ok([]))
  await accounts.list('INVITED')
  await accounts.list(undefined)
  const [filtered, all] = calls(fetcher)
  expect(filtered).toMatchObject({
    path: '/api/v1/users',
    query: { status: 'INVITED' },
  })
  expect(all.query).toEqual({})
})

it.each([
  [409, 'USER_INVITATION_PENDING', 'Ya existe una invitación pendiente'],
  [409, 'USER_ALREADY_ACTIVE', 'Ya existe una cuenta activa'],
  [429, 'INVITATION_RESEND_COOLDOWN', 'Espera un momento'],
  [429, undefined, 'Demasiados intentos. Intenta nuevamente más tarde.'],
  [403, undefined, 'No tienes permisos'],
  [404, undefined, 'La invitación ya no está disponible.'],
])('keeps invitation errors safe: %i %s', (status, code, text) => {
  const error = normalizeError(status, {
    code,
    message: code ? 'raw' : status === 404 ? 'Invitation not found' : 'raw',
  })
  expect(error.message).toContain(text)
  expect(error.message).not.toContain('raw')
})
