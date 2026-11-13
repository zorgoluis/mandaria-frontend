import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { ProviderScope } from '../logistics/components'
import { Empty, ErrorState, Field, Loading, PageTitle } from '../components/ui'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { FleetGate } from './gate'
import { allows } from './permissions'
import { fleet } from './service'
import type { FleetFilters, FleetPage, Participation } from './types'

function uniqueParticipations(pages: FleetPage[]) {
  return [
    ...new Map(
      pages.flatMap((p) => p.items).map((item) => [item.assignmentId, item]),
    ).values(),
  ]
}
export function FleetServicesPage() {
  const { id } = useParams()
  const { user } = useAuth()
  return (
    <>
      <PageTitle
        title="Envíos de mi flotilla"
        description="Participación propia de los últimos 12 meses. El conductor toma directamente; no hay aprobación por envío."
      />
      <ProviderScope>
        {(scope) => (
          <FleetGate
            key={`${user?.id}:${scope.providerId}`}
            providerId={scope.providerId}
          >
            {(context) =>
              allows(context, 'canObserveServices') ? (
                <FleetHistory providerId={scope.providerId} dispatchId={id} />
              ) : (
                <p role="alert">Sin permiso de consulta.</p>
              )
            }
          </FleetGate>
        )}
      </ProviderScope>
    </>
  )
}
export function FleetHistory({
  providerId,
  dispatchId,
}: {
  providerId: string
  dispatchId?: string
}) {
  const { user } = useAuth()
  const [filters, setFilters] = useState<FleetFilters>({})
  const [generation, setGeneration] = useState(0)
  return (
    <>
      <p>
        La tarifa declarada no acredita ingresos liquidados, cobros, sueldos ni
        comisiones. Los estados son de asignación, no fases físicas.
      </p>
      <p>
        Para excepciones, utiliza el canal habitual de soporte Mandaria. No
        cambies la pareja durante un servicio activo.
      </p>
      {dispatchId && (
        <Link
          to={`/fleet-services?providerId=${encodeURIComponent(providerId)}`}
        >
          Volver a envíos de mi flotilla
        </Link>
      )}
      <form
        className="panel panel-body"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          const value: FleetFilters = {}
          for (const key of ['from', 'to'] as const) {
            const raw = String(data.get(key) || '')
            if (raw) value[key] = new Date(raw).toISOString()
          }
          for (const key of ['driverId', 'vehicleId'] as const) {
            const raw = String(data.get(key) || '').trim()
            if (raw) value[key] = raw
          }
          const status = String(
            data.get('status') || '',
          ) as FleetFilters['status']
          if (status) value.status = status
          setFilters(value)
          setGeneration((g) => g + 1)
        }}
      >
        <div className="filters">
          <Field label="Desde">
            <input name="from" type="datetime-local" />
          </Field>
          <Field label="Hasta">
            <input name="to" type="datetime-local" />
          </Field>
          <Field label="Estado de asignación">
            <select name="status">
              <option value="">Todos</option>
              {['ACTIVE', 'COMPLETED', 'CANCELLED', 'REASSIGNED'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="ID de conductor">
            <input name="driverId" pattern="[0-9a-fA-F-]{36}" />
          </Field>
          <Field label="ID de unidad">
            <input name="vehicleId" pattern="[0-9a-fA-F-]{36}" />
          </Field>
        </div>
        <button className="button">Aplicar filtros</button>
      </form>
      <HistoryResults
        key={`${user?.id}:${providerId}:${dispatchId}:${JSON.stringify(filters)}:${generation}`}
        providerId={providerId}
        dispatchId={dispatchId}
        filters={filters}
        generation={generation}
        refresh={() => setGeneration((g) => g + 1)}
      />
    </>
  )
}
function HistoryResults({
  providerId,
  dispatchId,
  filters,
  generation,
  refresh,
}: {
  generation: number
  providerId: string
  dispatchId?: string
  filters: FleetFilters
  refresh: () => void
}) {
  const { user } = useAuth()
  const client = useQueryClient()
  const query = useInfiniteQuery({
    queryKey: [
      'fleet',
      user?.id,
      providerId,
      'services',
      dispatchId,
      filters,
      generation,
    ],
    queryFn: ({ pageParam, signal }) =>
      fleet.services(providerId, filters, pageParam, dispatchId, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextPageToken ?? undefined,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    if (
      query.error instanceof ApiError &&
      [401, 403].includes(query.error.status)
    )
      client.removeQueries({ queryKey: ['fleet', user?.id, providerId] })
  }, [query.error, client, user?.id, providerId])
  return (
    <section className="panel panel-body">
      <button
        className="button secondary"
        disabled={query.isFetching}
        onClick={() => {
          client.removeQueries({
            queryKey: [
              'fleet',
              user?.id,
              providerId,
              'services',
              dispatchId,
              filters,
            ],
            exact: true,
          })
          refresh()
        }}
      >
        Refrescar historial
      </button>
      <p>
        Consulta HTTP, sin conexión en tiempo real. Páginas de 25; cursor válido
        por 5 minutos. Las altas concurrentes pueden desplazar registros:
        refresca para volver al inicio.
      </p>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <>
          <p role="alert">
            No se pudo actualizar. Si el cursor venció o cambió, refresca el
            historial. No se muestran datos anteriores.
          </p>
          <ErrorState error={query.error} retry={refresh} />
        </>
      ) : (
        <>
          <p>
            Última actualización del servidor:{' '}
            {date(query.data.pages.at(-1)!.serverTime)}
          </p>
          {uniqueParticipations(query.data.pages).length === 0 ? (
            <Empty
              title="Sin participaciones"
              description="No hay segmentos propios para estos filtros."
            />
          ) : (
            uniqueParticipations(query.data.pages).map((item) => (
              <Segment
                key={item.assignmentId}
                item={item}
                providerId={providerId}
                detail={!!dispatchId}
              />
            ))
          )}
          {query.hasNextPage && (
            <button
              className="button"
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
            >
              Cargar más
            </button>
          )}
        </>
      )}
    </section>
  )
}
function Segment({
  item,
  providerId,
  detail,
}: {
  item: Participation
  providerId: string
  detail: boolean
}) {
  return (
    <article className="panel panel-body">
      <h2>{item.reference}</h2>
      <Link
        to={`/fleet-assistance?new=1&providerId=${encodeURIComponent(providerId)}&dispatchId=${encodeURIComponent(item.dispatchId)}&assignmentId=${encodeURIComponent(item.assignmentId)}`}
      >
        Solicitar asistencia sobre esta participación
      </Link>
      <dl>
        <dt>Estado de asignación</dt>
        <dd>{item.status}</dd>
        <dt>Conductor histórico</dt>
        <dd>{item.driver.name ?? 'No disponible'}</dd>
        <dt>Unidad histórica</dt>
        <dd>{item.vehicle.identifier ?? 'No disponible'}</dd>
        <dt>Zona</dt>
        <dd>{item.zone.name}</dd>
        <dt>Asignado</dt>
        <dd>{date(item.assignedAt)}</dd>
        <dt>Fin de participación</dt>
        <dd>{item.endedAt ? date(item.endedAt) : 'Sin fecha de cierre'}</dd>
        <dt>Tarifa declarada</dt>
        <dd>
          {item.deliveryFee.amount} {item.deliveryFee.currency}
        </dd>
      </dl>
      {!detail ? (
        <Link
          to={`/fleet-services/${encodeURIComponent(item.dispatchId)}?providerId=${encodeURIComponent(providerId)}`}
        >
          Ver participación propia
        </Link>
      ) : (
        <>
          <h3>Hitos propios</h3>
          {item.events.length ? (
            <ul>
              {item.events.map((event, i) => (
                <li key={i}>
                  {event.kind} · Fase registrada {event.phase} ·{' '}
                  {date(event.recordedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin hitos registrados.</p>
          )}
          <h3>Incidencias resumidas</h3>
          {item.incidents.length ? (
            <ul>
              {item.incidents.map((incident) => (
                <li key={incident.id}>
                  {incident.resolvedAt
                    ? `Cierre registrado: ${date(incident.resolvedAt)}`
                    : 'Sin cierre registrado'}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin incidencias registradas.</p>
          )}
          <h3>Movimientos de créditos del proveedor</h3>
          <p>
            Movimientos del despacho; pueden repetirse entre segmentos. No se
            suman.
          </p>
          {item.credits.length ? (
            <ul>
              {item.credits.map((credit) => (
                <li key={credit.id}>
                  {credit.type} · {credit.amount} créditos ·{' '}
                  {date(credit.createdAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin movimientos informados.</p>
          )}
        </>
      )}
    </article>
  )
}
