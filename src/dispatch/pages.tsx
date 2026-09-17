import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import {
  Empty,
  ErrorState,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
} from '../components/ui'
import { ProviderScope } from '../logistics/components'
import type { ProviderContext } from '../logistics/types'
import { km, serviceTypeLabels } from '../pricing/format'
import { duration } from '../quotes/format'
import { coordinates } from '../delivery-requests/format'
import { date } from '../utils/format'
import { providerDispatches } from './service'
import { dispatchKeys } from './queries'
import {
  candidateStatusLabels,
  dispatchStatusLabels,
  summaryReason,
} from './format'
import {
  ClaimDialog,
  Countdown,
  DispatchBadge,
  MoneyBlock,
  PackagesList,
  ReleaseDialog,
  ServiceCard,
} from './components'
import { canClaim, canRelease } from './rules'
import { useNow } from './use-now'
import { dispatchStatuses, type ProviderDispatch } from './types'

const PAGE_SIZE = 20
const tabs = [
  { id: 'available', label: 'Disponibles', view: 'AVAILABLE' },
  { id: 'claimed', label: 'Mis servicios', view: 'CLAIMED' },
  { id: 'history', label: 'Historial', view: 'ALL' },
] as const
type TabId = (typeof tabs)[number]['id']
const empty: Record<TabId, [string, string]> = {
  available: [
    'No hay servicios disponibles en este momento.',
    'Los servicios que Mandaria ofrezca a tu proveedor aparecerán aquí.',
  ],
  claimed: [
    'No tienes servicios tomados.',
    'Los servicios que tome tu proveedor aparecerán aquí.',
  ],
  history: [
    'No hay servicios en el historial.',
    'Aquí verás los servicios ofrecidos a tu proveedor.',
  ],
}

export function ProviderServicesPage() {
  return (
    <>
      <PageTitle
        title="Servicios"
        description="Servicios ofrecidos a tu proveedor. Mandaria confirma quién toma cada uno."
      />
      <ProviderScope>
        {(scope) => <ServicesBoard key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}

function ServicesBoard({ scope }: { scope: ProviderContext }) {
  const [params, setParams] = useSearchParams()
  const tab: TabId = tabs.some((t) => t.id === params.get('tab'))
    ? (params.get('tab') as TabId)
    : 'available'
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  const status =
    tab === 'history' &&
    (dispatchStatuses as readonly string[]).includes(params.get('status') ?? '')
      ? (params.get('status') as string)
      : undefined
  const view = tabs.find((t) => t.id === tab)!.view
  const filters = { page, pageSize: PAGE_SIZE, view, status }
  const query = useQuery({
    queryKey: dispatchKeys.providerList(scope.providerId, filters),
    queryFn: ({ signal }) =>
      providerDispatches.list(scope.providerId, filters, signal),
  })
  const now = useNow(tab !== 'history')
  const [claiming, setClaiming] = useState<ProviderDispatch | null>(null)
  const [releasing, setReleasing] = useState<ProviderDispatch | null>(null)
  const go = (next: { tab?: TabId; page?: number; status?: string }) => {
    const search = new URLSearchParams({ providerId: scope.providerId })
    search.set('tab', next.tab ?? tab)
    if (next.page && next.page > 1) search.set('page', String(next.page))
    if (next.status) search.set('status', next.status)
    setParams(search)
  }
  return (
    <>
      <div className="panel">
        <div className="panel-toolbar">
          <div className="tab-list" role="tablist" aria-label="Servicios">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => go({ tab: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            className="button secondary small"
            onClick={() => {
              void query.refetch()
            }}
            disabled={query.isFetching}
          >
            <RefreshCw size={14} className={query.isFetching ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
        {tab === 'history' && (
          <div className="filters">
            <select
              aria-label="Filtrar servicios por estado"
              value={status ?? ''}
              onChange={(e) => go({ tab, status: e.target.value })}
            >
              <option value="">Todos los estados</option>
              {dispatchStatuses.map((value) => (
                <option key={value} value={value}>
                  {dispatchStatusLabels[value]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div role="tabpanel" aria-label={tabs.find((t) => t.id === tab)!.label}>
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
              <div className="service-grid">
                {query.data.items.map((dispatch) => (
                  <ServiceCard
                    key={dispatch.id}
                    dispatch={dispatch}
                    providerId={scope.providerId}
                    now={now}
                    onClaim={setClaiming}
                    onRelease={setReleasing}
                  />
                ))}
              </div>
              <Pagination
                page={page}
                total={query.data.total}
                totalPages={query.data.totalPages}
                onPage={(value) => go({ tab, page: value, status })}
              />
            </>
          ) : (
            <Empty title={empty[tab][0]} description={empty[tab][1]} />
          )}
        </div>
        <p className="panel-note">
          Sin actualización en tiempo real: usa Actualizar para ver cambios de
          otros proveedores. El tiempo restante es informativo; Mandaria decide
          si un servicio sigue disponible.
        </p>
      </div>
      {claiming && (
        <ClaimDialog
          providerId={scope.providerId}
          dispatch={claiming}
          onClose={() => setClaiming(null)}
          onClaimed={() => {
            setClaiming(null)
            go({ tab: 'claimed' })
          }}
        />
      )}
      {releasing && (
        <ReleaseDialog
          providerId={scope.providerId}
          dispatch={releasing}
          onClose={() => setReleasing(null)}
          onReleased={() => setReleasing(null)}
        />
      )}
    </>
  )
}

export function ProviderServiceDetail() {
  const { id = '' } = useParams()
  return (
    <ProviderScope>
      {(scope) => (
        <ServiceRecord
          key={`${scope.providerId}:${id}`}
          scope={scope}
          id={id}
        />
      )}
    </ProviderScope>
  )
}

function ServiceRecord({ scope, id }: { scope: ProviderContext; id: string }) {
  const back = `/services?providerId=${encodeURIComponent(scope.providerId)}`
  const query = useQuery({
    queryKey: dispatchKeys.providerDetail(scope.providerId, id),
    queryFn: ({ signal }) =>
      providerDispatches.get(scope.providerId, id, signal),
    staleTime: 0,
  })
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle title="Servicio" back={back} />
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
  return <ServiceContent scope={scope} dispatch={query.data} back={back} />
}

function ServiceContent({
  scope,
  dispatch,
  back,
}: {
  scope: ProviderContext
  dispatch: ProviderDispatch
  back: string
}) {
  const navigate = useNavigate()
  const now = useNow(dispatch.status === 'OPEN')
  const [claiming, setClaiming] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const service = dispatch.service
  const title =
    service?.deliveryRequestPublicId ??
    `Servicio en ${dispatch.serviceZone.name}`
  return (
    <>
      <PageTitle
        title={title}
        description={`${serviceTypeLabels[dispatch.serviceType] ?? 'Servicio'} · ${scope.name}`}
        back={back}
        action={
          dispatch.access === 'OFFER' && dispatch.status === 'OPEN' ? (
            <button
              className="button"
              disabled={!canClaim(dispatch, now)}
              onClick={() => setClaiming(true)}
            >
              TOMAR SERVICIO
            </button>
          ) : canRelease(dispatch) ? (
            <button
              className="button secondary destructive"
              onClick={() => setReleasing(true)}
            >
              LIBERAR SERVICIO
            </button>
          ) : undefined
        }
      />
      <section className="panel" aria-labelledby="service-state">
        <div className="panel-toolbar">
          <h2 id="service-state">Estado</h2>
          <DispatchBadge status={dispatch.status} />
        </div>
        <InfoGrid
          items={[
            [
              'Tiempo para tomarlo',
              dispatch.status === 'OPEN' ? (
                <Countdown expiresAt={dispatch.expiresAt} now={now} />
              ) : (
                `Hasta ${date(dispatch.expiresAt)}`
              ),
            ],
            ['Zona', dispatch.serviceZone.name],
            ...(dispatch.claimedByMe && dispatch.claimedAt
              ? ([['Tomado', date(dispatch.claimedAt)]] as [string, string][])
              : []),
            ...(dispatch.cancelledAt
              ? ([['Cancelado', date(dispatch.cancelledAt)]] as [
                  string,
                  string,
                ][])
              : []),
            ...(dispatch.myCandidate
              ? ([
                  [
                    'Mi proveedor',
                    candidateStatusLabels[dispatch.myCandidate.status],
                  ],
                ] as [string, string][])
              : []),
            ...(dispatch.myCandidate?.releaseReason
              ? ([
                  ['Motivo de liberación', dispatch.myCandidate.releaseReason],
                ] as [string, string][])
              : []),
          ]}
        />
        {!service && <p className="panel-note">{summaryReason(dispatch)}</p>}
        {canRelease(dispatch) && (
          <p className="panel-note">
            Servicio tomado. La asignación de repartidor y vehículo llegará en
            una próxima etapa.
          </p>
        )}
      </section>
      {service && (
        <>
          <section className="panel" aria-labelledby="service-route">
            <div className="panel-toolbar">
              <h2 id="service-route">Ruta</h2>
            </div>
            <div className="delivery-stops service-stops">
              {(
                [
                  ['Origen', service.pickup],
                  ['Destino', service.dropoff],
                ] as const
              ).map(([label, stop]) => (
                <InfoGrid
                  key={label}
                  items={[
                    [label, stop.address],
                    ['Coordenadas', coordinates(stop.latitude, stop.longitude)],
                    ...(stop.contactName !== undefined
                      ? ([
                          ['Contacto', stop.contactName],
                          [
                            'Teléfono',
                            <a
                              href={`tel:${(stop.contactPhone ?? '').replace(/[^\d+]/g, '')}`}
                            >
                              {stop.contactPhone}
                            </a>,
                          ],
                          [
                            'Instrucciones',
                            stop.instructions ?? 'Sin instrucciones',
                          ],
                        ] as [string, ReactNode][])
                      : []),
                  ]}
                />
              ))}
            </div>
            <InfoGrid
              items={[
                ['Distancia', km(service.route.distanceMeters)],
                ['Duración estimada', duration(service.route.durationSeconds)],
                ...(service.externalReference !== undefined
                  ? ([
                      [
                        'Referencia del comercio',
                        service.externalReference ?? '—',
                      ],
                    ] as [string, string][])
                  : []),
              ]}
            />
            {dispatch.access === 'OFFER' && (
              <p className="panel-note">
                Los contactos e instrucciones se muestran cuando tu proveedor
                toma el servicio.
              </p>
            )}
          </section>
          <section className="panel" aria-labelledby="service-money">
            <div className="panel-toolbar">
              <h2 id="service-money">Cobro y mercancía</h2>
            </div>
            <div className="panel-body">
              <MoneyBlock service={service} />
            </div>
          </section>
          <section className="panel" aria-labelledby="service-packages">
            <div className="panel-toolbar">
              <h2 id="service-packages">Paquetes</h2>
            </div>
            <PackagesList packages={service.packages} />
          </section>
        </>
      )}
      {claiming && (
        <ClaimDialog
          providerId={scope.providerId}
          dispatch={dispatch}
          onClose={() => setClaiming(false)}
          onClaimed={() => setClaiming(false)}
        />
      )}
      {releasing && (
        <ReleaseDialog
          providerId={scope.providerId}
          dispatch={dispatch}
          onClose={() => setReleasing(false)}
          onReleased={() => {
            setReleasing(false)
            navigate(`${back}&tab=claimed`)
          }}
        />
      )}
    </>
  )
}
