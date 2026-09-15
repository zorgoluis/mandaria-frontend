import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search } from 'lucide-react'
import {
  ActionForm,
  Badge,
  Empty,
  ErrorPage,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { integrations } from '../integrations/service'
import { queryClient } from '../services/query'
import { ApiError } from '../services/errors'
import { date, labels } from '../utils/format'
import { deliveryRequests } from './service'
import { deliveryRequestKeys } from './queries'
import {
  NOT_PROVIDED,
  categoryLabels,
  coordinates,
  dayBoundary,
  dimensions,
  money,
  paymentModes,
  weight,
} from './format'
import {
  PUBLIC_ID,
  deliveryRequestStatuses,
  type DeliveryFinancialContext,
  type DeliveryPackage,
  type DeliveryRequest,
  type DeliveryStop,
} from './types'

const PAGE_SIZE = 20
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fields = [
  'publicId',
  'integrationClientId',
  'externalReference',
  'status',
  'from',
  'to',
] as const
type Draft = Record<(typeof fields)[number], string>

const signatureOf = (draft: Draft) => fields.map((key) => draft[key]).join('\n')
function readDraft(params: URLSearchParams): Draft {
  return Object.fromEntries(
    fields.map((key) => [key, params.get(key) ?? '']),
  ) as Draft
}
/** Rejects values the backend DTO would refuse, so a hand-edited URL never hits the API. */
function problem(draft: Draft) {
  if (draft.publicId && !PUBLIC_ID.test(draft.publicId))
    return 'El identificador debe tener el formato MDR-000123.'
  if (draft.integrationClientId && !UUID.test(draft.integrationClientId))
    return 'La integración seleccionada no es válida.'
  if (draft.externalReference.length > 100)
    return 'La referencia externa admite hasta 100 caracteres.'
  if (
    draft.status &&
    !(deliveryRequestStatuses as readonly string[]).includes(draft.status)
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

export function DeliveryRequestsPage() {
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
    integrationClientId: current.integrationClientId || undefined,
    externalReference: current.externalReference || undefined,
    status: current.status || undefined,
    requestedFrom: current.from ? dayBoundary(current.from, false) : undefined,
    requestedTo: current.to ? dayBoundary(current.to, true) : undefined,
  }
  const query = useQuery({
    queryKey: deliveryRequestKeys.list(filters),
    queryFn: ({ signal }) => deliveryRequests.list(filters, signal),
    enabled: !invalid,
  })
  const filtered = fields.some((key) => current[key])
  function apply(draft: Draft) {
    const next = new URLSearchParams()
    for (const key of fields) if (draft[key]) next.set(key, draft[key])
    next.set('page', '1')
    setParams(next)
  }
  return (
    <>
      <PageTitle
        title="Solicitudes"
        description="Qué solicitaron transportar las integraciones. Consulta y cancelación."
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Solicitudes de entrega</h2>
            <p>Ordenadas por fecha de solicitud, de la más reciente</p>
          </div>
        </div>
        <DeliveryFilters current={current} onApply={apply} />
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
              <Table
                stacked
                rows={query.data.items}
                columns={[
                  {
                    label: 'Solicitud',
                    render: (row) => (
                      <Link
                        className="entity-name"
                        to={`/delivery-requests/${encodeURIComponent(row.publicId)}`}
                        state={{ list: location.search }}
                      >
                        {row.publicId}
                      </Link>
                    ),
                  },
                  {
                    label: 'Origen',
                    render: (row) => (
                      <span className="cell-meta">
                        {row.integrationClient.name}
                        <small>{row.integrationClient.code}</small>
                      </span>
                    ),
                  },
                  {
                    label: 'Referencia externa',
                    render: (row) => row.externalReference ?? NOT_PROVIDED,
                  },
                  {
                    label: 'Estado',
                    render: (row) => <Badge value={row.status} />,
                  },
                  {
                    label: 'Solicitada',
                    render: (row) => date(row.requestedAt),
                  },
                  {
                    label: 'Acciones',
                    render: (row) => (
                      <Link
                        className="table-action"
                        to={`/delivery-requests/${encodeURIComponent(row.publicId)}`}
                        state={{ list: location.search }}
                        aria-label={`Ver detalle de ${row.publicId}`}
                      >
                        Ver detalle <ArrowUpRight size={15} />
                      </Link>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                title="No hay solicitudes de entrega."
                description={
                  filtered
                    ? 'Ninguna solicitud coincide con los filtros aplicados.'
                    : 'Las solicitudes que envíen las integraciones aparecerán aquí.'
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
            <p className="panel-note">
              El listado del backend no incluye direcciones ni contactos;
              consulta el detalle para ver recogida y entrega.
            </p>
          </>
        )}
      </div>
    </>
  )
}

function DeliveryFilters({
  current,
  onApply,
}: {
  current: Draft
  onApply: (draft: Draft) => void
}) {
  const clients = useQuery({
    queryKey: ['integrations'],
    queryFn: ({ signal }) => integrations.list(signal),
  })
  const signature = signatureOf(current)
  const [draft, setDraft] = useState(current)
  const [seen, setSeen] = useState(signature)
  const [applied, setApplied] = useState(signature)
  // React Router commits the URL in a transition, after the draft already changed.
  // Only URL changes this form did not apply (back/forward, links) replace the draft,
  // so a late commit never overwrites what the user typed or selected since.
  if (seen !== signature) {
    setSeen(signature)
    if (signature !== applied) setDraft(current)
  }
  const commit = (next: Draft) => {
    setDraft(next)
    setApplied(signatureOf(next))
    onApply(next)
  }
  const normalize = (value: Draft): Draft => ({
    ...value,
    publicId: value.publicId.trim().toUpperCase(),
    externalReference: value.externalReference.trim(),
  })
  const set = (key: keyof Draft, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  const selectAndApply = (key: keyof Draft, value: string) =>
    commit(normalize({ ...draft, [key]: value }))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commit(normalize(draft))
  }
  const known = clients.data?.some((c) => c.id === draft.integrationClientId)
  return (
    <form
      className="filters delivery-filters"
      onSubmit={submit}
      aria-label="Filtros de solicitudes"
    >
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Identificador"
          placeholder="MDR-000123"
          value={draft.publicId}
          maxLength={20}
          onChange={(e) => set('publicId', e.target.value)}
        />
      </label>
      <label className="search">
        <input
          aria-label="Referencia externa"
          placeholder="Referencia externa exacta"
          value={draft.externalReference}
          maxLength={100}
          onChange={(e) => set('externalReference', e.target.value)}
        />
      </label>
      <select
        aria-label="Filtrar por integración"
        value={draft.integrationClientId}
        disabled={clients.isPending}
        onChange={(e) => selectAndApply('integrationClientId', e.target.value)}
      >
        <option value="">
          {clients.isPending
            ? 'Cargando integraciones…'
            : 'Todas las integraciones'}
        </option>
        {draft.integrationClientId && !known && (
          <option value={draft.integrationClientId}>
            Integración seleccionada
          </option>
        )}
        {clients.data?.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por estado"
        value={draft.status}
        onChange={(e) => selectAndApply('status', e.target.value)}
      >
        <option value="">Todos los estados</option>
        {deliveryRequestStatuses.map((status) => (
          <option key={status} value={status}>
            {labels[status]}
          </option>
        ))}
      </select>
      <label className="date-filter">
        <span>Desde</span>
        <input
          type="date"
          aria-label="Solicitadas desde"
          value={draft.from}
          max={draft.to || undefined}
          onChange={(e) => set('from', e.target.value)}
        />
      </label>
      <label className="date-filter">
        <span>Hasta</span>
        <input
          type="date"
          aria-label="Solicitadas hasta"
          value={draft.to}
          min={draft.from || undefined}
          onChange={(e) => set('to', e.target.value)}
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
      {clients.isError && (
        <small className="muted">
          No fue posible cargar las integraciones para el filtro.
        </small>
      )}
    </form>
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
  return `/delivery-requests${search}`
}

export function DeliveryRequestDetail() {
  const { publicId: raw = '' } = useParams()
  const publicId = raw.toUpperCase()
  if (!PUBLIC_ID.test(publicId)) return <ErrorPage code={404} />
  return <DeliveryRequestRecord key={publicId} publicId={publicId} />
}
function DeliveryRequestRecord({ publicId }: { publicId: string }) {
  const back = useBackToList()
  const query = useQuery({
    queryKey: deliveryRequestKeys.detail(publicId),
    queryFn: ({ signal }) => deliveryRequests.get(publicId, signal),
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
  return <DeliveryRequestContent item={query.data} back={back} />
}

function DeliveryRequestContent({
  item,
  back,
}: {
  item: DeliveryRequest
  back: string
}) {
  const [cancelling, setCancelling] = useState(false)
  const pickup = item.stops.find((stop) => stop.type === 'PICKUP')
  const dropoff = item.stops.find((stop) => stop.type === 'DROPOFF')
  return (
    <>
      <PageTitle
        title={item.publicId}
        description={`Solicitado por ${item.integrationClient.name}`}
        back={back}
        action={
          item.status === 'CREATED' && (
            <button
              className="button secondary destructive"
              onClick={() => setCancelling(true)}
            >
              Cancelar solicitud
            </button>
          )
        }
      />
      <section className="panel" aria-labelledby="request-summary">
        <div className="panel-toolbar">
          <h2 id="request-summary">Resumen</h2>
        </div>
        <InfoGrid
          items={[
            ['Estado', <Badge value={item.status} />],
            [
              'Solicitado por',
              <Link
                className="entity-name"
                to={`/integrations/${encodeURIComponent(item.integrationClient.id)}`}
              >
                {item.integrationClient.name}
                <small>{item.integrationClient.code}</small>
              </Link>,
            ],
            ['Referencia externa', item.externalReference ?? NOT_PROVIDED],
            ['Solicitada', date(item.requestedAt)],
          ]}
        />
        <p className="panel-note">
          Las solicitudes son inmutables. Para corregir datos, la integración
          debe cancelar y crear una nueva solicitud.
        </p>
      </section>
      {item.status === 'CANCELLED' && (
        <section
          className="panel cancellation-panel"
          aria-labelledby="request-cancellation"
        >
          <div className="panel-toolbar">
            <h2 id="request-cancellation">Cancelación</h2>
          </div>
          <InfoGrid
            items={[
              ['Estado', 'Cancelada'],
              ['Fecha', date(item.cancelledAt)],
              ['Motivo', item.cancellationReason ?? 'Sin motivo registrado'],
            ]}
          />
        </section>
      )}
      <div className="delivery-stops">
        <StopPanel title="Recogida" id="request-pickup" stop={pickup} />
        <StopPanel title="Entrega" id="request-dropoff" stop={dropoff} />
      </div>
      <PackagesPanel packages={item.packages} />
      <FinancialPanel context={item.financialContext} />
      <section className="panel" aria-labelledby="request-technical">
        <div className="panel-toolbar">
          <h2 id="request-technical">Información técnica y fechas</h2>
        </div>
        <InfoGrid
          items={[
            ['Identificador', item.publicId],
            ['ID interno', <code className="id-code">{item.id}</code>],
            [
              'ID de integración',
              <code className="id-code">{item.integrationClientId}</code>,
            ],
            ['Solicitada', date(item.requestedAt)],
            ['Creación', date(item.createdAt)],
            ['Última actualización', date(item.updatedAt)],
            [
              'Cancelación',
              item.cancelledAt ? date(item.cancelledAt) : NOT_PROVIDED,
            ],
          ]}
        />
      </section>
      {cancelling && (
        <CancelDialog item={item} onClose={() => setCancelling(false)} />
      )}
    </>
  )
}

function StopPanel({
  title,
  id,
  stop,
}: {
  title: string
  id: string
  stop?: DeliveryStop
}) {
  return (
    <section className="panel" aria-labelledby={id}>
      <div className="panel-toolbar">
        <h2 id={id}>{title}</h2>
      </div>
      {stop ? (
        <InfoGrid
          items={[
            ['Dirección', stop.address],
            ['Contacto', stop.contactName],
            [
              'Teléfono',
              <a href={`tel:${stop.contactPhone.replace(/[^\d+]/g, '')}`}>
                {stop.contactPhone}
              </a>,
            ],
            ['Instrucciones', stop.instructions ?? 'Sin instrucciones'],
            ['Coordenadas', coordinates(stop.latitude, stop.longitude)],
          ]}
        />
      ) : (
        <Empty
          title="Sin información"
          description="La solicitud no incluye esta parada."
        />
      )}
    </section>
  )
}

function PackagesPanel({ packages }: { packages: DeliveryPackage[] }) {
  const units = packages.reduce((sum, item) => sum + item.quantity, 0)
  return (
    <section className="panel" aria-labelledby="request-packages">
      <div className="panel-toolbar">
        <div>
          <h2 id="request-packages">Paquetes</h2>
          <p>
            {packages.length} {packages.length === 1 ? 'paquete' : 'paquetes'} ·{' '}
            {units} {units === 1 ? 'unidad' : 'unidades'}
          </p>
        </div>
      </div>
      {packages.length ? (
        <ul className="package-list">
          {packages.map((item, index) => (
            <li key={index} className="package-card">
              <div className="package-heading">
                <span className="tag">{categoryLabels[item.category]}</span>
                <strong>{item.description}</strong>
              </div>
              <InfoGrid
                items={[
                  ['Cantidad', item.quantity.toLocaleString('es-MX')],
                  ['Peso', weight(item.weightKg)],
                  ['Dimensiones', dimensions(item)],
                  ['Frágil', item.isFragile ? 'Sí' : 'No'],
                  ['Manejo', item.handlingInstructions ?? 'Sin indicaciones'],
                ]}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          title="Sin paquetes"
          description="La solicitud no tiene paquetes."
        />
      )}
    </section>
  )
}

function FinancialPanel({
  context,
}: {
  context: DeliveryFinancialContext | null
}) {
  const mode = context ? paymentModes[context.goodsPaymentMode] : undefined
  return (
    <section className="panel" aria-labelledby="request-financial">
      <div className="panel-toolbar">
        <h2 id="request-financial">Contexto económico</h2>
      </div>
      {context ? (
        <>
          <InfoGrid
            items={[
              ['Valor de mercancía', money(context)],
              [
                'Modalidad',
                <span className="cell-meta">
                  {mode?.label ?? 'Modalidad desconocida'}
                  <small>
                    <code>{context.goodsPaymentMode}</code>
                  </small>
                </span>,
              ],
            ]}
          />
          {mode && (
            <div className="panel-body financial-description">
              <p className="notice">{mode.description}</p>
            </div>
          )}
          <p className="panel-note">
            Valor declarado por la integración únicamente para la mercancía.
          </p>
        </>
      ) : (
        <Empty
          title="Sin contexto económico"
          description="La solicitud no tiene contexto económico registrado."
        />
      )}
    </section>
  )
}

function CancelDialog({
  item,
  onClose,
}: {
  item: DeliveryRequest
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const notify = useFeedback()
  return (
    <Modal
      title="Cancelar solicitud"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <p className="modal-description">
        La solicitud {item.publicId} pasará a Cancelada. Esta acción no se puede
        deshacer y la solicitud no podrá editarse.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Confirmar cancelación"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const reason = String(data.get('reason') ?? '').trim()
          if (!reason)
            throw new ApiError(400, 'Escribe el motivo de cancelación.')
          setBusy(true)
          try {
            const result = await deliveryRequests.cancel(item.publicId, reason)
            queryClient.setQueryData(
              deliveryRequestKeys.detail(item.publicId),
              result,
            )
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: [...deliveryRequestKeys.all, 'list'],
              }),
              queryClient.invalidateQueries({
                queryKey: [...deliveryRequestKeys.all, 'count'],
              }),
            ])
            // The backend answers 200 with the original data if it was already cancelled.
            notify(
              result.status === 'CANCELLED' &&
                result.cancellationReason !== reason
                ? 'La solicitud ya estaba cancelada; se conservan la fecha y el motivo originales.'
                : 'Solicitud cancelada correctamente.',
            )
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field
          label="Motivo de cancelación"
          hint="Obligatorio. Hasta 500 caracteres."
        >
          <textarea name="reason" required maxLength={500} rows={4} />
        </Field>
      </ActionForm>
    </Modal>
  )
}
