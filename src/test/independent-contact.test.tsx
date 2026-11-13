import { declaredContact } from '../independent-drivers/contact-contract'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '../auth/context'
import { DeclaredPhone } from '../independent-drivers/contact'
import { independentDrivers } from '../independent-drivers/service'
const phone = '0000000000'
const available = {
  availability: 'AVAILABLE',
  phone,
  source: 'DRIVER_IDENTITY_DECLARATION',
}
const auth: AuthState = {
  user: {
    id: 'admin',
    email: 'admin@example.test',
    role: 'SUPER_ADMIN',
    active: true,
    emailVerifiedAt: null,
    createdAt: '',
    updatedAt: '',
  },
  loading: false,
  expired: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  restore: vi.fn(),
}
const view = (driverId = 'driver-A', state = auth) => (
  <AuthContext.Provider value={state}>
    <DeclaredPhone driverId={driverId} />
  </AuthContext.Provider>
)
const response = (declaredContact: unknown) =>
  new Response(JSON.stringify({ declaredContact }), { status: 200 })
function deferred() {
  let resolve!: (r: Response) => void
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
describe('private declared contact', () => {
  it.each([
    undefined,
    null,
    {},
    { ...available, phone: '' },
    { ...available, phone: '  ' },
    { ...available, phone: 123 },
    { ...available, phone: null },
    { ...available, source: 'OTHER' },
    { ...available, availability: 'OTHER' },
    { ...available, availability: 'UNAVAILABLE' },
    { ...available, availability: 'NOT_RECORDED' },
  ])('fails closed for invalid projections %#', (value) => {
    expect(declaredContact(value)).toBeUndefined()
  })
  it.each(['NOT_RECORDED', 'UNAVAILABLE'])(
    'shows %s without a phone',
    async (availability) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        response({ ...available, availability, phone: null }),
      )
      render(view())
      expect(
        await screen.findByText(
          availability === 'NOT_RECORDED' ? 'No registrado' : 'No disponible',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(phone)).not.toBeInTheDocument()
    },
  )
  it('uses Driver.id, no-store and no alternate sources or persistence', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response(available))
    render(view())
    await screen.findByText(phone)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0][0])).toContain(
      '/admin/drivers/driver-A/independent',
    )
    expect(fetcher.mock.calls[0][1]?.cache).toBe('no-store')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
  it.each(['NOT_RECORDED', 'UNAVAILABLE', 'invalid', 401, 403, 404, 503])(
    'removes previous value on %s',
    async (next) => {
      const fetcher = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(response(available))
      render(view())
      await screen.findByText(phone)
      fetcher.mockResolvedValue(
        typeof next === 'number'
          ? new Response('{}', { status: next })
          : response({ ...available, availability: next, phone: null }),
      )
      act(() => window.dispatchEvent(new Event('focus')))
      await waitFor(() =>
        expect(screen.queryByText(phone)).not.toBeInTheDocument(),
      )
      await screen.findByText(
        typeof next === 'number'
          ? 'No se pudo consultar el teléfono'
          : next === 'NOT_RECORDED'
            ? 'No registrado'
            : 'No disponible',
      )
    },
  )
  it('ignores late A after B and discards data on exit/reentry', async () => {
    const a = deferred(),
      b = deferred(),
      reentry = deferred()
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise)
      .mockReturnValueOnce(reentry.promise)
    const ui = render(view())
    ui.rerender(view('driver-B'))
    await act(async () => {
      b.resolve(
        response({ ...available, availability: 'UNAVAILABLE', phone: null }),
      )
    })
    await act(async () => {
      a.resolve(response(available))
    })
    expect(screen.queryByText(phone)).not.toBeInTheDocument()
    ui.unmount()
    render(view())
    expect(screen.getByText('Consultando…')).toBeInTheDocument()
    expect(screen.queryByText(phone)).not.toBeInTheDocument()
  })
  it.each(['logout', 'account', 'role', 'expired'])(
    'ignores pending responses after %s',
    async (change) => {
      const pending = deferred()
      vi.spyOn(globalThis, 'fetch')
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValue(response(undefined))
      const ui = render(view())
      const next: AuthState = {
        ...auth,
        user:
          change === 'logout'
            ? null
            : {
                ...auth.user!,
                id: change === 'account' ? 'another-admin' : 'admin',
                role: change === 'role' ? 'DRIVER' : 'SUPER_ADMIN',
              },
        expired: change === 'expired',
      }
      ui.rerender(view('driver-A', next))
      await act(async () => {
        pending.resolve(response(available))
      })
      expect(screen.queryByText(phone)).not.toBeInTheDocument()
    },
  )
  it.each(['DRIVER', 'PROVIDER_ADMIN', 'CUSTOMER'] as const)(
    'never fetches for %s',
    async (role) => {
      const fetcher = vi.spyOn(globalThis, 'fetch')
      render(view('driver-A', { ...auth, user: { ...auth.user!, role } }))
      expect(fetcher).not.toHaveBeenCalled()
    },
  )
  it('strips private projection before returning a shared profile', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'profile',
          driverId: 'driver',
          declaredContact: available,
        }),
      ),
    )
    const result = await independentDrivers.get('driver')
    expect(result).toEqual({ id: 'profile', driverId: 'driver' })
  })
  it('ignores an older response after a newer unavailable response', async () => {
    const old = deferred()
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue(response(undefined))
    render(view())
    act(() => window.dispatchEvent(new Event('focus')))
    await screen.findByText('No disponible')
    await act(async () => old.resolve(response(available)))
    expect(screen.queryByText(phone)).not.toBeInTheDocument()
  })
})
