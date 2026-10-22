import { beforeEach, expect, it, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { OperationalReview } from '../deletion/operational-review'
import { ObjectReviews, OperationalStatus } from '../deletion/operational'
import { reviewResult } from '../deletion/operational-contract'
import {
  known,
  snapshot,
  type Snapshot,
  type Restriction,
} from '../deletion/contract'
import { commandReceipt } from '../deletion/receipt'
import { deletion } from '../deletion/service'
import { readMarkers } from '../deletion/pending'
import { useRead } from '../deletion/hooks'
import { validReviewAt } from '../deletion/operational-contract'
import { ApiError } from '../services/errors'
import {
  operationalFixture as s,
  operationalItem as item,
  restrictionTask as task,
  secondGate,
  restrictionPresentation,
  restrictionReviewNow,
} from './deletion-v2-fixtures'
import { date } from '../utils/format'
import { actor, resource, caseId } from './verification-fixtures'
import type { Role } from '../types/api'
vi.mock('../deletion/service', () => ({ deletion: { command: vi.fn() } }))
const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
function mount(node: ReactNode, role: Role = 'SUPER_ADMIN', id = actor) {
  const q = client()
  const result = render(
    <QueryClientProvider client={q}>
      <AuthContext.Provider
        value={{
          user: {
            id,
            email: 'synthetic@example.test',
            role,
            active: true,
            emailVerifiedAt: '',
            createdAt: '',
            updatedAt: '',
          },
          loading: false,
          expired: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          restore: vi.fn(),
        }}
      >
        <MemoryRouter>{node}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return { q, ...result }
}
function review(
  data: Snapshot = { ...s, authorizationState: 'BLOCKED' },
  t = task,
  role: Role = 'SUPER_ADMIN',
  id = actor,
) {
  return mount(
    <OperationalReview data={data} items={[item]} tasks={[t]} stale={false} />,
    role,
    id,
  )
}
function fill(decision = 'RELEASE') {
  fireEvent.change(screen.getByLabelText('Decisión operativa V2'), {
    target: { value: 'REVIEW_RESTRICTION' },
  })
  fireEvent.change(screen.getByLabelText('Referencia UUID de evidencia V2'), {
    target: { value: caseId },
  })
  fireEvent.change(screen.getByLabelText('Revisión asignada'), {
    target: { value: task.id },
  })
  fireEvent.change(screen.getByLabelText('Restricción concreta'), {
    target: { value: resource },
  })
  fireEvent.change(screen.getByLabelText('Decisión sobre esta restricción'), {
    target: { value: decision },
  })
  fireEvent.change(screen.getByLabelText('Motivo concreto'), {
    target: { value: 'Motivo sintético de revisión individual' },
  })
}
async function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Revisar actuación V2' }))
  await screen.findByRole('dialog')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar actuación V2' }),
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(deletion.command).mockResolvedValue({ ...s, revision: 4 })
})
it.each([
  [
    'BLOCKED',
    'AUTHORIZATION_UNDER_REVIEW',
    'Limpieza cancelada; autorización de limpieza bloqueada',
  ],
  [
    'BLOCKED',
    'RESTRICTIONS_UNDER_REVIEW',
    'Limpieza cancelada; autorización de limpieza bloqueada',
  ],
  ['BLOCKED', null, 'Limpieza cancelada; autorización de limpieza bloqueada'],
  [
    'BLOCKED',
    'FUTURE_REASON',
    'Limpieza cancelada; autorización de limpieza bloqueada',
  ],
  [
    'TERMINATED',
    'RESTRICTIONS_UNDER_REVIEW',
    'Limpieza cancelada; restricciones en revisión',
  ],
  [
    'TERMINATED',
    null,
    'Limpieza cancelada; consulta el estado de las restricciones',
  ],
  [
    'TERMINATED',
    'FUTURE_REASON',
    'Limpieza cancelada; consulta el estado de las restricciones',
  ],
  [
    'TERMINATED',
    'AUTHORIZATION_UNDER_REVIEW',
    'Limpieza cancelada; consulta el estado de las restricciones',
  ],
] as const)(
  'CANCELLED %s / %s presents only accredited context',
  (authorizationState, blockingReason, text) => {
    render(
      <OperationalStatus
        data={{ ...s, status: 'CANCELLED', authorizationState, blockingReason }}
      />,
    )
    expect(screen.getByText(text, { exact: true })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      'revisión de restricciones completada',
    )
  },
)
function presentation(t = restrictionPresentation) {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(restrictionReviewNow))
  return review({ ...s, status: 'CANCELLED', authorizationState: 'BLOCKED' }, t)
}
const gateView = (index: number) =>
  within(
    screen.getByRole('region', {
      name: 'Restricción ' + restrictionPresentation.restrictions![index].id,
    }),
  )
it('active DRIVER without a decision is Conductor, with task state separately reported', () => {
  presentation()
  const g = gateView(0)
  expect(g.getByText('Conductor', { exact: true })).toBeInTheDocument()
  expect(g.getByText('Activa', { exact: true })).toBeInTheDocument()
  expect(
    g.getByText('Restricción activa; no consta una decisión de revisión'),
  ).toBeInTheDocument()
  expect(g.getAllByText('No informada')).toHaveLength(2)
  expect(screen.getByText('Responsabilidad registrada')).toBeInTheDocument()
  expect(g.queryByText(/Independiente|Flotilla/)).not.toBeInTheDocument()
  expect(
    screen.getByText(/Pueden existir otras restricciones/),
  ).toBeInTheDocument()
  expect(document.body).not.toHaveTextContent(
    'Persisten restricciones de otros procesos',
  )
})
it('KEEP is a recorded decision with its own future date while the task remains acknowledged', () => {
  presentation()
  const g = gateView(1)
  expect(g.getByText('Se mantiene esta restricción')).toBeInTheDocument()
  expect(g.getByText('Activa', { exact: true })).toBeInTheDocument()
  expect(
    g.getByText(date(restrictionPresentation.restrictions![1].reviewDueAt)),
  ).toBeInTheDocument()
  expect(
    g.getByText('Conservación sintética con seguimiento'),
  ).toBeInTheDocument()
  expect(g.queryByText(/sin revisar|no consta/i)).not.toBeInTheDocument()
  expect(screen.getByText('Responsabilidad registrada')).toBeInTheDocument()
})
it('RELEASE does not enable the account or replace another active restriction', () => {
  presentation()
  const g = gateView(2)
  expect(g.getByText('Inactiva', { exact: true })).toBeInTheDocument()
  expect(
    g.getByText(
      'Restricción retirada. Esto no habilita automáticamente la cuenta',
    ),
  ).toBeInTheDocument()
  expect(g.getByText('No informada')).toBeInTheDocument()
  expect(gateView(0).getByText('Activa', { exact: true })).toBeInTheDocument()
  expect(deletion.command).not.toHaveBeenCalled()
})
it('expired KEEP remains active and recorded, with a past due date instead of a future promise', () => {
  presentation()
  const g = gateView(3)
  expect(g.getByText('Se mantiene esta restricción')).toBeInTheDocument()
  expect(g.getByText('Activa', { exact: true })).toBeInTheDocument()
  expect(g.getByText('Revisión programada vencida')).toBeInTheDocument()
  expect(g.queryByText('Próxima revisión informada')).not.toBeInTheDocument()
  expect(
    g.getByText(/No acredita una revisión nueva ni cambia la restricción/),
  ).toBeInTheDocument()
  expect(deletion.command).not.toHaveBeenCalled()
})
it.each([
  { reviewDueAt: null },
  { reviewedAt: null },
  { reviewedAt: '2027-02-06T12:00:00.000Z' },
  { reviewReason: '   ' },
  { reviewDueAt: 'invalid-date' },
  { reviewDueAt: '2027-02-02T12:00:00.000Z' },
  { active: false },
] as Partial<Restriction>[])(
  'incomplete or contradictory review fields stay neutral: %j',
  (change) => {
    presentation({
      ...restrictionPresentation,
      restrictions: [
        { ...restrictionPresentation.restrictions![1], ...change },
      ],
    })
    expect(
      screen.getByText(
        'Los datos disponibles no permiten acreditar la última decisión de revisión',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Se mantiene esta restricción'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Restricción retirada\./)).not.toBeInTheDocument()
  },
)
it.each(['RESOLVED', 'PENDING', 'FUTURE_STATUS'])(
  'task %s never invents a gate decision or a global completion',
  (status) => {
    presentation({
      ...restrictionPresentation,
      status,
      restrictions: [restrictionPresentation.restrictions![0]],
    })
    expect(
      screen.getByText(
        status === 'RESOLVED'
          ? 'Resuelta'
          : status === 'PENDING'
            ? 'Pendiente'
            : 'Estado no reconocido',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Restricción activa; no consta una decisión de revisión',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/El estado de la tarea no acredita por sí solo/),
    ).toBeInTheDocument()
  },
)
it('unknown gate kind and inactive gate without review retain neutral presentation', () => {
  presentation({
    ...restrictionPresentation,
    restrictions: [
      {
        ...restrictionPresentation.restrictions![0],
        kind: 'FUTURE_KIND',
        active: false,
      },
    ],
  })
  expect(screen.getByText('Ámbito no reconocido')).toBeInTheDocument()
  expect(screen.getByText('Inactiva', { exact: true })).toBeInTheDocument()
  expect(
    screen.getByText('No consta una decisión de revisión'),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Restricción retirada\./)).not.toBeInTheDocument()
})
it('review presentation preserves available action values and stays disabled while stale', () => {
  const view = presentation()
  const values = () =>
    [
      ...(screen.getByLabelText('Decisión operativa V2') as HTMLSelectElement)
        .options,
    ].map((o) => o.value)
  expect(values()).toEqual([
    '',
    'REVIEW_RESTRICTION',
    'BLOCK_CLEANUP_AUTHORIZATION',
  ])
  view.unmount()
  mount(
    <OperationalReview
      data={{ ...s, status: 'CANCELLED', authorizationState: 'BLOCKED' }}
      tasks={[restrictionPresentation]}
      items={[item]}
      stale
    />,
  )
  expect(values()).toEqual([
    '',
    'REVIEW_RESTRICTION',
    'BLOCK_CLEANUP_AUTHORIZATION',
  ])
  expect(screen.getByLabelText('Decisión operativa V2')).toBeDisabled()
  expect(deletion.command).not.toHaveBeenCalled()
})
function Poll({ read }: { read: () => Promise<Snapshot> }) {
  const q = useRead('detail-v2-poll', read, true, true)
  return <p>{q.data?.status}</p>
}
it('polls pending V2 reads and stops on permission loss and unmount', async () => {
  vi.useFakeTimers()
  try {
    const read = vi
      .fn()
      .mockResolvedValueOnce(s)
      .mockRejectedValue(new ApiError(403, ''))
    const view = mount(<Poll read={read} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(read).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(read).toHaveBeenCalledTimes(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(read).toHaveBeenCalledTimes(2)
    view.unmount()
    await vi.advanceTimersByTimeAsync(60000)
    expect(read).toHaveBeenCalledTimes(2)
  } finally {
    vi.useRealTimers()
  }
})
it('unknown policy never starts polling', async () => {
  vi.useFakeTimers()
  try {
    const read = vi.fn().mockResolvedValue({ ...s, cleanupPolicy: 'UNKNOWN' })
    const view = mount(<Poll read={read} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90000)
    })
    expect(read).toHaveBeenCalledTimes(1)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})
it('review date validation preserves exact backend bound without generating calendar dates', () => {
  const now = Date.parse('2027-02-01T12:00:00Z')
  expect(validReviewAt('2027-02-01T12:00:00Z', now)).toBe(false)
  expect(validReviewAt('2027-03-03T12:00:00Z', now)).toBe(true)
  expect(validReviewAt('2027-03-03T12:00:01Z', now)).toBe(false)
  expect(validReviewAt('2027-02-02T12:00:00', now)).toBe(false)
})
it('watch end and budget exhausted are intervention, never renewed authorization', () => {
  render(
    <ObjectReviews
      items={[
        {
          ...item,
          watchUntil: '2020-01-01T00:00:00Z',
          attempts: 8,
          incidentCode: 'BUDGET_EXHAUSTED',
        },
      ]}
    />,
  )
  expect(
    screen.getByText(/fecha de fin de vigilancia ya pasó/),
  ).toBeInTheDocument()
  expect(screen.getByText(/No se ofrece un noveno intento/)).toBeInTheDocument()
  expect(
    screen.getByText('No concluyente o requiere intervención'),
  ).toBeInTheDocument()
})
it('separates scheduling from actual execution; no clock can complete a step', () => {
  render(
    <ObjectReviews
      items={[
        {
          ...item,
          lastReviewedAt: null,
          reviewStep: 0,
          nextReviewAt: '2020-01-01T00:00:00Z',
        },
      ]}
    />,
  )
  expect(
    screen.getByText('Programada; sin ejecución acreditada'),
  ).toBeInTheDocument()
  expect(screen.getByText(/fecha prevista ya pasó/)).toBeInTheDocument()
  expect(screen.getByText(/0 de 3/)).toBeInTheDocument()
  expect(
    screen.queryByText('Verificación final sin residuos detectados'),
  ).not.toBeInTheDocument()
})
it.each([
  'RESIDUE_AWAITING_REVIEW',
  'UNKNOWN',
  'ACCESS_DENIED',
  'CAPABILITY_UNKNOWN',
])('does not call %s clean', (incidentCode) => {
  expect(reviewResult({ ...item, incidentCode })).not.toContain('sin residuos')
})
it.each([false, true])(
  'preserves historical H with current incident=%s',
  (incidentPending) => {
    render(
      <OperationalStatus
        data={{ ...s, closedAt: '2027-02-02T12:00:00Z', incidentPending }}
      />,
    )
    expect(
      screen.getByText(/Se completaron las comprobaciones operativas/),
    ).toBeInTheDocument()
    expect(
      !!screen.queryByText(/incidencia actual que sigue en revisión/),
    ).toBe(incidentPending)
  },
)
it('historical administrative receipt strips V2 state and never replaces current incident', () => {
  const historical = commandReceipt(
    {
      status: 'APPLIED',
      requestId: s.id,
      key: resource,
      recordedAt: s.receivedAt,
      result: s,
    },
    s.id,
    resource,
  )
  expect(historical.result).not.toHaveProperty('incidentPending')
  expect(historical.result).not.toHaveProperty('cleanupPolicy')
  render(<OperationalStatus data={{ ...s, incidentPending: true }} />)
  expect(
    screen.getByText('Eliminación parcial; incidencia pendiente'),
  ).toBeInTheDocument()
})
it('cancelled request permits assigned review with current recovery contract, without new cleanup or restoration', () => {
  review({
    ...s,
    status: 'CANCELLED',
    authorizationState: 'TERMINATED',
    blockingReason: 'RESTRICTIONS_UNDER_REVIEW',
  })
  expect(screen.getByLabelText('Decisión operativa V2')).toBeEnabled()
  expect(
    screen.getByRole('option', { name: 'Revisar una restricción' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('option', { name: 'Autorizar una actuación puntual' }),
  ).not.toBeInTheDocument()
  expect(deletion.command).not.toHaveBeenCalled()
})
it.each([
  {
    authorizationState: 'BLOCKED',
    irreversibleStarted: false,
    text: 'Autorización bloqueada; identidad o alcance en revisión',
  },
  {
    authorizationState: 'BLOCKED',
    irreversibleStarted: true,
    text: 'Eliminación parcial; incidencia pendiente',
  },
  {
    authorizationState: 'ACTIVE',
    blockingReason: 'OBJECT_AUTHORIZATION_BLOCKED',
    incidentPending: true,
    text: 'Eliminación parcial; incidencia pendiente',
  },
])('renders invalidation without restoration: $text', ({ text, ...change }) => {
  render(<OperationalStatus data={{ ...s, ...change }} />)
  expect(screen.getByText(text)).toBeInTheDocument()
  expect(
    screen.getByText(/no reactiva la cuenta, restaura documentos/),
  ).toBeInTheDocument()
})
it('releases only selected restriction with captured body and minimal durable marker', async () => {
  const { q } = review()
  const invalidate = vi.spyOn(q, 'invalidateQueries')
  fill()
  await confirm()
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
  const [key, id, op, body] = vi.mocked(deletion.command).mock.calls[0]
  expect({ id, op, body }).toEqual({
    id: s.id,
    op: 'resolve',
    body: {
      action: 'REVIEW_RESTRICTION',
      expectedRevision: 3,
      gateId: resource,
      gateDecision: 'RELEASE',
      reason: 'Motivo sintético de revisión individual',
      evidenceRef: caseId,
    },
  })
  expect(JSON.stringify(body)).not.toContain(secondGate)
  expect(readMarkers()[0]).toMatchObject({ key, actor, op: 'resolve' })
  expect(JSON.stringify(readMarkers())).not.toContain('Motivo sintético')
  await waitFor(() => expect(invalidate).toHaveBeenCalled())
})
it('partial restriction review carries only its object id', async () => {
  review(s, { ...task, objectId: item.id })
  fill()
  await confirm()
  await waitFor(() => expect(deletion.command).toHaveBeenCalled())
  expect(vi.mocked(deletion.command).mock.calls[0][3]).toMatchObject({
    objectId: item.id,
    gateId: resource,
  })
})
it.each(['DRIVER', 'PROVIDER_ADMIN'] as Role[])(
  'no admin surface for %s',
  (role) => {
    review(s, task, role)
    expect(
      screen.queryByLabelText('Decisión operativa V2'),
    ).not.toBeInTheDocument()
  },
)
it('only assigned administrator can select review', () => {
  review(s, task, 'SUPER_ADMIN', secondGate)
  expect(
    screen.queryByRole('option', { name: 'Revisar una restricción' }),
  ).not.toBeInTheDocument()
})
it('KEEP requires reason and bounded future date without implicit reassignment', async () => {
  review()
  fill('KEEP')
  expect(screen.getByLabelText('Motivo concreto')).toBeRequired()
  const date = screen.getByLabelText(/Próxima revisión \(ISO/)
  expect(date).toBeRequired()
  fireEvent.change(date, { target: { value: '2020-01-01T00:00:00Z' } })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar actuación V2' }))
  expect(
    await screen.findByText(/Indica una revisión futura/),
  ).toBeInTheDocument()
  expect(deletion.command).not.toHaveBeenCalled()
})
it.each(['SCOPE_VERSION_CONFLICT', 'RESTRICTION_STILL_REQUIRED'])(
  'confirmed %s refreshes without replay',
  async (code) => {
    vi.mocked(deletion.command).mockRejectedValue(new ApiError(409, '', code))
    const { q } = review()
    const invalidate = vi.spyOn(q, 'invalidateQueries')
    fill()
    await confirm()
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    expect(deletion.command).toHaveBeenCalledTimes(1)
    expect(readMarkers()).toHaveLength(0)
  },
)
it('lost V2 response keeps original resolve marker without saving reason or replay', async () => {
  vi.mocked(deletion.command).mockRejectedValue(new ApiError(0, ''))
  review()
  fill()
  await confirm()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Confirmar actuación V2' }),
    ).toBeDisabled(),
  )
  expect(deletion.command).toHaveBeenCalledTimes(1)
  expect(readMarkers()[0]).toMatchObject({
    actor,
    op: 'resolve',
    id: s.id,
  })
  expect(readMarkers()[0]).not.toHaveProperty('accepted')
  expect(JSON.stringify(readMarkers())).not.toContain('reason')
})
it('exhausted original budget offers no point cleanup or ninth cycle', () => {
  mount(
    <OperationalReview
      data={s}
      tasks={[]}
      items={[{ ...item, attempts: 8 }]}
      stale={false}
    />,
  )
  expect(
    screen.queryByRole('option', { name: 'Autorizar una actuación puntual' }),
  ).not.toBeInTheDocument()
})
it('unknown policy/auth/state disable actions and missing optional dates do not invent dates', () => {
  expect(known({ ...s, cleanupPolicy: 'V9' })).toBe(false)
  expect(known({ ...s, authorizationState: 'FUTURE' })).toBe(false)
  expect(known({ ...s, status: 'FUTURE' })).toBe(false)
  render(
    <OperationalStatus
      data={{
        ...s,
        lastReviewAt: undefined,
        nextReviewAt: undefined,
        surveillanceEndsAt: undefined,
      }}
    />,
  )
  expect(screen.getAllByText(/No informado por el servidor/)).toHaveLength(3)
})
it('public projection excludes administrative objects, reasons and storage fields', () => {
  const p = snapshot({
    ...s,
    restrictions: [task],
    ownerId: actor,
    bucket: 'private',
    key: 'sensitive',
    currentMessage: 'signed URL should not render',
  })
  expect(p).not.toHaveProperty('restrictions')
  expect(p).not.toHaveProperty('ownerId')
  expect(p).not.toHaveProperty('bucket')
  expect(p).not.toHaveProperty('currentMessage')
  render(<OperationalStatus data={p} />)
  expect(document.body).not.toHaveTextContent('signed URL')
})
it.each(['', resource])(
  'explicit authorization block targets global or only selected object: %s',
  async (objectId) => {
    review(s)
    fireEvent.change(screen.getByLabelText('Decisión operativa V2'), {
      target: { value: 'BLOCK_CLEANUP_AUTHORIZATION' },
    })
    fireEvent.change(screen.getByLabelText('Referencia UUID de evidencia V2'), {
      target: { value: caseId },
    })
    fireEvent.change(screen.getByLabelText('Motivo concreto'), {
      target: { value: 'Revisión sintética del alcance' },
    })
    fireEvent.change(screen.getByLabelText('Alcance exacto de la actuación'), {
      target: { value: objectId },
    })
    await confirm()
    await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
    const body = vi.mocked(deletion.command).mock.calls[0][3]
    expect(body).toMatchObject({
      action: 'BLOCK_CLEANUP_AUTHORIZATION',
      expectedRevision: 3,
      evidenceRef: caseId,
    })
    if (objectId) expect(body).toHaveProperty('objectId', objectId)
    else expect(body).not.toHaveProperty('objectId')
    expect(body).not.toHaveProperty('active')
  },
)
it('point cleanup sends only existing object, reason and evidence with original revision', async () => {
  review(s)
  fireEvent.change(screen.getByLabelText('Decisión operativa V2'), {
    target: { value: 'AUTHORIZE_POINT_CLEANUP' },
  })
  fireEvent.change(screen.getByLabelText('Referencia UUID de evidencia V2'), {
    target: { value: caseId },
  })
  fireEvent.change(screen.getByLabelText('Motivo concreto'), {
    target: { value: 'Actuación puntual sintética' },
  })
  fireEvent.change(screen.getByLabelText('Alcance exacto de la actuación'), {
    target: { value: resource },
  })
  await confirm()
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
  expect(vi.mocked(deletion.command).mock.calls[0][3]).toEqual({
    action: 'AUTHORIZE_POINT_CLEANUP',
    expectedRevision: 3,
    evidenceRef: caseId,
    reason: 'Actuación puntual sintética',
    objectId: resource,
  })
})
it('explicit V1 adoption preserves dates and counters by not sending replacements', async () => {
  review({ ...s, cleanupPolicy: 'STRONG_WRITE_SEAL_V1' })
  fireEvent.change(screen.getByLabelText('Decisión operativa V2'), {
    target: { value: 'ADOPT_OPERATIONAL_POLICY' },
  })
  fireEvent.change(screen.getByLabelText('Referencia UUID de evidencia V2'), {
    target: { value: caseId },
  })
  await confirm()
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
  expect(vi.mocked(deletion.command).mock.calls[0][3]).toEqual({
    action: 'ADOPT_OPERATIONAL_POLICY',
    expectedRevision: 3,
    evidenceRef: caseId,
  })
})
it('KEEP sends assigned review and bounded date without changing owner or other gates', async () => {
  review()
  fill('KEEP')
  const date = new Date(Date.now() + 86400000).toISOString()
  fireEvent.change(screen.getByLabelText(/Próxima revisión \(ISO/), {
    target: { value: date },
  })
  await confirm()
  await waitFor(() => expect(deletion.command).toHaveBeenCalledTimes(1))
  const body = vi.mocked(deletion.command).mock.calls[0][3]
  expect(body).toMatchObject({
    gateId: resource,
    gateDecision: 'KEEP',
    reviewAt: date,
  })
  expect(body).not.toHaveProperty('ownerId')
  expect(JSON.stringify(body)).not.toContain(secondGate)
})
