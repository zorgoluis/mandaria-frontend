import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OriginContact } from '../customer/OriginContact'
const mocks = vi.hoisted(() => ({ profile: vi.fn(), actor: 'customer-a' }))
vi.mock('../customer/service', () => ({ customer: { profile: mocks.profile } }))
vi.mock('../auth/context', () => ({
  useAuth: () => ({ user: { id: mocks.actor } }),
}))
const profile = {
  displayName: 'Solicitante sintético',
  active: true,
  type: 'PERSONAL',
  businessName: null,
  revision: 1,
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = () => (
    <QueryClientProvider client={client}>
      <OriginContact key={mocks.actor} />
    </QueryClientProvider>
  )
  return { ...render(view()), view, client }
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.actor = 'customer-a'
  mocks.profile.mockResolvedValue(profile)
})
it('automatically prefills the profile name without a button and keeps both fields editable', async () => {
  mount()
  await waitFor(() =>
    expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
      profile.displayName,
    ),
  )
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Teléfono de origen')).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Contacto de origen'), {
    target: { value: 'Otra persona' },
  })
  fireEvent.change(screen.getByLabelText('Teléfono de origen'), {
    target: { value: '9615550011' },
  })
  expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
    'Otra persona',
  )
  expect(screen.getByLabelText('Teléfono de origen')).toHaveValue('9615550011')
  expect(localStorage.length).toBe(0)
})
it.each(['Manual', ''])(
  'preserves edits while response is pending: %s',
  async (value) => {
    let done!: (data: typeof profile) => void
    mocks.profile.mockReturnValue(
      new Promise((r) => {
        done = r
      }),
    )
    mount()
    fireEvent.change(screen.getByLabelText('Contacto de origen'), {
      target: { value: 'Primero' },
    })
    fireEvent.change(screen.getByLabelText('Contacto de origen'), {
      target: { value },
    })
    await act(async () => done(profile))
    expect(screen.getByLabelText('Contacto de origen')).toHaveValue(value)
    expect(mocks.profile).toHaveBeenCalledTimes(1)
  },
)
it('keeps manual entry on profile failure', async () => {
  mocks.profile.mockRejectedValue(new Error('unavailable'))
  mount()
  expect(await screen.findByRole('status')).toHaveTextContent('manualmente')
  expect(screen.getByLabelText('Contacto de origen')).toBeEnabled()
})
it('isolates profile responses after changing user', async () => {
  let done!: (data: typeof profile) => void
  mocks.profile
    .mockReturnValueOnce(
      new Promise((r) => {
        done = r
      }),
    )
    .mockResolvedValueOnce({ ...profile, displayName: 'Cliente B' })
  const ui = mount()
  mocks.actor = 'customer-b'
  ui.rerender(ui.view())
  await act(async () => done(profile))
  await waitFor(() =>
    expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
      'Cliente B',
    ),
  )
})

it('retains edited name after a profile refresh', async () => {
  const ui = mount()
  await waitFor(() =>
    expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
      profile.displayName,
    ),
  )
  fireEvent.change(screen.getByLabelText('Contacto de origen'), {
    target: { value: 'Nombre editado' },
  })
  await act(async () => {
    await ui.client.invalidateQueries({
      queryKey: ['customer', mocks.actor, 'profile'],
    })
  })
  expect(screen.getByLabelText('Contacto de origen')).toHaveValue(
    'Nombre editado',
  )
})
