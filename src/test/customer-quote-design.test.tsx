import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QuoteForm } from '../customer/QuoteForm'
import type { Capabilities } from '../customer/service'
import type { SelectedLocation } from '../customer/location-selection'
vi.mock('../customer/LocationPicker', () => ({
  LocationPicker: ({
    label,
    onChange,
  }: {
    label: string
    onChange: (p: SelectedLocation | null) => void
  }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onChange({
            lat: 17.1234567,
            lng: -93.1234567,
            label: `${label} sintético`,
          })
        }
      >
        Seleccionar {label}
      </button>
      <button type="button" onClick={() => onChange(null)}>
        Borrar {label}
      </button>
    </>
  ),
}))
const cap: Capabilities = {
  type: 'BUSINESS',
  allowedShippingPayers: ['REQUESTER', 'RECIPIENT'],
  defaultShippingPayer: 'REQUESTER',
  capacity: {
    occupied: false,
    activeCount: 0,
    maxActiveRequests: null,
    activeRequestPublicId: null,
  },
  canCreateRequest: true,
  canPrequote: true,
  reason: null,
}
it('live summary, accessible controls and exact contract; CTA requires both selected points', async () => {
  const submit = vi.fn().mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <QuoteForm capabilities={cap} onSubmit={submit} />
    </MemoryRouter>,
  )
  const button = screen.getByRole('button', { name: 'Obtener precotización' })
  const summary = within(
    screen.getByRole('complementary', { name: 'Resumen de cotización' }),
  )
  expect(button).toBeDisabled()
  expect(summary.getAllByText('Sin seleccionar')).toHaveLength(2)
  fireEvent.click(screen.getByRole('radio', { name: 'Documento' }))
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }))
  fireEvent.click(screen.getByRole('switch', { name: 'Frágil' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Destinatario' }))
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Peso en kg (opcional)' }),
    { target: { value: '1.25' } },
  )
  expect(summary.getByText('Documento')).toBeInTheDocument()
  expect(summary.getByText('2')).toBeInTheDocument()
  expect(summary.getByText('Sí')).toBeInTheDocument()
  expect(summary.getByText('Destinatario')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Origen' }))
  expect(button).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Destino' }))
  expect(button).toBeEnabled()
  fireEvent.click(button)
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  expect(submit).toHaveBeenCalledWith(
    {
      conditionsVersion: 1,
      serviceType: 'LOCAL_DELIVERY',
      stops: [
        {
          type: 'PICKUP',
          sequence: 1,
          latitude: 17.123457,
          longitude: -93.123457,
        },
        {
          type: 'DROPOFF',
          sequence: 2,
          latitude: 17.123457,
          longitude: -93.123457,
        },
      ],
      packages: [
        { category: 'DOCUMENT', quantity: 2, isFragile: true, weightKg: 1.25 },
      ],
    },
    'RECIPIENT',
  )
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Borrar Origen' }))
  expect(button).toBeDisabled()
})
it('does not offer unsupported payers and quantity cannot decrement below one', () => {
  render(
    <MemoryRouter>
      <QuoteForm
        capabilities={{ ...cap, allowedShippingPayers: ['REQUESTER'] }}
        onSubmit={vi.fn()}
      />
    </MemoryRouter>,
  )
  expect(
    screen.queryByRole('radio', { name: 'Destinatario' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Reducir cantidad' }),
  ).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'Comida' })).toBeChecked()
})
it('restores the quoted coordinates and package data when returning from details', async () => {
  const submit = vi.fn().mockResolvedValue(undefined)
  const conditions = {
    conditionsVersion: 1 as const,
    serviceType: 'LOCAL_DELIVERY' as const,
    stops: [
      {
        type: 'PICKUP' as const,
        sequence: 1,
        latitude: 17.5,
        longitude: -93.1,
      },
      {
        type: 'DROPOFF' as const,
        sequence: 2,
        latitude: 17.6,
        longitude: -93.2,
      },
    ],
    packages: [
      {
        category: 'DOCUMENT' as const,
        quantity: 3,
        isFragile: true,
        weightKg: 2.5,
      },
    ],
  }
  render(
    <MemoryRouter>
      <QuoteForm
        capabilities={cap}
        initial={{
          conditions,
          payer: 'RECIPIENT',
          addresses: ['Origen editado', 'Destino editado'],
        }}
        onSubmit={submit}
      />
    </MemoryRouter>,
  )
  expect(screen.getByText('Origen editado')).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Documento' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Destinatario' })).toBeChecked()
  expect(screen.getByRole('spinbutton', { name: 'Cantidad' })).toHaveValue(3)
  fireEvent.click(screen.getByRole('button', { name: 'Obtener precotización' }))
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith(conditions, 'RECIPIENT'),
  )
})

it('empty allowed payers does not grant the default REQUESTER even with unlimited capacity and selected points', () => {
  const submit = vi.fn()
  render(
    <MemoryRouter>
      <QuoteForm
        capabilities={{
          ...cap,
          allowedShippingPayers: [],
          defaultShippingPayer: 'REQUESTER',
        }}
        onSubmit={submit}
      />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Origen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Destino' }))
  expect(
    screen.queryByRole('radio', { name: 'Solicitante' }),
  ).not.toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Obtener precotización' })
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(submit).not.toHaveBeenCalled()
})
