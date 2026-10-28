import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeError } from '../services/errors'
import { parseEnv } from '../config/env'
const response = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status })
const tokens = {
  accessToken: 'access-one',
  refreshToken: 'refresh-one',
  expiresIn: 60,
  tokenType: 'Bearer',
}
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.test',
  role: 'SUPER_ADMIN',
  active: true,
  emailVerifiedAt: null,
  createdAt: '2026-10-17T00:00:00Z',
  updatedAt: '2026-10-17T00:00:00Z',
}
const session = { accessMode: 'STANDARD', identity: user }
beforeEach(() => {
  vi.resetModules()
  sessionStorage.clear()
})
describe('HTTP and human session', () => {
  it('restricted login keeps identity separate and a forbidden full projection does not expire it', async () => {
    const restricted = {
      accessMode: 'DELETION_RESTRICTED',
      identity: { id: user.id },
      capabilities: { deletionFollowUp: true, activeDeliveryResolution: false },
    }
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(tokens))
      .mockResolvedValueOnce(response(restricted))
      .mockResolvedValueOnce(
        response({ code: 'HTTP_403', message: 'ACCOUNT_CLOSING' }, 403),
      )
    const { authService, api, onSessionExpired } =
      await import('../services/api')
    const expired = vi.fn()
    onSessionExpired(expired)
    expect(await authService.login(user.email, 'synthetic')).toEqual(restricted)
    await expect(api('/auth/me')).rejects.toMatchObject({
      status: 403,
      code: 'HTTP_403',
    })
    expect(expired).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('mandaria.refresh')).toBe('refresh-one')
    expect(f).toHaveBeenCalledTimes(3)
  })
  it('token refresh reads current minimal authority once and preserves authTime semantics of backend', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    const restricted = {
      accessMode: 'DELETION_RESTRICTED',
      identity: { id: user.id },
      capabilities: { deletionFollowUp: true, activeDeliveryResolution: false },
    }
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(tokens))
      .mockResolvedValueOnce(response(restricted))
    const { authService, onSessionIdentity } = await import('../services/api')
    const changed = vi.fn()
    onSessionIdentity(changed)
    expect(await authService.restore()).toEqual(restricted)
    expect(changed).toHaveBeenCalledWith(restricted)
    expect(f).toHaveBeenCalledTimes(2)
    expect(f.mock.calls[1][0]).toContain('/auth/me?projection=session')
    expect(JSON.parse(String(f.mock.calls[0][1]?.body))).toEqual({
      refreshToken: 'old',
    })
  })
  it.each([200, 401, 409, 500])(
    'execution commands send the exact key/body once on HTTP %s',
    async (status) => {
      const fetcher = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(response({}, status))
      const { executionApi, executionPath } =
        await import('../execution/service')
      const body = {
        assignmentId: '11111111-1111-4111-8111-111111111111',
        expectedRevision: 7,
        phase: 'TO_DROPOFF',
      }
      const key = '22222222-2222-4222-8222-222222222222'
      const path = executionPath(
        {
          surface: 'provider',
          dispatchId: 'dispatch',
          providerId: 'provider-B',
        },
        'execution-events',
      )
      const result = executionApi.command(path, body, key)
      if (status === 200) await expect(result).resolves.toEqual({})
      else await expect(result).rejects.toMatchObject({ status })
      expect(fetcher).toHaveBeenCalledOnce()
      expect(fetcher.mock.calls[0][0]).toBe(
        'http://localhost:3000/api/v1/provider/dispatches/dispatch/execution-events?providerId=provider-B',
      )
      expect(fetcher.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Idempotency-Key': key },
      })
    },
  )
  it('uses the confirmed origin with exactly one prefix across all transports', async () => {
    vi.stubEnv('VITE_API_URL', 'https://mandaria.com.mx/')
    try {
      const fetcher = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (url) => {
          if (
            String(url).endsWith('/auth/login') ||
            String(url).endsWith('/auth/refresh')
          )
            return response(tokens)
          return response(session)
        })
      const { authService, api, apiOnce, publicApi } =
        await import('../services/api')
      await authService.login('synthetic@example.test', 'synthetic-password')
      await authService.restore()
      await api('/admin/integrations')
      await apiOnce('/admin/integrations/synthetic/webhook/secret', 'POST')
      await publicApi('/invitations/activate', 'POST', {})
      await authService.logout()
      const urls = fetcher.mock.calls.map(([url]) => String(url))
      expect(urls.some((url) => url.endsWith('/auth/refresh'))).toBe(true)
      for (const url of urls) {
        expect(url.startsWith('https://mandaria.com.mx/api/v1/')).toBe(true)
        expect(url.match(/\/api\/v1/g)).toHaveLength(1)
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it.each(['/api/v1', '/api/v1/', '/other'])(
    'rejects a path in VITE_API_URL: %s',
    (path) => {
      expect(() =>
        parseEnv({ VITE_API_URL: `https://mandaria.com.mx${path}` }),
      ).toThrow(/sin \/api\/v1/)
    },
  )
  it('preserves the PROVIDER_ADMIN identity returned by auth/me after human login', async () => {
    const providerUser = { ...user, role: 'PROVIDER_ADMIN' }
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(tokens))
      .mockResolvedValueOnce(
        response({ accessMode: 'STANDARD', identity: providerUser }),
      )
    const { authService } = await import('../services/api')
    expect(
      await authService.login('admin@example.test', 'test-password'),
    ).toEqual({ accessMode: 'STANDARD', identity: providerUser })
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      'http://localhost:3000/api/v1/auth/login',
      'http://localhost:3000/api/v1/auth/me?projection=session',
    ])
    expect(sessionStorage.getItem('role')).toBeNull()
  })
  it('ignores a late retry failure after logout instead of expiring a later session', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    let resolveRetry: ((response: Response) => void) | undefined
    let requests = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/refresh')) return response(tokens)
      if (String(url).endsWith('/auth/logout')) return response(null, 204)
      if (String(url).endsWith('/auth/me?projection=session'))
        return response(session)
      requests++
      if (requests === 1) return response({}, 401)
      return new Promise<Response>((resolve) => {
        resolveRetry = resolve
      })
    })
    const { api, authService, onSessionExpired } =
      await import('../services/api')
    const expired = vi.fn()
    onSessionExpired(expired)
    const pending = api('/slow')
    await vi.waitFor(() => expect(resolveRetry).toBeDefined())
    await authService.logout()
    resolveRetry?.(response({}, 401))
    await expect(pending).rejects.toMatchObject({ status: 401 })
    expect(expired).not.toHaveBeenCalled()
  })
  it('logs in with a User, keeps access only in memory and logs out', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(tokens))
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response(null, 204))
    const { authService } = await import('../services/api')
    expect(await authService.login(' ADMIN@example.test ', 'password')).toEqual(
      session,
    )
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      email: 'admin@example.test',
      password: 'password',
    })
    expect(sessionStorage.getItem('mandaria.refresh')).toBe('refresh-one')
    expect(JSON.stringify(sessionStorage)).not.toContain('access-one')
    expect(localStorage.length).toBe(0)
    await authService.logout()
    expect(sessionStorage.length).toBe(0)
    expect(fetcher.mock.calls[2][0]).toContain('/auth/logout')
  })
  it('rejects incorrect login without persisting a session', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({ message: 'Invalid credentials' }, 401),
    )
    const { authService } = await import('../services/api')
    await expect(authService.login('a@test.test', 'wrong')).rejects.toThrow(
      'incorrectos',
    )
    expect(sessionStorage.length).toBe(0)
  })
  it('restores a tab session by rotating refresh then consulting me', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(tokens))
      .mockResolvedValueOnce(response(session))
    const { authService } = await import('../services/api')
    expect(await authService.restore()).toEqual(session)
    expect(fetcher.mock.calls[0][0]).toContain('/auth/refresh')
    expect(sessionStorage.getItem('mandaria.refresh')).toBe('refresh-one')
  })
  it('coalesces concurrent 401s into one refresh and retries once', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    let refreshCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).endsWith('/auth/me?projection=session'))
        return response(session)
      if (String(url).endsWith('/auth/refresh')) {
        refreshCount++
        await new Promise((resolve) => setTimeout(resolve, 10))
        return response(tokens)
      }
      return (init?.headers as Record<string, string>).Authorization ===
        'Bearer access-one'
        ? response({ ok: true })
        : response({}, 401)
    })
    const { api } = await import('../services/api')
    await expect(
      Promise.all([api('/users'), api('/admin/providers')]),
    ).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(refreshCount).toBe(1)
  })
  it('expires session when refresh is rejected', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({}, 401))
    const { api, onSessionExpired } = await import('../services/api')
    const expired = vi.fn()
    onSessionExpired(expired)
    await expect(api('/users')).rejects.toThrow()
    expect(expired).toHaveBeenCalledOnce()
    expect(sessionStorage.length).toBe(0)
  })
  it('preserves refresh on a temporary network failure', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )
    const { authService } = await import('../services/api')
    await expect(authService.restore()).rejects.toMatchObject({ status: 0 })
    expect(sessionStorage.getItem('mandaria.refresh')).toBe('old')
  })
  it('does not refresh or retry forbidden operations', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({}, 403))
    const { api } = await import('../services/api')
    await expect(api('/admin/providers')).rejects.toMatchObject({ status: 403 })
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('expires after one failed retry without looping', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response(tokens))
      .mockResolvedValueOnce(response({}, 401))
    const { api, onSessionExpired } = await import('../services/api')
    const expired = vi.fn()
    onSessionExpired(expired)
    await expect(api('/users')).rejects.toMatchObject({ status: 401 })
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(expired).toHaveBeenCalledOnce()
    expect(sessionStorage.length).toBe(0)
  })
  it('clears local state even when remote logout fails', async () => {
    sessionStorage.setItem('mandaria.refresh', 'old')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError())
    const { authService } = await import('../services/api')
    await expect(authService.logout()).rejects.toThrow()
    expect(sessionStorage.length).toBe(0)
  })
  it('does not expose raw backend errors', () => {
    expect(
      normalizeError(500, {
        message: 'SELECT passwordHash FROM users secret=abc',
      }).message,
    ).not.toMatch(/SELECT|password|abc/)
    expect(
      normalizeError(400, { errors: ['private-value'] }).message,
    ).not.toContain('private-value')
  })
  it('validates mandatory environment and rejects credential URLs', () => {
    expect(() => parseEnv({})).toThrow()
    expect(() =>
      parseEnv({ VITE_API_URL: 'https://user:secret@example.test' }),
    ).toThrow()
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000/' }).apiUrl).toBe(
      'http://localhost:3000',
    )
  })
})

it('partial HTTP 200 JSON rejects instead of reporting an applied command', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response('{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  const { apiOnce } = await import('../services/api')
  await expect(
    apiOnce('/customer/delivery-prequotes', 'POST', {}, undefined, {
      'Idempotency-Key': 'synthetic-original',
    }),
  ).rejects.toMatchObject({ status: 0 })
  expect(fetcher).toHaveBeenCalledOnce()
})
