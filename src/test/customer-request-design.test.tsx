import { capabilities } from './business-fixtures'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequestConsent, RequestCancellation } from '../customer/RequestActions'
import { CustomerRequest } from '../customer/pages'
import { customer } from '../customer/service'
import { command } from '../customer/pending'
import {
  requestContext as context,
  requestDetail as detail,
  requestStatus as status,
} from './fixtures/request-design'
vi.mock('../auth/context', () => ({
  useAuth: () => ({ user: { id: 'synthetic', role: 'CUSTOMER' } }),
}))
vi.mock('../customer/service', () => ({
  customer: { detail: vi.fn(), status: vi.fn(), consentContext: vi.fn() },
}))
vi.mock('../customer/pending', () => ({
  command: vi.fn(),
  usePending: () => [],
}))
vi.mock('../location/components', () => ({
  OwnerLocation: () => <p>GPS existente</p>,
}))
vi.mock('../location/TrackingLinks', () => ({
  TrackingLinks: () => <p>Enlaces existentes</p>,
}))
const onAccept = vi.fn<() => Promise<void>>(),
  onCancel = vi.fn<(reason: string) => Promise<void>>()
const props = {
  context,
  contact: detail.shippingTerms?.payerContact,
  accepted: false,
  terminal: false,
  ready: true,
  now: Date.now(),
  onAccept,
}
function consent(extra: Partial<typeof props> = {}) {
  return render(
    <MemoryRouter>
      <RequestConsent {...props} {...extra} />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  onAccept.mockResolvedValue(undefined)
  onCancel.mockResolvedValue(undefined)
})
it('requires explicit consent and never announces optimistic success', async () => {
  let done!: () => void
  onAccept.mockReturnValueOnce(
    new Promise((resolve) => {
      done = resolve
    }),
  )
  consent()
  expect(screen.getByText('$45.50')).toBeInTheDocument()
  const button = screen.getByRole('button', {
    name: 'Autorizar y solicitar servicio',
  })
  expect(button).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  expect(button).toBeEnabled()
  fireEvent.click(button)
  fireEvent.click(button)
  expect(onAccept).toHaveBeenCalledOnce()
  expect(screen.queryByText(/Autorización confirmada/)).not.toBeInTheDocument()
  await act(async () => done())
  expect(screen.queryByText(/Autorización confirmada/)).not.toBeInTheDocument()
})
it('shows confirmation only when the server reports acceptance', () => {
  consent({ accepted: true })
  expect(
    screen.getByText(/Autorización confirmada por el servidor/),
  ).toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})
it('expires, disables consent and offers requote without freeing capacity', () => {
  const view = consent()
  fireEvent.click(screen.getByRole('checkbox'))
  view.rerender(
    <MemoryRouter>
      <RequestConsent {...props} now={Date.parse('2100-01-01')} />
    </MemoryRouter>,
  )
  expect(screen.getByText('La cotización ha vencido.')).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Volver a cotizar' }),
  ).toHaveAttribute('href', '/customer/new')
  expect(
    screen.getByRole('button', { name: 'Autorizar y solicitar servicio' }),
  ).toBeDisabled()
  expect(onAccept).not.toHaveBeenCalled()
})
it('does not offer authorization with incomplete or terminal context', () => {
  consent({ context: undefined, ready: false, terminal: true })
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(screen.getByText(/Solicitud finalizada/)).toBeInTheDocument()
})
it('cancellation is collapsed, requires reason and confirmation, and surfaces API errors', async () => {
  onCancel.mockRejectedValueOnce(new Error('Cancelación no permitida'))
  render(
    <RequestCancellation
      blocked={false}
      terminal={false}
      cancelled={false}
      onCancel={onCancel}
    />,
  )
  const toggle = screen.getByRole('button', { name: /Cancelar solicitud/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  fireEvent.click(toggle)
  const submit = screen.getByRole('button', { name: 'Solicitar cancelación' })
  expect(submit).toBeDisabled()
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Ya no se requiere' },
  })
  expect(submit).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(submit)
  await waitFor(() =>
    expect(onCancel).toHaveBeenCalledWith('Ya no se requiere'),
  )
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(
    screen.queryByText(/Solicitud cancelada según/),
  ).not.toBeInTheDocument()
})
it('custody blocks ordinary cancellation and cancelled server state displays the result', () => {
  const view = render(
    <RequestCancellation
      blocked
      terminal={false}
      cancelled={false}
      onCancel={onCancel}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Cancelar solicitud/ }))
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  view.rerender(
    <RequestCancellation
      blocked={false}
      terminal
      cancelled
      onCancel={onCancel}
    />,
  )
  expect(screen.getByText(/Solicitud cancelada según/)).toBeInTheDocument()
})
it('page refreshes real service readers and preserves the existing acceptance payload and status', async () => {
  vi.mocked(customer.detail).mockResolvedValue(detail)
  vi.mocked(customer.status).mockResolvedValue(status)
  vi.mocked(customer.consentContext).mockResolvedValue(context)
  vi.mocked(command).mockResolvedValue({})
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={['/customer/requests/MDR-000009']}>
        <Routes>
          <Route
            path="/customer/requests/:publicId"
            element={<CustomerRequest />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('button', { name: 'Autorizar y solicitar servicio' })
  fireEvent.click(
    screen.getByLabelText(
      'Acepto el importe, vigencia y condiciones del envío',
    ),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Autorizar y solicitar servicio' }),
  )
  await waitFor(() => expect(command).toHaveBeenCalledOnce())
  expect(vi.mocked(command).mock.calls[0]).toEqual([
    'synthetic',
    'accept',
    'MDR-000009',
    '/customer/delivery-quotes/MQ-000009/accept',
    expect.objectContaining({
      customerAuthorization: expect.objectContaining({
        amount: '45.50',
        shippingTermsHash: 'a'.repeat(64),
        quotePublicId: 'MQ-000009',
      }),
    }),
    'MQ-000009',
  ])
  await waitFor(() => expect(customer.status).toHaveBeenCalledTimes(2))
  expect(screen.queryByText(/Autorización confirmada/)).not.toBeInTheDocument()
  vi.mocked(customer.status).mockResolvedValue({
    ...status,
    status: 'OPEN',
    shippingPayment: status.shippingPayment
      ? {
          ...status.shippingPayment,
          quotePublicId: 'MQ-000009',
          amount: '45.50',
          currency: 'MXN',
        }
      : null,
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Actualizar seguimiento' }),
    ).toBeEnabled(),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Actualizar seguimiento' }),
  )
  expect(await screen.findByText(/Autorización confirmada/)).toBeInTheDocument()
  expect(screen.getByText('Buscando ejecutor')).toBeInTheDocument()
})

it.each(['REVIEW_REQUIRED', 'RESTRICTED'] as const)(
  'committed MDR still offers authorized consent, tracking and recovery under %s',
  async (state) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(['customer', 'synthetic', 'capabilities'], {
      ...capabilities,
      type: 'BUSINESS',
      businessAccess: {
        ...capabilities.businessAccess,
        state,
        canApply: false,
      },
      canPrequote: false,
      canCreateRequest: false,
      allowedShippingPayers: [],
    })
    vi.mocked(customer.detail).mockResolvedValue(detail)
    vi.mocked(customer.status).mockResolvedValue(status)
    vi.mocked(customer.consentContext).mockResolvedValue(context)
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/customer/requests/MDR-000009']}>
          <Routes>
            <Route
              path="/customer/requests/:publicId"
              element={<CustomerRequest />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const button = await screen.findByRole('button', {
      name: 'Autorizar y solicitar servicio',
    })
    fireEvent.click(
      screen.getByLabelText(
        'Acepto el importe, vigencia y condiciones del envío',
      ),
    )
    expect(button).toBeEnabled()
    expect(screen.getByText('GPS existente')).toBeInTheDocument()
    expect(screen.getByText('Enlaces existentes')).toBeInTheDocument()
    expect(customer.consentContext).toHaveBeenCalledWith('MDR-000009')
  },
)
