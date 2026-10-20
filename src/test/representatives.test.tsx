import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import {
  RepresentativesPage,
  AdminRepresentatives,
  RepresentativeCase,
} from '../verification/representatives'
import { RepresentativeForm } from '../verification/representative-form'
import { Recovery } from '../verification/common'
import { verification, validateFile } from '../verification/service'
import {
  reconcile,
  readMarkers,
  runVerification,
} from '../verification/pending'
import { TermsPanel } from '../verification/terms'
import { Protected } from '../app/App'
import { CaseDetail } from '../verification/pages'
import { ApiError } from '../services/errors'
import { vkey } from '../verification/format'
import type { Role } from '../types/api'
import {
  actor,
  resource,
  providerId,
  caseId,
  terms,
} from './verification-fixtures'
import {
  repRequirements,
  repCase,
  link,
  openLink,
  privacy,
  privacyReceipt,
} from './representative-fixtures'
vi.mock('../verification/service', async (original) => ({
  ...(await original<typeof import('../verification/service')>()),
  verification: {
    representatives: vi.fn(),
    representativePrivacy: vi.fn(),
    privacyReceipt: vi.fn(),
    requirements: vi.fn(),
    command: vi.fn(),
    get: vi.fn(),
    terms: vi.fn(),
    attempt: vi.fn(),
    acceptance: vi.fn(),
  },
}))
function mount(
  child: ReactNode,
  role: Role = 'PROVIDER_ADMIN',
  path = '/',
  acknowledged = false,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  if (acknowledged)
    client.setQueryData(
      vkey(actor, 'representative-privacy-ack', resource),
      privacyReceipt,
    )
  const auth = {
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
function home(role: Role = 'PROVIDER_ADMIN', id = resource) {
  return mount(
    <Routes>
      <Route
        path="/verification/representatives/:subjectId"
        element={
          <>
            <Recovery />
            <RepresentativesPage />
          </>
        }
      />
      <Route
        path="/verification/cases/:id"
        element={<p>Expediente creado</p>}
      />
    </Routes>,
    role,
    '/verification/representatives/' + id,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verification.requirements).mockResolvedValue(repRequirements)
  vi.mocked(verification.representatives).mockResolvedValue({ items: [link] })
  vi.mocked(verification.representativePrivacy).mockResolvedValue(privacy)
  vi.mocked(verification.privacyReceipt).mockResolvedValue({
    id: privacyReceipt.id,
    scope: privacyReceipt.scope,
    version: privacyReceipt.version,
    privacyVersion: privacyReceipt.privacyVersion,
    privacyHash: privacyReceipt.privacyHash,
    acceptsFleetContract: false,
  })
  vi.mocked(verification.get).mockResolvedValue(repCase)
  vi.mocked(verification.terms).mockResolvedValue({
    ...terms,
    scope: 'FLEET',
    environment: 'PRODUCTION',
    privacyVersion: privacy.privacyVersion,
    privacyText: privacy.privacyText,
    privacyHash: privacy.privacyHash,
    specificConsents: privacy.specificConsents,
  })
  vi.mocked(verification.command).mockImplementation(async (m) =>
    m.operation === 'REPRESENTATIVE_PRIVACY'
      ? privacyReceipt
      : { id: caseId, status: 'DRAFT', revision: 1 },
  )
})
async function acknowledge() {
  await screen.findByLabelText(/He consultado el aviso personal/)
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar privacidad personal' }),
  )
  await screen.findByText(/Privacidad personal confirmada para esta versión/)
}
it.each(['DRIVER', 'PROVIDER_ADMIN'] as Role[])(
  'linked %s acknowledges separate consents before creating; no FLEET or approval',
  async (role) => {
    home(role)
    await screen.findByLabelText(/He consultado el aviso personal/)
    expect(
      screen.getByRole('button', {
        name: 'Crear expediente de representación',
      }),
    ).toBeDisabled()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    for (const box of screen.getAllByRole('checkbox'))
      expect(box).not.toBeChecked()
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(
      screen.getByRole('button', { name: 'Confirmar privacidad personal' }),
    ).toBeDisabled()
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    await acknowledge()
    expect(verification.command).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'REPRESENTATIVE_PRIVACY',
        target: resource,
      }),
      expect.stringContaining('/privacy/acknowledge'),
      expect.objectContaining({
        privacyHash: privacy.privacyHash,
        specificConsents: privacy.specificConsents.map(({ id, hash }) => ({
          id,
          hash,
          accepted: true,
        })),
      }),
      'POST',
    )
    expect(
      screen.queryByRole('button', { name: /^Aceptar por/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Crear expediente de representación',
      }),
    )
    await screen.findByText('Expediente creado')
    expect(verification.command).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: 'CREATE_CASE', target: resource }),
      `/fleet-representatives/${resource}/cases`,
      undefined,
      'POST',
    )
  },
)
it('coordinator without link cannot reach privacy or files through a known subject ID', async () => {
  vi.mocked(verification.representatives).mockResolvedValue({ items: [] })
  home()
  await screen.findByText(/Este vínculo no está disponible/)
  expect(verification.representativePrivacy).not.toHaveBeenCalled()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})
it('another provider ID cannot select a foreign link', async () => {
  home('DRIVER', providerId)
  await screen.findByText(/Este vínculo no está disponible/)
  expect(verification.representativePrivacy).not.toHaveBeenCalled()
})
it('missing production policy blocks collection without substituting a draft', async () => {
  vi.mocked(verification.representativePrivacy).mockRejectedValue(
    new ApiError(409, '', 'VERIFICATION_PUBLICATION_REQUIRED'),
  )
  home()
  await screen.findByRole('alert')
  expect(
    screen.getByRole('button', { name: 'Crear expediente de representación' }),
  ).toBeDisabled()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(verification.command).not.toHaveBeenCalled()
})
it.each([{ status: 'REVOKED' as const }, { restricted: true }])(
  'restricted/revoked link exposes minimum status and no case evidence: %j',
  async (change) => {
    vi.mocked(verification.representatives).mockResolvedValue({
      items: [{ ...openLink, ...change }],
    })
    home()
    await screen.findByText(/El vínculo está revocado/)
    expect(
      screen.queryByRole('link', { name: /Borrador/ }),
    ).not.toBeInTheDocument()
    expect(verification.representativePrivacy).not.toHaveBeenCalled()
  },
)
it('a changed privacy version clears consent and old acknowledgment cannot unlock collection', async () => {
  const view = home()
  await acknowledge()
  act(() =>
    view.client.setQueryData(vkey(actor, 'representative-privacy', resource), {
      ...privacy,
      version: 'SYNTHETIC-2',
      privacyHash: 'e'.repeat(64),
    }),
  )
  await screen.findByLabelText(/He consultado el aviso personal/)
  expect(
    screen.getByRole('button', { name: 'Crear expediente de representación' }),
  ).toBeDisabled()
  for (const box of screen.getAllByRole('checkbox'))
    expect(box).not.toBeChecked()
})
it('lost privacy response recovers by GET and validates receipt without a second POST', async () => {
  vi.mocked(verification.command).mockRejectedValueOnce(new ApiError(0, 'lost'))
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: privacyReceipt,
  })
  home()
  await screen.findByRole('checkbox', { name: /He consultado/ })
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar privacidad personal' }),
  )
  const consult = await screen.findByRole('button', {
    name: 'Consultar intento',
  })
  expect(readMarkers()).toHaveLength(1)
  expect(Object.keys(readMarkers()[0]).sort()).toEqual([
    'actor',
    'key',
    'operation',
    'target',
  ])
  expect(JSON.stringify(localStorage)).not.toContain(privacy.privacyText)
  fireEvent.click(consult)
  await screen.findByText(/Privacidad personal confirmada para esta versión/)
  await waitFor(() => expect(readMarkers()).toHaveLength(0))
  expect(verification.command).toHaveBeenCalledOnce()
  expect(verification.privacyReceipt).toHaveBeenCalledWith(privacyReceipt.id)
})
it('revocation after a lost command preserves uncertainty and the original marker', async () => {
  const refresh = vi.fn().mockResolvedValue(undefined)
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(
      actor,
      'REPRESENTATIVE_PRIVACY',
      resource,
      '/synthetic',
      {},
      refresh,
    ),
  ).rejects.toThrow()
  const marker = readMarkers()[0]
  vi.mocked(verification.attempt).mockRejectedValue(
    new ApiError(404, '', 'VERIFICATION_NOT_FOUND'),
  )
  await expect(reconcile(marker, actor, refresh)).rejects.toThrow()
  expect(readMarkers()).toEqual([marker])
  expect(verification.command).toHaveBeenCalledOnce()
})
it('FLEET appears only with current server capability, not just an approved case', async () => {
  const view = home()
  await screen.findByText(/Cuenta:/)
  act(() =>
    view.client.setQueryData(vkey(actor, 'representatives'), {
      items: [{ ...link, approvedCaseId: caseId, canAcceptFleet: false }],
    }),
  )
  expect(
    screen.queryByRole('button', { name: /^Aceptar por/ }),
  ).not.toBeInTheDocument()
  act(() =>
    view.client.setQueryData(vkey(actor, 'representatives'), {
      items: [{ ...link, approvedCaseId: caseId, canAcceptFleet: true }],
    }),
  )
  await screen.findByRole('button', { name: 'Aceptar por esta flotilla' })
  expect(verification.command).not.toHaveBeenCalled()
})
it('operational FLEET terms do not let a coordinator accept', async () => {
  mount(<TermsPanel providerId={providerId} providerName="Sintética" />)
  await screen.findByRole('button', { name: 'Aceptar por esta flotilla' })
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  expect(
    screen.getByRole('button', { name: 'Aceptar por esta flotilla' }),
  ).toBeDisabled()
})
it('SELF collects no fictitious company, licence or power and saves strict fields', async () => {
  mount(
    <RepresentativeForm
      record={{ ...repCase, data: { ...repCase.data, capacity: 'SELF' } }}
      disabled={false}
    />,
  )
  expect(
    screen.queryByLabelText('Nombre del titular o razón social'),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('Licencia personal')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Guardar representación' })
      .closest('form')!,
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalled())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toMatchObject({
    expectedVersion: 3,
    data: {
      representedName: repCase.data.fullName,
      representedPersonType: 'NATURAL_PERSON',
      authorityPages: [],
      jointSignatureRequired: false,
      declarationCurrent: true,
    },
  })
})
it('page order is explicit and sent only on saving the revision', async () => {
  const ids = [resource, providerId]
  mount(
    <RepresentativeForm
      record={{
        ...repCase,
        attachments: ids.map((id) => ({
          id,
          category: 'REPRESENTATION_AUTHORITY_PAGE',
          status: 'VALIDATED',
          bytes: 10,
          mime: 'image/png',
          hash: null,
          createdAt: '',
        })),
        data: { ...repCase.data, authorityPages: ids },
      }}
      disabled={false}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Subir página 2' }))
  expect(verification.command).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox', { name: /Declaro vigente/ }))
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Guardar representación' })
      .closest('form')!,
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalled())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toMatchObject({
    data: { authorityPages: [...ids].reverse() },
  })
})
it('stale revision reports conflict and never retries the mutation', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(409, '', 'VERIFICATION_VERSION_CONFLICT'),
  )
  mount(<RepresentativeForm record={repCase} disabled={false} />)
  fireEvent.click(screen.getByRole('checkbox', { name: /Declaro vigente/ }))
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Guardar representación' })
      .closest('form')!,
  )
  await screen.findAllByText(/El expediente o la política cambió/)
  expect(verification.command).toHaveBeenCalledOnce()
})
it('SUPER_ADMIN must confirm a motivated checklist decision, separately from FLEET', async () => {
  mount(
    <RepresentativeCase
      record={{ ...repCase, status: 'SUBMITTED' }}
      requirements={repRequirements}
    />,
    'SUPER_ADMIN',
  )
  expect(screen.queryByLabelText('Categoría *')).not.toBeInTheDocument()
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.change(screen.getByLabelText('Motivo público *'), {
    target: { value: 'Revisión sintética suficiente' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar decisión explícita' }),
  )
  await screen.findByRole('dialog')
  expect(verification.command).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0]).toEqual([
    expect.objectContaining({ operation: 'DECIDE' }),
    `/admin/verification-cases/${caseId}/decision`,
    expect.objectContaining({
      publicReason: 'Revisión sintética suficiente',
      passedChecks: repRequirements.representative!.checks,
      expectedVersion: 3,
    }),
    'POST',
  ])
})
it('joint signature cannot be approved individually', async () => {
  mount(
    <RepresentativeCase
      record={{
        ...repCase,
        status: 'SUBMITTED',
        data: { ...repCase.data, jointSignatureRequired: true },
      }}
      requirements={repRequirements}
    />,
    'SUPER_ADMIN',
  )
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.change(screen.getByLabelText('Motivo público *'), {
    target: { value: 'Sintético' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Registrar decisión explícita' }),
  )
  await screen.findByText(/No se puede aprobar una firma conjunta/)
  expect(verification.command).not.toHaveBeenCalled()
})
it('losing the link clears loaded private fields and evidence actions', async () => {
  vi.mocked(verification.representatives).mockResolvedValue({
    items: [openLink],
  })
  const view = mount(
    <RepresentativeCase record={repCase} requirements={repRequirements} />,
    'DRIVER',
    '/',
    true,
  )
  await screen.findByLabelText('Nombre completo de quien comparece')
  act(() =>
    view.client.setQueryData(vkey(actor, 'representatives'), {
      items: [{ ...openLink, restricted: true, cases: [] }],
    }),
  )
  await screen.findByText(/El vínculo está revocado/)
  expect(
    screen.queryByDisplayValue('Persona Sintética'),
  ).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Imagen *')).not.toBeInTheDocument()
})
it('no personal data entry or file selection before current privacy is acknowledged', async () => {
  vi.mocked(verification.representatives).mockResolvedValue({
    items: [openLink],
  })
  mount(
    <RepresentativeCase record={repCase} requirements={repRequirements} />,
    'DRIVER',
  )
  await screen.findByLabelText(/He consultado el aviso personal/)
  expect(
    screen.queryByLabelText('Nombre completo de quien comparece'),
  ).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Imagen *')).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', {
      name: 'Presentar representación para revisión',
    }),
  ).toBeDisabled()
})
it('background privacy refresh preserves the pending file for the confirmed version', async () => {
  vi.mocked(verification.representatives).mockResolvedValue({
    items: [openLink],
  })
  const view = mount(
    <RepresentativeCase record={repCase} requirements={repRequirements} />,
    'DRIVER',
    '/',
    true,
  )
  const input = await screen.findByLabelText<HTMLInputElement>('Imagen *')
  const file = new File(['synthetic B'], 'pending-B.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })
  let resolve!: (value: typeof privacy) => void
  vi.mocked(verification.representativePrivacy).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  let refresh!: Promise<void>
  act(() => {
    refresh = view.client.invalidateQueries({
      queryKey: vkey(actor, 'representative-privacy', resource),
    })
  })
  await waitFor(() =>
    expect(
      view.client.isFetching({
        queryKey: vkey(actor, 'representative-privacy', resource),
      }),
    ).toBe(1),
  )
  expect(screen.getByLabelText('Imagen *')).toBe(input)
  expect(input.files?.[0]).toBe(file)
  expect(
    screen.getByRole('button', { name: /^Cargar imagen$/ }),
  ).toBeDisabled()
  await act(async () => {
    resolve(privacy)
    await refresh
  })
  expect(screen.getByLabelText('Imagen *')).toBe(input)
  expect(input.files?.[0]).toBe(file)
  expect(verification.command).not.toHaveBeenCalled()
  act(() =>
    view.client.setQueryData(vkey(actor, 'representative-privacy', resource), {
      ...privacy,
      privacyVersion: 'SYNTHETIC-NEXT',
      privacyHash: 'f'.repeat(64),
    }),
  )
  await waitFor(() =>
    expect(screen.queryByLabelText('Imagen *')).not.toBeInTheDocument(),
  )
})
it('a late privacy query cannot replace the newly selected fleet context', async () => {
  let resolve!: (value: typeof privacy) => void
  vi.mocked(verification.representativePrivacy).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const view = home()
  await waitFor(() =>
    expect(verification.representativePrivacy).toHaveBeenCalled(),
  )
  act(() =>
    view.client.setQueryData(vkey(actor, 'representatives'), { items: [] }),
  )
  await screen.findByText(/Este vínculo no está disponible/)
  await act(async () => resolve(privacy))
  expect(screen.queryByText(privacy.privacyText)).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})
it('LOCAL_TEST history is visible without converting it or enabling edits', async () => {
  vi.mocked(verification.representatives).mockResolvedValue({
    items: [openLink],
  })
  mount(
    <RepresentativeCase
      record={{ ...repCase, environment: 'LOCAL_TEST' }}
      requirements={repRequirements}
    />,
    'DRIVER',
    '/',
    true,
  )
  await screen.findByText(/Expediente histórico: no se convierte/)
  expect(
    screen.queryByRole('button', { name: 'Guardar representación' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', {
      name: 'Presentar representación para revisión',
    }),
  ).not.toBeInTheDocument()
})
it('non-admin cannot open the link management route', async () => {
  mount(
    <Routes>
      <Route element={<Protected roles={['SUPER_ADMIN']} />}>
        <Route path="/" element={<AdminRepresentatives />} />
      </Route>
    </Routes>,
    'PROVIDER_ADMIN',
  )
  expect(
    screen.queryByRole('button', { name: 'Revisar vinculación' }),
  ).not.toBeInTheDocument()
})
it('SUPER_ADMIN links the identified account and fleet only after confirmation', async () => {
  vi.mocked(verification.command).mockResolvedValue({
    id: resource,
    status: 'LINKED',
    revision: 1,
  })
  mount(<AdminRepresentatives />, 'SUPER_ADMIN')
  fireEvent.change(
    screen.getByLabelText('Identificador de cuenta con correo confirmado'),
    { target: { value: actor } },
  )
  fireEvent.change(screen.getByLabelText('Identificador de flotilla'), {
    target: { value: providerId },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar vinculación' }))
  await screen.findByRole('dialog')
  expect(verification.command).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await screen.findByText(/Comprobante histórico:.*vínculo creado/)
  expect(verification.command).toHaveBeenCalledWith(
    expect.objectContaining({
      operation: 'LINK_REPRESENTATIVE',
      target: actor,
    }),
    '/admin/fleet-representatives',
    { userId: actor, providerId },
    'POST',
  )
})
it.each(['LINK_REPRESENTATIVE', 'REVOKE_REPRESENTATIVE'] as const)(
  '%s recovers the original historical receipt without inventing a current-link GET',
  async (operation) => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
    await expect(
      runVerification(actor, operation, resource, '/synthetic', {}, refresh),
    ).rejects.toThrow()
    const marker = readMarkers()[0]
    vi.mocked(verification.attempt).mockResolvedValue({
      state: 'APPLIED',
      result: {
        id: resource,
        status: operation === 'LINK_REPRESENTATIVE' ? 'LINKED' : 'REVOKED',
        revision: 2,
      },
    })
    await reconcile(marker, actor, refresh)
    expect(verification.command).toHaveBeenCalledOnce()
    expect(verification.get).not.toHaveBeenCalled()
    expect(refresh).toHaveBeenCalledOnce()
    expect(readMarkers()).toEqual([])
  },
)
it('a privacy receipt for a different subject never unlocks the form', async () => {
  const refresh = vi.fn().mockResolvedValue(undefined)
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(
      actor,
      'REPRESENTATIVE_PRIVACY',
      resource,
      '/synthetic',
      {},
      refresh,
    ),
  ).rejects.toThrow()
  const marker = readMarkers()[0]
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { ...privacyReceipt, subjectId: providerId },
  })
  await expect(reconcile(marker, actor, refresh)).rejects.toThrow(
    /conserva el intento/,
  )
  expect(readMarkers()).toEqual([marker])
})
it('representative file limits allow JPEG/PNG and reject PDF, empty and oversized bytes', () => {
  for (const mime of ['image/png', 'image/jpeg'])
    expect(() =>
      validateFile(
        new File(['synthetic'], 'synthetic', { type: mime }),
        repRequirements,
      ),
    ).not.toThrow()
  expect(() =>
    validateFile(
      new File(['pdf'], 'synthetic.pdf', { type: 'application/pdf' }),
      repRequirements,
    ),
  ).toThrow(/JPEG o PNG/)
  expect(() =>
    validateFile(
      new File([], 'empty.png', { type: 'image/png' }),
      repRequirements,
    ),
  ).toThrow(/contener datos/)
  expect(() =>
    validateFile(new File(['synthetic'], 'large.png', { type: 'image/png' }), {
      ...repRequirements,
      maxBytes: 2,
    }),
  ).toThrow(/exceder/)
})
it('a scoped deletion denial shows minimum follow-up and no dossier data', async () => {
  vi.mocked(verification.get).mockRejectedValue(
    new ApiError(409, '', 'DELETION_RESTRICTED'),
  )
  mount(
    <Routes>
      <Route path="/verification/cases/:id" element={<CaseDetail />} />
    </Routes>,
    'DRIVER',
    '/verification/cases/' + caseId,
  )
  await screen.findByText(/Este alcance documental está restringido/)
  expect(
    screen.getByRole('link', { name: 'Seguimiento de baja y privacidad' }),
  ).toHaveAttribute('href', '/privacy/deletion')
  expect(screen.queryByText('Organización Sintética')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Ver evidencia' }),
  ).not.toBeInTheDocument()
})
