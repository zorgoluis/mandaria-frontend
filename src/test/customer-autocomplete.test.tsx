import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AddressAutocomplete } from '../customer/AddressAutocomplete'
import { env } from '../config/env'
import type { SelectedLocation } from '../customer/location-selection'
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  suggestions: vi.fn(),
  details: vi.fn(),
}))
vi.mock('../location/googleMaps', () => ({ loadMaps: mocks.load }))
const originalKey = env.googleMapsApiKey
const prediction = {
  text: { toString: () => 'Dirección sintética' },
  toPlace: () => ({
    formattedAddress: 'Dirección confirmada',
    location: { lat: () => 17, lng: () => -93 },
    fetchFields: mocks.details,
  }),
}
function Harness() {
  const [value, setValue] = useState<SelectedLocation | null>(null)
  return (
    <>
      <AddressAutocomplete
        label="Origen"
        selected={value}
        onSelect={setValue}
        onClear={() => setValue(null)}
      />
      <div data-testid="value">{JSON.stringify(value)}</div>
      <button onClick={() => setValue({ lat: 18, lng: -94, label: 'Mapa' })}>
        Mapa
      </button>
    </>
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  env.googleMapsApiKey = 'synthetic'
  mocks.load.mockResolvedValue({
    importLibrary: async () => ({
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: {
        fetchAutocompleteSuggestions: mocks.suggestions,
      },
    }),
  })
  mocks.suggestions.mockResolvedValue({
    suggestions: [{ placePrediction: prediction }],
  })
  mocks.details.mockResolvedValue({})
})
afterEach(() => {
  env.googleMapsApiKey = originalKey
})
async function search() {
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'Calle sintética' },
  })
  return screen.findByRole('option', { name: 'Dirección sintética' })
}
it('selects actual coordinates only after keyboard confirmation and requests minimal Places fields', async () => {
  render(<Harness />)
  expect(mocks.load).not.toHaveBeenCalled()
  await search()
  expect(screen.getByTestId('value')).toHaveTextContent('null')
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
  await waitFor(() =>
    expect(screen.getByTestId('value')).toHaveTextContent(
      'Dirección confirmada',
    ),
  )
  expect(mocks.details).toHaveBeenCalledWith({
    fields: ['formattedAddress', 'location'],
  })
  expect(mocks.suggestions).toHaveBeenCalledWith({
    input: 'Calle sintética',
    sessionToken: expect.any(Object),
    language: 'es',
    region: 'mx',
  })
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'Editada' },
  })
  expect(screen.getByTestId('value')).toHaveTextContent('null')
})
it('late prediction does not restore options after text was cleared', async () => {
  let done!: (r: unknown) => void
  mocks.suggestions.mockReturnValue(
    new Promise((r) => {
      done = r
    }),
  )
  render(<Harness />)
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'Consulta anterior' },
  })
  await waitFor(() => expect(mocks.suggestions).toHaveBeenCalled())
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })
  await act(async () =>
    done({ suggestions: [{ placePrediction: prediction }] }),
  )
  expect(screen.queryByRole('option')).not.toBeInTheDocument()
})
it('late place details cannot replace a newer map selection', async () => {
  let done!: (r: unknown) => void
  mocks.details.mockReturnValue(
    new Promise((r) => {
      done = r
    }),
  )
  render(<Harness />)
  fireEvent.click(await search())
  fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
  await act(async () => done({}))
  expect(screen.getByTestId('value')).toHaveTextContent('Mapa')
  expect(screen.getByRole('combobox')).toHaveValue('Mapa')
})
it('unavailable Places preserves map/location alternatives without fabricated coordinates', async () => {
  mocks.suggestions.mockRejectedValue(new Error('private diagnostic'))
  render(<Harness />)
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'Consulta' },
  })
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Usa el mapa o tu ubicación',
  )
  expect(screen.getByTestId('value')).toHaveTextContent('null')
  expect(screen.queryByText('private diagnostic')).not.toBeInTheDocument()
})
