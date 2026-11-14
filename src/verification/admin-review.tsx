import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Filter,
  Search,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../auth/context'
import { ErrorState, Loading, Pagination } from '../components/ui'
import { ProviderScope } from '../logistics/components'
import { date } from '../utils/format'
import { verification } from './service'
import { Warning } from './common'
import { labels, vkey } from './format'
import type { CaseStatus, ReviewPage } from './types'
import './admin-review.css'

const filters: CaseStatus[] = [
  'SUBMITTED',
  'DRAFT',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]
const summaryOrder: CaseStatus[] = [
  'APPROVED',
  'SUBMITTED',
  'DRAFT',
  'WITHDRAWN',
  'REJECTED',
]
const casePath = (id: string) => '/verification/cases/' + id
function Overview({ data }: { data?: ReviewPage }) {
  const counts = data?.counts
  const total = counts && Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <aside className="review-aside" aria-label="Resumen de expedientes">
      {data && counts && (
        <>
          <section className="review-card review-pending">
            <h2>Pendientes de decisión</h2>
            <p className="review-number">
              <strong>{counts?.SUBMITTED ?? '—'}</strong> en revisión
            </p>
            {counts?.SUBMITTED === 0 && <p>Sin expedientes en espera</p>}
            {!!data?.oldest?.length && (
              <>
                <ul>
                  {data.oldest.map((c) => {
                    const days = Math.max(
                      0,
                      Math.floor(
                        (Date.parse(data.asOf) - Date.parse(c.submittedAt)) /
                          86400000,
                      ),
                    )
                    return (
                      <li key={c.id}>
                        <Link to={casePath(c.id)}>
                          <strong>Revisión {c.revision}</strong>
                          <time dateTime={c.submittedAt}>
                            {date(c.submittedAt)}
                          </time>
                          <span>
                            {days} {days === 1 ? 'día' : 'días'}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                <Link
                  className="review-oldest"
                  to={casePath(data.oldest[0].id)}
                >
                  Revisar el más antiguo <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </section>
          <section className="review-card">
            <h2>Resumen por estado</h2>
            <div className="review-bar" aria-hidden="true">
              {!!total &&
                counts &&
                summaryOrder.map(
                  (s) =>
                    counts[s] > 0 && (
                      <i
                        key={s}
                        data-status={s}
                        style={{ flexGrow: counts[s] }}
                      />
                    ),
                )}
            </div>
            <ul className="review-summary">
              {summaryOrder.map((s) => (
                <li key={s} data-status={s}>
                  <span>{labels[s]}</span>
                  <b>{counts?.[s] ?? '—'}</b>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <section className="review-card">
        <h2>Antes de decidir</h2>
        <ul className="review-tips">
          <li>
            Verifica la vigencia de la INE y la licencia en la fecha de
            revisión.
          </li>
          <li>
            Usa el motivo público para explicar tu decisión al conductor. La
            nota interna es sólo para administración.
          </li>
          <li>Sólo puedes aprobar expedientes en revisión.</li>
        </ul>
      </section>
    </aside>
  )
}
export function AdminVerification() {
  const { user } = useAuth()
  const [page, setPage] = useState(1),
    [status, setStatus] = useState<CaseStatus | ''>(''),
    [input, setInput] = useState(''),
    [search, setSearch] = useState('')
  const [provider, setProvider] = useState<{ id: string; name: string } | null>(
      null,
    ),
    [picker, setPicker] = useState(false)
  useEffect(() => {
    if (input.trim() === search) return
    const timer = window.setTimeout(() => {
      setSearch(input.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [input, search])
  const q = useQuery({
    queryKey: vkey(
      user!.id,
      'admin-review',
      provider?.id,
      page,
      status,
      search,
    ),
    queryFn: ({ signal }) =>
      verification.review(page, status, provider?.id, search, signal),
    retry: false,
    gcTime: 0,
  })
  const data = q.isSuccess ? q.data : undefined
  const counts = data?.counts
  const total = counts && Object.values(counts).reduce((a, b) => a + b, 0)
  const basic = !!data && !counts
  return (
    <div className="review-board">
      <header className="review-header">
        <div>
          <Link className="review-back" to="/profile">
            ← Mi cuenta
          </Link>
          <h1>Revisión documental</h1>
          <p>
            Identidad y unidades se revisan por separado de representación
            legal.
          </p>
          <strong className="review-shield">
            <ShieldCheck size={16} /> Decisiones exclusivas SUPER_ADMIN
          </strong>
        </div>
        <nav aria-label="Administración documental">
          <Link to="/admin/verification-publications">
            Publicación de términos y privacidad <ArrowUpRight />
          </Link>
          <Link to="/admin/fleet-representatives">
            Vínculos de representación legal <ArrowUpRight />
          </Link>
        </nav>
      </header>
      <Warning />
      <div className="review-columns">
        <section
          className="review-card review-cases"
          aria-label="Listado de expedientes"
        >
          <header>
            <div>
              <h2>Expedientes e historial</h2>
              <small>
                {basic
                  ? 'Ordenado por fecha de creación'
                  : 'Ordenado por última actualización'}
              </small>
            </div>
            <div className="review-controls">
              {!basic && (
                <label>
                  <Search size={16} />
                  <input
                    aria-label="Buscar revisión o nota"
                    type="search"
                    placeholder="Buscar revisión o nota"
                    value={input}
                    maxLength={200}
                    disabled={q.isPending && !input && !search}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </label>
              )}
              <button
                className="button secondary"
                aria-expanded={picker}
                aria-controls="review-provider"
                onClick={() => setPicker(!picker)}
              >
                <Filter size={15} /> Proveedor: {provider?.name || 'Todos'}{' '}
                <ChevronDown size={14} />
              </button>
            </div>
          </header>
          {picker && (
            <div id="review-provider">
              <ProviderScope selectionOptional>
                {(p) => (
                  <button
                    onClick={() => {
                      setProvider({ id: p.providerId, name: p.name })
                      setPage(1)
                      setPicker(false)
                    }}
                  >
                    Filtrar: {p.name}
                  </button>
                )}
              </ProviderScope>
              <button
                onClick={() => {
                  setProvider(null)
                  setPage(1)
                  setPicker(false)
                }}
              >
                Ver todos los proveedores
              </button>
            </div>
          )}
          <div
            className="review-filters"
            role="group"
            aria-label="Estado del expediente"
          >
            {(['', ...filters] as const).map((s) => (
              <button
                key={s}
                className="button secondary"
                aria-pressed={status === s}
                onClick={() => {
                  setStatus(s)
                  setPage(1)
                }}
              >
                {s ? labels[s] : 'Todos'}{' '}
                {(!basic || s === status) && (
                  <span>
                    {(basic ? data.total : s ? counts?.[s] : total) ?? '—'}
                  </span>
                )}
              </button>
            ))}
          </div>
          {basic && (
            <p role="status">
              El servidor ofrece la lista de expedientes. Puedes filtrar por
              estado o proveedor. La búsqueda y el resumen global requieren la
              versión ampliada.
            </p>
          )}
          {q.isPending ? (
            <Loading />
          ) : q.isError ? (
            <ErrorState error={q.error} retry={() => void q.refetch()} />
          ) : (
            data && (
              <>
                {data.items.length ? (
                  <table className="review-table">
                    <thead>
                      <tr>
                        {[
                          'Expediente',
                          'Estado',
                          basic ? 'Creado' : 'Actualizado',
                          'Nota de decisión',
                          'Acción',
                        ].map((h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((c) => (
                        <tr key={c.id} data-status={c.status}>
                          <td>
                            <strong>Revisión {c.revision}</strong>
                            <small>
                              {c.subjectType
                                ? labels[c.subjectType]
                                : 'Expediente'}
                              {c.driverName &&
                                (c.independentProfileId && c.driverId ? (
                                  <>
                                    {' · '}
                                    <Link
                                      className="review-driver"
                                      to={
                                        '/independent-drivers/' +
                                        encodeURIComponent(c.driverId)
                                      }
                                    >
                                      {c.driverName}
                                    </Link>
                                  </>
                                ) : (
                                  ' · ' + c.driverName
                                ))}
                            </small>
                          </td>
                          <td>
                            <span className="review-badge">
                              {labels[c.status]}
                            </span>
                          </td>
                          <td data-label={basic ? 'Creado' : 'Actualizado'}>
                            <time dateTime={basic ? c.createdAt : c.updatedAt}>
                              {date(basic ? c.createdAt : c.updatedAt)}
                            </time>
                          </td>
                          <td data-label="Nota de decisión">
                            <span
                              className={
                                c.publicReason
                                  ? 'review-note'
                                  : 'review-note empty'
                              }
                              title={c.publicReason || undefined}
                            >
                              {c.publicReason || 'Sin decisión registrada'}
                            </span>
                          </td>
                          <td>
                            <Link
                              className="review-action"
                              to={casePath(c.id)}
                              aria-label={
                                (c.status === 'SUBMITTED' ? 'Revisar' : 'Ver') +
                                ' expediente, revisión ' +
                                c.revision
                              }
                            >
                              {c.status === 'SUBMITTED' ? 'Revisar' : 'Ver'}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="review-empty">
                    <strong>Sin expedientes en este estado</strong>
                    <p>
                      {search
                        ? 'Prueba con otra revisión o nota.'
                        : 'Prueba con otro estado o revisa la siguiente página.'}
                    </p>
                  </div>
                )}
                <Pagination
                  arrows
                  page={page}
                  total={data.total}
                  totalPages={data.totalPages}
                  onPage={setPage}
                />
              </>
            )
          )}
        </section>
        <Overview data={data} />
      </div>
    </div>
  )
}
