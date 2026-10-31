import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReceptionPage } from '../driver-portal/reception'
import { reception, type Reception } from '../driver-portal/reception-service'
import { driverPortal } from '../driver-portal/service'
import { receptionStore, replay } from '../driver-portal/reception-intent'
import { ApiError } from '../services/errors'
import type { DriverSelf } from '../driver-portal/types'

vi.mock('../auth/context', () => ({
  useAuth: () => ({ user: { id: 'actor', role: 'DRIVER' } }),
}))
vi.mock('../services/api', async (original) => ({
  ...(await original<typeof import('../services/api')>()),
  sessionFence: () => () => {},
}))
vi.mock('../driver-portal/service', () => ({ driverPortal: { me: vi.fn() } }))
vi.mock('../driver-portal/reception-service', async (original) => ({
  ...(await original<typeof import('../driver-portal/reception-service')>()),
  reception: { get: vi.fn(), availability: vi.fn() },
}))
vi.mock('../driver-portal/reception-intent', async (original) => ({
  ...(await original<typeof import('../driver-portal/reception-intent')>()),
  receptionStore: { read: vi.fn(), save: vi.fn(), clear: vi.fn() },
  locked: async (_scope: unknown, run: () => Promise<void>) => run(),
  replay: vi.fn(),
}))
const zone = '22222222-2222-4222-8222-222222222222'
const state: Reception = {
  schemaVersion: 1,
  revision: '9007199254740993',
  serverTime: '2026-10-31T12:00:00Z',
  allowedZones: [{ id: zone, name: 'Zona sintética' }],
  selectedZoneId: zone,
  shift: null,
  state: 'OFF',
  reason: 'RECEPTION_DISABLED',
  canAttemptTake: false,
  limits: { defaultMinutes: 60, minMinutes: 60, maxMinutes: 720 },
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(reception.get).mockResolvedValue(state)
  vi.mocked(driverPortal.me).mockResolvedValue({
    availability: 'OFFLINE',
  } as DriverSelf)
  vi.mocked(receptionStore.read).mockResolvedValue(null)
  vi.mocked(reception.availability).mockResolvedValue({})
  vi.mocked(replay).mockResolvedValue(state)
})
function mount() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <MemoryRouter initialEntries={['/driver/reception']}>
        <ReceptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
it('shows actual state without shift or offers, and prevents reselecting current zone', async () => {
  mount()
  expect(
    await screen.findByText(/OFF · Revisión 9007199254740993/),
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Seleccionar zona' }),
  ).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Iniciar turno' })).toBeNull()
  expect(
    screen.queryByRole('heading', { name: 'Ofertas del turno' }),
  ).toBeNull()
  expect(screen.queryByRole('link', { name: 'Servicios' })).toBeNull()
})
it('sends availability using its actual protocol and refreshes both projections', async () => {
  mount()
  const radio = await screen.findByRole('radio', { name: 'Disponible' })
  await waitFor(() => expect(radio).toBeEnabled())
  fireEvent.click(radio)
  await waitFor(() =>
    expect(reception.availability).toHaveBeenCalledExactlyOnceWith('AVAILABLE'),
  )
  await waitFor(() => expect(reception.get).toHaveBeenCalledTimes(2))
  expect(driverPortal.me).toHaveBeenCalledTimes(2)
  expect(receptionStore.save).not.toHaveBeenCalled()
})
it('preserves the exact revision and handles selection conflict without another mutation', async () => {
  vi.mocked(reception.get).mockResolvedValue({ ...state, selectedZoneId: null })
  vi.mocked(replay).mockRejectedValue(
    new ApiError(409, 'Conflicto', 'REVISION_CONFLICT'),
  )
  mount()
  const select = await screen.findByRole('combobox', {
    name: 'Zona autorizada',
  })
  await waitFor(() => expect(select).toBeEnabled())
  fireEvent.change(select, { target: { value: zone } })
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar zona' }))
  expect(
    await screen.findByText('El estado cambió; se actualizó la información'),
  ).toBeVisible()
  expect(receptionStore.save).toHaveBeenCalledWith(
    expect.objectContaining({
      body: expect.objectContaining({
        expectedRevision: state.revision,
        action: 'SELECT_ZONE',
        zoneId: zone,
      }),
    }),
  )
  expect(replay).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('button', { name: 'Reconocer resultado y revisar' }),
  ).toBeVisible()
})
it('does not enable availability without an authorized selected zone', async () => {
  vi.mocked(reception.get).mockResolvedValue({
    ...state,
    allowedZones: [],
    selectedZoneId: null,
  })
  mount()
  expect(
    await screen.findByRole('link', { name: 'Ver mi expediente' }),
  ).toBeVisible()
  expect(screen.getByRole('radio', { name: 'Disponible' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'Fuera de línea' })).toBeDisabled()
})
