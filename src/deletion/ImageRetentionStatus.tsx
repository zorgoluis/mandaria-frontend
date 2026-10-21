import { RetentionDetails } from './RetentionDetails'
import type { Snapshot } from './contract'
import { retentionMessage, utcDate } from './image-retention'
export function ImageRetentionStatus({
  data: s,
  receipt = false,
}: {
  data: Snapshot
  receipt?: boolean
}) {
  if (s.scope !== 'IMAGE_RETENTION') return null
  const p = s.imageRetention
  return (
    <section aria-label="Conservación de imágenes">
      <h3>
        Conservación de imágenes a 30 días
        {receipt ? ' · registro histórico' : ''}
      </h3>
      <p>{retentionMessage(s)}</p>
      {s.retentionDetails && (
        <p>
          Estado del aviso:{' '}
          {
            {
              PENDING: 'pendiente de aceptación acreditada',
              ACCEPTED: 'aceptado por el proveedor en plazo',
              BLOCKED: 'bloqueado por falta de aceptación en plazo',
              NOT_APPLICABLE: 'sin calendario aplicable',
            }[s.retentionDetails.noticeState]
          }
          .
        </p>
      )}
      {p ? (
        <>
          <p>
            Origen:{' '}
            {p.reason === 'FINAL_REJECTION'
              ? 'rechazo definitivo confirmado'
              : 'actividad material de un borrador elegible'}
            .
          </p>
          <dl>
            <dt>Fecha de origen acreditada</dt>
            <dd>{utcDate(p.anchorAt)}</dd>
            <dt>Aviso programado (día 23)</dt>
            <dd>{utcDate(p.noticeAt)}</dd>
            <dt>Aceptación por el proveedor de correo</dt>
            <dd>
              {p.noticeAcceptedAt
                ? utcDate(p.noticeAcceptedAt)
                : 'Sin aceptación acreditada; no se deduce entrega ni fallo.'}
            </dd>
            <dt>Eliminación prevista (día 30)</dt>
            <dd>{utcDate(p.dueAt)}</dd>
          </dl>
          <p>
            La aceptación del proveedor no acredita entrega ni lectura del
            destinatario. Las fechas se muestran en UTC.
          </p>
        </>
      ) : (
        <p>
          Calendario no informado. No se deduce abandono ni eliminación desde la
          última modificación del expediente.
        </p>
      )}
      <p>
        Se trata de imágenes del alcance revisado. No implica baja de cuenta,
        pérdida de saldo ni eliminación de todos los registros. Los servicios
        comprometidos y las restricciones actuales se mantienen independientes.
      </p>
      {s.retentionDetails && <RetentionDetails data={s.retentionDetails} />}
      {!s.retentionDetails && (
        <p>
          Una excepción requiere revisión autorizada. Este resumen no publica
          motivos privados ni acredita la vigencia de excepciones no informadas.
          Conserva el folio para aclaraciones por el canal asistido; contactar,
          apelar o editar no garantiza detener la eliminación.
        </p>
      )}
    </section>
  )
}
