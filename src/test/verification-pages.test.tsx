import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { App } from '../app/App'
import { verification, putEvidence } from '../verification/service'
import {
  TermsForm,
  Register,
  RegistrationConfirm,
} from '../verification/identity'
import {
  DriverOnboarding,
  CaseDetail,
  VerificationLayout,
} from '../verification/pages'
import { CaseForm } from '../verification/forms'
import { Evidence } from '../verification/evidence'
import { Recovery } from '../verification/common'
import {
  actor,
  resource,
  caseId,
  attachmentId,
  providerId,
  caseFixture,
  requirements,
  terms,
  onboarding,
  emptyPage,
} from './verification-fixtures'
import { ApiError, normalizeError } from '../services/errors'
import type { Role } from '../types/api'
vi.mock('../verification/service', async (original) => ({
  ...(await original<typeof import('../verification/service')>()),
  putEvidence: vi.fn(),
  verification: {
    register: vi.fn(),
    confirm: vi.fn(),
    terms: vi.fn(),
    command: vi.fn(),
    requirements: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    onboarding: vi.fn(),
    notices: vi.fn(),
    access: vi.fn(),
    attempt: vi.fn(),
    acceptance: vi.fn(),
    emailRequest: vi.fn(),
    emailConfirm: vi.fn(),
  },
}))
function mount(child: ReactNode, role: Role = 'DRIVER', path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id: actor,
      email: 'synthetic@example.test',
      role,
      active: true,
      emailVerifiedAt: '2026-10-13T00:00:00Z',
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
            <MemoryRouter initialEntries={[path]}>{child}</MemoryRouter>
          </FeedbackProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
    client,
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(verification.requirements).mockResolvedValue(requirements)
  vi.mocked(verification.get).mockResolvedValue(caseFixture)
  vi.mocked(verification.list).mockResolvedValue(emptyPage)
  vi.mocked(verification.onboarding).mockResolvedValue(onboarding)
  vi.mocked(verification.terms).mockResolvedValue(terms)
  vi.mocked(verification.notices).mockResolvedValue([])
  vi.mocked(verification.command).mockResolvedValue({
    id: caseId,
    status: 'DRAFT',
    revision: 4,
  })
})
it('pending independent without provider accesses onboarding, not automatic operation', async () => {
  mount(<DriverOnboarding />)
  expect(
    await screen.findByText(/Independiente sin proveedor/),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Mi servicio' })).toHaveAttribute(
    'href',
    '/driver/my-service',
  )
  expect(verification.command).not.toHaveBeenCalled()
  expect(screen.queryByText('TOMAR SERVICIO')).toBeNull()
})
it('terms are full text, unchecked, exact version/hash sent explicitly', async () => {
  mount(<TermsForm terms={terms} refresh={vi.fn()} />)
  expect(screen.getByRole('region')).toHaveTextContent(terms.text)
  const box = screen.getByRole('checkbox')
  expect(box).not.toBeChecked()
  expect(
    screen.getByRole('button', { name: 'Aceptar personalmente (prueba)' }),
  ).toBeDisabled()
  fireEvent.click(box)
  fireEvent.click(
    screen.getByRole('button', { name: 'Aceptar personalmente (prueba)' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
    scope: 'DRIVER',
    version: terms.version,
    hash: terms.hash,
    accepted: true,
    method: 'WEB_CHECKBOX_BUTTON',
  })
  expect(box).not.toBeChecked()
})
it('new terms version remount requires fresh consent', () => {
  const wrap = (v: string) => (
    <TermsForm key={v} terms={{ ...terms, version: v }} refresh={vi.fn()} />
  )
  const view = mount(wrap('1'))
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByRole('checkbox')).toBeChecked()
  view.unmount()
  mount(wrap('2'))
  expect(screen.getByRole('checkbox')).not.toBeChecked()
})
it('representative accepts FLEET only, cannot accept for a driver', async () => {
  mount(
    <TermsForm
      terms={{ ...terms, scope: 'FLEET' }}
      providerId={providerId}
      refresh={vi.fn()}
    />,
    'PROVIDER_ADMIN',
  )
  expect(
    screen.queryByRole('button', { name: 'Aceptar personalmente (prueba)' }),
  ).toBeNull()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Aceptar por esta flotilla (prueba)' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toMatchObject({
    scope: 'FLEET',
    providerId,
  })
  expect(vi.mocked(verification.command).mock.calls[0][0].target).toBe(
    'FLEET:' + providerId,
  )
})
it('lost acceptance response shows blocker without a confirmed receipt', async () => {
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  mount(
    <>
      <Recovery />
      <TermsForm terms={terms} refresh={vi.fn()} />
    </>,
  )
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Aceptar personalmente (prueba)' }),
  )
  expect(
    await screen.findByText('Pendiente de reconciliación'),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Comprobante de prueba recibido/)).toBeNull()
  expect(verification.command).toHaveBeenCalledOnce()
})
it('identity license sends exact types and ISO expiry', async () => {
  mount(<CaseForm record={caseFixture} />)
  fireEvent.click(screen.getByRole('checkbox', { name: /Declarar licencia/ }))
  fireEvent.change(screen.getByLabelText('Emisor *'), {
    target: { value: 'Emisor sintético' },
  })
  fireEvent.change(screen.getByLabelText('Categoría *'), {
    target: { value: 'Categoría sintética' },
  })
  fireEvent.change(screen.getByLabelText('Vencimiento, hora local *'), {
    target: { value: '2027-10-13T12:00' },
  })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Motocicleta' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
  await waitFor(() => expect(verification.command).toHaveBeenCalled())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toMatchObject({
    expectedVersion: 3,
    data: { documentType: 'INE', license: { vehicleTypes: ['MOTORCYCLE'] } },
  })
})
it.each(['OWNED', 'RENTED', 'BORROWED'] as const)(
  'unit ownership %s sends separate evidence mode',
  async (ownership) => {
    mount(
      <CaseForm
        record={{
          ...caseFixture,
          subjectType: 'VEHICLE',
          data: {
            declaredOwnerName: 'Titular sintético',
            serialNumber: 'SYNTHETIC-001',
            ownershipEvidenceType: ownership,
          },
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
    await waitFor(() => expect(verification.command).toHaveBeenCalled())
    expect(vi.mocked(verification.command).mock.calls[0][2]).toMatchObject({
      data: {
        ownershipEvidenceType: ownership,
        declaredOwnerName: 'Titular sintético',
      },
    })
  },
)
it('fleet driver can consult identity but cannot edit/upload its fleet dossier', async () => {
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    scope: { providerId, independentProfileId: null },
  })
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'DRIVER',
    '/verification/cases/' + caseId,
  )
  await screen.findByText(/Identidad · Borrador/)
  expect(screen.queryByRole('button', { name: 'Guardar datos' })).toBeNull()
  expect(
    screen.queryByRole('button', { name: 'Cargar imagen sintética' }),
  ).toBeNull()
})
it.each(['DRIVER', 'PROVIDER_ADMIN'] as const)(
  'role %s is denied admin review route',
  async (role) => {
    mount(<App />, role, '/admin/verification-cases')
    expect(await screen.findByText(/Sin permisos/)).toBeInTheDocument()
    expect(verification.list).not.toHaveBeenCalled()
  },
)
it('SUPER_ADMIN reviews exact revision with unchecked checklist; rejection requires reason', async () => {
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    status: 'SUBMITTED',
  })
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'SUPER_ADMIN',
    '/verification/cases/' + caseId,
  )
  await screen.findByText('Decisión SUPER_ADMIN')
  expect(
    screen
      .getAllByRole('checkbox')
      .every((c) => !(c as HTMLInputElement).checked),
  ).toBe(true)
  fireEvent.change(screen.getByLabelText('Resultado'), {
    target: { value: 'REJECT' },
  })
  fireEvent.change(screen.getByLabelText('Motivo público *'), {
    target: { value: 'Imagen sintética ilegible' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar decisión explícita' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalled())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
    expectedVersion: 3,
    decision: 'REJECT',
    checklistVersion: 'LOCAL-TEST-1',
    passedChecks: [],
    publicReason: 'Imagen sintética ilegible',
  })
})
it('terminal rejection offers new case, never edits reviewed snapshot', async () => {
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    status: 'REJECTED',
    publicReason: 'Corregir sintético',
  })
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'DRIVER',
    '/verification/cases/' + caseId,
  )
  await screen.findByText(/Motivo de decisión/)
  expect(screen.queryByRole('button', { name: 'Guardar datos' })).toBeNull()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Preparar nueva corrección' }),
    ).toBeEnabled(),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Preparar nueva corrección' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalled())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
    subjectType: 'DRIVER_IDENTITY',
    subjectId: resource,
  })
})
it('mail failure does not turn approved decision into rejection', async () => {
  vi.mocked(verification.notices).mockResolvedValue([
    {
      id: attachmentId,
      caseId,
      status: 'FAILED',
      createdAt: terms.createdAt,
      case: {
        status: 'APPROVED',
        publicReason: null,
        decidedAt: terms.createdAt,
      },
    },
  ])
  mount(<DriverOnboarding />)
  expect(await screen.findByText(/Aviso fallido/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Aprobado' })).toBeInTheDocument()
})
it('registration and confirmation never authenticate or approve automatically', async () => {
  vi.mocked(verification.register).mockResolvedValue({ status: 'CHECK_EMAIL' })
  mount(<Register />)
  fireEvent.change(screen.getByLabelText('Correo electrónico *'), {
    target: { value: 'synthetic@example.test' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Solicitar correo de registro' }),
  )
  expect(await screen.findByText(/Revisa tu correo/)).toBeInTheDocument()
  expect(verification.command).not.toHaveBeenCalled()
})
it('confirmation uses token in body and returns to safe login', async () => {
  vi.mocked(verification.confirm).mockResolvedValue({
    status: 'CONFIRMED_LOGIN_REQUIRED',
  })
  mount(
    <Routes>
      <Route path="/" element={<RegistrationConfirm />} />
      <Route path="/login" element={<p>LOGIN SEGURO</p>} />
    </Routes>,
  )
  fireEvent.change(screen.getByLabelText('Código de confirmación *'), {
    target: { value: 's'.repeat(43) },
  })
  fireEvent.change(screen.getByLabelText('Nombre *'), {
    target: { value: 'Persona sintética' },
  })
  fireEvent.change(
    screen.getByLabelText('Contraseña nueva (16–128 caracteres) *'),
    { target: { value: 'synthetic-password-only' } },
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar y continuar a login' }),
  )
  expect(await screen.findByText('LOGIN SEGURO')).toBeInTheDocument()
  expect(JSON.stringify(localStorage)).not.toContain('synthetic-password')
})
it('PNG preview is revoked on unmount and never stored in query cache', async () => {
  const revoke = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:synthetic'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revoke,
  })
  vi.mocked(verification.access).mockResolvedValue(
    new Blob(['synthetic'], { type: 'image/png' }),
  )
  const view = mount(
    <Evidence
      record={{
        ...caseFixture,
        attachments: [
          {
            id: attachmentId,
            category: 'FACE_PHOTO',
            status: 'VALIDATED',
            mime: 'image/png',
            bytes: 10,
            hash: 'synthetic',
            createdAt: terms.createdAt,
          },
        ],
      }}
      requirements={requirements}
      canWrite={false}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Ver evidencia' }))
  expect(await screen.findByAltText(/Evidencia privada/)).toBeInTheDocument()
  expect(JSON.stringify(view.client.getQueryCache().getAll())).not.toContain(
    'blob:',
  )
  view.unmount()
  expect(revoke).toHaveBeenCalledWith('blob:synthetic')
})
it('late evidence response after leaving never creates a preview', async () => {
  let resolve!: (b: Blob) => void
  vi.mocked(verification.access).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const create = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: create,
  })
  const view = mount(
    <Evidence
      record={{
        ...caseFixture,
        attachments: [
          {
            id: attachmentId,
            category: 'FACE_PHOTO',
            status: 'VALIDATED',
            mime: 'image/png',
            bytes: 10,
            hash: 'synthetic',
            createdAt: terms.createdAt,
          },
        ],
      }}
      requirements={requirements}
      canWrite={false}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Ver evidencia' }))
  view.unmount()
  await act(async () => resolve(new Blob(['synthetic'])))
  expect(create).not.toHaveBeenCalled()
})
it('main incident route never calls QA API', async () => {
  mount(<App />, 'SUPER_ADMIN', '/custody-incidents')
  expect(
    await screen.findByText(/ejecución detallada no está disponible/),
  ).toBeInTheDocument()
})
it('documentary frame is isolated by route and user', async () => {
  mount(
    <Routes>
      <Route element={<VerificationLayout />}>
        <Route path="/" element={<p>Ámbito sintético</p>} />
      </Route>
    </Routes>,
  )
  expect(screen.getByText('Ámbito sintético')).toBeInTheDocument()
  expect(
    await screen.findByText(/Modo de prueba. Usa exclusivamente/),
  ).toBeInTheDocument()
})

it('submit and withdraw require confirmation and current revision', async () => {
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'DRIVER',
    '/verification/cases/' + caseId,
  )
  const submit = await screen.findByRole('button', {
    name: 'Presentar para revisión',
  })
  await waitFor(() => expect(submit).toBeEnabled())
  fireEvent.click(submit)
  expect(verification.command).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
    expectedVersion: 3,
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Retirar expediente' }),
    ).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Retirar expediente' }))
  expect(verification.command).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(verification.command).toHaveBeenCalledTimes(2))
  expect(vi.mocked(verification.command).mock.calls[1][1]).toBe(
    '/verification-cases/' + caseId + '/withdraw',
  )
})
it.each(['DRIVER_IDENTITY', 'VEHICLE'] as const)(
  'missing documents in %s remain readable inside confirmation without another command',
  async (subjectType) => {
    vi.mocked(verification.get).mockResolvedValue({
      ...caseFixture,
      subjectType,
    })
    vi.mocked(verification.command).mockRejectedValue(
      normalizeError(409, {
        code: 'VERIFICATION_DOCUMENTS_PENDING',
        message: 'PRIVATE_BACKEND_DETAIL',
      }),
    )
    mount(
      <Routes>
        <Route path="/verification/cases/:id" element={<CaseDetail />} />
      </Routes>,
      'DRIVER',
      '/verification/cases/' + caseId,
    )
    const submit = await screen.findByRole('button', {
      name: 'Presentar para revisión',
    })
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() =>
      expect(dialog).toHaveTextContent(
        'Faltan documentos requeridos con formato validado. Revisa las categorías del expediente y completa las cargas pendientes.',
      ),
    )
    expect(dialog).not.toHaveTextContent('PRIVATE_BACKEND_DETAIL')
    expect(dialog).not.toHaveTextContent('La operación entra en conflicto')
    expect(verification.command).toHaveBeenCalledOnce()
    expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
      expectedVersion: 3,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(verification.command).toHaveBeenCalledOnce()
  },
)

it('unknown conflicts keep the generic message and do not invent missing documents', () => {
  const error = normalizeError(409, {
    code: 'UNKNOWN_CONFLICT',
    message: 'PRIVATE_BACKEND_DETAIL',
  })
  expect(error.message).toContain('La operación entra en conflicto')
  expect(error.message).not.toContain('documentos requeridos')
  expect(error.message).not.toContain('PRIVATE_BACKEND_DETAIL')
})
it('version conflict refreshes the dossier and announces it without another decision', async () => {
  vi.mocked(verification.get).mockResolvedValue({
    ...caseFixture,
    status: 'SUBMITTED',
  })
  vi.mocked(verification.command).mockImplementation(async () => {
    vi.mocked(verification.get).mockResolvedValue({
      ...caseFixture,
      status: 'APPROVED',
      revision: 4,
    })
    throw new ApiError(409, 'changed', 'VERIFICATION_VERSION_CONFLICT')
  })
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'SUPER_ADMIN',
    '/verification/cases/' + caseId,
  )
  await screen.findByText('Decisión SUPER_ADMIN')
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar decisión explícita' }),
  )
  expect(
    await screen.findByRole('heading', { name: 'Identidad · Aprobado' }),
  ).toBeInTheDocument()
  expect(
    await screen.findByText(/El expediente o la política cambió/),
  ).toBeInTheDocument()
  expect(verification.command).toHaveBeenCalledOnce()
  expect(
    screen.queryByRole('button', { name: 'Registrar decisión explícita' }),
  ).toBeNull()
})
it('incomplete upload is completed explicitly with the freshly queried version', async () => {
  vi.mocked(verification.get).mockResolvedValue({ ...caseFixture, revision: 8 })
  mount(
    <Evidence
      record={{
        ...caseFixture,
        attachments: [
          {
            id: attachmentId,
            category: 'FACE_PHOTO',
            status: 'CREATED',
            bytes: null,
            mime: null,
            hash: null,
            createdAt: terms.createdAt,
          },
        ],
      }}
      requirements={requirements}
      canWrite
    />,
  )
  expect(verification.command).not.toHaveBeenCalled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar y completar carga' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
    expectedVersion: 8,
  })
  expect(putEvidence).not.toHaveBeenCalled()
})
it('private dossier data is removed from query cache after leaving', async () => {
  const view = mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'DRIVER',
    '/verification/cases/' + caseId,
  )
  await screen.findByRole('heading', { name: 'Identidad · Borrador' })
  expect(view.client.getQueryCache().getAll().length).toBeGreaterThan(0)
  view.unmount()
  await waitFor(() =>
    expect(view.client.getQueryCache().getAll()).toHaveLength(0),
  )
  expect(JSON.stringify(localStorage)).not.toContain('Persona Sintética')
})

it.each([false, true])(
  'upload transfer failure=%s never approves or submits the case',
  async (failed) => {
    vi.mocked(verification.command).mockResolvedValueOnce({
      id: attachmentId,
      status: 'CREATED',
      revision: 4,
      expiresAt: '2099-01-01T00:00:00Z',
      uploadUrl: 'https://storage.example.test/synthetic',
    })
    vi.mocked(verification.get).mockResolvedValue({
      ...caseFixture,
      revision: 4,
    })
    if (failed)
      vi.mocked(putEvidence).mockRejectedValueOnce(
        new Error('Carga no confirmada'),
      )
    else vi.mocked(putEvidence).mockResolvedValueOnce(undefined)
    const data = new FormData()
    data.set(
      'file',
      new File(['synthetic'], 'synthetic.png', { type: 'image/png' }),
    )
    data.set('category', 'FACE_PHOTO')
    const fd = vi.spyOn(globalThis, 'FormData').mockImplementation(function () {
      return data
    })
    try {
      const view = mount(
        <Evidence record={caseFixture} requirements={requirements} canWrite />,
      )
      fireEvent.submit(view.container.querySelector('form')!)
      await waitFor(() => expect(putEvidence).toHaveBeenCalledOnce())
      if (failed) {
        expect(
          await screen.findByText('Carga no confirmada'),
        ).toBeInTheDocument()
        expect(verification.command).toHaveBeenCalledOnce()
      } else {
        await waitFor(() =>
          expect(verification.command).toHaveBeenCalledTimes(2),
        )
        expect(vi.mocked(verification.command).mock.calls[1][2]).toEqual({
          expectedVersion: 4,
        })
      }
      expect(
        vi
          .mocked(verification.command)
          .mock.calls.some((c) =>
            ['SUBMIT', 'DECIDE'].includes(c[0].operation),
          ),
      ).toBe(false)
      expect(JSON.stringify(localStorage)).not.toContain('storage.example')
    } finally {
      fd.mockRestore()
    }
  },
)

it.each(['DRIVER', 'SUPER_ADMIN'] as const)(
  'reports decode failure and revokes preview for %s',
  async (role) => {
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:failed'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revoke,
    })
    vi.mocked(verification.access).mockResolvedValue(
      new Blob(['invalid'], { type: 'image/png' }),
    )
    mount(
      <Evidence
        record={{
          ...caseFixture,
          attachments: [
            {
              id: attachmentId,
              category: 'FACE_PHOTO',
              status: 'VALIDATED',
              mime: 'image/png',
              bytes: 7,
              hash: 'synthetic',
              createdAt: terms.createdAt,
            },
          ],
        }}
        requirements={requirements}
        canWrite={false}
      />,
      role,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    const image = await screen.findByAltText('Evidencia privada del expediente')
    expect(
      screen.queryByText('Imagen normalizada recibida por proxy autenticado.'),
    ).not.toBeInTheDocument()
    fireEvent.load(image)
    expect(
      screen.getByText('Imagen normalizada recibida por proxy autenticado.'),
    ).toBeInTheDocument()
    fireEvent.error(image)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo mostrar la imagen',
    )
    expect(
      screen.queryByAltText('Evidencia privada del expediente'),
    ).not.toBeInTheDocument()
    expect(revoke).toHaveBeenCalledWith('blob:failed')
  },
)

it.each([false, true, undefined, null])(
  'vehicle evidence follows backend registration requirement %s',
  (required) => {
    const record = {
      ...caseFixture,
      subjectType: 'VEHICLE' as const,
      registrationCardRequired: required,
      data: {
        declaredOwnerName: 'Synthetic',
        serialNumber: 'SYNTHETIC',
        ownershipEvidenceType: 'BORROWED' as const,
      },
      attachments: [],
    }
    mount(
      <>
        <CaseForm record={record} />
        <Evidence record={record} requirements={requirements} canWrite />
      </>,
    )
    if (required === false)
      expect(
        screen.queryByRole('option', { name: 'Tarjeta de circulación' }),
      ).not.toBeInTheDocument()
    else
      expect(
        screen.getByRole('option', { name: 'Tarjeta de circulación' }),
      ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Autorización del titular' }),
    ).toBeInTheDocument()
    if (required === false)
      expect(
        screen.getByText(/Bicicleta: no requiere tarjeta/),
      ).toBeInTheDocument()
  },
)
it('keeps historical registration attachments visible on bicycle', () => {
  mount(
    <Evidence
      record={{
        ...caseFixture,
        subjectType: 'VEHICLE',
        registrationCardRequired: false,
        attachments: [
          {
            id: attachmentId,
            category: 'REGISTRATION_CARD',
            status: 'VALIDATED',
            mime: 'image/png',
            bytes: 10,
            hash: 'synthetic',
            createdAt: terms.createdAt,
          },
        ],
      }}
      requirements={requirements}
      canWrite={false}
    />,
  )
  expect(screen.getByText('Tarjeta de circulación')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Ver evidencia' }),
  ).toBeInTheDocument()
})
