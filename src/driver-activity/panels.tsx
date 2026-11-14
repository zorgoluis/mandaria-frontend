import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Gauge, PackageCheck, Timer } from 'lucide-react'
import { useAuth } from '../auth/context'
import { Panel, StatCard, SummaryList } from '../components/design'
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Pagination,
  Table,
} from '../components/ui'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { driverActivity, lastDays } from './service'
import { dayLabel, duration, money, outcomeLabels, percent } from './format'
import {
  deliveryOutcomes,
  type ActivityWindow,
  type DeliveryOutcome,
  type DriverAnalytics,
} from './types'
import './activity.css'

const periods = [7, 30, 90] as const

function ActivityError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  if (
    error instanceof ApiError &&
    [400, 404].includes(error.status) &&
    error.code !== 'DRIVER_NOT_FOUND'
  )
    return (
      <p className="panel-body" role="status">
        La actividad del conductor requiere la versión actualizada del backend.
      </p>
    )
  return <ErrorState error={error} retry={retry} />
}

/** SUPER_ADMIN: analytics and delivery history of one Driver, same range. */
export function DriverActivity({ driverId }: { driverId: string }) {
  const [days, setDays] = useState<(typeof periods)[number]>(30)
  // UTC days: the range only moves when the day or the period changes.
  const today = new Date().toISOString().slice(0, 10)
  const range = useMemo(
    () => lastDays(days, new Date(today + 'T00:00:00Z')),
    [days, today],
  )
  const selector = (
    <div className="tab-list" role="group" aria-label="Periodo">
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          className={`tab${p === days ? ' active' : ''}`}
          aria-pressed={p === days}
          onClick={() => setDays(p)}
        >
          {p} días
        </button>
      ))}
    </div>
  )
  return (
    <>
      <AnalyticsPanel
        driverId={driverId}
        range={range}
        days={days}
        selector={selector}
      />
      <HistoryPanel key={days} driverId={driverId} range={range} />
    </>
  )
}

function AnalyticsPanel({
  driverId,
  range,
  days,
  selector,
}: {
  driverId: string
  range: ActivityWindow
  days: number
  selector: ReactNode
}) {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['driver-activity', user!.id, driverId, 'analytics', range],
    queryFn: ({ signal }) => driverActivity.analytics(driverId, range, signal),
    retry: false,
  })
  return (
    <Panel
      title="Analítico"
      description={`Últimos ${days} días, por día de asignación (UTC)`}
      actions={selector}
    >
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ActivityError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Analytics data={query.data} />
      )}
    </Panel>
  )
}

function Analytics({ data }: { data: DriverAnalytics }) {
  const t = data.totals
  const amount = data.deliveredAmount.length
    ? data.deliveredAmount.map((a) => money(a.amount, a.currency)).join(' · ')
    : money('0', 'MXN')
  return (
    <div className="panel-body driver-activity">
      <div className="stat-grid">
        <StatCard
          title="Entregados"
          icon={PackageCheck}
          value={t.delivered}
          note={`${t.participations} servicios asignados`}
        />
        <StatCard
          title="Tasa de entrega"
          icon={Gauge}
          value={percent(data.deliveryRate)}
          note="Entregados entre servicios terminados"
        />
        <StatCard
          title="Asignación a entrega"
          icon={Timer}
          value={duration(data.avgAssignmentToDeliverySeconds)}
          note="Promedio de los entregados"
        />
        <StatCard
          title="Días con actividad"
          icon={CalendarDays}
          value={data.activeDays}
          note={`Último servicio: ${date(data.lastAssignedAt)}`}
        />
      </div>
      <DailyDelivered series={data.dailyDelivered} />
      <SummaryList
        items={[
          ['En curso', t.inProgress],
          ['Devueltos a origen', t.returned],
          ['Custodia transferida', t.transferred],
          ['Reasignados', t.reassigned],
          ['Liberados', t.released],
          ['Cancelados', t.cancelled],
          ['Importe cotizado entregado', amount],
        ]}
      />
      <p className="panel-note">
        El importe es el precio cotizado del envío, no la ganancia del
        conductor: no hay registro de pago al conductor.
      </p>
    </div>
  )
}

/** Single series: one brand bar per UTC day, native tooltip per bar. */
function DailyDelivered({
  series,
}: {
  series: DriverAnalytics['dailyDelivered']
}) {
  const max = Math.max(0, ...series.map((d) => d.delivered))
  const total = series.reduce((sum, d) => sum + d.delivered, 0)
  if (!series.length || !total)
    return (
      <Empty
        title="Sin entregas en este periodo"
        description="Las entregas aparecen aquí por día de asignación."
      />
    )
  return (
    <figure className="activity-chart">
      <figcaption>
        Entregados por día <span>máximo {max}</span>
      </figcaption>
      <ol
        aria-label={`${total} entregados del ${dayLabel(series[0].date)} al ${dayLabel(series[series.length - 1].date)}`}
      >
        {series.map((d) => (
          <li
            key={d.date}
            title={`${dayLabel(d.date)}: ${d.delivered} ${d.delivered === 1 ? 'entregado' : 'entregados'}`}
          >
            <span
              className={d.delivered ? 'activity-bar' : 'activity-bar empty'}
              style={{ height: `${(d.delivered / max) * 100}%` }}
            />
          </li>
        ))}
      </ol>
      <div className="activity-axis" aria-hidden="true">
        <span>{dayLabel(series[0].date)}</span>
        <span>{dayLabel(series[series.length - 1].date)}</span>
      </div>
    </figure>
  )
}

function HistoryPanel({
  driverId,
  range,
}: {
  driverId: string
  range: ActivityWindow
}) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [outcome, setOutcome] = useState<DeliveryOutcome | ''>('')
  const query = useQuery({
    queryKey: [
      'driver-activity',
      user!.id,
      driverId,
      'deliveries',
      range,
      outcome,
      page,
    ],
    queryFn: ({ signal }) =>
      driverActivity.deliveries(
        driverId,
        { ...range, page, outcome: outcome || undefined },
        signal,
      ),
    retry: false,
  })
  return (
    <Panel
      title="Historial de pedidos"
      description="Servicios que tuvo asignados, el más reciente primero"
      actions={
        <select
          aria-label="Resultado"
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value as DeliveryOutcome | '')
            setPage(1)
          }}
        >
          <option value="">Todos los resultados</option>
          {deliveryOutcomes.map((o) => (
            <option key={o} value={o}>
              {outcomeLabels[o]}
            </option>
          ))}
        </select>
      }
    >
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ActivityError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Table
            stacked
            rows={query.data.items.map((d) => ({ ...d, id: d.assignmentId }))}
            emptyTitle="Sin pedidos en este periodo"
            empty="Cambia el periodo o el resultado para ver otros servicios."
            columns={[
              {
                label: 'Pedido',
                render: (d) => (
                  <Link
                    to={`/delivery-requests/${encodeURIComponent(d.deliveryRequestPublicId)}`}
                  >
                    {d.deliveryRequestPublicId}
                  </Link>
                ),
              },
              {
                label: 'Resultado',
                render: (d) => (
                  <Badge value={d.outcome} label={outcomeLabels[d.outcome]} />
                ),
              },
              {
                label: 'Modalidad',
                render: (d) =>
                  d.mode === 'INDEPENDENT'
                    ? 'Independiente'
                    : `Flotilla · ${d.provider?.name ?? 'Proveedor'}`,
              },
              { label: 'Zona', render: (d) => d.serviceZone.name },
              {
                label: 'Importe cotizado',
                render: (d) =>
                  money(d.deliveryFee.amount, d.deliveryFee.currency),
              },
              {
                label: 'Vehículo',
                render: (d) =>
                  [d.vehicle.identifier, d.vehicle.plate]
                    .filter(Boolean)
                    .join(' · '),
              },
              { label: 'Asignado', render: (d) => date(d.assignedAt) },
              {
                label: 'Cierre',
                render: (d) =>
                  d.outcome === 'IN_PROGRESS'
                    ? 'En curso'
                    : date(d.deliveredAt ?? d.endedAt),
              },
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
    </Panel>
  )
}
