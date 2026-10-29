import { sessionFence } from '../services/api'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { ErrorPage, ErrorState, Loading, Field } from '../components/ui'
import { ApiError, errorMessage } from '../services/errors'
import {
  reception,
  feed,
  ready,
  type ReceptionCommand,
} from './reception-service'
import {
  receptionStore,
  makeIntent,
  replay,
  locked,
  type Intent,
} from './reception-intent'
import { PortalTabs } from './pages'
export function ReceptionPage() {
  const { user } = useAuth()
  return user?.role === 'DRIVER' ? (
    <Panel key={user.id} actor={user.id} />
  ) : (
    <ErrorPage code={403} />
  )
}
function Panel({ actor }: { actor: string }) {
  const q = useQuery({
    queryKey: ['offer-reception', actor],
    queryFn: reception.get,
    staleTime: 0,
    retry: false,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
  const offers = useQuery({
    queryKey: ['independent-feed', actor, q.data?.revision],
    queryFn: feed,
    enabled: !!q.data && ['READY', 'PREVIEW'].includes(q.data.state),
    retry: false,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
  const [zone, setZone] = useState(''),
    [pending, setPending] = useState<Intent | null>(null),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [terminal, setTerminal] = useState(false)
  const scope = { actor, profileId: 'own' }
  useEffect(() => {
    let active = true
    void receptionStore
      .read({ actor, profileId: 'own' })
      .then((i) => {
        if (active) {
          setPending(i)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (active)
          setError('No se pudo recuperar la intención; cambios bloqueados.')
      })
    return () => {
      active = false
    }
  }, [actor])
  async function send(action: ReceptionCommand['action']) {
    const authorize = sessionFence()
    setBusy(true)
    setError('')
    try {
      await locked(scope, async () => {
        let i = await receptionStore.read(scope)
        if (!i) {
          if (!q.data) throw Error('Consulta la recepción.')
          i = makeIntent(scope, {
            requestId: crypto.randomUUID(),
            expectedRevision: q.data.revision,
            action,
            ...(action === 'START' || action === 'SELECT_ZONE'
              ? { zoneId: zone || q.data.selectedZoneId || '' }
              : {}),
          })
          await receptionStore.save(i)
        }
        setPending(i)
        try {
          authorize()
          await replay(i, scope)
          setTerminal(true)
        } catch (e) {
          if (e instanceof ApiError && e.code === 'REVISION_CONFLICT')
            setTerminal(true)
          throw e
        } finally {
          await q.refetch()
          await offers.refetch()
        }
      })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <h1>Zonas, disponibilidad y turno</h1>
      <PortalTabs />
      <p>
        Elige una zona propia autorizada e inicia el turno explícitamente.
        Aprobación, expediente y disponibilidad son requisitos separados. No se
        hereda cobertura de flotilla.
      </p>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <p>
            Recepción: {q.data.state} · {q.data.reason}. Revisión{' '}
            {q.data.revision}.
          </p>
          <p>
            Turno: {q.data.shift?.expiresAt ?? 'Sin turno'}.{' '}
            {ready(q.data)
              ? 'Puedes intentar tomar una oferta; el servidor vuelve a validar.'
              : 'No se autoriza tomar. PREVIEW sólo permite consultar.'}
          </p>
          <Field label="Zona autorizada">
            <select
              value={zone || q.data.selectedZoneId || ''}
              onChange={(e) => setZone(e.target.value)}
              disabled={busy || !!pending}
            >
              <option value="">Selecciona zona</option>
              {q.data.allowedZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          {!pending &&
            (['SELECT_ZONE', 'START', 'RENEW', 'STOP'] as const).map((a, n) => (
              <button
                className="button secondary"
                key={a}
                disabled={!loaded || busy || q.isFetching}
                onClick={() => void send(a)}
              >
                {
                  [
                    'Seleccionar zona',
                    'Iniciar turno',
                    'Renovar turno',
                    'Detener turno',
                  ][n]
                }
              </button>
            ))}
          {(['AVAILABLE', 'OFFLINE'] as const).map((a, n) => (
            <button
              className="button secondary"
              key={a}
              disabled={busy || !!pending}
              onClick={async () => {
                setBusy(true)
                try {
                  await reception.availability(a)
                  await q.refetch()
                } catch (e) {
                  setError(errorMessage(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {['Ponerme disponible', 'Ponerme fuera de línea'][n]}
            </button>
          ))}
        </>
      )}
      {pending && (
        <section className="notice">
          <p>
            Intención de recepción {pending.body.action} conservada. Una lectura
            coincidente no identifica al autor.
          </p>
          {terminal ? (
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                await receptionStore.clear(scope, pending.body.requestId)
                setPending(null)
                setTerminal(false)
                await q.refetch()
              }}
            >
              Reconocer resultado y revisar
            </button>
          ) : (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void send(pending.body.action)}
            >
              Recuperar con el mismo cuerpo y requestId
            </button>
          )}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <h2>Ofertas del turno</h2>
      {offers.isError ? (
        <ErrorState
          error={offers.error}
          retry={() => {
            void q.refetch()
            void offers.refetch()
          }}
        />
      ) : !offers.isFetching &&
        offers.data &&
        offers.data.receptionRevision === q.data?.revision ? (
        <>
          {offers.data.items.map((o) => (
            <p key={o.dispatchId}>
              <Link to={'/driver/services/' + o.dispatchId}>
                Consultar oferta {o.dispatchId}
              </Link>{' '}
              · vence {o.expiresAt}
            </p>
          ))}
          {offers.data.nextPageToken && (
            <p>
              Se muestran las primeras100 ofertas; actualiza para una fotografía
              nueva.
            </p>
          )}
        </>
      ) : (
        <p>
          Consulta la recepción y actualiza para obtener las ofertas vigentes.
        </p>
      )}
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => {
          void q.refetch()
          void offers.refetch()
        }}
      >
        Actualizar recepción y ofertas
      </button>
    </>
  )
}
