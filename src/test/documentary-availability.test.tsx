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
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { ApiError } from '../services/errors'
import {
  documentaryAvailability,
  availabilityText,
  consultationError,
} from '../verification/availability'
import { useRequirements } from '../verification/use-availability'
import { verification } from '../verification/service'
import { Warning } from '../verification/common'
import { DriverOnboarding, CaseDetail } from '../verification/pages'
import { Register } from '../verification/identity'
import { TermsPanel } from '../verification/terms'
import { readMarkers, runVerification } from '../verification/pending'
import {
  actor,
  resource,
  providerId,
  caseFixture,
  requirements,
  terms,
  onboarding,
  emptyPage,
} from './verification-fixtures'
import type { Role } from '../types/api'

const production = {
  ...requirements,
  environment: 'PRODUCTION' as const,
  policyVersion: 'DOCUMENTARY-1',
  productionReady: false as const,
}
const publication = {
  ...terms,
  environment: 'PRODUCTION' as const,
  version: 'SYNTHETIC-1',
  privacyVersion: 'SYNTHETIC-PRIVACY-1',
  privacyText: 'AVISO SINTÉTICO',
  privacyHash: 'b'.repeat(64),
  publishedAt: '2026-10-19T00:00:00Z',
  specificConsents: [],
}
const disabled = new ApiError(
  503,
  'internal configuration',
  'VERIFICATION_LOCAL_DISABLED',
)
const missing = new ApiError(
  503,
  'internal text',
  'VERIFICATION_PUBLICATION_REQUIRED',
)
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount(child: ReactNode, role: Role | null = 'DRIVER', path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const logout = vi.fn()
  const tree = (id: string) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          user: role
            ? {
                id,
                role,
                email: 'synthetic@example.invalid',
                active: true,
                emailVerifiedAt: '2026-10-19T00:00:00Z',
                createdAt: '',
                updatedAt: '',
              }
            : null,
          loading: false,
          expired: false,
          error: null,
          login: vi.fn(),
          logout,
          restore: vi.fn(),
        }}
      >
        <FeedbackProvider>
          <MemoryRouter initialEntries={[path]}>{child}</MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
  const view = render(tree(actor))
  return {
    ...view,
    client,
    logout,
    changeActor: (id: string) => view.rerender(tree(id)),
    changeChild: (next: ReactNode) => {
      child = next
      view.rerender(tree(actor))
    },
  }
}
beforeEach(() => {
  vi.spyOn(verification, 'requirements').mockResolvedValue(production)
  vi.spyOn(verification, 'terms').mockResolvedValue(publication)
  vi.spyOn(verification, 'onboarding').mockResolvedValue({
    ...onboarding,
    environment: 'PRODUCTION',
    terms: {
      requiredVersion: publication.version,
      acceptance: {
        id: resource,
        version: publication.version,
        acceptedAt: '2026-10-19T00:00:00Z',
      },
    },
  })
  vi.spyOn(verification, 'get').mockResolvedValue({
    ...caseFixture,
    environment: 'PRODUCTION',
    policyVersion: 'DOCUMENTARY-1',
  })
  vi.spyOn(verification, 'list').mockResolvedValue(emptyPage)
  vi.spyOn(verification, 'notices').mockResolvedValue([])
  vi.spyOn(verification, 'command').mockResolvedValue({
    id: resource,
    status: 'ACCEPTED',
  })
})
it.each(['LOCAL_TEST', 'PRODUCTION'] as const)(
  'only requirements identifies %s, regardless of productionReady',
  (environment) => {
    const data = {
      ...production,
      environment,
      productionReady: false,
      capabilities: { mayOperate: false },
    }
    expect(documentaryAvailability({ data })).toMatchObject({
      kind: 'ready',
      mode: environment,
      canProceed: true,
    })
  },
)
it('disabled is not local mode, even with old cached requirements', () => {
  expect(
    documentaryAvailability({ data: production, error: disabled }),
  ).toEqual({
    kind: 'disabled',
    mode: null,
    canProceed: false,
    text: availabilityText.disabled,
  })
})
it.each([
  new ApiError(0, 'network'),
  new ApiError(401, 'auth'),
  new ApiError(403, 'role'),
  new ApiError(503, 'generic'),
  new ApiError(400, 'bad', 'VERIFICATION_LOCAL_DISABLED'),
])('errors cannot determine mode: $status/$code', (error) => {
  const state = documentaryAvailability({ data: production, error })
  expect(state).toMatchObject({ kind: 'error', mode: null, canProceed: false })
  expect(state.text).not.toMatch(/Modo de prueba|internal|configura/)
})
it('publication absent blocks dependent steps without changing productive runtime', () => {
  expect(
    documentaryAvailability({ data: production }, { error: missing }),
  ).toMatchObject({
    kind: 'missing_policy',
    mode: 'PRODUCTION',
    canProceed: false,
  })
  expect(
    documentaryAvailability(
      { data: production },
      { data: { blockingReason: 'VERIFICATION_PUBLICATION_REQUIRED' } },
    ).kind,
  ).toBe('missing_policy')
})
it('pending, unknown runtime and stale policy never enable a step', () => {
  expect(
    documentaryAvailability({ data: production, isFetching: true }).canProceed,
  ).toBe(false)
  expect(documentaryAvailability({ data: {} }).mode).toBeNull()
  expect(
    documentaryAvailability({ data: production }, { data: terms }).canProceed,
  ).toBe(false)
})
it.each([
  ['LOCAL_TEST', /Modo de prueba. Usa exclusivamente/, true],
  ['PRODUCTION', /Verificación documental\./, false],
] as const)(
  'warning for %s is driven by requirements, not old onboarding data',
  async (environment, text, local) => {
    vi.mocked(verification.requirements).mockResolvedValue({
      ...requirements,
      environment,
    })
    mount(<Warning />)
    await screen.findByText(text)
    await waitFor(() =>
      expect(screen.queryByText(/Consultando disponibilidad/)).toBeNull(),
    )
    expect(!!screen.queryByText(availabilityText.local)).toBe(local)
    expect(screen.getByText(/Aceptar términos o cargar/)).toBeInTheDocument()
    expect(
      screen.getByText(/constancias tienen alcance limitado/),
    ).toBeInTheDocument()
  },
)
it.each([
  disabled,
  new ApiError(0, 'network'),
  new ApiError(401, 'session'),
  new ApiError(403, 'permission'),
  new ApiError(503, 'unknown'),
])(
  'query failure $status/$code blocks preparation without logout',
  async (error) => {
    vi.mocked(verification.requirements).mockRejectedValue(error)
    const view = mount(
      <>
        <Warning />
        <DriverOnboarding />
      </>,
    )
    await waitFor(() =>
      expect(
        screen.getAllByText(consultationError(error)).length,
      ).toBeGreaterThan(0),
    )
    expect(screen.queryByText(availabilityText.local)).toBeNull()
    expect(
      screen.getByRole('button', {
        name: 'Preparar expediente de identidad independiente',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Crear unidad pendiente' }),
    ).toBeDisabled()
    expect(view.logout).not.toHaveBeenCalled()
    expect(verification.command).not.toHaveBeenCalled()
  },
)
it('missing production policy preserves history/services and blocks only dependent preparation', async () => {
  vi.mocked(verification.terms).mockRejectedValue(missing)
  mount(
    <>
      <Warning />
      <DriverOnboarding />
    </>,
  )
  await screen.findByText(availabilityText.missing)
  expect(
    screen.getByRole('heading', { name: 'Expedientes e historial' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Mi servicio' })).toHaveAttribute(
    'href',
    '/driver/my-service',
  )
  expect(
    screen.getByRole('button', {
      name: 'Preparar expediente de identidad independiente',
    }),
  ).toBeDisabled()
  expect(screen.queryByText(availabilityText.local)).toBeNull()
  expect(verification.command).not.toHaveBeenCalled()
})
it('current requirements and policy allow preparation, never imply approval', async () => {
  mount(
    <>
      <Warning />
      <DriverOnboarding />
    </>,
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', {
        name: 'Preparar expediente de identidad independiente',
      }),
    ).toBeEnabled(),
  )
  expect(screen.getByText(/Perfil: Pendiente/)).toBeInTheDocument()
  expect(screen.queryByText(availabilityText.local)).toBeNull()
  expect(verification.command).not.toHaveBeenCalled()
})
it('a newer policy cannot use an older acceptance to prepare identity or a unit', async () => {
  vi.mocked(verification.terms).mockResolvedValue({
    ...publication,
    version: 'SYNTHETIC-2',
  })
  mount(<DriverOnboarding />)
  await screen.findByText('SYNTHETIC-2', { exact: true })
  expect(
    screen.getByRole('button', {
      name: 'Preparar expediente de identidad independiente',
    }),
  ).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'Crear unidad pendiente' }),
  ).toBeDisabled()
})
it('missing policy keeps dossier history/authorized withdrawal but blocks edits and uploads', async () => {
  vi.mocked(verification.terms).mockRejectedValue(missing)
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    environment: 'PRODUCTION',
    policyVersion: 'DOCUMENTARY-1',
    attachments: [
      {
        id: resource,
        category: 'FACE_PHOTO',
        status: 'VALIDATED',
        bytes: 100,
        mime: 'image/png',
        hash: 'a'.repeat(64),
        createdAt: '2026-10-19T00:00:00Z',
      },
    ],
  })
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'DRIVER',
    '/verification/cases/' + caseFixture.id,
  )
  await screen.findByText(availabilityText.missing)
  for (const name of [
    'Guardar datos',
    'Cargar imagen',
    'Presentar para revisión',
  ])
    expect(screen.getByRole('button', { name })).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'Retirar expediente' }),
  ).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Retirar referencia del borrador' }),
  ).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Ver evidencia' })).toBeEnabled()
  expect(
    screen.getByRole('heading', { name: 'Historial del expediente' }),
  ).toBeInTheDocument()
})
function Probe() {
  const runtime = useRequirements()
  const state = documentaryAvailability(runtime)
  return (
    <>
      <p data-testid="mode">{state.mode || state.kind}</p>
      <button onClick={() => void runtime.refetch()}>Refrescar prueba</button>
    </>
  )
}
it('a cancelled older response cannot replace the newer disabled state', async () => {
  const old = deferred<typeof production>()
  let signal: AbortSignal | undefined
  const query = vi
    .mocked(verification.requirements)
    .mockResolvedValueOnce(production)
    .mockImplementationOnce((s) => {
      signal = s
      return old.promise
    })
    .mockRejectedValueOnce(disabled)
  mount(<Probe />)
  await screen.findByText('PRODUCTION')
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(query).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('button'))
  await screen.findByText('disabled')
  expect(signal?.aborted).toBe(true)
  await act(async () => old.resolve(production))
  expect(screen.getByTestId('mode')).toHaveTextContent('disabled')
})
it('disabled to production is enabled by a fresh successful query, not a session capability', async () => {
  vi.mocked(verification.requirements)
    .mockRejectedValueOnce(disabled)
    .mockResolvedValue(production)
  mount(<Probe />)
  await screen.findByText('disabled')
  fireEvent.click(screen.getByRole('button'))
  await screen.findByText('PRODUCTION')
})
it('actor change isolates late requirements and never transfers test mode', async () => {
  const old = deferred<typeof requirements>()
  vi.mocked(verification.requirements)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue(production)
  const view = mount(<Probe />)
  view.changeActor(resource)
  await screen.findByText('PRODUCTION')
  await act(async () => old.resolve(requirements))
  expect(screen.getByTestId('mode')).toHaveTextContent('PRODUCTION')
})
it('scope change ignores older term results and preserves separate acceptance', async () => {
  const old = deferred<typeof publication>()
  vi.mocked(verification.terms).mockImplementation((_, provider) =>
    provider === providerId
      ? old.promise
      : Promise.resolve({ ...publication, scope: 'FLEET' }),
  )
  const view = mount(
    <TermsPanel providerId={providerId} providerName="Flotilla sintética" />,
    'PROVIDER_ADMIN',
  )
  await waitFor(() => expect(verification.terms).toHaveBeenCalled())
  view.changeChild(
    <TermsPanel
      providerId={resource}
      providerName="Segunda flotilla sintética"
    />,
  )
  await screen.findByText(publication.version, { exact: true })
  await act(async () =>
    old.resolve({ ...publication, scope: 'FLEET', version: 'OLD-FLEET' }),
  )
  expect(
    screen.getByRole('button', { name: 'Aceptar por esta flotilla' }),
  ).toBeDisabled()
  expect(screen.queryByText('OLD-FLEET')).toBeNull()
})
it('LOCAL_TEST to PRODUCTION ignores late trial policy and resets acceptance', async () => {
  const old = deferred<typeof terms>()
  vi.mocked(verification.requirements).mockResolvedValue(requirements)
  vi.mocked(verification.terms)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue(publication)
  mount(
    <>
      <Probe />
      <TermsPanel />
    </>,
  )
  await waitFor(() => expect(verification.terms).toHaveBeenCalledOnce())
  vi.mocked(verification.requirements).mockResolvedValue(production)
  fireEvent.click(screen.getByRole('button', { name: 'Refrescar prueba' }))
  await screen.findByText(publication.version, { exact: true })
  await act(async () => old.resolve(terms))
  expect(screen.queryByText(terms.version, { exact: true })).toBeNull()
  for (const box of screen.getAllByRole('checkbox'))
    expect(box).not.toBeChecked()
  expect(
    screen.getByRole('button', { name: 'Aceptar personalmente' }),
  ).toBeDisabled()
  expect(verification.command).not.toHaveBeenCalled()
})
it('requirements failures preserve unresolved markers without another command', async () => {
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(actor, 'PUBLISH_TERMS', 'POLICY', '/', {}, async () => {}),
  ).rejects.toThrow()
  const markers = readMarkers()
  vi.mocked(verification.requirements).mockRejectedValue(disabled)
  mount(<Warning />, 'SUPER_ADMIN')
  await screen.findByText(availabilityText.disabled)
  expect(readMarkers()).toEqual(markers)
  expect(verification.command).toHaveBeenCalledOnce()
})
it.each([disabled, missing])(
  'public registration uses explicit server errors, never calls protected requirements ($code)',
  async (error) => {
    vi.spyOn(verification, 'register').mockRejectedValue(error)
    mount(<Register />, null)
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: 'synthetic@example.invalid' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar correo de registro' }),
    )
    await screen.findByRole('alert')
    expect(
      screen.getByRole('button', { name: 'Solicitar correo de registro' }),
    ).toBeDisabled()
    expect(verification.requirements).not.toHaveBeenCalled()
    expect(
      within(
        screen.getByLabelText('Aviso de verificación documental'),
      ).queryByText(availabilityText.local),
    ).toBeNull()
  },
)
