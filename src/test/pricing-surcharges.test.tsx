import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '../app/App'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { ApiError } from '../services/errors'
import { serviceZones } from '../pricing/service'
import {
  pricingSurcharges,
  type Surcharge,
} from '../pricing/surcharges-service'
import { surchargeStatus } from '../pricing/surcharges-format'
import type { Role } from '../types/api'

vi.mock('../pricing/service', () => ({ serviceZones: { list: vi.fn() } }))
vi.mock('../pricing/surcharges-service', () => ({
  pricingSurcharges: { list: vi.fn(), create: vi.fn(), deactivate: vi.fn() },
}))
const zoneId = '11111111-1111-4111-8111-111111111111'
const stamp = '2026-11-24T12:00:00Z'
const row: Surcharge = {
  id: '22222222-2222-4222-8222-222222222222',
  serviceZoneId: zoneId,
  serviceType: 'LOCAL_DELIVERY',
  kind: 'SCHEDULE',
  amount: '5.00',
  currency: 'MXN',
  reason: 'Horario nocturno',
  timeZone: 'America/Mexico_City',
  weekdays: [1, 2, 3],
  startMinute: 1320,
  endMinute: 360,
  expiresAt: null,
  disabledAt: null,
  createdAt: stamp,
  createdBy: 'admin',
  disabledBy: null,
  disableReason: null,
}
const page = <T,>(items: T[]) => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: items.length ? 1 : 0,
})
function mount(role: Role = 'SUPER_ADMIN') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pricing-surcharges']}>
        <AuthContext.Provider
          value={{
            user: {
              id: 'admin',
              email: 'admin@example.test',
              role,
              active: true,
              emailVerifiedAt: stamp,
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
async function createForm() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nuevo recargo' }),
  )
  return within(screen.getByRole('dialog', { name: 'Nuevo recargo' }))
}
beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(serviceZones.list).mockResolvedValue(
    page([
      {
        id: zoneId,
        code: 'ZONA',
        name: 'Zona centro',
        currency: 'MXN',
        status: 'ACTIVE',
        minLatitude: 0,
        maxLatitude: 1,
        minLongitude: 0,
        maxLongitude: 1,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ]),
  )
  vi.mocked(pricingSurcharges.list).mockResolvedValue(page([row]))
  vi.mocked(pricingSurcharges.create).mockResolvedValue(row)
  vi.mocked(pricingSurcharges.deactivate).mockResolvedValue({
    ...row,
    disabledAt: stamp,
  })
})

describe('administración de recargos', () => {
  it('crea lluvia automática con monto y zona, sin vencimiento ni horario', async () => {
    mount()
    const form = await createForm()
    await userEvent.selectOptions(
      form.getByLabelText('Tipo de recargo'),
      'AUTOMATIC_RAIN',
    )
    expect(form.queryByLabelText('Vence el')).not.toBeInTheDocument()
    expect(form.queryByLabelText('Desde')).not.toBeInTheDocument()
    expect(form.getByText(/sólo el mayor importe/)).toBeVisible()
    await userEvent.type(
      form.getByLabelText('Motivo'),
      'Lluvia detectada en zona',
    )
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    await waitFor(() =>
      expect(pricingSurcharges.create).toHaveBeenCalledWith({
        serviceZoneId: zoneId,
        serviceType: 'LOCAL_DELIVERY',
        kind: 'AUTOMATIC_RAIN',
        amount: '5.00',
        reason: 'Lluvia detectada en zona',
      }),
    )
  })
  it('presenta la regla automática como condicionada y permite desactivarla', async () => {
    vi.mocked(pricingSurcharges.list).mockResolvedValue(
      page([
        {
          ...row,
          kind: 'AUTOMATIC_RAIN',
          timeZone: null,
          weekdays: [],
          startMinute: null,
          endMinute: null,
        },
      ]),
    )
    mount()
    expect(await screen.findByText('Condicionado a lluvia')).toBeVisible()
    expect(
      screen.getByText('Sólo con lluvia vigente en el punto de la zona'),
    ).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    await userEvent.type(
      screen.getByLabelText('Motivo de desactivación'),
      'Pausar recargo automático',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar desactivación' }),
    )
    await waitFor(() =>
      expect(pricingSurcharges.deactivate).toHaveBeenCalledWith(
        row.id,
        'Pausar recargo automático',
      ),
    )
  })
  it('muestra horario nocturno, moneda y regla de acumulación', async () => {
    mount()
    expect(
      await screen.findByText('22:00–06:00 (día siguiente)'),
    ).toBeInTheDocument()
    expect(screen.getByText('Programado')).toBeInTheDocument()
    expect(screen.getByText('+5.00 MXN')).toBeInTheDocument()
    expect(screen.getByText(/Se suma el mayor recargo/)).toBeInTheDocument()
  })
  it('crea horario con días y zona horaria explícitos', async () => {
    mount()
    const form = await createForm()
    await userEvent.type(form.getByLabelText('Motivo'), 'Horario nocturno')
    await userEvent.click(form.getByLabelText('Domingo'))
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    await waitFor(() =>
      expect(pricingSurcharges.create).toHaveBeenCalledWith({
        serviceZoneId: zoneId,
        serviceType: 'LOCAL_DELIVERY',
        kind: 'SCHEDULE',
        amount: '5.00',
        reason: 'Horario nocturno',
        timeZone: 'America/Mexico_City',
        weekdays: [1, 2, 3, 4, 5, 6],
        startMinute: 1320,
        endMinute: 360,
      }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
  it('crea lluvia con vencimiento ISO y sin campos de horario', async () => {
    mount()
    const form = await createForm()
    await userEvent.selectOptions(
      form.getByLabelText('Tipo de recargo'),
      'MANUAL_RAIN',
    )
    fireEvent.change(form.getByLabelText('Vence el'), {
      target: { value: '2099-01-01T19:30' },
    })
    await userEvent.type(form.getByLabelText('Motivo'), 'Lluvia en la zona')
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    await waitFor(() =>
      expect(pricingSurcharges.create).toHaveBeenCalledWith({
        serviceZoneId: zoneId,
        serviceType: 'LOCAL_DELIVERY',
        kind: 'MANUAL_RAIN',
        amount: '5.00',
        reason: 'Lluvia en la zona',
        expiresAt: new Date('2099-01-01T19:30').toISOString(),
      }),
    )
  })
  it('rechaza lluvia con vencimiento pasado', async () => {
    mount()
    const form = await createForm()
    await userEvent.selectOptions(
      form.getByLabelText('Tipo de recargo'),
      'MANUAL_RAIN',
    )
    fireEvent.change(form.getByLabelText('Vence el'), {
      target: { value: '2020-01-01T19:30' },
    })
    await userEvent.type(form.getByLabelText('Motivo'), 'Lluvia')
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    expect(await form.findByText(/El vencimiento debe ser/)).toBeInTheDocument()
    expect(pricingSurcharges.create).not.toHaveBeenCalled()
  })
  it('rechaza horarios iguales y zona horaria inválida', async () => {
    mount()
    const form = await createForm()
    await userEvent.type(form.getByLabelText('Motivo'), 'Horario')
    fireEvent.change(form.getByLabelText('Hasta'), {
      target: { value: '22:00' },
    })
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    expect(
      await form.findByText(/Las horas inicial y final/),
    ).toBeInTheDocument()
    fireEvent.change(form.getByLabelText('Hasta'), {
      target: { value: '23:00' },
    })
    fireEvent.change(form.getByLabelText('Zona horaria'), {
      target: { value: 'Desconocida' },
    })
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    expect(
      await form.findByText(/Escribe una zona horaria válida/),
    ).toBeInTheDocument()
    expect(pricingSurcharges.create).not.toHaveBeenCalled()
  })
  it('rechaza monto negativo y más de dos decimales', async () => {
    mount()
    const form = await createForm()
    await userEvent.type(form.getByLabelText('Motivo'), 'Horario')
    for (const value of ['-5', '5.001', '0']) {
      fireEvent.change(form.getByLabelText('Importe adicional (MXN)'), {
        target: { value },
      })
      await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
      expect(
        await form.findByText(/Escribe un importe mayor/),
      ).toBeInTheDocument()
    }
    expect(pricingSurcharges.create).not.toHaveBeenCalled()
  })
  it('desactiva con motivo y espera confirmación del servidor', async () => {
    mount()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desactivar' }),
    )
    const form = within(screen.getByRole('dialog'))
    await userEvent.type(
      form.getByLabelText('Motivo de desactivación'),
      'Terminó la contingencia',
    )
    await userEvent.click(
      form.getByRole('button', { name: 'Confirmar desactivación' }),
    )
    await waitFor(() =>
      expect(pricingSurcharges.deactivate).toHaveBeenCalledWith(
        row.id,
        'Terminó la contingencia',
      ),
    )
  })
  it('distingue vencido y desactivado sin ofrecer desactivación', async () => {
    vi.mocked(pricingSurcharges.list).mockResolvedValue(
      page([
        { ...row, kind: 'MANUAL_RAIN', expiresAt: '2020-01-01T00:00:00Z' },
      ]),
    )
    mount()
    expect(await screen.findByText('Vencido')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument()
    expect(
      surchargeStatus({ ...row, disabledAt: stamp }, Date.now()).value,
    ).toBe('INACTIVE')
    expect(
      surchargeStatus({ ...row, expiresAt: stamp }, Date.parse(stamp)).value,
    ).toBe('EXPIRED')
  })
  it('bloquea reenvío de creación ante respuesta incierta', async () => {
    vi.mocked(pricingSurcharges.create).mockRejectedValue(
      new ApiError(0, 'Sin conexión'),
    )
    mount()
    const form = await createForm()
    await userEvent.type(form.getByLabelText('Motivo'), 'Horario')
    await userEvent.click(form.getByRole('button', { name: 'Crear recargo' }))
    expect(
      await form.findByText(/No se confirmó el resultado/),
    ).toBeInTheDocument()
    expect(form.getByRole('button', { name: 'Crear recargo' })).toBeDisabled()
    expect(pricingSurcharges.create).toHaveBeenCalledTimes(1)
  })
  it('muestra error sin habilitar creación cuando falta API', async () => {
    vi.mocked(pricingSurcharges.list).mockRejectedValue(
      new ApiError(404, 'Recurso no disponible'),
    )
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Recurso no disponible',
    )
    expect(screen.getByRole('button', { name: 'Nuevo recargo' })).toBeDisabled()
  })
  it('filtra por zona desde primera página', async () => {
    mount()
    await screen.findByText('Programado')
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por zona'),
      zoneId,
    )
    await waitFor(() =>
      expect(pricingSurcharges.list).toHaveBeenLastCalledWith(
        { page: 1, pageSize: 20, serviceZoneId: zoneId },
        expect.any(AbortSignal),
      ),
    )
  })
  it('rechaza al conductor sin consultar recargos', async () => {
    mount('DRIVER')
    expect(await screen.findByText(/403/)).toBeInTheDocument()
    expect(pricingSurcharges.list).not.toHaveBeenCalled()
  })
})
