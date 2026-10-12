import { MyShipments } from './MyShipments'
import { ArrowLeft, Check, RefreshCw } from 'lucide-react'
import { RequestConsent, RequestCancellation } from './RequestActions'
import './request.css'
import { QuoteForm } from './QuoteForm'
import { ConversionForm } from './ConversionForm'
import { OwnerLocation } from '../location/components'
import { ApiError } from '../services/errors'
import { validPosition } from './location-selection'
import { TrackingLinks } from '../location/TrackingLinks'
import { AttemptRecovery } from './AttemptRecovery'
import { retainCustomerSnapshot } from './tracking'
import { consentFromContext } from './consent'
import { useEffect, useState } from 'react'
import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import {
  ActionForm,
  PageTitle,
  Loading,
  ErrorState,
  InfoGrid,
} from '../components/ui'
import { customer, rememberConversion } from './service'
import {
  command,
  useCommandError,
  usePending,
  canReplay,
  retryCommand,
  clearPending,
  type Pending,
} from './pending'
import type {
  DirectPrequoteCreatedResponse,
  DirectPrequoteResponse,
  DirectConversionDto,
  DirectConversionResponse,
} from './contract'
import { ShippingPaymentBlock } from '../shipping/Payment'
import { date } from '../utils/format'

export function CustomerArea() {
  return (
    <div className="customer-area">
      <Outlet />
    </div>
  )
}
export function CustomerOperationNotice() {
  const error = useCommandError()
  return error ? (
    <p className="notice" role="alert">
      {error}
    </p>
  ) : null
}
function LegacyRecovery({
  pending,
  onRecovered,
}: {
  pending: Pending
  onRecovered: (ref?: string) => void
}) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const own = pending.actor === user?.id
  return (
    <section className="panel customer-panel">
      <h2>Pendiente de reconciliación</h2>
      <p>
        Una respuesta perdida no significa fracaso. No se permite otra intención
        hasta confirmar el resultado. No borres el almacenamiento para repetir.
      </p>
      <p role="status">{message}</p>
      {!own ? (
        <p>
          Inicia sesión con la cuenta que inició esta operación. Cambiar de
          usuario no la elimina.
        </p>
      ) : (
        <>
          <ActionForm
            initialDirty
            submitLabel="Consultar resultado"
            onSubmit={async () => {
              if (pending.kind === 'convert') {
                const p = await customer.prequote(pending.ref)
                if (p.status === 'CONVERTED' && p.deliveryRequestPublicId) {
                  clearPending(pending.key)
                  onRecovered(p.deliveryRequestPublicId)
                  return
                }
              }
              if (pending.kind === 'accept' || pending.kind === 'cancel') {
                const s = await customer.status(pending.ref)
                if (
                  (pending.kind === 'cancel' && s.status === 'CANCELLED') ||
                  (pending.kind === 'accept' &&
                    s.shippingPayment &&
                    s.shippingPayment.quotePublicId === pending.related &&
                    s.shippingPayment.amount !== null)
                ) {
                  clearPending(pending.key)
                  onRecovered(pending.ref)
                  return
                }
              }
              setMessage(
                'El estado sigue incierto. Una lectura sin efectos no impide una operación tardía. Mantén el bloqueo y solicita soporte con la referencia del intento.',
              )
            }}
          >
            <p>Referencia del intento: {pending.key}</p>
          </ActionForm>
          {canReplay(pending.key) && (
            <ActionForm
              initialDirty
              submitLabel="Recuperar la operación original"
              onSubmit={async () => {
                const result = await retryCommand<
                  | DirectPrequoteCreatedResponse
                  | DirectConversionResponse
                  | unknown
                >(user!.id, pending.key)
                if (
                  result &&
                  typeof result === 'object' &&
                  'prequote' in result
                ) {
                  const r = result as DirectPrequoteCreatedResponse
                  onRecovered(r.prequote.publicId)
                } else if (
                  result &&
                  typeof result === 'object' &&
                  'result' in result
                ) {
                  const r = result as DirectConversionResponse
                  rememberConversion(
                    user!.id,
                    r.result.deliveryRequestPublicId,
                    pending.ref,
                  )
                  onRecovered(r.result.deliveryRequestPublicId)
                } else onRecovered(pending.ref)
              }}
            >
              <p>
                Se envía exactamente la misma clave y cuerpo, sin repetir una
                operación física.
              </p>
            </ActionForm>
          )}
        </>
      )}
    </section>
  )
}
export function Recovery(props: {
  pending: Pending
  onRecovered: (ref?: string) => void
}) {
  return props.pending.kind === 'cancel' ? (
    <LegacyRecovery {...props} />
  ) : (
    <AttemptRecovery key={props.pending.actor + props.pending.key} {...props} />
  )
}
export function CustomerHome() {
  const { user } = useAuth(),
    [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: ['customer', user?.id, 'capabilities'],
    queryFn: customer.capabilities,
    retry: false,
  })
  const list = useQuery({
    queryKey: ['customer', user?.id, 'requests', page],
    queryFn: () => customer.requests(page),
    retry: false,
    enabled: !!q.data,
  })
  const activeId = q.data?.capacity.occupied
    ? q.data.capacity.activeRequestPublicId
    : null
  const activeRow = list.data?.items.find((item) => item.publicId === activeId)
  const active = useQuery({
    queryKey: ['customer', user?.id, 'detail', activeId],
    queryFn: () => customer.detail(activeId!),
    enabled: !!activeId && !!list.data && !activeRow,
    retry: false,
  })
  const pending = usePending().filter((p) => p.kind !== 'policy')
  return (
    <MyShipments
      capabilities={q.isError ? undefined : q.data}
      activeRequest={activeRow ?? active.data}
      items={list.data}
      loading={q.isPending || (!!q.data && list.isPending)}
      error={q.error ?? list.error}
      blocked={!!pending.length}
      onPage={setPage}
    >
      {pending.map((p) => (
        <Recovery
          key={p.key}
          pending={p}
          onRecovered={() => {
            void q.refetch()
            void list.refetch()
          }}
        />
      ))}
      {q.isError && (
        <Link to="/customer/profile">Verificar contacto o anexar perfil</Link>
      )}
    </MyShipments>
  )
}
export function NewRequest() {
  const { user } = useAuth(),
    navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const id = search.get('prequote')
  const [addresses, setAddresses] = useState<string[]>([])
  const cap = useQuery({
    queryKey: ['customer', user?.id, 'capabilities'],
    queryFn: customer.capabilities,
    retry: false,
  })
  const quote = useQuery({
    queryKey: ['customer', user?.id, 'prequote', id],
    queryFn: () => customer.prequote(id!),
    enabled: !!id,
    retry: false,
  })
  const pending = usePending().find((p) => p.kind !== 'policy')
  const recovered = (ref?: string) => {
    if (ref?.startsWith('MPQ-')) setSearch({ prequote: ref })
    else if (ref?.startsWith('MDR-'))
      navigate(
        `/customer/requests/${ref}${id ? '?prequote=' + encodeURIComponent(id) : ''}`,
      )
  }
  if (pending) return <Recovery pending={pending} onRecovered={recovered} />
  if (cap.isPending) return <Loading />
  if (cap.isError) return <ErrorState error={cap.error} />
  if (id) {
    if (quote.isPending) return <Loading />
    if (quote.isError) return <ErrorState error={quote.error} />
    if (quote.data.status !== 'CONVERTED' && !cap.data.canCreateRequest)
      return (
        <>
          <p>No puedes convertir otra solicitud en este momento.</p>
          <Link to="/customer">Continuar solicitud activa</Link>
        </>
      )
    if (search.get('edit') !== '1' || quote.data.status === 'CONVERTED')
      return (
        <Conversion
          key={`${user?.id}:${quote.data.publicId}`}
          prequote={quote.data}
          onBack={(nextAddresses) => {
            setAddresses(nextAddresses)
            setSearch({ prequote: id, edit: '1' })
          }}
          onDone={(ref) =>
            navigate(
              `/customer/requests/${ref}?prequote=${encodeURIComponent(id)}`,
            )
          }
        />
      )
  }
  if (!cap.data.canPrequote || !cap.data.canCreateRequest)
    return (
      <>
        <PageTitle title="Cupo no disponible" />
        <Link to="/customer">Continuar solicitud activa</Link>
      </>
    )
  return (
    <QuoteForm
      key={`${user?.id}:${id ?? 'new'}`}
      initial={
        quote.data
          ? {
              conditions: quote.data.conditions,
              payer: quote.data.shippingTerms?.payer,
              addresses,
            }
          : undefined
      }
      capabilities={cap.data}
      onSubmit={async (conditions, shippingPayer) => {
        if (
          conditions.stops.some(
            (s) => !validPosition({ lat: s.latitude, lng: s.longitude }),
          )
        )
          throw new ApiError(
            400,
            'Selecciona un origen y un destino válidos antes de cotizar.',
          )
        const r = await command<DirectPrequoteCreatedResponse>(
          user!.id,
          'prequote',
          'new',
          '/customer/delivery-prequotes',
          { conditions, shippingPayer },
        )
        setSearch({ prequote: r.prequote.publicId })
      }}
    />
  )
}

function Conversion({
  prequote: p,
  onDone,
  onBack,
}: {
  prequote: DirectPrequoteResponse
  onDone: (ref: string) => void
  onBack: (addresses: string[]) => void
}) {
  const { user } = useAuth()
  if (p.status === 'CONVERTED' && p.deliveryRequestPublicId)
    return (
      <Link
        to={`/customer/requests/${p.deliveryRequestPublicId}?prequote=${p.publicId}`}
      >
        Continuar solicitud convertida
      </Link>
    )
  return (
    <ConversionForm
      quote={p}
      onBack={onBack}
      onSubmit={async (d) => {
        const body: DirectConversionDto = {
          conditionsVersion: 1,
          deliveryRequest: {
            serviceType: 'LOCAL_DELIVERY',
            stops: p.conditions.stops.map((s, i) => ({
              ...s,
              address: String(d.get(`address${i}`)),
              contactName: String(d.get(`name${i}`)),
              contactPhone: String(d.get(`phone${i}`)),
            })),
            packages: p.conditions.packages.map((s) => ({
              ...s,
              description: String(d.get('description')),
            })),
            financialContext: {
              goodsPaymentMode:
                d.get('mode') === 'COURIER_ADVANCE'
                  ? 'COURIER_ADVANCE'
                  : 'PREPAID',
              currency: 'MXN',
              ...(d.get('goodsValue')
                ? { goodsValue: String(d.get('goodsValue')) }
                : {}),
            },
          },
          ...(p.shippingTerms?.payer === 'REQUESTER'
            ? {
                payerContact: {
                  name: String(d.get('payerName')),
                  phone: String(d.get('payerPhone')),
                  capacity:
                    d.get('capacity') === 'AUTHORIZED_REPRESENTATIVE'
                      ? ('AUTHORIZED_REPRESENTATIVE' as const)
                      : ('REQUESTER' as const),
                },
              }
            : {}),
        }
        const r = await command<DirectConversionResponse>(
          user!.id,
          'convert',
          p.publicId,
          `/customer/delivery-prequotes/${p.publicId}/convert`,
          body,
        )
        rememberConversion(
          user!.id,
          r.result.deliveryRequestPublicId,
          p.publicId,
        )
        onDone(r.result.deliveryRequestPublicId)
      }}
    />
  )
}
export function CustomerRequest() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const { publicId = '' } = useParams(),
    { user } = useAuth()
  const detail = useQuery({
    queryKey: ['customer', user?.id, 'detail', publicId],
    queryFn: () => customer.detail(publicId),
    retry: false,
  })
  const state = useQuery({
    queryKey: ['customer', user?.id, 'status', publicId],
    queryFn: () => customer.status(publicId),
    retry: false,
    structuralSharing: retainCustomerSnapshot,
    refetchInterval: (q) => (q.state.data?.terminalOutcome ? false : 15000),
  })
  const quote = useQuery({
    queryKey: ['customer', user?.id, 'consent-context', publicId],
    queryFn: () => customer.consentContext(publicId),
    retry: false,
  })
  const pending = usePending().find((p) => p.kind !== 'policy')
  if (detail.isPending || state.isPending) return <Loading />
  if (detail.isError || state.isError)
    return <ErrorState error={detail.error ?? state.error} />
  const terms = quote.data?.shippingTerms
  const p = quote.data?.quote
  const accepted = !!state.data.shippingPayment?.quotePublicId
  const terminal =
    !!state.data.terminalOutcome ||
    ['CANCELLED', 'DELIVERED', 'EXPIRED'].includes(state.data.status)
  const custody =
    state.data.executionProgress?.attentionRequired ||
    ['PICKED_UP', 'TO_DROPOFF', 'AT_DROPOFF'].includes(
      state.data.executionProgress?.phase ?? '',
    )
  const refresh = () => {
    void detail.refetch()
    void state.refetch()
    void quote.refetch()
  }
  const statusLabels = {
    REQUESTED: 'Solicitada',
    OPEN: 'Buscando ejecutor',
    ASSIGNED: 'Asignada',
    DELIVERED: 'Entregada',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Vencida',
  }
  const outcomeLabels = {
    DELIVERED: 'Entregada',
    RETURNED_TO_ORIGIN: 'Devuelta al origen',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Vencida',
  }
  const phaseLabels = {
    TO_PICKUP: 'En camino al origen',
    AT_PICKUP: 'En el origen',
    PICKED_UP: 'Mercancía recogida',
    TO_DROPOFF: 'En camino al destino',
    AT_DROPOFF: 'En el destino',
  }
  const ready = !!(
    !accepted &&
    !terminal &&
    p &&
    quote.data?.deliveryRequestPublicId === publicId &&
    quote.data.canPrepareConsent &&
    p.status === 'OFFERED' &&
    Date.parse(p.expiresAt) > now &&
    !quote.isFetching &&
    !quote.isError &&
    terms
  )
  return (
    <section
      className="quote-page request-page"
      aria-label="Confirmar y seguimiento"
    >
      <header className="quote-header">
        <div>
          <Link className="quote-back" to="/customer">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver
          </Link>
          <div className="request-heading">
            <h1>{publicId}</h1>
            <button
              className="button secondary"
              onClick={refresh}
              disabled={
                detail.isFetching || state.isFetching || quote.isFetching
              }
            >
              <RefreshCw size={16} aria-hidden="true" />
              Actualizar seguimiento
            </button>
          </div>
        </div>
        <ol className="quote-steps" aria-label="Pasos del envío">
          {['Cotizar', 'Detalles', 'Confirmar'].map((label, i) => (
            <li
              key={label}
              className={i < 2 ? 'completed' : undefined}
              aria-current={i === 2 ? 'step' : undefined}
            >
              <span>{i < 2 ? <Check size={15} aria-hidden="true" /> : 3}</span>
              {label}
            </li>
          ))}
        </ol>
      </header>
      <div className="request-status" aria-live="polite">
        <InfoGrid
          items={[
            [
              'Estado',
              <span
                className={`request-dot ${['CANCELLED', 'EXPIRED'].includes(state.data.status) ? 'danger' : ''}`}
              >
                {statusLabels[state.data.status]}
              </span>,
            ],
            ['Solicitada', date(detail.data.requestedAt)],
            [
              'Resultado',
              <span
                className={`request-dot ${!state.data.terminalOutcome ? 'pending' : state.data.terminalOutcome.type === 'DELIVERED' ? '' : 'danger'}`}
              >
                {state.data.terminalOutcome
                  ? outcomeLabels[state.data.terminalOutcome.type]
                  : 'Pendiente'}
              </span>,
            ],
          ]}
        />
      </div>
      <div className="request-grid">
        <div className="request-main">
          <div className="request-tracking" aria-live="polite">
            {state.data.executionProgress && (
              <section className="request-card request-progress">
                <h2>Último avance registrado</h2>
                <ol>
                  <li>
                    <strong>
                      {state.data.executionProgress.phase
                        ? phaseLabels[state.data.executionProgress.phase]
                        : 'Sin avances registrados'}
                    </strong>
                    <time>
                      {date(state.data.executionProgress.registeredAt)}
                    </time>
                  </li>
                </ol>
                {state.data.executionProgress.attentionRequired && (
                  <p className="notice">Requiere atención operativa.</p>
                )}
              </section>
            )}
            <OwnerLocation
              key={`${user?.id}:${publicId}`}
              publicId={publicId}
              stop={terminal}
              publicVersion={state.data.publicVersion}
              attention={state.data.executionProgress?.attentionRequired}
            />
          </div>
          <TrackingLinks publicId={publicId} terminal={terminal} />
          <ShippingPaymentBlock value={state.data.shippingPayment} />
          {!pending && (
            <RequestCancellation
              key={`${user?.id}:${publicId}:${terminal}`}
              blocked={!!custody}
              terminal={terminal}
              cancelled={state.data.status === 'CANCELLED'}
              onCancel={async (reason) => {
                await command(
                  user!.id,
                  'cancel',
                  publicId,
                  `/customer/delivery-requests/${publicId}/cancel`,
                  { reason },
                )
                refresh()
              }}
            />
          )}
        </div>
        <aside
          className="request-sidebar"
          aria-label="Confirmación del servicio"
        >
          {pending ? (
            <Recovery pending={pending} onRecovered={refresh} />
          ) : (
            <>
              {quote.isError && <ErrorState error={quote.error} />}
              <RequestConsent
                key={`${user?.id}:${publicId}:${JSON.stringify(quote.data)}:${quote.isFetching}`}
                context={quote.data}
                contact={detail.data.shippingTerms?.payerContact}
                accepted={accepted}
                terminal={terminal}
                ready={ready}
                now={now}
                onAccept={async () => {
                  if (!ready || !p || !quote.data) return
                  await command(
                    user!.id,
                    'accept',
                    publicId,
                    `/customer/delivery-quotes/${p.publicId}/accept`,
                    consentFromContext(quote.data),
                    p.publicId,
                  )
                  refresh()
                }}
              />
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
