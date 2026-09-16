import {
  useEffect,
  useId,
  useRef,
  useState,
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
  PackageOpen,
  X,
} from 'lucide-react'
import { ApiError, errorMessage } from '../services/errors'
import { labels } from '../utils/format'
export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`badge ${value.toLowerCase()}`}>
      <span className="status-dot" />
      {label ?? labels[value] ?? 'Desconocido'}
    </span>
  )
}
export function PageTitle({
  title,
  description,
  action,
  back,
}: {
  title: string
  description?: string
  action?: ReactNode
  back?: string
}) {
  return (
    <div className="page-heading">
      <div>
        {back && (
          <Link className="back-link" to={back}>
            <ArrowLeft size={15} /> Volver
          </Link>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={28} />
      <h3>Cargando información</h3>
      <p>Conectando con Mandaria…</p>
    </div>
  )
}
export function Empty({
  title = 'Todavía no hay registros',
  description = 'Los registros aparecerán aquí cuando estén disponibles.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="state">
      <PackageOpen size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  return (
    <div className="state error-state" role="alert">
      <CircleAlert size={30} />
      <h3>
        {error instanceof ApiError && error.status === 403
          ? '403 — Sin permisos'
          : error instanceof ApiError && error.status === 0
            ? 'Error de conexión'
            : 'No se pudo cargar la información'}
      </h3>
      <p>{errorMessage(error)}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Reintentar
        </button>
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
      <Link className="button" to="/dashboard">
        Ir al dashboard
      </Link>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
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
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar diálogo"
        >
          <X size={20} />
        </button>
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
  const [dirty, setDirty] = useState(initialDirty)
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
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        )}
        <button className="button" disabled={busy || !dirty} type="submit">
          {busy && <LoaderCircle size={16} className="spin" />}
          {busy ? 'Guardando…' : submitLabel}
        </button>
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
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  const labelId = useId()
  const hintId = useId()
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {Children.map(children, (child) =>
        isValidElement<{
          'aria-labelledby'?: string
          'aria-describedby'?: string
        }>(child) &&
        typeof child.type === 'string' &&
        ['input', 'select', 'textarea'].includes(child.type)
          ? cloneElement(child, {
              'aria-labelledby': labelId,
              ...(hint ? { 'aria-describedby': hintId } : {}),
            })
          : child,
      )}
      {hint && <small id={hintId}>{hint}</small>}
    </label>
  )
}
export function Table<T extends { id: string }>({
  rows,
  columns,
  empty,
  stacked = false,
}: {
  rows: T[]
  columns: { label: string; render: (row: T) => ReactNode }[]
  empty?: string
  /** Renders rows as labelled cards on narrow screens instead of scrolling. */
  stacked?: boolean
}) {
  return rows.length ? (
    <div className={`table-scroll${stacked ? ' table-stacked' : ''}`}>
      <table>
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
    <Empty description={empty} />
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
        <button
          className="button secondary small"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <button
          className="button secondary small"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
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
