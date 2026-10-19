import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import type { Role } from '../types/api'
import {
  NewDeletion,
  DeletionHome,
  DeletionDetail,
  PrivateDeletion,
  Status,
  PrivacyLayout,
} from '../deletion/pages'
import { AdminActions } from '../deletion/review'
import { deletion } from '../deletion/service'
import { verification } from '../verification/service'
import { providers } from '../providers/service'
import { useSend } from '../deletion/hooks'
import { readMarkers, begin } from '../deletion/pending'
import { ApiError } from '../services/errors'
import { actor, resource, caseId, onboarding } from './verification-fixtures'
import { deletionFixture as fixture, partialFixture } from './deletion-fixtures'
import { operationalFixture, restrictionTask } from './deletion-v2-fixtures'
vi.mock('../deletion/service', () => ({
  deletion: {
    create: vi.fn(),
    get: vi.fn(),
    byKey: vi.fn(),
    receipt: vi.fn(),
    list: vi.fn(),
    tasks: vi.fn(),
    items: vi.fn(),
    replacements: vi.fn(),
    command: vi.fn(),
    commandReceipt: vi.fn(),
    access: vi.fn(),
    privateStatus: vi.fn(),
  },
}))
vi.mock('../verification/service', () => ({
  verification: { onboarding: vi.fn() },
}))
vi.mock('../providers/service', () => ({ providers: { profiles: vi.fn() } }))
function mount(
  child: ReactNode,
  role: Role = 'DRIVER',
  id = actor,
  path = '/',
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id,
      email: 'synthetic@example.test',
      role,
      active: true,
      emailVerifiedAt: '2026-10-16T00:00:00Z',
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
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<PrivacyLayout />}>
                <Route path="/:id?" element={child} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  vi.mocked(verification.onboarding).mockResolvedValue(onboarding)
  vi.mocked(deletion.get).mockResolvedValue(fixture)
  vi.mocked(deletion.items).mockResolvedValue([])
  vi.mocked(deletion.tasks).mockResolvedValue([])
  vi.mocked(deletion.replacements).mockResolvedValue([])
  vi.mocked(providers.profiles).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
})
it('restriction task assignment requires distinct current administrators and evidence', async () => {
  vi.mocked(deletion.tasks).mockResolvedValue([
    { ...restrictionTask, status: 'PENDING', ownerId: null, deputyId: null },
  ])
  mount(<AdminActions data={operationalFixture} />, 'SUPER_ADMIN')
  await screen.findByRole('option', { name: 'Asignar responsable y suplente' })
  fireEvent.change(screen.getByLabelText('Acción administrativa'), {
    target: { value: 'ACKNOWLEDGE_TASK' },
  })
  const owner = screen.getByLabelText('UUID del responsable'),
    deputy = screen.getByLabelText('UUID del suplente')
  expect(owner).toBeRequired()
  expect(deputy).toBeRequired()
  fireEvent.change(owner, { target: { value: actor } })
  fireEvent.change(deputy, { target: { value: actor } })
  fireEvent.change(
    screen.getByLabelText('Referencia UUID de evidencia custodiada'),
    { target: { value: resource } },
  )
  fireEvent.change(screen.getByLabelText('Tarea pendiente'), {
    target: { value: restrictionTask.id },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar decisión' }))
  expect(
    await screen.findByText(
      'El responsable y el suplente deben ser personas distintas.',
    ),
  ).toBeInTheDocument()
  expect(deletion.command).not.toHaveBeenCalled()
})
it('scopes depend on actual driver links; personal closure differs from unlinking', async () => {
  vi.mocked(verification.onboarding).mockResolvedValue({
    ...onboarding,
    driver: { ...onboarding.driver, providerId: resource },
  })
  mount(<NewDeletion />)
  await screen.findByRole('option', { name: 'Desvincularme de la flotilla' })
  expect(
    screen.queryByRole('option', { name: 'Dar de baja la flotilla' }),
  ).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Alcance'), {
    target: { value: 'FLEET_LINK' },
  })
  expect(
    screen.getByText(/no se cierra tu cuenta personal/),
  ).toBeInTheDocument()
  expect(screen.getByText(new RegExp(resource))).toBeInTheDocument()
})
it('driver without verified links initially receives only personal scopes', () => {
  vi.mocked(verification.onboarding).mockReturnValue(new Promise(() => {}))
  mount(<NewDeletion />)
  expect(screen.getAllByRole('option')).toHaveLength(2)
  expect(verification.onboarding).toHaveBeenCalledOnce()
})
it('provider admin without memberships is not offered organization or representative scopes', async () => {
  mount(<NewDeletion />, 'PROVIDER_ADMIN')
  await waitFor(() => expect(providers.profiles).toHaveBeenCalledOnce())
  expect(
    screen.queryByRole('option', { name: 'Dar de baja la flotilla' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('option', {
      name: 'Dejar de representar a la flotilla',
    }),
  ).not.toBeInTheDocument()
})
it('admin assisted submission can request manual authority verification, not a local authority grant', () => {
  mount(<NewDeletion />, 'SUPER_ADMIN')
  expect(screen.getByLabelText(/Titular asistido/)).toBeInTheDocument()
  expect(
    screen.getByRole('option', { name: 'Dar de baja la flotilla' }),
  ).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Alcance'), {
    target: { value: 'ORGANIZATION' },
  })
  expect(
    screen.getByRole('button', { name: 'Revisar y confirmar alcance' }),
  ).toBeDisabled()
  expect(
    screen.getByText(/Requiere comprobación de facultades/),
  ).toBeInTheDocument()
})
it('explicit confirmation, required password and acknowledgment; double submit creates only once', async () => {
  let finish!: (v: typeof fixture) => void
  vi.mocked(deletion.create).mockImplementation(
    () =>
      new Promise((r) => {
        finish = r
      }),
  )
  mount(<NewDeletion />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Revisar y confirmar alcance' }),
  )
  const password = screen.getByLabelText('Contraseña actual')
  expect(password).toBeRequired()
  expect(screen.getByRole('checkbox')).toBeRequired()
  fireEvent.change(password, { target: { value: 'synthetic-password' } })
  fireEvent.click(screen.getByRole('checkbox'))
  const button = screen.getByRole('button', { name: 'Confirmar solicitud' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(deletion.create).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(readMarkers())).not.toContain('password')
  await act(async () => finish(fixture))
  expect(await screen.findByText(/Solicitud registrada/)).toBeInTheDocument()
  expect(
    screen.getByText(/no se ha podido confirmar que todas las cargas/),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Constancia de alcance limitado' }),
  ).not.toBeInTheDocument()
})
it('lost creation recovered with original key; 404 retains marker without resubmission', async () => {
  const m = begin(actor, 'create')
  vi.mocked(deletion.byKey)
    .mockRejectedValueOnce(new ApiError(404, 'secret'))
    .mockResolvedValueOnce(fixture)
  mount(<DeletionHome />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Recuperar solicitud por clave' }),
  )
  await screen.findByRole('alert')
  expect(readMarkers()[0].accepted).toBeUndefined()
  fireEvent.click(
    screen.getByRole('button', { name: 'Recuperar solicitud por clave' }),
  )
  await waitFor(() => expect(readMarkers()[0].accepted).toBe(true))
  expect(deletion.byKey).toHaveBeenLastCalledWith(
    m.key,
    expect.any(AbortSignal),
  )
  expect(deletion.create).not.toHaveBeenCalled()
})
it('references from another account are not shown or transferred', () => {
  begin(resource, 'create')
  mount(<DeletionHome />)
  expect(screen.queryByText(/Resultado desconocido/)).not.toBeInTheDocument()
  expect(readMarkers()).toHaveLength(1)
})
it('a new client instance recovers admin intent with GET only and separates historical receipt', async () => {
  const m = begin(actor, 'resolve', caseId)
  vi.mocked(deletion.commandReceipt).mockResolvedValue({
    status: 'APPLIED',
    requestId: caseId,
    key: m.key,
    recordedAt: fixture.receivedAt,
    result: { recorded: true },
  })
  mount(<DeletionHome />, 'SUPER_ADMIN')
  expect(deletion.commandReceipt).not.toHaveBeenCalled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar recibo administrativo' }),
  )
  await screen.findByRole('heading', {
    name: 'Comando aplicado: recibo histórico',
  })
  expect(deletion.commandReceipt).toHaveBeenCalledWith(
    caseId,
    m.key,
    expect.any(AbortSignal),
  )
  expect(deletion.command).not.toHaveBeenCalled()
  expect(readMarkers()[0].accepted).toBe(true)
  expect(JSON.stringify(readMarkers())).not.toContain('recordedAt')
  expect(
    screen.getByRole('link', {
      name: 'Consultar estado administrativo actual',
    }),
  ).toHaveAttribute('href', '/admin/privacy/deletion/' + caseId)
})
it('CANCELLED administrative recovery confirms command, refreshes current data and preserves historical revision', async () => {
  const m = begin(actor, 'resolve', caseId)
  vi.mocked(deletion.commandReceipt).mockResolvedValue({
    status: 'APPLIED',
    requestId: caseId,
    key: m.key,
    recordedAt: fixture.receivedAt,
    result: { ...fixture, status: 'CANCELLED', revision: 4 },
  })
  vi.mocked(deletion.list).mockResolvedValue([
    {
      ...operationalFixture,
      status: 'CANCELLED',
      revision: 6,
      authorizationState: 'BLOCKED',
      blockingReason: 'AUTHORIZATION_UNDER_REVIEW',
    },
  ])
  const { client } = mount(
    <DeletionDetail admin />,
    'SUPER_ADMIN',
    actor,
    '/' + caseId,
  )
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  await screen.findByText('6')
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar recibo administrativo' }),
  )
  await screen.findByText(/La decisión administrativa fue aplicada/)
  expect(screen.getByText(/Revisión histórica: 4/)).toBeInTheDocument()
  expect(screen.getByText('6')).toBeInTheDocument()
  expect(
    screen.getByText('Limpieza cancelada; autorización de limpieza bloqueada'),
  ).toBeInTheDocument()
  await waitFor(() => expect(invalidate).toHaveBeenCalled())
  expect(readMarkers()[0]).toMatchObject({ ...m, accepted: true })
  expect(deletion.command).not.toHaveBeenCalled()
})
it('cancelled task assignment is enabled without enabling restoration or personal cancel', async () => {
  vi.mocked(deletion.tasks).mockResolvedValue([restrictionTask])
  mount(
    <AdminActions
      data={{
        ...operationalFixture,
        status: 'CANCELLED',
        authorizationState: 'TERMINATED',
      }}
    />,
    'SUPER_ADMIN',
  )
  await screen.findByRole('option', { name: 'Asignar responsable y suplente' })
  await waitFor(() =>
    expect(screen.getByLabelText('Acción administrativa')).toBeEnabled(),
  )
  expect(
    screen.queryByRole('option', {
      name: 'Registrar responsabilidad de recuperación',
    }),
  ).not.toBeInTheDocument()
})
it.each([
  [404, 'resolve'],
  [404, 'restore-policy'],
  [401, 'restore-policy'],
  [403, 'restore-policy'],
  [500, 'restore-policy'],
] as const)(
  'unavailable or purged receipt (%s, %s) stays unknown and never retries POST',
  async (status, op) => {
    const marker = begin(actor, op, caseId)
    vi.mocked(deletion.commandReceipt).mockRejectedValue(
      new ApiError(
        status,
        'secret',
        status === 404 ? 'COMMAND_RECEIPT_UNAVAILABLE' : null,
      ),
    )
    mount(<DeletionHome />, 'SUPER_ADMIN')
    fireEvent.click(
      screen.getByRole('button', { name: 'Consultar recibo administrativo' }),
    )
    const alert = await screen.findByRole('alert')
    if (status === 404)
      expect(alert).toHaveTextContent('el resultado sigue siendo desconocido')
    expect(readMarkers()).toEqual([marker])
    expect(deletion.commandReceipt).toHaveBeenCalledTimes(1)
    expect(deletion.commandReceipt).toHaveBeenCalledWith(
      caseId,
      marker.key,
      expect.any(AbortSignal),
    )
    expect(
      screen.queryByRole('heading', {
        name: 'Comando aplicado: recibo histórico',
      }),
    ).not.toBeInTheDocument()
    expect(deletion.command).not.toHaveBeenCalled()
  },
)
it('late recovery after account unmount cannot accept or render a different account receipt', async () => {
  const m = begin(actor, 'resolve', caseId)
  let finish!: (
    value: Awaited<ReturnType<typeof deletion.commandReceipt>>,
  ) => void
  vi.mocked(deletion.commandReceipt).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const mounted = mount(<DeletionHome />, 'SUPER_ADMIN')
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar recibo administrativo' }),
  )
  mounted.unmount()
  expect(vi.mocked(deletion.commandReceipt).mock.calls[0][2]?.aborted).toBe(
    true,
  )
  mount(<DeletionHome />, 'SUPER_ADMIN', resource)
  await act(async () =>
    finish({
      status: 'APPLIED',
      requestId: caseId,
      key: m.key,
      recordedAt: fixture.receivedAt,
      result: { recorded: true },
    }),
  )
  expect(readMarkers()[0].accepted).toBeUndefined()
  expect(
    screen.queryByRole('heading', {
      name: 'Comando aplicado: recibo histórico',
    }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Consultar recibo administrativo' }),
  ).not.toBeInTheDocument()
})
it('partial receipt is separate from current state and never attests backups', () => {
  mount(<Status data={partialFixture} receipt />)
  expect(
    screen.getByRole('heading', { name: 'Constancia de alcance limitado' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/sólo acredita los subámbitos/)).toBeInTheDocument()
  expect(
    screen.getByText(/Los respaldos del proveedor no están acreditados/),
  ).toBeInTheDocument()
  expect(screen.getByText(/Pendiente; la recepción/)).toBeInTheDocument()
})
it('H with pending backups is limited operational evidence', () => {
  mount(
    <Status
      data={{
        ...fixture,
        status: 'CLOSED',
        closedAt: fixture.receivedAt,
        evidenceLevel: 'CONTROLLED_OPERATIONAL_SCOPE',
        fullErasureAttested: false,
      }}
      receipt
    />,
  )
  expect(
    screen.getByText(/no todos los respaldos ni copias externas/),
  ).toBeInTheDocument()
})
it('receipt requires an explicit backend read and a separate accredited response', async () => {
  vi.mocked(deletion.get).mockResolvedValue({
    ...fixture,
    completedDocumentaryScopes: 1,
  })
  vi.mocked(deletion.receipt).mockResolvedValue(partialFixture)
  mount(<DeletionDetail />, 'DRIVER', actor, '/' + caseId)
  const button = await screen.findByRole('button', {
    name: 'Consultar constancia del backend',
  })
  expect(deletion.receipt).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('heading', { name: 'Constancia de alcance limitado' }),
  ).not.toBeInTheDocument()
  fireEvent.click(button)
  await screen.findByRole('heading', { name: 'Constancia de alcance limitado' })
  expect(deletion.receipt).toHaveBeenCalledWith(caseId, expect.any(AbortSignal))
})
it('lower revision cannot overwrite current detail after refresh', async () => {
  vi.mocked(deletion.get)
    .mockResolvedValueOnce({
      ...fixture,
      revision: 9,
      status: 'CLOSED',
      closedAt: fixture.receivedAt,
    })
    .mockResolvedValueOnce({ ...fixture, revision: 8 })
  mount(<DeletionDetail />, 'DRIVER', actor, '/' + caseId)
  await screen.findByText('Alcance operativo cerrado')
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' }))
  await waitFor(() => expect(deletion.get).toHaveBeenCalledTimes(2))
  expect(screen.getByText('Alcance operativo cerrado')).toBeInTheDocument()
})
it.each([401, 403])(
  'restricted read %s never becomes closure and keeps private channel',
  async (status) => {
    vi.mocked(deletion.get).mockRejectedValue(
      new ApiError(status, 'raw-private-error'),
    )
    mount(<DeletionDetail />, 'DRIVER', actor, '/' + caseId)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se interpreta como cierre',
    )
    expect(
      screen.getByRole('link', { name: 'Canal privado' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/raw-private-error/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /cancelación/ }),
    ).not.toBeInTheDocument()
  },
)
it('unmount aborts actor read and clears zero-GC private query', async () => {
  let signal: AbortSignal | undefined
  vi.mocked(deletion.get).mockImplementation((_id, s) => {
    signal = s
    return new Promise(() => {})
  })
  const mounted = mount(<DeletionDetail />, 'DRIVER', actor, '/' + caseId)
  await waitFor(() => expect(signal).toBeDefined())
  mounted.unmount()
  expect(signal?.aborted).toBe(true)
  await waitFor(() =>
    expect(mounted.client.getQueryCache().getAll()).toHaveLength(0),
  )
})
it.each([
  'ACTIVE_SERVICE_MINIMIZATION_REQUIRED',
  'OPERATIONAL_DEADLINE_EXCEEDED',
  'DELETION_RETRY_WINDOW_EXPIRED',
])('communicates actual pending reason %s without raw internals', (reason) => {
  mount(
    <Status
      data={{
        ...fixture,
        blockingReason: reason,
        pendingActions: [
          { kind: 'MIXED_REPLACEMENT:third-party-secret', dueAt: null },
        ],
      }}
    />,
  )
  expect(screen.queryByText(/third-party-secret/)).not.toBeInTheDocument()
  expect(screen.queryByText(reason)).not.toBeInTheDocument()
  expect(
    screen.getByText(/No se certifica eliminación total/),
  ).toBeInTheDocument()
})
it('unknown snapshot retains neutral result without enabling actions', async () => {
  vi.mocked(deletion.get).mockResolvedValue({
    ...fixture,
    status: 'FUTURE',
    irreversibleStarted: false,
  })
  mount(<DeletionDetail />, 'DRIVER', actor, '/' + caseId)
  expect(
    await screen.findByText(/Estado no reconocido. Se conserva/),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /Solicitar cancelación/ }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /Consultar constancia/ }),
  ).not.toBeInTheDocument()
})
it('exhausted retries never offer resume or drain bypass', async () => {
  vi.mocked(deletion.items).mockResolvedValue([
    {
      id: resource,
      attachmentId: null,
      caseId: null,
      classification: 'DELETE',
      status: 'MANUAL_REQUIRED',
      attempts: 8,
      retryAt: null,
      errorCode: 'WRITER_QUIESCENCE_NOT_VERIFIED',
    },
  ])
  mount(<AdminActions data={fixture} />, 'SUPER_ADMIN')
  await screen.findByText(/Intentos: 8\/8/)
  expect(
    screen.queryByRole('option', { name: /Reanudar/ }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /forzar|drenaje/i }),
  ).not.toBeInTheDocument()
})
it('private token cleared, no cache; clear aborts late response', async () => {
  let finish!: (v: typeof fixture) => void
  vi.mocked(deletion.privateStatus).mockImplementation(
    () =>
      new Promise((r) => {
        finish = r
      }),
  )
  const { client } = mount(<PrivateDeletion />)
  fireEvent.change(screen.getByLabelText('Código privado de seguimiento'), {
    target: { value: 'private-secret' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar con código privado' }),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Limpiar consulta privada' }),
  )
  expect(vi.mocked(deletion.privateStatus).mock.calls[0][1]?.aborted).toBe(true)
  await act(async () => finish(fixture))
  expect(screen.queryByText(fixture.id)).not.toBeInTheDocument()
  expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain(
    'private-secret',
  )
  expect(localStorage.length).toBe(0)
})
it('explicit cancellation retry preserves exact original body and key after editing screen', async () => {
  vi.mocked(deletion.command)
    .mockRejectedValueOnce(new ApiError(0, 'lost'))
    .mockResolvedValueOnce(fixture)
  function Probe() {
    const send = useSend()
    return (
      <>
        <button
          onClick={() =>
            void send
              .send('cancel', caseId, (key) =>
                deletion.command(key, caseId, 'cancel', {
                  expectedRevision: 3,
                }),
              )
              .catch(() => {})
          }
        >
          Send
        </button>
        <button onClick={() => void send.retry()}>Retry</button>
      </>
    )
  }
  mount(<Probe />, 'SUPER_ADMIN')
  fireEvent.click(screen.getByText('Send'))
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByText('Retry'))
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(2))
  expect(vi.mocked(deletion.command).mock.calls[1]).toEqual(
    vi.mocked(deletion.command).mock.calls[0],
  )
  await waitFor(() => expect(readMarkers()[0].accepted).toBe(true))
})
it('a rejected replay does not erase a prior unknown operation', async () => {
  vi.mocked(deletion.command)
    .mockRejectedValueOnce(new ApiError(0, 'lost'))
    .mockRejectedValueOnce(new ApiError(403, 'permissions changed'))
  function Probe() {
    const send = useSend()
    return (
      <>
        <button
          onClick={() =>
            void send
              .send('cancel', caseId, (key) =>
                deletion.command(key, caseId, 'cancel', {
                  expectedRevision: 3,
                }),
              )
              .catch(() => {})
          }
        >
          Send
        </button>
        <button onClick={() => void send.retry()?.catch(() => {})}>
          Retry
        </button>
      </>
    )
  }
  mount(<Probe />)
  fireEvent.click(screen.getByText('Send'))
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByText('Retry'))
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(2))
  expect(readMarkers()).toHaveLength(1)
  expect(readMarkers()[0].accepted).toBeUndefined()
})
