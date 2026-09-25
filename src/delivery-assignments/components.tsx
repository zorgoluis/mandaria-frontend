import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock3, Wallet } from 'lucide-react'
import {
  ActionForm,
  Badge,
  Empty,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { paymentModes } from '../delivery-requests/format'
import { date } from '../utils/format'
import { useNow } from '../dispatch/use-now'
import type { ProviderDispatch } from '../dispatch/types'
import { deliveryAssignments } from './service'
import { assignmentKeys, refreshAfterAssignment } from './queries'
import {
  amount,
  assignmentCountdown,
  assignmentStatusLabels,
  availabilityLabels,
  endReasonLabels,
  paymentFromService,
  providerReasonLabels,
  vehicleDetail,
  vehicleLabel,
} from './format'
import {
  REASON_DETAIL_MAX,
  REASON_DETAIL_MIN,
  providerEndReasons,
  type AssignmentInput,
  type AvailableDriver,
  type AvailableVehicle,
  type DeliveryAssignment,
  type PaymentContext,
  type ProviderEndReason,
} from './types'

export function AssignmentBadge({
  status,
}: {
  status: DeliveryAssignment['status']
}) {
  return <Badge value={status} label={assignmentStatusLabels[status]} />
}

/**
 * Delivery fee and goods value are different money and are never added: the backend does not
 * define an operational total in V1.8, so the UI does not invent one.
 */
export function PaymentContextBlock({
  payment,
  beforeAssigning = false,
}: {
  payment: PaymentContext
  beforeAssigning?: boolean
}) {
  const mode = payment.goodsPaymentMode
    ? paymentModes[payment.goodsPaymentMode]
    : undefined
  return (
    <div className="payment-context">
      <div className="payment-row">
        <span>Costo del envío</span>
        <strong>{amount(payment.deliveryFee)}</strong>
      </div>
      <div className="payment-row">
        <span>Valor de mercancía</span>
        <strong>
          {payment.goodsValue ? amount(payment.goodsValue) : 'No informado'}
        </strong>
        {mode && <small>{mode.label}</small>}
      </div>
      {payment.driverAdvancesGoods ? (
        <div className="payment-advance" role="note">
          <p className="advance-amount">
            <Wallet size={15} aria-hidden="true" />
            {payment.driverAdvanceAmount
              ? `El repartidor deberá entregar ${amount(payment.driverAdvanceAmount)} al comercio.`
              : 'El repartidor deberá entregar el valor de la mercancía al comercio.'}
          </p>
          <p className="advance-warning">
            <AlertTriangle size={15} aria-hidden="true" />
            {beforeAssigning
              ? 'Verifica que el repartidor cuente con el efectivo necesario antes de asignarlo.'
              : 'Verifica que el repartidor cuente con el efectivo necesario.'}{' '}
            Mandaria no conoce el saldo del repartidor.
          </p>
        </div>
      ) : (
        payment.goodsPaymentMode === 'PREPAID' && (
          <p className="muted payment-note">
            Mercancía pagada directamente al comercio. El repartidor no adelanta
            dinero.
          </p>
        )
      )}
      <p className="panel-note payment-separation">
        El costo del envío y el valor de la mercancía son conceptos separados y
        no se suman.
      </p>
    </div>
  )
}

/** Uses the backend's own deadline. V1.8 never releases a dispatch automatically. */
export function AssignmentDeadline({
  dispatch,
}: {
  dispatch: ProviderDispatch
}) {
  const overdue = dispatch.assignmentOverdue
  const now = useNow(!overdue && dispatch.assignmentDeadline !== null)
  if (!dispatch.assignmentDeadline) return null
  if (overdue)
    return (
      <span className="countdown ended" role="status">
        <AlertTriangle size={14} aria-hidden="true" />
        Asignación demorada
      </span>
    )
  const left = assignmentCountdown(dispatch.assignmentDeadline, now)
  return (
    <span className="countdown" role="status">
      <Clock3 size={14} aria-hidden="true" />
      {left ? `Tiempo esperado para asignar: ${left}` : 'Asignación demorada'}
    </span>
  )
}

function DriverOption({
  driver,
  checked,
  onSelect,
}: {
  driver: AvailableDriver
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className={`resource-option ${checked ? 'selected' : ''}`}>
      <input
        type="radio"
        name="driverId"
        value={driver.id}
        checked={checked}
        onChange={onSelect}
      />
      <span className="resource-main">
        <strong>{driver.name}</strong>
        <small>{availabilityLabels[driver.availability]}</small>
        {driver.pairedVehicle && (
          <small className="resource-paired">
            Vehículo fijo: {vehicleLabel(driver.pairedVehicle)}
          </small>
        )}
      </span>
    </label>
  )
}
function VehicleOption({
  vehicle,
  checked,
  disabled,
  onSelect,
}: {
  vehicle: AvailableVehicle
  checked: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const detail = vehicleDetail(vehicle)
  return (
    <label
      className={`resource-option ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <input
        type="radio"
        name="vehicleId"
        value={vehicle.id}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="resource-main">
        <strong>{vehicleLabel(vehicle)}</strong>
        {detail && <small>{detail}</small>}
        {vehicle.pairedDriver && (
          <small className="resource-paired">
            Repartidor fijo: {vehicle.pairedDriver.name}
          </small>
        )}
      </span>
    </label>
  )
}

/**
 * Eligibility is never recomputed here: the lists come from available-drivers and
 * available-vehicles. The only local rule mirrors the V1.4 pairing the backend already sent,
 * so the operator cannot build a combination the backend would reject with DRIVER_VEHICLE_MISMATCH.
 */
function ResourcePicker({
  providerId,
  dispatchId,
  value,
  onChange,
}: {
  providerId: string
  dispatchId: string
  value: Partial<AssignmentInput>
  onChange: (next: Partial<AssignmentInput>) => void
}) {
  const drivers = useQuery({
    queryKey: assignmentKeys.drivers(providerId, dispatchId),
    queryFn: ({ signal }) =>
      deliveryAssignments.availableDrivers(providerId, dispatchId, signal),
    staleTime: 0,
  })
  const vehicles = useQuery({
    queryKey: assignmentKeys.vehicles(providerId, dispatchId),
    queryFn: ({ signal }) =>
      deliveryAssignments.availableVehicles(providerId, dispatchId, signal),
    staleTime: 0,
  })
  if (drivers.isPending || vehicles.isPending) return <Loading />
  if (drivers.isError || vehicles.isError)
    return (
      <ErrorState
        error={drivers.error ?? vehicles.error}
        retry={() => {
          void drivers.refetch()
          void vehicles.refetch()
        }}
      />
    )
  const driverList = drivers.data.items
  const vehicleList = vehicles.data.items
  if (!driverList.length || !vehicleList.length)
    return (
      <Empty
        title={
          !driverList.length && !vehicleList.length
            ? 'No hay repartidores ni vehículos disponibles'
            : !driverList.length
              ? 'No hay repartidores disponibles'
              : 'No hay vehículos disponibles'
        }
        description="Libera a un repartidor o vehículo de otro servicio, o libera este servicio para que otro proveedor pueda tomarlo. Mandaria no lo libera por su cuenta."
      />
    )
  const selectedDriver = driverList.find((d) => d.id === value.driverId)
  const forcedVehicleId = selectedDriver?.pairedVehicle?.id
  const selectDriver = (driver: AvailableDriver) =>
    onChange({
      driverId: driver.id,
      vehicleId: driver.pairedVehicle
        ? driver.pairedVehicle.id
        : vehicleList.some((v) => v.id === value.vehicleId && !v.pairedDriver)
          ? value.vehicleId
          : undefined,
    })
  const selectVehicle = (vehicle: AvailableVehicle) =>
    onChange({
      vehicleId: vehicle.id,
      driverId: vehicle.pairedDriver
        ? vehicle.pairedDriver.id
        : (value.driverId ?? undefined),
    })
  return (
    <div className="resource-picker">
      <fieldset className="resource-group">
        <legend>Repartidor</legend>
        <div className="resource-list">
          {driverList.map((driver) => (
            <DriverOption
              key={driver.id}
              driver={driver}
              checked={value.driverId === driver.id}
              onSelect={() => selectDriver(driver)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="resource-group">
        <legend>Vehículo</legend>
        <div className="resource-list">
          {vehicleList.map((vehicle) => (
            <VehicleOption
              key={vehicle.id}
              vehicle={vehicle}
              checked={value.vehicleId === vehicle.id}
              disabled={
                forcedVehicleId !== undefined && vehicle.id !== forcedVehicleId
              }
              onSelect={() => selectVehicle(vehicle)}
            />
          ))}
        </div>
        {forcedVehicleId && (
          <p className="muted">
            {selectedDriver?.name} tiene un vehículo asignado en su ficha, así
            que el servicio debe usar ese vehículo.
          </p>
        )}
      </fieldset>
    </div>
  )
}

function ReasonFields({
  reason,
  onReason,
}: {
  reason: ProviderEndReason
  onReason: (value: ProviderEndReason) => void
}) {
  return (
    <>
      <fieldset className="reason-options">
        <legend>Motivo</legend>
        {providerEndReasons.map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="endReason"
              value={value}
              checked={reason === value}
              onChange={() => onReason(value)}
            />
            {providerReasonLabels[value]}
          </label>
        ))}
      </fieldset>
      {reason === 'OTHER' && (
        <Field
          label="Describe el motivo"
          hint={`Entre ${REASON_DETAIL_MIN} y ${REASON_DETAIL_MAX} caracteres. No incluyas datos personales: queda en el historial.`}
        >
          <textarea
            name="reasonDetail"
            required
            maxLength={REASON_DETAIL_MAX}
            rows={3}
          />
        </Field>
      )}
    </>
  )
}
/** OTHER requires a detail; the backend validates it too. */
function reasonDetailOf(reason: ProviderEndReason, raw: string) {
  const detail = raw.trim()
  if (reason !== 'OTHER') return detail ? detail : undefined
  if (detail.length < REASON_DETAIL_MIN || detail.length > REASON_DETAIL_MAX)
    throw new ApiError(
      400,
      `Describe el motivo con entre ${REASON_DETAIL_MIN} y ${REASON_DETAIL_MAX} caracteres.`,
    )
  return detail
}

export function AssignDialog({
  providerId,
  dispatch,
  onClose,
}: {
  providerId: string
  dispatch: ProviderDispatch
  onClose: () => void
}) {
  const notify = useFeedback()
  const [choice, setChoice] = useState<Partial<AssignmentInput>>({})
  const payment = dispatch.service ? paymentFromService(dispatch.service) : null
  return (
    <Modal title="Asignar repartidor y vehículo" onClose={onClose}>
      <p className="modal-description">
        Mandaria confirmará la asignación sólo si el repartidor y el vehículo
        siguen libres en este momento.
      </p>
      {dispatch.service && (
        <InfoGrid
          items={[
            ['Origen', dispatch.service.pickup.address],
            ['Destino', dispatch.service.dropoff.address],
          ]}
        />
      )}
      <ActionForm
        initialDirty
        submitLabel="CONFIRMAR ASIGNACIÓN"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async () => {
          if (!choice.driverId || !choice.vehicleId)
            throw new ApiError(400, 'Elige un repartidor y un vehículo.')
          await deliveryAssignments.assign(providerId, dispatch.id, {
            driverId: choice.driverId,
            vehicleId: choice.vehicleId,
          })
          // The response is not treated as the current state: the panel renders what we refetch.
          await refreshAfterAssignment(providerId, dispatch.id)
          notify('Asignación confirmada.')
          onClose()
        }}
      >
        <ResourcePicker
          providerId={providerId}
          dispatchId={dispatch.id}
          value={choice}
          onChange={setChoice}
        />
        {payment && <PaymentContextBlock payment={payment} beforeAssigning />}
      </ActionForm>
    </Modal>
  )
}

export function ReassignDialog({
  providerId,
  dispatch,
  current,
  onClose,
}: {
  providerId: string
  dispatch: ProviderDispatch
  current: DeliveryAssignment
  onClose: () => void
}) {
  const notify = useFeedback()
  const [choice, setChoice] = useState<Partial<AssignmentInput>>({})
  const [reason, setReason] = useState<ProviderEndReason>('DRIVER_UNAVAILABLE')
  const payment = dispatch.service ? paymentFromService(dispatch.service) : null
  return (
    <Modal title="Reasignar servicio" onClose={onClose}>
      <p className="modal-description">
        La asignación de {current.driver.name} con{' '}
        {vehicleLabel(current.vehicle)} pasará al historial y la nueva quedará
        vigente. Mandaria decide cuál queda activa.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Confirmar reasignación"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          if (!choice.driverId || !choice.vehicleId)
            throw new ApiError(400, 'Elige un repartidor y un vehículo.')
          const reasonDetail = reasonDetailOf(
            reason,
            String(data.get('reasonDetail') ?? ''),
          )
          await deliveryAssignments.reassign(providerId, dispatch.id, {
            driverId: choice.driverId,
            vehicleId: choice.vehicleId,
            reason,
            ...(reasonDetail ? { reasonDetail } : {}),
          })
          // Concurrent reassignments both answer 200, so the sent pair may already be history.
          await refreshAfterAssignment(providerId, dispatch.id)
          notify('Reasignación registrada. Revisa quién quedó asignado.')
          onClose()
        }}
      >
        <ResourcePicker
          providerId={providerId}
          dispatchId={dispatch.id}
          value={choice}
          onChange={setChoice}
        />
        <ReasonFields reason={reason} onReason={setReason} />
        {payment && <PaymentContextBlock payment={payment} beforeAssigning />}
      </ActionForm>
    </Modal>
  )
}

export function CancelAssignmentDialog({
  providerId,
  dispatch,
  current,
  onClose,
}: {
  providerId: string
  dispatch: ProviderDispatch
  current: DeliveryAssignment
  onClose: () => void
}) {
  const notify = useFeedback()
  const [reason, setReason] = useState<ProviderEndReason>('DRIVER_UNAVAILABLE')
  return (
    <Modal title="Cancelar asignación" onClose={onClose}>
      <p className="warning notice" role="note">
        <AlertTriangle size={16} aria-hidden="true" />
        El servicio sigue siendo de tu proveedor: sólo se libera a{' '}
        {current.driver.name} y {vehicleLabel(current.vehicle)}. Para devolver
        el servicio, libéralo después desde el detalle.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Cancelar asignación"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const reasonDetail = reasonDetailOf(
            reason,
            String(data.get('reasonDetail') ?? ''),
          )
          await deliveryAssignments.cancel(providerId, dispatch.id, {
            reason,
            ...(reasonDetail ? { reasonDetail } : {}),
          })
          await refreshAfterAssignment(providerId, dispatch.id)
          notify('Asignación cancelada. El servicio quedó sin repartidor.')
          onClose()
        }}
      >
        <ReasonFields reason={reason} onReason={setReason} />
      </ActionForm>
    </Modal>
  )
}

/** Newest first, exactly as the backend returns it; the ACTIVE one is marked as current. */
export function AssignmentHistory({
  assignments,
  emptyDescription = 'Todavía no se ha asignado un repartidor a este servicio.',
}: {
  assignments: DeliveryAssignment[]
  emptyDescription?: string
}) {
  if (!assignments.length)
    return <Empty title="Sin asignaciones" description={emptyDescription} />
  return (
    <ol className="assignment-history">
      {assignments.map((item) => (
        <li
          key={item.id}
          className={`assignment-entry ${item.status === 'ACTIVE' ? 'current' : ''}`}
        >
          <div className="assignment-heading">
            <strong>{item.driver.name}</strong>
            <span className="muted">{vehicleLabel(item.vehicle)}</span>
            <AssignmentBadge status={item.status} />
            {item.status === 'ACTIVE' && (
              <span className="tag">Asignación vigente</span>
            )}
          </div>
          <InfoGrid
            items={[
              ['Asignado', date(item.assignedAt)],
              ...(item.endedAt
                ? ([['Terminó', date(item.endedAt)]] as [string, string][])
                : []),
              ...(item.endReason
                ? ([['Motivo', endReasonLabels[item.endReason]]] as [
                    string,
                    string,
                  ][])
                : []),
              ...(item.endReasonDetail
                ? ([['Detalle', item.endReasonDetail]] as [string, string][])
                : []),
            ]}
          />
        </li>
      ))}
    </ol>
  )
}
