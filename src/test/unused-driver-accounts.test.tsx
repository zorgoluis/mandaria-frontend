import { beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../auth/context'
import { IndependentDriversPage } from '../independent-drivers/pages'
import { independentDrivers } from '../independent-drivers/service'
import { unusedDriverAccounts } from '../independent-drivers/unused-accounts-service'
import { ApiError } from '../services/errors'
import type { Role } from '../types/api'
import type { UnusedDriverAccount } from '../independent-drivers/types'
import { unusedAccount, unusedPage } from './unused-driver-accounts-fixtures'

let account: UnusedDriverAccount
const stamp = '2026-11-17T18:00:00.000Z'
beforeEach(() => {
  account = unusedAccount()
  vi.spyOn(independentDrivers, 'list').mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  vi.spyOn(unusedDriverAccounts, 'list').mockImplementation(async () =>
    unusedPage([account]),
  )
  vi.spyOn(unusedDriverAccounts, 'get').mockImplementation(async () => ({
    ...account,
  }))
  vi.spyOn(unusedDriverAccounts, 'deactivate').mockImplementation(
    async (userId, input) => {
      account = {
        ...account,
        active: false,
        canDeactivate: false,
        deactivatedAt: stamp,
        blockReason: 'ACCOUNT_ALREADY_DISABLED',
      }
      return {
        userId,
        active: false,
        requestId: input.requestId,
        deactivatedAt: stamp,
      }
    },
  )
})

function mount(
  path = '/independent-drivers?view=unused',
  role: Role = 'SUPER_ADMIN',
  active = true,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id: 'admin-synthetic',
      email: 'admin@example.invalid',
      role,
      active,
      createdAt: '',
      updatedAt: '',
      emailVerifiedAt: null,
    },
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[path]}>
          <IndependentDriversPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return client
}
async function openDialog() {
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('button', { name: /^Dar de baja a/ }),
  )
  const dialog = within(await screen.findByRole('dialog'))
  await dialog.findByLabelText('Motivo de baja')
  return { user, dialog }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('keeps habilitations intact and only queries unused accounts after selecting that tab', async () => {
  mount('/independent-drivers?status=APPROVED&q=Mariana&page=2')
  await screen.findByText('No hay repartidores independientes.')
  expect(unusedDriverAccounts.list).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('link', { name: 'Sin servicios' }))
  await screen.findByText('Mariana Sintética')
  expect(independentDrivers.list).toHaveBeenCalledWith(
    { page: 2, pageSize: 20, status: 'APPROVED', search: 'Mariana' },
    expect.any(AbortSignal),
  )
  expect(unusedDriverAccounts.list).toHaveBeenLastCalledWith(
    { page: 1, pageSize: 20, search: undefined, accountStatus: 'ACTIVE' },
    expect.any(AbortSignal),
  )
  expect(
    screen.getByRole('link', { name: 'Habilitaciones' }).getAttribute('href'),
  ).toContain('status=APPROVED')
})

it('includes an incomplete account without inventing a driver or profile', async () => {
  account = unusedAccount({
    name: null,
    driverId: null,
    driverStatus: null,
    independentProfileId: null,
    independentProfileStatus: null,
    category: 'NONE',
  })
  mount()
  expect(await screen.findByText('Registro sin nombre')).toBeVisible()
  expect(screen.getByText('Sin perfil independiente')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Ver perfil' })).toBeNull()
  expect(
    screen.getByText(/Nunca han tomado ni realizado un servicio/),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: /^Dar de baja a/ })).toBeEnabled()
})

it.each(['DRIVER', 'CUSTOMER', 'PROVIDER_ADMIN'] as const)(
  'does not load accounts for %s',
  (role) => {
    mount(undefined, role)
    expect(unusedDriverAccounts.list).not.toHaveBeenCalled()
    expect(unusedDriverAccounts.deactivate).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Sin servicios' })).toBeNull()
  },
)
it('does not load accounts for an inactive administrator', () => {
  mount(undefined, 'SUPER_ADMIN', false)
  expect(unusedDriverAccounts.list).not.toHaveBeenCalled()
})

it('sends trimmed search, status and pagination to the backend without filtering locally', async () => {
  vi.mocked(unusedDriverAccounts.list).mockImplementation(async (filters) =>
    unusedPage([account], filters.page, 60),
  )
  mount('/independent-drivers?view=unused&unusedPage=3')
  const user = userEvent.setup()
  await screen.findByText('Mariana Sintética')
  await user.type(
    screen.getByRole('searchbox'),
    '  synthetic@example.invalid  ',
  )
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() =>
    expect(unusedDriverAccounts.list).toHaveBeenLastCalledWith(
      {
        page: 1,
        pageSize: 20,
        search: 'synthetic@example.invalid',
        accountStatus: 'ACTIVE',
      },
      expect.any(AbortSignal),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
  await waitFor(() =>
    expect(unusedDriverAccounts.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.any(AbortSignal),
    ),
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Filtrar cuentas por acceso' }),
    'DISABLED',
  )
  await waitFor(() =>
    expect(unusedDriverAccounts.list).toHaveBeenLastCalledWith(
      {
        page: 1,
        pageSize: 20,
        search: 'synthetic@example.invalid',
        accountStatus: 'DISABLED',
      },
      expect.any(AbortSignal),
    ),
  )
})

it.each([400, 404])(
  'explains an older backend (%s) without falling back or enabling changes',
  async (status) => {
    vi.mocked(unusedDriverAccounts.list).mockRejectedValue(
      new ApiError(status, 'Unavailable'),
    )
    mount()
    expect(
      await screen.findByText(/Este listado requiere actualizar Mandaria/),
    ).toBeVisible()
    expect(independentDrivers.list).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^Dar de baja a/ })).toBeNull()
  },
)

it('does not infer eligibility if the backend omits it', async () => {
  delete (account as Partial<UnusedDriverAccount>).canDeactivate
  mount()
  expect(
    await screen.findByRole('button', { name: /^Dar de baja a/ }),
  ).toBeDisabled()
})

it('requires a reason and confirms the backend result, without an optimistic deletion', async () => {
  const response =
    deferred<Awaited<ReturnType<typeof unusedDriverAccounts.deactivate>>>()
  vi.mocked(unusedDriverAccounts.deactivate).mockReturnValue(response.promise)
  mount()
  const { user, dialog } = await openDialog()
  expect(dialog.getByText(account.email)).toBeVisible()
  expect(dialog.getByRole('button', { name: 'Confirmar baja' })).toBeDisabled()
  await user.type(
    dialog.getByLabelText('Motivo de baja'),
    '  Registro abandonado  ',
  )
  await user.click(dialog.getByRole('button', { name: 'Confirmar baja' }))
  await waitFor(() =>
    expect(unusedDriverAccounts.deactivate).toHaveBeenCalledTimes(1),
  )
  const input = vi.mocked(unusedDriverAccounts.deactivate).mock.calls[0][1]
  expect(input).toEqual({
    requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    expectedUpdatedAt: account.updatedAt,
    reason: 'Registro abandonado',
  })
  expect(unusedDriverAccounts.get).toHaveBeenCalledTimes(2)
  expect(screen.queryByText('La cuenta está dada de baja.')).toBeNull()
  await act(async () =>
    response.resolve({
      userId: account.userId,
      active: false,
      requestId: input.requestId,
      deactivatedAt: stamp,
    }),
  )
  expect(await screen.findByText('La cuenta está dada de baja.')).toBeVisible()
  expect(unusedDriverAccounts.deactivate).toHaveBeenCalledTimes(1)
})

it('does not deactivate after cancelling the individual confirmation', async () => {
  mount()
  const { user, dialog } = await openDialog()
  await user.click(dialog.getByRole('button', { name: 'Cancelar' }))
  expect(unusedDriverAccounts.deactivate).not.toHaveBeenCalled()
})

it('blocks a service taken between the list and final confirmation', async () => {
  mount()
  const { user, dialog } = await openDialog()
  await user.type(
    dialog.getByLabelText('Motivo de baja'),
    'Registro abandonado',
  )
  account = {
    ...account,
    hasServiceActivity: true,
    canDeactivate: false,
    blockReason: 'ACCOUNT_HAS_SERVICE_ACTIVITY',
  }
  await user.click(dialog.getByRole('button', { name: 'Confirmar baja' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /ya tiene actividad en servicios/,
  )
  expect(unusedDriverAccounts.deactivate).not.toHaveBeenCalled()
  expect(screen.queryByText('La cuenta está dada de baja.')).toBeNull()
})

it('keeps a conflict returned by the mutation and refreshes the current state', async () => {
  vi.mocked(unusedDriverAccounts.deactivate).mockImplementation(async () => {
    account = {
      ...account,
      hasServiceActivity: true,
      canDeactivate: false,
      blockReason: 'ACCOUNT_HAS_SERVICE_ACTIVITY',
    }
    throw new ApiError(
      409,
      'La cuenta ya tiene actividad en servicios.',
      'ACCOUNT_HAS_SERVICE_ACTIVITY',
    )
  })
  mount()
  const { user, dialog } = await openDialog()
  await user.type(
    dialog.getByLabelText('Motivo de baja'),
    'Registro abandonado',
  )
  await user.click(dialog.getByRole('button', { name: 'Confirmar baja' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'La cuenta ya tiene actividad en servicios.',
  )
  expect(dialog.getByRole('button', { name: 'Confirmar baja' })).toBeDisabled()
  expect(screen.queryByText('La cuenta está dada de baja.')).toBeNull()
  expect(unusedDriverAccounts.deactivate).toHaveBeenCalledTimes(1)
})

it('verifies a lost response with GET only and never automatically repeats the command', async () => {
  vi.mocked(unusedDriverAccounts.deactivate).mockRejectedValue(
    new ApiError(0, 'lost'),
  )
  mount()
  const { user, dialog } = await openDialog()
  await user.type(
    dialog.getByLabelText('Motivo de baja'),
    'Registro abandonado',
  )
  await user.click(dialog.getByRole('button', { name: 'Confirmar baja' }))
  expect(
    await screen.findByText(/No pudimos confirmar el resultado/),
  ).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Confirmar baja' })).toBeNull()
  await user.click(dialog.getByRole('button', { name: 'Consultar estado' }))
  expect(
    await screen.findByText(
      'La última consulta todavía muestra la cuenta activa.',
    ),
  ).toBeVisible()
  expect(screen.queryByText('La cuenta está dada de baja.')).toBeNull()
  account = {
    ...account,
    active: false,
    canDeactivate: false,
    deactivatedAt: stamp,
  }
  await user.click(dialog.getByRole('button', { name: 'Consultar estado' }))
  expect(await screen.findByText('La cuenta está dada de baja.')).toBeVisible()
  expect(unusedDriverAccounts.deactivate).toHaveBeenCalledTimes(1)
})

it('blocks actions while a delayed list refetch is pending', async () => {
  mount()
  await screen.findByText('Mariana Sintética')
  const response = deferred<ReturnType<typeof unusedPage>>()
  vi.mocked(unusedDriverAccounts.list).mockReturnValueOnce(response.promise)
  await userEvent.click(
    screen.getByRole('button', { name: 'Actualizar listado' }),
  )
  expect(screen.getByRole('button', { name: /^Dar de baja a/ })).toBeDisabled()
  await act(async () => response.resolve(unusedPage([account])))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /^Dar de baja a/ }),
    ).toBeEnabled(),
  )
})
