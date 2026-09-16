import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorPage,
  ErrorState,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { integrations } from '../integrations/service'
import { serviceZones } from '../pricing/service'
import { zoneKeys } from '../pricing/queries'
import { km, money, serviceTypeLabels } from '../pricing/format'
import { dayBoundary, NOT_PROVIDED } from '../delivery-requests/format'
import { PUBLIC_ID } from '../delivery-requests/types'
import { date } from '../utils/format'
import { deliveryQuotes } from './service'
import { quoteKeys } from './queries'
import {
  cancellationReasonLabel,
  duration,
  quoteStatusHints,
  quoteStatusLabels,
  routingProviderLabel,
} from './format'
import {
  QUOTE_PUBLIC_ID,
  quoteStatuses,
  type DeliveryQuote,
  type QuoteStatus,
} from './types'

const PAGE_SIZE = 20
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fields = [
  'publicId',
  'requestPublicId',
  'integrationClientId',
  'serviceZoneId',
  'status',
  'from',
  'to',
] as const
type Draft = Record<(typeof fields)[number], string>
const readDraft = (params: URLSearchParams): Draft =>
  Object.fromEntries(fields.map((key) => [key, params.get(key) ?? ''])) as Draft

/** Rejects what the DTO would refuse, so a hand-edited URL never reaches the API. */
function problem(draft: Draft) {
  if (draft.publicId && !QUOTE_PUBLIC_ID.test(draft.publicId))
    return 'El identificador de cotización debe tener el formato MQ-000092.'
  if (draft.requestPublicId && !PUBLIC_ID.test(draft.requestPublicId))
    return 'El identificador de solicitud debe tener el formato MDR-000123.'
  if (draft.integrationClientId && !UUID.test(draft.integrationClientId))
    return 'La integración seleccionada no es válida.'
  if (draft.serviceZoneId && !UUID.test(draft.serviceZoneId))
    return 'La zona seleccionada no es válida.'
  if (
    draft.status &&
    !(quoteStatuses as readonly string[]).includes(draft.status)
  )
    return 'El estado seleccionado no es válido.'
  if (
    (draft.from && !dayBoundary(draft.from, false)) ||
    (draft.to && !dayBoundary(draft.to, true))
  )
    return 'Revisa las fechas del filtro.'
  if (draft.from && draft.to && draft.from > draft.to)
    return 'La fecha inicial debe ser anterior o igual a la fecha final.'
  return null
}

export function QuotesPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  const current = readDraft(params)
  const invalid = problem(current)
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    publicId: current.publicId || undefined,
    deliveryRequestPublicId: current.requestPublicId || undefined,
    integrationClientId: current.integrationClientId || undefined,
    serviceZoneId: current.serviceZoneId || undefined,
    status: current.status || undefined,
    createdFrom: current.from ? dayBoundary(current.from, false) : undefined,
    createdTo: current.to ? dayBoundary(current.to, true) : undefined,
  }
  const query = useQuery({
    queryKey: quoteKeys.list(filters),
    queryFn: ({ signal }) => deliveryQuotes.list(filters, signal),
    enabled: !invalid,
  })
  const filtered = fields.some((key) => current[key])
  return (
    <>
      <PageTitle
        title="Cotizaciones"
        description="Cuánto costó cada entrega local. Precios congelados por el backend, sólo lectura."
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Cotizaciones emitidas</h2>
            <p>De la más reciente a la más antigua</p>
          </div>
        </div>
        <QuoteFilters
          current={current}
          onApply={(draft) => {
            const next = new URLSearchParams()
            for (const key of fields) if (draft[key]) next.set(key, draft[key])
            next.set('page', '1')
            setParams(next)
          }}
        />
        {invalid ? (
          <div className="panel-body">
            <p className="inline-error" role="alert">
              {invalid}
            </p>
          </div>
        ) : query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        ) : (
          <>
            {query.data.items.length ? (
              <QuoteTable items={query.data.items} from={location.search} />
            ) : (
              <Empty
                title="No hay cotizaciones."
                description={
                  filtered
                    ? 'Ninguna cotización coincide con los filtros aplicados.'
                    : 'Las cotizaciones que soliciten las integraciones aparecerán aquí.'
                }
              />
            )}
            <Pagination
              page={page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={(value) => {
                const next = new URLSearchParams(params)
                next.set('page', String(value))
                setParams(next)
              }}
            />
          </>
        )}
      </div>
    </>
  )
}

export function QuoteTable({
  items,
  from,
}: {
  items: DeliveryQuote[]
  from?: string
}) {
  return (
    <Table
      stacked
      rows={items}
      columns={[
        {
          label: 'Cotización',
          render: (row) => (
            <Link
              className="entity-name"
              to={`/delivery-quotes/${encodeURIComponent(row.publicId)}`}
              state={from ? { list: from } : undefined}
            >
              {row.publicId}
              <small>{row.deliveryRequest.publicId}</small>
            </Link>
          ),
        },
        {
          label: 'Costo de entrega',
          render: (row) => money(row.amount, row.currency),
        },
        {
          label: 'Estado',
          render: (row) => (
            <Badge value={row.status} label={quoteStatusLabels[row.status]} />
          ),
        },
        {
          label: 'Ruta',
          render: (row) => (
            <span className="cell-meta">
              {km(row.distanceMeters)}
              <small>{duration(row.durationSeconds)}</small>
            </span>
          ),
        },
        {
          label: 'Zona',
          render: (row) => (
            <span className="cell-meta">
              {row.serviceZone.name}
              <small>{row.serviceZone.code}</small>
            </span>
          ),
        },
        { label: 'Creada', render: (row) => date(row.createdAt) },
        {
          label: 'Acciones',
          render: (row) => (
            <Link
              className="table-action"
              to={`/delivery-quotes/${encodeURIComponent(row.publicId)}`}
              state={from ? { list: from } : undefined}
              aria-label={`Ver detalle de ${row.publicId}`}
            >
              Ver detalle <ArrowUpRight size={15} />
            </Link>
          ),
        },
      ]}
    />
  )
}

function QuoteFilters({
  current,
  onApply,
}: {
  current: Draft
  onApply: (draft: Draft) => void
}) {
  const signature = fields.map((key) => current[key]).join('\n')
  const [draft, setDraft] = useState(current)
  const [seen, setSeen] = useState(signature)
  const [applied, setApplied] = useState(signature)
  // Only URL changes this form did not apply (back/forward, links) replace the draft.
  if (seen !== signature) {
    setSeen(signature)
    if (signature !== applied) setDraft(current)
  }
  const clients = useQuery({
    queryKey: ['integrations'],
    queryFn: ({ signal }) => integrations.list(signal),
  })
  const zonesFilters = { page: 1, pageSize: 100 }
  const zones = useQuery({
    queryKey: zoneKeys.list(zonesFilters),
    queryFn: ({ signal }) => serviceZones.list(zonesFilters, signal),
  })
  const normalize = (value: Draft): Draft => ({
    ...value,
    publicId: value.publicId.trim().toUpperCase(),
    requestPublicId: value.requestPublicId.trim().toUpperCase(),
  })
  const commit = (next: Draft) => {
    setDraft(next)
    setApplied(fields.map((key) => next[key]).join('\n'))
    onApply(next)
  }
  const set = (key: keyof Draft, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  const selectAndApply = (key: keyof Draft, value: string) =>
    commit(normalize({ ...draft, [key]: value }))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commit(normalize(draft))
  }
  return (
    <form
      className="filters delivery-filters"
      onSubmit={submit}
      aria-label="Filtros de cotizaciones"
    >
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Identificador de cotización"
          placeholder="MQ-000092"
          value={draft.publicId}
          maxLength={20}
          onChange={(event) => set('publicId', event.target.value)}
        />
      </label>
      <label className="search">
        <input
          aria-label="Identificador de solicitud"
          placeholder="MDR-000123"
          value={draft.requestPublicId}
          maxLength={20}
          onChange={(event) => set('requestPublicId', event.target.value)}
        />
      </label>
      <select
        aria-label="Filtrar por integración"
        value={draft.integrationClientId}
        disabled={clients.isPending}
        onChange={(event) =>
          selectAndApply('integrationClientId', event.target.value)
        }
      >
        <option value="">
          {clients.isPending
            ? 'Cargando integraciones…'
            : 'Todas las integraciones'}
        </option>
        {clients.data?.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por zona"
        value={draft.serviceZoneId}
        disabled={zones.isPending}
        onChange={(event) =>
          selectAndApply('serviceZoneId', event.target.value)
        }
      >
        <option value="">
          {zones.isPending ? 'Cargando zonas…' : 'Todas las zonas'}
        </option>
        {zones.data?.items.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por estado"
        value={draft.status}
        onChange={(event) => selectAndApply('status', event.target.value)}
      >
        <option value="">Todos los estados</option>
        {quoteStatuses.map((status) => (
          <option key={status} value={status}>
            {quoteStatusLabels[status]}
          </option>
        ))}
      </select>
      <label className="date-filter">
        <span>Desde</span>
        <input
          type="date"
          aria-label="Creadas desde"
          value={draft.from}
          max={draft.to || undefined}
          onChange={(event) => set('from', event.target.value)}
        />
      </label>
      <label className="date-filter">
        <span>Hasta</span>
        <input
          type="date"
          aria-label="Creadas hasta"
          value={draft.to}
          min={draft.from || undefined}
          onChange={(event) => set('to', event.target.value)}
        />
      </label>
      <div className="row-actions">
        <button className="button small" type="submit">
          Aplicar filtros
        </button>
        <button
          className="button secondary small"
          type="button"
          onClick={() =>
            commit(Object.fromEntries(fields.map((key) => [key, ''])) as Draft)
          }
        >
          Limpiar
        </button>
      </div>
    </form>
  )
}

/** Quote history of one delivery request. Extends the V1.5 detail without changing it. */
export function RequestQuotes({ publicId }: { publicId: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: quoteKeys.forRequest(publicId, page),
    queryFn: ({ signal }) =>
      deliveryQuotes.forRequest(publicId, page, PAGE_SIZE, signal),
  })
  return (
    <section className="panel" aria-labelledby="request-quotes">
      <div className="panel-toolbar">
        <div>
          <h2 id="request-quotes">Cotizaciones</h2>
          <p>Costo de entrega calculado por Mandaria</p>
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch()
          }}
        />
      ) : query.data.items.length ? (
        <>
          <QuoteTable items={query.data.items} />
          <Pagination
            page={page}
            total={query.data.total}
            totalPages={query.data.totalPages}
            onPage={setPage}
          />
        </>
      ) : (
        <Empty
          title="No hay cotizaciones."
          description="Esta solicitud todavía no tiene un costo de entrega calculado."
        />
      )}
      <p className="panel-note">
        El costo de entrega es independiente del valor de la mercancía: son
        conceptos separados y no se suman en esta versión.
      </p>
    </section>
  )
}

function useBackToList() {
  const location = useLocation()
  const state: unknown = location.state
  const search =
    state &&
    typeof state === 'object' &&
    'list' in state &&
    typeof state.list === 'string' &&
    state.list.startsWith('?')
      ? state.list
      : ''
  return `/delivery-quotes${search}`
}

export function QuoteDetail() {
  const { publicId: raw = '' } = useParams()
  const publicId = raw.toUpperCase()
  if (!QUOTE_PUBLIC_ID.test(publicId)) return <ErrorPage code={404} />
  return <QuoteRecord key={publicId} publicId={publicId} />
}
function QuoteRecord({ publicId }: { publicId: string }) {
  const back = useBackToList()
  const query = useQuery({
    queryKey: quoteKeys.detail(publicId),
    queryFn: ({ signal }) => deliveryQuotes.get(publicId, signal),
    staleTime: 0,
  })
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle title={publicId} back={back} />
        {query.isPending ? (
          <Loading />
        ) : (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        )}
      </>
    )
  return <QuoteContent quote={query.data} back={back} />
}

/** Every value is the persisted snapshot; the frontend never recalculates a price. */
function QuoteContent({ quote, back }: { quote: DeliveryQuote; back: string }) {
  const status: QuoteStatus = quote.status
  return (
    <>
      <PageTitle
        title={quote.publicId}
        description={`Cotización de ${quote.deliveryRequest.publicId}`}
        back={back}
      />
      <section className="panel" aria-labelledby="quote-summary">
        <div className="panel-toolbar">
          <h2 id="quote-summary">Resumen</h2>
        </div>
        <InfoGrid
          items={[
            [
              'Precio',
              <strong className="quote-amount">
                {money(quote.amount, quote.currency)}
              </strong>,
            ],
            ['Distancia', km(quote.distanceMeters)],
            ['Duración estimada', duration(quote.durationSeconds)],
            [
              'Zona',
              <Link
                className="entity-name"
                to={`/service-zones/${encodeURIComponent(quote.serviceZoneId)}`}
              >
                {quote.serviceZone.name}
                <small>{quote.serviceZone.code}</small>
              </Link>,
            ],
            ['Servicio', serviceTypeLabels[quote.serviceType]],
            [
              'Tarifa',
              <Link
                className="entity-name"
                to={`/rate-plans/${encodeURIComponent(quote.ratePlanId)}`}
              >
                Versión {quote.ratePlan.version}
                <small>
                  Banda {km(quote.rateBand.minDistanceMeters)} –{' '}
                  {km(quote.rateBand.maxDistanceMeters)}
                </small>
              </Link>,
            ],
            [
              'Estado',
              <Badge value={status} label={quoteStatusLabels[status]} />,
            ],
          ]}
        />
        <p className="panel-note">
          Precio congelado por el backend para esta solicitud. Corresponde
          únicamente al costo de entrega, no al valor de la mercancía.
        </p>
      </section>
      <section className="panel" aria-labelledby="quote-status">
        <div className="panel-toolbar">
          <div>
            <h2 id="quote-status">Vigencia y estado</h2>
            <p>{quoteStatusHints[status]}</p>
          </div>
        </div>
        <InfoGrid
          items={[
            ['Creada', date(quote.createdAt)],
            ...(status === 'OFFERED'
              ? ([['Válida hasta', date(quote.expiresAt)]] as [
                  string,
                  string,
                ][])
              : []),
            ...(status === 'ACCEPTED'
              ? ([['Aceptada', date(quote.acceptedAt)]] as [string, string][])
              : []),
            ...(status === 'EXPIRED'
              ? ([['Expiró', date(quote.expiredAt ?? quote.expiresAt)]] as [
                  string,
                  string,
                ][])
              : []),
            ...(status === 'CANCELLED'
              ? ([
                  ['Cancelada', date(quote.cancelledAt)],
                  ['Motivo', cancellationReasonLabel(quote.cancellationReason)],
                ] as [string, string][])
              : []),
            [
              'Solicitud',
              <Link
                className="entity-name"
                to={`/delivery-requests/${encodeURIComponent(quote.deliveryRequest.publicId)}`}
              >
                {quote.deliveryRequest.publicId}
              </Link>,
            ],
          ]}
        />
        <p className="panel-note">
          La vigencia indica hasta cuándo puede aceptarse el precio; no
          determina cuándo se realizará el servicio. Mandaria Web no acepta ni
          cancela cotizaciones: esa operación pertenece a la integración.
        </p>
      </section>
      <section className="panel" aria-labelledby="quote-technical">
        <div className="panel-toolbar">
          <h2 id="quote-technical">Información técnica y fechas</h2>
        </div>
        <InfoGrid
          items={[
            ['Identificador', quote.publicId],
            ['ID interno', <code className="id-code">{quote.id}</code>],
            ['Proveedor de ruta', routingProviderLabel(quote.routingProvider)],
            ['Ruta calculada', date(quote.routeCalculatedAt)],
            ['Vigencia hasta', date(quote.expiresAt)],
            [
              'Aceptada',
              quote.acceptedAt ? date(quote.acceptedAt) : NOT_PROVIDED,
            ],
            [
              'Expirada',
              quote.expiredAt ? date(quote.expiredAt) : NOT_PROVIDED,
            ],
            [
              'Cancelada',
              quote.cancelledAt ? date(quote.cancelledAt) : NOT_PROVIDED,
            ],
            ['Creación', date(quote.createdAt)],
            ['Última actualización', date(quote.updatedAt)],
          ]}
        />
      </section>
    </>
  )
}
