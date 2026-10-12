import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { customer } from '../customer/service'
import { ConversionForm } from '../customer/ConversionForm'
import { conversionErrors } from '../customer/conversion-form'
import type { DirectPrequoteResponse } from '../customer/contract'
vi.mock('../auth/context', () => ({
  useAuth: () => ({ user: { id: 'synthetic' } }),
}))
vi.mock('../customer/service', () => ({
  customer: {
    profile: vi.fn(async () => ({
      active: true,
      displayName: 'Perfil sintético',
    })),
  },
}))
export const quote: DirectPrequoteResponse = {
  publicId: 'MPQ-000009',
  status: 'OFFERED',
  conditionsVersion: 1,
  conditions: {
    conditionsVersion: 1,
    serviceType: 'LOCAL_DELIVERY',
    stops: [
      { type: 'PICKUP', sequence: 1, latitude: 17.5, longitude: -93.1 },
      { type: 'DROPOFF', sequence: 2, latitude: 17.6, longitude: -93.2 },
    ],
    packages: [{ category: 'FOOD', quantity: 2, isFragile: true }],
  },
  shippingTerms: {
    payer: 'REQUESTER',
    method: 'CASH',
    dueAt: 'PICKUP',
    component: 'DELIVERY_FEE',
    termsVersion: 1,
    termsHash: 'a'.repeat(64),
  },
  serviceZone: { code: 'TEST', name: 'Sintética' },
  distanceMeters: 100,
  durationSeconds: 100,
  amount: '35.25',
  currency: 'MXN',
  createdAt: '2026-10-12T00:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z',
  convertedAt: null,
  deliveryRequestPublicId: null,
  deliveryQuotePublicId: null,
  availabilityGuaranteed: false,
}
const submit = vi
  .fn<(data: FormData) => Promise<void>>()
  .mockResolvedValue(undefined)
const back = vi.fn()
function mount(p = quote) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ConversionForm quote={p} onSubmit={submit} onBack={back} />
    </QueryClientProvider>,
  )
}
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}
async function complete() {
  await waitFor(() =>
    expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
      'Perfil sintético',
    ),
  )
  for (const label of ['origen', 'destino']) {
    fill(`Dirección de ${label}`, `${label} manual`)
    fill(`Teléfono de ${label}`, '9615550011')
  }
  fill('Contacto de destino', 'Persona sintética')
  fill('Descripción del paquete', 'Caja')
  fill('Nombre del pagador', 'Pagador sintético')
  fill('Teléfono del pagador', '9615550012')
}
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())
it('uses real price, synchronizes summary and allows PREPAID without goods value; restores profile explicitly', async () => {
  mount()
  expect(screen.getByText('$35.25')).toBeInTheDocument()
  const button = screen.getByRole('button', {
    name: 'Crear solicitud y revisar términos',
  })
  expect(button).toBeDisabled()
  await complete()
  expect(button).toBeEnabled()
  expect(screen.getByText('origen manual')).toBeInTheDocument()
  fill('Contacto de origen', 'Otra persona')
  fireEvent.click(
    screen.getByRole('button', { name: 'Usar mi nombre de perfil' }),
  )
  expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
    'Perfil sintético',
  )
  fireEvent.click(
    screen.getByRole('radio', { name: 'Representante autorizado' }),
  )
  expect(screen.getAllByText('Representante autorizado')).toHaveLength(2)
  fireEvent.click(button)
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  expect(submit.mock.calls[0][0].get('goodsValue')).toBe('')
  expect(submit.mock.calls[0][0].get('capacity')).toBe(
    'AUTHORIZED_REPRESENTATIVE',
  )
})
it('requires positive goods value only for advance and shows blur errors', async () => {
  mount()
  await complete()
  fireEvent.click(
    screen.getByRole('radio', { name: 'Adelanto por repartidor' }),
  )
  const amount = screen.getByLabelText('Valor de mercancía en MXN')
  fireEvent.blur(amount)
  expect(screen.getByText(/El adelanto requiere/)).toBeInTheDocument()
  const button = screen.getByRole('button', {
    name: 'Crear solicitud y revisar términos',
  })
  expect(button).toBeDisabled()
  for (const value of ['0', '-1', '1.234', 'texto']) {
    fill('Valor de mercancía en MXN', value)
    expect(button).toBeDisabled()
  }
  fill('Valor de mercancía en MXN', '120.50')
  expect(button).toBeEnabled()
  fill('Teléfono de destino', 'abc')
  fireEvent.blur(screen.getByLabelText('Teléfono de destino'))
  expect(screen.getByText(/Escribe un teléfono válido/)).toBeInTheDocument()
  expect(button).toBeDisabled()
})
it('only requests payer contact for REQUESTER and returns current addresses to step one', () => {
  mount({
    ...quote,
    shippingTerms: quote.shippingTerms
      ? { ...quote.shippingTerms, payer: 'RECIPIENT', dueAt: 'DELIVERY' }
      : null,
  })
  expect(screen.queryByLabelText('Nombre del pagador')).not.toBeInTheDocument()
  fill('Dirección de origen', 'Origen editado')
  fill('Dirección de destino', 'Destino editado')
  fireEvent.click(
    screen.getByRole('button', { name: 'Volver a la cotización' }),
  )
  expect(back).toHaveBeenCalledWith(['Origen editado', 'Destino editado'])
  expect(submit).not.toHaveBeenCalled()
})
it('expires while open and prevents submitting, offering a return to quote', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'))
  mount({ ...quote, expiresAt: '2026-10-12T12:00:01Z' })
  act(() => vi.advanceTimersByTime(1100))
  expect(screen.getByText('La precotización ha vencido.')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Crear solicitud y revisar términos' }),
  ).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Volver a cotizar' }))
  expect(back).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
})
it('validates optional PREPAID values when supplied without inventing a requirement', () => {
  expect(conversionErrors({ mode: 'PREPAID' }, quote)).not.toHaveProperty(
    'goodsValue',
  )
  expect(
    conversionErrors({ mode: 'PREPAID', goodsValue: '0' }, quote),
  ).toHaveProperty('goodsValue')
  expect(
    conversionErrors({ mode: 'COURIER_ADVANCE', goodsValue: '25.10' }, quote),
  ).not.toHaveProperty('goodsValue')
})

it('prefills payer from origin and follows later origin edits while each payer field is untouched', async () => {
  mount()
  await waitFor(() =>
    expect(screen.getByLabelText('Nombre del pagador')).toHaveValue(
      'Perfil sintético',
    ),
  )
  fill('Teléfono de origen', '9615550011')
  expect(screen.getByLabelText('Teléfono del pagador')).toHaveValue(
    '9615550011',
  )
  fill('Nombre del pagador', 'Otro pagador')
  fill('Contacto de origen', 'Nuevo contacto')
  fill('Teléfono de origen', '9615550022')
  expect(screen.getByLabelText('Nombre del pagador')).toHaveValue(
    'Otro pagador',
  )
  expect(screen.getByLabelText('Teléfono del pagador')).toHaveValue(
    '9615550022',
  )
  fill('Teléfono del pagador', '')
  fill('Teléfono de origen', '9615550033')
  expect(screen.getByLabelText('Teléfono del pagador')).toHaveValue('')
  expect(
    screen.getByRole('button', { name: 'Crear solicitud y revisar términos' }),
  ).toBeDisabled()
})
it('does not overwrite a payer name edited or cleared before the profile response arrives', async () => {
  let resolve!: (profile: Awaited<ReturnType<typeof customer.profile>>) => void
  vi.mocked(customer.profile).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  mount()
  fill('Nombre del pagador', 'Nombre manual')
  fill('Nombre del pagador', '')
  await act(async () =>
    resolve({
      active: true,
      displayName: 'Perfil tardío',
      type: 'PERSONAL',
      businessName: null,
      revision: 1,
    }),
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
      'Perfil tardío',
    ),
  )
  expect(screen.getByLabelText('Nombre del pagador')).toHaveValue('')
})
it('submits the suggested payer contact without requiring duplicate typing', async () => {
  mount()
  await waitFor(() =>
    expect(screen.getByLabelText('Nombre del pagador')).toHaveValue(
      'Perfil sintético',
    ),
  )
  for (const side of ['origen', 'destino']) {
    fill(`Dirección de ${side}`, `${side} sintético`)
    fill(`Teléfono de ${side}`, '9615550011')
  }
  fill('Contacto de destino', 'Destinatario sintético')
  fill('Descripción del paquete', 'Caja')
  const button = screen.getByRole('button', {
    name: 'Crear solicitud y revisar términos',
  })
  expect(button).toBeEnabled()
  fireEvent.click(button)
  await waitFor(() => expect(submit).toHaveBeenCalledOnce())
  expect(submit.mock.calls[0][0].get('payerName')).toBe('Perfil sintético')
  expect(submit.mock.calls[0][0].get('payerPhone')).toBe('9615550011')
})
