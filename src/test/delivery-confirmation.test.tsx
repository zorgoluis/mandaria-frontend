import { beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthState } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { queryClient } from '../services/query'
import { DeliveryCode } from '../customer/DeliveryCode'
import { customer } from '../customer/service'
import {
  DriverExecutionActions,
  DriverExecutionRecovery,
} from '../driver-portal/execution'
import { apiOnce } from '../services/api'
import { ApiError } from '../services/errors'
import { executionApi } from '../execution/service'
import { executionFixture, detailFixture } from './execution-fixture'
import type { Execution } from '../execution/types'
import type { Role } from '../types/api'
import { confirmationLabel } from '../execution/delivery-confirmation'
vi.mock('../customer/service', () => ({ customer: { deliveryCode: vi.fn() } }))
vi.mock('../services/api', async (original) => ({
  ...(await original<typeof import('../services/api')>()),
  apiOnce: vi.fn(),
}))
vi.mock('../execution/service', () => ({ executionApi: { detail: vi.fn() } }))
const code = '0' + '83729',
  id = 'synthetic-dispatch',
  assignment = executionFixture.activeAssignmentId!
const metadata = { policy: 'REQUIRED', method: null } as const
const execution: Execution = {
  ...executionFixture,
  phase: 'AT_DROPOFF',
  allowedActions: ['DELIVER'],
  deliveryConfirmation: metadata,
}
function view(
  node: ReactNode,
  role: Role = 'DRIVER',
  actor = 'actor-a',
  expired = false,
) {
  const auth = {
    user: { id: actor, role, email: 'synthetic@example.test', active: true },
    loading: false,
    expired,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
    error: null,
  } as unknown as AuthState
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <FeedbackProvider>
          <MemoryRouter>{node}</MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
function actions(e = execution) {
  return (
    <>
      <DriverExecutionActions dispatchId={id} e={e} />
      <DriverExecutionRecovery />
    </>
  )
}
async function complete(value = code) {
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar entrega detallada' }),
  )
  const input = screen.queryByLabelText('Código de entrega (6 dígitos)')
  if (input) fireEvent.change(input, { target: { value } })
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  queryClient.clear()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (_name: string, fn: () => Promise<unknown>) => fn(),
    },
  })
  vi.mocked(executionApi.detail).mockResolvedValue({
    ...detailFixture,
    execution,
  })
  vi.mocked(apiOnce).mockResolvedValue({
    assignmentId: assignment,
    status: 'DELIVERED',
  })
  vi.mocked(customer.deliveryCode).mockResolvedValue({
    publicId: 'MDR-SYNTHETIC',
    deliveryCode: code,
  })
})
it('CUSTOMER reads a private string with leading zero, outside caches and storage, then hides on terminal', async () => {
  const ui = render(
    view(
      <DeliveryCode
        publicId="MDR-SYNTHETIC"
        metadata={metadata}
        terminal={false}
      />,
      'CUSTOMER',
    ),
  )
  fireEvent.click(screen.getByText('Consultar código de entrega'))
  await screen.findByLabelText('Código privado de entrega')
  expect(screen.getByLabelText('Código privado de entrega').textContent).toBe(
    code,
  )
  expect(
    JSON.stringify(localStorage) +
      JSON.stringify(sessionStorage) +
      JSON.stringify(queryClient.getQueryCache().getAll()),
  ).not.toContain(code)
  expect(window.location.href).not.toContain(code)
  ui.rerender(
    view(
      <DeliveryCode publicId="MDR-SYNTHETIC" metadata={metadata} terminal />,
      'CUSTOMER',
    ),
  )
  expect(screen.queryByLabelText('Código privado de entrega')).toBeNull()
})
it.each(['SUPER_ADMIN', 'DRIVER', 'PROVIDER_ADMIN'] as const)(
  '%s cannot read customer code',
  (role) => {
    render(
      view(
        <DeliveryCode
          publicId="MDR-SYNTHETIC"
          metadata={metadata}
          terminal={false}
        />,
        role,
      ),
    )
    expect(screen.queryByText('Consultar código de entrega')).toBeNull()
    expect(customer.deliveryCode).not.toHaveBeenCalled()
  },
)
it.each([
  [404, null],
  [401, null],
  [403, null],
  [409, 'DELIVERY_CODE_UNAVAILABLE'],
  [409, 'DELIVERY_CODE_NOT_REQUIRED'],
] as const)(
  'private read rejection %s %s never reveals code',
  async (status, errorCode) => {
    vi.mocked(customer.deliveryCode).mockRejectedValue(
      new ApiError(status, 'private-detail', errorCode),
    )
    render(
      view(
        <DeliveryCode
          publicId="MDR-SYNTHETIC"
          metadata={metadata}
          terminal={false}
        />,
        'CUSTOMER',
      ),
    )
    fireEvent.click(screen.getByText('Consultar código de entrega'))
    await screen.findByRole('alert')
    expect(screen.queryByLabelText('Código privado de entrega')).toBeNull()
    expect(document.body.textContent).not.toContain('private-detail')
  },
)
it('session expiration removes private code and driver input immediately', async () => {
  const ui = render(
    view(
      <DeliveryCode
        publicId="MDR-SYNTHETIC"
        metadata={metadata}
        terminal={false}
      />,
      'CUSTOMER',
    ),
  )
  fireEvent.click(screen.getByText('Consultar código de entrega'))
  await screen.findByLabelText('Código privado de entrega')
  ui.rerender(
    view(
      <DeliveryCode
        publicId="MDR-SYNTHETIC"
        metadata={metadata}
        terminal={false}
      />,
      'CUSTOMER',
      'actor-a',
      true,
    ),
  )
  expect(screen.queryByLabelText('Código privado de entrega')).toBeNull()
  ui.rerender(view(actions()))
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar entrega detallada' }),
  )
  fireEvent.change(screen.getByLabelText('Código de entrega (6 dígitos)'), {
    target: { value: code },
  })
  ui.rerender(view(actions(), 'DRIVER', 'actor-a', true))
  expect(screen.queryByDisplayValue(code)).toBeNull()
  expect(apiOnce).not.toHaveBeenCalled()
})
it('late private response cannot cross account or request change', async () => {
  let resolve!: (v: { publicId: string; deliveryCode: string }) => void
  vi.mocked(customer.deliveryCode).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const ui = render(
    view(
      <DeliveryCode
        publicId="MDR-SYNTHETIC"
        metadata={metadata}
        terminal={false}
      />,
      'CUSTOMER',
    ),
  )
  fireEvent.click(screen.getByText('Consultar código de entrega'))
  ui.rerender(
    view(
      <DeliveryCode
        publicId="MDR-OTHER"
        metadata={metadata}
        terminal={false}
      />,
      'CUSTOMER',
      'actor-b',
    ),
  )
  await act(async () =>
    resolve({ publicId: 'MDR-SYNTHETIC', deliveryCode: code }),
  )
  expect(screen.queryByLabelText('Código privado de entrega')).toBeNull()
})
it('required completion sends exact code and revision with one identity and only persists marker', async () => {
  render(view(actions()))
  await complete()
  await waitFor(() => expect(apiOnce).toHaveBeenCalledOnce())
  expect(vi.mocked(apiOnce).mock.calls[0][2]).toEqual({
    assignmentId: assignment,
    expectedRevision: 4,
    deliveryCode: code,
  })
  const stored = JSON.stringify(localStorage)
  expect(stored).not.toContain(code)
  expect(stored).not.toContain('deliveryCode')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(
    screen.getByRole('button', { name: 'Confirmar entrega detallada' }),
  ).toBeDisabled()
})
it.each(['12345', '1234567', ' 123456', '123456 ', '１２３４５６', '١٢٣٤٥٦'])(
  'invalid input is rejected before mutation (%#)',
  async (value) => {
    render(view(actions()))
    await complete(value)
    await screen.findByText(
      'Introduce exactamente seis dígitos ASCII, sin espacios.',
    )
    expect(apiOnce).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  },
)
it('NOT_REQUIRED retains completion without code; absent metadata is not permission', async () => {
  const e: Execution = {
    ...execution,
    deliveryConfirmation: { policy: 'NOT_REQUIRED', method: null },
  }
  vi.mocked(executionApi.detail).mockResolvedValue({
    ...detailFixture,
    execution: e,
  })
  const ui = render(view(actions(e)))
  await complete()
  await waitFor(() => expect(apiOnce).toHaveBeenCalledOnce())
  expect(vi.mocked(apiOnce).mock.calls[0][2]).not.toHaveProperty('deliveryCode')
  ui.unmount()
  localStorage.clear()
  render(view(actions({ ...e, deliveryConfirmation: undefined })))
  expect(
    screen.getByRole('button', { name: 'Confirmar entrega detallada' }),
  ).toBeDisabled()
  expect(confirmationLabel(undefined)).toBe('Confirmación no informada')
  expect(
    confirmationLabel({ policy: 'REQUIRED', method: 'ADMIN_ASSISTED' }),
  ).toContain('asistencia administrativa')
})
it('REJECTED survives reload; correction waits for acknowledgement and receives a new key', async () => {
  vi.mocked(apiOnce).mockRejectedValueOnce(
    new ApiError(409, 'rejected', 'DELIVERY_CODE_MISMATCH'),
  )
  const ui = render(view(actions()))
  await complete()
  await screen.findByText(/El código no coincide/)
  const original = vi.mocked(apiOnce).mock.calls[0][4]?.['Idempotency-Key']
  ui.unmount()
  vi.mocked(apiOnce).mockResolvedValue({
    state: 'REJECTED',
    assignmentId: assignment,
    operation: 'DELIVER',
    code: 'DELIVERY_CODE_MISMATCH',
    retryAfter: 0,
    canStartNewAttempt: true,
  })
  render(view(actions()))
  fireEvent.click(screen.getByText('Consultar ejecución original'))
  await screen.findByText(/Intento rechazado; no se confirmó/)
  expect(vi.mocked(apiOnce).mock.calls[1][4]?.['Idempotency-Key']).toBe(
    original,
  )
  fireEvent.click(screen.getByText('Reconocer ejecución'))
  vi.mocked(apiOnce).mockResolvedValue({
    assignmentId: assignment,
    status: 'DELIVERED',
  })
  await complete('012345')
  await waitFor(() => expect(apiOnce).toHaveBeenCalledTimes(3))
  expect(vi.mocked(apiOnce).mock.calls[2][4]?.['Idempotency-Key']).not.toBe(
    original,
  )
})
it('blocked rejection cannot be dismissed and never retries after waiting', async () => {
  const error = new ApiError(429, 'blocked', 'DELIVERY_CODE_ATTEMPTS_BLOCKED')
  error.retryAfterMs = 300000
  vi.mocked(apiOnce).mockRejectedValueOnce(error)
  render(view(actions()))
  await complete()
  await screen.findByText(/Espera 300 segundos/)
  vi.mocked(apiOnce).mockResolvedValue({
    state: 'REJECTED',
    assignmentId: assignment,
    operation: 'DELIVER',
    code: 'DELIVERY_CODE_ATTEMPTS_BLOCKED',
    retryAfter: 300,
    canStartNewAttempt: false,
  })
  fireEvent.click(screen.getByText('Consultar ejecución original'))
  await screen.findByText(/Intento rechazado; no se confirmó/)
  expect(screen.queryByText('Reconocer ejecución')).toBeNull()
  vi.useFakeTimers()
  await act(async () => {
    vi.advanceTimersByTime(301000)
  })
  vi.useRealTimers()
  expect(apiOnce).toHaveBeenCalledTimes(2)
})
it('lost response APPLIED recovery accepts historical receipt without a second POST', async () => {
  vi.mocked(apiOnce).mockRejectedValueOnce(new ApiError(0, 'lost'))
  render(view(actions()), { reactStrictMode: true })
  await complete()
  await screen.findByText('lost')
  vi.mocked(apiOnce).mockResolvedValue({
    state: 'APPLIED',
    assignmentId: assignment,
    operation: 'DELIVER',
    canStartNewAttempt: false,
  })
  fireEvent.click(screen.getByText('Consultar ejecución original'))
  await screen.findByText('Reconocer ejecución')
  expect(
    vi.mocked(apiOnce).mock.calls.filter((c) => c[1] === 'POST'),
  ).toHaveLength(1)
})
it('assignment change and late preflight cannot submit or retain input', async () => {
  let resolve!: (v: typeof detailFixture) => void
  vi.mocked(executionApi.detail).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const ui = render(view(actions()))
  await complete()
  ui.rerender(
    view(actions({ ...execution, activeAssignmentId: 'another-assignment' })),
  )
  await act(async () => resolve({ ...detailFixture, execution }))
  expect(apiOnce).not.toHaveBeenCalled()
  expect(screen.queryByDisplayValue(code)).toBeNull()
})
it('closing an uncertain attempt can return REJECTED without converting it to closed-no-effects', async () => {
  vi.mocked(apiOnce).mockRejectedValueOnce(new ApiError(0, 'lost'))
  render(view(actions()))
  await complete()
  await screen.findByText('lost')
  vi.mocked(apiOnce).mockResolvedValueOnce({
    state: 'PENDING_OR_UNKNOWN',
    assignmentId: assignment,
    operation: 'DELIVER',
    canStartNewAttempt: false,
  })
  fireEvent.click(screen.getByText('Consultar ejecución original'))
  fireEvent.click(await screen.findByText('Cerrar clave de ejecución'))
  vi.mocked(apiOnce).mockResolvedValueOnce({
    state: 'REJECTED',
    assignmentId: assignment,
    operation: 'DELIVER',
    code: 'DELIVERY_CODE_MISMATCH',
    retryAfter: 0,
    canStartNewAttempt: false,
  })
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar',
    }),
  )
  await screen.findByText(/Intento rechazado; no se confirmó/)
  expect(screen.queryByText('Reconocer ejecución')).toBeNull()
  expect(vi.mocked(apiOnce).mock.calls[2][0]).toContain(
    '/attempt/close?operation=DELIVER',
  )
  expect(vi.mocked(apiOnce).mock.calls[2][4]).toEqual(
    vi.mocked(apiOnce).mock.calls[0][4],
  )
})
it('current assignment, revision, phase and permission are rechecked before sending', async () => {
  for (const patch of [
    { revision: 5 },
    { phase: 'PICKED_UP' as const },
    { allowedActions: [] },
    { activeAssignmentId: 'new' },
  ]) {
    vi.mocked(executionApi.detail).mockResolvedValue({
      ...detailFixture,
      execution: { ...execution, ...patch },
    })
    const ui = render(view(actions()))
    await complete()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(apiOnce).not.toHaveBeenCalled()
    ui.unmount()
  }
})
it('reused identity never reports successful delivery or creates another mutation', async () => {
  vi.mocked(apiOnce).mockRejectedValue(
    new ApiError(409, 'reused', 'IDEMPOTENCY_KEY_REUSED'),
  )
  render(view(actions()))
  await complete()
  await screen.findByText(/La clave pertenece a otro cuerpo/)
  expect(apiOnce).toHaveBeenCalledOnce()
  expect(
    screen.getByRole('button', { name: 'Confirmar entrega detallada' }),
  ).toBeDisabled()
})
