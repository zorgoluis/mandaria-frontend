import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '../services/query'
import { ApiError } from '../services/errors'
import { AuthContext } from '../auth/context'
import { Protected } from '../app/App'
import { FeedbackProvider } from '../components/Feedback'
import { WebhookSettings, SecretManager } from '../webhooks/settings'
import {
  WebhookEventPage,
  WebhookEvents,
  WebhookHealthPage,
  WebhookPanel,
} from '../webhooks/pages'
import { webhooks } from '../webhooks/service'
import type {
  WebhookEndpoint,
  WebhookEvent,
  WebhookSecret,
} from '../webhooks/types'
vi.mock('../webhooks/service', () => ({
  webhooks: {
    endpoint: vi.fn(),
    save: vi.fn(),
    issue: vi.fn(),
    events: vi.fn(),
    event: vi.fn(),
    summary: vi.fn(),
    health: vi.fn(),
  },
}))
const stamp = '2026-10-01T12:00:00Z'
const endpoint: WebhookEndpoint = {
  id: 'endpoint',
  integrationClientId: 'client',
  url: 'https://receiver.example/hook',
  enabled: false,
  secretConfigured: true,
  secretSetAt: stamp,
  deliverFrom: stamp,
  createdAt: stamp,
  updatedAt: stamp,
}
const event: WebhookEvent = {
  eventId: 'event',
  integrationClientId: 'client',
  type: 'delivery.completed',
  deliveryRequestPublicId: 'MDR-000101',
  externalReference: 'DEMO',
  occurredAt: stamp,
  transportState: 'NO_DELIVERY',
  noDeliveryReason: 'BEFORE_BOUNDARY',
  attemptCount: 1,
  nextAttemptAt: null,
  inFlight: false,
}
const secret: WebhookSecret = {
  secret: 'synthetic-signing-secret',
  secretSetAt: stamp,
  algorithm: 'HMAC-SHA256',
  signatureHeader: 'X-Mandaria-Signature',
  signedMessage: '{timestamp}.{rawBody}',
  note: 'once',
}
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FeedbackProvider>{children}</FeedbackProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
function defer<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
  vi.mocked(webhooks.endpoint).mockResolvedValue(endpoint)
  vi.mocked(webhooks.save).mockResolvedValue(endpoint)
  vi.mocked(webhooks.issue).mockResolvedValue(secret)
  vi.mocked(webhooks.events).mockResolvedValue({
    items: [event],
    total: 21,
    totalPages: 2,
    page: 1,
    pageSize: 20,
  })
  vi.mocked(webhooks.summary).mockResolvedValue({
    events: 1,
    pending: 0,
    delivered: 0,
    exhausted: 0,
  })
})
it('creates missing configuration disabled and explicitly sends enabled', async () => {
  vi.mocked(webhooks.endpoint).mockResolvedValue(null)
  render(<WebhookSettings id="client" />, { wrapper })
  expect(
    await screen.findByText('No hay un destino configurado.'),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('Envíos habilitados')).not.toBeChecked()
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText('URL receptora HTTPS'),
    'https://new.example/hook',
  )
  await user.click(screen.getByRole('button', { name: 'Guardar webhook' }))
  await waitFor(() =>
    expect(webhooks.save).toHaveBeenCalledWith('client', {
      url: 'https://new.example/hook',
      enabled: false,
    }),
  )
})
it.each([401, 403, 0])(
  'does not treat %s as a missing endpoint',
  async (status) => {
    vi.mocked(webhooks.endpoint).mockRejectedValue(
      new ApiError(status, 'Acceso no disponible'),
    )
    render(<WebhookSettings id="client" />, { wrapper })
    expect(await screen.findByText('Acceso no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar webhook' })).toBeNull()
  },
)
it('syncs remote fields while clean, preserves edits and blocks conflicting save', async () => {
  render(<WebhookSettings id="client" />, { wrapper })
  await screen.findByLabelText('URL receptora HTTPS')
  const changed = {
    ...endpoint,
    url: 'https://remote.example/hook',
    enabled: true,
    updatedAt: '2026-10-01T13:00:00Z',
  }
  act(() =>
    queryClient.setQueryData(['webhooks', 'client', 'endpoint'], changed),
  )
  await waitFor(() =>
    expect(screen.getByLabelText('URL receptora HTTPS')).toHaveValue(
      changed.url,
    ),
  )
  expect(screen.getByLabelText('Envíos habilitados')).toBeChecked()
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText('URL receptora HTTPS'))
  await user.type(
    screen.getByLabelText('URL receptora HTTPS'),
    'https://local-edit.example/hook',
  )
  act(() =>
    queryClient.setQueryData(['webhooks', 'client', 'endpoint'], {
      ...changed,
      enabled: false,
      updatedAt: '2026-10-01T14:00:00Z',
    }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'La configuración cambió',
  )
  expect(screen.getByLabelText('URL receptora HTTPS')).toHaveValue(
    'https://local-edit.example/hook',
  )
  await user.click(screen.getByRole('button', { name: 'Guardar webhook' }))
  expect(webhooks.save).not.toHaveBeenCalled()
  await user.click(
    screen.getByRole('button', {
      name: 'Descartar edición y cargar configuración actual',
    }),
  )
  expect(screen.getByLabelText('URL receptora HTTPS')).toHaveValue(changed.url)
  expect(screen.getByLabelText('Envíos habilitados')).not.toBeChecked()
})
it('generation requires confirmation, prevents double submit, clears secret and never caches it', async () => {
  const pending = defer<WebhookSecret>()
  vi.mocked(webhooks.issue).mockReturnValue(pending.promise)
  render(<SecretManager id="client" configured />, { wrapper })
  fireEvent.click(
    screen.getByRole('button', { name: 'Rotar secreto de firma' }),
  )
  expect(webhooks.issue).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'reemplaza inmediatamente',
  )
  const button = screen.getByRole('button', {
    name: 'Confirmar generación única',
  })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(webhooks.issue).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve(secret))
  expect(screen.getByLabelText('Secreto de firma de webhook')).toHaveValue(
    secret.secret,
  )
  expect(
    JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain(secret.secret)
  expect(
    JSON.stringify(localStorage) + JSON.stringify(sessionStorage),
  ).not.toContain(secret.secret)
  fireEvent.click(screen.getByRole('button', { name: 'Ya lo guardé, cerrar' }))
  expect(screen.queryByDisplayValue(secret.secret)).toBeNull()
})
it('a lost response explains uncertainty without auto retry', async () => {
  vi.mocked(webhooks.issue).mockRejectedValue(new ApiError(0, 'Network'))
  render(<SecretManager id="client" configured />, { wrapper })
  fireEvent.click(
    screen.getByRole('button', { name: 'Rotar secreto de firma' }),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar generación única' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'El secreto pudo cambiar',
  )
  expect(webhooks.issue).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
})
it.each(['pagehide', 'navigation'])(
  'late response after %s cannot reveal a secret',
  async (mode) => {
    const pending = defer<WebhookSecret>()
    vi.mocked(webhooks.issue).mockReturnValue(pending.promise)
    const view = render(<SecretManager id="client" configured />, { wrapper })
    fireEvent.click(
      screen.getByRole('button', { name: 'Rotar secreto de firma' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar generación única' }),
    )
    if (mode === 'navigation') view.unmount()
    else act(() => window.dispatchEvent(new Event('pagehide')))
    await act(async () => pending.resolve(secret))
    expect(screen.queryByDisplayValue(secret.secret)).toBeNull()
  },
)
it('pagehide removes a displayed secret', async () => {
  render(<SecretManager id="client" configured />, { wrapper })
  fireEvent.click(
    screen.getByRole('button', { name: 'Rotar secreto de firma' }),
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar generación única' }),
  )
  await screen.findByDisplayValue(secret.secret)
  act(() => window.dispatchEvent(new Event('pagehide')))
  expect(screen.queryByDisplayValue(secret.secret)).toBeNull()
})
it('filters and pagination stay scoped to the integration, using actual reason codes', async () => {
  render(<WebhookEvents id="client" />, { wrapper })
  expect(
    await screen.findByText('Anterior al inicio de entrega automática'),
  ).toBeInTheDocument()
  const user = userEvent.setup()
  await user.selectOptions(
    screen.getByLabelText('Estado de transporte'),
    'PENDING',
  )
  await user.type(screen.getByLabelText('Solicitud'), 'MDR-000102')
  await user.type(screen.getByLabelText('Referencia externa exacta'), 'ORDER-2')
  fireEvent.change(screen.getByLabelText('Desde (hora local)'), {
    target: { value: '2026-10-01T10:00' },
  })
  fireEvent.change(screen.getByLabelText('Hasta (hora local)'), {
    target: { value: '2026-10-01T11:00' },
  })
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await waitFor(() =>
    expect(webhooks.events).toHaveBeenLastCalledWith(
      'client',
      expect.objectContaining({
        page: 1,
        transportState: 'PENDING',
        deliveryRequestPublicId: 'MDR-000102',
        externalReference: 'ORDER-2',
        occurredFrom: new Date('2026-10-01T10:00').toISOString(),
        occurredTo: new Date('2026-10-01T11:00').toISOString(),
      }),
      expect.any(AbortSignal),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
  await waitFor(() =>
    expect(webhooks.events).toHaveBeenLastCalledWith(
      'client',
      expect.objectContaining({ page: 2 }),
      expect.any(AbortSignal),
    ),
  )
})
it.each(['PENDING', 'DELIVERED', 'EXHAUSTED', 'NO_DELIVERY'] as const)(
  'renders transport %s and NOT_YET_PICKED_UP',
  async (transportState) => {
    vi.mocked(webhooks.events).mockResolvedValue({
      items: [
        { ...event, transportState, noDeliveryReason: 'NOT_YET_PICKED_UP' },
      ],
      total: 1,
      totalPages: 1,
      page: 1,
      pageSize: 20,
    })
    render(<WebhookEvents id="client" />, { wrapper })
    expect(
      await screen.findByText('Pendiente de recogida por el worker'),
    ).toBeInTheDocument()
  },
)
it.each([true, false])(
  'event detail validates ownership (%s) and distinguishes historical destination',
  async (own) => {
    vi.mocked(webhooks.event).mockResolvedValue({
      ...event,
      integrationClientId: own ? 'client' : 'another-client',
      payload: { type: 'delivery.completed' },
      endpoint,
      attempts: [
        {
          id: 'attempt',
          attemptNumber: 1,
          attemptedAt: stamp,
          result: 'FAILED',
          httpStatus: 503,
          failureKind: 'HTTP_STATUS',
          durationMs: 120,
          endpointUrl: 'https://old.example/hook',
        },
      ],
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/integrations/client/webhooks/event']}>
          <Routes>
            <Route
              path="/integrations/:id/webhooks/:eventId"
              element={<WebhookEventPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    if (own) {
      expect(
        await screen.findByText('https://old.example/hook'),
      ).toBeInTheDocument()
      expect(screen.getByText(endpoint.url)).toBeInTheDocument()
      expect(screen.getByText('120 ms')).toBeInTheDocument()
    } else {
      expect(await screen.findByText('Sin permisos')).toBeInTheDocument()
      expect(screen.queryByText('https://old.example/hook')).toBeNull()
    }
  },
)
it('separates shared metrics from the responding instance', async () => {
  vi.mocked(webhooks.health).mockResolvedValue({
    pending: 2,
    delivered: 3,
    exhausted: 0,
    leased: 1,
    oldestPendingDueAt: stamp,
    thisInstance: {
      workerEnabled: false,
      lastPollAt: null,
      pollSeconds: 0,
      leaseSeconds: 60,
    },
  })
  render(<WebhookHealthPage />, { wrapper })
  expect(await screen.findByText('Métricas compartidas')).toBeInTheDocument()
  expect(
    screen.getByText('Instancia que responde (thisInstance)'),
  ).toBeInTheDocument()
})
function auth(role: 'SUPER_ADMIN' | 'PROVIDER_ADMIN' | 'DRIVER' | null) {
  return {
    user: role
      ? {
          id: 'u',
          role,
          email: 'synthetic@example.test',
          active: true,
          createdAt: stamp,
          updatedAt: stamp,
          emailVerifiedAt: null,
        }
      : null,
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
}
it.each(['SUPER_ADMIN', 'PROVIDER_ADMIN', 'DRIVER'] as const)(
  'protects direct admin route for %s',
  async (role) => {
    render(
      <AuthContext.Provider value={auth(role)}>
        <Routes>
          <Route element={<Protected roles={['SUPER_ADMIN']} />}>
            <Route path="/" element={<WebhookPanel id="client" />} />
          </Route>
        </Routes>
      </AuthContext.Provider>,
      { wrapper },
    )
    if (role === 'SUPER_ADMIN')
      expect(
        await screen.findByRole('region', { name: 'Webhook de integración' }),
      ).toBeInTheDocument()
    else {
      expect(screen.getByText('Sin permisos')).toBeInTheDocument()
      expect(webhooks.endpoint).not.toHaveBeenCalled()
    }
  },
)
it('logout unmounts the secret, including a pending response', async () => {
  const pending = defer<WebhookSecret>()
  vi.mocked(webhooks.issue).mockReturnValue(pending.promise)
  const tree = (role: 'SUPER_ADMIN' | null) => (
    <AuthContext.Provider value={auth(role)}>
      <WebhookPanel id="client" />
    </AuthContext.Provider>
  )
  const view = render(tree('SUPER_ADMIN'), { wrapper })
  fireEvent.click(
    await screen.findByRole('button', { name: 'Rotar secreto de firma' }),
  )
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Confirmar generación única',
    }),
  )
  view.rerender(tree(null))
  await act(async () => pending.resolve(secret))
  expect(screen.queryByDisplayValue(secret.secret)).toBeNull()
})
