import { afterEach, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SearchStatus } from '../dispatch/SearchStatus'
import {
  dispatchPollInterval,
  searchAllowsTake,
  type DispatchSearch,
} from '../dispatch/search'

const search: DispatchSearch = {
  state: 'SEARCHING',
  attempt: 2,
  maxAttempts: 5,
  windowExpiresAt: '2026-10-10T18:10:00Z',
  stoppedReason: null,
}
afterEach(() => vi.useRealTimers())

it('never advances or exhausts a round on the local clock, including the fifth', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-10T18:09:59Z'))
  const { rerender } = render(
    <SearchStatus search={{ ...search, attempt: 5 }} />,
  )
  expect(screen.getByText(/Ventana vigente: 0:01/)).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(120_000))
  expect(
    screen.getByText('Buscando repartidor — intento 5 de 5'),
  ).toBeInTheDocument()
  expect(
    screen.getByText(/el contador no confirma el cierre/),
  ).toBeInTheDocument()
  expect(screen.queryByText(/No se encontró ejecutor/)).toBeNull()
  rerender(
    <SearchStatus
      search={{
        ...search,
        state: 'EXHAUSTED',
        attempt: 5,
        stoppedReason: 'EXHAUSTED',
      }}
    />,
  )
  expect(screen.getByText(/No se encontró ejecutor/)).toBeInTheDocument()
  expect(screen.queryByText(/pago devuelto|comida cancelada/i)).toBeNull()
})

it('waits for the backend round and window, then shows its exact new values', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-10T18:11:00Z'))
  const { rerender } = render(
    <SearchStatus search={{ ...search, state: 'RETRY_PENDING' }} />,
  )
  expect(
    screen.getByText(/Esperando reintento automático — intento 2 de 5/),
  ).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(600_000))
  expect(screen.queryByText(/intento 3 de 5/)).toBeNull()
  rerender(
    <SearchStatus
      search={{
        ...search,
        attempt: 3,
        windowExpiresAt: '2026-10-10T18:31:00Z',
      }}
    />,
  )
  // Timer resumes after a pending state, using current time on the next tick.
  act(() => vi.advanceTimersByTime(1000))
  expect(screen.getByText(/intento 3 de 5/)).toBeInTheDocument()
  expect(screen.getByText(/Ventana vigente: 9:59/)).toBeInTheDocument()
})

it.each([
  ['CANCELLED', 'REQUEST_CANCELLED', /Búsqueda cancelada/],
  ['EXECUTOR_FOUND', 'EXECUTOR_FOUND', /hubo una toma/],
  ['STOPPED', 'SERVICE_UNAVAILABLE', /servicio no disponible/],
  ['STOPPED', 'INTEGRATION_UNAVAILABLE', /integración no disponible/],
] as const)(
  'renders server state %s without countdown or financial conclusions',
  (state, stoppedReason, text) => {
    render(<SearchStatus search={{ ...search, state, stoppedReason }} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(
      screen.queryByText(/Ventana vigente|pago devuelto|comida cancelada/i),
    ).toBeNull()
  },
)

it('leaves legacy unchanged when search is absent and does not reactivate retries after release', () => {
  const { container } = render(<SearchStatus />)
  expect(container).toBeEmptyDOMElement()
  expect(searchAllowsTake(undefined)).toBe(true)
  expect(searchAllowsTake({ ...search, state: 'RETRY_PENDING' }, 0)).toBe(false)
  expect(searchAllowsTake({ ...search, state: 'EXECUTOR_FOUND' }, 0)).toBe(true)
  expect(
    searchAllowsTake(
      { ...search, state: 'EXECUTOR_FOUND' },
      Date.parse(search.windowExpiresAt),
    ),
  ).toBe(false)
})

it('slows polling after errors, including rate limiting, without changing search', () => {
  expect(
    dispatchPollInterval({ state: { error: null, fetchFailureCount: 0 } }),
  ).toBe(15_000)
  expect(
    dispatchPollInterval({
      state: { error: new Error('429'), fetchFailureCount: 1 },
    }),
  ).toBe(60_000)
  expect(
    dispatchPollInterval({
      state: { error: new Error('network'), fetchFailureCount: 8 },
    }),
  ).toBe(120_000)
})
