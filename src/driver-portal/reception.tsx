import { sessionFence } from '../services/api'
import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { ErrorPage, ErrorState, Loading, Field } from '../components/ui'
import { ApiError, errorMessage } from '../services/errors'
import { reception, ready, type ReceptionCommand } from './reception-service'
import {
  receptionStore,
  makeIntent,
  replay,
  locked,
  type Intent,
} from './reception-intent'
import { driverPortal } from './service'
import { MapPin } from 'lucide-react'
import './reception.css'
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
  const me = useQuery({
    queryKey: ['reception-driver', actor],
    queryFn: ({ signal }) => driverPortal.me(signal),
    staleTime: 0,
    retry: false,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  })
  const actionLock = useRef(false)
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
    if (actionLock.current) return
    actionLock.current = true
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
          await me.refetch()
        }
      })
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'REVISION_CONFLICT'
          ? 'El estado cambió; se actualizó la información'
          : errorMessage(e),
      )
    } finally {
      setBusy(false)
      actionLock.current = false
    }
  }
  const data = q.data
  const selected = data?.allowedZones.find((z) => z.id === data.selectedZoneId)
  const availability = me.data?.availability
  const baseDisabled =
    !loaded ||
    busy ||
    !!pending ||
    q.isFetching ||
    q.isError ||
    me.isError ||
    !me.data
  const reason = !loaded
    ? 'Recuperando operaciones pendientes.'
    : pending
      ? 'Revisa la intención pendiente antes de cambiar.'
      : busy || q.isFetching
        ? 'Actualizando información.'
        : !selected
          ? 'Selecciona una zona autorizada.'
          : 'La recepción y el modo se validan en el servidor.'
  async function changeAvailability(value: 'AVAILABLE' | 'OFFLINE') {
    if (actionLock.current || baseDisabled || !selected) return
    actionLock.current = true
    setBusy(true)
    setError('')
    const authorize = sessionFence()
    try {
      authorize()
      await reception.availability(value)
      authorize()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      await Promise.all([q.refetch(), me.refetch()])
      setBusy(false)
      actionLock.current = false
    }
  }
  return (
    <div className="reception-page">
      <header>
        <h1>Zonas y disponibilidad</h1>
        <p>
          Elige una zona propia autorizada y define tu disponibilidad.
          Aprobación, expediente y disponibilidad son requisitos separados. No
          se hereda cobertura de flotilla.
        </p>
      </header>
      <PortalTabs />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        data && (
          <>
            <div className="reception-statuses" aria-live="polite">
              <section>
                <span>Recepción</span>
                <strong className={'reception-dot state-' + data.state}>
                  {
                    {
                      OFF: 'Apagada',
                      PAUSED: 'Pausada',
                      PREVIEW: 'Vista previa',
                      READY: 'Encendida',
                    }[data.state]
                  }
                </strong>
                <small>
                  {data.state} · Revisión {data.revision} · {data.reason}
                </small>
              </section>
              <section>
                <span>Modo</span>
                <strong
                  className={
                    'reception-dot ' + (ready(data) ? 'state-READY' : '')
                  }
                >
                  {ready(data)
                    ? 'Puede intentar tomar ofertas'
                    : 'Solo consulta'}
                </strong>
                <small>
                  {data.state === 'PREVIEW' ? 'PREVIEW · ' : ''}
                  {ready(data)
                    ? 'Autorización sujeta a validación del servidor'
                    : 'No se autoriza tomar'}
                </small>
              </section>
            </div>
            <div className="reception-columns">
              <section className="reception-card reception-zone">
                <h2>
                  <span className="reception-step">1</span>Zona autorizada
                </h2>
                {data.allowedZones.length ? (
                  <>
                    <div className="reception-zone-row">
                      <Field label="Zona autorizada">
                        <span className="reception-select">
                          <MapPin aria-hidden="true" />
                          <select
                            aria-label="Zona autorizada"
                            value={zone || data.selectedZoneId || ''}
                            disabled={baseDisabled}
                            onChange={(e) => setZone(e.target.value)}
                          >
                            <option value="">Selecciona zona</option>
                            {data.allowedZones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name}
                              </option>
                            ))}
                          </select>
                        </span>
                      </Field>
                      <button
                        className="button"
                        aria-describedby="reception-reason"
                        disabled={
                          baseDisabled ||
                          !zone ||
                          zone === data.selectedZoneId ||
                          !data.allowedZones.some((z) => z.id === zone)
                        }
                        onClick={() => void send('SELECT_ZONE')}
                      >
                        Seleccionar zona
                      </button>
                    </div>
                    <small>
                      Solo aparecen zonas propias autorizadas para tu cuenta.
                    </small>
                  </>
                ) : (
                  <p>
                    No tienes zonas propias autorizadas.{' '}
                    <Link to="/driver/onboarding">Ver mi expediente</Link>
                  </p>
                )}
              </section>
              <aside className="reception-aside">
                <section
                  className="reception-card reception-availability"
                  aria-live="polite"
                >
                  <h2>Disponibilidad</h2>
                  <strong className="reception-current">
                    {availability === 'AVAILABLE'
                      ? 'Disponible'
                      : availability === 'OFFLINE'
                        ? 'Fuera de línea'
                        : availability === 'BUSY'
                          ? 'Ocupado'
                          : 'Sin confirmar'}
                  </strong>
                  <p>Zona: {selected?.name || 'Sin zona seleccionada'}</p>
                  {me.isError && (
                    <ErrorState
                      error={me.error}
                      retry={() => void me.refetch()}
                    />
                  )}
                  <div
                    role="radiogroup"
                    aria-label="Disponibilidad"
                    className="reception-switch"
                  >
                    {(['AVAILABLE', 'OFFLINE'] as const).map((v) => (
                      <label
                        key={v}
                        className={availability === v ? 'selected' : ''}
                      >
                        <input
                          type="radio"
                          name="availability"
                          value={v}
                          checked={availability === v}
                          disabled={baseDisabled || !selected || me.isFetching}
                          aria-describedby="reception-reason"
                          onChange={() => void changeAvailability(v)}
                        />
                        {v === 'AVAILABLE' ? 'Disponible' : 'Fuera de línea'}
                      </label>
                    ))}
                  </div>
                  <small id="reception-reason">{reason}</small>
                </section>
                <section className="reception-card">
                  <h2>Para recibir ofertas</h2>
                  <ul className="reception-checklist">
                    {[
                      [!!selected, 'Zona autorizada seleccionada'],
                      [availability === 'AVAILABLE', 'Disponible'],
                      [ready(data), 'Modo con autorización para tomar'],
                    ].map(([ok, label]) => (
                      <li key={String(label)}>
                        <span
                          className={ok ? 'complete' : ''}
                          aria-label={ok ? 'Cumplido' : 'Pendiente'}
                        >
                          {ok ? '✓' : ''}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )
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
      <button
        className="button secondary reception-refresh"
        disabled={busy || q.isFetching || me.isFetching}
        onClick={() => {
          void q.refetch()
          void me.refetch()
        }}
      >
        Actualizar estado
      </button>
    </div>
  )
}
