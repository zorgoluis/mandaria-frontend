import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { LocationCard } from '../location/components'
import { env } from '../config/env'
import { LocationSequence } from '../location/snapshot'
import type { LocationView } from '../location/types'
import type { MapsSdk } from '../location/googleMaps'
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  subscribe: vi.fn(() => () => {}),
}))
vi.mock('../location/googleMaps', () => ({
  loadMaps: mocks.load,
  onMapsFailure: mocks.subscribe,
}))
const time = Date.now()
function view(): LocationView {
  return {
    publicId: 'MDR-TEST',
    progress: {
      publicVersion: '1',
      status: 'ASSIGNED',
      trackingMode: 'DETAILED',
      assignmentState: 'ACTIVE',
      phase: 'PICKED_UP',
      attentionRequired: false,
      terminalOutcome: null,
    },
    location: {
      locationVersion: '1',
      assignmentGeneration: '1',
      availability: 'AVAILABLE',
      unavailableReason: null,
      sample: {
        latitude: 17,
        longitude: -93,
        accuracyMeters: 12,
        capturedAt: new Date(time).toISOString(),
        receivedAt: new Date(time).toISOString(),
        freshUntil: new Date(time + 60000).toISOString(),
        eraseAfter: new Date(time + 600000).toISOString(),
      },
    },
    observation: {
      evaluatedAt: new Date(time).toISOString(),
      freshness: 'RECENT',
    },
  }
}
const center = vi.fn(),
  detach = vi.fn(),
  update = vi.fn(),
  unbind = vi.fn(),
  clear = vi.fn()
const mapCtor = vi.fn(),
  circleCtor = vi.fn()
const sdk: MapsSdk = {
  Map: class {
    constructor(...args: unknown[]) {
      mapCtor(...args)
    }
    setCenter = center
    unbindAll = unbind
  },
  Circle: class {
    constructor(...args: unknown[]) {
      circleCtor(...args)
    }
    setOptions = update
    setMap = detach
    unbindAll = unbind
  },
  event: { clearInstanceListeners: clear },
}
const original = env.googleMapsApiKey
beforeEach(() => {
  vi.clearAllMocks()
  env.googleMapsApiKey = 'synthetic-web-key'
  mocks.load.mockResolvedValue(sdk)
})
afterEach(() => {
  env.googleMapsApiKey = original
})
it('retains one map, updates point/accuracy/freshness; clears overlays and listeners on unmount', async () => {
  const v = view()
  const r = render(<LocationCard view={v} now={time} />)
  await waitFor(() => expect(mapCtor).toHaveBeenCalledTimes(1))
  const next = view()
  next.location.sample!.latitude = 18
  next.location.sample!.accuracyMeters = 40
  r.rerender(<LocationCard view={next} now={time + 61000} />)
  expect(mapCtor).toHaveBeenCalledTimes(1)
  expect(center).toHaveBeenLastCalledWith({ lat: 18, lng: -93 })
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ radius: 40, fillColor: '#936214' }),
  )
  r.unmount()
  expect(detach).toHaveBeenCalledTimes(2)
  expect(detach).toHaveBeenCalledWith(null)
  expect(clear).toHaveBeenCalledTimes(3)
})
it.each(['incident', 'terminal', 'expiry', 'transfer'] as const)(
  'removes map for %s and cannot reuse earlier snapshot',
  async (reason) => {
    const sequence = new LocationSequence()
    const v = sequence.accept(view())
    const r = render(<LocationCard view={v} now={time} />)
    await waitFor(() => expect(mapCtor).toHaveBeenCalledTimes(1))
    const next = view()
    next.progress.publicVersion = '2'
    next.location.locationVersion = '2'
    if (reason === 'incident') next.progress.attentionRequired = true
    if (reason === 'terminal')
      next.progress.terminalOutcome = {
        type: 'DELIVERED',
        occurredAt: new Date(time).toISOString(),
      }
    if (reason === 'transfer') {
      next.location.assignmentGeneration = '2'
      next.location.sample = null
      next.location.availability = 'UNAVAILABLE'
    }
    r.rerender(
      <LocationCard
        view={sequence.accept(next)}
        now={reason === 'expiry' ? time + 600000 : time}
      />,
    )
    expect(
      screen.queryByLabelText('Mapa de la última posición autorizada'),
    ).not.toBeInTheDocument()
    expect(detach).toHaveBeenCalledWith(null)
    r.rerender(
      <LocationCard
        view={sequence.accept(view())}
        now={reason === 'expiry' ? time + 600000 : time}
      />,
    )
    expect(mapCtor).toHaveBeenCalledTimes(1)
  },
)
it('does not construct after SDK resolves following withdrawal', async () => {
  let resolve!: (sdk: MapsSdk) => void
  mocks.load.mockReturnValue(
    new Promise<MapsSdk>((r) => {
      resolve = r
    }),
  )
  const r = render(<LocationCard view={view()} now={time} />)
  r.unmount()
  await act(async () => resolve(sdk))
  expect(mapCtor).not.toHaveBeenCalled()
})
it('uses newest authorized sample when SDK arrives slowly', async () => {
  let resolve!: (sdk: MapsSdk) => void
  mocks.load.mockReturnValue(
    new Promise<MapsSdk>((r) => {
      resolve = r
    }),
  )
  const r = render(<LocationCard view={view()} now={time} />)
  const next = view()
  next.location.sample!.latitude = 19
  r.rerender(<LocationCard view={next} now={time} />)
  await act(async () => resolve(sdk))
  expect(center).toHaveBeenLastCalledWith({ lat: 19, lng: -93 })
})
it('keeps text without a key and never loads SDK', () => {
  env.googleMapsApiKey = ''
  render(<LocationCard view={view()} now={time} />)
  expect(mocks.load).not.toHaveBeenCalled()
  expect(screen.getByText('17, -93')).toBeVisible()
  expect(screen.getByText(/Mapa no disponible/)).toBeVisible()
})
it('keeps text after blocked SDK and authentication failure', async () => {
  mocks.load.mockRejectedValue(new Error('blocked'))
  render(<LocationCard view={view()} now={time} />)
  await screen.findByText(/Mapa no disponible/)
  expect(screen.getByText('17, -93')).toBeVisible()
})
