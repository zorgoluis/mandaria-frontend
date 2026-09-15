import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { ApiError, normalizeError } from '../services/errors'
import { providers } from '../providers/service'
import { drivers } from '../drivers/service'
import { vehicles } from '../vehicles/service'
import { assignments } from '../assignments/service'
import { capacity } from '../logistics/service'
import { labels } from '../utils/format'
import {
  vehicleTypes,
  vehicleStatuses,
  availabilityValues,
  type Driver,
  type Vehicle,
} from '../logistics/types'
import type { Role } from '../types/api'

vi.mock('../providers/service', () => ({
  providers: {
    list: vi.fn(),
    profiles: vi.fn(),
    get: vi.fn(),
    profile: vi.fn(),
  },
}))
vi.mock('../drivers/service', () => ({
  drivers: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
vi.mock('../vehicles/service', () => ({
  vehicles: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
vi.mock('../assignments/service', () => ({
  assignments: { history: vi.fn(), assign: vi.fn(), unassign: vi.fn() },
}))
vi.mock('../logistics/service', () => ({ capacity: vi.fn() }))
const stamp = '2026-09-15T12:00:00Z'
const uuid = '00000000-0000-4000-8000-000000000001'
const provider = {
  id: 'a',
  name: 'Proveedor A',
  code: 'A',
  type: 'FLEET' as const,
  status: 'ACTIVE' as const,
  maxDrivers: 10,
  maxVehicles: 10,
  createdAt: stamp,
  updatedAt: stamp,
}
const human = {
  id: uuid,
  email: 'driver@example.test',
  role: 'DRIVER' as const,
  active: true,
  emailVerifiedAt: null,
  createdAt: stamp,
  updatedAt: stamp,
}
const driver: Driver = {
  id: 'd',
  userId: uuid,
  providerId: 'a',
  name: 'Carlos',
  status: 'PENDING',
  availability: 'OFFLINE',
  user: human,
  currentAssignment: null,
  createdAt: stamp,
  updatedAt: stamp,
}
const vehicle: Vehicle = {
  id: 'v',
  providerId: 'a',
  identifier: 'BICI-01',
  type: 'BICYCLE',
  status: 'ACTIVE',
  plate: null,
  currentAssignment: null,
  createdAt: stamp,
  updatedAt: stamp,
}
const page = <T,>(items: T[], total = items.length) => ({
  items,
  total,
  totalPages: Math.ceil(total / 20),
  page: 1,
  pageSize: 20,
})
const scope = {
  role: 'PROVIDER_ADMIN',
  providerId: 'a',
  name: provider.name,
  status: provider.status,
}
function mount(path: string, role: Role = 'PROVIDER_ADMIN') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider
          value={{
            user: { ...human, role },
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
beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(providers.list).mockResolvedValue(page([provider]))
  vi.mocked(providers.get).mockResolvedValue(provider)
  const profile = {
    ...provider,
    membershipRole: 'OWNER' as const,
    limits: { maxDrivers: 10, maxVehicles: 10 },
  }
  vi.mocked(providers.profiles).mockResolvedValue(page([profile]))
  vi.mocked(providers.profile).mockResolvedValue(profile)
  vi.mocked(capacity).mockResolvedValue({
    providerId: 'a',
    drivers: { count: 1, max: 10 },
    vehicles: { count: 1, max: 10 },
  })
  vi.mocked(drivers.list).mockResolvedValue(page([driver]))
  vi.mocked(drivers.get).mockResolvedValue(driver)
  vi.mocked(drivers.create).mockResolvedValue(driver)
  vi.mocked(vehicles.list).mockResolvedValue(page([vehicle]))
  vi.mocked(vehicles.get).mockResolvedValue(vehicle)
  vi.mocked(vehicles.create).mockResolvedValue(vehicle)
  vi.mocked(assignments.history).mockResolvedValue(page([]))
})
describe('scope and permissions', () => {
  it('requires an explicit selection when the account has multiple memberships', async () => {
    const profile = {
      ...provider,
      membershipRole: 'OWNER' as const,
      limits: { maxDrivers: 10, maxVehicles: 10 },
    }
    vi.mocked(providers.profiles).mockResolvedValue(
      page([profile, { ...profile, id: 'b', name: 'Proveedor B' }]),
    )
    mount('/drivers')
    await screen.findByLabelText('Seleccionar proveedor')
    expect(providers.profile).not.toHaveBeenCalled()
    expect(drivers.list).not.toHaveBeenCalled()
  })
  it.each([
    '/drivers',
    '/vehicles',
    '/drivers/new',
    '/vehicles/new',
    '/drivers/d',
    '/vehicles/v',
  ])('blocks DRIVER from %s without requests', (path) => {
    mount(path, 'DRIVER')
    expect(screen.getByText('Sin permisos')).toBeInTheDocument()
    expect(providers.profiles).not.toHaveBeenCalled()
    expect(drivers.list).not.toHaveBeenCalled()
    expect(vehicles.list).not.toHaveBeenCalled()
  })
  it.each(['/drivers', '/vehicles'])(
    'safe empty state without membership at %s',
    async (path) => {
      vi.mocked(providers.profiles).mockResolvedValue(page([]))
      mount(path)
      expect(
        await screen.findByText('Aún no tienes un proveedor asociado'),
      ).toBeInTheDocument()
      expect(drivers.list).not.toHaveBeenCalled()
      expect(vehicles.list).not.toHaveBeenCalled()
      expect(providers.list).not.toHaveBeenCalled()
    },
  )
  it.each(['/drivers?providerId=b', '/vehicles/v?providerId=b'])(
    'rejects foreign provider before rendering resources at %s',
    async (path) => {
      vi.mocked(providers.profile).mockRejectedValue(
        new ApiError(403, 'Sin permisos para este proveedor.'),
      )
      mount(path)
      expect(await screen.findByText('403 — Sin permisos')).toBeInTheDocument()
      expect(drivers.list).not.toHaveBeenCalled()
      expect(vehicles.get).not.toHaveBeenCalled()
      expect(screen.queryByText('Carlos')).not.toBeInTheDocument()
    },
  )
  it('SUPER_ADMIN explicitly selects provider; no collection scan', async () => {
    mount('/drivers', 'SUPER_ADMIN')
    await screen.findByLabelText('Seleccionar proveedor')
    expect(drivers.list).not.toHaveBeenCalled()
    await userEvent.selectOptions(
      screen.getByLabelText('Seleccionar proveedor'),
      'a',
    )
    await screen.findByText('Carlos')
    expect(drivers.list).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'SUPER_ADMIN', providerId: 'a' }),
      expect.anything(),
      expect.any(AbortSignal),
    )
    expect(providers.profiles).not.toHaveBeenCalled()
  })
})
describe('drivers', () => {
  it('reports a concurrent capacity conflict while preserving form data', async () => {
    vi.mocked(drivers.create).mockRejectedValue(
      normalizeError(409, { message: 'Provider driver limit reached' }),
    )
    mount('/drivers/new?providerId=a')
    const actor = userEvent.setup()
    await actor.type(await screen.findByLabelText('Nombre operativo'), 'Carlos')
    await actor.type(screen.getByLabelText('ID del usuario'), uuid)
    await actor.click(screen.getByRole('button', { name: 'Crear repartidor' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Límite de repartidores alcanzado',
    )
    expect(screen.getByLabelText('Nombre operativo')).toHaveValue('Carlos')
  })
  it('lists, filters and paginates server data within the membership', async () => {
    vi.mocked(drivers.list).mockResolvedValue(page([driver], 21))
    mount('/drivers')
    await screen.findByText('Carlos')
    const actor = userEvent.setup()
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'ACTIVE',
    )
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por disponibilidad'),
      'AVAILABLE',
    )
    await actor.type(screen.getByLabelText('Buscar'), 'Carlos')
    await actor.click(screen.getByRole('button', { name: 'Buscar' }))
    await actor.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(drivers.list).toHaveBeenLastCalledWith(
        scope,
        {
          page: 2,
          pageSize: 20,
          status: 'ACTIVE',
          availability: 'AVAILABLE',
          search: 'Carlos',
        },
        expect.any(AbortSignal),
      ),
    )
    expect(providers.list).not.toHaveBeenCalled()
  })
  it.each(availabilityValues)(
    'shows persisted %s without an administrative control',
    async (availability) => {
      vi.mocked(drivers.get).mockResolvedValue({ ...driver, availability })
      mount('/drivers/d?providerId=a')
      expect(await screen.findByText(labels[availability])).toBeInTheDocument()
      expect(screen.queryByLabelText('Disponibilidad')).not.toBeInTheDocument()
    },
  )
  it('creates a driver with only DTO fields', async () => {
    mount('/drivers/new?providerId=a')
    const actor = userEvent.setup()
    await actor.type(await screen.findByLabelText('Nombre operativo'), 'Carlos')
    await actor.type(screen.getByLabelText(/ID del usuario/), uuid)
    await actor.click(screen.getByRole('button', { name: 'Crear repartidor' }))
    await waitFor(() =>
      expect(drivers.create).toHaveBeenCalledWith(scope, {
        name: 'Carlos',
        userId: uuid,
      }),
    )
  })
  it.each(['ACTIVE', 'SUSPENDED'] as const)(
    'confirms transition to %s',
    async (status) => {
      mount('/drivers/d?providerId=a')
      const actor = userEvent.setup()
      await actor.click(
        await screen.findByRole('button', {
          name:
            status === 'ACTIVE' ? 'Activar repartidor' : 'Suspender repartidor',
        }),
      )
      expect(drivers.update).not.toHaveBeenCalled()
      await actor.click(screen.getByRole('button', { name: 'Confirmar' }))
      await waitFor(() =>
        expect(drivers.update).toHaveBeenCalledWith(scope, 'd', { status }),
      )
    },
  )
})
describe('capacity', () => {
  it.each(['drivers', 'vehicles'] as const)(
    'disables %s create and direct URL at capacity',
    async (kind) => {
      vi.mocked(capacity).mockResolvedValue({
        providerId: 'a',
        drivers: { count: 10, max: 10 },
        vehicles: { count: 10, max: 10 },
      })
      mount(`/${kind}/new?providerId=a`)
      expect(await screen.findByText('Límite alcanzado')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Crear/ }),
      ).not.toBeInTheDocument()
    },
  )
  it('never counts filtered lists to determine capacity', async () => {
    vi.mocked(drivers.list).mockResolvedValue(page([]))
    vi.mocked(capacity).mockResolvedValue({
      providerId: 'a',
      drivers: { count: 10, max: 10 },
      vehicles: { count: 1, max: 10 },
    })
    mount('/drivers?status=ACTIVE')
    expect(
      await screen.findByRole('button', { name: 'Nuevo repartidor' }),
    ).toBeDisabled()
    expect(await screen.findByText('10 / 10')).toBeInTheDocument()
  })
})
describe('vehicles', () => {
  it.each(vehicleTypes)(
    'creates %s without a plate and without hardcoded status',
    async (type) => {
      mount('/vehicles/new?providerId=a')
      const actor = userEvent.setup()
      await actor.type(await screen.findByLabelText(/Identificador/), 'BICI-01')
      await actor.selectOptions(screen.getByLabelText('Tipo'), type)
      await actor.click(screen.getByRole('button', { name: 'Crear vehículo' }))
      await waitFor(() =>
        expect(vehicles.create).toHaveBeenCalledWith(scope, {
          identifier: 'BICI-01',
          type,
          brand: null,
          model: null,
          color: null,
          year: null,
          plate: null,
        }),
      )
    },
  )
  it.each(vehicleStatuses)('shows vehicle state %s', async (status) => {
    vi.mocked(vehicles.list).mockResolvedValue(page([{ ...vehicle, status }]))
    mount('/vehicles?providerId=a')
    expect(
      await screen.findByText(labels[status], { selector: '.badge' }),
    ).toBeInTheDocument()
  })
  it('filters vehicles with supported fields', async () => {
    mount('/vehicles?providerId=a')
    await screen.findByText('BICI-01')
    const actor = userEvent.setup()
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      'BICYCLE',
    )
    await actor.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'MAINTENANCE',
    )
    await waitFor(() =>
      expect(vehicles.list).toHaveBeenLastCalledWith(
        scope,
        expect.objectContaining({
          type: 'BICYCLE',
          status: 'MAINTENANCE',
          page: 1,
        }),
        expect.any(AbortSignal),
      ),
    )
  })
  it('confirms vehicle maintenance before mutation', async () => {
    mount('/vehicles/v?providerId=a')
    const actor = userEvent.setup()
    await actor.selectOptions(
      await screen.findByLabelText('Cambiar estado'),
      'MAINTENANCE',
    )
    expect(vehicles.update).not.toHaveBeenCalled()
    await actor.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() =>
      expect(vehicles.update).toHaveBeenCalledWith(scope, 'v', {
        status: 'MAINTENANCE',
      }),
    )
  })
})
describe('assignments', () => {
  it('lists only active free vehicles from same provider and assigns', async () => {
    vi.mocked(vehicles.list).mockResolvedValue(
      page([
        vehicle,
        {
          ...vehicle,
          id: 'occupied',
          identifier: 'OCCUPIED',
          currentAssignment: { id: 'x', assignedAt: stamp, driver },
        },
        { ...vehicle, id: 'foreign', providerId: 'b', identifier: 'FOREIGN' },
        {
          ...vehicle,
          id: 'maintenance',
          status: 'MAINTENANCE',
          identifier: 'MAINTENANCE',
        },
      ]),
    )
    mount('/drivers/d?providerId=a')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Asignar vehículo' }),
    )
    const selector = await screen.findByLabelText('Seleccionar vehículo')
    expect(within(selector).getAllByRole('option')).toHaveLength(2)
    await actor.selectOptions(selector, 'v')
    await actor.click(screen.getByRole('button', { name: 'Asignar' }))
    await waitFor(() =>
      expect(assignments.assign).toHaveBeenCalledWith(scope, 'd', 'v'),
    )
  })
  it.each([
    'Driver already has an active vehicle assignment',
    'Vehicle is already assigned to another driver',
    'Only ACTIVE vehicles can be assigned',
    'Suspended drivers cannot receive vehicles',
    'Vehicle not found',
  ])('shows safe backend assignment failure: %s', async (message) => {
    vi.mocked(assignments.assign).mockRejectedValue(
      normalizeError(message === 'Vehicle not found' ? 404 : 409, { message }),
    )
    mount('/drivers/d?providerId=a')
    const actor = userEvent.setup()
    await actor.click(
      await screen.findByRole('button', { name: 'Asignar vehículo' }),
    )
    await actor.selectOptions(
      await screen.findByLabelText('Seleccionar vehículo'),
      'v',
    )
    await actor.click(screen.getByRole('button', { name: 'Asignar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      normalizeError(409, { message }).message,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('requires confirmation to unassign and preserves history', async () => {
    vi.mocked(drivers.get).mockResolvedValue({
      ...driver,
      currentAssignment: { id: 'as', assignedAt: stamp, vehicle },
    })
    vi.mocked(assignments.history).mockResolvedValue(
      page([
        {
          id: 'as',
          providerId: 'a',
          driverId: 'd',
          vehicleId: 'v',
          assignedAt: stamp,
          unassignedAt: null,
          driver,
          vehicle,
        },
      ]),
    )
    mount('/drivers/d?providerId=a')
    const actor = userEvent.setup()
    await actor.click(await screen.findByRole('button', { name: 'Desasignar' }))
    expect(assignments.unassign).not.toHaveBeenCalled()
    expect(screen.getByText('Actual')).toBeInTheDocument()
    await actor.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Desasignar',
      }),
    )
    await waitFor(() =>
      expect(assignments.unassign).toHaveBeenCalledWith(scope, 'd'),
    )
  })
  it('blocks assigning suspended drivers', async () => {
    vi.mocked(drivers.get).mockResolvedValue({ ...driver, status: 'SUSPENDED' })
    mount('/drivers/d?providerId=a')
    expect(
      await screen.findByRole('button', { name: 'Asignar vehículo' }),
    ).toBeDisabled()
  })
})
