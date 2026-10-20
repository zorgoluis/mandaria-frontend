import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Field, Modal } from '../components/ui'
import { deletion } from '../deletion/service'
import { useRead } from '../deletion/hooks'
import {
  snapshot,
  message as deletionMessage,
  uuid,
} from '../deletion/contract'
import { ImageRetentionStatus } from '../deletion/ImageRetentionStatus'
import { Form } from './common'
import { useCommand } from './hooks'
import type { VerificationCase } from './types'
export function CaseRetention({
  record,
  refreshing = false,
}: {
  record: VerificationCase
  refreshing?: boolean
}) {
  const { user } = useAuth()
  const admin = user?.role === 'SUPER_ADMIN'
  const plans = useRead(
    'image-plans-' + record.id,
    (signal) => deletion.list(signal),
    admin && !record.retention,
    true,
  )
  const command = useCommand()
  const [draft, setDraft] = useState<{
    expectedVersion: number
    evidenceRef: string
  } | null>(null)
  const matches = record.retention
    ? record.retention.plans.map((p) => snapshot(p))
    : (plans.data?.filter(
        (s) =>
          s.scope === 'IMAGE_RETENTION' &&
          s.imageRetention?.caseId === record.id,
      ) ?? [])
  const finalized = matches.some(
    (s) =>
      s.imageRetention?.reason === 'FINAL_REJECTION' ||
      s.confirmedAt ||
      s.irreversibleStarted,
  )
  const disabled =
    refreshing ||
    (!record.retention &&
      (plans.isPending || plans.isFetching || plans.isError)) ||
    command.blocked ||
    command.busy ||
    finalized ||
    record.status !== 'REJECTED'
  if (!user) return null
  return (
    <section className="panel panel-body" aria-label="Conservación documental">
      <h2>Conservación de imágenes</h2>
      <p>
        Los borradores elegibles y los rechazos confirmados como definitivos
        pueden tener un calendario de conservación de 30 días. Un rechazo
        ordinario no inicia por sí solo ese calendario.
      </p>
      <p>
        No se deducen fechas desde la última modificación. La eliminación no
        cierra tu cuenta ni elimina saldo o servicios comprometidos. Un
        expediente depurado no se reabre automáticamente.
      </p>
      {record.retention && (
        <p>
          {
            {
              RECORDED_CALENDAR: 'Calendario acreditado por el servidor.',
              NO_RELIABLE_ANCHOR:
                'Sin hito fiable registrado; las fechas se desconocen.',
              FINAL_REJECTION_UNCONFIRMED:
                'Rechazo sin confirmación definitiva; no existe fecha de inicio acreditada.',
              NOT_ELIGIBLE:
                'El estado del expediente no es elegible para este calendario.',
              NOT_DISCLOSED:
                'El seguimiento no está disponible para esta cuenta; no se infiere un hito ausente.',
              HISTORICAL_ONLY:
                'Sólo consta historia; no se deduce un calendario vigente.',
            }[record.retention.eligibility]
          }{' '}
          {!record.retention.executionEnabled &&
            'La ejecución automática está desactivada.'}
        </p>
      )}
      {(admin || record.retention) && (
        <>
          {!record.retention && plans.isPending && (
            <p role="status">Consultando calendario autorizado…</p>
          )}
          {!record.retention && plans.isError && (
            <p role="alert">{deletionMessage(plans.error)}</p>
          )}
          {matches.map((s) => (
            <div key={s.id}>
              <ImageRetentionStatus data={s} />
              <Link to={(admin ? '/admin' : '') + '/privacy/deletion/' + s.id}>
                Consultar seguimiento del calendario
              </Link>
            </div>
          ))}
          {record.retention?.historyTruncated && (
            <p>Se muestran los últimos 20 planes disponibles.</p>
          )}
        </>
      )}
      {admin ? (
        <>
          {record.status === 'REJECTED' && (
            <>
              <h3>Confirmación de rechazo definitivo</h3>
              <p>
                Confirma sólo cuando la revisión o apelación esté cerrada y
                exista evidencia custodiada. Se conserva el motivo comunicable
                de la decisión ordinaria. Esta acción fija el calendario de
                imágenes; no ordena borrado inmediato ni habilita operaciones.
              </p>
              {finalized && (
                <p>
                  Ya consta un plan definitivo o efectos iniciados. Consulta su
                  seguimiento; no prepares otra confirmación.
                </p>
              )}
              <Form
                label="Revisar rechazo definitivo"
                disabled={disabled}
                onSubmit={async (form) => {
                  setDraft({
                    expectedVersion: record.revision,
                    evidenceRef: String(form.get('evidenceRef')),
                  })
                }}
              >
                <Field label="Referencia UUID de evidencia del cierre de revisión o apelación">
                  <input name="evidenceRef" required pattern={uuid.source} />
                </Field>
              </Form>
            </>
          )}
        </>
      ) : !record.retention ? (
        <p>
          Las fechas individuales se consultan con el folio comunicado por el
          canal autorizado. El expediente no expone un calendario en esta
          consulta; no se interpreta como ausencia de obligaciones de
          conservación.
        </p>
      ) : null}
      <p>
        La aceptación del aviso por el proveedor de correo no acredita entrega
        ni lectura. Contactar, apelar o editar no garantiza detener la
        eliminación; las excepciones requieren revisión autorizada.
      </p>
      <Link to="/privacy/deletion">
        Consultar un folio o canal de aclaración
      </Link>
      {draft && (
        <Modal
          title="Confirmar rechazo definitivo"
          onClose={() => {
            if (!command.busy) setDraft(null)
          }}
        >
          <p>
            Expediente {record.id} · revisión {draft.expectedVersion}. Evidencia
            de cierre: {draft.evidenceRef}. El servidor fija el aviso y la
            eliminación prevista; no se borrarán imágenes desde esta pantalla.
          </p>
          {draft.expectedVersion !== record.revision && (
            <p role="alert">
              La revisión cambió. Cierra esta confirmación y revisa el
              expediente.
            </p>
          )}
          <Form
            label="Confirmar rechazo definitivo"
            disabled={disabled || draft.expectedVersion !== record.revision}
            onSubmit={async () => {
              if (disabled || draft.expectedVersion !== record.revision)
                throw Error('Consulta la revisión actual antes de confirmar.')
              await command.send(
                'FINAL_REJECTION',
                record.id,
                '/admin/verification-cases/' + record.id + '/final-rejection',
                draft,
              )
              setDraft(null)
            }}
          >
            <label>
              <input type="checkbox" required /> Acredito que la revisión o
              apelación terminó y confirmo el inicio del calendario de
              conservación.
            </label>
          </Form>
        </Modal>
      )}
    </section>
  )
}

export function CaseRetentionLookup({ caseId }: { caseId: string }) {
  const { user } = useAuth()
  const q = useRead(
    'case-retention-' + caseId,
    (signal) => deletion.byCase(caseId, signal),
    true,
    true,
  )
  return (
    <section aria-label="Seguimiento limitado de conservación">
      {q.isPending ? (
        <p>Consultando seguimiento…</p>
      ) : q.isError ? (
        <p>
          No hay seguimiento accesible en esta consulta. Conserva tu folio para
          el canal de privacidad.
        </p>
      ) : (
        q.data?.map((s) => (
          <div key={s.id}>
            <ImageRetentionStatus data={s} />
            <Link
              to={
                (user?.role === 'SUPER_ADMIN' ? '/admin' : '') +
                '/privacy/deletion/' +
                s.id
              }
            >
              Consultar seguimiento
            </Link>
          </div>
        ))
      )}
    </section>
  )
}
