import { Status } from '../deletion/pages'
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import {
  imageRetention,
  retentionMessage,
  utcDate,
} from '../deletion/image-retention'
import { ImageRetentionStatus } from '../deletion/ImageRetentionStatus'
import { snapshot, known, scopes, newer } from '../deletion/contract'
import { CaseRetention } from '../verification/retention'
import {
  runVerification,
  reconcile,
  readMarkers,
} from '../verification/pending'
import { verification } from '../verification/service'
import { deletion } from '../deletion/service'
import { ApiError } from '../services/errors'
import { deletionFixture } from './deletion-fixtures'
import { actor, caseId, resource, caseFixture } from './verification-fixtures'
import type { Role } from '../types/api'
vi.mock('../deletion/service', () => ({ deletion: { list: vi.fn() } }))
vi.mock('../verification/service', async (original) => ({
  ...(await original<typeof import('../verification/service')>()),
  verification: { command: vi.fn(), attempt: vi.fn(), get: vi.fn() },
}))
const calendar = {
  version: 1 as const,
  reason: 'DRAFT_ACTIVITY' as const,
  caseId,
  anchorAt: '2027-04-01T00:00:00.000Z',
  noticeAt: '2027-04-24T00:00:00.000Z',
  dueAt: '2027-05-01T00:00:00.000Z',
  noticeAcceptedAt: null,
}
const plan = {
  ...deletionFixture,
  id: resource,
  scope: 'IMAGE_RETENTION',
  status: 'INVENTORY',
  imageRetention: calendar,
  confirmedAt: null,
  irreversibleStarted: false,
  blockingReason: null,
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(deletion.list).mockResolvedValue([])
})
it('recognizes internal scope without allowing creation as a user request', () => {
  expect(known(snapshot(plan))).toBe(true)
  expect(Object.keys(scopes)).not.toContain('IMAGE_RETENTION')
})
it('projects backend dates without evidence UUIDs, object keys or transport fields', () => {
  const safe = imageRetention({
    ...calendar,
    evidenceRef: actor,
    objectKey: 'secret',
    privateReason: 'never display',
  })
  expect(safe).toEqual(calendar)
  expect(JSON.stringify(safe)).not.toContain('secret')
})
it.each([
  '2027-04-23T23:59:59.999Z',
  '2027-04-24T00:00:00.000Z',
  '2027-04-24T23:59:59.999Z',
  '2027-04-25T00:00:00.000Z',
  '2027-04-30T23:59:59.999Z',
  '2027-05-01T00:00:00.000Z',
  '2027-05-02T00:00:00.000Z',
])('clock at %s never changes the calendar or attests deletion', (now) => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(now))
  expect(retentionMessage(plan)).toContain('prevista')
  expect(snapshot(plan).imageRetention).toEqual(calendar)
  vi.restoreAllMocks()
})
it('renders an unequivocal UTC date across offset boundaries', () => {
  expect(utcDate('2027-04-23T18:00:00-06:00')).toBe('2027-04-24 00:00:00 UTC')
})
it.each([
  null,
  {},
  { ...calendar, noticeAt: 'tomorrow' },
  { ...calendar, noticeAcceptedAt: undefined },
])('rejects incomplete calendars without inventing dates', (p) => {
  expect(() => imageRetention(p)).toThrow()
})
it('mail acceptance is not delivery/read; no acceptance is not a fabricated failure', () => {
  const v = render(<ImageRetentionStatus data={plan} />)
  expect(screen.getByText(/Sin aceptación acreditada/)).toBeInTheDocument()
  v.rerender(
    <ImageRetentionStatus
      data={{
        ...plan,
        imageRetention: { ...calendar, noticeAcceptedAt: calendar.noticeAt },
      }}
    />,
  )
  expect(screen.getByText(/no acredita entrega ni lectura/)).toBeInTheDocument()
})
it('notice failure blocks automatic deletion without moving original dates', () => {
  const failed = {
    ...plan,
    status: 'MANUAL_REQUIRED',
    blockingReason: 'IMAGE_NOTICE_NOT_ACCEPTED_IN_WINDOW',
  }
  expect(retentionMessage(failed)).toContain('automática está bloqueada')
  expect(snapshot(failed).imageRetention).toEqual(calendar)
})
it('a current incident remains distinct from historical H and partial evidence', () => {
  expect(
    retentionMessage({
      ...plan,
      closedAt: calendar.dueAt,
      incidentPending: true,
    }),
  ).toContain('Incidencia actual')
  expect(
    retentionMessage({ ...plan, completedDocumentaryScopes: 1 }),
  ).toContain('límites')
  expect(retentionMessage({ ...plan, status: 'DELETING' })).toContain(
    'en curso o parcial',
  )
})
it('unknown calendar and exception validity are explicit; no browser reopening action', () => {
  render(
    <ImageRetentionStatus
      data={{ ...plan, status: 'PURGED', imageRetention: undefined }}
    />,
  )
  expect(screen.getByText(/Calendario no informado/)).toBeInTheDocument()
  expect(
    screen.getByText(/ni acredita la vigencia de excepciones/),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('keeps a newer snapshot when an older revision arrives', () => {
  const latest = { ...plan, revision: 10 }
  expect(newer(latest, { ...plan, revision: 9 })).toBe(latest)
})
function mount(
  role: Role = 'SUPER_ADMIN',
  record = { ...caseFixture, status: 'REJECTED' as const },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id: actor,
      email: 'synthetic@example.invalid',
      role,
      active: true,
      emailVerifiedAt: '2026-10-20T00:00:00Z',
      createdAt: '',
      updatedAt: '',
    },
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
  const tree = (r = record, a = auth) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={a}>
        <FeedbackProvider>
          <MemoryRouter>
            <CaseRetention key={a.user.id + ':' + r.id} record={r} />
          </MemoryRouter>
        </FeedbackProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
  return { ...render(tree()), tree, auth, client }
}
it.each(['DRIVER', 'PROVIDER_ADMIN'] as Role[])(
  'never loads admin inventory or exposes finality to %s',
  async (role) => {
    mount(role)
    expect(deletion.list).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Revisar rechazo definitivo' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/servicios comprometidos/)).toBeInTheDocument()
  },
)
it('requires explicit confirmation/evidence and exact revision for final rejection', async () => {
  vi.mocked(verification.command).mockResolvedValue({
    id: resource,
    status: 'INVENTORY',
    revision: 1,
  })
  mount()
  const review = await screen.findByRole('button', {
    name: 'Revisar rechazo definitivo',
  })
  await waitFor(() => expect(review).toBeEnabled())
  fireEvent.change(screen.getByLabelText(/Referencia UUID/), {
    target: { value: actor },
  })
  fireEvent.click(review)
  expect(verification.command).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar rechazo definitivo' }),
  )
  await waitFor(() => expect(verification.command).toHaveBeenCalledOnce())
  expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
    expectedVersion: caseFixture.revision,
    evidenceRef: actor,
  })
})
it('stale dialog cannot submit after case revision changes', async () => {
  const v = mount()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar rechazo definitivo' }),
    ).toBeEnabled(),
  )
  fireEvent.change(screen.getByLabelText(/Referencia UUID/), {
    target: { value: actor },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Revisar rechazo definitivo' }),
  )
  v.rerender(v.tree({ ...caseFixture, status: 'REJECTED', revision: 99 }))
  expect(
    screen.getByRole('button', { name: 'Confirmar rechazo definitivo' }),
  ).toBeDisabled()
  expect(verification.command).not.toHaveBeenCalled()
})
it('account switch clears the previous confirmation and inventory', async () => {
  const v = mount()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Revisar rechazo definitivo' }),
    ).toBeEnabled(),
  )
  fireEvent.change(screen.getByLabelText(/Referencia UUID/), {
    target: { value: actor },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Revisar rechazo definitivo' }),
  )
  v.rerender(
    v.tree(undefined, {
      ...v.auth,
      user: { ...v.auth.user, id: resource, role: 'DRIVER' },
    }),
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText(actor)).not.toBeInTheDocument()
})
it('an already confirmed plan blocks another final rejection', async () => {
  vi.mocked(deletion.list).mockResolvedValue([
    { ...plan, imageRetention: { ...calendar, reason: 'FINAL_REJECTION' } },
  ])
  mount()
  await screen.findByText(/Ya consta un plan/)
  expect(
    screen.getByRole('button', { name: 'Revisar rechazo definitivo' }),
  ).toBeDisabled()
})
it('lost final rejection recovers original GET and current plan; no duplicate POST, no case GET', async () => {
  const refresh = vi.fn().mockResolvedValue(undefined)
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(
      actor,
      'FINAL_REJECTION',
      caseId,
      '/admin/verification-cases/' + caseId + '/final-rejection',
      { expectedVersion: 1, evidenceRef: 'sensitive' },
      refresh,
    ),
  ).rejects.toThrow()
  const m = readMarkers()[0]
  expect(Object.keys(m).sort()).toEqual(['actor', 'key', 'operation', 'target'])
  expect(JSON.stringify(localStorage)).not.toContain('sensitive')
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { id: resource, status: 'INVENTORY', revision: 1 },
  })
  vi.mocked(deletion.list).mockResolvedValue([{ ...plan, status: 'CLOSED' }])
  await expect(reconcile(m, resource, refresh)).rejects.toThrow()
  expect(verification.attempt).not.toHaveBeenCalled()
  await reconcile(m, actor, refresh)
  expect(verification.command).toHaveBeenCalledOnce()
  expect(verification.get).not.toHaveBeenCalled()
  expect(readMarkers()).toEqual([])
})
it('keeps original marker when current plan cannot be correlated', async () => {
  const refresh = vi.fn()
  vi.mocked(verification.command).mockRejectedValue(new ApiError(0, 'lost'))
  await expect(
    runVerification(actor, 'FINAL_REJECTION', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  const m = readMarkers()[0]
  vi.mocked(verification.attempt).mockResolvedValue({
    state: 'APPLIED',
    result: { id: resource, status: 'INVENTORY', revision: 1 },
  })
  await expect(reconcile(m, actor, refresh)).rejects.toThrow(/plan actual/)
  expect(readMarkers()).toEqual([m])
})

it.each(['2027-06-01T00:00:00Z', '2020-01-01T00:00:00Z', null])(
  'a review date %s never proves exception validity without a supported projection',
  (dueAt) => {
    render(
      <ImageRetentionStatus
        data={{
          ...plan,
          pendingActions: [{ kind: 'RETENTION_REVIEW', dueAt }],
        }}
      />,
    )
    expect(
      screen.getByText(/ni acredita la vigencia de excepciones/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /extender|levantar/i }),
    ).not.toBeInTheDocument()
  },
)
it('a complete forbidden final rejection clears the marker without claiming success', async () => {
  vi.mocked(verification.command).mockRejectedValue(
    new ApiError(403, 'Forbidden', 'VERIFICATION_FORBIDDEN'),
  )
  const refresh = vi.fn().mockResolvedValue(undefined)
  await expect(
    runVerification(actor, 'FINAL_REJECTION', caseId, '/', {}, refresh),
  ).rejects.toThrow()
  expect(readMarkers()).toEqual([])
  expect(verification.command).toHaveBeenCalledOnce()
})
it('a late admin calendar response cannot populate the next account view', async () => {
  let done!: (value: (typeof plan)[]) => void
  vi.mocked(deletion.list).mockReturnValue(
    new Promise((resolve) => {
      done = resolve
    }),
  )
  const v = mount()
  await waitFor(() => expect(deletion.list).toHaveBeenCalled())
  v.rerender(
    v.tree(undefined, {
      ...v.auth,
      user: { ...v.auth.user, id: resource, role: 'DRIVER' },
    }),
  )
  done([plan])
  await waitFor(() =>
    expect(
      screen.queryByText('Aviso programado (día 23)'),
    ).not.toBeInTheDocument(),
  )
  expect(
    screen.queryByRole('button', { name: 'Revisar rechazo definitivo' }),
  ).not.toBeInTheDocument()
})

it('a scheduled calendar does not claim restrictions already applied before confirmation', () => {
  render(<Status data={plan} />)
  expect(
    screen.getByText(/Las demás fechas del seguimiento/),
  ).toHaveTextContent(Intl.DateTimeFormat('es-MX').resolvedOptions().timeZone)
  expect(
    screen.getByText('Calendario registrado; inventario todavía pendiente'),
  ).toBeInTheDocument()
  expect(
    screen.queryByText('Restricciones aplicadas; inventario en revisión'),
  ).not.toBeInTheDocument()
})

it('holder reads an authorized persisted case calendar without the admin inventory', () => {
  const record = {
    ...caseFixture,
    status: 'REJECTED' as const,
    retention: {
      executionEnabled: true,
      eligibility: 'RECORDED_CALENDAR' as const,
      historyTruncated: false,
      plans: [plan],
    },
  }
  mount('DRIVER', record)
  expect(screen.getByText('2027-05-01 00:00:00 UTC')).toBeInTheDocument()
  expect(deletion.list).not.toHaveBeenCalled()
})
it('minimized historical plans remain visible without reconstructing their calendar', () => {
  const record = {
    ...caseFixture,
    status: 'REJECTED' as const,
    retention: {
      executionEnabled: false,
      eligibility: 'HISTORICAL_ONLY' as const,
      historyTruncated: false,
      plans: [{ ...plan, status: 'PURGED', imageRetention: undefined }],
    },
  }
  mount('DRIVER', record)
  expect(screen.getByText(/Registro depurado/)).toBeInTheDocument()
  expect(screen.getByText(/Calendario no informado/)).toBeInTheDocument()
})
it('an undisclosed plan is not misrepresented as a missing historical anchor', () => {
  const record = {
    ...caseFixture,
    status: 'REJECTED' as const,
    retention: {
      executionEnabled: true,
      eligibility: 'NOT_DISCLOSED' as const,
      historyTruncated: false,
      plans: [],
    },
  }
  mount('DRIVER', record)
  expect(
    screen.getByText(/seguimiento no está disponible para esta cuenta/),
  ).toBeInTheDocument()
  expect(
    screen.queryByText(/Sin hito fiable registrado/),
  ).not.toBeInTheDocument()
})
