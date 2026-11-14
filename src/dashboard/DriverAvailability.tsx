import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff } from 'lucide-react'
import { Panel, StatCard, SummaryList } from '../components/design'
import { ErrorState, Loading } from '../components/ui'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import {
  driverAvailability,
  type DriverAvailabilitySummary,
} from '../drivers/availability'
import './driver-availability.css'

/** SUPER_ADMIN dashboard: who is connected right now, by declared availability. */
export function DriverAvailabilityPanel() {
  const query = useQuery({
    queryKey: ['driver-availability-summary'],
    queryFn: ({ signal }) => driverAvailability.summary(signal),
    refetchInterval: 30000,
    retry: false,
  })
  const source = 'Según la disponibilidad que declara cada conductor'
  return (
    <Panel
      title="Conductores ahora"
      description={query.data ? `${source} · ${date(query.data.asOf)}` : source}
    >
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        query.error instanceof ApiError &&
        [400, 404].includes(query.error.status) ? (
          <p className="panel-body" role="status">
            El conteo de conductores conectados requiere la versión actualizada
            del backend.
          </p>
        ) : (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        )
      ) : (
        <Counts data={query.data} />
      )}
    </Panel>
  )
}

function Counts({ data }: { data: DriverAvailabilitySummary }) {
  const split = (group: { connected: number; disconnected: number }) =>
    `${group.connected} conectados · ${group.disconnected} no conectados`
  return (
    <div className="panel-body driver-availability">
      <div className="stat-grid">
        <StatCard
          title="Conectados"
          icon={Wifi}
          value={data.connected}
          note={`${data.byAvailability.available} disponibles · ${data.byAvailability.busy} en servicio`}
        />
        <StatCard
          title="No conectados"
          icon={WifiOff}
          value={data.disconnected}
          note={
            data.expiredConnections
              ? `Fuera de línea · ${data.expiredConnections} con turno vencido`
              : 'Fuera de línea'
          }
        />
      </div>
      <SummaryList
        items={[
          ['Flotilla', split(data.byMembership.fleet)],
          ['Independientes', split(data.byMembership.independent)],
          [
            'Fuera del conteo',
            `${data.excluded.total} no operativos (suspendidos, pendientes o en baja)`,
          ],
        ]}
      />
    </div>
  )
}
