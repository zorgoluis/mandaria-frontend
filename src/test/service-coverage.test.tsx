import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { normalizeError } from '../services/errors'
import { providers } from '../providers/service'
import { users } from '../users/service'
import { serviceZones } from '../pricing/service'
import {
  myServiceCoverages,
  serviceCoverages,
} from '../service-coverage/service'
import { serviceTypeLabel } from '../service-coverage/format'
import type { ServiceCoverage } from '../service-coverage/types'
import type { Provider, Role } from '../types/api'

vi.mock('../service-coverage/service', () => ({
  serviceCoverages: { list: vi.fn(), create: vi.fn(), setStatus: vi.fn() },
  myServiceCoverages: { list: vi.fn() },
}))
vi.mock('../pricing/service', () => ({
  serviceZones: { list: vi.fn() },
  ratePlans: { list: vi.fn() },
}))
vi.mock('../invitations/service', () => ({
  invitations: {
    list: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      totalPages: 0,
      page: 1,
      pageSize: 20,
    }),
    inviteProviderAdmin: vi.fn(),
    inviteDriver: vi.fn(),
    resend: vi.fn(),
    revoke: vi.fn(),
  },
  accounts: { list: vi.fn().mockResolvedValue([]), activate: vi.fn() },
}))
vi.mock('../logistics/service', () => ({
  capacity: vi.fn().mockResolvedValue({
    providerId: 'provider-1',
    drivers: { count: 0, max: 10 },
    vehicles: { count: 0, max: 12 },
  }),
}))
vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    members: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    profiles: vi.fn(),
    profile: vi.fn(),
  },
}))
vi.mock('../users/service', () => ({ users: { list: vi.fn() } }))

const stamp = '2026-09-21T12:00:00Z'
const PROVIDER = '11111111-1111-4111-8111-111111111111'
const OCOZO = '22222222-2222-4222-8222-222222222222'
const TUXTLA = '33333333-3333-4333-8333-333333333333'

const provider: Provider = {
  id: PROVIDER,
  name: 'Rápidos de Coita',
  code: 'RAPIDOS',
  type: 'FLEET',
  status: 'ACTIVE',
  maxDrivers: 10,
  maxVehicles: 12,
  createdAt: stamp,
  updatedAt: stamp,
}
const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  totalPages: items.length ? 1 : 0,
  page: 1,
  pageSize: 20,
})
/** Exactly the backend READ shape: the zone is nested and there is no serviceZoneId. */
function coverage(over: Partial<ServiceCoverage> = {}): ServiceCoverage {
  return {
    id: 'coverage-ocozo',
    providerId: PROVIDER,
    serviceType: 'LOCAL_DELIVERY',
    status: 'ACTIVE',
    createdAt: stamp,
    updatedAt: stamp,
    serviceZone: {
      id: OCOZO,
      code: 'LOCAL_OCOZOCOAUTLA',
      name: 'Ocozocoautla de Espinosa',
      status: 'ACTIVE',
    },
    ...over,
  }
}
const tuxtlaInactive = coverage({
  id: 'coverage-tuxtla',
  status: 'INACTIVE',
  serviceZone: {
    id: TUXTLA,
    code: 'LOCAL_TUXTLA',
    name: 'Tuxtla Gutiérrez',
    status: 'ACTIVE',
  },
})
const zone = (id: string, name: string, status: 'ACTIVE' | 'INACTIVE') => ({
  id,
  code: name.toUpperCase(),
  name,
  status,
  currency: 'MXN',
  minLatitude: 0,
  maxLatitude: 1,
  minLongitude: 0,
  maxLongitude: 1,
  createdAt: stamp,
  updatedAt: stamp,
})

function mount(path: string, role: Role = 'SUPER_ADMIN') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider
          value={{
            user: {
              id: 'user-1',
              email: 'someone@example.test',
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
          }}
        >
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const panel = async () =>
  within(await screen.findByRole('region', { name: 'Cobertura de servicio' }))
const dialog = () => within(screen.getByRole('dialog'))

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
  vi.mocked(providers.get).mockResolvedValue(provider)
  vi.mocked(providers.members).mockResolvedValue(page([]))
  vi.mocked(providers.profiles).mockResolvedValue(page([provider]) as never)
  vi.mocked(providers.profile).mockResolvedValue({
    id: PROVIDER,
    name: provider.name,
    code: provider.code,
    type: 'FLEET',
    status: 'ACTIVE',
    limits: { maxDrivers: 10, maxVehicles: 12 },
    membershipRole: 'OWNER',
  })
  vi.mocked(users.list).mockResolvedValue([])
  vi.mocked(serviceCoverages.list).mockResolvedValue([
    tuxtlaInactive,
    coverage(),
  ])
  vi.mocked(myServiceCoverages.list).mockResolvedValue([coverage()])
  vi.mocked(serviceZones.list).mockResolvedValue(
    page([
      zone(OCOZO, 'Ocozocoautla de Espinosa', 'ACTIVE'),
      zone(TUXTLA, 'Tuxtla Gutiérrez', 'ACTIVE'),
      zone('44444444-4444-4444-8444-444444444444', 'San Cristóbal', 'INACTIVE'),
    ]),
  )
})

describe('SUPER_ADMIN coverage in the provider detail', () => {
  it('lists zone, service type and status from the nested serviceZone', async () => {
    mount(`/providers/${PROVIDER}`)
    const section = await panel()
    expect(
      await section.findByText('Ocozocoautla de Espinosa'),
    ).toBeInTheDocument()
    expect(section.getByText('Tuxtla Gutiérrez')).toBeInTheDocument()
    expect(section.getAllByText('Entrega local')).toHaveLength(2)
    expect(section.getByText('Activa')).toBeInTheDocument()
    expect(section.getByText('Inactiva')).toBeInTheDocument()
    expect(serviceCoverages.list).toHaveBeenCalledWith(
      PROVIDER,
      expect.anything(),
    )
    // Active coverage is read first.
    const rows = section.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Ocozocoautla')
    expect(
      section.getByRole('button', {
        name: 'Desactivar cobertura de Ocozocoautla de Espinosa, Entrega local',
      }),
    ).toBeInTheDocument()
    expect(
      section.getByRole('button', {
        name: 'Activar cobertura de Tuxtla Gutiérrez, Entrega local',
      }),
    ).toBeInTheDocument()
  })
  it('never offers to delete a coverage', async () => {
    mount(`/providers/${PROVIDER}`)
    const section = await panel()
    await section.findByText('Ocozocoautla de Espinosa')
    expect(
      section.queryByRole('button', { name: /Eliminar|Borrar|Quitar/i }),
    ).toBeNull()
  })
  it('shows a loading state while the backend answers', async () => {
    vi.mocked(serviceCoverages.list).mockReturnValue(new Promise(() => {}))
    mount(`/providers/${PROVIDER}`)
    const section = await panel()
    expect(section.getByRole('status')).toHaveTextContent(
      'Cargando información',
    )
  })
  it('keeps backend errors safe and retryable', async () => {
    vi.mocked(serviceCoverages.list).mockRejectedValue(
      normalizeError(500, { message: 'prisma P2002 internal detail' }),
    )
    mount(`/providers/${PROVIDER}`)
    const section = await panel()
    expect(
      await section.findByText(/No se pudo cargar la información/),
    ).toBeInTheDocument()
    expect(section.queryByText(/prisma|internal detail/)).toBeNull()
    expect(section.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })
  it('explains an empty coverage without claiming dispatches stop opening', async () => {
    vi.mocked(serviceCoverages.list).mockResolvedValue([])
    mount(`/providers/${PROVIDER}`)
    const section = await panel()
    expect(
      await section.findByText(
        'Este proveedor todavía no tiene cobertura de servicio configurada.',
      ),
    ).toBeInTheDocument()
    expect(
      section.getByText(
        'Sin cobertura activa no recibirá nuevos servicios de flotilla para esas zonas.',
      ),
    ).toBeInTheDocument()
    expect(section.queryByText(/No se crear[áa]n/i)).toBeNull()
    expect(
      section.getByRole('button', { name: 'Agregar cobertura' }),
    ).toBeInTheDocument()
  })
})

describe('create, deactivate and reactivate', () => {
  it('creates with the flat write shape and refetches from the backend', async () => {
    vi.mocked(serviceCoverages.list).mockResolvedValue([coverage()])
    vi.mocked(serviceCoverages.create).mockResolvedValue(
      coverage({ id: 'new' }),
    )
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await user.click(
      await section.findByRole('button', { name: 'Agregar cobertura' }),
    )
    const zones = await dialog().findByLabelText('Zona de servicio')
    // Zones come from the real V1.6 catalog; an inactive one is labelled, not hidden.
    expect(
      within(zones).getByRole('option', { name: 'San Cristóbal (inactiva)' }),
    ).toBeInTheDocument()
    expect(
      within(dialog().getByLabelText('Tipo de servicio')).getByRole('option', {
        name: 'Entrega local',
      }),
    ).toHaveValue('LOCAL_DELIVERY')
    await user.selectOptions(zones, TUXTLA)
    const before = vi.mocked(serviceCoverages.list).mock.calls.length
    await user.click(
      dialog().getByRole('button', { name: 'Agregar cobertura' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(serviceCoverages.create).toHaveBeenCalledWith(PROVIDER, {
      serviceZoneId: TUXTLA,
      serviceType: 'LOCAL_DELIVERY',
    })
    expect(vi.mocked(serviceCoverages.list).mock.calls.length).toBeGreaterThan(
      before,
    )
    expect(await screen.findByText('Cobertura agregada.')).toBeInTheDocument()
  })
  it('requires a zone before calling the backend', async () => {
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await user.click(
      await section.findByRole('button', { name: 'Agregar cobertura' }),
    )
    await dialog().findByLabelText('Zona de servicio')
    await user.click(
      dialog().getByRole('button', { name: 'Agregar cobertura' }),
    )
    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'Elige la zona de servicio.',
    )
    expect(serviceCoverages.create).not.toHaveBeenCalled()
  })
  it('turns SERVICE_COVERAGE_EXISTS on an inactive row into a PATCH reactivation', async () => {
    vi.mocked(serviceCoverages.create).mockRejectedValue(
      normalizeError(409, {
        code: 'SERVICE_COVERAGE_EXISTS',
        message: 'Provider already has coverage for this zone and service type',
      }),
    )
    vi.mocked(serviceCoverages.setStatus).mockResolvedValue(
      coverage({ ...tuxtlaInactive, status: 'ACTIVE' }),
    )
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await section.findByText('Tuxtla Gutiérrez')
    await user.click(section.getByRole('button', { name: 'Agregar cobertura' }))
    await user.selectOptions(
      await dialog().findByLabelText('Zona de servicio'),
      TUXTLA,
    )
    await user.click(
      dialog().getByRole('button', { name: 'Agregar cobertura' }),
    )
    expect(
      await dialog().findByText(
        'Esta cobertura ya existe, pero está desactivada. ¿Deseas reactivarla?',
      ),
    ).toBeInTheDocument()
    expect(dialog().queryByText(/Provider already has/)).toBeNull()
    expect(
      dialog().getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument()
    await user.click(dialog().getByRole('button', { name: 'Reactivar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(serviceCoverages.setStatus).toHaveBeenCalledWith(
      PROVIDER,
      'coverage-tuxtla',
      'ACTIVE',
    )
    expect(serviceCoverages.create).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Cobertura reactivada.')).toBeInTheDocument()
  })
  it('says an already active duplicate needs nothing', async () => {
    vi.mocked(serviceCoverages.create).mockRejectedValue(
      normalizeError(409, { code: 'SERVICE_COVERAGE_EXISTS', message: 'x' }),
    )
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await section.findByText('Ocozocoautla de Espinosa')
    await user.click(section.getByRole('button', { name: 'Agregar cobertura' }))
    await user.selectOptions(
      await dialog().findByLabelText('Zona de servicio'),
      OCOZO,
    )
    await user.click(
      dialog().getByRole('button', { name: 'Agregar cobertura' }),
    )
    expect(
      await dialog().findByText(/ya existe y está activa/),
    ).toBeInTheDocument()
    expect(serviceCoverages.setStatus).not.toHaveBeenCalled()
  })
  it('warns that deactivating keeps the frozen candidates and blocks new claims', async () => {
    vi.mocked(serviceCoverages.setStatus).mockResolvedValue(
      coverage({ status: 'INACTIVE' }),
    )
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await user.click(
      await section.findByRole('button', {
        name: 'Desactivar cobertura de Ocozocoautla de Espinosa, Entrega local',
      }),
    )
    const note = dialog().getByRole('note')
    expect(note).toHaveTextContent(
      'La desactivación afectará los nuevos servicios.',
    )
    expect(note).toHaveTextContent(
      'conservan los candidatos calculados al momento de su apertura',
    )
    expect(note).toHaveTextContent('ya no podrá reclamarlos')
    const before = vi.mocked(serviceCoverages.list).mock.calls.length
    await user.click(dialog().getByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(serviceCoverages.setStatus).toHaveBeenCalledWith(
      PROVIDER,
      'coverage-ocozo',
      'INACTIVE',
    )
    expect(vi.mocked(serviceCoverages.list).mock.calls.length).toBeGreaterThan(
      before,
    )
    expect(
      await screen.findByText('Cobertura desactivada.'),
    ).toBeInTheDocument()
  })
  it('warns that activating does not recalculate open services', async () => {
    vi.mocked(serviceCoverages.setStatus).mockResolvedValue(
      coverage({ ...tuxtlaInactive, status: 'ACTIVE' }),
    )
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await user.click(
      await section.findByRole('button', {
        name: 'Activar cobertura de Tuxtla Gutiérrez, Entrega local',
      }),
    )
    expect(dialog().getByRole('note')).toHaveTextContent(
      'Los servicios abiertos anteriormente no recalculan automáticamente sus candidatos.',
    )
    await user.click(dialog().getByRole('button', { name: 'Activar' }))
    await waitFor(() =>
      expect(serviceCoverages.setStatus).toHaveBeenCalledWith(
        PROVIDER,
        'coverage-tuxtla',
        'ACTIVE',
      ),
    )
  })
  it('keeps a failed PATCH on screen with a safe message', async () => {
    vi.mocked(serviceCoverages.setStatus).mockRejectedValue(
      normalizeError(404, { message: 'Coverage not found' }),
    )
    mount(`/providers/${PROVIDER}`)
    const user = userEvent.setup()
    const section = await panel()
    await user.click(
      await section.findByRole('button', {
        name: 'Desactivar cobertura de Ocozocoautla de Espinosa, Entrega local',
      }),
    )
    await user.click(dialog().getByRole('button', { name: 'Desactivar' }))
    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'Esa cobertura ya no existe para este proveedor. Actualiza la lista.',
    )
  })
})

describe('PROVIDER_ADMIN read only', () => {
  it('shows its own coverage without any administrative control', async () => {
    mount('/provider/profile', 'PROVIDER_ADMIN')
    const section = within(
      await screen.findByRole('region', { name: 'Mi cobertura' }),
    )
    expect(
      await section.findByText('Ocozocoautla de Espinosa'),
    ).toBeInTheDocument()
    expect(section.getByText('Entrega local')).toBeInTheDocument()
    expect(section.getByText('Activa')).toBeInTheDocument()
    expect(myServiceCoverages.list).toHaveBeenCalledWith(
      PROVIDER,
      expect.anything(),
    )
    expect(section.queryByRole('button')).toBeNull()
    expect(serviceCoverages.list).not.toHaveBeenCalled()
    expect(serviceCoverages.create).not.toHaveBeenCalled()
    expect(serviceCoverages.setStatus).not.toHaveBeenCalled()
  })
  it('tells the provider to contact Mandaria when it has no coverage', async () => {
    vi.mocked(myServiceCoverages.list).mockResolvedValue([])
    mount('/provider/profile', 'PROVIDER_ADMIN')
    const section = within(
      await screen.findByRole('region', { name: 'Mi cobertura' }),
    )
    expect(
      await section.findByText(
        'Tu proveedor no tiene cobertura de servicio configurada.',
      ),
    ).toBeInTheDocument()
    expect(
      section.getByText(
        'Contacta al administrador de Mandaria para habilitar zonas de operación.',
      ),
    ).toBeInTheDocument()
    expect(section.queryByRole('button')).toBeNull()
  })
})

describe('role isolation', () => {
  it.each<Role>(['PROVIDER_ADMIN', 'DRIVER'])(
    '%s cannot open the provider administration with its coverage',
    async (role) => {
      mount(`/providers/${PROVIDER}`, role)
      expect(
        await screen.findByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Cobertura de servicio')).toBeNull()
      expect(serviceCoverages.list).not.toHaveBeenCalled()
    },
  )
  it.each<Role>(['SUPER_ADMIN', 'DRIVER'])(
    '%s does not get the provider read-only coverage view',
    async (role) => {
      mount('/provider/profile', role)
      expect(
        await screen.findByRole('heading', { name: 'Sin permisos' }),
      ).toBeInTheDocument()
      expect(myServiceCoverages.list).not.toHaveBeenCalled()
    },
  )
})

describe('format', () => {
  it('labels known service types and keeps unknown future ones readable', () => {
    expect(serviceTypeLabel('LOCAL_DELIVERY')).toBe('Entrega local')
    expect(serviceTypeLabel('FREIGHT')).toBe('Otro tipo de servicio')
    expect(serviceTypeLabel('PRIVATE_TRANSPORT')).toBe('Otro tipo de servicio')
  })
})
