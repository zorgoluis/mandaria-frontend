import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import {
  ActionForm,
  Field,
  Modal,
  ErrorState,
  Loading,
  Pagination,
  Table,
  InfoGrid,
} from '../components/ui'
import { ApiError } from '../services/errors'
import { date, labels } from '../utils/format'
import { executionApi, executionPath } from './service'
import {
  refreshExecution,
  reconcileCommand,
  retryCommand,
  runCommand,
  usePendingCommands,
} from './commands'
import { phases, reasons, type Execution, type Scope } from './types'
import { phaseLabels, kindLabels, reasonLabels, sourceLabels } from './format'
import { useResolutionMarkers } from './reconciliation-store'

export function ExecutionRecovery() {
  const { user } = useAuth()
  const currentUser = useRef(user)
  useEffect(() => {
    currentUser.current = user
    return () => {
      currentUser.current = null
    }
  }, [user])
  const { items, message, messageActor } = usePendingCommands()
  const own = items.filter((c) => c.actor === user?.id)
  const durable = useResolutionMarkers()
  const [closing, setClosing] = useState<{ key: string; actor: string } | null>(
    null,
  )
  const [reading, setReading] = useState<string | null>(null)
  return (
    <>
      {user?.role === 'SUPER_ADMIN' && durable.unavailable && (
        <p role="alert" className="warning notice">
          Pendiente de reconciliación: no se puede leer el registro local. Las
          resoluciones están bloqueadas; no borres los datos del navegador para
          reintentar.
        </p>
      )}
      {user?.role === 'SUPER_ADMIN' &&
        durable.markers
          .filter((m) => m.actor === user.id)
          .map((m) => (
            <section
              className="warning notice"
              key={m.key}
              aria-label="Resolución pendiente de reconciliación"
            >
              <strong>Pendiente de reconciliación</strong>
              <p>
                La resolución pudo aplicarse. Este marcador sobrevive a recarga
                y cierre de pestaña. No contiene el formulario y no permite
                reconstruirlo ni reenviarlo con otra clave.
              </p>
              <Link
                to={`/custody-incidents/${encodeURIComponent(m.dispatchId)}/${encodeURIComponent(m.incidentId)}`}
              >
                Consultar incidencia
              </Link>{' '}
              <button
                className="button secondary"
                disabled={
                  reading === m.key ||
                  items.some((c) => c.key === m.key && c.busy)
                }
                onClick={async () => {
                  setReading(m.key)
                  try {
                    await reconcileCommand(
                      m.key,
                      user.id,
                      user.role,
                      () =>
                        currentUser.current?.id === user.id &&
                        currentUser.current?.role === 'SUPER_ADMIN',
                    )
                  } finally {
                    setReading(null)
                  }
                }}
              >
                Reconciliar por lectura
              </button>{' '}
              <button
                className="button secondary"
                disabled={
                  reading !== null ||
                  items.some((c) => c.key === m.key && c.busy)
                }
                onClick={() => setClosing({ key: m.key, actor: user.id })}
              >
                Cerrar intento pendiente
              </button>
            </section>
          ))}
      {closing && closing.actor === user?.id && user.role === 'SUPER_ADMIN' && (
        <Modal
          title="Cerrar intento técnico"
          onClose={() => {
            if (!reading) setClosing(null)
          }}
        >
          <p>
            Este cierre invalida permanentemente la clave si la resolución aún
            no se registró. Si ya se aplicó, consultaremos su resultado.
          </p>
          <p>
            No cancela el servicio ni cancela o revierte una entrega, devolución
            o transferencia física. Verifica la situación física antes de
            preparar otra resolución. No repitas movimientos.
          </p>
          <button
            className="button danger"
            disabled={reading !== null}
            onClick={async () => {
              setReading(closing.key)
              try {
                await reconcileCommand(
                  closing.key,
                  user.id,
                  user.role,
                  () =>
                    currentUser.current?.id === user.id &&
                    currentUser.current?.role === 'SUPER_ADMIN',
                  true,
                )
              } finally {
                setReading(null)
                setClosing(null)
              }
            }}
          >
            Confirmar cierre técnico
          </button>
        </Modal>
      )}
      {message && messageActor === user?.id && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {own.map((c) => (
        <section
          className="warning notice"
          key={c.key}
          aria-label="Operación de ejecución pendiente"
        >
          <strong>{c.label}</strong>
          <p>
            {c.busy
              ? 'Esperando confirmación del servidor…'
              : 'Respuesta incierta. La clave y el cuerpo originales se conservan en esta pestaña. Consulta el estado antes de recuperar; no prepares otra operación.'}
          </p>
          <button
            className="button secondary"
            disabled={c.busy}
            onClick={() => void refreshExecution()}
          >
            Consultar estado
          </button>{' '}
          <button
            className="button"
            disabled={c.busy}
            onClick={() => user && void retryCommand(c.key, user.id)}
          >
            Recuperar misma operación
          </button>
        </section>
      ))}
    </>
  )
}
export function ExecutionProgress({
  execution: e,
  fleet = false,
}: {
  execution: Execution
  fleet?: boolean
}) {
  return (
    <section className="panel" aria-label="Progreso de ejecución">
      <div className="panel-toolbar">
        <h2>Progreso de ejecución</h2>
        <span>Revisión {e.revision}</span>
      </div>
      <div className="panel-body">
        <ol className="execution-phases">
          {phases.map((p) => (
            <li key={p} aria-current={p === e.phase ? 'step' : undefined}>
              <span>{phaseLabels[p]}</span>
              {p === e.phase && <strong> · Fase actual</strong>}
            </li>
          ))}
          <li>
            {e.custodyStatus === 'DELIVERED'
              ? 'Entrega confirmada · Entregado'
              : e.custodyStatus === 'RETURNED'
                ? 'Sin entrega al destinatario · Devuelto al origen'
                : 'Entrega al destinatario · Sin confirmar'}
          </li>
        </ol>
        <p>
          Último registro: {date(e.lastRecordedAt)}.{' '}
          {e.phase ? '' : 'Sin avances registrados.'}
        </p>
        {e.custodyStatus === 'RETURNED' && (
          <p role="status">
            Devuelto al origen. No es una entrega al destinatario.
          </p>
        )}
        {e.openIncidentId && (
          <p className="warning" role="alert">
            Incidencia abierta. Custodia y recursos siguen retenidos; avances y
            entrega están bloqueados.
          </p>
        )}
        {fleet && (
          <p>
            Consulta de repartidor de flotilla. Continúa reportando los avances
            por teléfono a tu administrador.
          </p>
        )}
        <p className="muted">
          Los registros, la entrega, la devolución y la transferencia no
          acreditan cobro ni devolución automática de créditos.
        </p>
      </div>
    </section>
  )
}
export function ExecutionPanel({
  scope,
  legacy404 = false,
  operationalAssignmentId,
}: {
  scope: Scope
  legacy404?: boolean
  operationalAssignmentId?: string | null
}) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<'advance' | 'report' | null>(null)
  const { items } = usePendingCommands()
  const query = useQuery({
    queryKey: ['execution', scope, page],
    queryFn: ({ signal }) => executionApi.detail(scope, page, signal),
    retry: false,
    staleTime: 0,
    refetchInterval: 15000,
  })
  if (query.isPending) return <Loading />
  if (query.isError)
    return legacy404 &&
      query.error instanceof ApiError &&
      query.error.status === 404 ? (
      <p className="panel-note">
        Sin ejecución detallada disponible; se conserva el flujo existente.
      </p>
    ) : (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    )
  const e = query.data.execution
  if (!e)
    return (
      <p className="panel-note">
        Ejecución legacy: sin hitos detallados registrados.
      </p>
    )
  const actorAllowed =
    scope.surface === 'admin'
      ? user?.role === 'SUPER_ADMIN'
      : scope.surface === 'provider'
        ? user?.role === 'PROVIDER_ADMIN' && !!scope.providerId
        : user?.role === 'DRIVER'
  const blocked =
    query.isFetching ||
    items.some((c) => c.actor === user?.id && c.dispatchId === scope.dispatchId)
  const next = phases[e.phase === null ? 0 : phases.indexOf(e.phase) + 1]
  const assignmentConfirmed =
    operationalAssignmentId === undefined ||
    (operationalAssignmentId !== null &&
      operationalAssignmentId === e.activeAssignmentId)
  const advance =
    actorAllowed &&
    assignmentConfirmed &&
    scope.surface !== 'admin' &&
    e.allowedActions.includes('ADVANCE') &&
    !e.openIncidentId &&
    !!e.activeAssignmentId &&
    !!next
  const report =
    actorAllowed &&
    assignmentConfirmed &&
    e.allowedActions.includes('REPORT_INCIDENT') &&
    !e.openIncidentId &&
    !!e.activeAssignmentId
  return (
    <>
      <ExecutionProgress execution={e} />
      <section className="panel">
        <div className="panel-toolbar">
          <h2>Registro operativo</h2>
          <button
            className="button secondary"
            onClick={() => void query.refetch()}
          >
            Actualizar ejecución
          </button>
        </div>
        <div className="panel-body row-actions">
          {advance && (
            <button
              className="button"
              disabled={blocked}
              onClick={() => setDialog('advance')}
            >
              Registrar: {phaseLabels[next]}
            </button>
          )}
          {report && (
            <button
              className="button secondary"
              disabled={blocked}
              onClick={() => setDialog('report')}
            >
              Reportar incidencia
            </button>
          )}
          {scope.surface === 'admin' &&
            e.openIncidentId &&
            e.allowedActions.includes('RESOLVE_INCIDENT') && (
              <Link
                className="button"
                to={`/custody-incidents/${scope.dispatchId}/${e.openIncidentId}`}
              >
                Resolver incidencia
              </Link>
            )}
        </div>
        <Table
          stacked
          rows={query.data.events.items.map((item) => ({
            ...item,
            id: String(item.revision),
          }))}
          columns={[
            {
              label: 'Registro',
              render: (r) => kindLabels[r.kind] ?? 'Registro no reconocido',
            },
            {
              label: 'Fase',
              render: (r) => phaseLabels[phases[r.phase - 1]] ?? 'Sin hito',
            },
            {
              label: 'Actor',
              render: (r) =>
                r.actorUserId
                  ? `${labels[r.actorRole ?? ''] ?? r.actorRole ?? 'Usuario'} · ${r.actorUserId}`
                  : 'Sistema (sin actor humano)',
            },
            {
              label: 'Origen del aviso',
              render: (r) => sourceLabels[r.source] ?? 'Origen no reconocido',
            },
            { label: 'Fecha de registro', render: (r) => date(r.recordedAt) },
            { label: 'Revisión', render: (r) => r.revision },
          ]}
        />
        <Pagination
          page={page}
          total={query.data.events.total}
          totalPages={query.data.events.totalPages}
          onPage={setPage}
        />
      </section>
      {dialog &&
        ((dialog === 'advance' && advance) ||
          (dialog === 'report' && report)) && (
          <Modal
            title={
              dialog === 'advance'
                ? 'Confirmar avance reportado'
                : 'Reportar incidencia de custodia'
            }
            onClose={() => setDialog(null)}
          >
            <p>
              {scope.surface === 'driver'
                ? 'Registra únicamente lo que ocurrió físicamente.'
                : 'Registra el aviso recibido por teléfono. El servidor identificará al administrador.'}
            </p>
            <fieldset
              className="execution-fieldset"
              disabled={blocked}
              key={e.revision}
            >
              <ActionForm
                initialDirty
                submitLabel="Confirmar registro"
                onSubmit={async (data) => {
                  if (!user || !e.activeAssignmentId) return
                  const body =
                    dialog === 'advance'
                      ? {
                          assignmentId: e.activeAssignmentId,
                          expectedRevision: e.revision,
                          phase: next,
                        }
                      : {
                          assignmentId: e.activeAssignmentId,
                          expectedRevision: e.revision,
                          reasonCode: String(data.get('reasonCode')),
                          reasonDetail: String(data.get('reasonDetail')).trim(),
                        }
                  if (
                    body.reasonDetail !== undefined &&
                    (body.reasonDetail.length < 3 ||
                      body.reasonDetail.length > 500)
                  )
                    throw new ApiError(
                      400,
                      'Describe el motivo con 3 a 500 caracteres.',
                    )
                  const action = dialog
                  setDialog(null)
                  await runCommand({
                    actor: user.id,
                    dispatchId: scope.dispatchId,
                    path: executionPath(
                      scope,
                      action === 'advance'
                        ? 'execution-events'
                        : 'custody-incidents',
                    ),
                    body,
                    label: action === 'advance' ? 'Avance' : 'Incidencia',
                  })
                }}
              >
                {dialog === 'advance' ? (
                  <p>{phaseLabels[next]}</p>
                ) : (
                  <>
                    <Field label="Motivo">
                      <select name="reasonCode" required defaultValue="">
                        <option value="">Selecciona el motivo</option>
                        {reasons.map((r) => (
                          <option key={r} value={r}>
                            {reasonLabels[r]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Detalle del motivo">
                      <textarea
                        name="reasonDetail"
                        required
                        minLength={3}
                        maxLength={500}
                      />
                    </Field>
                    <p>
                      Custodia y recursos permanecen retenidos. No se envía
                      correo automático.
                    </p>
                  </>
                )}
                <label>
                  <input type="checkbox" required /> Confirmo que este aviso
                  corresponde a la asignación vigente.
                </label>
              </ActionForm>
            </fieldset>
          </Modal>
        )}
    </>
  )
}
export function EconomicPermissions({
  fields,
}: {
  fields: {
    collectionActionAllowed?: boolean
    advanceToOriginAllowed?: boolean
  }
}) {
  return (
    <InfoGrid
      items={[
        [
          'Cobro en esta etapa',
          fields.collectionActionAllowed === true
            ? 'Permitido según las condiciones recibidas'
            : 'No cobrar en esta etapa.',
        ],
        [
          'Adelanto al origen',
          fields.advanceToOriginAllowed === true
            ? 'Sólo si las condiciones contractuales lo requieren'
            : 'No adelantar dinero al origen.',
        ],
      ]}
    />
  )
}
