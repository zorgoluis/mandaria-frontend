import { beforeEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AuthContext } from '../auth/context'
import { HistoricalAdvanceRecovery } from '../execution/historical-recovery'
import {
  historicalStorageKey,
  persistHistoricalMarker,
  readHistoricalMarkers,
} from '../execution/historical-store'
import {
  reconcileHistoricalAdvance,
  resetCommands,
  preserveHistoricalCommand,
} from '../execution/commands'
import { executionApi } from '../execution/service'
import type { Role } from '../types/api'
vi.mock('../execution/service', () => ({
  executionApi: { providerAttempt: vi.fn(), command: vi.fn() },
}))
const marker = {
  actor: 'owner',
  dispatchId: 'dispatch',
  providerId: 'provider-A',
  key: '10000000-0000-4000-8000-000000000001',
}
function mount(role: Role = 'PROVIDER_ADMIN', id = 'owner') {
  return render(
    <AuthContext.Provider
      value={{
        user: {
          id,
          role,
          email: 'synthetic@example.test',
          active: true,
          createdAt: '',
          updatedAt: '',
          emailVerifiedAt: null,
        },
        loading: false,
        expired: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        restore: vi.fn(),
      }}
    >
      <HistoricalAdvanceRecovery />
    </AuthContext.Provider>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  resetCommands()
  localStorage.clear()
  persistHistoricalMarker(marker)
})
it.each(['APPLIED', 'PENDING_OR_UNKNOWN', 'CLOSED_NO_EFFECTS'] as const)(
  'historical %s uses own key/provider and never sends advance',
  async (state) => {
    vi.mocked(executionApi.providerAttempt).mockResolvedValue({
      state,
      appliedRevision: state === 'APPLIED' ? 4 : null,
      canStartNewAttempt: false,
    })
    mount()
    fireEvent.click(
      screen.getByRole('button', { name: 'Consultar avance histórico' }),
    )
    await waitFor(() =>
      expect(executionApi.providerAttempt).toHaveBeenCalledWith(
        'dispatch',
        'provider-A',
        marker.key,
        false,
      ),
    )
    await waitFor(() =>
      expect(readHistoricalMarkers().markers).toHaveLength(
        state === 'PENDING_OR_UNKNOWN' ? 1 : 0,
      ),
    )
    expect(executionApi.command).not.toHaveBeenCalled()
  },
)
it('confirmation required; double click and lost response retain durable marker after reload', async () => {
  vi.mocked(executionApi.providerAttempt).mockRejectedValue(
    new Error('timeout'),
  )
  let view = mount()
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Cerrar intento histórico',
    }),
  )
  expect(screen.getByRole('dialog')).toHaveTextContent('No cancela ni revierte')
  expect(executionApi.providerAttempt).not.toHaveBeenCalled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar cierre histórico' }),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar cierre histórico' }),
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(executionApi.providerAttempt).toHaveBeenCalledTimes(1)
  expect(executionApi.providerAttempt).toHaveBeenCalledWith(
    'dispatch',
    'provider-A',
    marker.key,
    true,
  )
  expect(readHistoricalMarkers().markers).toEqual([marker])
  view.unmount()
  resetCommands()
  view = mount()
  expect(
    screen.getByRole('button', { name: 'Consultar avance histórico' }),
  ).toBeInTheDocument()
  vi.mocked(executionApi.providerAttempt).mockResolvedValue({
    state: 'CLOSED_NO_EFFECTS',
    appliedRevision: null,
    canStartNewAttempt: false,
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar avance histórico' }),
  )
  await waitFor(() => expect(readHistoricalMarkers().markers).toHaveLength(0))
  expect(executionApi.command).not.toHaveBeenCalled()
  view.unmount()
})
it.each(['SUPER_ADMIN', 'DRIVER'] as const)(
  'role %s cannot consult/close provider receipt',
  async (role) => {
    mount(role)
    expect(screen.queryByRole('button')).toBeNull()
    await reconcileHistoricalAdvance(
      marker.key,
      'owner',
      role,
      () => true,
      true,
    )
    expect(executionApi.providerAttempt).not.toHaveBeenCalled()
    expect(readHistoricalMarkers().markers).toHaveLength(1)
  },
)
it('another admin cannot consult or clear the original actor marker', async () => {
  mount('PROVIDER_ADMIN', 'other')
  expect(screen.queryByRole('button')).toBeNull()
  await reconcileHistoricalAdvance(
    marker.key,
    'other',
    'PROVIDER_ADMIN',
    () => true,
    true,
  )
  expect(executionApi.providerAttempt).not.toHaveBeenCalled()
  expect(readHistoricalMarkers().markers).toHaveLength(1)
})
it('late APPLIED after logout/unmount does not erase marker', async () => {
  let finish!: (
    value: Awaited<ReturnType<typeof executionApi.providerAttempt>>,
  ) => void
  vi.mocked(executionApi.providerAttempt).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const view = mount()
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar avance histórico' }),
  )
  view.unmount()
  await act(async () =>
    finish({ state: 'APPLIED', appliedRevision: 4, canStartNewAttempt: false }),
  )
  expect(readHistoricalMarkers().markers).toHaveLength(1)
})
it.each([
  { state: 'APPLIED', appliedRevision: null, canStartNewAttempt: false },
  { state: 'CLOSED_NO_EFFECTS', appliedRevision: 4, canStartNewAttempt: false },
])('incoherent receipt keeps marker %j', async (result) => {
  vi.mocked(executionApi.providerAttempt).mockResolvedValue(
    result as Awaited<ReturnType<typeof executionApi.providerAttempt>>,
  )
  await reconcileHistoricalAdvance(
    marker.key,
    'owner',
    'PROVIDER_ADMIN',
    () => true,
  )
  expect(readHistoricalMarkers().markers).toHaveLength(1)
})
it('403 membership and storage corruption never clear pending marker', async () => {
  vi.mocked(executionApi.providerAttempt).mockRejectedValue(new Error('403'))
  await reconcileHistoricalAdvance(
    marker.key,
    'owner',
    'PROVIDER_ADMIN',
    () => true,
  )
  expect(readHistoricalMarkers().markers).toHaveLength(1)
  expect(
    Object.keys(
      JSON.parse(localStorage.getItem(historicalStorageKey)!)[0],
    ).sort(),
  ).toEqual(['actor', 'dispatchId', 'key', 'providerId'])
  localStorage.setItem(historicalStorageKey, 'corrupt')
  mount()
  expect(screen.getByRole('alert')).toHaveTextContent('no se puede leer')
  expect(localStorage.getItem(historicalStorageKey)).toBe('corrupt')
})

it('migrates exact existing key/provider without storing historical body or creating a command', () => {
  const key = '20000000-0000-4000-8000-000000000002'
  expect(
    preserveHistoricalCommand({
      actor: 'owner',
      dispatchId: 'old-dispatch',
      path: '/provider/dispatches/old-dispatch/execution-events?providerId=original-provider',
      body: {
        assignmentId: 'old',
        expectedRevision: 3,
        phase: 'PICKED_UP',
        reasonDetail: 'private synthetic body',
      },
      key,
      label: 'Old',
      busy: false,
    }),
  ).toBe(true)
  const saved = readHistoricalMarkers().markers.find((m) => m.key === key)
  expect(saved).toEqual({
    actor: 'owner',
    dispatchId: 'old-dispatch',
    providerId: 'original-provider',
    key,
  })
  expect(localStorage.getItem(historicalStorageKey)).not.toContain(
    'private synthetic body',
  )
  expect(executionApi.command).not.toHaveBeenCalled()
})
