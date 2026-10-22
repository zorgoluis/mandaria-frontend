import { useState } from 'react'
import { useAuth } from '../auth/context'
import { Field, Modal } from '../components/ui'
import { ApiError } from '../services/errors'
import {
  known,
  uuid,
  type Snapshot,
  type Restriction,
  type Task,
  type WorkItem,
} from './contract'
import { PrivacyForm } from './pages'
import { useSend, useLocalNow } from './hooks'
import { deletion } from './service'
import { v2, validReviewAt, restrictionMessage } from './operational-contract'
import { date } from '../utils/format'

const labels: Record<string, string> = {
  REVIEW_RESTRICTION: 'Revisar una restricción',
  BLOCK_CLEANUP_AUTHORIZATION: 'Bloquear autorización de limpieza',
  AUTHORIZE_POINT_CLEANUP: 'Autorizar una actuación puntual',
  ADOPT_OPERATIONAL_POLICY: 'Adoptar explícitamente la política V2',
}
function RestrictionStatus({
  data: g,
  now,
}: {
  data: Restriction
  now: number
}) {
  const overdue = Date.parse(g.reviewDueAt ?? '') <= now
  return (
    <section aria-label={`Restricción ${g.id}`}>
      <h4>Restricción {g.id}</h4>
      <dl>
        <dt>Ámbito</dt>
        <dd>
          {(
            {
              USER: 'Cuenta',
              DRIVER: 'Conductor',
              SUBJECT: 'Sujeto documental',
              PROVIDER: 'Proveedor',
              VEHICLE: 'Unidad',
            } as Record<string, string>
          )[g.kind] ?? 'Ámbito no reconocido'}
        </dd>
        <dt>Estado de la restricción</dt>
        <dd>
          {g.active === true
            ? 'Activa'
            : g.active === false
              ? 'Inactiva'
              : 'No reconocido'}
        </dd>
        <dt>Última decisión acreditada</dt>
        <dd>{restrictionMessage(g, now)}</dd>
        <dt>Fecha de revisión informada</dt>
        <dd>{g.reviewedAt ? date(g.reviewedAt) : 'No informada'}</dd>
        <dt>Motivo registrado</dt>
        <dd>
          {g.reviewReason?.trim() ||
            'No comunicado; no se deduce el fundamento original'}
        </dd>
        <dt>
          {overdue
            ? 'Revisión programada vencida'
            : 'Próxima revisión informada'}
        </dt>
        <dd>{g.reviewDueAt ? date(g.reviewDueAt) : 'No informada'}</dd>
      </dl>
      {overdue && (
        <p>
          La fecha informada ya pasó según el reloj local. No acredita una
          revisión nueva ni cambia la restricción.
        </p>
      )}
    </section>
  )
}
export function OperationalReview({
  data: s,
  tasks,
  items,
  stale,
}: {
  data: Snapshot
  tasks: Task[]
  items: WorkItem[]
  stale: boolean
}) {
  const now = useLocalNow()
  const { user } = useAuth(),
    send = useSend()
  const [action, setAction] = useState(''),
    [taskId, setTaskId] = useState(''),
    [decision, setDecision] = useState(''),
    [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const reviews = tasks.filter((t) => t.kind === 'RESTRICTION_REVIEW')
  const selected = reviews.find((t) => t.id === taskId)
  const assigned =
    selected && [selected.ownerId, selected.deputyId].includes(user?.id)
  const permitted = user?.role === 'SUPER_ADMIN' && known(s)
  const disabled = stale || send.blocked || !permitted
  const candidates = items.filter(
    (i) =>
      ['DELETE', 'MIXED'].includes(i.classification) &&
      ['PENDING', 'VERIFIED', 'MANUAL_REQUIRED', 'RETRY_WAIT'].includes(
        i.status,
      ) &&
      i.attempts < 8 &&
      i.incidentCode !== 'OBJECT_AUTHORIZATION_BLOCKED',
  )
  if (!permitted) return null
  const actions = [
    ...(reviews.some((t) => [t.ownerId, t.deputyId].includes(user.id))
      ? ['REVIEW_RESTRICTION']
      : []),
    ...(s.status !== 'PURGED' ? ['BLOCK_CLEANUP_AUTHORIZATION'] : []),
    ...(v2(s) &&
    s.authorizationState === 'ACTIVE' &&
    candidates.length &&
    s.status !== 'PURGED'
      ? ['AUTHORIZE_POINT_CLEANUP']
      : []),
    ...(s.cleanupPolicy === 'STRONG_WRITE_SEAL_V1' &&
    s.status !== 'CANCELLED' &&
    s.confirmedAt &&
    !s.closedAt &&
    s.deadline &&
    Date.parse(s.deadline) > now &&
    !items.some(
      (i) =>
        i.status === 'RUNNING' || i.finalVerifiedAt || i.status === 'VERIFIED',
    )
      ? ['ADOPT_OPERATIONAL_POLICY']
      : []),
  ]
  return (
    <section aria-label="Decisiones operativas V2">
      <h3>Restricciones y autorización</h3>
      <p>
        Retirar una restricción concreta no reactiva la cuenta ni modifica otros
        bloqueos, documentos o permisos. Pueden existir otras restricciones.
      </p>
      {reviews.length === 0 && (
        <p>No hay revisiones de restricciones comunicadas.</p>
      )}
      {reviews.map((t) => (
        <article
          key={t.id}
          className="panel panel-body"
          aria-label={`Revisión ${t.id}`}
        >
          <h4>Revisión {t.id}</h4>
          <p>
            Origen: solicitud {s.id}.{' '}
            {t.objectId
              ? `Revisión parcial del objeto ${t.objectId}.`
              : 'Revisión de esta solicitud.'}
          </p>
          <dl>
            <dt>Estado de la tarea administrativa</dt>
            <dd>
              {(
                {
                  OPEN: 'Abierta',
                  PENDING: 'Pendiente',
                  ACKNOWLEDGED: 'Responsabilidad registrada',
                  RESOLVED: 'Resuelta',
                } as Record<string, string>
              )[t.status] ?? 'Estado no reconocido'}
            </dd>
            <dt>Responsable</dt>
            <dd>{t.ownerId ?? 'Sin asignar'}</dd>
            <dt>Suplente</dt>
            <dd>{t.deputyId ?? 'Sin asignar'}</dd>
            <dt>Fecha de tarea</dt>
            <dd>{t.dueAt ?? 'No informada'}</dd>
          </dl>
          <p>
            El estado de la tarea no acredita por sí solo la revisión de todas
            las restricciones.
          </p>
          {![t.ownerId, t.deputyId].includes(user.id) && (
            <p>
              Esta cuenta no está asignada para decidir. Utiliza «Asignar
              responsable y suplente» cuando el comando tenga recuperación
              disponible.
            </p>
          )}
          {t.restrictions?.map((g) => (
            <RestrictionStatus key={g.id} data={g} now={now} />
          ))}
        </article>
      ))}
      <Field label="Decisión operativa V2">
        <select
          value={action}
          disabled={disabled}
          onChange={(e) => {
            setAction(e.target.value)
            setTaskId('')
            setDecision('')
            setDraft(null)
          }}
        >
          <option value="">Selecciona una acción</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {labels[a]}
            </option>
          ))}
        </select>
      </Field>
      {actions.includes(action) && (
        <PrivacyForm
          key={action}
          label="Revisar actuación V2"
          disabled={disabled}
          onSubmit={async (form) => {
            if (disabled) return
            const body: Record<string, unknown> = {
              action,
              expectedRevision: s.revision,
            }
            for (const [k, v] of form.entries())
              if (String(v).trim()) body[k] = String(v).trim()
            if (action !== 'ADOPT_OPERATIONAL_POLICY' && !body.reason)
              throw new ApiError(400, '', 'INVALID_AUTHORIZATION_REVIEW')
            if (action === 'REVIEW_RESTRICTION') {
              if (
                !assigned ||
                !selected?.restrictions?.some(
                  (g) =>
                    g.id === body.gateId &&
                    (!selected.objectId || g.kind === 'SUBJECT'),
                )
              )
                throw new ApiError(400, '', 'RESTRICTION_REVIEW_REQUIRED')
              if (selected.objectId) body.objectId = selected.objectId
              if (body.gateDecision === 'KEEP') {
                if (!validReviewAt(body.reviewAt))
                  throw new ApiError(400, '', 'BOUNDED_REVIEW_REQUIRED')
              } else delete body.reviewAt
            }
            setDraft(body)
          }}
        >
          <Field label="Referencia UUID de evidencia V2">
            <input name="evidenceRef" required pattern={uuid.source} />
          </Field>
          {action === 'REVIEW_RESTRICTION' && (
            <>
              <Field label="Revisión asignada">
                <select
                  value={taskId}
                  required
                  onChange={(e) => setTaskId(e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {reviews
                    .filter((t) => [t.ownerId, t.deputyId].includes(user.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.objectId ? 'Parcial' : 'Solicitud'} · {t.id}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Restricción concreta">
                <select
                  key={taskId}
                  name="gateId"
                  required
                  disabled={!assigned}
                >
                  <option value="">Selecciona</option>
                  {selected?.restrictions
                    ?.filter(
                      (g) =>
                        ['USER', 'SUBJECT', 'PROVIDER', 'VEHICLE'].includes(
                          g.kind,
                        ) &&
                        (!selected.objectId || g.kind === 'SUBJECT'),
                    )
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.kind} · {g.id}
                      </option>
                    ))}
                </select>
              </Field>
              {selected?.objectId && (
                <p>
                  El servidor debe comprobar que esta restricción SUBJECT
                  corresponde al objeto y que ninguna otra parte legítima la
                  necesita.
                </p>
              )}
              <Field label="Decisión sobre esta restricción">
                <select
                  name="gateDecision"
                  value={decision}
                  required
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="">Selecciona</option>
                  <option value="RELEASE">Retirar sólo esta restricción</option>
                  <option value="KEEP">
                    Conservar con motivo y próxima revisión
                  </option>
                </select>
              </Field>
              {decision === 'KEEP' && (
                <Field label="Próxima revisión (ISO 8601 con zona, hasta 30 días)">
                  <input
                    name="reviewAt"
                    required
                    placeholder="2026-10-25T12:00:00-06:00"
                  />
                </Field>
              )}
            </>
          )}
          {['BLOCK_CLEANUP_AUTHORIZATION', 'AUTHORIZE_POINT_CLEANUP'].includes(
            action,
          ) && (
            <Field label="Alcance exacto de la actuación">
              <select
                name="objectId"
                required={action === 'AUTHORIZE_POINT_CLEANUP'}
              >
                <option value="">
                  {action === 'BLOCK_CLEANUP_AUTHORIZATION'
                    ? 'Bloquear autorización de toda esta solicitud'
                    : 'Selecciona un objeto'}
                </option>
                {(action === 'AUTHORIZE_POINT_CLEANUP'
                  ? candidates
                  : v2(s) && s.authorizationState === 'ACTIVE'
                    ? items
                    : []
                ).map((i) => (
                  <option key={i.id} value={i.id}>
                    Sólo objeto {i.id}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {action !== 'ADOPT_OPERATIONAL_POLICY' && (
            <Field label="Motivo concreto">
              <textarea name="reason" required maxLength={300} />
            </Field>
          )}
          {action === 'AUTHORIZE_POINT_CLEANUP' && (
            <p>
              Una actuación inmediata sobre el inventario que el servidor
              acredite. No renueva vigilancia ni ocho ciclos. No acredita
              ejecución remota terminada; consulta después el estado actual.
            </p>
          )}
        </PrivacyForm>
      )}
      {draft && (
        <Modal
          title="Confirmar actuación operativa"
          onClose={() => {
            if (!send.busy) setDraft(null)
          }}
        >
          <p>
            {labels[String(draft.action)]}. Folio {s.id}. Revisión{' '}
            {String(draft.expectedRevision)}.
          </p>
          <dl>
            {Object.entries(draft)
              .filter(([k]) => !['action', 'expectedRevision'].includes(k))
              .map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {
                      (
                        {
                          gateId: 'Restricción seleccionada',
                          gateDecision: 'Decisión',
                          objectId: 'Objeto seleccionado',
                          reason: 'Motivo',
                          reviewAt: 'Próxima revisión',
                          evidenceRef: 'Evidencia',
                        } as Record<string, string>
                      )[k]
                    }
                  </dt>
                  <dd>
                    {v === 'RELEASE'
                      ? 'Retirar sólo esta restricción'
                      : v === 'KEEP'
                        ? 'Conservar esta restricción'
                        : String(v)}
                  </dd>
                </div>
              ))}
          </dl>
          <p>
            Las otras restricciones permanecen independientes. No restaura
            archivos ni reactiva la cuenta.
          </p>
          {draft.expectedRevision !== s.revision && (
            <p role="alert">
              La solicitud cambió. Cierra esta confirmación y prepara otra
              decisión con el estado actualizado.
            </p>
          )}
          <PrivacyForm
            label="Confirmar actuación V2"
            disabled={disabled || draft.expectedRevision !== s.revision}
            onSubmit={async () => {
              if (disabled || draft.expectedRevision !== s.revision) return
              await send.send('resolve', s.id, (key) =>
                deletion.command(key, s.id, 'resolve', draft),
              )
              setDraft(null)
              setAction('')
            }}
          >
            <label>
              <input type="checkbox" required /> Confirmo el elemento, motivo y
              consecuencias de esta actuación.
            </label>
          </PrivacyForm>
        </Modal>
      )}
    </section>
  )
}
