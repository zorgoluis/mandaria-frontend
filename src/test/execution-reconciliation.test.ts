import { beforeEach, expect, it, vi } from 'vitest'
import { ApiError } from '../services/errors'
import {
  detailFixture,
  executionFixture,
  incidentFixture,
} from './execution-fixture'

const mocks = vi.hoisted(() => ({
  command: vi.fn(),
  attempt: vi.fn(),
  detail: vi.fn(),
  incident: vi.fn(),
  history: vi.fn(),
}))
vi.mock('../execution/service', () => ({ executionApi: mocks }))
vi.mock('../delivery-assignments/service', () => ({
  adminAssignments: { history: mocks.history },
}))
const assignmentId = executionFixture.activeAssignmentId!
const command = {
  actor: 'original-admin',
  dispatchId: 'dispatch',
  path: '/admin/dispatches/dispatch/custody-incidents/incident/resolve',
  body: {
    assignmentId,
    expectedRevision: 4,
    type: 'TRANSFER',
    reason: 'Private reason must not persist',
    occurredAt: '2026-10-03T12:00:00Z',
    confirmationMethod: 'PHONE',
    releasingCustodianConfirmed: true,
    receivingCustodianConfirmed: true,
    atCurrentStageLocation: true,
    recipient: {
      mode: 'INDEPENDENT',
      driverId: 'driver-private',
      vehicleId: 'vehicle-private',
    },
  },
  label: 'Transferencia',
}
const reload = async () => {
  vi.resetModules()
  return import('../execution/commands')
}
async function startLostResponse(type = 'TRANSFER') {
  const runtime = await reload()
  await runtime.runCommand(
    type === 'TRANSFER'
      ? command
      : {
          ...command,
          body: {
            assignmentId,
            expectedRevision: 4,
            type: 'RETURN_TO_ORIGIN',
            reason: 'Private reason',
            occurredAt: '2026-10-03T12:00:00Z',
            confirmationMethod: 'PHONE',
            custodianConfirmed: true,
            originConfirmed: true,
            originContactLabel: 'Private contact',
            originContactRole: 'Encargado',
          },
        },
  )
  const store = await import('../execution/reconciliation-store')
  const marker = store.readResolutionMarkers().markers[0]
  expect(marker).toBeDefined()
  return marker
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  mocks.attempt.mockResolvedValue({
    state: 'PENDING_OR_UNKNOWN',
    resolutionId: null,
    canStartNewAttempt: false,
  })
  mocks.command.mockRejectedValue(new ApiError(0, 'Timeout'))
  mocks.detail.mockResolvedValue({
    ...detailFixture,
    execution: {
      ...executionFixture,
      openIncidentId: 'incident',
      allowedActions: ['RESOLVE_INCIDENT'],
    },
  })
  mocks.incident.mockResolvedValue(incidentFixture)
  mocks.history.mockResolvedValue([
    { id: assignmentId, dispatchId: 'dispatch', status: 'ACTIVE' },
  ])
})
function applied(type: 'TRANSFER' | 'RETURN_TO_ORIGIN') {
  mocks.attempt.mockResolvedValue({
    state: 'APPLIED',
    resolutionId: 'resolution',
    canStartNewAttempt: false,
  })
  const transfer = type === 'TRANSFER'
  mocks.incident.mockResolvedValue({
    ...incidentFixture,
    incident: {
      ...incidentFixture.incident,
      resolvedAt: '2026-10-03T12:00:00Z',
    },
    resolution: {
      id: 'resolution',
      type,
      actorUserId: 'original-admin',
      fromAssignmentId: assignmentId,
      toAssignmentId: transfer ? 'target' : null,
      confirmations: { expectedRevision: 4 },
    },
  })
  mocks.history.mockResolvedValue([
    {
      id: assignmentId,
      dispatchId: 'dispatch',
      status: transfer ? 'TRANSFERRED' : 'RETURNED',
    },
    ...(transfer
      ? [{ id: 'target', dispatchId: 'dispatch', status: 'ACTIVE' }]
      : []),
  ])
  const page = {
    execution: {
      ...executionFixture,
      revision: 5,
      openIncidentId: null,
      activeAssignmentId: transfer ? 'target' : null,
      custodyStatus: transfer ? 'HELD' : 'RETURNED',
    },
    events: {
      items: [
        {
          kind: transfer ? 'TRANSFER' : 'RETURN',
          revision: 5,
          assignmentId: transfer ? 'target' : assignmentId,
          actorUserId: 'original-admin',
          source: 'ADMIN_RESOLUTION',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  }
  mocks.detail.mockResolvedValue(page)
  return page
}
it.each(['TRANSFER', 'RETURN_TO_ORIGIN'] as const)(
  'after reload verifies applied %s using all four reads and sends no POST',
  async (type) => {
    const marker = await startLostResponse(type)
    applied(type)
    const runtime = await reload()
    await runtime.reconcileCommand(marker.key, 'original-admin', 'SUPER_ADMIN')
    const store = await import('../execution/reconciliation-store')
    expect(store.readResolutionMarkers().markers).toEqual([])
    expect(mocks.command).toHaveBeenCalledOnce()
    expect(mocks.incident).toHaveBeenCalledTimes(2)
    expect(mocks.detail).toHaveBeenCalledTimes(2)
    expect(mocks.history).toHaveBeenCalledWith('dispatch')
  },
)
it('after reload an unapplied operation remains blocked: open reads cannot prove no request is in flight', async () => {
  const marker = await startLostResponse()
  const runtime = await reload()
  await runtime.reconcileCommand(marker.key, 'original-admin', 'SUPER_ADMIN')
  await runtime.runCommand({
    ...command,
    body: { ...command.body, expectedRevision: 6 },
  })
  const store = await import('../execution/reconciliation-store')
  expect(store.resolutionBlocked('dispatch', 'incident')).toBe(true)
  expect(mocks.command).toHaveBeenCalledOnce()
})
it.each(['network', 'inconsistent', 'missing-event', 'changing-revision'])(
  'after reload %s stays pending without replay',
  async (failure) => {
    const marker = await startLostResponse()
    const page = applied('TRANSFER')
    if (failure === 'network')
      mocks.incident.mockRejectedValue(new ApiError(0, 'offline'))
    if (failure === 'inconsistent')
      mocks.history.mockResolvedValue([
        { id: assignmentId, dispatchId: 'dispatch', status: 'ACTIVE' },
      ])
    if (failure === 'missing-event')
      mocks.detail.mockResolvedValue({
        execution: {
          ...executionFixture,
          revision: 5,
          activeAssignmentId: 'target',
        },
        events: { items: [], total: 0, totalPages: 0 },
      })
    if (failure === 'changing-revision')
      mocks.detail
        .mockResolvedValue({
          ...page,
          execution: { ...page.execution, revision: 6 },
        })
        .mockResolvedValueOnce(page)
    const runtime = await reload()
    await runtime.reconcileCommand(marker.key, 'original-admin', 'SUPER_ADMIN')
    expect(
      (
        await import('../execution/reconciliation-store')
      ).readResolutionMarkers().markers,
    ).toHaveLength(1)
    expect(mocks.command).toHaveBeenCalledOnce()
  },
)
it('change of user cannot read/replay the previous intent or bypass its incident lock', async () => {
  const marker = await startLostResponse()
  const runtime = await reload()
  await runtime.reconcileCommand(marker.key, 'different-admin', 'SUPER_ADMIN')
  await runtime.retryCommand(marker.key, 'different-admin')
  await runtime.runCommand({ ...command, actor: 'different-admin' })
  expect(mocks.incident).not.toHaveBeenCalled()
  expect(mocks.detail).not.toHaveBeenCalled()
  expect(mocks.command).toHaveBeenCalledOnce()
  expect(
    (await import('../execution/reconciliation-store')).resolutionBlocked(
      'dispatch',
      'incident',
    ),
  ).toBe(true)
})
it('durable marker is written before POST and contains no payload or credentials', async () => {
  mocks.command.mockImplementation(async () => {
    const serialized = JSON.stringify(localStorage)
    expect(serialized).toContain('incident')
    expect(serialized).not.toMatch(
      /Private|reason|originContact|recipient|driver-private|token|password|secret/i,
    )
    throw new Error('Lost response')
  })
  const marker = await startLostResponse()
  expect(Object.keys(marker).sort()).toEqual([
    'actor',
    'assignmentId',
    'dispatchId',
    'expectedRevision',
    'incidentId',
    'key',
    'type',
  ])
})
it('storage failure sends no resolution', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked')
  })
  await (await reload()).runCommand(command)
  expect(mocks.command).not.toHaveBeenCalled()
})
it('exact replay is available only while the original body is still in memory', async () => {
  const marker = await startLostResponse()
  const runtime = await reload()
  await runtime.retryCommand(marker.key, 'original-admin')
  expect(mocks.command).toHaveBeenCalledOnce()
})
it('stops a reconciliation when the user changes during its first read', async () => {
  const marker = await startLostResponse()
  const page = applied('TRANSFER')
  let authorized = true
  mocks.detail.mockImplementation(async () => {
    authorized = false
    return page
  })
  const runtime = await reload()
  await runtime.reconcileCommand(
    marker.key,
    'original-admin',
    'SUPER_ADMIN',
    () => authorized,
  )
  expect(mocks.incident).not.toHaveBeenCalled()
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
})
it('finds a resolution on a later history page without inventing an event', async () => {
  const marker = await startLostResponse()
  const page = applied('TRANSFER')
  mocks.detail.mockImplementation(async (_scope, index) => ({
    ...page,
    events: {
      ...page.events,
      items: index === 2 ? page.events.items : [],
      total: 21,
      totalPages: 2,
      page: index,
    },
  }))
  const runtime = await reload()
  await runtime.reconcileCommand(marker.key, 'original-admin', 'SUPER_ADMIN')
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toEqual([])
  expect(mocks.detail).toHaveBeenCalledWith(
    { surface: 'admin', dispatchId: 'dispatch' },
    2,
  )
  expect(mocks.command).toHaveBeenCalledOnce()
})
it('a corrupt durable marker fails closed rather than silently enabling resolution', async () => {
  const runtime = await reload()
  const store = await import('../execution/reconciliation-store')
  localStorage.setItem(store.reconciliationStorageKey, 'corrupt')
  await runtime.runCommand(command)
  expect(store.resolutionBlocked('dispatch', 'incident')).toBe(true)
  expect(mocks.command).not.toHaveBeenCalled()
})
it('close wins: closed key unlocks only a fresh explicit form, never replays resolution', async () => {
  const marker = await startLostResponse()
  mocks.attempt.mockResolvedValue({
    state: 'CLOSED_NO_EFFECTS',
    resolutionId: null,
    canStartNewAttempt: true,
  })
  const runtime = await reload()
  await runtime.reconcileCommand(
    marker.key,
    marker.actor,
    'SUPER_ADMIN',
    () => true,
    true,
  )
  expect(mocks.attempt).toHaveBeenCalledWith(
    'dispatch',
    'incident',
    marker.key,
    true,
  )
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toEqual([])
  expect(mocks.command).toHaveBeenCalledOnce()
})
it('resolution wins against close: verifies APPLIED receipt and history without another resolution', async () => {
  const marker = await startLostResponse()
  applied('TRANSFER')
  await (
    await reload()
  ).reconcileCommand(marker.key, marker.actor, 'SUPER_ADMIN', () => true, true)
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toEqual([])
  expect(mocks.history).toHaveBeenCalledOnce()
  expect(mocks.command).toHaveBeenCalledOnce()
})
it('lost close response survives reload; only explicit GET can establish closure', async () => {
  const marker = await startLostResponse()
  mocks.attempt.mockRejectedValueOnce(new ApiError(0, 'timeout'))
  await (
    await reload()
  ).reconcileCommand(marker.key, marker.actor, 'SUPER_ADMIN', () => true, true)
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
  mocks.attempt.mockResolvedValue({
    state: 'CLOSED_NO_EFFECTS',
    resolutionId: null,
    canStartNewAttempt: true,
  })
  await (
    await reload()
  ).reconcileCommand(marker.key, marker.actor, 'SUPER_ADMIN')
  expect(mocks.attempt).toHaveBeenLastCalledWith(
    'dispatch',
    'incident',
    marker.key,
    false,
  )
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toEqual([])
  expect(mocks.command).toHaveBeenCalledOnce()
})
it.each(['PROVIDER_ADMIN', 'DRIVER'])(
  'denies attempt close for %s',
  async (role) => {
    const marker = await startLostResponse()
    await (
      await reload()
    ).reconcileCommand(marker.key, marker.actor, role, () => true, true)
    expect(mocks.attempt).not.toHaveBeenCalled()
  },
)
it('another administrator cannot close the original key', async () => {
  const marker = await startLostResponse()
  await (
    await reload()
  ).reconcileCommand(marker.key, 'other-admin', 'SUPER_ADMIN', () => true, true)
  expect(mocks.attempt).not.toHaveBeenCalled()
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
})
it('CLOSED_NO_EFFECTS without permission and an open incident remains blocked', async () => {
  const marker = await startLostResponse()
  mocks.attempt.mockResolvedValue({
    state: 'CLOSED_NO_EFFECTS',
    resolutionId: null,
    canStartNewAttempt: false,
  })
  await (
    await reload()
  ).reconcileCommand(marker.key, marker.actor, 'SUPER_ADMIN')
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
})
it('APPLIED requires the exact receipt resolution, not a different audited resolution', async () => {
  const marker = await startLostResponse()
  applied('TRANSFER')
  mocks.attempt.mockResolvedValue({
    state: 'APPLIED',
    resolutionId: 'different-resolution',
    canStartNewAttempt: false,
  })
  await (
    await reload()
  ).reconcileCommand(marker.key, marker.actor, 'SUPER_ADMIN')
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
})
it('double close is single-flight and identity change keeps the durable lock', async () => {
  const marker = await startLostResponse()
  let resolve!: (v: unknown) => void
  let authorized = true
  mocks.attempt.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  const runtime = await reload()
  const first = runtime.reconcileCommand(
    marker.key,
    marker.actor,
    'SUPER_ADMIN',
    () => authorized,
    true,
  )
  await runtime.reconcileCommand(
    marker.key,
    marker.actor,
    'SUPER_ADMIN',
    () => authorized,
    true,
  )
  expect(mocks.attempt).toHaveBeenCalledOnce()
  authorized = false
  resolve({
    state: 'CLOSED_NO_EFFECTS',
    resolutionId: null,
    canStartNewAttempt: true,
  })
  await first
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
})
it('late original rejected EXECUTION_ATTEMPT_CLOSED keeps marker until receipt lookup', async () => {
  const marker = await startLostResponse()
  mocks.command.mockRejectedValue(
    new ApiError(409, 'Closed', 'EXECUTION_ATTEMPT_CLOSED'),
  )
  const runtime = await import('../execution/commands')
  await runtime.retryCommand(marker.key, marker.actor)
  expect(
    (await import('../execution/reconciliation-store')).readResolutionMarkers()
      .markers,
  ).toHaveLength(1)
  expect(mocks.command).toHaveBeenCalledTimes(2)
  expect(mocks.attempt).not.toHaveBeenCalled()
})
