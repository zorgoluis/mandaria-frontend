import { beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { IndependentOfferZones } from '../independent-zones/panel'
import { offerZones } from '../independent-zones/service'
import {
  locked,
  makeIntent,
  replay,
  zoneStore,
} from '../independent-zones/intent'
import { serviceZones } from '../pricing/service'
import { ApiError } from '../services/errors'
import type { Role } from '../types/api'
vi.mock('../independent-zones/service', async (orig) => ({
  ...(await orig<typeof import('../independent-zones/service')>()),
  offerZones: { get: vi.fn(), put: vi.fn() },
}))
vi.mock('../independent-zones/intent', async (orig) => ({
  ...(await orig<typeof import('../independent-zones/intent')>()),
  zoneStore: { read: vi.fn(), save: vi.fn(), clear: vi.fn() },
  replay: vi.fn(),
  locked: vi.fn(),
}))
vi.mock('../pricing/service', () => ({ serviceZones: { list: vi.fn() } }))
const profile = '11111111-1111-4111-8111-111111111111',
  zone = '22222222-2222-4222-8222-222222222222',
  zone2 = '33333333-3333-4333-8333-333333333333'
let client: QueryClient
function app(actor = 'admin', role: Role = 'SUPER_ADMIN') {
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{ user: { id: actor, role }, loading: false } as AuthState}
      >
        <MemoryRouter>
          <FeedbackProvider>
            <IndependentOfferZones profileId={profile} canEdit />
          </FeedbackProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
const confirm = async () =>
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
async function edit(empty = false) {
  const editButton = await screen.findByRole('button', {
    name: 'Editar autorizaciones de zonas',
  })
  await waitFor(() => expect(editButton).toBeEnabled())
  fireEvent.click(editButton)
  await screen.findByLabelText(/Zona norte/)
  if (empty)
    fireEvent.click(
      screen.getByRole('button', { name: 'Retirar todas las autorizaciones' }),
    )
  else fireEvent.click(screen.getByLabelText(/Zona norte/))
  fireEvent.change(screen.getByLabelText('Motivo de autorización de zonas'), {
    target: { value: 'Autorización sintética' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Revisar cambio de zonas' }),
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(zoneStore.read).mockResolvedValue(null)
  vi.mocked(zoneStore.save).mockResolvedValue()
  vi.mocked(zoneStore.clear).mockResolvedValue()
  vi.mocked(locked).mockImplementation(async (_s, fn) => fn())
  vi.mocked(offerZones.get).mockResolvedValue({
    revision: '9007199254740993',
    zoneIds: [],
  })
  vi.mocked(serviceZones.list).mockResolvedValue({
    items: [
      {
        id: zone,
        name: 'Zona norte',
        code: 'N',
        status: 'ACTIVE',
        currency: 'MXN',
        minLatitude: 0,
        maxLatitude: 1,
        minLongitude: 0,
        maxLongitude: 1,
        createdAt: '',
        updatedAt: '',
      },
    ],
    page: 1,
    pageSize: 25,
    total: 1,
    totalPages: 1,
  })
  vi.mocked(replay).mockImplementation(async (i) => ({
    requestId: i.body.requestId,
    revision: '9007199254740994',
    zoneIds: i.body.zoneIds,
  }))
})
it.each(['DRIVER', 'PROVIDER_ADMIN', 'CUSTOMER'] as Role[])(
  '%s cannot read or edit zones',
  (role) => {
    render(app('actor', role))
    expect(offerZones.get).not.toHaveBeenCalled()
    expect(
      screen.queryByText('Zonas propias autorizadas'),
    ).not.toBeInTheDocument()
  },
)
it('confirms and durably saves once before double-click PUT', async () => {
  render(app())
  await edit()
  const b = within(await screen.findByRole('dialog')).getByRole('button', {
    name: 'Confirmar',
  })
  fireEvent.click(b)
  fireEvent.click(b)
  await screen.findByText(/PUT confirmado/)
  expect(zoneStore.save).toHaveBeenCalledTimes(1)
  expect(replay).toHaveBeenCalledTimes(1)
  const i = vi.mocked(replay).mock.calls[0][0]
  expect(i.scope.profileId).toBe(profile)
  expect(i.body.expectedRevision).toBe('9007199254740993')
  expect(vi.mocked(zoneStore.save).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(replay).mock.invocationCallOrder[0],
  )
})
it('empty list requires explicit remove-all confirmation', async () => {
  vi.mocked(offerZones.get).mockResolvedValue({
    revision: '2',
    zoneIds: [zone],
  })
  render(app())
  await edit(true)
  expect(await screen.findByRole('dialog')).toHaveTextContent(
    'Retirar todas las autorizaciones',
  )
  await confirm()
  await waitFor(() => expect(replay).toHaveBeenCalled())
  expect(vi.mocked(replay).mock.calls[0][0].body.zoneIds).toEqual([])
})
it('paginates active catalog without discarding the first selection', async () => {
  const first = await serviceZones.list({})
  vi.mocked(serviceZones.list)
    .mockResolvedValueOnce({ ...first, total: 26, totalPages: 2 })
    .mockResolvedValueOnce({
      ...first,
      items: [{ ...first.items[0], id: zone2, name: 'Zona sur', code: 'S' }],
      page: 2,
      total: 26,
      totalPages: 2,
    })
  render(app())
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Editar autorizaciones de zonas',
    }),
  )
  fireEvent.click(await screen.findByLabelText(/Zona norte/))
  fireEvent.click(
    screen.getByRole('button', { name: 'Cargar más zonas activas' }),
  )
  fireEvent.click(await screen.findByLabelText(/Zona sur/))
  expect(screen.getByLabelText(/Zona norte/)).toBeChecked()
  expect(serviceZones.list).toHaveBeenLastCalledWith(
    { page: 2, pageSize: 25, status: 'ACTIVE' },
    expect.any(AbortSignal),
  )
})
it('storage failure prevents PUT', async () => {
  vi.mocked(zoneStore.save).mockRejectedValue(Error('storage unavailable'))
  render(app())
  await edit()
  await confirm()
  await screen.findByText('storage unavailable')
  expect(replay).not.toHaveBeenCalled()
})
it('a matching GET after timeout does not resolve ownership; replay keeps same identity', async () => {
  const i = makeIntent(
    { actor: 'admin', profileId: profile },
    {
      requestId: crypto.randomUUID(),
      expectedRevision: '1',
      zoneIds: [zone],
      reason: 'Cambio previo',
    },
  )
  vi.mocked(zoneStore.read).mockResolvedValue(i)
  vi.mocked(offerZones.get).mockResolvedValue({
    revision: '2',
    zoneIds: [zone],
  })
  render(app())
  fireEvent.click(
    await screen.findByRole('button', { name: 'Consultar zonas vigentes' }),
  )
  await waitFor(() => expect(offerZones.get).toHaveBeenCalledTimes(2))
  expect(zoneStore.clear).not.toHaveBeenCalled()
  expect(replay).not.toHaveBeenCalled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Reenviar misma intención de zonas' }),
  )
  await confirm()
  await waitFor(() =>
    expect(replay).toHaveBeenCalledWith(i, {
      actor: 'admin',
      profileId: profile,
    }),
  )
})
it('another admin revision wins and requires explicit conflict review', async () => {
  vi.mocked(replay).mockRejectedValue(
    new ApiError(409, '', 'REVISION_CONFLICT'),
  )
  vi.mocked(offerZones.get)
    .mockResolvedValueOnce({ revision: '1', zoneIds: [] })
    .mockResolvedValue({ revision: '2', zoneIds: [zone2] })
  render(app())
  await edit()
  await confirm()
  await screen.findByRole('button', {
    name: 'Reconocer conflicto y revisar estado',
  })
  expect(zoneStore.clear).not.toHaveBeenCalled()
  expect(replay).toHaveBeenCalledTimes(1)
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Reconocer conflicto y revisar estado',
    }),
  )
  await waitFor(() => expect(zoneStore.clear).toHaveBeenCalled())
  expect(
    screen.queryByLabelText('Motivo de autorización de zonas'),
  ).not.toBeInTheDocument()
})
it.each([
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [503, 'FEATURE_DISABLED'],
] as const)('%s %s grants no cached authority', async (status, code) => {
  vi.mocked(offerZones.get).mockRejectedValue(new ApiError(status, '', code))
  render(app())
  await screen.findByRole('alert')
  expect(
    screen.getByRole('button', { name: 'Editar autorizaciones de zonas' }),
  ).toBeDisabled()
})
it('late response from old account cannot appear in the new actor scope', async () => {
  let done!: (v: { revision: string; zoneIds: string[] }) => void
  vi.mocked(offerZones.get)
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          done = r
        }),
    )
    .mockResolvedValue({ revision: '7', zoneIds: [] })
  const v = render(app('old'))
  v.rerender(app('new'))
  await screen.findByText(/Revisión vigente: 7/)
  await act(async () => done({ revision: '999', zoneIds: [zone] }))
  expect(screen.queryByText(/Revisión vigente: 999/)).not.toBeInTheDocument()
  expect(vi.mocked(zoneStore.read).mock.calls.at(-1)?.[0].actor).toBe('new')
})
it.each([
  [401, 'UNAUTHORIZED'],
  [409, 'ZONE_NOT_ALLOWED'],
  [409, 'IDEMPOTENCY_KEY_REUSED'],
  [503, 'FEATURE_DISABLED'],
  [0, 'NETWORK_ERROR'],
] as const)(
  'preserves the original durable intention after PUT %s %s',
  async (status, code) => {
    vi.mocked(replay).mockRejectedValue(new ApiError(status, '', code))
    render(app())
    await edit()
    await confirm()
    await screen.findByRole('alert')
    await waitFor(() => expect(offerZones.get).toHaveBeenCalledTimes(2))
    expect(zoneStore.save).toHaveBeenCalledTimes(1)
    expect(replay).toHaveBeenCalledTimes(1)
    expect(zoneStore.clear).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Editar autorizaciones de zonas' }),
    ).not.toBeInTheDocument()
  },
)
