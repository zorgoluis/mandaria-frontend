import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { PublicTrackingScreen } from '../location/PublicTrackingScreen'
import { ApiError } from '../services/errors'
import { LocationSequence } from '../location/snapshot'
import type { LocationView } from '../location/types'
vi.mock('../location/LocationMap', () => ({
  LocationMap: ({ stale }: { stale: boolean }) => (
    <div data-testid="map">{stale ? 'stale map' : 'recent map'}</div>
  ),
}))
const now = Date.parse('2026-10-12T07:00:00Z')
function view(): LocationView {
  return {
    publicId: 'MDR-SYNTHETIC',
    progress: {
      publicVersion: '1',
      status: 'ASSIGNED',
      trackingMode: 'DETAILED',
      assignmentState: 'ACTIVE',
      phase: 'TO_DROPOFF',
      attentionRequired: false,
      terminalOutcome: null,
    },
    location: {
      locationVersion: '1',
      assignmentGeneration: '1',
      availability: 'AVAILABLE',
      unavailableReason: null,
      sample: {
        latitude: 17.02,
        longitude: -93.37,
        accuracyMeters: 5,
        capturedAt: new Date(now).toISOString(),
        receivedAt: new Date(now).toISOString(),
        freshUntil: new Date(now + 60000).toISOString(),
        eraseAfter: new Date(now + 600000).toISOString(),
      },
    },
    observation: {
      evaluatedAt: new Date(now).toISOString(),
      freshness: 'RECENT',
    },
  }
}
it('renders only authorized public information, freshness and expandable details', () => {
  const v = view(),
    r = render(
      <MemoryRouter>
        <PublicTrackingScreen view={v} now={now} />
      </MemoryRouter>,
    )
  expect(screen.getByText('En camino al destino')).toBeInTheDocument()
  expect(screen.getByText('17.02, -93.37')).toBeInTheDocument()
  expect(screen.getByText('Señal reciente')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Ver detalles/ }))
  expect(
    screen.getByRole('button', { name: /Ocultar detalles/ }),
  ).toHaveAttribute('aria-expanded', 'true')
  r.rerender(
    <MemoryRouter>
      <PublicTrackingScreen view={v} now={now + 60001} />
    </MemoryRouter>,
  )
  expect(screen.getByText('Señal desactualizada')).toBeInTheDocument()
  expect(screen.getByTestId('map')).toHaveTextContent('stale map')
  r.rerender(
    <MemoryRouter>
      <PublicTrackingScreen view={v} now={now + 600000} />
    </MemoryRouter>,
  )
  expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  expect(screen.queryByText('17.02, -93.37')).not.toBeInTheDocument()
})
it.each(['terminal', 'incident', 'transfer', 'before-pickup'] as const)(
  'withdraws public coordinates for %s including old snapshots',
  (reason) => {
    const sequence = new LocationSequence(),
      v = view(),
      r = render(
        <MemoryRouter>
          <PublicTrackingScreen view={sequence.accept(v)} now={now} />
        </MemoryRouter>,
      )
    const next = view()
    next.progress.publicVersion = '2'
    next.location.locationVersion = '2'
    if (reason === 'terminal')
      next.progress.terminalOutcome = {
        type: 'DELIVERED',
        occurredAt: new Date(now).toISOString(),
      }
    if (reason === 'incident') next.progress.attentionRequired = true
    if (reason === 'transfer') {
      next.location.assignmentGeneration = '2'
      next.location.sample = null
    }
    if (reason === 'before-pickup') next.progress.phase = 'TO_PICKUP'
    r.rerender(
      <MemoryRouter>
        <PublicTrackingScreen view={sequence.accept(next)} now={now} />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    expect(screen.queryByText('17.02, -93.37')).not.toBeInTheDocument()
    r.rerender(
      <MemoryRouter>
        <PublicTrackingScreen view={sequence.accept(v)} now={now} />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    if (reason === 'terminal')
      expect(screen.getByText('Entregado')).toBeInTheDocument()
  },
)
it.each([401, 403, 404, 410])(
  'unavailable link %s removes map and location',
  (status) => {
    render(
      <MemoryRouter>
        <PublicTrackingScreen
          view={view()}
          now={now}
          error={new ApiError(status, 'Synthetic')}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('Este enlace ya no está disponible'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    expect(screen.queryByText('17.02, -93.37')).not.toBeInTheDocument()
  },
)
it('does not describe a network failure as a revoked link', () => {
  render(
    <MemoryRouter>
      <PublicTrackingScreen
        view={view()}
        now={now}
        error={new Error('offline')}
      />
    </MemoryRouter>,
  )
  expect(
    screen.getByText('Seguimiento temporalmente no disponible'),
  ).toBeInTheDocument()
  expect(
    screen.queryByText('Este enlace ya no está disponible'),
  ).not.toBeInTheDocument()
})
