import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../services/query'
import {
  BusinessCustomerPage,
  BusinessAdminPage,
  BusinessAdminDetail,
} from '../customer-business/pages'
import { CustomerAccess } from '../customer/identity'
import { CustomerProfilePage } from '../customer/ProfilePage'
import { NewRequest, CustomerRequest } from '../customer/pages'
import { business } from '../customer-business/service'
import { customer } from '../customer/service'
import {
  forgetBusinessBodies,
  readMarkers,
  storageKey,
} from '../customer-business/pending'
import {
  accountId,
  applicationId,
  profile,
  capabilities,
  application,
  administration,
  receipt,
} from './business-fixtures'
import { ApiError } from '../services/errors'
import type { Role } from '../types/api'
vi.mock('../auth/context', () => ({
  useAuth: () => ({ user: actor, login: vi.fn(), logout: vi.fn() }),
}))
let actor: {
  id: string
  role: Role
  email: string
  emailVerifiedAt: string
} | null
vi.mock('../customer-business/service', () => ({
  business: {
    list: vi.fn(),
    detail: vi.fn(),
    adminDetail: vi.fn(),
    access: vi.fn(),
    send: vi.fn(),
    attempt: vi.fn(),
  },
}))
vi.mock('../customer/service', () => ({
  customer: {
    profile: vi.fn(),
    capabilities: vi.fn(),
    confirm: vi.fn(),
    attach: vi.fn(),
    detail: vi.fn(),
    status: vi.fn(),
    prequote: vi.fn(),
    consentContext: vi.fn(),
  },
  conversionReference: () => null,
}))
beforeEach(() => {
  vi.resetAllMocks()
  queryClient.clear()
  localStorage.clear()
  forgetBusinessBodies()
  actor = {
    id: 'A',
    role: 'CUSTOMER',
    email: 'synthetic@example.test',
    emailVerifiedAt: '2026-10-12T12:00:00Z',
  }
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (
        _name: string,
        _options: unknown,
        cb: (lock: object) => unknown,
      ) => Promise.resolve(cb({})),
    },
  })
  vi.mocked(customer.profile).mockResolvedValue(structuredClone(profile))
  vi.mocked(customer.capabilities).mockResolvedValue(
    structuredClone(capabilities),
  )
  vi.mocked(business.list).mockResolvedValue({
    items: [application],
    total: 1,
    page: 1,
    pageSize: 20,
  })
  vi.mocked(business.detail).mockResolvedValue(structuredClone(application))
  vi.mocked(business.adminDetail).mockResolvedValue({
    ...structuredClone(application),
    ...structuredClone(administration),
    decisionActorId: null,
    internalNote: 'SÓLO ADMIN',
  })
  vi.mocked(business.access).mockResolvedValue(structuredClone(administration))
  vi.mocked(business.send).mockImplementation(async (m) => receipt(m))
  vi.mocked(business.attempt).mockResolvedValue({
    state: 'NOT_OBSERVED',
    receipt: null,
  })
})
function mount(path = '/customer/business') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/customer/business" element={<BusinessCustomerPage />} />
          <Route
            path="/customer/business/:id"
            element={<BusinessCustomerPage />}
          />
          <Route
            path="/admin/customer-business-applications"
            element={<BusinessAdminPage />}
          />
          <Route
            path="/admin/customer-business-applications/:id"
            element={<BusinessAdminDetail />}
          />
          <Route
            path="/admin/customer-business-access/:accountId"
            element={<BusinessAdminDetail />}
          />
          <Route
            path="/customer/access"
            element={
              <CustomerAccess
                challenge={{ purpose: 'REGISTER', token: 'synthetic' }}
              />
            }
          />
          <Route path="/customer/profile" element={<CustomerProfilePage />} />
          <Route path="/customer/new" element={<NewRequest />} />
          <Route
            path="/customer/requests/:publicId"
            element={<CustomerRequest />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
async function fill() {
  await screen.findByLabelText('Nombre del negocio *')
  for (const [label, value] of [
    ['Nombre del negocio *', ' Tienda '],
    ['Actividad *', ' Panadería '],
    ['Ciudad *', ' Ciudad '],
    ['Volumen estimado de envíos *', ' 12 por semana '],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar solicitud' }),
    ).toBeEnabled(),
  )
}
async function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operación' }))
  await waitFor(() => expect(business.send).toHaveBeenCalledTimes(1))
}
it('accessible form trims exact DTO, omits empty note, confirms and refreshes profile/capabilities/list', async () => {
  mount()
  await fill()
  fireEvent.change(screen.getByLabelText('Nota (opcional)'), {
    target: { value: '   ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitud' }))
  expect(business.send).not.toHaveBeenCalled()
  await confirm()
  expect(vi.mocked(business.send).mock.calls[0][1]).toEqual({
    expectedAccountRevision: 1,
    businessName: 'Tienda',
    activity: 'Panadería',
    city: 'Ciudad',
    estimatedDeliveryVolume: '12 por semana',
  })
  await screen.findByText('Operación registrada correctamente.')
  expect(readMarkers()).toEqual([])
  expect(customer.profile).toHaveBeenCalledTimes(3)
  expect(business.list).toHaveBeenCalledTimes(2)
  expect(screen.queryByText('SÓLO ADMIN')).not.toBeInTheDocument()
})
it('blank trimmed fields do not create a marker, and inputs reflect DTO bounds', async () => {
  mount()
  await fill()
  fireEvent.change(screen.getByLabelText('Actividad *'), {
    target: { value: '   ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitud' }))
  await screen.findByText('Completa los campos obligatorios y sus límites.')
  expect(readMarkers()).toEqual([])
  expect(business.send).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Actividad *')).toHaveAttribute(
    'maxlength',
    '500',
  )
})
it.each(['PENDING', 'REJECTED'] as const)(
  'Personal %s shows true access independently and keeps a historical detail',
  async (status) => {
    vi.mocked(customer.profile).mockResolvedValue({
      ...profile,
      businessAccess: {
        ...profile.businessAccess,
        canApply: status === 'REJECTED',
      },
      businessApplication: { id: applicationId, status, revision: 2 },
    })
    mount()
    await screen.findByText('Sin acceso Negocio')
    expect(
      screen.getByRole('link', { name: 'Consultar detalle' }),
    ).toHaveAttribute('href', '/customer/business/' + applicationId)
    expect(screen.queryByText('Acceso Negocio activo')).not.toBeInTheDocument()
    if (status === 'PENDING')
      expect(screen.queryByLabelText('Actividad *')).not.toBeInTheDocument()
  },
)
it('withdraw is explicit and sends only current application revision; terminal points to corrected new application', async () => {
  mount('/customer/business/' + applicationId)
  const b = await screen.findByRole('button', { name: 'Retirar solicitud' })
  await waitFor(() => expect(b).toBeEnabled())
  fireEvent.click(b)
  await confirm()
  expect(vi.mocked(business.send).mock.calls[0][0]).toMatchObject({
    operation: 'WITHDRAW',
    target: applicationId,
  })
  expect(vi.mocked(business.send).mock.calls[0][1]).toEqual({
    expectedApplicationRevision: 1,
  })
})
it.each(['REJECTED', 'WITHDRAWN'] as const)(
  '%s detail cannot be edited and offers explicit corrected application',
  async (status) => {
    vi.mocked(business.detail).mockResolvedValue({ ...application, status })
    mount('/customer/business/' + applicationId)
    await screen.findByText(/Este registro no se modifica/)
    expect(
      screen.queryByRole('button', { name: 'Retirar solicitud' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Preparar una nueva solicitud con datos corregidos',
      }),
    ).toHaveAttribute('href', '/customer/business')
  },
)
it('review required and persistent revocation block remain visible after Personal downgrade', async () => {
  vi.mocked(customer.profile).mockResolvedValue({
    ...profile,
    businessAccess: {
      ...profile.businessAccess,
      state: 'REVIEW_REQUIRED',
      source: 'LEGACY_REVIEW',
      canApply: false,
      reapplicationBlocked: true,
    },
  })
  mount()
  await screen.findByText('Revisión obligatoria')
  expect(screen.getByText(/Cambiar a Personal no elimina/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Actividad *')).not.toBeInTheDocument()
})
it('downgrade uses PERSONAL, account target and receipt, not profile-cache replacement', async () => {
  vi.mocked(customer.profile).mockResolvedValue({
    ...profile,
    type: 'BUSINESS',
    businessAccess: {
      ...profile.businessAccess,
      state: 'ACTIVE',
      canApply: false,
      canDowngrade: true,
    },
  })
  mount()
  const b = await screen.findByRole('button', {
    name: 'Preparar descenso a Personal',
  })
  await waitFor(() => expect(b).toBeEnabled())
  fireEvent.click(b)
  await confirm()
  expect(vi.mocked(business.send).mock.calls[0][0]).toMatchObject({
    operation: 'DOWNGRADE',
    target: accountId,
  })
  expect(vi.mocked(business.send).mock.calls[0][1]).toEqual({
    type: 'PERSONAL',
    expectedRevision: 1,
  })
  await screen.findByText('Operación registrada correctamente.')
  expect(queryClient.getQueryData(['customer', 'A', 'profile'])).toMatchObject({
    type: 'BUSINESS',
  })
})
it.each(['PROVIDER_ADMIN', 'DRIVER', 'CUSTOMER'] as Role[])(
  '%s cannot access administrative approval even by direct route',
  async (role) => {
    actor!.role = role
    mount('/admin/customer-business-applications/' + applicationId)
    expect(screen.getByText('Sin permisos')).toBeInTheDocument()
    expect(business.adminDetail).not.toHaveBeenCalled()
  },
)
it('SUPER_ADMIN rejects with public reason and internal note; applied rejection is successful decision', async () => {
  actor!.role = 'SUPER_ADMIN'
  vi.mocked(business.send).mockImplementation(async (m) => ({
    ...receipt(m),
    result: { ...receipt(m).result, applicationStatus: 'REJECTED' },
  }))
  mount('/admin/customer-business-applications/' + applicationId)
  fireEvent.change(await screen.findByLabelText('Decisión'), {
    target: { value: 'REJECT' },
  })
  expect(screen.getByLabelText('Motivo público *')).toBeRequired()
  fireEvent.change(screen.getByLabelText('Motivo público *'), {
    target: { value: ' Datos incompletos ' },
  })
  fireEvent.change(
    screen.getByLabelText('Nota interna (sólo administración)'),
    { target: { value: ' Nota privada ' } },
  )
  fireEvent.click(screen.getByRole('button', { name: 'Revisar decisión' }))
  await confirm()
  expect(vi.mocked(business.send).mock.calls[0][1]).toEqual({
    decision: 'REJECT',
    expectedAccountRevision: 1,
    expectedApplicationRevision: 1,
    publicReason: 'Datos incompletos',
    internalNote: 'Nota privada',
  })
  await screen.findByText(
    'El rechazo administrativo se registró correctamente.',
  )
  expect(JSON.stringify(localStorage)).not.toContain('Nota privada')
})
it('approval with operational open requests cannot be submitted and never promises later activation', async () => {
  actor!.role = 'SUPER_ADMIN'
  vi.mocked(business.access).mockResolvedValue({
    ...administration,
    customerAccount: {
      ...administration.customerAccount,
      activeRequestCount: 1,
    },
  })
  mount('/admin/customer-business-applications/' + applicationId)
  await screen.findByLabelText('Decisión')
  expect(
    screen.getByRole('button', { name: 'Revisar decisión' }),
  ).toBeDisabled()
  expect(screen.getByText(/No habrá activación parcial/)).toBeInTheDocument()
})
it.each(['revoke', 'allow'] as const)(
  'admin %s uses server grant and revision without manually entering UUID',
  async (operation) => {
    actor!.role = 'SUPER_ADMIN'
    const grant = '33333333-3333-4333-8333-333333333333'
    vi.mocked(business.access).mockResolvedValue({
      ...administration,
      businessAccessAdministration: {
        canRevoke: operation === 'revoke',
        canAllowReapplication: operation === 'allow',
        activeGrant:
          operation === 'revoke'
            ? { id: grant, applicationId, grantedAt: application.submittedAt }
            : null,
        lastAdministrativeRevocation: {
          grantId: grant,
          revokedAt: application.submittedAt,
          publicReason: 'Revisión',
          reapplicationAllowedAt: null,
        },
      },
    })
    mount('/admin/customer-business-access/' + accountId)
    fireEvent.change(await screen.findByLabelText('Motivo público *'), {
      target: { value: 'Revisado' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name:
          operation === 'revoke'
            ? 'Revisar revocación'
            : 'Revisar habilitación de nueva solicitud',
      }),
    )
    await confirm()
    expect(vi.mocked(business.send).mock.calls[0][1]).toEqual({
      [operation === 'revoke' ? 'grantId' : 'revokedGrantId']: grant,
      expectedAccountRevision: 1,
      publicReason: 'Revisado',
    })
    expect(vi.mocked(business.send).mock.calls[0][0].target).toBe(accountId)
  },
)
it('missing contract blocks only dependent commercial actions', async () => {
  vi.mocked(customer.profile).mockResolvedValue({
    ...profile,
    businessAccess: undefined,
  })
  mount()
  await screen.findByRole('alert')
  expect(
    screen.queryByRole('button', { name: 'Revisar solicitud' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Mis envíos' })).toHaveAttribute(
    'href',
    '/customer',
  )
})
it('403 own profile explains verification/attachment without inventing a null profile', async () => {
  vi.mocked(customer.profile).mockRejectedValue(
    new ApiError(403, 'Denegado', 'CUSTOMER_ACCESS_DENIED'),
  )
  mount()
  await screen.findByText('403 — Sin permisos')
  expect(
    screen.getByRole('link', {
      name: 'Verificar correo o anexar perfil Personal',
    }),
  ).toBeInTheDocument()
  expect(business.list).not.toHaveBeenCalled()
})
it('old BUSINESS register token explains PERSONAL and approval without changing reset/verify', async () => {
  vi.mocked(customer.confirm).mockResolvedValue({
    status: 'CONFIRMED',
    profileType: 'PERSONAL',
    businessApplicationRequired: true,
  })
  mount('/customer/access')
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
    target: { value: 'synthetic-long-password' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await screen.findByText(/Se creó tu perfil Personal/)
  expect(
    screen.getByRole('link', { name: 'Solicitar cuenta Negocio' }),
  ).toHaveAttribute('href', '/customer/business')
})
it('account attachment always PERSONAL and has no self-upgrade choice', async () => {
  vi.mocked(customer.profile).mockRejectedValue(
    new ApiError(403, 'No profile', 'CUSTOMER_ACCESS_DENIED'),
  )
  mount('/customer/profile')
  fireEvent.change(await screen.findByLabelText('Nombre *'), {
    target: { value: 'Cliente' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Anexar perfil a mi cuenta' }),
  )
  await waitFor(() =>
    expect(customer.attach).toHaveBeenCalledWith({
      displayName: 'Cliente',
      type: 'PERSONAL',
    }),
  )
  expect(
    screen.queryByRole('option', { name: 'Negocio' }),
  ).not.toBeInTheDocument()
})
it('list filters and paginates using total/page/pageSize', async () => {
  actor!.role = 'SUPER_ADMIN'
  vi.mocked(business.list).mockResolvedValue({
    items: [application],
    total: 21,
    page: 1,
    pageSize: 20,
  })
  mount('/admin/customer-business-applications')
  await screen.findByText('21 registros · Página 1 de 2')
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  await waitFor(() =>
    expect(business.list).toHaveBeenLastCalledWith(
      true,
      2,
      undefined,
      undefined,
    ),
  )
  fireEvent.change(screen.getByLabelText('Estado de solicitud'), {
    target: { value: 'WITHDRAWN' },
  })
  await waitFor(() =>
    expect(business.list).toHaveBeenLastCalledWith(
      true,
      1,
      'WITHDRAWN',
      undefined,
    ),
  )
})
it('reload NOT_OBSERVED, lost close and foreign actor stay blocked without resending', async () => {
  const m = {
    actor: 'A',
    account: accountId,
    key: crypto.randomUUID(),
    operation: 'SUBMIT',
  }
  localStorage.setItem(storageKey, JSON.stringify([m]))
  const mounted = mount()
  await screen.findByText('Pendiente de reconciliación')
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar intento original' }),
  )
  await screen.findByText(/El resultado no pudo confirmarse/)
  expect(
    screen.queryByRole('button', { name: 'Reenviar exactamente el original' }),
  ).not.toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Cerrar intento explícitamente' }),
  )
  vi.mocked(business.attempt).mockRejectedValueOnce(
    new ApiError(0, 'Lost close'),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }))
  await waitFor(() => expect(business.attempt).toHaveBeenCalledTimes(2))
  mounted.unmount()
  actor!.id = 'B'
  forgetBusinessBodies()
  queryClient.clear()
  mount()
  await screen.findByText(/Sólo la identidad que inició/)
  expect(business.send).not.toHaveBeenCalled()
  expect(readMarkers()).toEqual([m])
})
it('new demand missing fields does not infer access from unlimited capacity', async () => {
  vi.mocked(customer.capabilities).mockResolvedValue({
    ...capabilities,
    businessAccess: undefined,
    capacity: { ...capabilities.capacity, maxActiveRequests: null },
  })
  mount('/customer/new')
  await screen.findByText(/Contrato comercial incompatible/)
  expect(
    screen.queryByRole('button', { name: 'Cotizar envío' }),
  ).not.toBeInTheDocument()
})

it('admin detail 404/ownership failure renders error instead of waiting forever for access', async () => {
  actor!.role = 'SUPER_ADMIN'
  vi.mocked(business.adminDetail).mockRejectedValue(
    new ApiError(404, 'No disponible'),
  )
  mount('/admin/customer-business-applications/' + applicationId)
  await screen.findByRole('alert')
  expect(business.access).not.toHaveBeenCalled()
})
it('command revision conflict is recovered as rejected, refetches current revision and leaves new intent explicit', async () => {
  vi.mocked(business.send).mockRejectedValue(
    new ApiError(409, 'Cambió', 'BUSINESS_APPLICATION_REVISION_CONFLICT'),
  )
  vi.mocked(business.attempt).mockImplementation(async (m) => ({
    state: 'REJECTED',
    receipt: {
      ...receipt(m, 'REJECTED'),
      code: 'BUSINESS_APPLICATION_REVISION_CONFLICT',
    },
  }))
  mount()
  await fill()
  fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitud' }))
  await confirm()
  await screen.findByText(
    'El comando fue rechazado. No significa que la solicitud comercial haya sido rechazada.',
  )
  expect(readMarkers()).toEqual([])
  expect(business.send).toHaveBeenCalledTimes(1)
  expect(customer.profile).toHaveBeenCalledTimes(3)
})

it('cancelling review preserves fields and allows explicitly opening confirmation again without changing data', async () => {
  mount()
  await fill()
  fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitud' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Actividad *')).toHaveValue(' Panadería ')
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar solicitud' }),
    ).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitud' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(business.send).not.toHaveBeenCalled()
})
