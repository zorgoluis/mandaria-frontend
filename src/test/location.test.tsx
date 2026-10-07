import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthState } from '../auth/context'
import {
  LocationCard,
  SharedTracking,
  OwnerLocation,
} from '../location/components'
import { TrackingLinks } from '../location/TrackingLinks'
import { LocationSequence, usableSample } from '../location/snapshot'
import { captureTrackingFragment } from '../location/fragment'
import { pollDelay } from '../location/poll'
import { locationService, sharedLocation } from '../location/service'
import { addLinkMarker, linkMarkers, markerStorage } from '../location/markers'
import { ApiError } from '../services/errors'
import type {
  LocationView,
  LinkMetadata,
  LinkMarker,
  LinkAttempt,
} from '../location/types'
const time = Date.parse('2026-10-07T00:00:00Z')
const iso = (offset: number) => new Date(time + offset).toISOString()
const view = (): LocationView => ({
  publicId: 'MDR-000001',
  progress: {
    publicVersion: '9007199254740993',
    status: 'ASSIGNED',
    trackingMode: 'DETAILED',
    assignmentState: 'ACTIVE',
    phase: 'TO_DROPOFF',
    attentionRequired: false,
    terminalOutcome: null,
  },
  location: {
    locationVersion: '9007199254740993',
    assignmentGeneration: '8',
    availability: 'AVAILABLE',
    unavailableReason: null,
    sample: {
      latitude: 17.02,
      longitude: -93.37,
      accuracyMeters: 12,
      capturedAt: iso(0),
      receivedAt: iso(1000),
      freshUntil: iso(60000),
      eraseAfter: iso(600000),
    },
  },
  observation: { evaluatedAt: iso(1000), freshness: 'RECENT' },
})
const meta: LinkMetadata = {
  linkRevision: '1',
  linkId: null,
  status: 'NONE',
  createdAt: null,
  expiresAt: null,
  terminalAccessUntil: null,
}
const marker: LinkMarker = {
  actor: 'A',
  publicId: 'MDR-000001',
  operation: 'ISSUE',
  key: '11111111-1111-4111-8111-111111111111',
  expectedLinkRevision: '1',
}
const token = `${'a'.repeat(22)}.${'b'.repeat(43)}`
const url = `https://mandaria.com.mx/track#t=${token}`
const session = (id = 'A') => ({ user: { id, role: 'CUSTOMER' } }) as AuthState
function owner(id = 'A') {
  return (
    <AuthContext.Provider value={session(id)}>
      <TrackingLinks publicId="MDR-000001" terminal={false} />
    </AuthContext.Provider>
  )
}
beforeEach(() => {
  vi.spyOn(locationService, 'metadata').mockResolvedValue(meta)
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (
        _name: string,
        _opts: unknown,
        f: (l: object) => Promise<void>,
      ) => f({}),
    },
  })
})
afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})
it('freshness boundary and local expiry never invent a sample', () => {
  const v = view()
  const r = render(<LocationCard view={v} now={time + 60000} />)
  expect(screen.getByText('Reciente')).toBeInTheDocument()
  r.rerender(<LocationCard view={v} now={time + 60001} />)
  expect(screen.getByText('Desactualizada')).toBeInTheDocument()
  r.rerender(<LocationCard view={v} now={time + 600000} />)
  expect(screen.queryByText('17.02, -93.37')).toBeNull()
})
it.each(['incident', 'terminal', 'legacy', 'none', 'offer'])(
  'hides GPS for %s',
  (kind) => {
    const v = view()
    if (kind === 'incident') v.progress.attentionRequired = true
    if (kind === 'terminal')
      v.progress.terminalOutcome = { type: 'DELIVERED', occurredAt: iso(0) }
    if (kind === 'legacy') v.progress.trackingMode = 'LEGACY'
    if (kind === 'none') v.progress.assignmentState = 'NONE'
    if (kind === 'offer') v.progress.phase = null
    expect(usableSample(v, time + 1000)).toBeNull()
  },
)
it('recipient waits for PICKED_UP while owner can see TO_PICKUP', () => {
  const v = view()
  v.progress.phase = 'TO_PICKUP'
  expect(usableSample(v, time + 1000)).not.toBeNull()
  expect(usableSample(v, time + 1000, true)).toBeNull()
})
it('BigInt ordering, transfer watermark and crossed snapshots never restore old GPS', () => {
  const seq = new LocationSequence(),
    a = view()
  seq.accept(a)
  const b = view()
  b.progress.publicVersion = '9007199254740994'
  b.location.locationVersion = '9007199254740994'
  b.location.assignmentGeneration = '9'
  b.location.sample = null
  b.location.availability = 'UNAVAILABLE'
  seq.accept(b)
  expect(seq.accept(a).location.sample).toBeNull()
  const crossed = view()
  crossed.progress.publicVersion = '9007199254740995'
  crossed.location.assignmentGeneration = '10'
  seq.accept(crossed)
  expect(seq.accept(b).location.sample).toBeNull()
  const terminal = view()
  terminal.progress.publicVersion = '9007199254740996'
  terminal.location.locationVersion = '9007199254740996'
  terminal.location.assignmentGeneration = '11'
  terminal.progress.terminalOutcome = { type: 'DELIVERED', occurredAt: iso(0) }
  terminal.location.sample = null
  seq.accept(terminal)
  expect(seq.accept(a).progress.terminalOutcome).not.toBeNull()
})
it('poll respects jitter, capped backoff and Retry-After', () => {
  expect(pollDelay(0, 0, 0)).toBe(15000)
  expect(pollDelay(3, 0, 0)).toBe(120000)
  expect(pollDelay(8, 600000, 0)).toBe(600000)
})
it('poll has no overlapping reads, expires locally and revalidates on foreground', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(time + 1000)
  const v = view()
  const read = vi.spyOn(locationService, 'view').mockResolvedValue(v)
  const r = render(<OwnerLocation publicId="MDR-000001" stop={false} />)
  await act(async () => {})
  expect(read).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'hidden',
  })
  fireEvent(document, new Event('visibilitychange'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(610000)
  })
  expect(screen.queryByText('17.02, -93.37')).toBeNull()
  expect(read).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
  fireEvent(document, new Event('visibilitychange'))
  await act(async () => {})
  expect(read).toHaveBeenCalledTimes(2)
  expect(screen.queryByText('17.02, -93.37')).toBeNull()
  r.unmount()
})
it('shared transport uses constant URL, Tracking header and no JWT/refresh/storage', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(view()), { status: 200 }))
  await sharedLocation(token, new AbortController().signal)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe(
    'http://localhost:3000/api/v1/shared/delivery-tracking',
  )
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { Authorization: `Tracking ${token}` },
  })
  expect(localStorage.length).toBe(0)
  expect(sessionStorage.length).toBe(0)
})
it('invalid link401 never refreshes human session; Retry-After is preserved', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '600' } }),
    )
  await expect(
    sharedLocation(token, new AbortController().signal),
  ).rejects.toMatchObject({ status: 429, retryAfterMs: 600000 })
  fetcher.mockResolvedValue(new Response('', { status: 401 }))
  await expect(
    sharedLocation(token, new AbortController().signal),
  ).rejects.toMatchObject({ status: 401 })
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('fragment removed; reload requires original link and no secret is stored', () => {
  window.history.replaceState(null, '', `/track#t=${token}`)
  captureTrackingFragment()
  expect(window.location.hash).toBe('')
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
  const r = render(
    <MemoryRouter>
      <SharedTracking />
    </MemoryRouter>,
  )
  r.unmount()
  render(
    <MemoryRouter>
      <SharedTracking />
    </MemoryRouter>,
  )
  expect(screen.getByText(/Abre el enlace original/)).toBeInTheDocument()
  expect(localStorage.length).toBe(0)
})
it('one-time emission remains memory-only and disappears on close/user change', async () => {
  vi.spyOn(locationService, 'mutate').mockResolvedValue({
    ...meta,
    linkRevision: '2',
    secretAvailable: true,
    url,
  })
  vi.mocked(locationService.metadata).mockResolvedValue({
    ...meta,
    linkRevision: '2',
  })
  const r = render(owner())
  await screen.findByText('Sin enlace')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Emitir o sustituir enlace' }),
  )
  expect(await screen.findByLabelText('Enlace temporal generado')).toHaveValue(
    url,
  )
  await waitFor(() => expect(linkMarkers()).toHaveLength(0))
  expect(localStorage.getItem(markerStorage)).not.toContain(token)
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar enlace' }))
  expect(screen.queryByLabelText('Enlace temporal generado')).toBeNull()
  r.rerender(owner('B'))
  expect(screen.queryByLabelText('Enlace temporal generado')).toBeNull()
})
it('double click and lost emission preserve only the minimal marker after remount', async () => {
  const mutate = vi
    .spyOn(locationService, 'mutate')
    .mockRejectedValue(new ApiError(0, 'network'))
  const r = render(owner())
  await screen.findByText('Sin enlace')
  fireEvent.click(screen.getByRole('checkbox'))
  const button = screen.getByRole('button', {
    name: 'Emitir o sustituir enlace',
  })
  fireEvent.click(button)
  fireEvent.click(button)
  await screen.findByText(/Respuesta no confirmada/)
  expect(mutate).toHaveBeenCalledTimes(1)
  expect(Object.keys(linkMarkers()[0]).sort()).toEqual([
    'actor',
    'expectedLinkRevision',
    'key',
    'operation',
    'publicId',
  ])
  r.unmount()
  render(owner())
  await screen.findByText('Sin enlace')
  expect(
    screen.getByRole('button', { name: 'Emitir o sustituir enlace' }),
  ).toBeDisabled()
  expect(mutate).toHaveBeenCalledTimes(1)
})
it.each<LinkAttempt['state']>([
  'APPLIED_SECRET_UNAVAILABLE',
  'APPLIED_REVOKED',
  'PENDING_OR_UNKNOWN',
  'SUPERSEDED',
])(
  'reconciles %s with current metadata and no automatic mutation',
  async (state) => {
    addLinkMarker(marker)
    vi.spyOn(locationService, 'attempt').mockResolvedValue({
      state,
      linkRevision: '1',
      currentLinkId: null,
      secretAvailable: false,
    })
    const mutate = vi.spyOn(locationService, 'mutate')
    render(owner())
    await screen.findByText('Sin enlace')
    fireEvent.click(
      screen.getByRole('button', { name: 'Consultar estado e intentos' }),
    )
    await waitFor(() => expect(locationService.attempt).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Consultar estado e intentos' }),
      ).not.toBeDisabled(),
    )
    expect(linkMarkers()).toHaveLength(state === 'PENDING_OR_UNKNOWN' ? 1 : 0)
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Enlace temporal generado')).toBeNull()
  },
)
it('technical revoke uses new UUID/current revision; timeout blocks another revoke until GET', async () => {
  addLinkMarker(marker)
  vi.spyOn(locationService, 'mutate').mockRejectedValue(
    new ApiError(0, 'timeout'),
  )
  vi.mocked(locationService.metadata).mockResolvedValue({
    ...meta,
    linkRevision: '3',
  })
  render(owner())
  await screen.findByText('Sin enlace')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: /Revocar enlace/ }))
  await screen.findByText(/Respuesta no confirmada/)
  const sent = vi.mocked(locationService.mutate).mock.calls[0][0]
  expect(sent).toMatchObject({ operation: 'REVOKE', expectedLinkRevision: '3' })
  expect(sent.key).not.toBe(marker.key)
  expect(linkMarkers()).toHaveLength(2)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByRole('button', { name: /Revocar enlace/ })).toBeDisabled()
})
it('foreign actor cannot query/close pending attempts', async () => {
  addLinkMarker(marker)
  const query = vi.spyOn(locationService, 'attempt')
  render(owner('B'))
  expect(
    screen.getByText(/intento pendiente de otra cuenta/),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Consultar estado e intentos' }),
  ).toBeNull()
  expect(query).not.toHaveBeenCalled()
})
it('late emission response cannot show secret after unmount', async () => {
  let resolve!: (
    v: LinkMetadata & { url: string; secretAvailable: boolean },
  ) => void
  vi.spyOn(locationService, 'mutate').mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const r = render(owner())
  await screen.findByText('Sin enlace')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Emitir o sustituir enlace' }),
  )
  r.unmount()
  await act(async () => resolve({ ...meta, url, secretAvailable: true }))
  expect(linkMarkers()).toHaveLength(1)
  expect(localStorage.getItem(markerStorage)).not.toContain(token)
})
it('fresh server status withdraws older owner coordinates before GPS poll returns', async () => {
  vi.spyOn(locationService, 'view').mockResolvedValue(view())
  const r = render(
    <OwnerLocation
      publicId="MDR-000001"
      stop={false}
      publicVersion="9007199254740994"
    />,
  )
  expect(await screen.findByText(/El servicio cambió/)).toBeInTheDocument()
  expect(screen.queryByText('17.02, -93.37')).toBeNull()
  r.rerender(<OwnerLocation publicId="MDR-000001" stop={false} attention />)
  expect(
    screen.getByText(/Requiere atención operativa. Ubicación retirada/),
  ).toBeInTheDocument()
})
it('terminal response stops polling and never displays its coordinates', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(time + 1000)
  const v = view()
  v.progress.terminalOutcome = { type: 'DELIVERED', occurredAt: iso(0) }
  const read = vi.spyOn(locationService, 'view').mockResolvedValue(v)
  render(<OwnerLocation publicId="MDR-000001" stop={false} />)
  await act(async () => {})
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000)
  })
  expect(read).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('17.02, -93.37')).toBeNull()
})
it('shared page accepts a freshly reopened hash in the same document', async () => {
  window.history.replaceState(null, '', '/track')
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
  render(
    <MemoryRouter>
      <SharedTracking />
    </MemoryRouter>,
  )
  expect(screen.getByText(/Abre el enlace original/)).toBeInTheDocument()
  await act(async () => {
    window.history.replaceState(null, '', `/track#t=${token}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(window.location.hash).toBe('')
  expect(screen.queryByText(/Abre el enlace original/)).toBeNull()
})
it('409 retains marker, disables mutation and requires fresh metadata/decision', async () => {
  vi.spyOn(locationService, 'mutate').mockRejectedValue(
    new ApiError(409, 'conflict', 'LINK_REVISION_CONFLICT'),
  )
  render(owner())
  await screen.findByText('Sin enlace')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Emitir o sustituir enlace' }),
  )
  await screen.findByText(/Conflicto de revisión/)
  expect(linkMarkers()).toHaveLength(1)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByRole('button', { name: /Revocar enlace/ })).toBeDisabled()
})
it('unknown attempt state fails closed and preserves the marker', async () => {
  addLinkMarker(marker)
  vi.spyOn(locationService, 'attempt').mockResolvedValue(
    JSON.parse('{"state":"CLOSED_NO_EFFECTS","linkRevision":"1"}'),
  )
  render(owner())
  await screen.findByText('Sin enlace')
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar estado e intentos' }),
  )
  await screen.findByText(/No se confirmó el resultado/)
  expect(linkMarkers()).toHaveLength(1)
})
it('attempt route uses original UUID, operation and revision; mutation never posts to close', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          state: 'PENDING_OR_UNKNOWN',
          linkRevision: '1',
          currentLinkId: null,
          secretAvailable: false,
        }),
        { status: 200 },
      ),
    )
  await locationService.attempt(marker)
  expect(fetcher.mock.calls[0][0]).toBe(
    'http://localhost:3000/api/v1/customer/delivery-requests/MDR-000001/tracking-link/attempt?operation=ISSUE&expectedLinkRevision=1',
  )
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    method: 'GET',
    headers: { 'Idempotency-Key': marker.key },
  })
  expect(fetcher.mock.calls[0][1]?.body).toBeUndefined()
  fetcher.mockResolvedValue(new Response(JSON.stringify(meta), { status: 200 }))
  await locationService.mutate({ ...marker, operation: 'REVOKE' })
  expect(fetcher.mock.calls[1][0]).toMatch(/tracking-link\/revoke$/)
  expect(fetcher.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    body: '{"expectedLinkRevision":"1"}',
    headers: { 'Idempotency-Key': marker.key },
  })
})
it('no location or link management for administrative roles', () => {
  render(
    <AuthContext.Provider
      value={{ user: { id: 'SA', role: 'SUPER_ADMIN' } } as AuthState}
    >
      <TrackingLinks publicId="MDR-000001" terminal={false} />
    </AuthContext.Provider>,
  )
  expect(screen.queryByText('Compartir seguimiento')).toBeNull()
})
