import { useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context'
import { apiOnce, sessionFence } from '../services/api'
import { env } from '../config/env'
import { Confirm, Field } from '../components/ui'
import { errorMessage } from '../services/errors'
import { refreshExecution } from '../execution/commands'
import { executionApi } from '../execution/service'
import { phases, type Execution } from '../execution/types'
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
    await refreshExecution()
  })
}
export function DriverExecutionRecovery() {
  const { user } = useAuth()
  const raw = useSyncExternalStore(subscribe, snapshot)
  if (user?.role !== 'DRIVER') return null
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
  const [state, setState] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [close, setClose] = useState(false)
  async function recover(closing = false) {
    setBusy(true)
    try {
      const r = await apiOnce<{
        state: string
        assignmentId: string
        operation: string
      }>(
        `/driver/dispatches/${m.dispatchId}/assignments/${m.assignmentId}/attempt${closing ? '/close' : ''}?operation=${m.operation}`,
        closing ? 'POST' : 'GET',
        undefined,
        undefined,
        { 'Idempotency-Key': m.key },
      )
      if (
        r.assignmentId !== m.assignmentId ||
        r.operation !== m.operation ||
        !['APPLIED', 'CLOSED_NO_EFFECTS', 'PENDING_OR_UNKNOWN'].includes(
          r.state,
        )
      )
        throw Error('Recibo incompatible.')
      setState(r.state)
      await refreshExecution()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
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
      {['APPLIED', 'CLOSED_NO_EFFECTS'].includes(state) && (
        <button
          className="button secondary"
          onClick={() =>
            write(read().filter((r) => r.key !== m.key || r.actor !== m.actor))
          }
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
export function DriverExecutionActions({
  dispatchId,
  e,
  payment,
}: {
  dispatchId: string
  e: Execution
  payment?: ShippingPayment | null
}) {
  const { user } = useAuth()
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
      {actions.map((a) => (
        <button
          className="button secondary"
          disabled={blocked}
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
          onClose={() => setOp(null)}
          onConfirm={async () => {
            try {
              const authorize = sessionFence()
              const fresh = await executionApi.detail(
                { surface: 'driver', dispatchId },
                1,
              )
              authorize()
              if (
                !fresh.execution ||
                fresh.execution.revision !== selectedRevision ||
                fresh.execution.activeAssignmentId !== e.activeAssignmentId
              )
                throw Error(
                  'La ejecución cambió; actualiza y revisa antes de confirmar.',
                )
              const body: Record<string, unknown> = {
                assignmentId: e.activeAssignmentId,
                expectedRevision: e.revision,
              }
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
              setOp(null)
            } catch (err) {
              setError(errorMessage(err))
              setOp(null)
            }
          }}
        />
      )}
    </section>
  )
}
