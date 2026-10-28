import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, ChevronDown, Package, Truck } from 'lucide-react'
import { date } from '../utils/format'
import { ApiError } from '../services/errors'
import { LocationMap } from './LocationMap'
import { terminalLocation, usableSample } from './snapshot'
import type { LocationView } from './types'
import './shared-tracking.css'

export function PublicTrackingScreen({
  view,
  now,
  error,
  missing = false,
}: {
  view?: LocationView
  now: number
  error?: unknown
  missing?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const sample = view && !error ? usableSample(view, now, true) : null
  const stale =
    !!sample &&
    (now > Date.parse(sample.freshUntil) ||
      view?.observation.freshness === 'STALE')
  const freshness = sample ? (stale ? 'stale' : 'recent') : 'none'
  const denied =
    error instanceof ApiError && [401, 403, 404, 410].includes(error.status)
  const terminal = !!view && terminalLocation(view)
  const phases: Record<string, string> = {
    TO_PICKUP: 'En camino al origen',
    AT_PICKUP: 'En el origen',
    PICKED_UP: 'Mercancía recogida',
    TO_DROPOFF: 'En camino al destino',
    AT_DROPOFF: 'En el destino',
  }
  const outcomes: Record<string, string> = {
    DELIVERED: 'Entregado',
    RETURNED_TO_ORIGIN: 'Devuelto al origen',
    RETURNED: 'Devuelto al origen',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Vencido',
  }
  const state = view
    ? terminal
      ? (outcomes[
          view.progress.terminalOutcome?.type ?? view.progress.status
        ] ?? 'Servicio finalizado')
      : (phases[view.progress.phase ?? ''] ?? 'Sin avance detallado disponible')
    : ''
  const Icon =
    terminal && state === 'Entregado'
      ? Check
      : view?.progress.phase?.includes('DROPOFF')
        ? Truck
        : Package
  const unavailable = terminal
    ? 'Servicio finalizado. GPS retirado.'
    : view?.progress.attentionRequired
      ? 'Requiere atención operativa. Ubicación no disponible durante la incidencia.'
      : view?.location.unavailableReason === 'EXPIRED_SAMPLE' ||
          (view?.location.sample && !sample)
        ? 'La última posición caducó o ya no está autorizada.'
        : view?.progress.trackingMode === 'LEGACY'
          ? 'Este servicio no dispone de seguimiento GPS.'
          : 'Te mostraremos la posición cuando exista una señal autorizada para compartir.'
  return (
    <main className="public-tracking">
      <header className="tracking-header">
        <Link to="/" className="tracking-brand" aria-label="Mandaria, inicio">
          <span>
            <ArrowUpRight size={25} aria-hidden="true" />
          </span>
          mandaria.
        </Link>
        <h1>Seguimiento del envío</h1>
        <span className={`tracking-freshness ${freshness}`} role="status">
          <i aria-hidden="true" />
          {sample
            ? stale
              ? 'Señal desactualizada'
              : 'Señal reciente'
            : 'Sin señal'}
        </span>
      </header>
      {missing || error || !view ? (
        <div className="tracking-unavailable">
          <section className="tracking-card" role="status">
            <Package size={36} aria-hidden="true" />
            <h2>
              {missing
                ? 'Necesitas el enlace de seguimiento'
                : denied
                  ? 'Este enlace ya no está disponible'
                  : error
                    ? 'Seguimiento temporalmente no disponible'
                    : 'Consultando el envío…'}
            </h2>
            <p>
              {missing
                ? 'Abre el enlace original para consultar el envío. El enlace no se conserva después de recargar.'
                : denied
                  ? 'Pide un nuevo enlace a quien te lo compartió.'
                  : error
                    ? 'El enlace no está disponible en este momento. Se volverá a consultar respetando el tiempo de espera del servicio.'
                    : 'Estamos consultando la información autorizada.'}
            </p>
          </section>
        </div>
      ) : (
        <div className={`tracking-stage ${expanded ? 'expanded' : ''}`}>
          <div className={`tracking-map-area ${!sample ? 'no-signal' : ''}`}>
            {sample ? (
              <LocationMap
                key={view.location.assignmentGeneration}
                sample={sample}
                stale={stale}
                presentation="public"
              />
            ) : (
              <div className="tracking-map-empty" aria-hidden="true">
                <Package size={52} />
              </div>
            )}
          </div>
          {sample && (
            <div className="tracking-legend" aria-hidden="true">
              <span>
                <i />
                Última posición
              </span>
              <span>
                <i />
                Precisión aproximada
              </span>
            </div>
          )}
          <section
            className="tracking-card tracking-sheet"
            aria-label="Estado del envío"
          >
            <button
              className="tracking-sheet-toggle"
              aria-expanded={expanded}
              aria-controls="tracking-data"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="tracking-handle" />
              <span>
                {expanded ? 'Ocultar detalles' : 'Ver detalles del envío'}
                <ChevronDown size={16} />
              </span>
            </button>
            <div aria-live="polite" aria-atomic="true">
              <p className="tracking-kicker">Seguimiento · {view.publicId}</p>
              <div className="tracking-state">
                <span>
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h2>{state}</h2>
              </div>
            </div>
            <div id="tracking-data" className="tracking-details">
              {sample ? (
                <dl className="tracking-data">
                  <div className="wide">
                    <dt>Posición</dt>
                    <dd>
                      {sample.latitude}, {sample.longitude}
                    </dd>
                  </div>
                  <div>
                    <dt>Precisión</dt>
                    <dd>{sample.accuracyMeters} m</dd>
                  </div>
                  <div>
                    <dt>Frescura</dt>
                    <dd className={`tracking-freshness ${freshness}`}>
                      <i aria-hidden="true" />
                      {stale ? 'Desactualizada' : 'Reciente'}
                    </dd>
                  </div>
                  <div className="wide">
                    <dt>Última captura</dt>
                    <dd>{date(sample.capturedAt)}</dd>
                  </div>
                </dl>
              ) : (
                <div className="tracking-no-position" role="status">
                  <h3>
                    {terminal
                      ? 'Ubicación retirada'
                      : 'Aún no hay ubicación disponible'}
                  </h3>
                  <p>{unavailable}</p>
                </div>
              )}
              <div className="tracking-notes">
                <p>
                  Ubicación aproximada de la última señal. No representa una
                  ruta ni una hora de llegada.
                </p>
                <p>La ubicación no acredita entrega ni cobro.</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
