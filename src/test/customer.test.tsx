import { consent } from '../customer/consent'
import { consumeAccessFragment } from '../customer/access'
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthState } from '../auth/context'
import { CustomerHome, NewRequest, Recovery } from '../customer/pages'
import {
  CustomerAccess,
  CustomerRegistration,
  CustomerProfile,
} from '../customer/identity'
import { customer } from '../customer/service'
import { ShippingPaymentBlock } from '../shipping/Payment'
import { ShippingPolicyPanel } from '../shipping/Policy'
import { api, apiOnce } from '../services/api'
import { command, readPending, forgetBodies } from '../customer/pending'
import { ApiError } from '../services/errors'
import type {
  DirectPrequoteResponse,
  OwnedShippingTermsResponse,
  ShippingPaymentResponse,
} from '../customer/contract'
import type { ReactNode } from 'react'
vi.mock('../customer/service', () => ({
  customer: {
    register: vi.fn(),
    capabilities: vi.fn(),
    requests: vi.fn(),
    profile: vi.fn(),
    type: vi.fn(),
    attach: vi.fn(),
    update: vi.fn(),
    verify: vi.fn(),
    confirm: vi.fn(),
    prequote: vi.fn(),
    status: vi.fn(),
    detail: vi.fn(),
    consentContext: vi.fn(),
  },
  conversionReference: vi.fn(),
  rememberConversion: vi.fn(),
}))
vi.mock('../services/api', () => ({ api: vi.fn(), apiOnce: vi.fn() }))
const auth: AuthState = {
  user: {
    id: 'A',
    role: 'PROVIDER_ADMIN',
    email: 'a@example.test',
    active: true,
    emailVerifiedAt: '2026-10-06',
    createdAt: '2026-10-06',
    updatedAt: '2026-10-06',
  },
  loading: false,
  expired: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(async () => {}),
  restore: vi.fn(),
}
const terms: OwnedShippingTermsResponse = {
  payer: 'REQUESTER',
  method: 'CASH',
  dueAt: 'PICKUP',
  component: 'DELIVERY_FEE',
  termsVersion: 1,
  termsHash: 'b'.repeat(64),
  payerContact: null,
}
const mpq: DirectPrequoteResponse = {
  publicId: 'MPQ-000001',
  status: 'CONVERTED',
  conditionsVersion: 1,
  conditions: {
    conditionsVersion: 1,
    serviceType: 'LOCAL_DELIVERY',
    stops: [],
    packages: [],
  },
  shippingTerms: { ...terms, termsHash: 'a'.repeat(64) },
  serviceZone: { code: 'TEST', name: 'Test' },
  distanceMeters: 100,
  durationSeconds: 100,
  amount: '25.10',
  currency: 'MXN',
  createdAt: '2026-10-06T00:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z',
  convertedAt: '2026-10-06T00:01:00Z',
  deliveryRequestPublicId: 'MDR-000001',
  deliveryQuotePublicId: 'MQ-000001',
  availabilityGuaranteed: false,
}
const payment: ShippingPaymentResponse = {
  ...terms,
  amount: '25.10',
  currency: 'MXN',
  quotePublicId: 'MQ-000001',
  instructionStatus: 'CURRENT',
  evidenceStatus: 'NOT_DECLARED',
  declaredAt: null,
  collectShipping: true,
}
function mount(node: ReactNode, session = auth) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthContext.Provider value={session}>
        <MemoryRouter>{node}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  forgetBodies()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (
        _key: string,
        _options: unknown,
        callback: (lock: object) => unknown,
      ) => Promise.resolve().then(() => callback({})),
    },
  })
  vi.mocked(customer.requests).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
})
it('quote requires both selected points and sends exact coordinates through the existing command', async () => {
  vi.mocked(customer.capabilities).mockResolvedValue({
    type: 'PERSONAL',
    allowedShippingPayers: ['REQUESTER'],
    defaultShippingPayer: 'REQUESTER',
    capacity: {
      occupied: false,
      activeCount: 0,
      maxActiveRequests: 1,
      activeRequestPublicId: null,
    },
    canPrequote: true,
    canCreateRequest: true,
    reason: null,
  })
  const locate = vi.fn()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: locate },
  })
  vi.mocked(apiOnce).mockResolvedValue({
    prequote: { ...mpq, status: 'OFFERED' },
    replayed: false,
  })
  vi.mocked(customer.prequote).mockResolvedValue(mpq)
  mount(<NewRequest />)
  const submit = await screen.findByRole('button', {
    name: 'Obtener precotización',
  })
  fireEvent.click(submit)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Selecciona un origen y un destino',
  )
  expect(apiOnce).not.toHaveBeenCalled()
  locate.mockImplementationOnce((success: PositionCallback) =>
    success({
      coords: {
        latitude: 17.123456789,
        longitude: -93.123456789,
        accuracy: 10,
      },
    } as GeolocationPosition),
  )
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Usar mi ubicación' })[0],
  )
  fireEvent.click(submit)
  await waitFor(() => expect(submit).toBeEnabled())
  expect(apiOnce).not.toHaveBeenCalled()
  locate.mockImplementationOnce((success: PositionCallback) =>
    success({
      coords: {
        latitude: 18.987654321,
        longitude: -94.987654321,
        accuracy: 10,
      },
    } as GeolocationPosition),
  )
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Usar mi ubicación' })[1],
  )
  fireEvent.click(submit)
  await waitFor(() => expect(apiOnce).toHaveBeenCalledOnce())
  expect(apiOnce).toHaveBeenCalledWith(
    '/customer/delivery-prequotes',
    'POST',
    expect.objectContaining({
      conditions: expect.objectContaining({
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
            latitude: 18.987654,
            longitude: -94.987654,
          },
        ],
      }),
    }),
    undefined,
    { 'Idempotency-Key': expect.any(String) },
  )
})
it('consent uses FINAL MDR hash and exact MPQ amount and expiry', () => {
  const body = consent(mpq, terms)
  expect(body.customerAuthorization.shippingTermsHash).toBe(terms.termsHash)
  expect(body.customerAuthorization.shippingTermsHash).not.toBe(
    mpq.shippingTerms?.termsHash,
  )
  expect(body.customerAuthorization.amount).toBe('25.10')
  expect(body.customerAuthorization.expiresAt).toBe(mpq.expiresAt)
})
it('fragment is removed immediately without storage', () => {
  window.history.replaceState(
    null,
    '',
    '/customer/access#token=synthetic-private&purpose=RESET',
  )
  expect(consumeAccessFragment()).toEqual({
    token: 'synthetic-private',
    purpose: 'RESET',
  })
  expect(window.location.hash).toBe('')
  expect(localStorage.length).toBe(0)
})
it('VERIFY without session requests login and does not confirm', () => {
  mount(
    <CustomerAccess challenge={{ token: 'synthetic', purpose: 'VERIFY' }} />,
    { ...auth, user: null },
  )
  expect(
    screen.getByRole('button', { name: 'Iniciar sesión' }),
  ).toBeInTheDocument()
  expect(customer.confirm).not.toHaveBeenCalled()
})
it('existing operational user sees their client profile without changing role', async () => {
  vi.mocked(customer.profile).mockResolvedValue({
    type: 'PERSONAL',
    displayName: 'Test',
    businessName: null,
    revision: 4,
    active: true,
  })
  mount(<CustomerProfile />)
  expect(await screen.findByDisplayValue('Test')).toBeInTheDocument()
  expect(auth.user?.role).toBe('PROVIDER_ADMIN')
  expect(customer.attach).not.toHaveBeenCalled()
})
it.each(['PERSONAL', 'BUSINESS'] as const)(
  '%s capabilities govern the create link',
  async (type) => {
    vi.mocked(customer.capabilities).mockResolvedValue({
      type,
      allowedShippingPayers:
        type === 'PERSONAL' ? ['REQUESTER'] : ['REQUESTER', 'RECIPIENT'],
      defaultShippingPayer: 'REQUESTER',
      capacity: {
        occupied: false,
        activeCount: 0,
        maxActiveRequests: type === 'PERSONAL' ? 1 : null,
        activeRequestPublicId: null,
      },
      canPrequote: true,
      canCreateRequest: true,
      reason: null,
    })
    mount(<CustomerHome />)
    expect(
      await screen.findByRole('link', { name: 'Cotizar envío' }),
    ).toBeInTheDocument()
  },
)
it('occupied PERSONAL shows continue instead of new request', async () => {
  vi.mocked(customer.capabilities).mockResolvedValue({
    type: 'PERSONAL',
    allowedShippingPayers: ['REQUESTER'],
    defaultShippingPayer: 'REQUESTER',
    capacity: {
      occupied: true,
      activeCount: 1,
      maxActiveRequests: 1,
      activeRequestPublicId: 'MDR-000001',
    },
    canPrequote: false,
    canCreateRequest: false,
    reason: 'CUSTOMER_ACTIVE_REQUEST_LIMIT',
  })
  mount(<CustomerHome />)
  expect(
    await screen.findByRole('link', { name: 'Continuar solicitud activa' }),
  ).toHaveAttribute('href', '/customer/requests/MDR-000001')
  expect(screen.queryByText('Cotizar envío')).not.toBeInTheDocument()
})
it.each(['CURRENT', 'HISTORICAL'] as const)(
  'shipping %s uses actual amount without verified payment claims',
  (status) => {
    mount(
      <ShippingPaymentBlock
        value={{ ...payment, instructionStatus: status }}
      />,
    )
    expect(screen.getByText(/25.10 MXN/)).toBeInTheDocument()
    if (status === 'HISTORICAL')
      expect(screen.queryByText(/Instrucción vigente/)).not.toBeInTheDocument()
  },
)
it('declared evidence survives transfer and does not suggest recollection', () => {
  mount(
    <ShippingPaymentBlock
      value={{
        ...payment,
        evidenceStatus: 'DECLARED',
        declaredAt: '2026-10-06T10:00:00Z',
      }}
    />,
  )
  expect(screen.getByText(/No es pago verificado/)).toBeInTheDocument()
  expect(screen.getByText(/no volver a cobrar/)).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('offer and incomplete payment never order collection', () => {
  const r = mount(<ShippingPaymentBlock value={payment} offer />)
  expect(screen.queryByText(/Instrucción vigente/)).not.toBeInTheDocument()
  r.unmount()
  mount(<ShippingPaymentBlock value={{ payer: 'UNKNOWN' }} />)
  expect(screen.getByText(/no reconocidas/)).toBeInTheDocument()
})
it('reload conversion recovery uses receipt and current request without replay', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    command('A', 'convert', 'MPQ-000001', '/convert', {}),
  ).rejects.toThrow()
  forgetBodies()
  vi.mocked(apiOnce).mockResolvedValue({
    operation: 'PREQUOTE_CONVERT',
    resourcePublicId: 'MPQ-000001',
    state: 'APPLIED',
    result: {
      prequotePublicId: 'MPQ-000001',
      deliveryRequestPublicId: 'MDR-000001',
      deliveryQuotePublicId: 'MQ-000001',
    },
  })
  vi.mocked(customer.detail).mockResolvedValue({
    publicId: 'MDR-000001',
  } as Awaited<ReturnType<typeof customer.detail>>)
  vi.mocked(customer.status).mockResolvedValue({
    publicId: 'MDR-000001',
  } as Awaited<ReturnType<typeof customer.status>>)
  vi.mocked(customer.consentContext).mockResolvedValue({
    deliveryRequestPublicId: 'MDR-000001',
    quote: { publicId: 'MQ-000001' },
  } as Awaited<ReturnType<typeof customer.consentContext>>)
  const done = vi.fn()
  mount(<Recovery pending={readPending()[0]} onRecovered={done} />)
  fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }))
  await waitFor(() => expect(done).toHaveBeenCalledWith('MDR-000001'))
  expect(apiOnce).toHaveBeenCalledTimes(2)
  expect(readPending()).toHaveLength(0)
})
it('unapplied MPQ read retains uncertain lock against a late POST', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    command('A', 'convert', 'MPQ-000001', '/convert', {}),
  ).rejects.toThrow()
  forgetBodies()
  vi.mocked(customer.prequote).mockResolvedValue({
    ...mpq,
    status: 'OFFERED',
    deliveryRequestPublicId: null,
  })
  vi.mocked(apiOnce).mockResolvedValue({
    operation: 'PREQUOTE_CONVERT',
    resourcePublicId: 'MPQ-000001',
    state: 'PENDING_OR_UNKNOWN',
    result: null,
  })
  mount(<Recovery pending={readPending()[0]} onRecovered={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }))
  expect(
    await screen.findByText(/El resultado sigue pendiente/),
  ).toBeInTheDocument()
  expect(readPending()).toHaveLength(1)
})
it('changed user cannot recover an earlier actor operation', () => {
  mount(
    <Recovery
      pending={{
        actor: 'B',
        kind: 'accept',
        key: 'synthetic-key',
        ref: 'MDR-000001',
      }}
      onRecovered={vi.fn()}
    />,
  )
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(
    screen.getByText(/Cambiar de usuario no la elimina/),
  ).toBeInTheDocument()
})
it('SUPER_ADMIN policy has explicit unchecked confirmation and current payer', async () => {
  vi.mocked(api).mockResolvedValue({ payer: 'RECIPIENT', revision: 2 })
  mount(<ShippingPolicyPanel id="synthetic-integration" />, {
    ...auth,
    user: { ...auth.user!, role: 'SUPER_ADMIN' },
  })
  expect(await screen.findByLabelText('Quién paga el envío')).toHaveValue(
    'RECIPIENT',
  )
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(apiOnce).not.toHaveBeenCalled()
})
it('applied acceptance after reload clears marker only with matching accepted quote', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    command('A', 'accept', 'MDR-000001', '/accept', {}, 'MQ-000001'),
  ).rejects.toThrow()
  forgetBodies()
  vi.mocked(customer.status).mockResolvedValue({
    publicId: 'MDR-000001',
    publicVersion: '2',
    trackingMode: 'DETAILED',
    assignmentState: 'NONE',
    terminalOutcome: null,
    status: 'OPEN',
    requestedAt: '2026-10-06T00:00:00Z',
    shippingPayment: payment,
  })
  vi.mocked(apiOnce).mockResolvedValue({
    operation: 'QUOTE_ACCEPT',
    resourcePublicId: 'MQ-000001',
    state: 'APPLIED',
    result: {
      deliveryRequestPublicId: 'MDR-000001',
      deliveryQuotePublicId: 'MQ-000001',
    },
  })
  vi.mocked(customer.detail).mockResolvedValue({
    publicId: 'MDR-000001',
  } as Awaited<ReturnType<typeof customer.detail>>)
  vi.mocked(customer.consentContext).mockResolvedValue({
    deliveryRequestPublicId: 'MDR-000001',
    quote: { publicId: 'MQ-000001' },
  } as Awaited<ReturnType<typeof customer.consentContext>>)
  const done = vi.fn()
  mount(<Recovery pending={readPending()[0]} onRecovered={done} />)
  fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }))
  await waitFor(() => expect(done).toHaveBeenCalledWith('MDR-000001'))
  expect(apiOnce).toHaveBeenCalledTimes(2)
})
it('cancellation response lost reconciles by confirmed CANCELLED, not expiry', async () => {
  vi.mocked(apiOnce).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    command('A', 'cancel', 'MDR-000001', '/cancel', { reason: 'Sintético' }),
  ).rejects.toThrow()
  forgetBodies()
  const s = {
    publicId: 'MDR-000001',
    publicVersion: '2',
    trackingMode: null,
    assignmentState: 'NONE' as const,
    terminalOutcome: null,
    status: 'EXPIRED' as const,
    requestedAt: '2026-10-06T00:00:00Z',
    shippingPayment: null,
  }
  vi.mocked(customer.status)
    .mockResolvedValueOnce(s)
    .mockResolvedValueOnce({ ...s, status: 'CANCELLED' })
  const done = vi.fn()
  mount(<Recovery pending={readPending()[0]} onRecovered={done} />)
  fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }))
  await screen.findByText(/El estado sigue incierto/)
  expect(done).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }))
  await waitFor(() => expect(done).toHaveBeenCalled())
  expect(apiOnce).toHaveBeenCalledTimes(1)
})
it('provider role cannot consult or change shipping policy', () => {
  mount(<ShippingPolicyPanel id="synthetic" />)
  expect(api).not.toHaveBeenCalled()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('executor OFFER from real projection is informational with amount', () => {
  mount(
    <ShippingPaymentBlock value={{ ...payment, instructionStatus: 'OFFER' }} />,
  )
  expect(screen.getByText('Condiciones de la oferta')).toBeInTheDocument()
  expect(screen.getByText(/25.10 MXN/)).toBeInTheDocument()
  expect(screen.queryByText(/Instrucción vigente/)).not.toBeInTheDocument()
})
it('registration resend submits profile and generic acknowledgement does not claim email delivery', async () => {
  vi.mocked(customer.register).mockResolvedValue({ status: 'ACCEPTED' })
  mount(<CustomerRegistration />)
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'synthetic@example.test' },
  })
  fireEvent.change(screen.getByLabelText('Nombre'), {
    target: { value: 'Cliente sintético' },
  })
  fireEvent.change(screen.getByLabelText('Tipo de cliente'), {
    target: { value: 'BUSINESS' },
  })
  fireEvent.change(screen.getByLabelText('Nombre del negocio (opcional)'), {
    target: { value: 'Negocio sintético' },
  })
  fireEvent.click(
    screen.getByLabelText('Reenviar registro con este perfil completo'),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar confirmación' }))
  await screen.findByText(/no confirma la entrega del mensaje/)
  expect(customer.register).toHaveBeenCalledWith(
    {
      email: 'synthetic@example.test',
      type: 'BUSINESS',
      displayName: 'Cliente sintético',
      businessName: 'Negocio sintético',
    },
    true,
  )
})
it('reset success clears session and requests a fresh login', async () => {
  vi.mocked(customer.confirm).mockResolvedValue({ status: 'CONFIRMED' })
  mount(
    <CustomerAccess
      challenge={{ purpose: 'RESET', token: 'synthetic-only' }}
    />,
  )
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
    target: { value: 'synthetic-long-password' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await screen.findByText('Confirmación completada')
  expect(auth.logout).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('link', { name: 'Iniciar sesión' }),
  ).toBeInTheDocument()
})
it.each(['PERSONAL', 'BUSINESS'] as const)(
  '%s quote form only offers allowed payers',
  async (type) => {
    vi.mocked(customer.capabilities).mockResolvedValue({
      type,
      allowedShippingPayers:
        type === 'PERSONAL' ? ['REQUESTER'] : ['REQUESTER', 'RECIPIENT'],
      defaultShippingPayer: 'REQUESTER',
      capacity: {
        occupied: false,
        activeCount: 0,
        maxActiveRequests: type === 'PERSONAL' ? 1 : null,
        activeRequestPublicId: null,
      },
      canPrequote: true,
      canCreateRequest: true,
      reason: null,
    })
    mount(<NewRequest />)
    const select = await screen.findByLabelText('Pagador del envío')
    expect(select).toHaveValue('REQUESTER')
    expect(select.querySelectorAll('option')).toHaveLength(
      type === 'PERSONAL' ? 1 : 2,
    )
  },
)

it('BUSINESS with active requests can quote again when backend permits creation', async () => {
  vi.mocked(customer.capabilities).mockResolvedValue({
    type: 'BUSINESS',
    allowedShippingPayers: ['REQUESTER', 'RECIPIENT'],
    defaultShippingPayer: 'REQUESTER',
    capacity: {
      occupied: true,
      activeCount: 1,
      maxActiveRequests: null,
      activeRequestPublicId: null,
    },
    canPrequote: true,
    canCreateRequest: true,
    reason: null,
  })
  mount(<NewRequest />)
  expect(
    await screen.findByRole('button', { name: 'Obtener precotización' }),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('Pagador del envío')).toHaveValue('REQUESTER')
  expect(
    screen.getByRole('option', { name: 'Destinatario' }),
  ).toBeInTheDocument()
  expect(screen.queryByText('Cupo no disponible')).not.toBeInTheDocument()
})
