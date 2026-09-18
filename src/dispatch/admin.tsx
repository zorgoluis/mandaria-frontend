import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorState,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { money, serviceTypeLabels } from '../pricing/format'
import { paymentModes } from '../delivery-requests/format'
import { PUBLIC_ID } from '../delivery-requests/types'
import { date } from '../utils/format'
import { adminAssignments } from '../delivery-assignments/service'
import { assignmentKeys } from '../delivery-assignments/queries'
import { AssignmentHistory } from '../delivery-assignments/components'
import { adminDispatches } from './service'
import { dispatchKeys } from './queries'
import {
  candidateStatusLabels,
  dispatchCancellationLabel,
  dispatchStatusLabels,
} from './format'
import { DispatchBadge } from './components'
import { dispatchStatuses, type AdminDispatch } from './types'

const PAGE_SIZE = 20
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const claimedBy = (item: AdminDispatch) =>
  item.candidates.find((c) => c.provider.id === item.claimedByProviderId)
    ?.provider.name

/** SUPER_ADMIN audit only: the API has no admin claim or release, so neither does the UI. */
export function AdminDispatchesPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  const statusParam = params.get('status') ?? ''
  const status = (dispatchStatuses as readonly string[]).includes(statusParam)
    ? statusParam
    : undefined
  const requestParam = (params.get('request') ?? '').toUpperCase()
  const invalid = requestParam && !PUBLIC_ID.test(requestParam)
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    status,
    deliveryRequestPublicId: requestParam || undefined,
  }
  const query = useQuery({
    queryKey: dispatchKeys.adminList(filters),
    queryFn: ({ signal }) => adminDispatches.list(filters, signal),
    enabled: !invalid,
  })
  const [draft, setDraft] = useState(requestParam)
  const apply = (next: {
    status?: string
    request?: string
    page?: number
  }) => {
    const search = new URLSearchParams()
    const s = next.status ?? status
    const r = next.request ?? requestParam
    if (s) search.set('status', s)
    if (r) search.set('request', r)
    if (next.page && next.page > 1) search.set('page', String(next.page))
    setParams(search)
  }
  return (
    <>
      <PageTitle
        title="Despachos"
        description="Oferta de servicios aceptados a proveedores. Auditoría de sólo lectura."
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Despachos</h2>
            <p>Del más reciente al más antiguo</p>
          </div>
        </div>
        <div className="filters">
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault()
              apply({ request: draft.trim().toUpperCase(), page: 1 })
            }}
          >
            <Search size={17} />
            <input
              aria-label="Buscar por solicitud"
              placeholder="MDR-000123"
              value={draft}
              maxLength={32}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="text-button" type="submit">
              Buscar
            </button>
          </form>
          <select
            aria-label="Filtrar despachos por estado"
            value={status ?? ''}
            onChange={(e) => apply({ status: e.target.value, page: 1 })}
          >
            <option value="">Todos los estados</option>
            {dispatchStatuses.map((value) => (
              <option key={value} value={value}>
                {dispatchStatusLabels[value]}
              </option>
            ))}
          </select>
        </div>
        {invalid ? (
          <div className="panel-body">
            <p className="inline-error" role="alert">
              El identificador de solicitud debe tener el formato MDR-000123.
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
        ) : query.data.items.length ? (
          <>
            <Table
              stacked
              rows={query.data.items}
              columns={[
                {
                  label: 'Solicitud',
                  render: (row) => (
                    <Link
                      className="entity-name"
                      to={`/dispatches/${encodeURIComponent(row.id)}`}
                    >
                      {row.deliveryRequest.publicId}
                      <small>{row.deliveryQuote.publicId}</small>
                    </Link>
                  ),
                },
                {
                  label: 'Estado',
                  render: (row) => (
                    <span className="cell-meta">
                      <DispatchBadge status={row.status} />
                      {row.noProviderAvailable && (
                        <small>Sin proveedor disponible</small>
                      )}
                    </span>
                  ),
                },
                {
                  label: 'Costo del envío',
                  render: (row) =>
                    money(row.deliveryQuote.amount, row.deliveryQuote.currency),
                },
                {
                  label: 'Zona',
                  render: (row) => row.deliveryQuote.serviceZone.name,
                },
                {
                  label: 'Tomado por',
                  render: (row) => claimedBy(row) ?? '—',
                },
                {
                  label: 'Candidatos',
                  render: (row) => row.candidates.length,
                },
                { label: 'Vence', render: (row) => date(row.expiresAt) },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <Link
                      className="table-action"
                      to={`/dispatches/${encodeURIComponent(row.id)}`}
                      aria-label={`Ver despacho de ${row.deliveryRequest.publicId}`}
                    >
                      Ver detalle <ArrowUpRight size={15} />
                    </Link>
                  ),
                },
              ]}
            />
            <Pagination
              page={page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={(value) => apply({ page: value })}
            />
          </>
        ) : (
          <Empty
            title="No hay despachos."
            description={
              status || requestParam
                ? 'Ningún despacho coincide con los filtros aplicados.'
                : 'Los despachos se abren cuando una integración acepta una cotización.'
            }
          />
        )}
        <p className="panel-note">
          SUPER_ADMIN no toma ni libera servicios. Un despacho se cancela al
          cancelar su solicitud.
        </p>
      </div>
    </>
  )
}

export function AdminDispatchDetail() {
  const { id = '' } = useParams()
  const valid = UUID.test(id)
  const query = useQuery({
    queryKey: dispatchKeys.adminDetail(id),
    queryFn: ({ signal }) => adminDispatches.get(id, signal),
    enabled: valid,
  })
  if (!valid || query.isPending || query.isError)
    return (
      <>
        <PageTitle title="Despacho" back="/dispatches" />
        {!valid ? (
          <Empty
            title="Despacho no encontrado"
            description="Revisa el enlace."
          />
        ) : query.isPending ? (
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
  const item = query.data
  const goods = item.goods
  return (
    <>
      <PageTitle
        title={`Despacho de ${item.deliveryRequest.publicId}`}
        description={`${serviceTypeLabels[item.deliveryQuote.serviceType] ?? 'Servicio'} · ${item.deliveryQuote.serviceZone.name}`}
        back="/dispatches"
      />
      <section className="panel" aria-labelledby="dispatch-summary">
        <div className="panel-toolbar">
          <h2 id="dispatch-summary">Resumen</h2>
          <DispatchBadge status={item.status} />
        </div>
        <InfoGrid
          items={[
            [
              'Solicitud',
              <Link
                to={`/delivery-requests/${encodeURIComponent(item.deliveryRequest.publicId)}`}
              >
                {item.deliveryRequest.publicId}
              </Link>,
            ],
            [
              'Cotización',
              <Link
                to={`/delivery-quotes/${encodeURIComponent(item.deliveryQuote.publicId)}`}
              >
                {item.deliveryQuote.publicId}
              </Link>,
            ],
            ['Abierto', date(item.openedAt)],
            ['Vence', date(item.expiresAt)],
            ['Tomado por', claimedBy(item) ?? '—'],
            ['Tomado', item.claimedAt ? date(item.claimedAt) : '—'],
            ...(item.expiredAt
              ? ([['Expiró', date(item.expiredAt)]] as [string, string][])
              : []),
            ...(item.cancelledAt
              ? ([
                  ['Cancelado', date(item.cancelledAt)],
                  [
                    'Motivo',
                    dispatchCancellationLabel(item.cancellationReason),
                  ],
                ] as [string, string][])
              : []),
          ]}
        />
        {item.noProviderAvailable && (
          <p className="panel-note warning">
            Ningún proveedor puede tomarlo: no quedan candidatos ofrecidos.
            Expirará al vencer la ventana.
          </p>
        )}
      </section>
      <section className="panel" aria-labelledby="dispatch-money">
        <div className="panel-toolbar">
          <h2 id="dispatch-money">Cobro y mercancía</h2>
        </div>
        <div className="panel-body">
          <div className="money-block">
            <div className="money-fee">
              <span>Costo del envío</span>
              <strong>
                {money(item.deliveryQuote.amount, item.deliveryQuote.currency)}
              </strong>
            </div>
            <div
              className={`money-goods ${goods?.driverAdvancesGoods ? 'advance' : ''}`}
            >
              <span>Valor de mercancía</span>
              <strong>
                {goods?.value
                  ? money(goods.value, goods.currency)
                  : 'No informado'}
              </strong>
              <small>
                {goods
                  ? paymentModes[goods.paymentMode]?.label
                  : 'Sin contexto'}
              </small>
            </div>
          </div>
        </div>
      </section>
      <section className="panel" aria-labelledby="dispatch-candidates">
        <div className="panel-toolbar">
          <div>
            <h2 id="dispatch-candidates">Candidatos</h2>
            <p>Proveedores a los que se ofreció al abrirse</p>
          </div>
        </div>
        <Table
          stacked
          rows={item.candidates.map((c) => ({ ...c, id: c.provider.id }))}
          emptyTitle="Sin candidatos"
          empty="Ningún proveedor tenía cobertura activa para esta zona y servicio."
          columns={[
            {
              label: 'Proveedor',
              render: (row) => (
                <span className="entity-name">
                  {row.provider.name}
                  <small>{row.provider.code}</small>
                </span>
              ),
            },
            {
              label: 'Estado',
              render: (row) => (
                <Badge
                  value={row.status}
                  label={candidateStatusLabels[row.status]}
                />
              ),
            },
            { label: 'Ofrecido', render: (row) => date(row.offeredAt) },
            {
              label: 'Tomado',
              render: (row) => (row.claimedAt ? date(row.claimedAt) : '—'),
            },
            {
              label: 'Liberado',
              render: (row) => (row.releasedAt ? date(row.releasedAt) : '—'),
            },
            { label: 'Motivo', render: (row) => row.releaseReason ?? '—' },
          ]}
        />
      </section>
      <AdminAssignments dispatchId={item.id} />
    </>
  )
}

/**
 * SUPER_ADMIN audit only: V1.8 assignment is a fleet operation, so no assign, reassign or
 * cancel action is offered here even though the history is visible.
 */
function AdminAssignments({ dispatchId }: { dispatchId: string }) {
  const query = useQuery({
    queryKey: assignmentKeys.admin(dispatchId),
    queryFn: ({ signal }) => adminAssignments.history(dispatchId, signal),
    staleTime: 0,
  })
  return (
    <section className="panel" aria-labelledby="dispatch-assignments">
      <div className="panel-toolbar">
        <div>
          <h2 id="dispatch-assignments">Asignaciones</h2>
          <p>Quién ejecuta el servicio, de la más reciente a la más antigua</p>
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
      ) : (
        <>
          {query.data.length > 0 && (
            <InfoGrid
              items={[
                [
                  'Proveedor',
                  `${query.data[0].provider.name} · ${query.data[0].provider.code}`,
                ],
              ]}
            />
          )}
          <div className="panel-body">
            <AssignmentHistory
              assignments={query.data}
              emptyDescription="El proveedor que tomó el servicio todavía no asignó repartidor."
            />
          </div>
        </>
      )}
      <p className="panel-note">
        Lectura y auditoría. Asignar, reasignar y cancelar corresponden al
        proveedor dueño del servicio.
      </p>
    </section>
  )
}
