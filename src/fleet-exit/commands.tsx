import { exitLink } from './service'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Confirm } from '../components/ui'
import { ApiError } from '../services/errors'
import {
  intentStore,
  makeIntent,
  recoverIntent,
  sendIntent,
  storageId,
  type Intent,
} from './attempts'
import { CommandContext } from './command-context'
import { confirmation, exitError } from './messages'
import type { Attempt, CommandResult, Scope } from './types'
export function ExitCommands({
  scope,
  children,
  restricted = false,
}: {
  scope: Scope
  children?: ReactNode
  restricted?: boolean
}) {
  const client = useQueryClient(),
    live = useRef(true),
    lock = useRef(false)
  const [pending, setPending] = useState<Intent | null>(null),
    [draft, setDraft] = useState<Intent | null>(null),
    [receipt, setReceipt] = useState<Attempt | null>(null),
    [message, setMessage] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [broken, setBroken] = useState(false),
    [denied, setDenied] = useState(false),
    [action, setAction] = useState<'retry' | 'close' | null>(null),
    [cooldown, setCooldown] = useState(false)
  const deny = useCallback((endedContext = false) => {
    setDenied(true)
    setDraft(null)
    setReceipt((r) =>
      r?.redacted ||
      (endedContext &&
        r?.receipt?.status === 'APPLIED' &&
        r.receipt.exitStatus === 'COMPLETED')
        ? r
        : null,
    )
  }, [])
  useEffect(() => {
    live.current = true
    let current = true
    const read = () =>
      intentStore
        .read(scope)
        .then((i) => {
          if (current) {
            setPending(i)
            setLoading(false)
          }
        })
        .catch((e) => {
          if (current) {
            setBroken(true)
            setLoading(false)
            setMessage(exitError(e))
          }
        })
    void read()
    const channel =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('mandaria-fleet-exit')
        : null
    if (channel)
      channel.onmessage = () => {
        setDraft(null)
        setReceipt(null)
        void read()
        void client.invalidateQueries({ queryKey: ['fleet-exit'] })
      }
    window.addEventListener('fleet-exit-intent', read)
    return () => {
      current = false
      live.current = false
      channel?.close()
      window.removeEventListener('fleet-exit-intent', read)
    }
  }, [scope, client])
  useEffect(() => {
    if (!cooldown) return
    const t = setTimeout(() => setCooldown(false), 2000)
    return () => clearTimeout(t)
  }, [cooldown])
  const refresh = async () => {
    await Promise.all(
      [
        'fleet-exit',
        'fleet',
        'logistics',
        'assistance',
        'independent-drivers',
        'driver-portal',
        'independent-offer-zones',
      ].map((k) => client.invalidateQueries({ queryKey: [k] })),
    )
  }
  const accept = async (result: Attempt, i: Intent) => {
    if (
      result.key !== i.key ||
      result.operation !== i.operation ||
      result.resourceType !== i.resourceType ||
      result.resourceId !== i.resourceId
    )
      throw Error('El resultado no corresponde a la intención original.')
    if (!live.current) return
    setReceipt(result)
    setMessage('')
    if (result.redacted) deny()
    if (result.status === 'PENDING') setCooldown(true)
    if (['APPLIED', 'REJECTED', 'CLOSED_NO_EFFECTS'].includes(result.status))
      await refresh()
  }
  const send = async (i: Intent) => {
    const r: CommandResult = await sendIntent(i, scope)
    await accept(
      'redacted' in r
        ? r
        : {
            schemaVersion: 1,
            key: r.key,
            operation: r.operation,
            resourceType: r.resourceType,
            resourceId: r.resourceId,
            status: r.status,
            receipt: r,
            redacted: false,
          },
      i,
    )
  }
  const run = async (fn: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    const work = async () => {
      try {
        await fn()
      } catch (e) {
        if (live.current) {
          setMessage(exitError(e))
          if (e instanceof ApiError && [401, 403, 404].includes(e.status))
            deny()
          if (e instanceof ApiError && [409, 503].includes(e.status))
            await refresh()
        }
      }
    }
    try {
      if (navigator.locks)
        await navigator.locks.request(
          'fleet-exit:' + storageId(scope),
          { ifAvailable: true },
          async (l) => {
            if (l) await work()
            else if (live.current)
              setMessage(
                'Otra pestaña está procesando la intención. Consulta su resultado.',
              )
          },
        )
      else await work()
    } finally {
      lock.current = false
      if (live.current) setBusy(false)
    }
  }
  const terminal =
    !!receipt &&
    ['APPLIED', 'REJECTED', 'CLOSED_NO_EFFECTS'].includes(receipt.status)
  return (
    <CommandContext.Provider
      value={{
        blocked: loading || broken || busy || !!pending || denied || restricted,
        deny,
        prepare: (op, id, body) => {
          if (loading || broken || busy || pending || denied || restricted)
            return
          try {
            setDraft(makeIntent(scope, op, id, body))
          } catch (e) {
            setMessage(exitError(e))
          }
        },
      }}
    >
      <section className="notice" aria-label="Recuperación de salida">
        <p>
          Solicitud, desvinculación efectiva y operación independiente son
          decisiones distintas.
        </p>
        {message && <p role="alert">{message}</p>}
        {pending && (
          <>
            <p>
              Intento pendiente: {pending.operation}. La clave y la revisión
              originales se conservan.
            </p>
            {receipt && (
              <>
                <p>Estado del intento: {receipt.status}</p>
                {receipt.redacted ? (
                  <p>
                    Resultado técnico redactado. No concede acceso a datos
                    privados ni nuevos comandos.
                  </p>
                ) : receipt.receipt?.status === 'APPLIED' ? (
                  <>
                    <p>
                      {receipt.receipt.exitStatus === 'PENDING'
                        ? 'Solicitud registrada. La desvinculación sigue pendiente.'
                        : 'El comando confirmó una desvinculación completada.'}{' '}
                      Consulta el estado actual; el recibo no cambia después.
                    </p>
                    {!restricted && (
                      <Link to={exitLink(scope, receipt.receipt.exitId)}>
                        Consultar salida actual
                      </Link>
                    )}
                  </>
                ) : receipt.receipt?.status === 'REJECTED' ? (
                  <p>
                    {exitError(
                      new ApiError(
                        receipt.receipt.httpStatus,
                        '',
                        receipt.receipt.code,
                      ),
                    )}
                  </p>
                ) : null}
                {receipt.status === 'UNKNOWN' && (
                  <p>
                    UNKNOWN no prueba ausencia de efectos. Recupera o cierra
                    esta clave antes de abandonarla.
                  </p>
                )}
                {receipt.status === 'PENDING' && (
                  <p>
                    Intento ocupado. Espera al menos dos segundos; no es el
                    estado de la salida.
                  </p>
                )}
                {receipt.status === 'CLOSED_NO_EFFECTS' && (
                  <p>
                    Esta clave quedó cerrada sin efectos. No cancela otra
                    solicitud ni liquida obligaciones.
                  </p>
                )}
              </>
            )}
            <button
              className="button secondary"
              disabled={busy || cooldown}
              onClick={() =>
                void run(async () => {
                  await accept(await recoverIntent(pending, scope), pending)
                })
              }
            >
              Consultar intento
            </button>
            {!restricted && !denied && receipt?.status === 'UNKNOWN' && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setAction('retry')}
              >
                Reenviar misma intención
              </button>
            )}
            {!restricted &&
              !denied &&
              receipt &&
              ['UNKNOWN', 'PENDING'].includes(receipt.status) && (
                <button
                  className="button secondary"
                  disabled={busy || cooldown}
                  onClick={() => setAction('close')}
                >
                  Cerrar intento técnico
                </button>
              )}
            {terminal && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await intentStore.clear(scope, pending.key)
                    if (live.current) {
                      setPending(null)
                      setReceipt(null)
                    }
                  })
                }
              >
                Reconocer resultado y continuar
              </button>
            )}
          </>
        )}
        {restricted && (
          <p>
            Sólo consulta de resultados propios existentes; sin START, RECHECK,
            reenvío ni cierre de claves desconocidas.
          </p>
        )}
      </section>
      {denied ? (
        <p role="alert">
          El acceso cambió. Se retiraron los datos privados. Conserva el intento
          y reautentica la misma cuenta.
        </p>
      ) : (
        children
      )}
      {draft && (
        <Confirm
          title={
            draft.operation === 'START'
              ? scope.surface === 'driver'
                ? 'Confirmar mi salida voluntaria'
                : 'Confirmar retiro de flotilla'
              : 'Confirmar reevaluación'
          }
          description={
            draft.operation === 'START'
              ? confirmation
              : 'Se reevaluarán los hechos actuales. No fuerza la salida, resuelve custodia ni modifica obligaciones.'
          }
          onClose={() => setDraft(null)}
          onConfirm={() =>
            run(async () => {
              const i = draft
              await intentStore.save(i)
              if (!live.current) return
              setPending(i)
              setDraft(null)
              setReceipt(null)
              setMessage('Resultado no confirmado hasta recibir el recibo.')
              await send(i)
            })
          }
        />
      )}
      {action && pending && (
        <Confirm
          title={
            action === 'close'
              ? 'Cerrar únicamente esta intención'
              : 'Reenviar intención original'
          }
          description={
            action === 'close'
              ? 'El cierre técnico no cancela una salida ya aplicada. Una clave cerrada no podrá enviarse después.'
              : 'Se enviarán exactamente la misma clave, ruta, revisión y cuerpo. No se crea otra solicitud.'
          }
          onClose={() => setAction(null)}
          onConfirm={() =>
            run(async () => {
              const a = action
              setAction(null)
              if (a === 'close')
                await accept(await recoverIntent(pending, scope, true), pending)
              else await send(pending)
            })
          }
        />
      )}
    </CommandContext.Provider>
  )
}
