import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowUpRight, Clock3 } from 'lucide-react'
import { ActionForm, Badge, Field, InfoGrid, Modal } from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError, errorMessage } from '../services/errors'
import { km, money, serviceTypeLabels } from '../pricing/format'
import { duration } from '../quotes/format'
import {
  categoryLabels,
  paymentModes,
  weight,
} from '../delivery-requests/format'
import { vehicleLabel } from '../delivery-assignments/format'
import { refreshAfterAssignment } from '../delivery-assignments/queries'
import type { DeliveryAssignment } from '../delivery-assignments/types'
import { creditCostLabel, formatCredits } from '../credits/format'
import { myProviderCredits } from '../credits/service'
import { creditKeys } from '../credits/queries'
import { providerDispatches } from './service'
import { refreshProviderDispatches } from './queries'
import { useNow } from './use-now'
import { canClaim, canRelease } from './rules'
import {
  OTHER_REASON,
  dispatchStatusLabels,
  releaseReasons,
  remaining,
  summaryReason,
} from './format'
import {
  RELEASE_REASON_MAX,
  RELEASE_REASON_MIN,
  type DispatchGoods,
  type DispatchService,
  type DispatchStatus,
  type ProviderDispatch,
} from './types'

export function DispatchBadge({ status }: { status: DispatchStatus }) {
  return <Badge value={status} label={dispatchStatusLabels[status]} />
}

export function Countdown({
  expiresAt,
  now,
}: {
  expiresAt: string
  now: number
}) {
  const left = remaining(expiresAt, now)
  return (
    <span className={`countdown ${left ? '' : 'ended'}`}>
      <Clock3 size={14} aria-hidden="true" />
      {left ? `Vence en ${left}` : 'Tiempo terminado'}
    </span>
  )
}

/** Delivery fee and goods value are different money: never add or merge them. */
export function MoneyBlock({
  service,
  compact = false,
}: {
  service: DispatchService
  compact?: boolean
}) {
  return (
    <div className={`money-block ${compact ? 'compact' : ''}`}>
      <div className="money-fee">
        <span>Costo del envío</span>
        <strong>
          {money(service.deliveryFee.amount, service.deliveryFee.currency)}
        </strong>
      </div>
      <GoodsInfo goods={service.goods} compact={compact} />
    </div>
  )
}
function GoodsInfo({
  goods,
  compact,
}: {
  goods: DispatchGoods | null
  compact: boolean
}) {
  if (!goods)
    return (
      <div className="money-goods">
        <span>Valor de mercancía</span>
        <strong>No informado</strong>
      </div>
    )
  const mode = paymentModes[goods.paymentMode]
  const value = goods.value
    ? money(goods.value, goods.currency)
    : 'No informado'
  return (
    <div
      className={`money-goods ${goods.driverAdvancesGoods ? 'advance' : ''}`}
    >
      <span>Valor de mercancía</span>
      <strong>{value}</strong>
      <small>{mode?.label ?? 'Modalidad no disponible'}</small>
      {goods.driverAdvancesGoods && (
        <p className="advance-warning">
          <AlertTriangle size={14} aria-hidden="true" />
          {goods.value
            ? `El repartidor adelanta ${value} al recoger.`
            : 'El repartidor adelanta el valor de la mercancía al recoger.'}
        </p>
      )}
      {!compact && !goods.driverAdvancesGoods && mode && (
        <p className="muted">{mode.description}</p>
      )}
    </div>
  )
}

export function ServiceCard({
  dispatch,
  providerId,
  now,
  onClaim,
  onRelease,
}: {
  dispatch: ProviderDispatch
  providerId: string
  now: number
  onClaim: (dispatch: ProviderDispatch) => void
  onRelease: (dispatch: ProviderDispatch) => void
}) {
  const service = dispatch.service
  const expiredLocally =
    dispatch.status === 'OPEN' && remaining(dispatch.expiresAt, now) === null
  return (
    <article
      className="service-card"
      aria-label={`Servicio en ${dispatch.serviceZone.name}`}
    >
      <header>
        <div>
          <strong>
            {serviceTypeLabels[dispatch.serviceType] ?? 'Servicio'}
          </strong>
          <small>{dispatch.serviceZone.name}</small>
        </div>
        <div className="service-card-state">
          <DispatchBadge status={dispatch.status} />
          {dispatch.status === 'OPEN' && (
            <Countdown expiresAt={dispatch.expiresAt} now={now} />
          )}
        </div>
      </header>
      {service ? (
        <>
          <dl className="service-route">
            <div>
              <dt>Origen</dt>
              <dd>{service.pickup.address}</dd>
            </div>
            <div>
              <dt>Destino</dt>
              <dd>{service.dropoff.address}</dd>
            </div>
            <div className="service-metrics">
              <span>{km(service.route.distanceMeters)}</span>
              <span>{duration(service.route.durationSeconds)} estimados</span>
            </div>
          </dl>
          <MoneyBlock service={service} compact />
          <p className="credit-chip">
            Cuesta {creditCostLabel(dispatch.creditCost)}
          </p>
        </>
      ) : (
        <p className="muted service-summary">{summaryReason(dispatch)}</p>
      )}
      {canRelease(dispatch) && <CardAssignment dispatch={dispatch} />}
      <footer className="row-actions">
        <Link
          className="button secondary small"
          to={`/services/${encodeURIComponent(dispatch.id)}?providerId=${encodeURIComponent(providerId)}`}
        >
          Ver detalle <ArrowUpRight size={14} />
        </Link>
        {dispatch.access === 'OFFER' && dispatch.status === 'OPEN' && (
          <button
            className="button small"
            disabled={!canClaim(dispatch, now)}
            onClick={() => onClaim(dispatch)}
          >
            {expiredLocally ? 'Tiempo terminado' : 'TOMAR SERVICIO'}
          </button>
        )}
        {canRelease(dispatch) && (
          <button
            className="button secondary destructive small"
            disabled={dispatch.assignment !== null}
            title={
              dispatch.assignment
                ? 'Cancela la asignación antes de liberar el servicio.'
                : undefined
            }
            onClick={() => onRelease(dispatch)}
          >
            LIBERAR SERVICIO
          </button>
        )}
      </footer>
    </article>
  )
}

/**
 * The Dispatch stays CLAIMED: whether it is assigned is derived from the real assignment, not
 * from an invented DispatchStatus.
 */
function CardAssignment({ dispatch }: { dispatch: ProviderDispatch }) {
  const assignment = dispatch.assignment
  if (!assignment)
    return (
      <p
        className={`card-assignment pending ${dispatch.assignmentOverdue ? 'overdue' : ''}`}
      >
        <AlertTriangle size={14} aria-hidden="true" />
        {dispatch.assignmentOverdue
          ? 'Pendiente de asignación · demorada'
          : 'Pendiente de asignación'}
      </p>
    )
  return (
    <p className="card-assignment assigned">
      <strong>Asignado</strong>
      <span>
        {assignment.driver.name} · {vehicleLabel(assignment.vehicle)}
      </span>
    </p>
  )
}

function ServiceSummary({ service }: { service: DispatchService }) {
  return (
    <InfoGrid
      items={[
        ['Origen', service.pickup.address],
        ['Destino', service.dropoff.address],
        [
          'Ruta',
          `${km(service.route.distanceMeters)} · ${duration(service.route.durationSeconds)}`,
        ],
      ]}
    />
  )
}

/** Outcomes that end the dialog: the backend already decided, so retrying cannot help. */
const FINAL_CODES = new Set([
  'DISPATCH_ALREADY_CLAIMED',
  'DISPATCH_EXPIRED',
  'DISPATCH_CANCELLED',
  'DISPATCH_RECLAIM_NOT_ALLOWED',
  'DISPATCH_DELIVERED',
  'DISPATCH_NOT_CLAIMED_BY_PROVIDER',
  'PROVIDER_NOT_ELIGIBLE',
])
const isFinal = (error: unknown) =>
  error instanceof ApiError &&
  ((error.code !== null && FINAL_CODES.has(error.code)) || error.status === 404)

function FinalState({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <>
      <p className="inline-error" role="alert">
        {message}
      </p>
      <p className="modal-description">
        La lista se actualizó con el estado que informó Mandaria.
      </p>
      <div className="form-actions">
        <button className="button" onClick={onClose}>
          Entendido
        </button>
      </div>
    </>
  )
}

/**
 * No optimistic ownership: the dialog only reports success after the backend answers, and every
 * outcome (success or conflict) refetches the lists.
 */
/**
 * Claiming a service charges its credit cost to the provider, so the real balance is read before
 * confirming. It is a warning, not a gate: the backend decides and may answer INSUFFICIENT_CREDITS.
 */
function ProviderCreditCheck({
  providerId,
  cost,
}: {
  providerId: string
  cost: number | null
}) {
  const account = useQuery({
    queryKey: creditKeys.account('my-provider', providerId),
    queryFn: ({ signal }) => myProviderCredits.account(providerId, signal),
    staleTime: 0,
  })
  if (cost === null || !account.isSuccess) return null
  const short = account.data.balance < cost
  return (
    <p className={short ? 'warning notice' : 'panel-note'} role="note">
      {short && <AlertTriangle size={16} aria-hidden="true" />}
      El saldo de tu proveedor es de {formatCredits(account.data.balance)}
      {short
        ? '. No alcanza para tomar este servicio: contacta a Mandaria para recargar créditos.'
        : '.'}
    </p>
  )
}

export function ClaimDialog({
  providerId,
  dispatch,
  onClose,
  onClaimed,
}: {
  providerId: string
  dispatch: ProviderDispatch
  onClose: () => void
  onClaimed: (result: ProviderDispatch) => void
}) {
  const notify = useFeedback()
  const [final, setFinal] = useState<string | null>(null)
  const now = useNow(!final)
  const service = dispatch.service
  return (
    <Modal title="Tomar servicio" onClose={onClose}>
      {final ? (
        <FinalState message={final} onClose={onClose} />
      ) : (
        <>
          <p className="modal-description">
            Tu proveedor quedará a cargo de este servicio si Mandaria confirma
            que nadie lo tomó antes.
          </p>
          {service && (
            <>
              <ServiceSummary service={service} />
              <MoneyBlock service={service} compact />
            </>
          )}
          <InfoGrid
            items={[
              ['Costo en créditos', creditCostLabel(dispatch.creditCost)],
            ]}
          />
          <ProviderCreditCheck
            providerId={providerId}
            cost={dispatch.creditCost}
          />
          <p className="modal-description">
            <Countdown expiresAt={dispatch.expiresAt} now={now} />
          </p>
          <ActionForm
            initialDirty
            submitLabel="Confirmar y tomar"
            cancelLabel="Volver"
            onCancel={onClose}
            onSubmit={async () => {
              if (remaining(dispatch.expiresAt, Date.now()) === null) {
                setFinal('El tiempo para tomar este servicio terminó.')
                await refreshProviderDispatches(providerId)
                return
              }
              try {
                const result = await providerDispatches.claim(
                  providerId,
                  dispatch.id,
                )
                await refreshProviderDispatches(providerId)
                notify('Servicio tomado correctamente.')
                onClaimed(result)
              } catch (error) {
                if (!isFinal(error)) throw error
                setFinal(errorMessage(error))
                await refreshProviderDispatches(providerId)
              }
            }}
          >
            {null}
          </ActionForm>
        </>
      )}
    </Modal>
  )
}

/**
 * V1.11: the driver delivered physically and told the provider outside Mandaria. The provider
 * records that close here. It sends no body, costs no credits and cannot be undone.
 */
export function DeliverDialog({
  providerId,
  dispatch,
  assignment,
  onClose,
}: {
  providerId: string
  dispatch: ProviderDispatch
  assignment: DeliveryAssignment
  onClose: () => void
}) {
  const notify = useFeedback()
  const [final, setFinal] = useState<string | null>(null)
  const service = dispatch.service
  return (
    <Modal title="¿Confirmar entrega?" onClose={onClose}>
      {final ? (
        <FinalState message={final} onClose={onClose} />
      ) : (
        <>
          <p className="modal-description">
            Confirma que el repartidor ya realizó la entrega al destino.
          </p>
          <p className="warning notice" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            Esta acción no se puede deshacer.
          </p>
          <InfoGrid
            items={[
              ...(service
                ? ([
                    ['Origen', service.pickup.address],
                    ['Destino', service.dropoff.address],
                  ] as [string, ReactNode][])
                : []),
              ['Repartidor', assignment.driver.name],
              ['Vehículo', vehicleLabel(assignment.vehicle)],
            ]}
          />
          <ActionForm
            initialDirty
            submitLabel="Confirmar entrega"
            cancelLabel="Cancelar"
            onCancel={onClose}
            onSubmit={async () => {
              try {
                await providerDispatches.deliver(providerId, dispatch.id)
              } catch (error) {
                if (!isFinal(error)) throw error
                // The backend already closed or moved the service: show what it says and refresh.
                setFinal(errorMessage(error))
                await refreshAfterAssignment(providerId, dispatch.id)
                return
              }
              await refreshAfterAssignment(providerId, dispatch.id)
              notify('Servicio marcado como entregado.')
              onClose()
            }}
          >
            {null}
          </ActionForm>
        </>
      )}
    </Modal>
  )
}

export function ReleaseDialog({
  providerId,
  dispatch,
  onClose,
  onReleased,
}: {
  providerId: string
  dispatch: ProviderDispatch
  onClose: () => void
  onReleased: () => void
}) {
  const notify = useFeedback()
  const [final, setFinal] = useState<string | null>(null)
  const [choice, setChoice] = useState<string>(releaseReasons[0])
  return (
    <Modal title="Liberar servicio" onClose={onClose}>
      {final ? (
        <FinalState message={final} onClose={onClose} />
      ) : (
        <>
          <p className="warning notice" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            Si liberas este servicio, no podrás volver a tomarlo.
          </p>
          {dispatch.creditCost !== null && (
            <p className="panel-note">
              Mandaria devuelve los {formatCredits(dispatch.creditCost)} que
              cobró por este servicio; el movimiento queda en tu historial de
              créditos.
            </p>
          )}
          {dispatch.service && <ServiceSummary service={dispatch.service} />}
          <ActionForm
            initialDirty
            submitLabel="Liberar servicio"
            cancelLabel="Volver"
            onCancel={onClose}
            onSubmit={async (data) => {
              const reason = (
                choice === OTHER_REASON
                  ? String(data.get('otherReason') ?? '')
                  : choice
              ).trim()
              if (
                reason.length < RELEASE_REASON_MIN ||
                reason.length > RELEASE_REASON_MAX
              )
                throw new ApiError(
                  400,
                  `Describe el motivo con entre ${RELEASE_REASON_MIN} y ${RELEASE_REASON_MAX} caracteres.`,
                )
              try {
                await providerDispatches.release(
                  providerId,
                  dispatch.id,
                  reason,
                )
                await refreshProviderDispatches(providerId)
                notify('Servicio liberado.')
                onReleased()
              } catch (error) {
                if (!isFinal(error)) throw error
                setFinal(errorMessage(error))
                await refreshProviderDispatches(providerId)
              }
            }}
          >
            <fieldset className="reason-options">
              <legend>Motivo de liberación</legend>
              {[...releaseReasons, OTHER_REASON].map((reason) => (
                <label key={reason}>
                  <input
                    type="radio"
                    name="reasonChoice"
                    value={reason}
                    checked={choice === reason}
                    onChange={() => setChoice(reason)}
                  />
                  {reason}
                </label>
              ))}
            </fieldset>
            {choice === OTHER_REASON && (
              <Field
                label="Describe el motivo"
                hint="No incluyas datos personales. Queda registrado en la auditoría."
              >
                <textarea
                  name="otherReason"
                  required
                  maxLength={RELEASE_REASON_MAX}
                  rows={3}
                />
              </Field>
            )}
          </ActionForm>
        </>
      )}
    </Modal>
  )
}

export function PackagesList({
  packages,
}: {
  packages: DispatchService['packages']
}) {
  return (
    <ul className="package-list">
      {packages.map((item, index) => (
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
              ...(item.handlingInstructions !== undefined
                ? ([
                    ['Manejo', item.handlingInstructions ?? 'Sin indicaciones'],
                  ] as [string, ReactNode][])
                : []),
            ]}
          />
        </li>
      ))}
    </ul>
  )
}
