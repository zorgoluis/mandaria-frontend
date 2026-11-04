import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context'
import { apiOnce, sessionFence } from '../services/api'
import { env } from '../config/env'
import { Confirm, Field } from '../components/ui'
import { ApiError, errorMessage } from '../services/errors'
import { refreshExecution } from '../execution/commands'
import { executionApi } from '../execution/service'
import { phases, type Execution, type DriverAttempt } from '../execution/types'
import {
  confirmation,
  confirmationLabel,
  deliveryCodeFormat,
} from '../execution/delivery-confirmation'
import { phaseLabels } from '../execution/format'
import type { ShippingPayment } from '../shipping/Payment'
type Op = 'ADVANCE' | 'DELIVER' | 'REPORT' | 'COLLECT_SHIPPING'
interface Marker {
  actor: string
  dispatchId: string
  assignmentId: string
  operation: Op
  key: string
}
const storage = 'mandaria.driver-web-execution.v1:' + env.apiUrl
const subscribe = (fn: () => void) => {
  window.addEventListener('storage', fn)
  window.addEventListener('driver-web-execution', fn)
  return () => {
    window.removeEventListener('storage', fn)
    window.removeEventListener('driver-web-execution', fn)
  }
}
const snapshot = () => {
  try {
    return localStorage.getItem(storage) || '[]'
  } catch {
    return 'unavailable'
  }
}
function read(raw = snapshot()): Marker[] {
  const rows = JSON.parse(raw)
  if (
    !Array.isArray(rows) ||
    rows.some(
      (m) =>
        !m.actor ||
        !m.key ||
        !m.assignmentId ||
        !m.dispatchId ||
        !['ADVANCE', 'DELIVER', 'REPORT', 'COLLECT_SHIPPING'].includes(
          m.operation,
        ),
    )
  )
    throw Error('No se pueden leer los intentos; operaciones bloqueadas.')
  return rows
}
function write(rows: Marker[]) {
  localStorage.setItem(storage, JSON.stringify(rows))
  window.dispatchEvent(new Event('driver-web-execution'))
}
const suffix = {
  ADVANCE: 'execution-events',
  DELIVER: 'execution-completion',
  REPORT: 'custody-incidents',
  COLLECT_SHIPPING: 'shipping-collection',
}
async function startExecution(
  actor: string,
  dispatchId: string,
  operation: Op,
  body: Record<string, unknown>,
) {
  const authorize = sessionFence()
  if (!navigator.locks) throw Error('Navegador sin bloqueo entre pestañas.')
  await navigator.locks.request(storage + actor, async () => {
    authorize()
    const rows = read()
    if (rows.some((m) => m.actor === actor && m.dispatchId === dispatchId))
      throw Error('Recupera el intento anterior antes de continuar.')
    const m = {
      actor,
      dispatchId,
      operation,
      assignmentId: String(body.assignmentId),
      key: crypto.randomUUID(),
    }
    write([...rows, m])
    await apiOnce(
      `/driver/dispatches/${dispatchId}/${suffix[operation]}`,
      'POST',
      body,
      undefined,
      { 'Idempotency-Key': m.key },
    )
    authorize()
    await refreshExecution()
  })
}
export function DriverExecutionRecovery() {
  const { user, expired, loading } = useAuth()
  const raw = useSyncExternalStore(subscribe, snapshot)
  if (user?.role !== 'DRIVER' || expired || loading) return null
  let rows: Marker[]
  try {
    rows = read(raw)
  } catch {
    return (
      <p role="alert">
        No se puede leer la recuperación de ejecución; no repitas operaciones
        físicas.
      </p>
    )
  }
  return (
    <>
      {rows
        .filter((m) => m.actor === user.id)
        .map((m) => (
          <Recovery key={user.id + m.key} marker={m} />
        ))}
    </>
  )
}
function Recovery({ marker: m }: { marker: Marker }) {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [rejection, setRejection] = useState<DriverAttempt | null>(null)
  const [state, setState] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [close, setClose] = useState(false)
  async function recover(closing = false) {
    const authorize = sessionFence()
    setState('')
    setRejection(null)
    setError('')
    setBusy(true)
    try {
      const r = await apiOnce<DriverAttempt>(
        `/driver/dispatches/${m.dispatchId}/assignments/${m.assignmentId}/attempt${closing ? '/close' : ''}?operation=${m.operation}`,
        closing ? 'POST' : 'GET',
        undefined,
        undefined,
        { 'Idempotency-Key': m.key },
      )
      if (
        r.assignmentId !== m.assignmentId ||
        r.operation !== m.operation ||
        ![
          'APPLIED',
          'CLOSED_NO_EFFECTS',
          'PENDING_OR_UNKNOWN',
          'REJECTED',
        ].includes(r.state)
      )
        throw Error('Recibo incompatible.')
      if (
        r.state === 'REJECTED' &&
        (m.operation !== 'DELIVER' ||
          ![
            'DELIVERY_CODE_MISMATCH',
            'DELIVERY_CODE_ATTEMPTS_BLOCKED',
          ].includes(r.code || '') ||
          !Number.isFinite(r.retryAfter) ||
          r.retryAfter! < 0 ||
          typeof r.canStartNewAttempt !== 'boolean')
      )
        throw Error('Rechazo incompatible.')
      authorize()
      await refreshExecution()
      authorize()
      if (!mounted.current) return
      setState(r.state)
      setRejection(r.state === 'REJECTED' ? r : null)
    } catch (e) {
      if (mounted.current) setError(errorMessage(e))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <section className="panel panel-body">
      <h2>Recuperación de ejecución {m.operation}</h2>
      <p>
        {state || 'Resultado sin confirmar'}. La consulta no repite la acción
        física.
      </p>
      {error && <p role="alert">{error}</p>}
      {rejection && (
        <p role="status">
          Intento rechazado; no se confirmó la entrega.{' '}
          {rejection.retryAfter! > 0
            ? `Espera ${rejection.retryAfter} segundos y vuelve a consultar el intento. No se reenviará automáticamente.`
            : 'Consulta el estado vigente antes de preparar otra intención.'}
        </p>
      )}
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => void recover()}
      >
        Consultar ejecución original
      </button>
      {state === 'PENDING_OR_UNKNOWN' && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setClose(true)}
        >
          Cerrar clave de ejecución
        </button>
      )}
      {(['APPLIED', 'CLOSED_NO_EFFECTS'].includes(state) ||
        (rejection?.canStartNewAttempt === true &&
          rejection.retryAfter === 0)) && (
        <button
          className="button secondary"
          onClick={() =>
            write(read().filter((r) => r.key !== m.key || r.actor !== m.actor))
          }
          disabled={busy}
        >
          Reconocer ejecución
        </button>
      )}
      {close && (
        <Confirm
          title="Cerrar clave de ejecución"
          description="No revierte entrega ni cobro físico. Si ya se aplicó recuperará el estado original; de lo contrario bloqueará el POST tardío."
          onClose={() => setClose(false)}
          onConfirm={() => recover(true)}
        />
      )}
    </section>
  )
}
export function DriverExecutionActions(props: {
  dispatchId: string
  e: Execution
  payment?: ShippingPayment | null
}) {
  const { user, expired, loading } = useAuth()
  if (user?.role !== 'DRIVER' || expired || loading) return null
  return (
    <ExecutionActions
      key={
        user.id +
        props.dispatchId +
        props.e.activeAssignmentId +
        props.e.revision +
        JSON.stringify(props.e.deliveryConfirmation)
      }
      {...props}
    />
  )
}
function ExecutionActions({
  dispatchId,
  e,
  payment,
}: {
  dispatchId: string
  e: Execution
  payment?: ShippingPayment | null
}) {
  const { user } = useAuth()
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [deliveryCode, setDeliveryCode] = useState('')
  const policy = confirmation(e.deliveryConfirmation)
  const [op, setOp] = useState<Op | null>(null),
    [reason, setReason] = useState(''),
    [error, setError] = useState('')
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null)
  const raw = useSyncExternalStore(subscribe, snapshot)
  let blocked = true
  try {
    blocked = read(raw).some(
      (m) => m.actor === user?.id && m.dispatchId === dispatchId,
    )
  } catch {
    /* fail closed */
  }
  if (user?.role !== 'DRIVER' || !e.activeAssignmentId) return null
  const next = phases[e.phase ? phases.indexOf(e.phase) + 1 : 0]
  const actions: Op[] = []
  if (next && e.allowedActions.includes('ADVANCE')) actions.push('ADVANCE')
  if (e.phase === 'AT_DROPOFF' && e.allowedActions.includes('DELIVER'))
    actions.push('DELIVER')
  if (e.allowedActions.includes('REPORT_INCIDENT')) actions.push('REPORT')
  if (
    e.allowedActions.includes('COLLECT_SHIPPING') &&
    payment?.evidenceStatus === 'NOT_DECLARED'
  )
    actions.push('COLLECT_SHIPPING')
  return (
    <section className="panel panel-body">
      <h2>Registrar operación propia</h2>
      <p>{confirmationLabel(e.deliveryConfirmation)}</p>
      {actions.map((a) => (
        <button
          className="button secondary"
          disabled={blocked || (a === 'DELIVER' && !policy)}
          key={a}
          onClick={() => {
            setSelectedRevision(e.revision)
            setOp(a)
          }}
        >
          {a === 'ADVANCE'
            ? `Confirmar ${phaseLabels[next!]}`
            : a === 'DELIVER'
              ? 'Confirmar entrega detallada'
              : a === 'REPORT'
                ? 'Reportar incidencia propia'
                : 'Declarar efectivo recibido del solicitante'}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
      {op === 'REPORT' && (
        <Field label="Motivo de incidencia">
          <textarea
            value={reason}
            onChange={(v) => setReason(v.target.value)}
            maxLength={500}
          />
        </Field>
      )}
      {op && (
        <Confirm
          title="Confirmar operación física"
          description="Confirma sólo lo que realizaste. El cierre técnico posterior no revierte la acción física ni devuelve dinero."
          onClose={() => {
            setOp(null)
            setDeliveryCode('')
          }}
          onConfirm={async () => {
            try {
              const authorize = sessionFence()
              const code = deliveryCode
              setDeliveryCode('')
              if (
                op === 'DELIVER' &&
                (!policy ||
                  (policy.policy === 'REQUIRED' && !deliveryCodeFormat(code)))
              )
                throw Error(
                  'Introduce exactamente seis dígitos ASCII, sin espacios.',
                )
              const fresh = await executionApi.detail(
                { surface: 'driver', dispatchId },
                1,
              )
              authorize()
              if (!mounted.current) return
              if (
                !fresh.execution ||
                fresh.execution.revision !== selectedRevision ||
                fresh.execution.activeAssignmentId !== e.activeAssignmentId
              )
                throw Error(
                  'La ejecución cambió; actualiza y revisa antes de confirmar.',
                )
              if (
                op === 'DELIVER' &&
                (fresh.execution.phase !== 'AT_DROPOFF' ||
                  !fresh.execution.allowedActions.includes('DELIVER') ||
                  !confirmation(fresh.execution.deliveryConfirmation) ||
                  fresh.execution.deliveryConfirmation?.policy !==
                    policy?.policy)
              )
                throw Error(
                  'Los requisitos de entrega cambiaron. Actualiza el servicio.',
                )
              const body: Record<string, unknown> = {
                assignmentId: e.activeAssignmentId,
                expectedRevision: e.revision,
              }
              if (op === 'DELIVER' && policy?.policy === 'REQUIRED')
                body.deliveryCode = code
              if (op === 'ADVANCE') body.phase = next
              if (op === 'REPORT') {
                if (reason.trim().length < 3)
                  throw Error('Describe el motivo (3–500 caracteres).')
                body.reasonCode = 'OTHER'
                body.reasonDetail = reason.trim()
              }
              if (op === 'COLLECT_SHIPPING') {
                if (!payment) throw Error('Faltan condiciones del envío.')
                Object.assign(body, {
                  quotePublicId: payment.quotePublicId,
                  termsHash: payment.termsHash,
                  amount: payment.amount,
                  currency: payment.currency,
                  receivedFrom: 'REQUESTER',
                  occurredAt: new Date().toISOString(),
                })
              }
              await startExecution(user.id, dispatchId, op, body)
              if (mounted.current) setOp(null)
            } catch (err) {
              if (!mounted.current) return
              setError(deliveryError(err))
              setDeliveryCode('')
              setOp(null)
            }
          }}
        >
          {op === 'DELIVER' && policy?.policy === 'REQUIRED' && (
            <Field
              label="Código de entrega (6 dígitos)"
              hint="Introduce exactamente los seis dígitos que te comunican al recibir, incluidos ceros iniciales."
            >
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={deliveryCode}
                onChange={(v) => setDeliveryCode(v.target.value)}
              />
            </Field>
          )}
        </Confirm>
      )}
    </section>
  )
}

function deliveryError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'DELIVERY_CODE_ATTEMPTS_BLOCKED')
      return `Pausa de intentos. Espera ${Math.ceil(error.retryAfterMs / 1000)} segundos y consulta el intento original. No se reenviará automáticamente.`
    if (error.code === 'DELIVERY_CODE_MISMATCH')
      return 'El código no coincide. Recupera el intento rechazado antes de preparar una nueva corrección.'
    if (
      [
        'DELIVERY_CODE_REQUIRED',
        'DELIVERY_CODE_INVALID_FORMAT',
        'VALIDATION_ERROR',
      ].includes(error.code || '')
    )
      return 'Revisa el código de seis dígitos y recupera el intento antes de continuar.'
    if (error.code === 'IDEMPOTENCY_KEY_REUSED')
      return 'La clave pertenece a otro cuerpo. Consulta el intento original; no cambies su código.'
  }
  return error instanceof ApiError
    ? errorMessage(error)
    : error instanceof Error
      ? error.message
      : 'No se confirmó la operación.'
}
