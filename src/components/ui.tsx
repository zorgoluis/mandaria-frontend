import { ButtonLink, Button } from './controls'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, PackageOpen, X } from 'lucide-react'
import { ApiError, errorMessage } from '../services/errors'
import { labels } from '../utils/format'
export {
  Button,
  ButtonLink,
  Field,
  Input,
  Select,
  Textarea,
  Checkbox,
} from './controls'
export { RouteProgress } from './RouteProgress'
export type { RouteStep } from './RouteProgress'
export { Toast } from './Toast'

type BadgeTone = 'neutral' | 'active' | 'success' | 'attention' | 'stopped'
const serviceLabels: Record<string, string> = {
  SEARCHING: 'Buscando',
  ASSIGNED: 'Asignado',
  CLAIMED: 'Tomado',
  IN_PROGRESS: 'En curso',
  EXECUTOR_FOUND: 'Ejecutor encontrado',
  COMPLETED: 'Completado',
  DELIVERED: 'Entregado',
  RETURNED: 'Devuelto',
  TRANSFERRED: 'Transferido',
  RELEASED: 'Liberado',
  RETRY_PENDING: 'Reintento pendiente',
}
const serviceTones: Record<string, BadgeTone> = {
  CREATED: 'neutral',
  DRAFT: 'neutral',
  AVAILABLE: 'active',
  SEARCHING: 'active',
  OPEN: 'active',
  ACTIVE: 'active',
  ASSIGNED: 'active',
  CLAIMED: 'active',
  IN_PROGRESS: 'active',
  ACCEPTED: 'active',
  EXECUTOR_FOUND: 'active',
  PENDING: 'attention',
  OFFERED: 'attention',
  RETRY_PENDING: 'attention',
  COMPLETED: 'success',
  DELIVERED: 'success',
  APPROVED: 'success',
  CANCELLED: 'stopped',
  REJECTED: 'stopped',
  REVOKED: 'stopped',
  EXPIRED: 'stopped',
  SUSPENDED: 'stopped',
  EXHAUSTED: 'stopped',
  STOPPED: 'stopped',
}
export function Badge({
  value,
  label,
  tone = serviceTones[value.toUpperCase()] ?? 'neutral',
}: {
  value: string
  label?: string
  tone?: BadgeTone
}) {
  return (
    <span className={`badge ui-badge ${value.toLowerCase()}`} data-tone={tone}>
      <span className="status-dot" aria-hidden="true" />
      {label ?? serviceLabels[value] ?? labels[value] ?? 'Desconocido'}
    </span>
  )
}
export function PageHeader({
  title,
  description,
  action,
  back,
  eyebrow = 'Mandaria',
}: {
  title: string
  description?: string
  action?: ReactNode
  back?: string
  eyebrow?: string
}) {
  return (
    <header className="page-heading ui-page-header">
      <div>
        {back && (
          <Link className="back-link" to={back}>
            <ArrowLeft className="ui-icon" aria-hidden="true" /> Volver
          </Link>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}
export const PageTitle = PageHeader
export function Skeleton({
  rows = 3,
  label = 'Cargando información',
  decorative = false,
}: {
  rows?: number
  label?: string
  decorative?: boolean
}) {
  return (
    <div
      className="ui-skeleton"
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
    >
      {Array.from(
        { length: Math.min(12, Math.max(1, Math.floor(rows) || 1)) },
        (_, index) => (
          <span className="skeleton-line" key={index} />
        ),
      )}
    </div>
  )
}
export function Loading() {
  return (
    <div className="state" role="status">
      <Skeleton decorative />
      <h3>Cargando información</h3>
      <p>Conectando con Mandaria…</p>
    </div>
  )
}
export function EmptyState({
  title = 'Todavía no hay registros',
  description = 'Los registros aparecerán aquí cuando estén disponibles.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="state ui-empty-state">
      <PackageOpen className="ui-state-icon" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export const Empty = EmptyState
export function ErrorState({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  return (
    <div className="state error-state" role="alert">
      <CircleAlert className="ui-state-icon" aria-hidden="true" />
      <h3>
        {error instanceof ApiError && error.status === 403
          ? '403 — Sin permisos'
          : error instanceof ApiError && error.status === 0
            ? 'Error de conexión'
            : 'No se pudo cargar la información'}
      </h3>
      <p>{errorMessage(error)}</p>
      {retry && (
        <Button type="submit" className="button secondary" onClick={retry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
export function ErrorPage({ code }: { code: 403 | 404 }) {
  return (
    <div className="state full-state">
      <span className="error-code">{code}</span>
      <h1>{code === 403 ? 'Sin permisos' : 'Página no encontrada'}</h1>
      <p>
        {code === 403
          ? 'Tu rol no tiene acceso a esta sección.'
          : 'Revisa la dirección o regresa al inicio.'}
      </p>
      <ButtonLink className="button" to="/dashboard">
        Ir al dashboard
      </ButtonLink>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const el = ref.current
    const previous = document.activeElement
    el?.showModal()
    return () => {
      el?.close()
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])
  return (
    <dialog
      className="ui-modal"
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        )
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!first) {
          event.preventDefault()
          event.currentTarget.focus()
          return
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <Button
          variant="ghost"
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar diálogo"
          disabled={busy}
        >
          <X className="ui-icon" aria-hidden="true" />
        </Button>
      </div>
      {children}
    </dialog>
  )
}
export function ActionForm({
  children,
  onSubmit,
  submitLabel = 'Guardar cambios',
  onCancel,
  cancelLabel = 'Cancelar',
  initialDirty = false,
}: {
  children: ReactNode
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
  onCancel?: () => void
  cancelLabel?: string
  initialDirty?: boolean
}) {
  const [busy, setBusy] = useState(false)
  // initialDirty only enables submitting untouched forms (login, confirmations). The
  // unsaved-changes warning and beforeunload guard require real edits: a guard without
  // them made the browser block (and log) a prompt when leaving the login page.
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await onSubmit(data)
      setDirty(false)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      onSubmit={(event) => {
        void submit(event)
      }}
      onChange={() => setDirty(true)}
    >
      <fieldset disabled={busy} className="form-fields">
        {children}
      </fieldset>
      {!!error && (
        <p className="inline-error" role="alert">
          {errorMessage(error)}
        </p>
      )}
      <div className="form-actions">
        {dirty && <small>Cambios sin guardar</small>}
        {onCancel && (
          <Button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          className="button"
          disabled={busy || !(dirty || initialDirty)}
          type="submit"
          loading={busy}
          loadingLabel="Guardando…"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  label = 'Confirmar',
}: {
  title: string
  description: string
  onConfirm: () => Promise<void>
  onClose: () => void
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title={title}
      busy={busy}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <p className="modal-description">{description}</p>
      <ActionForm
        initialDirty
        submitLabel={label}
        onCancel={onClose}
        onSubmit={async () => {
          setBusy(true)
          try {
            await onConfirm()
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        {null}
      </ActionForm>
    </Modal>
  )
}
export function Table<T extends { id: string }>({
  rows,
  columns,
  empty,
  emptyTitle,
  stacked = false,
  caption,
  loading = false,
  error,
  retry,
  emptyAction,
}: {
  rows: T[]
  columns: { label: string; render: (row: T) => ReactNode }[]
  empty?: string
  emptyTitle?: string
  /** Renders rows as labelled cards on narrow screens instead of scrolling. */
  stacked?: boolean
  caption?: string
  loading?: boolean
  error?: unknown
  retry?: () => void
  emptyAction?: ReactNode
}) {
  if (loading)
    return (
      <Skeleton rows={5} label={caption ? `Cargando ${caption}` : undefined} />
    )
  if (error) return <ErrorState error={error} retry={retry} />
  return rows.length ? (
    <div
      className={`table-scroll ui-table${stacked ? ' table-stacked' : ''}`}
      tabIndex={0}
      role="region"
      aria-label={caption ?? 'Tabla de registros'}
    >
      <table>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.label} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.label} data-label={col.label}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title={emptyTitle} description={empty} action={emptyAction} />
  )
}
export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  onPage: (page: number) => void
}) {
  return (
    <div className="pagination">
      <span>
        {total} registros · Página {totalPages ? page : 0} de {totalPages}
      </span>
      <div>
        <Button
          type="submit"
          className="button secondary small"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="submit"
          className="button secondary small"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
export function InfoGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="info-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
