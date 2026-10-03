import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '../services/query'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { Protected } from '../app/App'
import {
  ExecutionPanel,
  ExecutionProgress,
  ExecutionRecovery,
} from '../execution/components'
import {
  ResolutionForm,
  IncidentPage,
  IncidentsPage,
} from '../execution/incidents'
import {
  runCommand,
  resetCommands,
  refreshExecution,
} from '../execution/commands'
import { executionApi } from '../execution/service'
import { providers } from '../providers/service'
import { adminAssignments } from '../delivery-assignments/service'
import { phases, type Scope } from '../execution/types'
import {
  detailFixture,
  executionFixture,
  incidentFixture,
  dispatchFixture,
} from './execution-fixture'
import { ApiError, normalizeError } from '../services/errors'
import { phaseLabels } from '../execution/format'
import { DetailedPayment } from '../execution/payment'
import { collectionFixture } from './collection-fixture'
import { canDeliver, canRelease, isClaimOwner } from '../dispatch/rules'
import type { ProviderDispatch } from '../dispatch/types'
import type { DeliveryAssignment } from '../delivery-assignments/types'
vi.mock('../execution/service', async (original) => ({
  ...(await original<typeof import('../execution/service')>()),
  executionApi: {
    detail: vi.fn(),
    command: vi.fn(),
    incidents: vi.fn(),
    incident: vi.fn(),
    candidates: vi.fn(),
  },
}))
vi.mock('../providers/service', () => ({ providers: { members: vi.fn() } }))
const scope: Scope = {
  surface: 'provider',
  dispatchId: 'dispatch',
  providerId: 'provider-A',
}
function mount(
  children: ReactNode,
  role = 'PROVIDER_ADMIN',
  path = '/',
  actor = 'actor',
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: {
            id: actor,
            role: role as 'SUPER_ADMIN',
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
        <MemoryRouter initialEntries={[path]}>
          <FeedbackProvider>
            <ExecutionRecovery />
            {children}
          </FeedbackProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  queryClient.clear()
  resetCommands()
  vi.resetAllMocks()
  vi.mocked(executionApi.detail).mockResolvedValue(
    structuredClone(detailFixture),
  )
  vi.mocked(executionApi.command).mockResolvedValue({})
  vi.mocked(executionApi.incidents).mockResolvedValue({
    items: [incidentFixture.incident],
    total: 1,
    totalPages: 1,
    page: 1,
    pageSize: 20,
  })
  vi.mocked(executionApi.incident).mockResolvedValue(incidentFixture)
  vi.mocked(executionApi.candidates).mockResolvedValue({
    items: [
      {
        driverId: 'driver-B',
        driverName: 'Receptor sintético',
        vehicleId: 'vehicle-B',
        vehicleIdentifier: 'MOTO-B',
        providerId: 'provider-B',
        mode: 'FLEET',
      },
    ],
    total: 1,
    totalPages: 1,
    page: 1,
    pageSize: 20,
  })
  vi.mocked(providers.members).mockResolvedValue({
    items: [
      {
        id: 'membership',
        userId: 'admin-B',
        providerId: 'provider-B',
        role: 'ADMIN',
        createdAt: '',
        user: {
          id: 'admin-B',
          email: 'receiver@example.test',
          role: 'PROVIDER_ADMIN',
          active: true,
        },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  })
})
it.each([null, ...phases.slice(0, 4)])(
  'offers only the consecutive next phase after %s',
  async (phase) => {
    vi.mocked(executionApi.detail).mockResolvedValue({
      ...detailFixture,
      execution: { ...executionFixture, phase, allowedActions: ['ADVANCE'] },
    })
    mount(<ExecutionPanel scope={scope} />)
    const next = phases[phase === null ? 0 : phases.indexOf(phase) + 1]
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Registrar: ${phaseLabels[next]}`,
      }),
    )
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirmar registro' })
        .closest('form')!,
    )
    await waitFor(() => expect(executionApi.command).toHaveBeenCalledOnce())
    expect(executionApi.command).toHaveBeenCalledWith(
      expect.stringContaining('providerId=provider-A'),
      {
        assignmentId: executionFixture.activeAssignmentId,
        expectedRevision: 4,
        phase: next,
      },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    )
  },
)
it('lists server actor/source/time and paginates without manufacturing phases', async () => {
  mount(<ExecutionPanel scope={scope} />)
  expect(await screen.findByText('Aviso por teléfono')).toBeInTheDocument()
  expect(screen.getByText(/synthetic-operator/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  await waitFor(() =>
    expect(executionApi.detail).toHaveBeenLastCalledWith(
      scope,
      2,
      expect.any(AbortSignal),
    ),
  )
})
it('keeps legacy without invented progress', async () => {
  vi.mocked(executionApi.detail).mockResolvedValue({
    ...detailFixture,
    execution: null,
  })
  mount(
    <ExecutionPanel scope={{ surface: 'admin', dispatchId: 'dispatch' }} />,
    'SUPER_ADMIN',
  )
  expect(await screen.findByText(/Ejecución legacy/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Registrar:/ })).toBeNull()
})
it('SUPER_ADMIN cannot advance even with an inconsistent allowedActions response', async () => {
  mount(
    <ExecutionPanel scope={{ surface: 'admin', dispatchId: 'dispatch' }} />,
    'SUPER_ADMIN',
  )
  await screen.findByText('Progreso de ejecución')
  expect(screen.queryByRole('button', { name: /Registrar:/ })).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Reportar incidencia' }),
  ).toBeInTheDocument()
})
it('fleet driver is read only and continues reporting by telephone', () => {
  mount(
    <ExecutionProgress
      execution={{ ...executionFixture, allowedActions: [] }}
      fleet
    />,
    'DRIVER',
  )
  expect(screen.getByText(/Continúa reportando/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Registrar/ })).toBeNull()
})
it('independent sends its event to the driver endpoint', async () => {
  mount(
    <ExecutionPanel scope={{ surface: 'driver', dispatchId: 'dispatch' }} />,
    'DRIVER',
  )
  fireEvent.click(await screen.findByRole('button', { name: /Registrar:/ }))
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.submit(
    screen.getByRole('button', { name: 'Confirmar registro' }).closest('form')!,
  )
  await waitFor(() =>
    expect(executionApi.command).toHaveBeenCalledWith(
      '/driver/dispatches/dispatch/execution-events',
      expect.objectContaining({ expectedRevision: 4 }),
      expect.any(String),
    ),
  )
})
it('an open incident blocks progress and delivery while retaining custody', async () => {
  const execution = {
    ...executionFixture,
    openIncidentId: 'incident',
    allowedActions: [],
  }
  vi.mocked(executionApi.detail).mockResolvedValue({
    ...detailFixture,
    execution,
  })
  mount(<ExecutionPanel scope={scope} />)
  expect(
    await screen.findByText(/Custodia y recursos siguen retenidos/),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Registrar:/ })).toBeNull()
  expect(
    canDeliver(
      {
        ...dispatchFixture,
        execution,
        access: 'OWNER',
        status: 'CLAIMED',
        claimedByMe: true,
      },
      { id: execution.activeAssignmentId } as DeliveryAssignment,
    ),
  ).toBe(false)
})
it('reports DTO reason and detail with the current assignment and revision', async () => {
  mount(<ExecutionPanel scope={scope} />)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Reportar incidencia' }),
  )
  fireEvent.change(screen.getByLabelText('Motivo'), {
    target: { value: 'VEHICLE_FAILURE' },
  })
  fireEvent.change(screen.getByLabelText('Detalle del motivo'), {
    target: { value: 'Falla mecánica segura' },
  })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.submit(
    screen.getByRole('button', { name: 'Confirmar registro' }).closest('form')!,
  )
  await waitFor(() =>
    expect(executionApi.command).toHaveBeenCalledWith(
      expect.stringContaining('custody-incidents'),
      {
        assignmentId: executionFixture.activeAssignmentId,
        expectedRevision: 4,
        reasonCode: 'VEHICLE_FAILURE',
        reasonDetail: 'Falla mecánica segura',
      },
      expect.any(String),
    ),
  )
})
it('does not grant the historical claimant rights after transfer', () => {
  const returned = {
    access: 'SUMMARY',
    claimedByMe: true,
    status: 'CLAIMED',
    execution: undefined,
  } as ProviderDispatch
  expect(isClaimOwner(returned)).toBe(false)
  expect(canRelease(returned)).toBe(false)
  expect(canDeliver(returned, { id: 'old' } as DeliveryAssignment)).toBe(false)
  const current = {
    ...returned,
    access: 'OWNER',
    claimedByMe: false,
    execution: {
      ...executionFixture,
      phase: 'AT_DROPOFF',
      allowedActions: ['DELIVER'],
    },
  } as ProviderDispatch
  expect(canDeliver(current, { id: 'old' } as DeliveryAssignment)).toBe(false)
  expect(
    canDeliver(current, {
      id: executionFixture.activeAssignmentId,
    } as DeliveryAssignment),
  ).toBe(true)
})
it('retires operations after a refetch denies the previous executor', async () => {
  mount(<ExecutionPanel scope={scope} />)
  await screen.findByRole('button', { name: /Registrar:/ })
  vi.mocked(executionApi.detail).mockRejectedValue(
    new ApiError(403, 'Ya no eres el ejecutor vigente.'),
  )
  await act(() => refreshExecution())
  expect(
    await screen.findByText('Ya no eres el ejecutor vigente.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Registrar:/ })).toBeNull()
})
const intent = {
  actor: 'actor',
  dispatchId: 'dispatch',
  path: '/admin/dispatches/dispatch/custody-incidents/incident/resolve',
  body: { assignmentId: 'original', expectedRevision: 4, type: 'TRANSFER' },
  label: 'Transferencia',
}
it('double click has one POST and no success before the response', async () => {
  let finish!: (v: unknown) => void
  vi.mocked(executionApi.command).mockImplementation(
    () =>
      new Promise((r) => {
        finish = r
      }),
  )
  mount(null)
  let first!: Promise<void>
  act(() => {
    first = runCommand(intent)
    void runCommand(intent)
  })
  expect(executionApi.command).toHaveBeenCalledOnce()
  expect(screen.queryByText(/registro confirmado/)).toBeNull()
  await act(async () => {
    finish({})
    await first
  })
  expect(screen.getByText(/registro confirmado/)).toBeInTheDocument()
})
it('lost response survives navigation and retries the exact key/body even after assignment changes', async () => {
  vi.mocked(executionApi.command)
    .mockRejectedValueOnce(new ApiError(0, 'network'))
    .mockResolvedValue({})
  const view = mount(null)
  await act(() => runCommand(intent))
  const first = vi.mocked(executionApi.command).mock.calls[0]
  view.unmount()
  mount(null)
  fireEvent.click(
    screen.getByRole('button', { name: 'Recuperar misma operación' }),
  )
  await waitFor(() => expect(executionApi.command).toHaveBeenCalledTimes(2))
  expect(vi.mocked(executionApi.command).mock.calls[1]).toEqual(first)
  expect(vi.mocked(executionApi.command).mock.calls[1][1]).toEqual(intent.body)
})
it.each([
  'EXECUTION_CONFLICT',
  'CUSTODY_RECIPIENT_NOT_ELIGIBLE',
  'INCIDENT_ALREADY_RESOLVED',
])('definitive %s refreshes and never retries', async (code) => {
  vi.mocked(executionApi.command).mockRejectedValue(
    normalizeError(409, { code }),
  )
  mount(null)
  await act(() => runCommand(intent))
  expect(executionApi.command).toHaveBeenCalledOnce()
  expect(
    screen.getByText(/No se reintentó automáticamente/),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Recuperar misma operación' }),
  ).toBeNull()
})
const incidentExecution = {
  ...executionFixture,
  openIncidentId: 'incident',
  allowedActions: ['RESOLVE_INCIDENT'],
}
it('after losing volatile state the page offers read-only reconciliation and no second resolution', async () => {
  vi.spyOn(adminAssignments, 'history').mockResolvedValue([])
  vi.mocked(executionApi.command).mockRejectedValue(new ApiError(0, 'timeout'))
  await runCommand(intent)
  resetCommands() // New page lifetime: only localStorage survives.
  mount(
    <ResolutionForm
      dispatchId="dispatch"
      incidentId="incident"
      execution={incidentExecution}
    />,
    'SUPER_ADMIN',
  )
  expect(
    screen.getByRole('button', { name: 'Reconciliar por lectura' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Recuperar misma operación' }),
  ).toBeNull()
  expect(
    screen.queryByRole('button', { name: 'Confirmar devolución física' }),
  ).toBeNull()
  fireEvent.click(
    screen.getByRole('button', { name: 'Reconciliar por lectura' }),
  )
  await waitFor(() =>
    expect(
      screen.getAllByText(/Pendiente de reconciliación/).length,
    ).toBeGreaterThan(0),
  )
  expect(executionApi.command).toHaveBeenCalledOnce()
})
it('another user sees no previous intent details and cannot bypass the local resolution block', async () => {
  vi.mocked(executionApi.command).mockRejectedValue(new ApiError(0, 'timeout'))
  await runCommand(intent)
  resetCommands()
  mount(
    <ResolutionForm
      dispatchId="dispatch"
      incidentId="incident"
      execution={incidentExecution}
    />,
    'SUPER_ADMIN',
    '/',
    'another-user',
  )
  expect(
    screen.queryByRole('button', { name: 'Reconciliar por lectura' }),
  ).toBeNull()
  expect(
    screen.queryByRole('link', { name: 'Consultar incidencia' }),
  ).toBeNull()
  expect(
    screen.queryByRole('button', { name: 'Confirmar devolución física' }),
  ).toBeNull()
  expect(
    screen.getByText(/Un cambio de usuario no elimina este bloqueo/),
  ).toBeInTheDocument()
  expect(executionApi.incident).not.toHaveBeenCalled()
})
function resolution() {
  return mount(
    <ResolutionForm
      dispatchId="dispatch"
      incidentId="incident"
      execution={incidentExecution}
    />,
    'SUPER_ADMIN',
  )
}
function baseForm() {
  fireEvent.change(screen.getByLabelText('Motivo de resolución'), {
    target: { value: 'Confirmación física sintética' },
  })
  fireEvent.change(screen.getByLabelText('Fecha y hora física (hora local)'), {
    target: { value: '2026-10-01T12:00' },
  })
}
it('return requires unchecked confirmations and submits RETURN_TO_ORIGIN, never delivery', async () => {
  resolution()
  baseForm()
  for (const c of screen.getAllByRole('checkbox')) expect(c).not.toBeChecked()
  fireEvent.change(
    screen.getByLabelText('Contacto receptor en origen (nombre o etiqueta)'),
    { target: { value: 'Encargado' } },
  )
  fireEvent.change(screen.getByLabelText('Rol del contacto en origen'), {
    target: { value: 'Responsable' },
  })
  for (const c of screen.getAllByRole('checkbox')) fireEvent.click(c)
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Confirmar devolución física' })
      .closest('form')!,
  )
  await waitFor(() => expect(executionApi.command).toHaveBeenCalledOnce())
  expect(vi.mocked(executionApi.command).mock.calls[0][1]).toMatchObject({
    type: 'RETURN_TO_ORIGIN',
    confirmationMethod: 'PHONE',
    custodianConfirmed: true,
    originConfirmed: true,
    expectedRevision: 4,
    originContactLabel: 'Encargado',
  })
  expect(vi.mocked(executionApi.command).mock.calls[0][1]).not.toHaveProperty(
    'recipient',
  )
})
it.each(['FLEET', 'INDEPENDENT'])(
  'transfer uses real %s candidates and explicit confirmations',
  async (mode) => {
    if (mode === 'INDEPENDENT')
      vi.mocked(executionApi.candidates).mockResolvedValue({
        items: [
          {
            driverId: 'driver-B',
            driverName: 'Receptor sintético',
            vehicleId: 'vehicle-B',
            vehicleIdentifier: 'BICI-B',
            providerId: null,
            mode: 'INDEPENDENT',
          },
        ],
        total: 1,
        totalPages: 1,
        page: 1,
        pageSize: 20,
      })
    resolution()
    fireEvent.change(screen.getByLabelText('Tipo de resolución'), {
      target: { value: 'TRANSFER' },
    })
    baseForm()
    fireEvent.change(screen.getByLabelText('Modo receptor'), {
      target: { value: mode },
    })
    fireEvent.change(
      await screen.findByLabelText('Repartidor y vehículo receptores'),
      { target: { value: 'driver-B:vehicle-B' } },
    )
    if (mode === 'FLEET')
      fireEvent.change(
        await screen.findByLabelText(
          'Administrador receptor con membership vigente',
        ),
        { target: { value: 'admin-B' } },
      )
    for (const c of screen.getAllByRole('checkbox')) {
      expect(c).not.toBeChecked()
      fireEvent.click(c)
    }
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirmar transferencia física' })
        .closest('form')!,
    )
    await waitFor(() => expect(executionApi.command).toHaveBeenCalledOnce())
    const body = vi.mocked(executionApi.command).mock.calls[0][1]
    expect(body).toMatchObject({
      type: 'TRANSFER',
      recipient: { mode, driverId: 'driver-B', vehicleId: 'vehicle-B' },
      atCurrentStageLocation: true,
    })
    if (mode === 'FLEET')
      expect(body).toHaveProperty('recipientProviderAdminUserId', 'admin-B')
    else {
      expect(body).not.toHaveProperty('recipientProviderAdminUserId')
      expect(body).not.toHaveProperty('recipient.providerId')
    }
  },
)
it('changing the recipient clears every physical confirmation', async () => {
  resolution()
  fireEvent.change(screen.getByLabelText('Tipo de resolución'), {
    target: { value: 'TRANSFER' },
  })
  fireEvent.change(
    await screen.findByLabelText('Repartidor y vehículo receptores'),
    { target: { value: 'driver-B:vehicle-B' } },
  )
  await screen.findByLabelText('Administrador receptor con membership vigente')
  for (const checkbox of screen.getAllByRole('checkbox'))
    fireEvent.click(checkbox)
  fireEvent.change(screen.getByLabelText('Modo receptor'), {
    target: { value: 'INDEPENDENT' },
  })
  for (const checkbox of screen.getAllByRole('checkbox'))
    expect(checkbox).not.toBeChecked()
  expect(executionApi.command).not.toHaveBeenCalled()
})
it('queues open/resolved and renders incident detail from the route', async () => {
  const view = mount(<IncidentsPage />, 'SUPER_ADMIN')
  await screen.findByText('Falla del vehículo')
  fireEvent.change(screen.getByLabelText('Estado de incidencias'), {
    target: { value: 'RESOLVED' },
  })
  await waitFor(() =>
    expect(executionApi.incidents).toHaveBeenLastCalledWith(
      'RESOLVED',
      1,
      expect.any(AbortSignal),
    ),
  )
  view.unmount()
  mount(
    <Routes>
      <Route
        path="/custody-incidents/:dispatchId/:incidentId"
        element={<IncidentPage />}
      />
    </Routes>,
    'SUPER_ADMIN',
    '/custody-incidents/dispatch/incident',
  )
  expect(
    await screen.findByText(incidentFixture.incident.reasonDetail),
  ).toBeInTheDocument()
})
it.each(['PROVIDER_ADMIN', 'DRIVER'])(
  'blocks %s from the admin incident route',
  async (role) => {
    mount(
      <Routes>
        <Route element={<Protected roles={['SUPER_ADMIN']} />}>
          <Route path="/custody-incidents" element={<IncidentsPage />} />
        </Route>
      </Routes>,
      role,
      '/custody-incidents',
    )
    expect(await screen.findByText(/Sin permisos/)).toBeInTheDocument()
    expect(executionApi.incidents).not.toHaveBeenCalled()
  },
)
it('respects economic booleans after pickup without losing backend amounts', () => {
  mount(
    <DetailedPayment
      fields={{
        execution: executionFixture,
        collectionActionAllowed: false,
        advanceToOriginAllowed: false,
      }}
      value={{ ...collectionFixture, applicability: 'CURRENT' }}
      advance={{ amount: '500.00', currency: 'MXN' }}
    />,
  )
  expect(screen.queryByText(/Cobra únicamente/)).toBeNull()
  expect(screen.queryByText(/Adelanto contractual/)).toBeNull()
  expect(screen.getByText(/25.10 MXN/)).toBeInTheDocument()
  expect(screen.getAllByText(/No cobrar en esta etapa/).length).toBeGreaterThan(
    0,
  )
})
it('permits the contractual instruction only when collectionActionAllowed is true', () => {
  mount(
    <DetailedPayment
      fields={{
        execution: { ...executionFixture, phase: 'AT_DROPOFF' },
        collectionActionAllowed: true,
        advanceToOriginAllowed: false,
      }}
      value={{ ...collectionFixture, applicability: 'CURRENT' }}
      advance={{ amount: '500.00', currency: 'MXN' }}
    />,
  )
  expect(
    screen.getByText(/Cobra únicamente el envío: 25.10 MXN/),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Adelanto contractual/)).toBeNull()
})
it('does not discard an incident draft during background refresh', async () => {
  mount(<ExecutionPanel scope={scope} />)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Reportar incidencia' }),
  )
  fireEvent.change(screen.getByLabelText('Detalle del motivo'), {
    target: { value: 'Aviso aún en edición' },
  })
  await act(() => refreshExecution())
  expect(screen.getByLabelText('Detalle del motivo')).toHaveValue(
    'Aviso aún en edición',
  )
})
