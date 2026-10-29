import { useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { Confirm } from '../components/ui'
import { errorMessage } from '../services/errors'
import { independentStore, recoverIndependent, type Intent } from './attempts'
import type { Attempt } from './attempt-api'
import { queryClient } from '../services/query'
export function IndependentRecovery() {
  const { user, restricted } = useAuth()
  const actor = user?.role === 'DRIVER' ? user.id : restricted?.identity.id
  return actor ? <Recovery key={actor} actor={actor} /> : null
}
function Recovery({ actor }: { actor: string }) {
  const [items, setItems] = useState<Intent[]>([]),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const read = () => {
      void independentStore
        .list(actor)
        .then((v) => {
          if (active) setItems(v)
        })
        .catch(() => {
          if (active)
            setError(
              'No se pudo leer el almacenamiento de intentos. No vuelvas a enviar operaciones inciertas.',
            )
        })
    }
    read()
    window.addEventListener('independent-intent', read)
    window.addEventListener('focus', read)
    const c =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('mandaria-independent-intents')
        : null
    if (c) c.onmessage = read
    return () => {
      active = false
      window.removeEventListener('independent-intent', read)
      window.removeEventListener('focus', read)
      c?.close()
    }
  }, [actor])
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {items.map((i) => (
        <Record key={i.key} intent={i} actor={actor} />
      ))}
    </>
  )
}
function Record({ intent: i, actor }: { intent: Intent; actor: string }) {
  const [result, setResult] = useState<Attempt | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [closing, setClosing] = useState(false)
  async function read(close = false) {
    setBusy(true)
    setError('')
    try {
      const r = await recoverIndependent(i, actor, close)
      setResult(r)
      if (r.state !== 'PENDING_OR_UNKNOWN')
        await queryClient.invalidateQueries({
          queryKey: ['driver-portal'],
          refetchType: 'none',
        })
    } catch (e) {
      setError(
        errorMessage(e) +
          ' Conserva la intención; vuelve a consultar con la misma cuenta.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      className="panel panel-body"
      aria-label="Recuperación independiente"
    >
      <h2>Intento {i.scope.operation}</h2>
      <p>
        Despacho {i.scope.dispatchId}. La clave original está guardada; no se
        repite la operación.
      </p>
      {result?.state === 'APPLIED' ? (
        <>
          <p>
            Operación confirmada. Recibo original:{' '}
            {result.result?.dispatchStatus} · asignación{' '}
            {result.result?.assignmentStatus}.
          </p>
          <p>
            Movimiento de créditos: {result.result?.credits.amount}. No
            representa el saldo actual ni devuelve efectivo.
          </p>
        </>
      ) : result?.state === 'CLOSED_NO_EFFECTS' ? (
        <p>
          Cerrado sin efectos. Una nueva intención requiere revisar el estado
          actual y confirmar.
        </p>
      ) : (
        <p>
          Resultado pendiente o desconocido. No autoriza reenviar ni preparar
          otra clave.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => void read()}
      >
        Consultar intento independiente
      </button>
      {result?.state === 'PENDING_OR_UNKNOWN' && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setClosing(true)}
        >
          Cerrar intento sin efectos
        </button>
      )}
      {result && result.state !== 'PENDING_OR_UNKNOWN' && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void independentStore.clear(i).catch((e) => {
              setError(errorMessage(e))
              setBusy(false)
            })
          }}
        >
          Reconocer recibo
        </button>
      )}
      {closing && (
        <Confirm
          title="Cerrar intento independiente"
          description="Si ya se aplicó recuperarás el recibo original. Si el cierre gana, impedirá el POST tardío. No libera un servicio ni cancela una entrega."
          label="Confirmar cierre técnico"
          onClose={() => setClosing(false)}
          onConfirm={() => read(true)}
        />
      )}
    </section>
  )
}
