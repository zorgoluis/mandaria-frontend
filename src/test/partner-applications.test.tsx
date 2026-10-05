import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { normalizeError } from '../services/errors'
import { partnerApplications } from '../partner-applications/service'
import { providers } from '../providers/service'
import { invitations } from '../invitations/service'
import type { PartnerApplication } from '../partner-applications/types'
import type { UserInvitation } from '../invitations/types'
import type { Provider, Role } from '../types/api'

vi.mock('../partner-applications/service', () => ({
  partnerApplications: {
    list: vi.fn(),
    get: vi.fn(),
    changeStatus: vi.fn(),
    link: vi.fn(),
  },
}))
vi.mock('../providers/service', () => ({
  providers: { list: vi.fn(), get: vi.fn() },
}))
vi.mock('../invitations/service', () => ({
  invitations: { list: vi.fn() },
  accounts: { list: vi.fn() },
}))
vi.mock('../delivery-requests/service', () => ({
  deliveryRequests: { list: vi.fn() },
}))

const stamp = '2026-10-05T01:41:09.010Z'
const fleetProvider: Provider = {
  id: '38cd48e1-a46e-460f-8560-789f14d62856',
  name: 'Envíos Rápidos del Sur',
  code: 'ENVIOS_SUR',
  type: 'FLEET',
  status: 'ACTIVE',
  maxDrivers: 10,
  maxVehicles: 10,
  createdAt: stamp,
  updatedAt: stamp,
}
const otherProviderId = '99999999-1111-4111-8111-111111111111'
function application(
  overrides: Partial<PartnerApplication> = {},
): PartnerApplication {
  return {
    reference: 'SOC-000004',
    type: 'INDIVIDUAL',
    status: 'RECEIVED',
    contactName: 'José Hernández',
    phone: '9615556677',
    email: 'jose.hernandez@example.com',
    city: 'San Cristóbal de las Casas',
    vehicleType: 'BICYCLE',
    fleetName: null,
    fleetUnits: null,
    privacyNoticeVersion: '2026-10',
    privacyAcceptedAt: stamp,
    source: 'LANDING',
    submissionCount: 1,
    lastSubmittedAt: stamp,
    reviewNote: null,
    statusChangedAt: null,
    statusChangedByUserId: null,
    providerId: null,
    invitationId: null,
    createdAt: stamp,
    updatedAt: stamp,
    allowedTransitions: ['CONTACTED', 'REJECTED', 'DISCARDED'],
    ...overrides,
  }
}
const fleetApproved = application({
  reference: 'SOC-000003',
  type: 'FLEET',
  status: 'APPROVED',
  contactName: 'María Gómez',
  phone: '9612223344',
  email: 'maria@example.com',
  city: 'Tuxtla Gutiérrez',
  vehicleType: 'CAR',
  fleetName: 'Envíos Rápidos del Sur',
  fleetUnits: 8,
  submissionCount: 2,
  reviewNote: 'Flotilla validada por teléfono.',
  statusChangedAt: stamp,
  allowedTransitions: ['REJECTED'],
})
function invitation(overrides: Partial<UserInvitation> = {}): UserInvitation {
  return {
    id: 'dcebf693-1fb6-4fe6-b9da-1933d941ce81',
    userId: 'user-1',
    email: 'maria@example.com',
    role: 'PROVIDER_ADMIN',
    providerId: fleetProvider.id,
    provider: {
      id: fleetProvider.id,
      name: fleetProvider.name,
      code: fleetProvider.code,
    },
    membershipRole: 'OWNER',
    driverName: null,
    status: 'PENDING',
    expiresAt: stamp,
    tokenIssuedAt: stamp,
    resendCount: 0,
    acceptedAt: null,
    revokedAt: null,
    revokedByUserId: null,
    createdByUserId: 'admin-1',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}
const page = <T,>(items: T[], total = items.length, current = 1) => ({
  items,
  total,
  totalPages: Math.ceil(total / 20),
  page: current,
  pageSize: 20,
})
const conflict = (code: string, status = 409) =>
  normalizeError(status, { statusCode: status, code, message: 'ignored' })

function Probe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  )
}
function mount(path: string, role: Role = 'SUPER_ADMIN') {
  const auth: AuthState = {
    user: {
      id: 'admin-1',
      email: 'admin@example.test',
      role,
      active: true,
      emailVerifiedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    },
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={auth}>
          <FeedbackProvider>
            <App />
            <Probe />
          </FeedbackProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const location = () => screen.getByTestId('location').textContent

beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(partnerApplications.list).mockResolvedValue(
    page([application(), fleetApproved]),
  )
  vi.mocked(providers.list).mockResolvedValue(page([fleetProvider]))
  vi.mocked(invitations.list).mockResolvedValue(page([invitation()]))
})

describe('partner applications inbox', () => {
  it('lists RECEIVED by default with Spanish labels and highlights repeated submissions', async () => {
    mount('/admin/partner-applications')
    const table = await screen.findByRole('table')
    expect(partnerApplications.list).toHaveBeenCalledWith(
      { page: 1, pageSize: 20, status: 'RECEIVED' },
      expect.anything(),
    )
    const [, first, second] = within(table).getAllByRole('row')
    expect(first).toHaveTextContent('SOC-000004')
    expect(first).toHaveTextContent('Individual')
    expect(first).toHaveTextContent('José Hernández')
    expect(first).toHaveTextContent('San Cristóbal de las Casas')
    expect(first).toHaveTextContent('Bicicleta')
    expect(first).toHaveTextContent('Recibida')
    expect(second).toHaveTextContent('Flotilla')
    expect(second).toHaveTextContent('Envíos Rápidos del Sur')
    expect(second).toHaveTextContent('Auto')
    expect(second).toHaveTextContent('Aprobada')
    expect(within(second).getByText('2 envíos')).toHaveClass(
      'submissions-repeated',
    )
    expect(within(first).queryByText(/envíos/)).not.toBeInTheDocument()
    expect(
      within(first).getByRole('link', { name: 'SOC-000004' }),
    ).toHaveAttribute('href', '/admin/partner-applications/SOC-000004')
  })

  it('applies status, type, search and pagination on the server', async () => {
    vi.mocked(partnerApplications.list).mockResolvedValue(
      page([application()], 45),
    )
    const user = userEvent.setup()
    mount('/admin/partner-applications')
    await screen.findByRole('table')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por estado' }),
      'CONTACTED',
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por tipo' }),
      'FLEET',
    )
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar solicitudes' }),
      ' maria ',
    )
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() =>
      expect(partnerApplications.list).toHaveBeenLastCalledWith(
        {
          page: 1,
          pageSize: 20,
          status: 'CONTACTED',
          type: 'FLEET',
          q: 'maria',
        },
        expect.anything(),
      ),
    )
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(partnerApplications.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, status: 'CONTACTED' }),
        expect.anything(),
      ),
    )
    expect(location()).toContain('page=2')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por estado' }),
      'ALL',
    )
    await waitFor(() =>
      expect(partnerApplications.list).toHaveBeenLastCalledWith(
        { page: 1, pageSize: 20, type: 'FLEET', q: 'maria' },
        expect.anything(),
      ),
    )
  })

  it('refuses invalid URL filters without calling the backend', async () => {
    mount('/admin/partner-applications?status=OPEN')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Los filtros de la dirección no son válidos.',
    )
    expect(partnerApplications.list).not.toHaveBeenCalled()
  })

  it('shows the sidebar entry and the dashboard counter for SUPER_ADMIN', async () => {
    vi.mocked(partnerApplications.list).mockResolvedValue(page([], 7))
    mount('/dashboard')
    expect(
      screen.getByRole('link', { name: /Solicitudes de socio/ }),
    ).toHaveAttribute('href', '/admin/partner-applications')
    await waitFor(() =>
      expect(partnerApplications.list).toHaveBeenCalledWith(
        { pageSize: 1, status: 'RECEIVED' },
        expect.anything(),
      ),
    )
    const card = (
      await screen.findByText('Recibidas desde la landing, sin atender')
    ).closest('.stat-card') as HTMLElement
    expect(await within(card).findByText('7')).toBeInTheDocument()
  })

  it.each(['PROVIDER_ADMIN', 'DRIVER'] as const)(
    'denies %s on list and detail without calling the backend',
    async (role) => {
      mount('/admin/partner-applications', role)
      expect(await screen.findByText('Sin permisos')).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: /Solicitudes de socio/ }),
      ).not.toBeInTheDocument()
      expect(partnerApplications.list).not.toHaveBeenCalled()
    },
  )

  it('denies the detail to PROVIDER_ADMIN', async () => {
    mount('/admin/partner-applications/SOC-000004', 'PROVIDER_ADMIN')
    expect(await screen.findByText('Sin permisos')).toBeInTheDocument()
    expect(partnerApplications.get).not.toHaveBeenCalled()
  })
})

describe('partner application detail', () => {
  it('shows contact actions and only the transitions the backend allows', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue(application())
    mount('/admin/partner-applications/soc-000004')
    expect(
      await screen.findByRole('heading', { name: 'Contacto' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'SOC-000004' })).toBeVisible()
    expect(partnerApplications.get).toHaveBeenCalledWith(
      'SOC-000004',
      expect.anything(),
    )
    expect(screen.getByRole('link', { name: /Llamar/ })).toHaveAttribute(
      'href',
      'tel:9615556677',
    )
    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ })
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/529615556677')
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: /Correo/ })).toHaveAttribute(
      'href',
      'mailto:jose.hernandez@example.com',
    )
    const actions = screen
      .getByRole('heading', { name: 'Cambiar estado' })
      .closest('section') as HTMLElement
    expect(
      within(actions)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Marcar como contactada', 'Rechazar', 'Descartar'])
    expect(
      screen.queryByRole('heading', { name: 'Alta en Mandaria' }),
    ).not.toBeInTheDocument()
  })

  it('shows a final state without actions', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue(
      application({ status: 'DISCARDED', allowedTransitions: [] }),
    )
    mount('/admin/partner-applications/SOC-000004')
    expect(
      await screen.findByText(
        'Estado final: esta solicitud ya no admite cambios.',
      ),
    ).toBeInTheDocument()
  })

  it('translates 404 by code and rejects malformed references locally', async () => {
    vi.mocked(partnerApplications.get).mockRejectedValue(
      conflict('PARTNER_APPLICATION_NOT_FOUND', 404),
    )
    mount('/admin/partner-applications/SOC-999999')
    expect(
      await screen.findByText(
        'La solicitud de socio no existe. Revisa la referencia.',
      ),
    ).toBeInTheDocument()
  })

  it('treats malformed references as not found without calling the backend', async () => {
    mount('/admin/partner-applications/123')
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
    expect(partnerApplications.get).not.toHaveBeenCalled()
  })

  it('marks as contacted with an optional note', async () => {
    const received = application()
    const contacted = application({
      status: 'CONTACTED',
      allowedTransitions: ['APPROVED', 'REJECTED', 'DISCARDED'],
    })
    vi.mocked(partnerApplications.get).mockResolvedValue(received)
    vi.mocked(partnerApplications.changeStatus).mockResolvedValue(contacted)
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000004')
    await user.click(
      await screen.findByRole('button', { name: 'Marcar como contactada' }),
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('textbox')).not.toBeRequired()
    await user.click(
      within(dialog).getByRole('button', { name: 'Marcar como contactada' }),
    )
    await waitFor(() =>
      expect(partnerApplications.changeStatus).toHaveBeenCalledWith(
        'SOC-000004',
        { status: 'CONTACTED' },
      ),
    )
    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeVisible()
    expect(
      screen.getByText('Solicitud SOC-000004: contactada.'),
    ).toBeInTheDocument()
  })

  it.each(['APPROVED', 'REJECTED', 'DISCARDED'] as const)(
    'requires a review note before %s',
    async (target) => {
      const contacted = application({
        status: 'CONTACTED',
        allowedTransitions: ['APPROVED', 'REJECTED', 'DISCARDED'],
      })
      vi.mocked(partnerApplications.get).mockResolvedValue(contacted)
      vi.mocked(partnerApplications.changeStatus).mockResolvedValue({
        ...contacted,
        status: target,
        allowedTransitions: target === 'APPROVED' ? ['REJECTED'] : [],
      })
      const labels = {
        APPROVED: 'Aprobar',
        REJECTED: 'Rechazar',
        DISCARDED: 'Descartar',
      }
      const user = userEvent.setup()
      mount('/admin/partner-applications/SOC-000004')
      await user.click(
        await screen.findByRole('button', { name: labels[target] }),
      )
      const dialog = screen.getByRole('dialog')
      const note = within(dialog).getByRole('textbox')
      expect(note).toBeRequired()
      expect(note).toHaveAttribute('maxLength', '500')
      // Whitespace is not a note; the form is checked before the backend is called.
      note.removeAttribute('required')
      await user.type(note, '   ')
      await user.click(
        within(dialog).getByRole('button', { name: labels[target] }),
      )
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Escribe una nota de revisión antes de confirmar.',
      )
      expect(partnerApplications.changeStatus).not.toHaveBeenCalled()
      await user.type(note, 'Validado por teléfono.')
      await user.click(
        within(dialog).getByRole('button', { name: labels[target] }),
      )
      await waitFor(() =>
        expect(partnerApplications.changeStatus).toHaveBeenCalledWith(
          'SOC-000004',
          { status: target, reviewNote: 'Validado por teléfono.' },
        ),
      )
    },
  )

  it('asks for a new note to reject an approved application', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue(fleetApproved)
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000003')
    const actions = (
      await screen.findByRole('heading', { name: 'Cambiar estado' })
    ).closest('section') as HTMLElement
    await user.click(within(actions).getByRole('button', { name: 'Rechazar' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Escribe una nota nueva con el motivo')
    // The previous note is never prefilled: the backend requires a new one.
    expect(within(dialog).getByRole('textbox')).toHaveValue('')
    within(dialog).getByRole('textbox').removeAttribute('required')
    await user.click(within(dialog).getByRole('button', { name: 'Rechazar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Escribe una nota nueva para rechazar una solicitud aprobada.',
    )
    expect(partnerApplications.changeStatus).not.toHaveBeenCalled()
  })

  it('shows 409 INVALID_TRANSITION by code and reloads the allowed transitions', async () => {
    const contacted = application({
      status: 'CONTACTED',
      allowedTransitions: ['APPROVED', 'REJECTED', 'DISCARDED'],
    })
    vi.mocked(partnerApplications.get)
      .mockResolvedValueOnce(contacted)
      .mockResolvedValue(
        application({ status: 'DISCARDED', allowedTransitions: [] }),
      )
    vi.mocked(partnerApplications.changeStatus).mockRejectedValue(
      conflict('PARTNER_APPLICATION_INVALID_TRANSITION'),
    )
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000004')
    await user.click(await screen.findByRole('button', { name: 'Aprobar' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Aprobada.')
    await user.click(within(dialog).getByRole('button', { name: 'Aprobar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'ese cambio de estado no está permitido',
    )
    await waitFor(() =>
      expect(partnerApplications.get).toHaveBeenCalledTimes(2),
    )
  })
})

describe('onboarding and links', () => {
  it('guides a FLEET conversion and registers provider and invitation', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue(fleetApproved)
    vi.mocked(partnerApplications.link).mockResolvedValue({
      ...fleetApproved,
      providerId: fleetProvider.id,
      invitationId: invitation().id,
    })
    vi.mocked(invitations.list).mockResolvedValue(
      page([
        invitation(),
        // The email search is partial; only the exact address is offered.
        invitation({ id: 'other', email: 'ana.maria@example.com' }),
      ]),
    )
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000003')
    const section = (
      await screen.findByRole('heading', { name: 'Alta en Mandaria' })
    ).closest('section') as HTMLElement
    expect(
      within(section).getByRole('link', { name: 'Nuevo proveedor' }),
    ).toHaveAttribute('href', '/providers/new')
    expect(section).toHaveTextContent('Invitar al administrador del proveedor')
    expect(section).toHaveTextContent('maria@example.com')
    await waitFor(() =>
      expect(invitations.list).toHaveBeenCalledWith(
        { kind: 'admin', role: 'PROVIDER_ADMIN' },
        { page: 1, pageSize: 100, search: 'maria@example.com' },
        expect.anything(),
      ),
    )
    expect(providers.list).toHaveBeenCalledWith(
      { page: 1, pageSize: 100, type: 'FLEET' },
      expect.anything(),
    )
    const providerSelect = within(section).getByRole('combobox', {
      name: 'Proveedor (flotilla)',
    })
    await waitFor(() => expect(providerSelect).toBeEnabled())
    await user.selectOptions(providerSelect, fleetProvider.id)
    const invitationSelect = within(section).getByRole('combobox', {
      name: 'Invitación',
    })
    expect(within(invitationSelect).getAllByRole('option')).toHaveLength(2)
    await user.selectOptions(invitationSelect, invitation().id)
    await user.click(
      within(section).getByRole('button', { name: 'Registrar vínculos' }),
    )
    await waitFor(() =>
      expect(partnerApplications.link).toHaveBeenCalledWith('SOC-000003', {
        providerId: fleetProvider.id,
        invitationId: invitation().id,
      }),
    )
    expect(
      await within(section).findByRole('link', {
        name: 'Ver proveedor vinculado',
      }),
    ).toHaveAttribute('href', `/providers/${fleetProvider.id}`)
  })

  it('refuses locally an invitation from another provider', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue({
      ...fleetApproved,
      providerId: fleetProvider.id,
    })
    vi.mocked(invitations.list).mockResolvedValue(
      page([
        invitation({
          providerId: otherProviderId,
          provider: { id: otherProviderId, name: 'Otra', code: 'OTRA' },
        }),
      ]),
    )
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000003')
    const select = await screen.findByRole('combobox', { name: 'Invitación' })
    await waitFor(() => expect(select).toBeEnabled())
    await user.selectOptions(select, invitation().id)
    await user.click(screen.getByRole('button', { name: 'Registrar vínculos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La invitación pertenece a otro proveedor.',
    )
    expect(partnerApplications.link).not.toHaveBeenCalled()
  })

  it('explains 409 LINK_INVALID by code', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue(fleetApproved)
    vi.mocked(partnerApplications.link).mockRejectedValue(
      conflict('PARTNER_APPLICATION_LINK_INVALID'),
    )
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000003')
    const select = await screen.findByRole('combobox', {
      name: 'Proveedor (flotilla)',
    })
    await waitFor(() => expect(select).toBeEnabled())
    await user.selectOptions(select, fleetProvider.id)
    await user.click(screen.getByRole('button', { name: 'Registrar vínculos' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Mandaria no aceptó el vínculo.')
    expect(alert).toHaveTextContent('tipo flotilla')
    expect(alert).toHaveTextContent('mismo correo de la solicitud')
    expect(alert).toHaveTextContent('pertenezca a ese proveedor')
    expect(alert).not.toHaveTextContent('ignored')
  })

  it('registers only the invitation for INDIVIDUAL and never fixes a provider', async () => {
    const approved = application({
      status: 'APPROVED',
      reviewNote: 'Aprobado.',
      allowedTransitions: ['REJECTED'],
    })
    vi.mocked(partnerApplications.get).mockResolvedValue(approved)
    vi.mocked(invitations.list).mockResolvedValue(
      page([
        invitation({
          role: 'DRIVER',
          email: approved.email,
          membershipRole: null,
          driverName: approved.contactName,
        }),
      ]),
    )
    vi.mocked(partnerApplications.link).mockResolvedValue({
      ...approved,
      invitationId: invitation().id,
    })
    const user = userEvent.setup()
    mount('/admin/partner-applications/SOC-000004')
    const section = (
      await screen.findByRole('heading', { name: 'Alta en Mandaria' })
    ).closest('section') as HTMLElement
    expect(section).toHaveTextContent('pendiente de decisión del propietario')
    expect(
      within(section).getByRole('link', { name: 'Abrir repartidores' }),
    ).toHaveAttribute('href', '/drivers')
    expect(
      within(section).getByRole('link', { name: 'Abrir independientes' }),
    ).toHaveAttribute('href', '/independent-drivers')
    expect(
      within(section).queryByRole('combobox', { name: 'Proveedor (flotilla)' }),
    ).not.toBeInTheDocument()
    expect(providers.list).not.toHaveBeenCalled()
    const select = within(section).getByRole('combobox', { name: 'Invitación' })
    await waitFor(() => expect(select).toBeEnabled())
    expect(invitations.list).toHaveBeenCalledWith(
      { kind: 'admin', role: 'DRIVER' },
      expect.objectContaining({ search: approved.email }),
      expect.anything(),
    )
    await user.selectOptions(select, invitation().id)
    await user.click(
      within(section).getByRole('button', { name: 'Registrar vínculos' }),
    )
    await waitFor(() =>
      expect(partnerApplications.link).toHaveBeenCalledWith('SOC-000004', {
        invitationId: invitation().id,
      }),
    )
  })

  it('keeps showing links after an approved application is rejected', async () => {
    vi.mocked(partnerApplications.get).mockResolvedValue({
      ...fleetApproved,
      status: 'REJECTED',
      allowedTransitions: [],
      providerId: fleetProvider.id,
      invitationId: invitation().id,
    })
    mount('/admin/partner-applications/SOC-000003')
    expect(
      await screen.findByRole('heading', { name: 'Vínculos registrados' }),
    ).toBeInTheDocument()
    expect(screen.getByText(invitation().id)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Registrar vínculos' }),
    ).not.toBeInTheDocument()
  })
})
