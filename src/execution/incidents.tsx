import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ActionForm,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useAuth } from '../auth/context'
import { ApiError } from '../services/errors'
import { providers } from '../providers/service'
import { date } from '../utils/format'
import { executionApi, executionPath } from './service'
import { runCommand, usePendingCommands } from './commands'
import { ExecutionPanel } from './components'
import { reasonLabels } from './format'
import type { Candidate, Execution, Resolution, ResolutionBase } from './types'
import { useResolutionMarkers } from './reconciliation-store'

export function IncidentsPage() {
  const [status, setStatus] = useState('OPEN'),
    [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['custody-incidents', status, page],
    queryFn: ({ signal }) => executionApi.incidents(status, page, signal),
    retry: false,
    refetchInterval: 15000,
  })
  return (
    <>
      <PageTitle
        title="Incidencias de custodia"
        description="Cola de atención administrativa. No hay correos automáticos."
      />
      <section className="panel">
        <div className="filters">
          <Field label="Estado de incidencias">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="OPEN">Abiertas</option>
              <option value="RESOLVED">Resueltas</option>
            </select>
          </Field>
          <button
            className="button secondary"
            onClick={() => void query.refetch()}
          >
            Actualizar incidencias
          </button>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (
          <>
            <Table
              stacked
              rows={query.data.items}
              columns={[
                {
                  label: 'Servicio',
                  render: (r) => (
                    <Link to={`/custody-incidents/${r.dispatchId}/${r.id}`}>
                      Ver incidencia · {r.dispatchId}
                    </Link>
                  ),
                },
                {
                  label: 'Motivo',
                  render: (r) =>
                    reasonLabels[r.reasonCode] ?? 'Motivo no reconocido',
                },
                { label: 'Reportada', render: (r) => date(r.reportedAt) },
                { label: 'Resuelta', render: (r) => date(r.resolvedAt) },
              ]}
            />
            <Pagination
              page={page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={setPage}
            />
          </>
        )}
      </section>
    </>
  )
}
export function IncidentPage() {
  const { dispatchId = '', incidentId = '' } = useParams()
  const query = useQuery({
    queryKey: ['custody-incidents', dispatchId, incidentId],
    queryFn: ({ signal }) =>
      executionApi.incident(dispatchId, incidentId, signal),
    retry: false,
    refetchInterval: 15000,
  })
  const state = useQuery({
    queryKey: ['execution', { surface: 'admin', dispatchId }, 1],
    queryFn: ({ signal }) =>
      executionApi.detail({ surface: 'admin', dispatchId }, 1, signal),
    retry: false,
    staleTime: 0,
    refetchInterval: 15000,
  })
  if (query.isPending || state.isPending) return <Loading />
  if (query.isError || state.isError)
    return <ErrorState error={query.error ?? state.error} />
  const { incident, resolution } = query.data
  if (incident.dispatchId !== dispatchId || incident.id !== incidentId)
    return (
      <ErrorState
        error={
          new ApiError(403, 'La incidencia no corresponde a este servicio.')
        }
      />
    )
  const e = state.data.execution
  return (
    <>
      <PageTitle title="Incidencia de custodia" back="/custody-incidents" />
      <section className="panel">
        <InfoGrid
          items={[
            ['Estado', incident.resolvedAt ? 'Resuelta' : 'Abierta'],
            ['Motivo', reasonLabels[incident.reasonCode] ?? 'Otro'],
            ['Detalle', incident.reasonDetail],
            ['Registrador', incident.reportedByUserId],
            ['Fecha', date(incident.reportedAt)],
          ]}
        />
        {resolution && (
          <InfoGrid
            items={[
              [
                'Resolución',
                resolution.type === 'TRANSFER'
                  ? 'Transferencia de custodia'
                  : 'Devuelto al origen (RETURNED)',
              ],
              ['Motivo de resolución', resolution.reason],
              ['Fecha física', date(resolution.occurredAt)],
              ['Fecha de registro', date(resolution.recordedAt)],
              ['Administrador', resolution.actorUserId],
              [
                'Confirmación',
                resolution.confirmations.confirmationMethod === 'PHONE'
                  ? 'Por teléfono'
                  : 'No reconocida',
              ],
            ]}
          />
        )}
      </section>
      <ExecutionPanel scope={{ surface: 'admin', dispatchId }} />
      {e?.activeAssignmentId &&
        e.openIncidentId === incidentId &&
        e.allowedActions.includes('RESOLVE_INCIDENT') &&
        !incident.resolvedAt && (
          <fieldset
            className="execution-fieldset"
            disabled={query.isFetching || state.isFetching}
          >
            <ResolutionForm
              key={`${dispatchId}:${incidentId}:${e.revision}`}
              dispatchId={dispatchId}
              incidentId={incidentId}
              execution={e}
            />
          </fieldset>
        )}
    </>
  )
}
export function ResolutionForm({
  dispatchId,
  incidentId,
  execution: e,
}: {
  dispatchId: string
  incidentId: string
  execution: Execution
}) {
  const { user } = useAuth()
  const { items } = usePendingCommands()
  const durable = useResolutionMarkers()
  const blocked =
    items.some((c) => c.actor === user?.id && c.dispatchId === dispatchId) ||
    durable.unavailable ||
    durable.markers.some(
      (m) => m.dispatchId === dispatchId && m.incidentId === incidentId,
    )
  const [type, setType] = useState<'RETURN_TO_ORIGIN' | 'TRANSFER'>(
    'RETURN_TO_ORIGIN',
  )
  const [recipient, setRecipient] = useState<Candidate | null>(null)
  if (
    user?.role !== 'SUPER_ADMIN' ||
    !e.allowedActions.includes('RESOLVE_INCIDENT')
  )
    return null
  return (
    <section className="panel">
      <div className="panel-toolbar">
        <h2>Resolver con confirmación física</h2>
      </div>
      <div className="panel-body">
        <p className="warning">
          Custodia y recursos siguen retenidos hasta que Mandaria confirme la
          resolución. No acredita cobro, cargo nuevo ni devolución automática de
          créditos.
        </p>
        {blocked ? (
          <p>
            Pendiente de reconciliación. No se puede preparar otra resolución.
            Usa la lectura del aviso superior con la cuenta que inició la
            operación. Un cambio de usuario no elimina este bloqueo.
          </p>
        ) : (
          <>
            <Field label="Tipo de resolución">
              <select
                value={type}
                onChange={(v) => {
                  setType(v.target.value as typeof type)
                  setRecipient(null)
                }}
              >
                <option value="RETURN_TO_ORIGIN">Devolución al origen</option>
                <option value="TRANSFER">Transferencia de custodia</option>
              </select>
            </Field>
            <ActionForm
              key={type}
              initialDirty
              submitLabel={
                type === 'TRANSFER'
                  ? 'Confirmar transferencia física'
                  : 'Confirmar devolución física'
              }
              onSubmit={async (data) => {
                if (!e.activeAssignmentId || !e.openIncidentId) return
                const reason = String(data.get('reason')).trim()
                const occurred = new Date(String(data.get('occurredAt')))
                if (reason.length < 3 || reason.length > 500)
                  throw new ApiError(
                    400,
                    'El motivo requiere entre 3 y 500 caracteres.',
                  )
                if (
                  !Number.isFinite(occurred.getTime()) ||
                  occurred.getTime() > Date.now()
                )
                  throw new ApiError(
                    400,
                    'Indica una fecha física válida, no futura. El servidor comprobará el último hito de custodia.',
                  )
                const base: ResolutionBase = {
                  assignmentId: e.activeAssignmentId,
                  expectedRevision: e.revision,
                  reason,
                  occurredAt: occurred.toISOString(),
                  confirmationMethod: 'PHONE',
                }
                let body: Resolution
                const requireConfirmation = (name: string) => {
                  if (data.get(name) !== 'on')
                    throw new ApiError(
                      400,
                      'Confirma explícitamente cada atestación requerida.',
                    )
                }
                if (type === 'RETURN_TO_ORIGIN') {
                  requireConfirmation('custodianConfirmed')
                  requireConfirmation('originConfirmed')
                  const label = String(data.get('originContactLabel')).trim(),
                    role = String(data.get('originContactRole')).trim()
                  if (
                    !label ||
                    label.length > 100 ||
                    !role ||
                    role.length > 100
                  )
                    throw new ApiError(
                      400,
                      'Indica el nombre o etiqueta y rol del contacto, de 1 a 100 caracteres.',
                    )
                  body = {
                    ...base,
                    type,
                    custodianConfirmed: true,
                    originConfirmed: true,
                    originContactLabel: label,
                    originContactRole: role,
                  }
                } else {
                  if (!recipient)
                    throw new ApiError(
                      400,
                      'Selecciona un par real de repartidor y vehículo.',
                    )
                  requireConfirmation('releasingCustodianConfirmed')
                  requireConfirmation('receivingCustodianConfirmed')
                  requireConfirmation('atCurrentStageLocation')
                  const fleet = recipient.mode === 'FLEET'
                  const admin = String(data.get('recipientAdmin') ?? '')
                  if (fleet) {
                    requireConfirmation('recipientProviderAdminConfirmed')
                    if (!admin || !recipient.providerId)
                      throw new ApiError(
                        400,
                        'Selecciona el administrador receptor vigente.',
                      )
                  }
                  body = {
                    ...base,
                    type,
                    recipient: {
                      mode: recipient.mode,
                      driverId: recipient.driverId,
                      vehicleId: recipient.vehicleId,
                      ...(fleet ? { providerId: recipient.providerId! } : {}),
                    },
                    releasingCustodianConfirmed: true,
                    receivingCustodianConfirmed: true,
                    atCurrentStageLocation: true,
                    ...(fleet
                      ? {
                          recipientProviderAdminUserId: admin,
                          recipientProviderAdminConfirmed: true as const,
                        }
                      : {}),
                  }
                }
                await runCommand({
                  actor: user.id,
                  dispatchId,
                  path: executionPath(
                    { surface: 'admin', dispatchId },
                    `custody-incidents/${encodeURIComponent(incidentId)}/resolve`,
                  ),
                  body,
                  label:
                    type === 'TRANSFER'
                      ? 'Transferencia de custodia'
                      : 'Devolución al origen (RETURNED)',
                })
              }}
            >
              <Field label="Motivo de resolución">
                <textarea
                  name="reason"
                  minLength={3}
                  maxLength={500}
                  required
                />
              </Field>
              <Field
                label="Fecha y hora física (hora local)"
                hint="El backend valida que no sea anterior al último hito de custodia o transferencia."
              >
                <input name="occurredAt" type="datetime-local" required />
              </Field>
              <p>
                Confirmación por teléfono: atestación administrativa, no prueba
                de pago.
              </p>
              {type === 'RETURN_TO_ORIGIN' ? (
                <>
                  <Field label="Contacto receptor en origen (nombre o etiqueta)">
                    <input name="originContactLabel" maxLength={100} required />
                  </Field>
                  <Field label="Rol del contacto en origen">
                    <input name="originContactRole" maxLength={100} required />
                  </Field>
                  <p>
                    No introduzcas teléfonos ni documentos. El resultado será
                    RETURNED, nunca DELIVERED.
                  </p>
                  <Check
                    name="custodianConfirmed"
                    label="El custodio confirma la devolución física."
                  />
                  <Check
                    name="originConfirmed"
                    label="El origen confirma la recepción física completa."
                  />
                </>
              ) : (
                <>
                  <CandidateSelector
                    dispatchId={dispatchId}
                    onSelect={setRecipient}
                  />
                  <div
                    key={`${recipient?.mode}:${recipient?.driverId}:${recipient?.vehicleId}`}
                  >
                    <Check
                      name="releasingCustodianConfirmed"
                      label="El custodio saliente confirma la transferencia física."
                    />
                    <Check
                      name="receivingCustodianConfirmed"
                      label="El custodio receptor confirma la recepción física."
                    />
                    <Check
                      name="atCurrentStageLocation"
                      label="La transferencia ocurrió en la ubicación de la etapa actual."
                    />
                    {recipient?.mode === 'FLEET' && (
                      <Check
                        name="recipientProviderAdminConfirmed"
                        label="El administrador receptor confirma la recepción y su responsabilidad."
                      />
                    )}
                  </div>
                  <p>
                    Se conserva el progreso. No se registra otra recogida ni un
                    cargo nuevo.
                  </p>
                </>
              )}
            </ActionForm>
          </>
        )}
      </div>
    </section>
  )
}
function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="execution-check">
      <input type="checkbox" name={name} required /> {label}
    </label>
  )
}
function CandidateSelector({
  dispatchId,
  onSelect,
}: {
  dispatchId: string
  onSelect: (value: Candidate | null) => void
}) {
  const [mode, setMode] = useState('FLEET'),
    [page, setPage] = useState(1),
    [choice, setChoice] = useState('')
  const query = useQuery({
    queryKey: ['execution', 'candidates', dispatchId, mode, page],
    queryFn: ({ signal }) =>
      executionApi.candidates(dispatchId, mode, page, signal),
    retry: false,
    staleTime: 0,
  })
  const selected = query.data?.items.find(
    (c) => `${c.driverId}:${c.vehicleId}` === choice,
  )
  return (
    <>
      <Field label="Modo receptor">
        <select
          value={mode}
          onChange={(v) => {
            setMode(v.target.value)
            setPage(1)
            setChoice('')
            onSelect(null)
          }}
        >
          <option value="FLEET">Flotilla</option>
          <option value="INDEPENDENT">Independiente</option>
        </select>
      </Field>
      <p>
        Disponibilidad orientativa: estos recursos no están reservados. El
        servidor revalida al confirmar.
      </p>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        <>
          <Field label="Repartidor y vehículo receptores">
            <select
              required
              value={choice}
              onChange={(v) => {
                setChoice(v.target.value)
                onSelect(
                  query.data.items.find(
                    (c) => `${c.driverId}:${c.vehicleId}` === v.target.value,
                  ) ?? null,
                )
              }}
            >
              <option value="">Selecciona un candidato</option>
              {query.data.items.map((c) => (
                <option
                  key={`${c.driverId}:${c.vehicleId}`}
                  value={`${c.driverId}:${c.vehicleId}`}
                >
                  {c.driverName} · {c.vehicleIdentifier}
                </option>
              ))}
            </select>
          </Field>
          <Pagination
            page={page}
            total={query.data.total}
            totalPages={query.data.totalPages}
            onPage={(p) => {
              setPage(p)
              setChoice('')
              onSelect(null)
            }}
          />
        </>
      )}
      {selected?.mode === 'FLEET' && selected.providerId && (
        <RecipientAdmin
          key={selected.providerId}
          providerId={selected.providerId}
        />
      )}
    </>
  )
}
function RecipientAdmin({ providerId }: { providerId: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['execution', 'members', providerId, page],
    queryFn: ({ signal }) => providers.members(providerId, page, signal),
    retry: false,
    staleTime: 0,
  })
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorState error={query.error} />
  const eligible = query.data.items.filter(
    (m) => m.user.active && m.user.role === 'PROVIDER_ADMIN',
  )
  return (
    <>
      <Field label="Administrador receptor con membership vigente">
        <select
          name="recipientAdmin"
          key={`${providerId}:${page}`}
          required
          defaultValue=""
        >
          <option value="">Selecciona administrador</option>
          {eligible.map((m) => (
            <option key={m.id} value={m.userId}>
              {m.user.email}
            </option>
          ))}
        </select>
      </Field>
      <Pagination
        page={page}
        total={query.data.total}
        totalPages={query.data.totalPages}
        onPage={setPage}
      />
    </>
  )
}
