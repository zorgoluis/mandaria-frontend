import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthState } from '../auth/context'
import { AdminReferenceForm } from '../assistance/admin-reference-form'
import { Context } from '../assistance/command-context'
import { api } from '../services/api'
import { referenceCatalog } from './admin-references-fixture'
import { assistanceDetail } from './assistance-fixture'
import type { Role } from '../types/api'
vi.mock('../services/api', () => ({ api: vi.fn() }))
const admin = { actor: 'admin', surface: 'admin' as const }
const identity = (role: Role = 'SUPER_ADMIN', id = 'admin'): AuthState => ({
  user: {
    id,
    role,
    active: true,
    email: 'synthetic@example.test',
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
})
beforeEach(() => vi.resetAllMocks())
function setup(auth = identity()) {
  const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    detail = assistanceDetail(true)
  const tree = (value: AuthState) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={value}>
        <Context.Provider
          value={{ blocked: false, deny: vi.fn(), prepare: vi.fn() }}
        >
          <AdminReferenceForm
            scope={admin}
            detail={detail}
            operation="RECORD_OBLIGATION"
            extraOptions={{}}
          />
        </Context.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
  const rendered = render(tree(auth))
  return { ...rendered, client, tree }
}
it.each(['PROVIDER_ADMIN', 'DRIVER'] as const)(
  'does not request private catalogs for %s',
  (role) => {
    setup(identity(role))
    expect(screen.getByRole('alert')).toHaveTextContent('no autorizado')
    expect(api).not.toHaveBeenCalled()
  },
)
it('loads all sections before publishing selectors, then removes cache on exit', async () => {
  const catalog = referenceCatalog()
  vi.mocked(api).mockImplementation(
    async (path) =>
      catalog[
        path.split('/').at(-1)!.split('?')[0] as keyof typeof catalog
      ] as never,
  )
  const view = setup()
  await screen.findByLabelText('Participación histórica')
  expect(api).toHaveBeenCalledTimes(7)
  view.unmount()
  await waitFor(() =>
    expect(view.client.getQueryCache().getAll()).toHaveLength(0),
  )
})
it('discards late private responses after account or role changes', async () => {
  const catalog = referenceCatalog(),
    resolves: (() => void)[] = []
  vi.mocked(api).mockImplementation(
    (path) =>
      new Promise((resolve) =>
        resolves.push(() =>
          resolve(
            catalog[
              path.split('/').at(-1)!.split('?')[0] as keyof typeof catalog
            ] as never,
          ),
        ),
      ),
  )
  const view = setup()
  expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  view.rerender(view.tree(identity('PROVIDER_ADMIN', 'other')))
  await act(async () => resolves.forEach((resolve) => resolve()))
  expect(
    screen.queryByLabelText('Participación histórica'),
  ).not.toBeInTheDocument()
  expect(
    view.client
      .getQueryCache()
      .getAll()
      .every((q) => q.state.data === undefined),
  ).toBe(true)
})
it('malformed data fails closed and reload starts a new read', async () => {
  vi.mocked(api).mockResolvedValue({ schemaVersion: 2 } as never)
  setup()
  await screen.findByRole('alert')
  expect(
    screen.queryByRole('button', { name: 'Revisar intención' }),
  ).not.toBeInTheDocument()
  const catalog = referenceCatalog()
  vi.mocked(api).mockImplementation(
    async (path) =>
      catalog[
        path.split('/').at(-1)!.split('?')[0] as keyof typeof catalog
      ] as never,
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Recargar referencias y revisar' }),
  )
  await screen.findByLabelText('Participación histórica')
})
