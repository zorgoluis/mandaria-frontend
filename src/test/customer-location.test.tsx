import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LocationPicker } from '../customer/LocationPicker'
import type { SelectedLocation } from '../customer/location-selection'
import { env } from '../config/env'
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  geocode: vi.fn(),
  locate: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../location/googleMaps', () => ({
  loadMaps: mocks.load,
  onMapsFailure: () => () => {},
}))
const originalKey = env.googleMapsApiKey
let click: (event: { latLng: { lat(): number; lng(): number } }) => void
function result(lat = 17, lng = -93, label = 'Calle sintética 10, Ciudad') {
  return {
    formatted_address: label,
    geometry: { location: { lat: () => lat, lng: () => lng } },
  }
}
function Harness() {
  const [value, onChange] = useState<SelectedLocation | null>(null)
  return (
    <>
      <LocationPicker label="Origen" value={value} onChange={onChange} />
      <div data-testid="selection">{JSON.stringify(value)}</div>
    </>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  env.googleMapsApiKey = 'synthetic-key'
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: mocks.locate },
  })
  mocks.load.mockResolvedValue({
    Map: class {
      setCenter() {}
      setZoom() {}
      unbindAll() {}
      getCenter() {
        return { lat: () => 18, lng: () => -94 }
      }
      addListener(_event: string, handler: typeof click) {
        click = handler
        return { remove: mocks.remove }
      }
    },
    Circle: class {
      setOptions() {}
      setMap() {}
      unbindAll() {}
    },
    event: { clearInstanceListeners: vi.fn() },
    importLibrary: async () => ({
      Geocoder: class {
        geocode = mocks.geocode
      },
    }),
  })
  mocks.geocode.mockResolvedValue({ results: [result()] })
})
afterEach(() => {
  env.googleMapsApiKey = originalKey
  vi.unstubAllGlobals()
})
async function search() {
  fireEvent.change(screen.getByLabelText('Buscar dirección de origen'), {
    target: { value: 'Calle sintética' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar dirección' }))
  await waitFor(() => expect(mocks.geocode).toHaveBeenCalled())
}
it('search requires explicit selection, sends only address to Google and invalidates a changed address', async () => {
  render(<Harness />)
  expect(mocks.locate).not.toHaveBeenCalled()
  expect(mocks.load).not.toHaveBeenCalled()
  await search()
  expect(mocks.geocode).toHaveBeenCalledWith({
    address: 'Calle sintética',
    region: 'MX',
  })
  expect(screen.getByTestId('selection')).toHaveTextContent('null')
  fireEvent.click(
    await screen.findByRole('button', { name: 'Calle sintética 10, Ciudad' }),
  )
  expect(JSON.parse(screen.getByTestId('selection').textContent!)).toEqual({
    lat: 17,
    lng: -93,
    label: 'Calle sintética 10, Ciudad',
  })
  fireEvent.change(screen.getByLabelText('Buscar dirección de origen'), {
    target: { value: 'Otra dirección' },
  })
  expect(screen.getByTestId('selection')).toHaveTextContent('null')
})
it('ignores delayed results after the user changes the search', async () => {
  let resolve!: (data: unknown) => void
  mocks.geocode.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  render(<Harness />)
  await search()
  fireEvent.change(screen.getByLabelText('Buscar dirección de origen'), {
    target: { value: 'Otra calle' },
  })
  await act(async () => resolve({ results: [result()] }))
  expect(
    screen.queryByRole('button', { name: 'Calle sintética 10, Ciudad' }),
  ).toBeNull()
})
it.each(['empty', 'error', 'invalid'])(
  'handles %s search without inventing a point',
  async (mode) => {
    if (mode === 'error')
      mocks.geocode.mockRejectedValue(new Error('private failure'))
    else
      mocks.geocode.mockResolvedValue({
        results: mode === 'empty' ? [] : [result(100)],
      })
    render(<Harness />)
    await search()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /No encontramos|No se pudo/,
      ),
    )
    expect(screen.getByTestId('selection')).toHaveTextContent('null')
    expect(screen.queryByText('private failure')).toBeNull()
  },
)
it('geolocation only on request, with exact coordinates and no repeated click', () => {
  render(<Harness />)
  const button = screen.getByRole('button', { name: 'Usar mi ubicación' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(mocks.locate).toHaveBeenCalledTimes(1)
  act(() =>
    mocks.locate.mock.calls[0][0]({
      coords: {
        latitude: 17.123456789,
        longitude: -93.987654321,
        accuracy: 15,
      },
    }),
  )
  expect(
    JSON.parse(screen.getByTestId('selection').textContent!),
  ).toMatchObject({ lat: 17.123456789, lng: -93.987654321 })
})
it('denied permission is understandable and a late location cannot overwrite a new search', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
  act(() => mocks.locate.mock.calls[0][1]({ code: 1 }))
  expect(screen.getByRole('status')).toHaveTextContent(
    'Permiso de ubicación denegado',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
  fireEvent.change(screen.getByLabelText('Buscar dirección de origen'), {
    target: { value: 'Nueva calle' },
  })
  act(() =>
    mocks.locate.mock.calls[1][0]({
      coords: { latitude: 17, longitude: -93, accuracy: 10 },
    }),
  )
  expect(screen.getByTestId('selection')).toHaveTextContent('null')
})
it('map click and keyboard alternative select actual coordinates, cleanup removes listeners', async () => {
  const view = render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Elegir en el mapa' }))
  const center = screen.getByRole('button', { name: 'Usar el centro del mapa' })
  await waitFor(() => expect(center).toBeEnabled())
  expect(screen.getByTestId('selection')).toHaveTextContent('null')
  act(() => click({ latLng: { lat: () => 19, lng: () => -92 } }))
  expect(
    JSON.parse(screen.getByTestId('selection').textContent!),
  ).toMatchObject({ lat: 19, lng: -92 })
  fireEvent.click(center)
  expect(
    JSON.parse(screen.getByTestId('selection').textContent!),
  ).toMatchObject({ lat: 18, lng: -94 })
  view.unmount()
  expect(mocks.remove).toHaveBeenCalledOnce()
})
it('missing key and map failure never fabricate a selected location', async () => {
  env.googleMapsApiKey = ''
  const view = render(<Harness />)
  expect(screen.queryByRole('button', { name: 'Elegir en el mapa' })).toBeNull()
  expect(screen.getByText(/no están configurados/)).toBeInTheDocument()
  view.unmount()
  env.googleMapsApiKey = 'synthetic-key'
  mocks.load.mockRejectedValue(new Error('secret diagnostic'))
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Elegir en el mapa' }))
  expect(
    await screen.findByText(/Google Maps no está disponible/),
  ).toBeInTheDocument()
  expect(screen.getByTestId('selection')).toHaveTextContent('null')
})
