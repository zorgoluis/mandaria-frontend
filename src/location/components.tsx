import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, InfoGrid } from '../components/ui'
import { date } from '../utils/format'
import { useLocationPoll } from './poll'
import { locationService, sharedLocation } from './service'
import { decimal, terminalLocation, usableSample } from './snapshot'
import { captureTrackingFragment, takeTrackingToken } from './fragment'
import type { LocationView } from './types'
const reasons: Record<string, string> = {
  NO_ASSIGNMENT: 'Sin asignación vigente.',
  NO_SAMPLE: 'Sin señal GPS recibida.',
  NOT_VISIBLE: 'La ubicación todavía no está disponible para esta etapa.',
  LEGACY_UNSUPPORTED: 'Servicio legacy: no dispone de seguimiento GPS.',
  EXPIRED_SAMPLE: 'La última posición caducó.',
  TERMINAL: 'Servicio finalizado. GPS retirado.',
  TRACKING_DISABLED: 'El seguimiento GPS no está habilitado.',
}
export function LocationCard({
  view,
  now,
  recipient = false,
}: {
  view: LocationView
  now: number
  recipient?: boolean
}) {
  const sample = usableSample(view, now, recipient)
  const phase: Record<string, string> = {
    TO_PICKUP: 'En camino al origen',
    AT_PICKUP: 'En el origen',
    PICKED_UP: 'Mercancía recogida',
    TO_DROPOFF: 'En camino al destino',
    AT_DROPOFF: 'En el destino',
  }
  const outcomes: Record<string, string> = {
    DELIVERED: 'Entregado',
    RETURNED_TO_ORIGIN: 'Devuelto al origen',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Vencido',
  }
  return (
    <section className="panel location-panel" aria-label="Seguimiento GPS">
      <h2>Seguimiento · {view.publicId}</h2>
      <p>
        {view.progress.terminalOutcome
          ? (outcomes[view.progress.terminalOutcome.type] ??
            'Servicio finalizado')
          : (phase[view.progress.phase ?? ''] ??
            'Sin avance detallado disponible')}
      </p>
      {view.progress.attentionRequired && (
        <p className="notice">
          Requiere atención operativa. Ubicación no disponible durante la
          incidencia.
        </p>
      )}
      {sample ? (
        <>
          <InfoGrid
            items={[
              ['Posición', `${sample.latitude}, ${sample.longitude}`],
              ['Precisión', `${sample.accuracyMeters} m`],
              ['Última captura', date(sample.capturedAt)],
              [
                'Frescura',
                now <= Date.parse(sample.freshUntil) &&
                view.observation.freshness !== 'STALE'
                  ? 'Reciente'
                  : 'Desactualizada',
              ],
            ]}
          />
          <p>
            Ubicación aproximada de la última señal. No representa una ruta ni
            una hora de llegada.
          </p>
        </>
      ) : (
        <p>
          {terminalLocation(view)
            ? reasons.TERMINAL
            : (reasons[view.location.unavailableReason ?? ''] ??
              'Sin posición vigente autorizada.')}
        </p>
      )}
      <p className="muted">La ubicación no acredita entrega ni cobro.</p>
    </section>
  )
}
export function OwnerLocation({
  publicId,
  stop,
  publicVersion,
  attention = false,
}: {
  publicId: string
  stop: boolean
  publicVersion?: string
  attention?: boolean
}) {
  const read = useCallback(
    (signal: AbortSignal) => locationService.view(publicId, signal),
    [publicId],
  )
  const { view, error, now } = useLocationPoll(read, stop)
  if (stop)
    return (
      <section className="panel">
        <h2>Seguimiento GPS</h2>
        <p>Servicio finalizado. GPS retirado.</p>
      </section>
    )
  if (error)
    return (
      <section className="panel" role="status">
        <h2>Seguimiento GPS</h2>
        <p>
          Ubicación no disponible. Se respeta el tiempo de espera del servicio.
        </p>
      </section>
    )
  if (
    attention ||
    (view &&
      publicVersion &&
      decimal(publicVersion) &&
      BigInt(publicVersion) > BigInt(view.progress.publicVersion))
  )
    return (
      <section className="panel">
        <h2>Seguimiento GPS</h2>
        <p>
          {attention
            ? 'Requiere atención operativa. Ubicación retirada.'
            : 'El servicio cambió. Esperando una posición coherente con el estado actual.'}
        </p>
      </section>
    )
  return view ? <LocationCard view={view} now={now} /> : <Loading />
}
export function SharedTracking() {
  const [token, setToken] = useState(() => {
    if (window.location.hash) captureTrackingFragment()
    return takeTrackingToken()
  })
  useEffect(() => {
    const open = () => {
      captureTrackingFragment()
      setToken(takeTrackingToken())
    }
    const clear = () => setToken('')
    window.addEventListener('hashchange', open)
    window.addEventListener('pagehide', clear)
    return () => {
      window.removeEventListener('hashchange', open)
      window.removeEventListener('pagehide', clear)
    }
  }, [])
  return (
    <main className="shared-tracking">
      <Link to="/">Mandaria</Link>
      <h1>Seguimiento del envío</h1>
      {token ? (
        <SharedView key={token} token={token} />
      ) : (
        <p>
          Abre el enlace original para consultar el envío. El enlace no se
          conserva después de recargar.
        </p>
      )}
    </main>
  )
}
function SharedView({ token }: { token: string }) {
  const read = useCallback(
    (signal: AbortSignal) => sharedLocation(token, signal),
    [token],
  )
  const { view, error, now } = useLocationPoll(read)
  if (error)
    return (
      <p role="status">
        El enlace no está disponible en este momento. Puede haber caducado o
        perdido autorización.
      </p>
    )
  return view ? <LocationCard view={view} now={now} recipient /> : <Loading />
}
