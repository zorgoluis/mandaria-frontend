import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Field, Modal } from '../components/ui'
import { deletion } from './service'
import { useRead, useSend, dkey } from './hooks'
import {
  message,
  label,
  reasons,
  tasks,
  terminal,
  uuid,
  known,
  type Snapshot,
} from './contract'
import { PrivacyForm } from './pages'
import { ApiError } from '../services/errors'
import { ObjectReviews } from './operational'
import { v2 } from './operational-contract'
import { OperationalReview } from './operational-review'
import { useAuth } from '../auth/context'

const labels: Record<string, string> = {
  IDENTITY_AND_AUTHORITY_VERIFIED: 'Acreditar identidad y facultades',
  REQUEST_IDENTITY_INFORMATION: 'Requerir información de identidad',
  IDENTITY_EVIDENCE_RECEIVED: 'Registrar recepción de evidencia',
  CLASSIFY: 'Clasificar documento revisado',
  OPEN_REPLACEMENT: 'Abrir expediente sustituto autorizado',
  SUBSTITUTE_VERIFIED: 'Acreditar sustituto ya aprobado',
  REPLACE_REPRESENTATIVE: 'Sustituir representante',
  ACKNOWLEDGE_TASK: 'Asignar responsable y suplente',
  RESUME: 'Reanudar intentos aún permitidos',
  retention: 'Registrar excepción concreta',
  restore: 'Registrar responsabilidad de recuperación',
}
const fields: Record<string, string[]> = {
  OPEN_REPLACEMENT: ['replacementUserId'],
  SUBSTITUTE_VERIFIED: ['replacementCaseId'],
  REPLACE_REPRESENTATIVE: ['replacementUserId'],
  ACKNOWLEDGE_TASK: ['ownerId', 'deputyId'],
  retention: ['ownerId'],
  restore: ['ownerId', 'deputyId'],
}
const names: Record<string, string> = {
  replacementUserId: 'UUID de representante sustituto verificado',
  replacementCaseId: 'UUID de expediente sustituto aprobado',
  ownerId: 'UUID del responsable',
  deputyId: 'UUID del suplente',
}
export function AdminActions({
  data: s,
  refreshing = false,
}: {
  data: Snapshot
  refreshing?: boolean
}) {
  const { user } = useAuth()
  const client = useQueryClient()
  const observation = useRef(0)
  const authorized = user?.role === 'SUPER_ADMIN' && known(s)
  const items = useRead(
      'items-' + s.id,
      (signal) => deletion.items(s.id, signal),
      authorized,
      v2(s),
    ),
    todo = useRead(
      'tasks-' + s.id,
      (signal) => deletion.tasks(s.id, signal),
      authorized,
      v2(s),
    ),
    replacement = useRead(
      'replacements-' + s.id,
      (signal) => deletion.replacements(s.id, signal),
      authorized,
    ),
    send = useSend()
  useEffect(() => {
    // Worker observations may change without incrementing request.revision.
    // Refresh the summary after an observed object refresh, never from a receipt.
    if (
      observation.current &&
      items.dataUpdatedAt !== observation.current &&
      user?.id
    )
      void client.invalidateQueries({
        queryKey: dkey(user.id, 'detail-admin-' + s.id),
      })
    observation.current = items.dataUpdatedAt
  }, [items.dataUpdatedAt, user?.id, s.id, client])
  const [action, setAction] = useState(''),
    [draft, setDraft] = useState<{
      op: string
      body: Record<string, unknown>
    } | null>(null)
  const options: string[] = []
  if (s.status === 'IDENTITY_REQUIRED')
    options.push(
      'REQUEST_IDENTITY_INFORMATION',
      'IDENTITY_EVIDENCE_RECEIVED',
      'IDENTITY_AND_AUTHORITY_VERIFIED',
    )
  if (!terminal(s) && s.authorizationState !== 'BLOCKED') {
    if (
      items.data?.some(
        (i) =>
          i.attachmentId &&
          i.attempts === 0 &&
          ['PENDING', 'PRESERVED'].includes(i.status),
      )
    )
      options.push('CLASSIFY')
    if (
      items.data?.some(
        (i) => i.classification === 'MIXED' && i.attempts === 0,
      ) &&
      s.scope !== 'ORGANIZATION' &&
      s.scope !== 'VEHICLE'
    )
      options.push('OPEN_REPLACEMENT')
    if (replacement.data?.some((r) => !r.acceptedAt))
      options.push('SUBSTITUTE_VERIFIED')
    if (s.scope === 'REPRESENTATIVE') options.push('REPLACE_REPRESENTATIVE')
    if (
      !v2(s) &&
      items.data?.some((i) => i.status === 'MANUAL_REQUIRED' && i.attempts < 8)
    )
      options.push('RESUME')
    options.push('retention')
  }
  if (
    todo.data?.some((t) =>
      ['OPEN', 'PENDING', 'ACKNOWLEDGED'].includes(t.status),
    )
  )
    options.push('ACKNOWLEDGE_TASK')
  if (s.confirmedAt && !['PURGED', 'CANCELLED'].includes(s.status))
    options.push('restore')
  const stale =
    refreshing ||
    !known(s) ||
    user?.role !== 'SUPER_ADMIN' ||
    items.isError ||
    todo.isError ||
    replacement.isError ||
    items.isFetching ||
    todo.isFetching ||
    replacement.isFetching
  return (
    <section>
      <h2>Revisión autorizada</h2>
      <p>
        No se fuerza eliminación, drenaje ni borrado de respaldos. Toda decisión
        requiere evidencia real y el servidor vuelve a comprobar facultades y
        revisión. La constancia ajena no está habilitada por el rol
        administrador.
      </p>
      {[items.error, todo.error, replacement.error]
        .filter(Boolean)
        .map((e, i) => (
          <p role="alert" key={i}>
            {message(e)}
          </p>
        ))}
      {s.cleanupPolicy && (
        <OperationalReview
          data={s}
          tasks={todo.data ?? []}
          items={items.data ?? []}
          stale={stale}
        />
      )}
      {v2(s) && <ObjectReviews items={items.data ?? []} />}
      <h3>Objetos del alcance</h3>
      <ul>
        {items.data?.map((i) => (
          <li key={i.id}>
            Referencia {i.id} ·{' '}
            {(
              {
                PENDING: 'Pendiente',
                RUNNING: 'En curso',
                RETRY_WAIT: 'Espera de reintento',
                MANUAL_REQUIRED: 'Intervención requerida',
                VERIFIED: 'Ausencia operativa verificada',
                PRESERVED: 'Conservado por revisión',
                RETAINED: 'Conservado por excepción',
              } as Record<string, string>
            )[i.status] ?? 'Estado no reconocido; sin acciones'}{' '}
            · Intentos: {i.attempts}/8.{' '}
            {i.retryAt ? 'Próxima fecha del servidor: ' + i.retryAt : ''}{' '}
            {i.errorCode
              ? (label(reasons, i.errorCode) ??
                'Pendiente de revisión autorizada')
              : ''}
          </li>
        ))}
      </ul>
      <h3>Tareas</h3>
      <ul>
        {todo.data?.map((t) => (
          <li key={t.id}>
            {label(tasks, t.kind.split(':')[0]) ??
              'Revisión autorizada pendiente'}{' '}
            · {t.dueAt ?? 'Sin fecha informada'} ·{' '}
            {t.status === 'RESOLVED'
              ? 'Resuelta'
              : t.status === 'ACKNOWLEDGED'
                ? 'Responsabilidad registrada'
                : 'Pendiente'}
          </li>
        ))}
      </ul>
      <p>
        Sustituciones registradas: {replacement.data?.length ?? 'sin consultar'}
        . No se muestran identidades de terceros ni se reabre el expediente
        restringido. La aportación del sustituto utiliza únicamente el nuevo
        expediente expresamente autorizado por backend.
      </p>
      <Field label="Acción administrativa">
        <select
          value={action}
          disabled={stale || send.blocked}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="">Selecciona una decisión</option>
          {options.map((a) => (
            <option key={a} value={a}>
              {labels[a]}
            </option>
          ))}
        </select>
      </Field>
      {action && options.includes(action) && (
        <PrivacyForm
          key={action}
          label="Revisar decisión"
          disabled={stale || send.blocked}
          onSubmit={async (form) => {
            const body: Record<string, unknown> = {}
            for (const [key, value] of form.entries()) {
              if (key !== 'confirm' && String(value)) body[key] = String(value)
            }
            if (body.ownerId && body.ownerId === body.deputyId)
              throw new ApiError(400, '', 'FORM_RESPONSIBLES')
            if (
              action === 'retention' &&
              body.category === 'OBJECT' &&
              !body.objectId
            )
              throw new ApiError(400, '', 'FORM_OBJECT')
            for (const key of ['reviewAt', 'expiresAt', 'horizonEndsAt']) {
              if (
                body[key] &&
                (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(
                  String(body[key]),
                ) ||
                  !Number.isFinite(Date.parse(String(body[key]))))
              )
                throw new ApiError(400, '', 'FORM_DATE')
            }
            if (action === 'retention') body.expectedRevision = s.revision
            else if (action !== 'restore') {
              body.expectedRevision = s.revision
              body.action = action
            }
            setDraft({
              op:
                action === 'retention'
                  ? 'retention-decisions'
                  : action === 'restore'
                    ? 'restore-policy'
                    : 'resolve',
              body,
            })
          }}
        >
          <p>
            {labels[action]}. No es aprobación comercial de la baja ni garantiza
            finalización. Reanudar no reinicia plazos, contadores ni permite más
            de ocho intentos.
          </p>
          {action !== 'retention' && (
            <Field label="Referencia UUID de evidencia custodiada">
              <input name="evidenceRef" required pattern={uuid.source} />
            </Field>
          )}
          {(fields[action] ?? []).map((name) => (
            <Field key={name} label={names[name]}>
              <input name={name} required pattern={uuid.source} />
            </Field>
          ))}
          {['CLASSIFY', 'OPEN_REPLACEMENT'].includes(action) && (
            <Field label="Adjunto del alcance revisado">
              <select name="attachmentId" required>
                <option value="">Selecciona</option>
                {items.data
                  ?.filter((i) => i.attachmentId && i.attempts === 0)
                  .map((i) => (
                    <option key={i.id} value={i.attachmentId!}>
                      {i.attachmentId}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {action === 'CLASSIFY' && (
            <Field label="Clasificación comprobada">
              <select name="classification" required>
                <option value="">Selecciona</option>
                <option value="DELETE">Eliminar el alcance revisado</option>
                <option value="KEEP">
                  Conservar sólo contenido ajeno acreditado
                </option>
                <option value="MIXED">
                  Mixto: requiere resolución/sustituto
                </option>
              </select>
            </Field>
          )}
          {action === 'ACKNOWLEDGE_TASK' && (
            <Field label="Tarea pendiente">
              <select name="taskId" required>
                <option value="">Selecciona</option>
                {todo.data
                  ?.filter((t) => t.status !== 'RESOLVED')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {label(tasks, t.kind.split(':')[0]) ?? 'Tarea pendiente'}{' '}
                      · {t.id}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {action === 'retention' && (
            <>
              <Field label="Categoría concreta">
                <select name="category">
                  <option value="OBJECT">Objeto</option>
                  <option value="CONTRACT">Aceptación contractual</option>
                  <option value="DATA_CONSENT">Consentimiento de datos</option>
                  <option value="AUDIT">Auditoría</option>
                  <option value="CONTACT">Contacto</option>
                </select>
              </Field>
              <Field label="Objeto afectado (UUID, obligatorio para categoría Objeto)">
                <select name="objectId">
                  <option value="">No corresponde a objeto</option>
                  {items.data?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Finalidad concreta">
                <textarea
                  name="purpose"
                  required
                  minLength={5}
                  maxLength={500}
                />
              </Field>
              <Field label="Fundamento concreto">
                <textarea name="basis" required minLength={5} maxLength={500} />
              </Field>
              <Field label="Vencimiento acreditado (ISO 8601; opcional)">
                <input
                  name="expiresAt"
                  placeholder="2026-11-01T12:00:00-06:00"
                />
              </Field>
            </>
          )}
          {['retention', 'restore'].includes(action) && (
            <Field label="Próxima revisión acreditada (ISO 8601 con zona)">
              <input
                name="reviewAt"
                required
                placeholder="2026-11-01T12:00:00-06:00"
              />
            </Field>
          )}
          {action === 'restore' && (
            <Field label="Fin del horizonte comprobado (ISO 8601; omite si desconocido)">
              <input name="horizonEndsAt" />
            </Field>
          )}
        </PrivacyForm>
      )}
      {draft && (
        <Modal
          title="Confirmar decisión administrativa"
          onClose={() => {
            if (!send.busy) setDraft(null)
          }}
        >
          <p>
            {labels[action]} · Folio {s.id} · Revisión{' '}
            {String(draft.body.expectedRevision ?? 'no exigida por DTO')}. Se
            enviará el contenido capturado, no cambios posteriores. Las
            referencias deben corresponder a evidencia verificada. No acredita
            borrado total.
          </p>
          <dl>
            {Object.entries(draft.body)
              .filter(([key]) => !['action', 'expectedRevision'].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {names[key] ??
                      (
                        {
                          evidenceRef: 'Referencia de evidencia',
                          attachmentId: 'Adjunto',
                          classification: 'Clasificación',
                          taskId: 'Tarea',
                          category: 'Categoría',
                          objectId: 'Objeto',
                          purpose: 'Finalidad',
                          basis: 'Fundamento',
                          reviewAt: 'Próxima revisión',
                          expiresAt: 'Vencimiento',
                          horizonEndsAt: 'Fin del horizonte',
                        } as Record<string, string>
                      )[key]}
                  </dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
          <PrivacyForm
            label="Confirmar decisión"
            disabled={
              stale ||
              send.blocked ||
              (draft.body.expectedRevision !== undefined &&
                draft.body.expectedRevision !== s.revision)
            }
            onSubmit={async () => {
              await send.send(draft.op, s.id, (key) =>
                deletion.command(key, s.id, draft.op, draft.body),
              )
              setDraft(null)
              setAction('')
            }}
          >
            <label>
              <input type="checkbox" required /> Confirmo esta decisión y sus
              consecuencias.
            </label>
          </PrivacyForm>
        </Modal>
      )}
      {send.canRetry && (
        <PrivacyForm
          label="Recuperar decisión original con misma clave"
          onSubmit={async () => {
            await send.retry()
            setDraft(null)
          }}
        >
          <p>
            Reenvío explícito del cuerpo original conservado sólo en memoria. No
            cambia plazos ni reinicia intentos.
          </p>
        </PrivacyForm>
      )}
      {s.confirmedAt && s.status !== 'PURGED' && (
        <section>
          <h3>Entrega de acceso privado asistido</h3>
          <p>
            Verifica el canal y custodia su evidencia por el procedimiento
            autorizado. Un 202 sólo acepta el envío; no prueba entrega ni crea
            sesión operativa. Ante respuesta perdida, consulta con el
            responsable antes de repetir: esta acción no tiene clave de
            idempotencia.
          </p>
          <PrivacyForm
            label="Enviar acceso al canal verificado"
            onSubmit={async (form) => {
              await deletion.access(s.id, {
                verifiedEmail: String(form.get('verifiedEmail')),
                evidenceRef: String(form.get('evidenceRef')),
              })
            }}
          >
            <Field label="Correo recién verificado">
              <input
                name="verifiedEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
              />
            </Field>
            <Field label="Referencia UUID de evidencia del canal">
              <input name="evidenceRef" pattern={uuid.source} required />
            </Field>
            <label>
              <input type="checkbox" required /> Confirmo que el canal fue
              verificado por el procedimiento autorizado.
            </label>
          </PrivacyForm>
        </section>
      )}
    </section>
  )
}
