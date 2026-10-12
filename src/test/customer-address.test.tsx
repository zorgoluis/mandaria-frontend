import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SuggestedAddress } from '../customer/SuggestedAddress'
import { env } from '../config/env'
const mocks = vi.hoisted(() => ({ load: vi.fn(), geocode: vi.fn() }))
vi.mock('../location/googleMaps', () => ({ loadMaps: mocks.load }))
const originalKey = env.googleMapsApiKey
const answer = (address = 'Calle sintética 10') => ({
  results: [{ formatted_address: address }],
})
function field(key = 'A', lat = 17) {
  return (
    <SuggestedAddress
      key={key}
      name="address0"
      label="Dirección de origen"
      latitude={lat}
      longitude={-93}
    />
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  env.googleMapsApiKey = 'synthetic'
  mocks.load.mockResolvedValue({
    importLibrary: async () => ({
      Geocoder: class {
        geocode = mocks.geocode
      },
    }),
  })
  mocks.geocode.mockResolvedValue(answer())
})
afterEach(() => {
  env.googleMapsApiKey = originalKey
  vi.useRealTimers()
})
it('suggests both addresses from exact coordinates and allows editing without another lookup', async () => {
  mocks.geocode
    .mockResolvedValueOnce(answer('Origen sintético'))
    .mockResolvedValueOnce(answer('Destino sintético'))
  render(
    <form>
      {field()}
      <SuggestedAddress
        name="address1"
        label="Dirección de destino"
        latitude={18}
        longitude={-94}
      />
    </form>,
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Dirección de destino')).toHaveValue(
      'Destino sintético',
    ),
  )
  expect(screen.getByLabelText('Dirección de origen')).toHaveValue(
    'Origen sintético',
  )
  expect(mocks.geocode.mock.calls).toEqual([
    [{ location: { lat: 17, lng: -93 } }],
    [{ location: { lat: 18, lng: -94 } }],
  ])
  fireEvent.change(screen.getByLabelText('Dirección de origen'), {
    target: { value: 'Interior 4' },
  })
  expect(screen.getByLabelText('Dirección de origen')).toHaveValue('Interior 4')
  expect(mocks.geocode).toHaveBeenCalledTimes(2)
})
it.each(['Mi dirección', ''])(
  'never overwrites user edits, including deliberate clearing: %s',
  async (value) => {
    let done!: (r: ReturnType<typeof answer>) => void
    mocks.geocode.mockReturnValue(
      new Promise((r) => {
        done = r
      }),
    )
    render(field())
    await waitFor(() => expect(mocks.geocode).toHaveBeenCalled())
    const input = screen.getByLabelText('Dirección de origen')
    fireEvent.change(input, { target: { value: 'Escrito' } })
    fireEvent.change(input, { target: { value } })
    await act(async () => done(answer()))
    expect(input).toHaveValue(value)
  },
)
it('does not overwrite browser autofill', async () => {
  let done!: (r: ReturnType<typeof answer>) => void
  mocks.geocode.mockReturnValue(
    new Promise((r) => {
      done = r
    }),
  )
  render(field())
  await waitFor(() => expect(mocks.geocode).toHaveBeenCalled())
  const input = screen.getByLabelText<HTMLInputElement>('Dirección de origen')
  input.value = 'Autocompletado'
  await act(async () => done(answer()))
  expect(input).toHaveValue('Autocompletado')
})
it('ignores a previous prequote response after navigation', async () => {
  let done!: (r: ReturnType<typeof answer>) => void
  mocks.geocode
    .mockReturnValueOnce(
      new Promise((r) => {
        done = r
      }),
    )
    .mockResolvedValueOnce(answer('Nueva dirección'))
  const view = render(field())
  await waitFor(() => expect(mocks.geocode).toHaveBeenCalled())
  view.rerender(field('B', 18))
  await waitFor(() =>
    expect(screen.getByLabelText('Dirección de origen')).toHaveValue(
      'Nueva dirección',
    ),
  )
  await act(async () => done(answer('Antigua dirección')))
  expect(screen.getByLabelText('Dirección de origen')).toHaveValue(
    'Nueva dirección',
  )
})
it.each(['empty', 'failure', 'long'])(
  'keeps manual entry on %s',
  async (mode) => {
    if (mode === 'failure')
      mocks.geocode.mockRejectedValue(new Error('failure'))
    else
      mocks.geocode.mockResolvedValue(
        mode === 'empty' ? { results: [] } : answer('a'.repeat(301)),
      )
    render(field())
    expect(await screen.findByText(/No se pudo sugerir/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Dirección de origen'), {
      target: { value: 'Manual' },
    })
    expect(screen.getByLabelText('Dirección de origen')).toHaveValue('Manual')
  },
)
it('does not load Google without a key', () => {
  env.googleMapsApiKey = ''
  render(field())
  expect(mocks.load).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Dirección de origen')).toBeEnabled()
})
it('ignores responses after timeout', async () => {
  vi.useFakeTimers()
  let done!: (r: ReturnType<typeof answer>) => void
  mocks.geocode.mockReturnValue(
    new Promise((r) => {
      done = r
    }),
  )
  render(field())
  await act(async () => {
    await Promise.resolve()
  })
  await act(async () => {
    vi.advanceTimersByTime(15000)
  })
  await act(async () => done(answer()))
  expect(screen.getByLabelText('Dirección de origen')).toHaveValue('')
  expect(screen.getByText(/No se pudo sugerir/)).toBeInTheDocument()
})
