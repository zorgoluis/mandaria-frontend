import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Coins,
  PackageCheck,
  PackageX,
  Bike,
  PlugZap,
  Download,
} from 'lucide-react'
import {
  PageTitle,
  Field,
  Table,
  Pagination,
  Loading,
  ErrorState,
  Badge,
} from '../components/ui'
import { Panel, StatCard } from '../components/design'
import { useAuth } from '../auth/context'
import {
  reports,
  initialFilters,
  validReportRange,
  type ReportFilters,
  type Report,
  type DriverRow,
  type Money,
} from './service'
import './reports.css'

const money = (values: Money[]) =>
  values.length
    ? values
        .map(
          (m) =>
            `${Number(m.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${m.currency}`,
        )
        .join(' · ')
    : 'Sin importes'
const instant = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Sin registro'
const duration = (s: number) =>
  `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
const category = (c: string) =>
  ({
    FLEET: 'Flotilla',
    INDEPENDENT: 'Independiente',
    NONE: 'Sin categoría',
    REVIEW_REQUIRED: 'En revisión',
  })[c] ?? c

export function ReportsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<ReportFilters>(() => initialFilters())
  const [draft, setDraft] = useState(filters)
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<unknown>(null)
  const admin = user?.role === 'SUPER_ADMIN'
  const options = useQuery({
    queryKey: ['admin-report-options'],
    queryFn: ({ signal }) => reports.options(signal),
    enabled: admin,
  })
  const query = useQuery({
    queryKey: ['admin-reports', user?.id, filters],
    queryFn: ({ signal }) => reports.get(filters, signal),
    enabled: admin,
  })
  if (!admin)
    return (
      <PageTitle
        title="Reportes administrativos"
        description="Esta sección está disponible para administración general."
      />
    )
  function apply(e: FormEvent) {
    e.preventDefault()
    if (!validReportRange(draft.from, draft.to)) {
      setMessage(
        'Elige fechas válidas, en orden, con un máximo de un año calendario.',
      )
      return
    }
    setMessage('')
    setExportError(null)
    setFilters({ ...draft, page: 1 })
  }
  function change(key: keyof ReportFilters, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
  }
  async function download() {
    setExporting(true)
    setExportError(null)
    try {
      const file = await reports.export(filters)
      const url = URL.createObjectURL(
        new Blob([file.content], { type: 'text/csv;charset=utf-8' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setExportError(e)
    } finally {
      setExporting(false)
    }
  }
  function focus(driver: DriverRow) {
    const next = {
      ...filters,
      driverId: driver.id,
      search: '',
      activity: 'ALL',
      page: 1,
    }
    setFilters(next)
    setDraft(next)
  }
  return (
    <>
      <PageTitle
        title="Reportes administrativos"
        description="Viajes, puntos y actividad de conductores. Hasta un año por consulta, en horario de México."
        action={
          <button
            className="button secondary"
            disabled={!query.data || query.isFetching || exporting}
            onClick={() => void download()}
          >
            <Download size={18} />
            {exporting ? 'Preparando…' : 'Descargar CSV completo'}
          </button>
        }
      />
      <Panel
        title="Periodo y alcance"
        description="Desde y hasta incluyen el día completo. Cada movimiento cuenta en la fecha en que ocurrió."
      >
        <form className="report-filters panel-body" onSubmit={apply}>
          <Field label="Desde">
            <input
              type="date"
              required
              value={draft.from}
              onChange={(e) => change('from', e.target.value)}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              required
              value={draft.to}
              onChange={(e) => change('to', e.target.value)}
            />
          </Field>
          <Field label="Zona">
            <select
              value={draft.zoneId ?? ''}
              onChange={(e) => change('zoneId', e.target.value)}
            >
              <option value="">Todas las zonas</option>
              {options.data?.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de operación">
            <select
              value={draft.mode ?? ''}
              onChange={(e) => change('mode', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="INDEPENDENT">Independientes</option>
              <option value="FLEET">Flotillas</option>
            </select>
          </Field>
          <Field label="Flotilla">
            <select
              value={draft.providerId ?? ''}
              onChange={(e) => change('providerId', e.target.value)}
            >
              <option value="">Todas las flotillas</option>
              {options.data?.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agrupar gráfica">
            <select
              value={draft.groupBy ?? 'day'}
              onChange={(e) => change('groupBy', e.target.value)}
            >
              <option value="day">Por día</option>
              <option value="month">Por mes</option>
            </select>
          </Field>
          <Field
            label="Nombre del conductor"
            hint="Filtra la tabla de conductores, no los totales generales."
          >
            <input
              value={draft.search ?? ''}
              maxLength={100}
              onChange={(e) => change('search', e.target.value)}
            />
          </Field>
          <Field label="Actividad del conductor">
            <select
              value={draft.activity ?? 'ALL'}
              onChange={(e) => change('activity', e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="NO_ACTIVITY">Sin actividad en servicios</option>
              <option value="CONNECTED_NO_SERVICES">
                Conectados en el periodo, sin asignaciones
              </option>
              <option value="NO_SERVICES">
                Sin asignaciones en el periodo
              </option>
              <option value="NO_DELIVERIES">Sin entregas en el periodo</option>
              <option value="NEVER">Nunca ha tenido servicios</option>
              <option value="NO_CONNECTIONS">
                Sin conexión observada (historial completo)
              </option>
              <option value="CONNECTED">Conectados ahora</option>
              <option value="DISCONNECTED">No conectados ahora</option>
            </select>
          </Field>
          <div className="report-actions">
            <button className="button" type="submit">
              Consultar
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                const f = initialFilters()
                setDraft({
                  ...f,
                  from: f.to.slice(0, 4) + '-01-01',
                  groupBy: 'month',
                })
              }}
            >
              Este año
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                const f = initialFilters()
                setDraft(f)
                setFilters(f)
                setMessage('')
              }}
            >
              Restablecer
            </button>
          </div>
          {message && <p role="alert">{message}</p>}
        </form>
        {options.error && (
          <ErrorState
            error={options.error}
            retry={() => void options.refetch()}
          />
        )}
      </Panel>
      {exportError && <ErrorState error={exportError} />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <ReportContent
            data={query.data}
            filters={filters}
            focus={focus}
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )
      )}
    </>
  )
}
function ReportContent({
  data: r,
  filters,
  focus,
  onPage,
}: {
  data: Report
  filters: ReportFilters
  focus: (d: DriverRow) => void
  onPage: (p: number) => void
}) {
  const complete = r.coverage.complete,
    available = r.coverage.available
  const observed = (d: DriverRow, n: number) =>
    !available
      ? 'Sin datos'
      : `${n}${d.connection_history_complete ? '' : ' (parcial)'}`
  const numeric = (key: string) => r.totals[key] ?? 'No aplica'
  const pages = Math.ceil(
    Math.max(r.drivers.total, r.creditAccounts.total) / r.drivers.pageSize,
  )
  return (
    <>
      <p className="report-context">
        Periodo consultado: {r.from} al {r.to} · Actualizado: {instant(r.asOf)}
        {filters.driverId ? ' · Un conductor seleccionado' : ''}
      </p>
      {!complete && (
        <div className="report-notice" role="status">
          <strong>
            {available
              ? 'Historial de conexiones parcial'
              : 'Sin datos históricos de conexiones'}
          </strong>
          <p>
            El registro comienza el {instant(r.coverage.since)}. Los conteos
            muestran sólo lo observado desde entonces. Un cero parcial no
            significa que nunca se conectó.
          </p>
        </div>
      )}
      <div className="stat-grid">
        <StatCard
          title="Viajes entregados"
          icon={PackageCheck}
          value={numeric('delivered')}
          note="Cada servicio se cuenta una vez."
        />
        <StatCard
          title={
            filters.driverId ? 'Viajes tomados/asignados' : 'Viajes tomados'
          }
          icon={Bike}
          value={numeric('taken')}
          note={`${r.totals.takeEvents} adjudicaciones; una nueva toma puede ser del mismo viaje.`}
        />
        <StatCard
          title="Viajes soltados"
          icon={PackageX}
          value={numeric('releasedTrips')}
          note={`${r.totals.releaseEvents} liberaciones en el periodo.`}
        />
        <StatCard
          title="Puntos consumidos netos"
          icon={Coins}
          value={r.points.net}
          note={`${r.points.consumed} consumidos − ${r.points.refunded} devueltos.`}
        />
      </div>
      <Panel
        title="Resumen de operación"
        description="Los totales usan fechas de cada evento; no forman una suma de estados de las solicitudes creadas en el periodo."
      >
        <dl className="report-summary panel-body">
          <div>
            <dt>Solicitudes generadas</dt>
            <dd>{numeric('requested')}</dd>
          </div>
          <div>
            <dt>Búsquedas abiertas</dt>
            <dd>{numeric('opened')}</dd>
          </div>
          <div>
            <dt>Canceladas</dt>
            <dd>{numeric('cancelled')}</dd>
          </div>
          <div>
            <dt>Devueltas a origen</dt>
            <dd>{numeric('returned')}</dd>
          </div>
          <div>
            <dt>Participaciones asignadas</dt>
            <dd>{numeric('assigned')}</dd>
          </div>
          <div>
            <dt>Pendientes ahora (sin filtro de fecha)</dt>
            <dd>{numeric('pendingNow')}</dd>
          </div>
          <div>
            <dt>Importe de envíos entregados</dt>
            <dd>{money(r.amounts)}</dd>
          </div>
          <div>
            <dt>Cobros declarados en los flujos que los registran</dt>
            <dd>{money(r.declaredCollections)}</dd>
          </div>
          <div>
            <dt>Puntos recargados</dt>
            <dd>{r.points.recharged}</dd>
          </div>
          <div>
            <dt>Ajustes de puntos</dt>
            <dd>{r.points.adjusted}</dd>
          </div>
        </dl>
        <p className="panel-body">
          El importe incluye los recargos congelados de horario y lluvia;
          excluye mercancía. No representa utilidad neta ni pago al conductor.
          Los cobros declarados no acreditan conciliación bancaria. Los puntos
          no equivalen a pesos.
        </p>
        {(filters.driverId || filters.providerId || filters.mode) && (
          <p className="panel-body">
            Las solicitudes y búsquedas se generan antes de tener ejecutor: esos
            dos indicadores no aplican al filtrar por conductor, flotilla o
            tipo.
          </p>
        )}
      </Panel>
      <Panel
        title="Evolución de la operación"
        description="Compara viajes, puntos e importes por la fecha de cada movimiento en horario de México."
      >
        <DeliveryChart series={r.series} />
        <details className="panel-body">
          <summary>
            Ver datos por {r.groupBy === 'month' ? 'mes' : 'día'}
          </summary>
          <Table
            stacked
            rows={r.series.map((s) => ({ ...s, id: s.day }))}
            columns={[
              { label: 'Fecha', render: (d) => d.day },
              { label: 'Generados', render: (d) => d.requested },
              { label: 'Tomados', render: (d) => d.taken },
              { label: 'Entregados', render: (d) => d.delivered },
              { label: 'Liberaciones', render: (d) => d.releases },
              { label: 'Cancelados', render: (d) => d.cancelled },
              { label: 'Puntos netos', render: (d) => d.net_points },
              { label: 'Importes', render: (d) => money(d.amounts) },
            ]}
          />
          <p>
            Los viajes tomados son únicos dentro de cada día/mes; un viaje
            retomado en dos fechas aparece en ambas, pero una sola vez en el
            total del periodo.
          </p>
        </details>
      </Panel>
      <Panel
        className="report-table"
        title="Conductores y actividad"
        description="Ordenados por entregas y después por asignaciones. Conectado ahora indica disponibilidad declarada operativa, no presencia física. Categoría y flotilla son actuales."
      >
        <p className="panel-body">
          {r.drivers.counts.population} conductores ·{' '}
          {r.drivers.counts.noServices} sin asignaciones ·{' '}
          {r.drivers.counts.noDeliveries} sin entregas ·{' '}
          {r.drivers.counts.neverAssigned} nunca asignados ·{' '}
          {r.drivers.counts.connectedNow} conectados ahora.
        </p>
        <Table
          stacked
          rows={r.drivers.items}
          columns={[
            {
              label: 'Conductor',
              render: (d) => (
                <>
                  <strong>{d.name}</strong>
                  <small className="report-line">
                    {category(d.category)}
                    {d.provider_name ? ' · ' + d.provider_name : ''}
                  </small>
                  <small className="report-line">
                    Alta: {instant(d.createdAt)}
                  </small>
                  <button
                    className="button secondary small"
                    onClick={() => focus(d)}
                  >
                    Ver sólo este conductor
                  </button>
                </>
              ),
            },
            {
              label: 'Ahora',
              render: (d) => (
                <>
                  <Badge value={d.connected ? 'AVAILABLE' : 'OFFLINE'} />
                  <small className="report-line">
                    <Badge value={d.status} />
                  </small>
                </>
              ),
            },
            {
              label: 'Viajes',
              render: (d) => (
                <>
                  {d.delivered} entregados
                  <small className="report-line">
                    {d.assigned} asignaciones · {d.active_days} días con
                    asignación
                  </small>
                  <small className="report-line">
                    {d.released} participaciones soltadas · {d.cancelled}{' '}
                    canceladas mientras participaba
                  </small>
                  <small className="report-line">
                    {d.returned} devueltas · {d.transferred} transferidas ·{' '}
                    {d.reassigned} reasignadas
                  </small>
                </>
              ),
            },
            { label: 'Importe de envíos', render: (d) => money(d.amounts) },
            {
              label: 'Conexiones',
              render: (d) => (
                <>
                  {observed(d, d.connections)}
                  <small className="report-line">
                    Tiempo observado:{' '}
                    {available ? duration(d.online_seconds) : 'Sin datos'}
                  </small>
                  <small className="report-line">
                    Última: {instant(d.last_connection)}
                  </small>
                </>
              ),
            },
            {
              label: 'Inicios de sesión',
              render: (d) => (
                <>
                  {observed(d, d.logins)}
                  <small className="report-line">
                    Último: {instant(d.last_login)}
                  </small>
                </>
              ),
            },
            {
              label: 'Seguimiento',
              render: (d) => (
                <>
                  {d.never_assigned
                    ? 'Nunca ha tenido servicios'
                    : d.assigned === 0
                      ? 'Sin asignaciones en el periodo'
                      : 'Con actividad'}
                  <small className="report-line">
                    Última asignación: {instant(d.last_assigned)}
                  </small>
                </>
              ),
            },
          ]}
        />
        <p className="panel-body">
          Las últimas fechas abarcan todo el historial. Las participaciones
          soltadas de flotilla también pueden ser desasignaciones: no equivalen
          siempre a liberar el viaje. Iniciar sesión no equivale a ponerse
          disponible; el conteo de inicios es por conductor, sin desglose de
          zona. Con filtro de zona, se incluyen conductores vinculados a ella
          por selección actual o actividad registrada.
        </p>
      </Panel>
      <Panel
        className="report-table"
        title="Puntos por titular"
        description="Las flotillas consumen puntos de su cuenta; no se repiten como consumo de cada conductor. El filtro de nombre/actividad sólo afecta la tabla anterior."
      >
        <Table
          stacked
          rows={r.creditAccounts.items}
          columns={[
            {
              label: 'Titular',
              render: (d) => (
                <>
                  {d.name}
                  <small className="report-line">
                    {d.kind === 'PROVIDER' ? 'Flotilla' : 'Independiente'}
                  </small>
                </>
              ),
            },
            { label: 'Consumidos', render: (d) => d.consumed },
            { label: 'Devueltos', render: (d) => d.refunded },
            { label: 'Consumo neto', render: (d) => d.net },
            { label: 'Recargados', render: (d) => d.recharged },
            { label: 'Ajustes', render: (d) => d.adjusted },
          ]}
        />
        {filters.zoneId && (
          <p className="panel-body">
            Al filtrar por zona sólo se incluyen movimientos vinculados a un
            servicio de esa zona. Las recargas y ajustes sin servicio no se
            atribuyen a una zona.
          </p>
        )}
      </Panel>
      <Pagination
        page={r.drivers.page}
        totalPages={pages}
        total={Math.max(r.drivers.total, r.creditAccounts.total)}
        onPage={onPage}
      />
      <p className="report-context">
        <PlugZap size={16} /> Las conexiones se registran sin contar los cambios
        disponible/ocupado como una nueva conexión. La descarga incluye todas
        las páginas filtradas.
      </p>
    </>
  )
}
function DeliveryChart({ series }: { series: Report['series'] }) {
  const [metric, setMetric] = useState('delivered')
  const currencies = [
    ...new Set(series.flatMap((s) => s.amounts.map((m) => m.currency))),
  ]
  const labels: Record<string, string> = {
    delivered: 'Entregas',
    requested: 'Solicitudes generadas',
    taken: 'Viajes tomados',
    releases: 'Liberaciones',
    cancelled: 'Cancelaciones',
    net_points: 'Puntos netos',
  }
  const values = series.map((s) =>
    metric.startsWith('money:')
      ? Number(
          s.amounts.find((m) => m.currency === metric.slice(6))?.amount ?? 0,
        )
      : Number(s[metric as keyof typeof s] ?? 0),
  )
  const high = Math.max(0, ...values),
    low = Math.min(0, ...values),
    span = high - low || 1
  const width = 900,
    height = 170,
    slot = width / Math.max(1, series.length),
    y = (n: number) => ((high - n) / span) * height
  const label = labels[metric] ?? `Importe de envíos (${metric.slice(6)})`
  return (
    <div className="report-chart panel-body">
      <Field label="Indicador de la gráfica">
        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {Object.entries(labels).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
          {currencies.map((c) => (
            <option key={c} value={'money:' + c}>
              Importe de envíos ({c})
            </option>
          ))}
        </select>
      </Field>
      <p>
        {label} · Mínimo: {low.toLocaleString('es-MX')} · Máximo:{' '}
        {high.toLocaleString('es-MX')}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} por fecha; consulta los valores exactos en Ver datos`}
      >
        <line x1="0" y1={y(0)} x2={width} y2={y(0)} />
        {series.map((s, i) => (
          <rect
            key={s.day}
            x={i * slot}
            y={Math.min(y(0), y(values[i]))}
            width={Math.max(0.5, slot - 2)}
            height={Math.abs(y(values[i]) - y(0))}
          >
            <title>
              {s.day}: {values[i].toLocaleString('es-MX')} {label}
            </title>
          </rect>
        ))}
      </svg>
      <div className="report-chart-labels">
        <span>{series[0]?.day}</span>
        <span>{series.at(-1)?.day}</span>
      </div>
    </div>
  )
}
