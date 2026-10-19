import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { TermsForm, TermsPanel } from '../verification/terms'
import { PublicationPage } from '../verification/publications'
import {
  CaseDetail,
  DriverOnboarding,
  ReceiptPage,
} from '../verification/pages'
import { Recovery } from '../verification/common'
import { verification } from '../verification/service'
import {
  readMarkers,
  reconcile,
  runVerification,
} from '../verification/pending'
import { ApiError } from '../services/errors'
import type { Role } from '../types/api'
import type {
  Terms,
  VerificationPolicy,
  PublicationReceipt,
} from '../verification/types'
import {
  actor,
  providerId,
  resource,
  terms,
  requirements,
  onboarding,
  caseFixture,
  emptyPage,
} from './verification-fixtures'

export const productionTerms: Terms = {
  ...terms,
  version: 'SYNTHETIC-DRIVER-1',
  environment: 'PRODUCTION',
  privacyVersion: 'SYNTHETIC-PRIVACY-1',
  privacyText: 'AVISO SINTÉTICO SIN VALIDEZ JURÍDICA.',
  privacyHash: 'b'.repeat(64),
  publishedAt: '2026-10-19T00:00:00Z',
  specificConsents: [
    {
      id: 'purpose_one',
      text: 'FINALIDAD SINTÉTICA UNO.',
      hash: 'c'.repeat(64),
    },
    {
      id: 'purpose_two',
      text: 'FINALIDAD SINTÉTICA DOS.',
      hash: 'd'.repeat(64),
    },
  ],
}
const policy: VerificationPolicy = {
  revision: 3,
  enabled: false,
  environment: 'LOCAL_TEST',
  driverTermsVersion: 'DRIVER-LOCAL-TEST-1',
  fleetTermsVersion: 'FLEET-LOCAL-TEST-1',
  productionDriverTermsVersion: null,
  productionFleetTermsVersion: null,
}
const publication: PublicationReceipt = {
  version: productionTerms.version,
  hash: productionTerms.hash,
  scope: 'DRIVER',
  environment: 'PRODUCTION',
  publishedAt: productionTerms.publishedAt!,
  policyRevision: 4,
  enforcementEnabled: false,
}
function mount(child: ReactNode, role: Role = 'DRIVER', path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          user: {
            id: actor,
            email: 'synthetic@example.invalid',
            role,
            active: true,
            emailVerifiedAt: '2026-10-19T00:00:00Z',
            createdAt: '',
            updatedAt: '',
          },
          loading: false,
          expired: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          restore: vi.fn(),
        }}
      >
        <FeedbackProvider>
          <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
  return { ...render(child, { wrapper }), client }
}
beforeEach(() => {
  vi.spyOn(verification, 'terms').mockResolvedValue(productionTerms)
  vi.spyOn(verification, 'policy').mockResolvedValue(policy)
  vi.spyOn(verification, 'requirements').mockResolvedValue({
    ...requirements,
    environment: 'PRODUCTION',
    policyVersion: 'DOCUMENTARY-1',
  })
  vi.spyOn(verification, 'onboarding').mockResolvedValue({
    ...onboarding,
    environment: 'PRODUCTION',
  })
  vi.spyOn(verification, 'get').mockResolvedValue(caseFixture)
  vi.spyOn(verification, 'list').mockResolvedValue(emptyPage)
  vi.spyOn(verification, 'notices').mockResolvedValue([])
  vi.spyOn(verification, 'command').mockResolvedValue({
    id: resource,
    status: 'ACCEPTED',
    productionApplicable: true,
  })
})
it('renders complete terms, privacy and each specific purpose with initially unchecked separate controls', () => {
  mount(<TermsForm terms={productionTerms} refresh={vi.fn()} />)
  expect(screen.getAllByRole('region')).toHaveLength(4)
  expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  screen
    .getAllByRole('checkbox')
    .forEach((box) => expect(box).not.toBeChecked())
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  expect(
    screen.getByRole('button', { name: 'Aceptar personalmente' }),
  ).toBeDisabled()
  expect(verification.command).not.toHaveBeenCalled()
})
it('accepts only exact versions and individual consent hashes, no approval or publication mutation', async () => {
  mount(<TermsForm terms={productionTerms} refresh={vi.fn()} />)
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar personalmente' }))
  await screen.findByText(/Comprobante recibido/)
  expect(verification.command).toHaveBeenCalledOnce()
  expect(
    vi.mocked(verification.command).mock.calls[0].slice(0, 3),
  ).toMatchObject([
    { actor, operation: 'ACCEPT_TERMS', target: 'DRIVER' },
    '/verification-terms/accept',
    {
      version: productionTerms.version,
      hash: productionTerms.hash,
      privacyVersion: productionTerms.privacyVersion,
      privacyHash: productionTerms.privacyHash,
      privacyAcknowledged: true,
      specificConsents: productionTerms.specificConsents!.map(
        ({ id, hash }) => ({ id, hash, accepted: true }),
      ),
    },
  ])
  expect(
    screen.getByText(/Aceptar no aprueba el expediente/),
  ).toBeInTheDocument()
  screen
    .getAllByRole('checkbox')
    .forEach((box) => expect(box).not.toBeChecked())
})
it.each([
  { privacyHash: null },
  { publishedAt: null },
  { environment: undefined },
  { specificConsents: undefined },
  { privacyText: '' },
])('fails closed with incomplete provenance/publication %j', (patch) => {
  mount(
    <TermsForm
      terms={{ ...productionTerms, ...patch } as Terms}
      refresh={vi.fn()}
    />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent(/incompleta/)
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  expect(
    screen.getByRole('button', { name: /Aceptar personalmente/ }),
  ).toBeDisabled()
})
it('version replacement resets every consent even when scope remains identical', () => {
  const r = mount(<TermsForm terms={productionTerms} refresh={vi.fn()} />)
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  r.rerender(
    <TermsForm
      terms={{
        ...productionTerms,
        version: 'SYNTHETIC-DRIVER-2',
        hash: 'e'.repeat(64),
      }}
      refresh={vi.fn()}
    />,
  )
  screen
    .getAllByRole('checkbox')
    .forEach((box) => expect(box).not.toBeChecked())
  expect(
    screen.getByRole('button', { name: 'Aceptar personalmente' }),
  ).toBeDisabled()
})
it('409 acceptance conflict fetches current policy and requires new consultation, never automatic resend', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(409, 'conflict', 'TERMS_VERSION_CONFLICT'),
  )
  vi.mocked(verification.terms)
    .mockResolvedValueOnce(productionTerms)
    .mockResolvedValue({ ...productionTerms, version: 'SYNTHETIC-DRIVER-2' })
  mount(<TermsPanel />)
  await screen.findByText('SYNTHETIC-DRIVER-1', { exact: true })
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar personalmente' }))
  await screen.findByText('SYNTHETIC-DRIVER-2', { exact: true })
  screen
    .getAllByRole('checkbox')
    .forEach((box) => expect(box).not.toBeChecked())
  expect(verification.command).toHaveBeenCalledOnce()
  expect(screen.queryByText(/Comprobante recibido/)).toBeNull()
})
it('missing publication preserves onboarding/history and blocks new case preparation', async () => {
  vi.mocked(verification.terms).mockRejectedValue(
    new ApiError(503, 'missing', 'VERIFICATION_PUBLICATION_REQUIRED'),
  )
  vi.mocked(verification.onboarding).mockResolvedValue({
    ...onboarding,
    environment: 'PRODUCTION',
    terms: {
      requiredVersion: null,
      acceptance: null,
      blockingReason: 'VERIFICATION_PUBLICATION_REQUIRED',
    },
  })
  mount(<DriverOnboarding />)
  expect(
    await screen.findByText(/No hay una publicación vigente/),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', {
      name: 'Preparar expediente de identidad independiente',
    }),
  ).toBeDisabled()
  expect(screen.getByRole('link', { name: 'Mi servicio' })).toHaveAttribute(
    'href',
    '/driver/my-service',
  )
  expect(verification.command).not.toHaveBeenCalled()
})
it('FLEET representative sends separate scope, never personal DRIVER consent', async () => {
  mount(
    <TermsForm
      terms={{ ...productionTerms, scope: 'FLEET' }}
      providerId={providerId}
      refresh={vi.fn()}
    />,
    'PROVIDER_ADMIN',
  )
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  fireEvent.click(
    screen.getByRole('button', { name: 'Aceptar por esta flotilla' }),
  )
  await screen.findByText(/Comprobante recibido/)
  expect(
    vi.mocked(verification.command).mock.calls[0].slice(0, 3),
  ).toMatchObject([
    { target: 'FLEET:' + providerId },
    '/verification-terms/accept',
    { scope: 'FLEET', providerId },
  ])
})
it.each(['DRIVER', 'PROVIDER_ADMIN'] as const)(
  'does not expose publication to %s or read privileged policy',
  (role) => {
    mount(<PublicationPage />, role)
    expect(screen.getByRole('alert')).toHaveTextContent('Sólo SUPER_ADMIN')
    expect(verification.policy).not.toHaveBeenCalled()
  },
)
async function preparePublication() {
  mount(<PublicationPage />, 'SUPER_ADMIN')
  await screen.findByText(/Política vigente · revisión 3/)
  fireEvent.change(screen.getByLabelText('Versión de términos'), {
    target: { value: 'SYNTHETIC-DRIVER-2' },
  })
  fireEvent.change(screen.getByLabelText('Texto completo de términos'), {
    target: { value: 'SYNTHETIC ONLY. Not legal terms.' },
  })
  fireEvent.change(screen.getByLabelText('Versión de privacidad'), {
    target: { value: 'SYNTHETIC-PRIVACY-2' },
  })
  fireEvent.change(
    screen.getByLabelText('Texto completo del aviso de privacidad'),
    { target: { value: 'SYNTHETIC ONLY. Not a legal notice.' } },
  )
  fireEvent.change(
    screen.getByLabelText('Referencia no secreta de autorización'),
    { target: { value: 'SYNTHETIC-AUTHORIZATION' } },
  )
  expect(
    screen.getByRole('button', { name: 'Revisar publicación' }),
  ).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Revisar publicación' }))
  await screen.findByRole('dialog')
}
it('admin previews immutable exact texts, confirms once, updates pointers but never activates policy', async () => {
  vi.mocked(verification.command).mockResolvedValue(publication)
  await preparePublication()
  expect(verification.command).not.toHaveBeenCalled()
  expect(
    screen.getByRole('region', { name: 'Términos a publicar' }),
  ).toHaveTextContent('SYNTHETIC ONLY')
  fireEvent.click(
    screen.getByRole('button', { name: 'Publicar versión autorizada' }),
  )
  await screen.findByText('Comprobante histórico de publicación')
  expect(verification.command).toHaveBeenCalledOnce()
  expect(
    vi.mocked(verification.command).mock.calls[0].slice(0, 3),
  ).toMatchObject([
    { operation: 'PUBLISH_TERMS', target: 'POLICY' },
    '/admin/verification-terms/publications',
    {
      expectedVersion: 3,
      scope: 'DRIVER',
      publicationAuthorized: true,
      specificConsents: [],
    },
  ])
  expect(
    screen.getByText(/Control de admisión: no activado/),
  ).toBeInTheDocument()
})
it('publication conflict demands a new explicit review without retry', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(409, 'conflict', 'VERIFICATION_VERSION_CONFLICT'),
  )
  await preparePublication()
  vi.mocked(verification.policy).mockResolvedValue({ ...policy, revision: 4 })
  fireEvent.click(
    screen.getByRole('button', { name: 'Publicar versión autorizada' }),
  )
  await screen.findByText(/Política vigente · revisión 4/)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(verification.command).toHaveBeenCalledOnce()
})
it.each([
  ['VERIFICATION_VERSION_EXISTS', /ya existe y es inmutable/],
  ['PRIVACY_VERSION_CONFLICT', /ya identifica otro texto/],
] as const)(
  'publication conflict %s preserves review and never overwrites published content',
  async (code, message) => {
    vi.mocked(verification.command).mockRejectedValue(
      new ApiError(409, 'conflict', code),
    )
    await preparePublication()
    fireEvent.click(
      screen.getByRole('button', { name: 'Publicar versión autorizada' }),
    )
    await waitFor(() =>
      expect(screen.getAllByText(message).length).toBeGreaterThan(0),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Comprobante histórico de publicación',
      }),
    ).toBeNull()
    expect(verification.command).toHaveBeenCalledOnce()
  },
)
it('SUPER_ADMIN cannot publish when backend runtime is LOCAL_TEST, irrespective of policy pointers', async () => {
  vi.mocked(verification.requirements).mockResolvedValue(requirements)
  mount(<PublicationPage />, 'SUPER_ADMIN')
  await screen.findByText(/La publicación requiere el entorno productivo/)
  expect(
    screen.queryByRole('button', { name: 'Revisar publicación' }),
  ).toBeNull()
  expect(verification.command).not.toHaveBeenCalled()
})
it('lost acceptance does not show confirmed receipt and cannot send a new intention', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(0, 'response lost'),
  )
  mount(<TermsForm terms={productionTerms} refresh={vi.fn()} />)
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar personalmente' }))
  await screen.findByRole('alert')
  expect(screen.queryByText(/Comprobante recibido/)).toBeNull()
  expect(readMarkers()).toHaveLength(1)
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  expect(
    screen.getByRole('button', { name: 'Aceptar personalmente' }),
  ).toBeDisabled()
  expect(verification.command).toHaveBeenCalledOnce()
})
it('lost publication persists only minimal marker; GET historical result and newer policy never replay POST', async () => {
  const refresh = vi.fn().mockResolvedValue(undefined)
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(
      actor,
      'PUBLISH_TERMS',
      'POLICY',
      '/admin/verification-terms/publications',
      {
        text: 'SENSITIVE-FIXTURE-NOT-TO-STORE',
        approvalReference: 'NO-PERSIST',
      },
      refresh,
    ),
  ).rejects.toThrow()
  const marker = readMarkers()[0]
  expect(Object.keys(marker).sort()).toEqual([
    'actor',
    'key',
    'operation',
    'target',
  ])
  expect(JSON.stringify(localStorage)).not.toContain('NO-PERSIST')
  vi.spyOn(verification, 'attempt').mockResolvedValue({
    state: 'APPLIED',
    result: publication,
  })
  vi.mocked(verification.policy).mockResolvedValue({
    ...policy,
    revision: 7,
    productionDriverTermsVersion: 'SYNTHETIC-NEWER',
  })
  mount(<Recovery />, 'SUPER_ADMIN')
  fireEvent.click(screen.getByRole('button', { name: 'Consultar intento' }))
  await screen.findByText(/Publicación recuperada · fotografía histórica/)
  expect(screen.getByText(/revisión 4.*Puede existir/)).toBeInTheDocument()
  expect(verification.attempt).toHaveBeenCalledWith(marker, false)
  expect(verification.command).toHaveBeenCalledOnce()
  expect(verification.get).not.toHaveBeenCalled()
  expect(readMarkers()).toEqual([])
})
it.each([
  { state: 'ABSENT' as const },
  { state: 'APPLIED' as const, result: { id: resource, status: 'ACCEPTED' } },
])(
  'publication unavailable/incorrect receipt retains marker %j',
  async (response) => {
    vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
    await expect(
      runVerification(
        actor,
        'PUBLISH_TERMS',
        'POLICY',
        '/',
        {},
        async () => {},
      ),
    ).rejects.toThrow()
    const m = readMarkers()[0]
    vi.spyOn(verification, 'attempt').mockResolvedValue(response)
    try {
      await reconcile(m, actor, async () => {})
    } catch {
      /* incompatible public result */
    }
    expect(readMarkers()).toEqual([m])
    expect(verification.command).toHaveBeenCalledOnce()
  },
)
it('different actor cannot recover publication', async () => {
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(actor, 'PUBLISH_TERMS', 'POLICY', '/', {}, async () => {}),
  ).rejects.toThrow()
  const attempt = vi.spyOn(verification, 'attempt')
  await expect(
    reconcile(readMarkers()[0], resource, async () => {}),
  ).rejects.toThrow(/iniciadora/)
  expect(attempt).not.toHaveBeenCalled()
})
it.each(['DRIVER', 'SUPER_ADMIN'] as const)(
  'historical LOCAL_TEST cannot be uploaded, submitted or approved in production (%s)',
  async (role) => {
    vi.mocked(verification.get).mockResolvedValue({
      ...caseFixture,
      status: role === 'SUPER_ADMIN' ? 'SUBMITTED' : 'DRAFT',
    })
    mount(
      <Routes>
        <Route path="/verification/cases/:id" element={<CaseDetail />} />
      </Routes>,
      role,
      '/verification/cases/' + caseFixture.id,
    )
    await screen.findByText(/Expediente histórico o sin procedencia/)
    expect(
      screen.queryByRole('button', { name: 'Presentar para revisión' }),
    ).toBeNull()
    expect(screen.queryByText('Decisión SUPER_ADMIN')).toBeNull()
    expect(screen.queryByLabelText(/Archivo/)).toBeNull()
    if (role === 'DRIVER')
      expect(
        screen.getByRole('button', { name: 'Retirar expediente' }),
      ).toBeEnabled()
    expect(verification.command).not.toHaveBeenCalled()
  },
)
it('production decision uses returned checklist and does not infer approval from acceptance', async () => {
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    environment: 'PRODUCTION',
    policyVersion: 'DOCUMENTARY-1',
    status: 'SUBMITTED',
  })
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'SUPER_ADMIN',
    '/verification/cases/' + caseFixture.id,
  )
  await screen.findByText('Decisión SUPER_ADMIN')
  expect(verification.command).not.toHaveBeenCalled()
  screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box))
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar decisión explícita' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toMatchObject({
    checklistVersion: 'DOCUMENTARY-1',
    decision: 'APPROVE',
  })
})
it('historical receipt with missing productive provenance never claims production or fills old consents', async () => {
  vi.spyOn(verification, 'acceptance').mockResolvedValue({
    id: resource,
    userId: actor,
    scope: 'DRIVER',
    providerId: null,
    contractuallyEffective: false,
    terms,
  })
  mount(
    <Routes>
      <Route path="/verification/acceptances/:id" element={<ReceiptPage />} />
    </Routes>,
    'DRIVER',
    '/verification/acceptances/' + resource,
  )
  await screen.findByText(/No se acredita aceptación productiva/)
  expect(
    screen.getByText(/Aviso reconocido: No registrado/),
  ).toBeInTheDocument()
  expect(verification.command).not.toHaveBeenCalled()
})
