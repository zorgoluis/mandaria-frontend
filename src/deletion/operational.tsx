import { v2, operationalMessage, reviewResult } from './operational-contract'
import { useLocalNow } from './hooks'
import { known, type Snapshot, type WorkItem } from './contract'
import { date } from '../utils/format'

const when = (value?: string | null) =>
  value ? date(value) : 'No informado por el servidor'
export function OperationalStatus({
  data: s,
  receipt = false,
}: {
  data: Snapshot
  receipt?: boolean
}) {
  if (!s.cleanupPolicy) return null
  if (!known(s))
    return (
      <p role="alert">
        Política, autorización o estado no reconocido; sin acciones habilitadas.
      </p>
    )
  const current = operationalMessage(s)
  return (
    <section aria-label="Situación operativa vigente">
      <h3>
        {receipt
          ? 'Situación informada en esta constancia'
          : 'Situación operativa vigente'}
      </h3>
      {receipt && (
        <p>
          Constancia consultada al backend. Conserva esta fotografía separada
          del seguimiento; vuelve a consultar para conocer cambios posteriores.
        </p>
      )}
      {current && (
        <p role="status" className="notice">
          {current}
        </p>
      )}
      {s.closedAt && (
        <p>
          Se completaron las comprobaciones operativas el {when(s.closedAt)}.
          {s.incidentPending
            ? ' Existe una incidencia actual que sigue en revisión; el cierre histórico no acredita su resolución.'
            : ' Este cierre es histórico y no garantiza ausencia absoluta de reaparición.'}
        </p>
      )}
      {s.blockingReason === 'OBJECT_AUTHORIZATION_BLOCKED' && (
        <p>
          La autorización de una parte está bloqueada. Las otras partes
          legítimas conservan su propio estado.
        </p>
      )}
      {(s.status === 'CANCELLED' ||
        s.authorizationState === 'BLOCKED' ||
        s.incidentPending) && (
        <p>
          Esta situación no reactiva la cuenta, restaura documentos ni recupera
          permisos o asignaciones. Los efectos remotos ya enviados no se
          deshacen.
        </p>
      )}
      <dl>
        <dt>Política informada</dt>
        <dd>
          {v2(s)
            ? 'V2 · Comprobación operativa de residuos'
            : 'V1 · Evidencia histórica de sellado'}
        </dd>
        <dt>Última comprobación informada</dt>
        <dd>{when(s.lastReviewAt)}</dd>
        <dt>Próxima revisión programada</dt>
        <dd>
          {when(s.nextReviewAt)}. Una fecha programada no acredita ejecución.
        </dd>
        <dt>Fin de vigilancia informado</dt>
        <dd>{when(s.surveillanceEndsAt)}</dd>
      </dl>
      {s.complianceOverdue && (
        <p role="status" className="notice">
          Plazo de cumplimiento vencido; requiere intervención. No acredita
          finalización ni amplía el plazo.
        </p>
      )}
      <p>
        La consulta actual conserva los pendientes comunicados. Las constancias
        históricas no cambian; ninguna acredita eliminación total ni respaldos
        del proveedor.
      </p>
    </section>
  )
}
export function ObjectReviews({ items }: { items: WorkItem[] }) {
  const now = useLocalNow()
  return (
    <section aria-label="Revisiones operativas por objeto">
      <h3>Revisiones operativas por objeto</h3>
      {!items.length && (
        <p>
          No hay objetos comunicados para esta consulta. Esto no acredita
          eliminación total.
        </p>
      )}
      {items.map((i) => (
        <article key={i.id} className="panel panel-body">
          <h4>Objeto {i.id}</h4>
          <p>{reviewResult(i)}</p>
          <dl>
            <dt>Base B informada</dt>
            <dd>{when(i.baselineAt)}</dd>
            <dt>Paso de revisión informado</dt>
            <dd>
              {Number.isInteger(i.reviewStep) &&
              i.reviewStep! >= 0 &&
              i.reviewStep! <= 3
                ? `${i.reviewStep} de 3`
                : 'No reconocido'}
              . No es un historial de resultados.
            </dd>
            <dt>Última revisión ejecutada</dt>
            <dd>{when(i.lastReviewedAt)}</dd>
            <dt>Próxima revisión programada</dt>
            <dd>{when(i.nextReviewAt)}</dd>
            <dt>Verificación final F histórica</dt>
            <dd>{when(i.finalVerifiedAt)}</dd>
            <dt>Fin de vigilancia W</dt>
            <dd>{when(i.watchUntil)}</dd>
            <dt>Incidencia informada desde</dt>
            <dd>{when(i.incidentAt)}</dd>
            <dt>Ciclos de eliminación consumidos</dt>
            <dd>{i.attempts} de 8; no son los cinco intentos logísticos.</dd>
          </dl>
          {i.nextReviewAt && Date.parse(i.nextReviewAt) < now && (
            <p>
              La fecha prevista ya pasó según el reloj local; ejecución
              pendiente de confirmar con el servidor.
            </p>
          )}
          {i.watchUntil && Date.parse(i.watchUntil) <= now && (
            <p>
              La fecha de fin de vigilancia ya pasó. No se amplía
              automáticamente; cualquier actuación requiere autorización puntual
              del servidor.
            </p>
          )}
          {i.attempts >= 8 && (
            <p role="status">
              Presupuesto agotado; requiere intervención. No se ofrece un noveno
              intento ni reinicio.
            </p>
          )}
        </article>
      ))}
      <p>
        El contrato no entrega el historial completo de observaciones ni cada
        fecha programada. No se reconstruye el calendario en el navegador.
      </p>
    </section>
  )
}
