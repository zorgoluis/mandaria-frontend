import { Link } from 'react-router-dom'
import { ArrowRight, Package, UserRound } from 'lucide-react'
import { ErrorState, Pagination } from '../components/ui'
import { date } from '../utils/format'
import type { ReactNode } from 'react'
import type { Page } from '../types/api'
import type { DeliveryRequestResponse } from './contract'
import type { Capabilities } from './service'
import './quote.css'
import './shipments.css'
const labels = { CREATED: 'Creada', CANCELLED: 'Cancelada' }
export function MyShipments({
  capabilities,
  activeRequest,
  items,
  loading,
  error,
  blocked,
  onPage,
  children,
}: {
  activeRequest?: DeliveryRequestResponse
  capabilities?: Capabilities
  items?: Page<DeliveryRequestResponse>
  loading: boolean
  error?: unknown
  blocked: boolean
  onPage: (page: number) => void
  children?: ReactNode
}) {
  const activeId = capabilities?.capacity.occupied
    ? capabilities.capacity.activeRequestPublicId
    : null
  const active =
    items?.items.find((item) => item.publicId === activeId) ??
    (activeRequest?.publicId === activeId ? activeRequest : undefined)
  const canQuote = !!capabilities?.canPrequote && !blocked && !activeId
  const empty = !!items && items.items.length === 0 && !loading && !error
  const limit = capabilities?.capacity.maxActiveRequests
  const quoteLink = (
    <Link className="button" to="/customer/new">
      Cotizar envío
    </Link>
  )
  return (
    <section className="quote-page shipments-page" aria-label="Mis envíos">
      <header className="quote-header">
        <div>
          <h1>Mis envíos</h1>
          {capabilities && (
            <p>
              {capabilities.type === 'PERSONAL' ? 'Personal' : 'Negocio'}:{' '}
              {limit === null
                ? 'múltiples solicitudes activas'
                : limit === 1
                  ? 'una solicitud activa'
                  : `hasta ${limit} solicitudes activas`}
              . Activas: {capabilities.capacity.activeCount}. Consultar
              capacidad no reserva disponibilidad.
            </p>
          )}
        </div>
        <Link className="shipments-profile" to="/customer/profile">
          <UserRound size={18} aria-hidden="true" />
          Perfil cliente
        </Link>
      </header>
      {children}
      {activeId ? (
        <section className="shipments-active" aria-label="Solicitud activa">
          <div className="shipments-active-info">
            <span className="shipments-package" aria-hidden="true">
              <Package size={26} />
            </span>
            <div>
              <span>Solicitud activa</span>
              <strong>{activeId}</strong>
              {active && (
                <p>
                  {labels[active.status]} · {date(active.requestedAt)}
                </p>
              )}
            </div>
          </div>
          <Link
            to={`/customer/requests/${activeId}`}
            className="shipments-continue"
          >
            Continuar solicitud activa{' '}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      ) : canQuote && !empty ? (
        <div className="shipments-create">{quoteLink}</div>
      ) : capabilities && !canQuote ? (
        <p>No se puede iniciar otra solicitud en este momento.</p>
      ) : null}
      <section className="shipments-card" aria-label="Listado de solicitudes">
        {loading ? (
          <div
            className="shipments-loading"
            role="status"
            aria-label="Cargando envíos"
          >
            <span className="shipments-sr">Cargando envíos…</span>
            {[0, 1, 2].map((n) => (
              <div className="shipments-skeleton" key={n} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} />
        ) : empty ? (
          <div className="shipments-empty">
            <span className="shipments-package" aria-hidden="true">
              <Package size={28} />
            </span>
            <h2>Aún no tienes envíos</h2>
            <p>
              {canQuote
                ? 'Cotiza tu primer envío para empezar.'
                : 'Tus solicitudes aparecerán aquí cuando estén disponibles.'}
            </p>
            {canQuote && quoteLink}
          </div>
        ) : items ? (
          <>
            <table
              className="shipments-table"
              role="table"
              aria-label="Mis solicitudes"
            >
              <thead>
                <tr role="row">
                  <th scope="col">Solicitud</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">
                    <span className="shipments-sr">Ver detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.items.map((row) => (
                  <tr key={row.publicId} role="row">
                    <td role="cell">
                      <Link
                        className="shipment-row-link"
                        to={`/customer/requests/${row.publicId}`}
                        aria-label={`Ver solicitud ${row.publicId}, estado ${labels[row.status]}`}
                      >
                        {row.publicId}
                      </Link>
                    </td>
                    <td role="cell">
                      <span
                        className={`shipment-state ${row.status === 'CANCELLED' ? 'cancelled' : ''}`}
                      >
                        {labels[row.status]}
                      </span>
                    </td>
                    <td role="cell">
                      <time dateTime={row.requestedAt}>
                        {date(row.requestedAt)}
                      </time>
                    </td>
                    <td role="cell">
                      <span className="shipment-arrow" aria-hidden="true">
                        <ArrowRight size={18} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <nav aria-label="Paginación">
              <Pagination {...items} onPage={onPage} />
            </nav>
          </>
        ) : null}
      </section>
    </section>
  )
}
