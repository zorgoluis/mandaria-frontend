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
  Field,
  PageTitle,
  Loading,
  ErrorState,
  Pagination,
  Table,
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
  DirectPrequoteDto,
  DirectPrequoteCreatedResponse,
  DirectPrequoteResponse,
  DirectConversionDto,
  DirectConversionResponse,
} from './contract'
import { packageCategories } from '../delivery-requests/types'
import { categoryLabels } from '../delivery-requests/format'
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
  const pending = usePending().filter((p) => p.kind !== 'policy')
  return (
    <>
      <PageTitle
        title="Mis envíos"
        action={<Link to="/customer/profile">Perfil cliente</Link>}
      />
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
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <ErrorState error={q.error} />
          <Link to="/customer/profile">Verificar contacto o anexar perfil</Link>
        </>
      ) : (
        <>
          <p>
            {q.data.type === 'PERSONAL'
              ? 'Personal: una solicitud activa.'
              : 'Negocio: múltiples solicitudes activas.'}{' '}
            Activas: {q.data.capacity.activeCount}. Consultar capacidad no
            reserva disponibilidad.
          </p>
          {q.data.capacity.occupied && q.data.capacity.activeRequestPublicId ? (
            <Link
              className="button"
              to={`/customer/requests/${q.data.capacity.activeRequestPublicId}`}
            >
              Continuar solicitud activa
            </Link>
          ) : q.data.canPrequote && !pending.length ? (
            <Link className="button" to="/customer/new">
              Cotizar envío
            </Link>
          ) : (
            <p>No se puede iniciar otra solicitud en este momento.</p>
          )}
        </>
      )}
      {list.isPending && q.data ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : (
        list.data && (
          <>
            <Table
              rows={list.data.items.map((r) => ({ ...r, id: r.publicId }))}
              columns={[
                {
                  label: 'Solicitud',
                  render: (r) => (
                    <Link to={`/customer/requests/${r.publicId}`}>
                      {r.publicId}
                    </Link>
                  ),
                },
                {
                  label: 'Estado',
                  render: (r) =>
                    r.status === 'CANCELLED' ? 'Cancelada' : 'Creada',
                },
                { label: 'Fecha', render: (r) => date(r.requestedAt) },
              ]}
            />
            <Pagination {...list.data} onPage={setPage} />
          </>
        )
      )}
    </>
  )
}
function Coordinates() {
  return (
    <>
      {['Origen', 'Destino'].map((label, i) => (
        <fieldset key={label}>
          <legend>{label}</legend>
          <Field label={`Latitud de ${label.toLowerCase()}`}>
            <input
              name={`lat${i}`}
              type="number"
              min={-90}
              max={90}
              step="0.000001"
              required
            />
          </Field>
          <Field label={`Longitud de ${label.toLowerCase()}`}>
            <input
              name={`lng${i}`}
              type="number"
              min={-180}
              max={180}
              step="0.000001"
              required
            />
          </Field>
        </fieldset>
      ))}
    </>
  )
}
export function NewRequest() {
  const { user } = useAuth(),
    navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const id = search.get('prequote')
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
    return (
      <Conversion
        prequote={quote.data}
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
    <>
      <PageTitle title="Cotizar envío" back="/customer" />
      <p>
        Servicio local inmediato. El precio viene del backend y no reserva
        repartidor ni cupo.
      </p>
      <ActionForm
        submitLabel="Obtener precotización"
        onSubmit={async (d) => {
          const conditions: DirectPrequoteDto['conditions'] = {
            conditionsVersion: 1,
            serviceType: 'LOCAL_DELIVERY',
            stops: [
              {
                type: 'PICKUP',
                sequence: 1,
                latitude: Number(d.get('lat0')),
                longitude: Number(d.get('lng0')),
              },
              {
                type: 'DROPOFF',
                sequence: 2,
                latitude: Number(d.get('lat1')),
                longitude: Number(d.get('lng1')),
              },
            ],
            packages: [
              {
                category:
                  packageCategories.find((c) => c === d.get('category')) ??
                  'OTHER',
                quantity: Number(d.get('quantity')),
                isFragile: d.get('fragile') === 'on',
                ...(d.get('weight')
                  ? { weightKg: Number(d.get('weight')) }
                  : {}),
              },
            ],
          }
          const r = await command<DirectPrequoteCreatedResponse>(
            user!.id,
            'prequote',
            'new',
            '/customer/delivery-prequotes',
            { conditions, shippingPayer: d.get('payer') },
          )
          setSearch({ prequote: r.prequote.publicId })
        }}
      >
        <Coordinates />
        <Field label="Categoría">
          <select name="category">
            {packageCategories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad">
          <input
            name="quantity"
            type="number"
            required
            min={1}
            max={10000}
            defaultValue={1}
          />
        </Field>
        <Field label="Peso en kg (opcional)">
          <input name="weight" type="number" min="0.001" step="0.001" />
        </Field>
        <Field label="Frágil">
          <input name="fragile" type="checkbox" />
        </Field>
        <Field label="Pagador del envío">
          <select name="payer" defaultValue={cap.data.defaultShippingPayer}>
            {cap.data.allowedShippingPayers.map((p) => (
              <option key={p} value={p}>
                {p === 'REQUESTER' ? 'Solicitante' : 'Destinatario'}
              </option>
            ))}
          </select>
        </Field>
      </ActionForm>
    </>
  )
}
function Conversion({
  prequote: p,
  onDone,
}: {
  prequote: DirectPrequoteResponse
  onDone: (ref: string) => void
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
  if (p.status !== 'OFFERED')
    return (
      <>
        <p>
          Precotización vencida. Consulta tus solicitudes antes de iniciar otra
          secuencia.
        </p>
        <Link to="/customer">Mis solicitudes</Link>
      </>
    )
  return (
    <>
      <PageTitle title={p.publicId} />
      <p>
        {p.amount} {p.currency} · Vigencia: {date(p.expiresAt)}. No reserva
        disponibilidad.
      </p>
      <ActionForm
        submitLabel="Crear solicitud y revisar términos"
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
      >
        {['Origen', 'Destino'].map((label, i) => (
          <fieldset key={label}>
            <legend>{label}</legend>
            <Field label={`Dirección de ${label.toLowerCase()}`}>
              <input name={`address${i}`} required maxLength={300} />
            </Field>
            <Field label={`Contacto de ${label.toLowerCase()}`}>
              <input name={`name${i}`} required maxLength={100} />
            </Field>
            <Field label={`Teléfono de ${label.toLowerCase()}`}>
              <input name={`phone${i}`} required maxLength={30} />
            </Field>
          </fieldset>
        ))}
        <Field label="Descripción del paquete">
          <input name="description" required maxLength={500} />
        </Field>
        <Field label="Pago de mercancía">
          <select name="mode">
            <option value="PREPAID">Mercancía prepagada</option>
            <option value="COURIER_ADVANCE">
              Adelanto de mercancía por repartidor
            </option>
          </select>
        </Field>
        <Field label="Valor de mercancía en MXN">
          <input name="goodsValue" type="number" min="0" step="0.01" />
        </Field>
        <p>
          El adelanto exige valor de mercancía positivo. PREPAID no significa
          envío pagado.
        </p>
        {p.shippingTerms?.payer === 'REQUESTER' && (
          <fieldset>
            <legend>Persona que pagará el envío en recogida</legend>
            <p>Puede ser distinta del contacto de origen.</p>
            <Field label="Nombre del pagador">
              <input name="payerName" required maxLength={100} />
            </Field>
            <Field label="Teléfono del pagador">
              <input name="payerPhone" required maxLength={30} />
            </Field>
            <Field label="Quién estará presente">
              <select name="capacity">
                <option value="REQUESTER">Solicitante</option>
                <option value="AUTHORIZED_REPRESENTATIVE">
                  Representante autorizado
                </option>
              </select>
            </Field>
          </fieldset>
        )}
      </ActionForm>
    </>
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
  return (
    <>
      <PageTitle title={publicId} back="/customer" />
      <InfoGrid
        items={[
          [
            'Estado',
            {
              REQUESTED: 'Solicitada',
              OPEN: 'Buscando ejecutor',
              ASSIGNED: 'Asignada',
              DELIVERED: 'Entregada',
              CANCELLED: 'Cancelada',
              EXPIRED: 'Vencida',
            }[state.data.status],
          ],
          ['Solicitada', date(detail.data.requestedAt)],
          [
            'Resultado',
            state.data.terminalOutcome
              ? {
                  DELIVERED: 'Entregada',
                  RETURNED_TO_ORIGIN: 'Devuelta al origen',
                  CANCELLED: 'Cancelada',
                  EXPIRED: 'Vencida',
                }[state.data.terminalOutcome.type]
              : 'Pendiente',
          ],
        ]}
      />
      {state.data.executionProgress && (
        <InfoGrid
          items={[
            [
              'Progreso',
              state.data.executionProgress.phase
                ? {
                    TO_PICKUP: 'En camino al origen',
                    AT_PICKUP: 'En el origen',
                    PICKED_UP: 'Mercancía recogida',
                    TO_DROPOFF: 'En camino al destino',
                    AT_DROPOFF: 'En el destino',
                  }[state.data.executionProgress.phase]
                : 'Sin avances registrados',
            ],
            [
              'Último registro',
              date(state.data.executionProgress.registeredAt),
            ],
            [
              'Atención',
              state.data.executionProgress.attentionRequired
                ? 'Requiere atención'
                : 'Sin incidencia reportada',
            ],
          ]}
        />
      )}
      <ShippingPaymentBlock value={state.data.shippingPayment} />
      {custody && (
        <p className="notice">
          La solicitud está bajo custodia o requiere atención. No se ofrece
          cancelación ordinaria; una incidencia no libera el cupo.
        </p>
      )}
      {pending ? (
        <Recovery pending={pending} onRecovered={refresh} />
      ) : (
        <>
          {!accepted &&
            !terminal &&
            p &&
            quote.data?.deliveryRequestPublicId === publicId &&
            quote.data.canPrepareConsent &&
            p.status === 'OFFERED' &&
            Date.parse(p.expiresAt) > now &&
            !quote.isFetching &&
            terms && (
              <section className="panel customer-panel">
                <h2>Revisar y autorizar envío</h2>
                <p>
                  La disponibilidad para consentir no reserva cupo ni garantiza
                  flags o condiciones al enviar. El servidor volverá a
                  validarlos.
                </p>
                <p>
                  {p.amount} {p.currency} · Vence: {date(p.expiresAt)}
                </p>
                <p>
                  Pagador:{' '}
                  {terms.payer === 'REQUESTER'
                    ? 'Solicitante o representante'
                    : 'Destinatario'}{' '}
                  · En efectivo ·{' '}
                  {terms.dueAt === 'PICKUP' ? 'En recogida' : 'Al entregar'}
                </p>
                {detail.data.shippingTerms?.payerContact && (
                  <InfoGrid
                    items={[
                      [
                        'Persona que pagará',
                        detail.data.shippingTerms?.payerContact.name,
                      ],
                      [
                        'Contacto',
                        detail.data.shippingTerms?.payerContact.phone,
                      ],
                      [
                        'Capacidad',
                        detail.data.shippingTerms?.payerContact.capacity ===
                        'REQUESTER'
                          ? 'Solicitante'
                          : 'Representante autorizado',
                      ],
                    ]}
                  />
                )}
                <ActionForm
                  key={JSON.stringify(quote.data)}
                  submitLabel="Autorizar y solicitar servicio"
                  onSubmit={async () => {
                    await command(
                      user!.id,
                      'accept',
                      publicId,
                      `/customer/delivery-quotes/${p.publicId}/accept`,
                      consentFromContext(quote.data!),
                      p.publicId,
                    )
                    refresh()
                  }}
                >
                  <Field label="Acepto el importe, vigencia y condiciones del envío">
                    <input type="checkbox" required />
                  </Field>
                </ActionForm>
              </section>
            )}
          {quote.isError && <ErrorState error={quote.error} />}
          {!accepted &&
            !terminal &&
            (!quote.data?.canPrepareConsent ||
              !p ||
              Date.parse(p.expiresAt) <= now) && (
              <p>
                No hay una cotización vigente con términos completos para
                autorizar. Actualiza el estado; no se aceptará automáticamente.
              </p>
            )}
          {!terminal && !custody && (
            <ActionForm
              submitLabel="Solicitar cancelación"
              onSubmit={async (d) => {
                await command(
                  user!.id,
                  'cancel',
                  publicId,
                  `/customer/delivery-requests/${publicId}/cancel`,
                  { reason: String(d.get('reason')) },
                )
                refresh()
              }}
            >
              <p>
                El backend decide si es legal; la custodia puede impedirla. Una
                MQ vencida no libera cupo. Confirma el resultado antes de otra
                solicitud.
              </p>
              <Field label="Motivo de cancelación">
                <input name="reason" required minLength={3} maxLength={500} />
              </Field>
              <Field label="Confirmo que deseo cancelar">
                <input type="checkbox" required />
              </Field>
            </ActionForm>
          )}
        </>
      )}
      <button className="button secondary" onClick={refresh}>
        Actualizar seguimiento
      </button>
    </>
  )
}
