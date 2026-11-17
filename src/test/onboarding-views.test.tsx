import { beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  configure,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { AdminLayout } from '../layouts/AdminLayout'
import { DriverOnboarding, CaseDetail } from '../verification/pages'
import { AccountRegistrationProgress } from '../verification/account-progress'
import { verification } from '../verification/service'
import { onboardingQuery } from '../verification/onboarding-query'
import type { Onboarding, VerificationCase } from '../verification/types'
import {
  actor,
  resource,
  caseId,
  requirements,
  terms,
  emptyPage,
} from './verification-fixtures'
import {
  inactiveOnboarding,
  vehicleId,
  unitCaseId,
} from './onboarding-view-fixtures'

let fixture: ReturnType<typeof inactiveOnboarding>
let reads: string[]
// The real layout remounts its outlet after onboarding loads; await that chain.
configure({ asyncUtilTimeout: 5000 })
beforeEach(() => {
  fixture = inactiveOnboarding()
  reads = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input))
    expect(url.pathname).toBe('/api/v1/driver/onboarding')
    const view = url.searchParams.get('view')
    reads.push(view ?? 'MISSING')
    return Response.json({
      ...fixture.data,
      view,
      subjects:
        view === 'DOCUMENTARY'
          ? fixture.data.subjects
          : fixture.data.subjects.filter((s) => !s.vehicleId),
    })
  })
  vi.spyOn(verification, 'requirements').mockResolvedValue({
    ...requirements,
    vehicle: { ...requirements.vehicle, OWNED: null },
  })
  vi.spyOn(verification, 'terms').mockResolvedValue(terms)
  vi.spyOn(verification, 'get').mockImplementation(async (id) => {
    expect([caseId, unitCaseId]).toContain(id)
    return structuredClone(id === caseId ? fixture.identity : fixture.unit)
  })
  vi.spyOn(verification, 'list').mockImplementation(async () => ({
    ...emptyPage,
    items: [structuredClone(fixture.unit)],
    total: 1,
    totalPages: 1,
  }))
  vi.spyOn(verification, 'notices').mockResolvedValue([])
  vi.spyOn(verification, 'acceptanceHistory').mockResolvedValue(emptyPage)
  vi.spyOn(verification, 'command').mockRejectedValue(
    new Error('Unexpected command'),
  )
})

function mount(
  path = '/driver/onboarding',
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  }),
) {
  const auth = {
    user: {
      id: actor,
      role: 'DRIVER' as const,
      email: 'synthetic@example.invalid',
      active: true,
      emailVerifiedAt: '2026-11-16T12:00:00Z',
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
    ...render(
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <FeedbackProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route element={<AdminLayout />}>
                  <Route
                    path="/driver/onboarding"
                    element={<DriverOnboarding />}
                  />
                  <Route
                    path="/profile"
                    element={<AccountRegistrationProgress />}
                  />
                  <Route
                    path="/verification/cases/:id"
                    element={<CaseDetail />}
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </FeedbackProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
    client,
  }
}
function readyPhotos() {
  for (const [record, categories] of [
    [fixture.identity, requirements.identity.required],
    [fixture.unit, []],
  ] as const) {
    record.attachments = categories.map((category, i) => ({
      id: `${record.id}-${i}`,
      category,
      status: 'VALIDATED',
      bytes: 100,
      mime: 'image/png',
      hash: null,
      createdAt: record.createdAt,
    }))
  }
}

it('loads the same INACTIVE/DRAFT unit and its photos through the documentary layout', async () => {
  mount()
  await screen.findByRole('heading', { name: 'Tus fotos' })
  expect(document.querySelector('.signup-workspace')).toBeInTheDocument()
  expect(verification.get).toHaveBeenCalledWith(
    unitCaseId,
    expect.any(AbortSignal),
  )
  expect(new Set(reads)).toEqual(new Set(['DOCUMENTARY']))
  expect(
    screen.getByRole('button', { name: 'Enviar mi solicitud' }),
  ).toBeDisabled()
  expect(verification.command).not.toHaveBeenCalled()
})

it('saves and reenters an inactive draft by its original IDs and current revisions', async () => {
  fixture.unit.data.serialNumber = ''
  const commands = vi
    .mocked(verification.command)
    .mockImplementation(async (marker, _path, body) => {
      expect(marker.operation).toBe('UPDATE_CASE')
      const record = marker.target === caseId ? fixture.identity : fixture.unit
      const update = body as {
        expectedVersion: number
        data: VerificationCase['data']
      }
      expect(update.expectedVersion).toBe(record.revision)
      record.data = update.data
      record.revision++
      return { id: record.id, status: record.status, revision: record.revision }
    })
  const first = mount()
  fireEvent.change(await screen.findByLabelText(/Número de serie/), {
    target: { value: 'SAVED-UNIT' },
  })
  const save = screen.getByRole('button', {
    name: 'Guardar y continuar con las fotos',
  })
  await waitFor(() => expect(save).toBeEnabled())
  fireEvent.click(save)
  await screen.findByRole('heading', { name: 'Tus fotos' })
  expect(commands.mock.calls.map(([m]) => [m.operation, m.target])).toEqual([
    ['UPDATE_CASE', caseId],
    ['UPDATE_CASE', unitCaseId],
  ])
  expect(fixture.unit.data.serialNumber).toBe('SAVED-UNIT')
  expect(reads.length).toBeGreaterThanOrEqual(4)
  expect(new Set(reads)).toEqual(new Set(['DOCUMENTARY']))
  first.unmount()
  mount()
  await screen.findByRole('heading', { name: 'Tus fotos' })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar mis datos' }))
  expect(await screen.findByLabelText(/Número de serie/)).toHaveValue(
    'SAVED-UNIT',
  )
  expect(commands).toHaveBeenCalledTimes(2)
})

it('creates one inactive unit and one draft, then continues that original case', async () => {
  const unitSubject = fixture.data.subjects.pop()!
  const unit = fixture.data.driver.independentProfile!.vehicles.pop()!
  vi.mocked(verification.command).mockImplementation(
    async (marker, _path, body) => {
      if (marker.operation === 'CREATE_VEHICLE') {
        fixture.data.driver.independentProfile!.vehicles.push(unit)
        return { id: vehicleId, status: 'INACTIVE', revision: 1 }
      }
      if (marker.operation === 'CREATE_CASE') {
        expect(body).toEqual({ subjectType: 'VEHICLE', subjectId: vehicleId })
        fixture.data.subjects.push(unitSubject)
        return {
          id: unitCaseId,
          status: 'DRAFT',
          revision: fixture.unit.revision,
        }
      }
      expect(marker.operation).toBe('UPDATE_CASE')
      const record = marker.target === caseId ? fixture.identity : fixture.unit
      record.data = (body as { data: VerificationCase['data'] }).data
      record.revision++
      return { id: record.id, status: record.status, revision: record.revision }
    },
  )
  mount()
  fireEvent.change(await screen.findByLabelText(/¿Con qué vas a repartir/), {
    target: { value: 'BICYCLE' },
  })
  fireEvent.change(screen.getByLabelText(/Número de serie/), {
    target: { value: 'NEW-SYNTHETIC' },
  })
  const save = screen.getByRole('button', {
    name: 'Guardar y continuar con las fotos',
  })
  await waitFor(() => expect(save).toBeEnabled())
  fireEvent.click(save)
  await screen.findByRole('heading', { name: 'Tus fotos' })
  expect(
    vi.mocked(verification.command).mock.calls.map(([m]) => m.operation),
  ).toEqual(['UPDATE_CASE', 'CREATE_VEHICLE', 'CREATE_CASE', 'UPDATE_CASE'])
  expect(fixture.data.driver.independentProfile!.vehicles).toHaveLength(1)
  expect(fixture.unit.id).toBe(unitCaseId)
  expect(new Set(reads)).toEqual(new Set(['DOCUMENTARY']))
})

it('submits the original identity and inactive unit once and refetches review state', async () => {
  readyPhotos()
  vi.mocked(verification.command).mockImplementation(
    async (marker, path, body) => {
      expect(marker.operation).toBe('SUBMIT_ONBOARDING')
      expect(path).toBe('/driver/onboarding/submit')
      expect(body).toEqual({
        identityCaseId: caseId,
        identityRevision: 3,
        vehicleCaseId: unitCaseId,
        vehicleRevision: 3,
      })
      fixture.identity.status = fixture.unit.status = 'SUBMITTED'
      fixture.identity.revision++
      fixture.unit.revision++
      return {
        id: resource,
        status: 'SUBMITTED',
        caseIds: [caseId, unitCaseId],
      }
    },
  )
  mount()
  const submit = await screen.findByRole('button', {
    name: 'Enviar mi solicitud',
  })
  await waitFor(() => expect(submit).toBeEnabled())
  fireEvent.click(submit)
  await screen.findByRole('heading', { name: 'Tu solicitud está en revisión' })
  expect(verification.command).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('link', { name: /Ir a mi cuenta/ }))
  await screen.findByRole('link', { name: 'Ver estado de mi solicitud' })
  expect(
    screen.getAllByText('En revisión · ya enviaste este expediente'),
  ).toHaveLength(2)
  expect(fixture.data.driver.availability).toBe('OFFLINE')
  expect(new Set(reads)).toEqual(new Set(['DOCUMENTARY']))
})

it.each(['REJECTED', 'WITHDRAWN', 'APPROVED'] as const)(
  'preserves inactive %s history and links to the original case',
  async (status) => {
    fixture.identity.status = 'APPROVED'
    fixture.unit.status = status
    fixture.unit.publicReason = 'Observación sintética conservada'
    const first = mount()
    expect(
      await screen.findByRole('link', { name: 'Ver resultado y correcciones' }),
    ).toHaveAttribute('href', '/driver/onboarding?view=details')
    first.unmount()
    mount('/driver/onboarding?view=details')
    const detail = await screen.findByRole('link', { name: 'Revisión 3' })
    expect(detail).toHaveAttribute('href', '/verification/cases/' + unitCaseId)
    fireEvent.click(detail)
    await waitFor(() =>
      expect(verification.get).toHaveBeenCalledWith(
        unitCaseId,
        expect.any(AbortSignal),
      ),
    )
    expect(
      await screen.findByText(
        'Motivo de decisión: Observación sintética conservada',
      ),
    ).toBeVisible()
    expect(verification.command).not.toHaveBeenCalled()
    expect(fixture.unit.status).toBe(status)
  },
)

it('shows active approved plus inactive rejected documents without granting operation', async () => {
  fixture.identity.status = 'APPROVED'
  fixture.unit.status = 'REJECTED'
  const activeId = '88888888-8888-4888-8888-888888888888'
  fixture.data.driver.independentProfile!.vehicles.unshift({
    id: activeId,
    identifier: 'Activa aprobada',
    type: 'BICYCLE',
    status: 'ACTIVE',
  })
  fixture.data.subjects.push({
    id: activeId,
    driverId: null,
    vehicleId: activeId,
    cases: [
      {
        id: activeId,
        status: 'APPROVED',
        revision: 5,
        environment: 'LOCAL_TEST',
      },
    ],
  })
  mount('/profile')
  await screen.findByRole('link', { name: 'Continuar mi registro' })
  const rows = screen.getByRole('list', { name: 'Tu avance guardado' })
  expect(
    within(rows).getByText('Unidad 1 · Activa aprobada').closest('li'),
  ).toHaveTextContent('Aprobado')
  expect(
    within(rows).getByText('Unidad 2 · Unidad sintética').closest('li'),
  ).toHaveTextContent('Requiere atención')
  expect(verification.command).not.toHaveBeenCalled()
})

it('isolates connection cache and late replies from documentary progress', async () => {
  let release!: (data: Response) => void
  const realFetch = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation((input, init) =>
    String(input).endsWith('view=CONNECTION')
      ? new Promise((resolve) => {
          release = resolve
        })
      : realFetch(input, init),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const connection = client.fetchQuery(onboardingQuery(actor, 'CONNECTION'))
  client.setQueryData(['verification', actor, 'onboarding'], {
    ...fixture.data,
    subjects: [],
  })
  mount('/profile', client)
  await screen.findByRole('link', { name: 'Continuar mi registro' })
  expect(
    screen.getAllByText('Borrador guardado · aún no enviado'),
  ).toHaveLength(2)
  await act(async () => {
    release(
      Response.json({
        ...fixture.data,
        view: 'CONNECTION',
        subjects: [fixture.data.subjects[0]],
      }),
    )
    await connection
  })
  expect(
    client.getQueryData<Onboarding>(
      onboardingQuery(actor, 'CONNECTION').queryKey,
    )?.subjects,
  ).toHaveLength(1)
  expect(
    client.getQueryData<Onboarding>(
      onboardingQuery(actor, 'DOCUMENTARY').queryKey,
    )?.subjects,
  ).toHaveLength(2)
  expect(
    screen.getAllByText('Borrador guardado · aún no enviado'),
  ).toHaveLength(2)
})

it('blocks submission during a late documentary refetch and uses the confirmed status', async () => {
  readyPhotos()
  const { client } = mount()
  const submit = await screen.findByRole('button', {
    name: 'Enviar mi solicitud',
  })
  await waitFor(() => expect(submit).toBeEnabled())
  let release!: (data: Response) => void
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  let pending!: Promise<void>
  act(() => {
    pending = client.invalidateQueries({
      queryKey: onboardingQuery(actor, 'DOCUMENTARY').queryKey,
    })
  })
  await waitFor(() => expect(submit).toBeDisabled())
  fireEvent.click(submit)
  expect(verification.command).not.toHaveBeenCalled()
  fixture.identity.status = fixture.unit.status = 'SUBMITTED'
  await act(async () => {
    release(Response.json(fixture.data))
    await pending
  })
  await screen.findByRole('heading', { name: 'Tu solicitud está en revisión' })
  expect(verification.command).not.toHaveBeenCalled()
})

it.each([400, 403, 503])(
  'does not fall back to connection or create resources on HTTP %s',
  async (status) => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ message: 'Synthetic failure' }, { status }),
    )
    mount()
    await screen.findByText(
      status === 403
        ? 'No tienes permiso para esta consulta.'
        : /No se pudo completar la consulta/,
    )
    expect(
      screen.queryByRole('button', {
        name: 'Preparar expediente de identidad independiente',
      }),
    ).toBeNull()
    expect(verification.command).not.toHaveBeenCalled()
    expect(
      vi
        .mocked(fetch)
        .mock.calls.every(([url]) => String(url).endsWith('view=DOCUMENTARY')),
    ).toBe(true)
  },
)
