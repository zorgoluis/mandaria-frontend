import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
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
import {
  weatherPilot,
  type WeatherPage,
  type WeatherZone,
} from '../weather-pilot/weather-service'
import {
  expireWeatherPage,
  weatherBadge,
} from '../weather-pilot/weather-format'
import type { Role } from '../types/api'

vi.mock('../weather-pilot/weather-service', () => ({
  weatherPilot: { list: vi.fn(), configure: vi.fn() },
}))
const zoneId = '11111111-1111-4111-8111-111111111111'
const stamp = '2030-01-01T12:00:00Z'
const row: WeatherZone = {
  serviceZone: {
    id: zoneId,
    code: 'CENTRO',
    name: 'Zona centro',
    status: 'ACTIVE',
  },
  configuration: {
    enabled: true,
    latitude: 16.762,
    longitude: -93.374,
    updatedAt: stamp,
    updatedBy: 'admin',
    reason: 'Punto representativo',
  },
  status: 'FRESH',
  state: 'RAIN',
  lastAttemptAt: stamp,
  reading: {
    state: 'RAIN',
    conditionCode: 'RAIN',
    dataTime: stamp,
    fetchedAt: stamp,
    validUntil: '2030-01-01T12:15:00Z',
  },
}
const page = (items: WeatherZone[] = [structuredClone(row)]): WeatherPage => ({
  items,
  mode: 'WEATHER_MONITORING',
  provider: 'GOOGLE_WEATHER',
  globalEnabled: true,
  serverTime: stamp,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: items.length ? 1 : 0,
})
function mount(role: Role = 'SUPER_ADMIN') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/weather-pilot']}>
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
async function form() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Configurar punto' }),
  )
  return within(screen.getByRole('dialog'))
}
beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(weatherPilot.list).mockResolvedValue(page())
  vi.mocked(weatherPilot.configure).mockResolvedValue({
    ...row,
    reading: null,
    status: 'PENDING',
    state: 'UNKNOWN',
  })
})
describe('monitoreo de lluvia', () => {
  it('incluye latencia de red para no prolongar un dato vencido durante el GET', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'performance',
      ],
    })
    try {
      let release!: (value: WeatherPage) => void
      const delayed = new Promise<WeatherPage>((resolve) => {
        release = resolve
      })
      vi.mocked(weatherPilot.list).mockReturnValue(delayed)
      mount()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      await act(async () => {
        release(
          page([
            {
              ...row,
              reading: { ...row.reading!, validUntil: '2030-01-01T12:00:01Z' },
            },
          ]),
        )
        await delayed
      })
      expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
      expect(screen.getByText('Dato vencido', { exact: true })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignora una respuesta anterior que llega después de guardar otra configuración', async () => {
    let release!: (value: WeatherPage) => void
    const oldResponse = new Promise<WeatherPage>((resolve) => {
      release = resolve
    })
    const updated = page([
      {
        ...row,
        configuration: { ...row.configuration!, latitude: 16.77 },
        state: 'NO_RAIN',
        reading: { ...row.reading!, state: 'NO_RAIN', conditionCode: 'CLEAR' },
      },
    ])
    vi.mocked(weatherPilot.list)
      .mockResolvedValueOnce(page())
      .mockReturnValueOnce(oldResponse)
      .mockResolvedValue(updated)
    mount()
    await screen.findByText('Lluvia', { exact: true })
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() => expect(weatherPilot.list).toHaveBeenCalledTimes(2))
    const dialog = await form()
    fireEvent.change(dialog.getByLabelText('Latitud'), {
      target: { value: '16.77' },
    })
    await userEvent.type(
      dialog.getByLabelText('Motivo del cambio'),
      'Nuevo punto',
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar punto' }))
    expect(await screen.findByText('Sin lluvia', { exact: true })).toBeVisible()
    await act(async () => {
      release(page())
      await oldResponse
    })
    expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
    expect(screen.getByText('Sin lluvia', { exact: true })).toBeVisible()
  })

  it('muestra atribución y vigencia sin confundir el punto con toda la zona', async () => {
    mount()
    expect(await screen.findByText('Lluvia', { exact: true })).toBeVisible()
    expect(
      screen.getByText('Source: Includes weather data from Google.'),
    ).toBeVisible()
    expect(screen.getByText('Google Maps', { exact: true })).toBeVisible()
    expect(
      screen.getByText(/no confirma que llueva en toda la zona/),
    ).toBeVisible()
    expect(
      screen.getByText(/Sin esa regla, esta pantalla sólo informa/),
    ).toBeVisible()
    expect(screen.getByText(/Válido hasta:/)).toBeVisible()
    expect(weatherPilot.configure).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: /consultar google|forzar/i }),
    ).toBeNull()
  })
  it('guarda sólo configuración del punto y renueva el listado sin almacenar lecturas', async () => {
    mount()
    const dialog = await form()
    fireEvent.change(dialog.getByLabelText('Latitud'), {
      target: { value: '16.765432' },
    })
    fireEvent.change(dialog.getByLabelText('Longitud'), {
      target: { value: '-93.375432' },
    })
    await userEvent.type(
      dialog.getByLabelText('Motivo del cambio'),
      'Ajuste del punto local',
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar punto' }))
    await waitFor(() =>
      expect(weatherPilot.configure).toHaveBeenCalledWith(zoneId, {
        enabled: true,
        latitude: 16.765432,
        longitude: -93.375432,
        reason: 'Ajuste del punto local',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(weatherPilot.list).toHaveBeenCalledTimes(2)
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some((q) =>
          (JSON.stringify(q.state.data) ?? '').includes('conditionCode'),
        ),
    ).toBe(false)
    expect(
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ).not.toContain('conditionCode')
  })
  it('permite preparar puntos cuando el servidor está deshabilitado', async () => {
    vi.mocked(weatherPilot.list).mockResolvedValue({
      ...page(),
      globalEnabled: false,
      items: [{ ...row, status: 'DISABLED', state: 'UNKNOWN', reading: null }],
    })
    mount()
    expect(
      await screen.findByText(/El piloto está deshabilitado en el servidor/),
    ).toBeVisible()
    expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
    expect(
      await screen.findByRole('button', { name: 'Configurar punto' }),
    ).toBeEnabled()
  })
  it('envía desactivación sin modificar coordenadas ni llamar a tarifas', async () => {
    mount()
    const dialog = await form()
    await userEvent.click(dialog.getByLabelText('Habilitar consulta del punto'))
    await userEvent.type(
      dialog.getByLabelText('Motivo del cambio'),
      'Pausar piloto',
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar punto' }))
    await waitFor(() =>
      expect(weatherPilot.configure).toHaveBeenCalledWith(
        zoneId,
        expect.objectContaining({
          enabled: false,
          latitude: 16.762,
          longitude: -93.374,
        }),
      ),
    )
  })
  it('rechaza más de seis decimales antes de enviar', async () => {
    mount()
    const dialog = await form()
    fireEvent.change(dialog.getByLabelText('Latitud'), {
      target: { value: '16.1234567' },
    })
    fireEvent.change(dialog.getByLabelText('Motivo del cambio'), {
      target: { value: 'Ajuste' },
    })
    fireEvent.submit(
      dialog.getByRole('button', { name: 'Guardar punto' }).closest('form')!,
    )
    expect(await screen.findByText(/hasta seis decimales/)).toBeVisible()
    expect(weatherPilot.configure).not.toHaveBeenCalled()
  })
  it('presenta el rechazo de punto fuera de zona y permite corregir', async () => {
    vi.mocked(weatherPilot.configure).mockRejectedValue(
      new ApiError(400, 'El punto debe estar dentro de la zona.'),
    )
    mount()
    const dialog = await form()
    await userEvent.type(
      dialog.getByLabelText('Motivo del cambio'),
      'Punto fuera',
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar punto' }))
    expect(
      await screen.findByText('El punto debe estar dentro de la zona.'),
    ).toBeVisible()
    expect(dialog.getByRole('button', { name: 'Guardar punto' })).toBeEnabled()
  })
  it('no reenvía ante respuesta incierta', async () => {
    vi.mocked(weatherPilot.configure).mockRejectedValue(
      new ApiError(0, 'Interrupción'),
    )
    mount()
    const dialog = await form()
    await userEvent.type(dialog.getByLabelText('Motivo del cambio'), 'Ajuste')
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar punto' }))
    expect(await screen.findByText(/No se confirmó el resultado/)).toBeVisible()
    expect(dialog.getByRole('button', { name: 'Guardar punto' })).toBeDisabled()
    expect(weatherPilot.configure).toHaveBeenCalledTimes(1)
  })
  it('retira condición vencida usando serverTime aunque el dispositivo tenga otra fecha', async () => {
    vi.mocked(weatherPilot.list).mockResolvedValue({
      ...page(),
      serverTime: '2030-01-01T12:16:00Z',
    })
    mount()
    expect(
      await screen.findByText('Dato vencido', { exact: true }),
    ).toBeVisible()
    expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
    expect(screen.queryByText(/Válido hasta:/)).toBeNull()
  })
  it('elimina la lectura al vencer mientras la pantalla sigue abierta', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'performance',
      ],
    })
    try {
      vi.mocked(weatherPilot.list).mockResolvedValue({
        ...page(),
        items: [
          {
            ...row,
            reading: { ...row.reading!, validUntil: '2030-01-01T12:00:01Z' },
          },
        ],
      })
      mount()
      await act(async () => {})
      expect(screen.getByText('Lluvia', { exact: true })).toBeVisible()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })
      expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
      expect(screen.getByText('Dato vencido', { exact: true })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })
  it('descarta lecturas al ocultar la página', async () => {
    mount()
    await screen.findByText('Lluvia', { exact: true })
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden')
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
    visibility.mockRestore()
  })
  it('muestra error de listado sin conservar una lluvia anterior', async () => {
    vi.mocked(weatherPilot.list).mockRejectedValue(
      new ApiError(503, 'Piloto no disponible'),
    )
    mount()
    expect(await screen.findByText('Piloto no disponible')).toBeVisible()
    expect(screen.queryByText('Lluvia', { exact: true })).toBeNull()
  })
  it.each(['DRIVER', 'PROVIDER_ADMIN'] as Role[])(
    'no permite acceso %s',
    async (role) => {
      mount(role)
      expect(
        await screen.findByRole('heading', { name: 'Sin permisos' }),
      ).toBeVisible()
      expect(weatherPilot.list).not.toHaveBeenCalled()
    },
  )
  it('poda contenido en límite exacto y fuerza máximo de treinta minutos', () => {
    const expired = expireWeatherPage(
      page(),
      Date.parse('2030-01-01T12:15:00Z'),
    )
    expect(expired.items[0]).toMatchObject({
      reading: null,
      state: 'UNKNOWN',
      status: 'STALE',
    })
    const excessive = page([
      {
        ...row,
        reading: { ...row.reading!, validUntil: '2030-01-02T12:00:00Z' },
      },
    ])
    expect(
      expireWeatherPage(excessive, Date.parse('2030-01-01T12:30:00Z')).items[0]
        .reading,
    ).toBeNull()
    expect(
      weatherBadge({ ...row, reading: { ...row.reading!, state: 'UNKNOWN' } })
        .label,
    ).toBe('Desconocido')
  })
})
