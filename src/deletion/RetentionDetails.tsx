import { utcDate } from './image-retention'
import type { RetentionDetailsData } from './retention-details'
const states: Record<string, string> = {
  ACTIVE: 'Vigente según el servidor',
  REVIEW_DUE: 'Revisión pendiente por vencimiento',
  EXPIRED: 'Vencida; no acredita eliminación',
}
const events: Record<string, string> = {
  IMAGE_RETENTION_STARTED: 'Inicio de eliminación',
  RETENTION_RECORDED: 'Excepción registrada',
  END_RETENTION: 'Fin de excepción',
  REVIEW_RETENTION: 'Revisión de excepción',
  CLOSED: 'Cierre operativo',
  CANCELLED: 'Plan cancelado',
  RESTRICTED: 'Restricciones aplicadas',
  H_OPERATIONAL_SCOPE: 'Cierre operativo comprobado',
}
export function RetentionDetails({ data }: { data: RetentionDetailsData }) {
  return (
    <section aria-label="Excepciones e historia de conservación">
      <h4>Excepciones de conservación</h4>
      {!data.exceptions.length && (
        <p>Sin excepciones registradas en esta consulta.</p>
      )}
      {data.exceptions.map((e) => (
        <article key={e.id}>
          <p>
            Alcance:{' '}
            {e.scope === 'LIMITED_DOCUMENT_IMAGES'
              ? 'Imágenes delimitadas'
              : 'Datos delimitados del procedimiento'}
            .
          </p>
          <p>{e.publicReason}</p>
          <p>{states[e.state]}</p>
          <dl>
            <dt>Próxima revisión registrada (UTC)</dt>
            <dd>{utcDate(e.reviewAt)}</dd>
            <dt>Vencimiento registrado (UTC)</dt>
            <dd>{utcDate(e.expiresAt)}</dd>
          </dl>
          {e.administrative && (
            <details>
              <summary>Fundamento administrativo privado</summary>
              <p>Finalidad: {e.administrative.purpose}</p>
              <p>Fundamento: {e.administrative.basis}</p>
              <p>Responsable: {e.administrative.ownerId}</p>
            </details>
          )}
        </article>
      ))}
      {!!data.history.length && (
        <>
          <h4>Historia del procedimiento</h4>
          <ul>
            {data.history.map((e, i) => (
              <li key={i}>
                {events[e.kind] ?? 'Hito documental'} · {utcDate(e.recordedAt)}
              </li>
            ))}
          </ul>
          <p>
            La historia no sustituye el estado actual ni acredita eliminación
            total.
          </p>
        </>
      )}
      {data.historyTruncated && (
        <p>Se muestran los últimos 20 hitos disponibles.</p>
      )}
    </section>
  )
}
