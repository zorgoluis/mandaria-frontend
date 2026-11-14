/**
 * Mandaria · componentes del sistema de diseño.
 *
 * Patrones de pantalla reutilizables. Los estilos viven en
 * styles/redesign.css y salen de los tokens de :root (index.css).
 * Guía completa: docs/DESIGN-SYSTEM.md.
 */
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { ErrorState } from './ui'

/** Tarjeta blanca con encabezado opcional (título, descripción y acciones). */
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section
      className={`panel ${className}`.trim()}
      aria-labelledby={title ? id : undefined}
    >
      {(title || actions) && (
        <div className="panel-toolbar">
          <div>
            {title && <h2 id={id}>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

/** Indicador con enlace opcional a su listado. Conserva la estructura .stat-card. */
export function StatCard({
  title,
  icon: Icon,
  value,
  note,
  to,
  error,
  retry,
}: {
  title: string
  icon: LucideIcon
  /** `undefined` mientras carga; texto ya formateado para porcentajes o montos. */
  value?: number | string
  note: string
  /** Sin `to`, la nota se muestra como texto. */
  to?: string
  error?: unknown
  retry?: () => void
}) {
  return (
    <div className="stat-card">
      <div>
        <span>{title}</span>
        <Icon size={20} aria-hidden="true" />
      </div>
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : (
        <strong>
          {typeof value === 'number'
            ? value.toLocaleString('es-MX')
            : (value ?? '…')}
        </strong>
      )}
      {to ? (
        <Link to={to}>
          {note}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      ) : (
        <span className="stat-card-note">{note}</span>
      )}
    </div>
  )
}

/** Cola de pendientes sobre fondo de marca: total, título y enlace a decidir. */
export function QueueCard({
  title,
  text,
  to,
  icon: Icon,
  total,
  failed = false,
}: {
  title: string
  text: string
  to: string
  icon: LucideIcon
  total?: number
  failed?: boolean
}) {
  return (
    <Link className="queue-card" to={to}>
      <span className="queue-card-count">
        {failed ? (
          <Icon size={18} aria-label="Sin dato" />
        ) : typeof total === 'number' ? (
          total.toLocaleString('es-MX')
        ) : (
          '…'
        )}
      </span>
      <span className="queue-card-text">
        <strong>{title}</strong>
        <small>{failed ? 'No se pudo consultar el total' : text}</small>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  )
}

/** Acceso destacado con ícono, título y descripción. */
export function LinkCard({
  to,
  title,
  text,
  icon: Icon,
}: {
  to: string
  title: string
  text?: string
  icon: LucideIcon
}) {
  return (
    <Link className="link-card" to={to}>
      <span className="link-card-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="link-card-text">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  )
}

/** Fila de navegación compacta para columnas laterales. */
export function LinkRow({
  to,
  title,
  text,
  icon: Icon,
}: {
  to: string
  title: string
  text?: string
  icon: LucideIcon
}) {
  return (
    <Link className="link-row" to={to}>
      <span className="link-row-icon">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="link-row-text">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </Link>
  )
}

/** Lista clave/valor compacta para resúmenes en la columna lateral. */
export function SummaryList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="summary-list">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const noticeIcons = {
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
} as const

/** Aviso con tono. `danger` se anuncia como alerta; los demás como estado. */
export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof noticeIcons
  title?: string
  children: ReactNode
}) {
  const Icon = noticeIcons[tone]
  return (
    <div
      className={`ds-notice ${tone}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon size={18} aria-hidden="true" />
      <p>
        {title && <strong>{title}</strong>} {children}
      </p>
    </div>
  )
}

/** Diseño de dos columnas: contenido principal y columna lateral fija. */
export function TwoColumn({
  children,
  aside,
}: {
  children: ReactNode
  aside: ReactNode
}) {
  return (
    <div className="two-column">
      <div className="two-column-main">{children}</div>
      <aside className="two-column-aside">{aside}</aside>
    </div>
  )
}
