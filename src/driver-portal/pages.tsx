import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bike,
  PackageSearch,
  Coins,
  RefreshCw,
  Wallet,
} from 'lucide-react'
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
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { useAuth } from '../auth/context'
import { ApiError } from '../services/errors'
import { km } from '../pricing/format'
import { duration } from '../quotes/format'
import { categoryLabels, weight } from '../delivery-requests/format'
import { date, labels } from '../utils/format'
import { creditCostLabel, formatCredits } from '../credits/format'
import { myDriverCredits } from '../credits/service'
import { creditKeys } from '../credits/queries'
import { driverPortal } from './service'
import { driverKeys, refreshDriverPortal } from './queries'
import {
  amount,
  portalBlock,
  releaseReasonLabels,
  vehicleDetail,
  vehicleLabel,
} from './format'
import {
  REASON_DETAIL_MAX,
  REASON_DETAIL_MIN,
  releaseReasons,
  type DriverDispatch,
  type DriverPaymentContext,
  type DriverSelf,
  type ReleaseReason,
} from './types'

const PAGE_SIZE = 20

/**
 * Temporary web portal for the independent driver, designed mobile first: it stands in for the
 * future Driver App. Only a DRIVER whose independent profile is APPROVED gets in.
 */
export function DriverPortal({
  children,
}: {
  children: (me: DriverSelf) => ReactNode
}) {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: driverKeys.me,
    queryFn: ({ signal }) => driverPortal.me(signal),
    enabled: user?.role === 'DRIVER',
    staleTime: 0,
  })
  if (user?.role !== 'DRIVER') return <ErrorPage code={403} />
  if (query.isPending) return <Loading />
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch()
        }}
      />
    )
  const blocked = portalBlock(query.data.independent)
  if (blocked)
    return (
      <div className="panel">
        <Empty
          title="Todavía no puedes tomar servicios"
          description={blocked}
        />
        <p className="panel-note">
          Ser repartidor de un proveedor no habilita por sí solo a operar por
          cuenta propia: es una capacidad que Mandaria concede aparte.
        </p>
      </div>
    )
  return <>{children(query.data)}</>
}

const tabs = [
  { to: '/driver/services', label: 'Servicios', icon: PackageSearch },
  { to: '/driver/my-service', label: 'Mi servicio', icon: Bike },
  { to: '/driver/vehicles', label: 'Mis vehículos', icon: Wallet },
  { to: '/driver/credits', label: 'Créditos', icon: Coins },
] as const

export function PortalTabs() {
  return (
    <nav className="driver-tabs" aria-label="Portal del repartidor">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

/** Delivery fee and goods value are different money and are never added together. */
export function PaymentBlock({
  payment,
  beforeTaking = false,
}: {
  payment: DriverPaymentContext
  beforeTaking?: boolean
}) {
  return (
    <div className="driver-payment">
      <div className="payment-row">
        <span>Envío</span>
        <strong>{amount(payment.deliveryFee)}</strong>
      </div>
      <div className="payment-row">
        <span>Mercancía</span>
        <strong>
          {payment.goodsValue ? amount(payment.goodsValue) : 'No informada'}
        </strong>
      </div>
      {payment.driverAdvancesGoods ? (
        <div className="driver-advance" role="note">
          <p>
            <AlertTriangle size={18} aria-hidden="true" />
            <strong>
              {payment.driverAdvanceAmount
                ? `Este servicio requiere que entregues ${amount(payment.driverAdvanceAmount)} al comercio al recoger el pedido.`
                : 'Este servicio requiere que entregues el valor de la mercancía al comercio al recoger el pedido.'}
            </strong>
          </p>
          <p className="muted">
            {beforeTaking
              ? 'Asegúrate de llevar ese efectivo antes de tomarlo. '
              : 'Recupera ese dinero al entregar. '}
            Mandaria no conoce tu saldo ni mueve ese dinero.
          </p>
        </div>
      ) : (
        payment.goodsPaymentMode === 'PREPAID' && (
          <p className="muted">
            La mercancía ya está pagada al comercio: no adelantas dinero.
          </p>
        )
      )}
      <p className="panel-note">
        El envío es lo que cobra el servicio; la mercancía es del comercio. No
        se suman.
      </p>
    </div>
  )
}

function ServiceCard({ dispatch }: { dispatch: DriverDispatch }) {
  const { service, paymentContext } = dispatch
  return (
    <article
      className="driver-service-card"
      aria-label={`Servicio en ${dispatch.serviceZone.name}`}
    >
      <header>
        <span className="tag">Servicio disponible</span>
        <strong>{amount(paymentContext.deliveryFee)}</strong>
      </header>
      <dl>
        <div>
          <dt>Origen</dt>
          <dd>{service.pickup.address}</dd>
        </div>
        <div>
          <dt>Destino</dt>
          <dd>{service.dropoff.address}</dd>
        </div>
      </dl>
      <p className="driver-metrics">
        <span>{km(service.route.distanceMeters)}</span>
        <span>{duration(service.route.durationSeconds)}</span>
        <span className="credit-chip">
          Cuesta {creditCostLabel(dispatch.creditCost)}
        </span>
      </p>
      {paymentContext.driverAdvancesGoods && (
        <p className="driver-advance-chip">
          <AlertTriangle size={14} aria-hidden="true" />
          Requiere adelanto
          {paymentContext.driverAdvanceAmount
            ? ` de ${amount(paymentContext.driverAdvanceAmount)}`
            : ''}
        </p>
      )}
      <Link
        className="button"
        to={`/driver/services/${encodeURIComponent(dispatch.id)}`}
      >
        VER SERVICIO
      </Link>
    </article>
  )
}

export function AvailableServicesPage() {
  return <DriverPortal>{(me) => <AvailableServices me={me} />}</DriverPortal>
}
function AvailableServices({ me }: { me: DriverSelf }) {
  const [page, setPage] = useState(1)
  const busy = me.activeDeliveryAssignment !== null
  const query = useQuery({
    queryKey: driverKeys.available(page),
    queryFn: ({ signal }) => driverPortal.available(page, PAGE_SIZE, signal),
    enabled: !busy,
  })
  return (
    <>
      <PageTitle
        title="Servicios disponibles"
        description="Tómalos por tu cuenta, con tus propios vehículos."
      />
      <PortalTabs />
      {busy ? (
        <div className="panel">
          <Empty
            title="Ya tienes un servicio en curso"
            description="Termina o libera tu servicio actual antes de tomar otro."
            action={
              <Link className="button" to="/driver/my-service">
                Ver mi servicio
              </Link>
            }
          />
        </div>
      ) : (
        <div className="panel">
          <div className="panel-toolbar">
            <div>
              <h2>Cerca de ti</h2>
              <p>Ordenados por vencimiento</p>
            </div>
            <button
              className="button secondary small"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch()
              }}
            >
              <RefreshCw size={14} className={query.isFetching ? 'spin' : ''} />
              Actualizar
            </button>
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
              <div className="driver-service-grid">
                {query.data.items.map((dispatch) => (
                  <ServiceCard key={dispatch.id} dispatch={dispatch} />
                ))}
              </div>
              <Pagination
                page={page}
                total={query.data.total}
                totalPages={query.data.totalPages}
                onPage={setPage}
              />
            </>
          ) : (
            <Empty
              title="No hay servicios disponibles"
              description="Cuando Mandaria publique un servicio que puedas tomar, aparecerá aquí."
            />
          )}
          <p className="panel-note">
            Sin avisos automáticos todavía: usa Actualizar. Otro repartidor o
            proveedor puede tomar un servicio antes que tú.
          </p>
        </div>
      )}
    </>
  )
}

export function DriverServiceDetail() {
  const { id = '' } = useParams()
  return (
    <DriverPortal>
      {(me) => <ServiceRecord key={id} me={me} id={id} />}
    </DriverPortal>
  )
}
function ServiceRecord({ me, id }: { me: DriverSelf; id: string }) {
  const query = useQuery({
    queryKey: driverKeys.dispatch(id),
    queryFn: ({ signal }) => driverPortal.get(id, signal),
    staleTime: 0,
  })
  // The backend answers 404 for a dispatch this driver can neither take nor owns, exactly as for
  // an unknown id. For the driver that means someone else took it: never "reintentar".
  if (query.error instanceof ApiError && query.error.status === 404)
    return (
      <>
        <PageTitle title="Servicio" back="/driver/services" />
        <div className="panel">
          <Empty
            title="Este servicio ya no está disponible."
            description="Otro repartidor o proveedor lo tomó antes, o ya no está publicado."
            action={
              <Link className="button" to="/driver/services">
                Ver otros servicios
              </Link>
            }
          />
        </div>
      </>
    )
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle title="Servicio" back="/driver/services" />
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
  return <ServiceContent me={me} dispatch={query.data} />
}

function ServiceContent({
  me,
  dispatch,
}: {
  me: DriverSelf
  dispatch: DriverDispatch
}) {
  const [taking, setTaking] = useState(false)
  const { service, paymentContext } = dispatch
  const mine = dispatch.takenByMe
  const busyElsewhere = !mine && me.activeDeliveryAssignment !== null
  const gone = !mine && dispatch.status !== 'OPEN'
  return (
    <>
      <PageTitle
        title={service.deliveryRequestPublicId ?? 'Servicio'}
        description={dispatch.serviceZone.name}
        back={mine ? '/driver/my-service' : '/driver/services'}
        action={
          mine ? undefined : gone ? undefined : (
            <button
              className="button"
              disabled={busyElsewhere}
              onClick={() => setTaking(true)}
            >
              TOMAR SERVICIO
            </button>
          )
        }
      />
      {gone && (
        <div className="panel">
          <Empty
            title="Este servicio ya no está disponible."
            description="Otro repartidor o proveedor lo tomó antes."
            action={
              <Link className="button" to="/driver/services">
                Ver otros servicios
              </Link>
            }
          />
        </div>
      )}
      {busyElsewhere && !gone && (
        <p className="warning notice" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          Ya tienes un servicio en curso. Libéralo antes de tomar otro.
        </p>
      )}
      <section className="panel" aria-labelledby="driver-route">
        <div className="panel-toolbar">
          <h2 id="driver-route">Ruta</h2>
        </div>
        <InfoGrid
          items={[
            ['Origen', service.pickup.address],
            ['Destino', service.dropoff.address],
            ['Distancia', km(service.route.distanceMeters)],
            ['Duración estimada', duration(service.route.durationSeconds)],
            ...(service.pickup.contactName !== undefined
              ? ([
                  ['Contacto en origen', service.pickup.contactName],
                  [
                    'Teléfono',
                    <a
                      href={`tel:${(service.pickup.contactPhone ?? '').replace(/[^\d+]/g, '')}`}
                    >
                      {service.pickup.contactPhone}
                    </a>,
                  ],
                ] as [string, ReactNode][])
              : []),
            ...(service.dropoff.contactName !== undefined
              ? ([
                  ['Contacto en destino', service.dropoff.contactName],
                  [
                    'Teléfono destino',
                    <a
                      href={`tel:${(service.dropoff.contactPhone ?? '').replace(/[^\d+]/g, '')}`}
                    >
                      {service.dropoff.contactPhone}
                    </a>,
                  ],
                ] as [string, ReactNode][])
              : []),
          ]}
        />
        {!mine && (
          <p className="panel-note">
            Los contactos y las instrucciones aparecen cuando tomas el servicio.
          </p>
        )}
      </section>
      <section className="panel" aria-labelledby="driver-money">
        <div className="panel-toolbar">
          <h2 id="driver-money">Cobro</h2>
        </div>
        <div className="panel-body">
          <PaymentBlock payment={paymentContext} beforeTaking={!mine} />
        </div>
      </section>
      <section className="panel" aria-labelledby="driver-credits-cost">
        <div className="panel-toolbar">
          <h2 id="driver-credits-cost">Créditos Mandaria</h2>
        </div>
        <div className="panel-body">
          <InfoGrid
            items={[
              ['Costo del servicio', creditCostLabel(dispatch.creditCost)],
            ]}
          />
          <p className="panel-note">
            Los créditos son una unidad interna de Mandaria: no son pesos y no
            cambian el cobro del envío ni la mercancía.
          </p>
        </div>
      </section>
      <section className="panel" aria-labelledby="driver-packages">
        <div className="panel-toolbar">
          <h2 id="driver-packages">Paquetes</h2>
        </div>
        <ul className="package-list">
          {service.packages.map((item, index) => (
            <li key={index} className="package-card">
              <div className="package-heading">
                <span className="tag">
                  {categoryLabels[item.category] ?? 'Otro'}
                </span>
                {item.description && <strong>{item.description}</strong>}
              </div>
              <InfoGrid
                items={[
                  ['Cantidad', item.quantity.toLocaleString('es-MX')],
                  ['Peso', weight(item.weightKg)],
                  ['Frágil', item.isFragile ? 'Sí' : 'No'],
                ]}
              />
            </li>
          ))}
        </ul>
      </section>
      {taking && (
        <TakeDialog dispatch={dispatch} onClose={() => setTaking(false)} />
      )}
    </>
  )
}

/**
 * One backend call: take is atomic. The web never sends claim and assignment separately, and
 * the outcome is always read back because another executor may have taken it first.
 */
/**
 * Taking a service charges its credit cost, so the driver sees the real balance before confirming.
 * It is only a warning: the backend decides and can still answer INSUFFICIENT_CREDITS.
 */
function CreditCheck({ cost }: { cost: number | null }) {
  const account = useQuery({
    queryKey: creditKeys.account('driver', 'me'),
    queryFn: ({ signal }) => myDriverCredits.account(signal),
    staleTime: 0,
  })
  if (cost === null || !account.isSuccess) return null
  const short = account.data.balance < cost
  return (
    <p className={short ? 'warning notice' : 'panel-note'} role="note">
      {short && <AlertTriangle size={16} aria-hidden="true" />}
      Tu saldo es de {formatCredits(account.data.balance)}
      {short
        ? '. No alcanza para tomar este servicio: contacta a Mandaria para recargar créditos.'
        : '.'}
    </p>
  )
}

function TakeDialog({
  dispatch,
  onClose,
}: {
  dispatch: DriverDispatch
  onClose: () => void
}) {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [vehicleId, setVehicleId] = useState('')
  const [gone, setGone] = useState(false)
  const vehicles = useQuery({
    queryKey: driverKeys.vehicles,
    queryFn: ({ signal }) => driverPortal.vehicles(signal),
    staleTime: 0,
  })
  const usable = (vehicles.data ?? []).filter((v) => v.status === 'ACTIVE')
  return (
    <Modal title="Tomar servicio" onClose={onClose}>
      {gone ? (
        <>
          <p className="inline-error" role="alert">
            Este servicio ya no está disponible.
          </p>
          <div className="form-actions">
            <button
              className="button"
              onClick={() => {
                onClose()
                navigate('/driver/services')
              }}
            >
              Ver otros servicios
            </button>
          </div>
        </>
      ) : (
        <>
          <InfoGrid
            items={[
              ['Origen', dispatch.service.pickup.address],
              ['Destino', dispatch.service.dropoff.address],
              ['Envío', amount(dispatch.paymentContext.deliveryFee)],
              ['Costo en créditos', creditCostLabel(dispatch.creditCost)],
            ]}
          />
          <CreditCheck cost={dispatch.creditCost} />
          <PaymentBlock payment={dispatch.paymentContext} beforeTaking />
          <ActionForm
            initialDirty
            submitLabel="CONFIRMAR"
            cancelLabel="Volver"
            onCancel={onClose}
            onSubmit={async () => {
              if (!vehicleId)
                throw new ApiError(400, 'Elige el vehículo que vas a usar.')
              try {
                await driverPortal.take(dispatch.id, vehicleId)
              } catch (error) {
                // Someone else won the race: refresh and stop offering it.
                if (
                  error instanceof ApiError &&
                  [
                    'DISPATCH_ALREADY_CLAIMED',
                    'DISPATCH_EXPIRED',
                    'DISPATCH_CANCELLED',
                    'DISPATCH_RETAKE_NOT_ALLOWED',
                    'DISPATCH_NOT_OPEN_TO_INDEPENDENT',
                    'TAKE_CONFLICT',
                  ].includes(error.code ?? '')
                ) {
                  setGone(true)
                  await refreshDriverPortal(dispatch.id)
                  return
                }
                throw error
              }
              await refreshDriverPortal(dispatch.id)
              notify('Servicio tomado.')
              onClose()
              navigate('/driver/my-service')
            }}
          >
            {vehicles.isPending ? (
              <Loading />
            ) : vehicles.isError ? (
              <ErrorState error={vehicles.error} />
            ) : usable.length ? (
              <Field
                label="Vehículo"
                hint="Sólo tus vehículos activos. Mandaria vuelve a comprobarlo."
              >
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="">Selecciona un vehículo</option>
                  {usable.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicleLabel(vehicle)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Empty
                title="No tienes vehículos activos"
                description="Pide a Mandaria que registre o active un vehículo tuyo para poder tomar servicios."
              />
            )}
          </ActionForm>
        </>
      )}
    </Modal>
  )
}

export function MyServicePage() {
  return <DriverPortal>{(me) => <MyService me={me} />}</DriverPortal>
}
function MyService({ me }: { me: DriverSelf }) {
  const active = me.activeDeliveryAssignment
  const query = useQuery({
    queryKey: driverKeys.dispatch(active?.dispatchId ?? 'none'),
    queryFn: ({ signal }) => driverPortal.get(active!.dispatchId, signal),
    enabled: !!active,
    staleTime: 0,
  })
  const [releasing, setReleasing] = useState(false)
  return (
    <>
      <PageTitle
        title="Mi servicio"
        description="El servicio que estás ejecutando ahora."
      />
      <PortalTabs />
      {!active ? (
        <div className="panel">
          <Empty
            title="No tienes un servicio en curso"
            description="Toma uno de los servicios disponibles para empezar."
            action={
              <Link className="button" to="/driver/services">
                Ver servicios disponibles
              </Link>
            }
          />
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
          <section className="panel" aria-labelledby="my-service">
            <div className="panel-toolbar">
              <h2 id="my-service">Servicio actual</h2>
              <Badge value="ACTIVE" label="En curso" />
            </div>
            <InfoGrid
              items={[
                ['Origen', query.data.service.pickup.address],
                ['Destino', query.data.service.dropoff.address],
                [
                  'Vehículo',
                  query.data.assignment
                    ? vehicleLabel(query.data.assignment.vehicle)
                    : '—',
                ],
                ['Envío', amount(query.data.paymentContext.deliveryFee)],
                [
                  'Créditos del servicio',
                  creditCostLabel(query.data.creditCost),
                ],
                [
                  'Tomado',
                  query.data.assignment
                    ? date(query.data.assignment.assignedAt)
                    : date(query.data.claimedAt),
                ],
                ...(query.data.service.pickup.contactName !== undefined
                  ? ([
                      [
                        'Contacto en origen',
                        query.data.service.pickup.contactName,
                      ],
                      [
                        'Teléfono',
                        <a
                          href={`tel:${(query.data.service.pickup.contactPhone ?? '').replace(/[^\d+]/g, '')}`}
                        >
                          {query.data.service.pickup.contactPhone}
                        </a>,
                      ],
                    ] as [string, ReactNode][])
                  : []),
              ]}
            />
            <div className="panel-body">
              <PaymentBlock payment={query.data.paymentContext} />
            </div>
            <div className="panel-body">
              <button
                className="button secondary destructive full"
                onClick={() => setReleasing(true)}
              >
                LIBERAR SERVICIO
              </button>
            </div>
            <p className="panel-note">
              Los pasos de la entrega (llegué, recogí, entregado) llegarán en
              una próxima versión.
            </p>
          </section>
          {releasing && (
            <ReleaseDialog
              dispatchId={query.data.id}
              onClose={() => setReleasing(false)}
            />
          )}
        </>
      )}
    </>
  )
}

function ReleaseDialog({
  dispatchId,
  onClose,
}: {
  dispatchId: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [reason, setReason] = useState<ReleaseReason>('CANNOT_COMPLETE')
  return (
    <Modal title="Liberar servicio" onClose={onClose}>
      <p className="warning notice" role="note">
        <AlertTriangle size={16} aria-hidden="true" />
        Si liberas este servicio, dejará de ser tuyo y volverá a estar
        disponible para otros repartidores y proveedores. No podrás volver a
        tomarlo.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Liberar servicio"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const raw = String(data.get('reasonDetail') ?? '').trim()
          if (
            reason === 'OTHER' &&
            (raw.length < REASON_DETAIL_MIN || raw.length > REASON_DETAIL_MAX)
          )
            throw new ApiError(
              400,
              `Describe el motivo con entre ${REASON_DETAIL_MIN} y ${REASON_DETAIL_MAX} caracteres.`,
            )
          await driverPortal.release(dispatchId, reason, raw || undefined)
          await refreshDriverPortal(dispatchId)
          notify('Servicio liberado.')
          onClose()
          navigate('/driver/services')
        }}
      >
        <fieldset className="reason-options">
          <legend>Motivo</legend>
          {releaseReasons.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="releaseReason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              {releaseReasonLabels[value]}
            </label>
          ))}
        </fieldset>
        {reason === 'OTHER' && (
          <Field
            label="Describe el motivo"
            hint={`Entre ${REASON_DETAIL_MIN} y ${REASON_DETAIL_MAX} caracteres. No incluyas datos personales.`}
          >
            <textarea
              name="reasonDetail"
              required
              maxLength={REASON_DETAIL_MAX}
              rows={3}
            />
          </Field>
        )}
      </ActionForm>
    </Modal>
  )
}

export function DriverVehiclesPage() {
  return <DriverPortal>{() => <DriverVehicles />}</DriverPortal>
}
function DriverVehicles() {
  const query = useQuery({
    queryKey: driverKeys.vehicles,
    queryFn: ({ signal }) => driverPortal.vehicles(signal),
  })
  return (
    <>
      <PageTitle
        title="Mis vehículos"
        description="Los tuyos, no los de tu proveedor."
      />
      <PortalTabs />
      <div className="panel">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        ) : query.data.length ? (
          <ul className="driver-vehicle-list">
            {query.data.map((vehicle) => (
              <li key={vehicle.id}>
                <div>
                  <strong>{vehicle.identifier}</strong>
                  <small>{labels[vehicle.type] ?? vehicle.type}</small>
                  {vehicleDetail(vehicle) && (
                    <small>{vehicleDetail(vehicle)}</small>
                  )}
                </div>
                <Badge value={vehicle.status} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No tienes vehículos registrados"
            description="Mandaria registra los vehículos de los repartidores independientes. Pide que agreguen el tuyo."
          />
        )}
        <p className="panel-note">
          Sólo puedes tomar un servicio con un vehículo activo. Para registrar o
          cambiar uno, contacta a Mandaria.
        </p>
      </div>
    </>
  )
}
