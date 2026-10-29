import { useState } from 'react'
import { useAuth } from '../auth/context'
import { driverPortal } from '../driver-portal/service'
import { legacyProjection } from '../dispatch/rules'
import {
  releaseReasons,
  REASON_DETAIL_MIN,
  REASON_DETAIL_MAX,
} from '../driver-portal/types'
import { releaseReasonLabels } from '../driver-portal/format'
import { Field, Loading, Modal } from '../components/ui'
import { authService } from '../services/api'
import { ApiError } from '../services/errors'
import { useRead } from './hooks'
import { PrivacyForm } from './pages'
import { message } from './contract'

export function RestrictedActiveService() {
  const { restricted } = useAuth()
  const me = useRead(
    'restricted-driver',
    (s) => driverPortal.me(s),
    !!restricted?.capabilities.activeDeliveryResolution,
  )
  const active = me.data?.activeDeliveryAssignment
  const detail = useRead(
    'restricted-service-' + active?.dispatchId,
    (s) => driverPortal.get(active!.dispatchId, s),
    !!active && active.mode === 'INDEPENDENT',
  )
  const [action, setAction] = useState<'deliver' | 'release' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const allowed =
    me.isSuccess &&
    !me.isFetching &&
    detail.isSuccess &&
    !detail.isFetching &&
    active?.mode === 'INDEPENDENT' &&
    active.trackingMode === 'LEGACY' &&
    !active.execution &&
    detail.data.takenByMe &&
    detail.data.assignment?.id === active.id &&
    detail.data.id === active.dispatchId &&
    legacyProjection(detail.data)
  if (!restricted?.capabilities.activeDeliveryResolution)
    return (
      <p>
        No hay resolución activa informada. Actualiza la identidad antes de
        continuar.
      </p>
    )
  return (
    <>
      <h1>Servicio comprometido</h1>
      <p>
        La capacidad de sesión es informativa. Sólo se consulta la asignación
        propia vigente; el servidor autoriza cada acción. No puedes tomar
        servicios nuevos.
      </p>
      <button
        className="button secondary"
        onClick={async () => {
          setError('')
          try {
            await authService.session()
            const next = await me.refetch()
            if (
              active?.mode === 'INDEPENDENT' &&
              next.data?.activeDeliveryAssignment?.dispatchId ===
                active.dispatchId
            )
              await detail.refetch()
          } catch (e) {
            setError(message(e))
          }
        }}
      >
        Actualizar servicio e identidad
      </button>
      {error && <p role="alert">{error}</p>}
      {me.isPending ? (
        <Loading />
      ) : me.isError ? (
        <p role="alert">{message(me.error)}</p>
      ) : !active ? (
        <p>Sin servicio comprometido informado.</p>
      ) : active.mode === 'FLEET' ? (
        <p>
          Servicio asignado por flotilla. Su resolución corresponde al flujo
          autorizado del proveedor; esta sesión no lo amplía.
        </p>
      ) : detail.isPending ? (
        <Loading />
      ) : detail.isError ? (
        <p role="alert">{message(detail.error)}</p>
      ) : (
        detail.data && (
          <section className="panel panel-body">
            <h2>Detalle autorizado</h2>
            <p>Origen: {detail.data.service.pickup.address}</p>
            <p>Destino: {detail.data.service.dropoff.address}</p>
            {allowed ? (
              <>
                <button className="button" onClick={() => setAction('deliver')}>
                  Revisar entrega
                </button>
                <p>
                  La liberación con recibo requiere ejecución detallada; no se
                  ofrece para este servicio legacy.
                </p>
              </>
            ) : (
              <p>
                No se acreditan las condiciones para liberar o entregar con este
                contrato. Actualiza o solicita asistencia; no se habilitan
                transiciones alternativas.
              </p>
            )}
          </section>
        )
      )}
      {action && allowed && (
        <Modal
          title={
            action === 'deliver'
              ? 'Confirmar entrega comprometida'
              : 'Confirmar liberación comprometida'
          }
          onClose={() => {
            if (!busy) setAction(null)
          }}
        >
          <p>
            La entrega no se puede deshacer. Liberar devuelve el servicio para
            su atención por otra persona; la baja no permite volver a tomarlo.
          </p>
          <PrivacyForm
            label="Confirmar resolución"
            disabled={busy}
            onSubmit={async (form) => {
              setBusy(true)
              try {
                if (action === 'deliver')
                  await driverPortal.deliver(active!.dispatchId)
                else {
                  const reason = String(form.get('reason')),
                    description = String(form.get('reasonDetail') ?? '').trim()
                  if (
                    reason === 'OTHER' &&
                    description.length < REASON_DETAIL_MIN
                  )
                    throw new ApiError(400, 'Describe el motivo')
                  throw new ApiError(
                    409,
                    'La liberación durable requiere ejecución detallada; consulta asistencia.',
                  )
                }
                setAction(null)
                await me.refetch()
                await authService.session()
              } finally {
                setBusy(false)
              }
            }}
          >
            {action === 'release' && (
              <>
                <Field label="Motivo">
                  <select name="reason">
                    {releaseReasons.map((reason) => (
                      <option value={reason} key={reason}>
                        {releaseReasonLabels[reason]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Detalle del motivo (obligatorio para Otro, mínimo 3 caracteres)">
                  <textarea name="reasonDetail" maxLength={REASON_DETAIL_MAX} />
                </Field>
              </>
            )}
            <label>
              <input type="checkbox" required /> Confirmo la resolución de mi
              servicio comprometido.
            </label>
          </PrivacyForm>
        </Modal>
      )}
    </>
  )
}
