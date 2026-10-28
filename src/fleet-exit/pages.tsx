import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { ProviderScope } from '../logistics/components'
import { ErrorPage, Field, Loading, PageTitle } from '../components/ui'
import { ApiError } from '../services/errors'
import { exits, exitLink } from './service'
import { exitError, reasons } from './messages'
import { ExitCommands } from './commands'
import { useExitCommands } from './command-context'
import { intentStore } from './attempts'
import { uuid } from './validation'
import type { Scope, Summary, Context, Status, Notice } from './types'
const queryKey = (s: Scope) => [
  'fleet-exit',
  s.actor,
  s.surface,
  s.providerId ?? 'all',
]
function QueryError({
  error,
  reset,
  affiliation = false,
}: {
  error: unknown
  reset?: () => void
  affiliation?: boolean
}) {
  const { deny } = useExitCommands()
  useEffect(() => {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status))
      deny(affiliation && error.status === 404)
  }, [error, deny, affiliation])
  return (
    <div role="alert">
      <p>{exitError(error)} No se muestran datos anteriores.</p>
      {reset && <button onClick={reset}>Reiniciar consulta</button>}
    </div>
  )
}
export function FleetExitsPage({ surface }: { surface: Scope['surface'] }) {
  const { user } = useAuth()
  if (
    !user ||
    user.role !== (surface === 'admin' ? 'SUPER_ADMIN' : 'PROVIDER_ADMIN')
  )
    return <ErrorPage code={403} />
  return (
    <>
      <PageTitle
        title="Salidas de flotilla"
        description="Solicitud, salida efectiva y habilitación independiente se consultan por separado."
      />
      {surface === 'provider' ? (
        <ProviderScope>
          {(p) => (
            <Area actor={user.id} surface={surface} providerId={p.providerId} />
          )}
        </ProviderScope>
      ) : (
        <Area actor={user.id} surface={surface} />
      )}
    </>
  )
}
function Area({ actor, surface, providerId }: Scope) {
  const { id } = useParams(),
    [params] = useSearchParams()
  const driverId = params.get('driverId') ?? undefined
  const scope = useMemo(
    () => ({ actor, surface, providerId }),
    [actor, surface, providerId],
  )
  if ((id && !uuid(id)) || (driverId && !uuid(driverId)))
    return <ErrorPage code={404} />
  return (
    <ExitCommands
      key={`${actor}:${surface}:${providerId}:${id}:${driverId}`}
      scope={scope}
    >
      {id ? (
        <ExitDetail scope={scope} id={id} />
      ) : (
        <>
          {driverId && <Affiliation scope={scope} driverId={driverId} />}
          <ExitList scope={scope} driverId={driverId} />
          <Notices scope={scope} />
        </>
      )}
    </ExitCommands>
  )
}
function Affiliation({ scope, driverId }: { scope: Scope; driverId: string }) {
  const q = useQuery({
    queryKey: [...queryKey(scope), 'context', driverId],
    queryFn: ({ signal }) => exits.context(scope, driverId, signal),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
  if (q.isError)
    return (
      <QueryError affiliation error={q.error} reset={() => void q.refetch()} />
    )
  if (!q.data) return <Loading />
  return (
    <ContextPanel
      scope={scope}
      context={q.data}
      driverId={driverId}
      fetching={q.isFetching}
    />
  )
}
export function ContextPanel({
  scope,
  context: c,
  driverId,
  fetching = false,
}: {
  scope: Scope
  context: Context
  driverId: string
  fetching?: boolean
}) {
  const cmd = useExitCommands()
  return (
    <section className="panel panel-body" aria-label="Afiliación del conductor">
      <h2>Afiliación del conductor</h2>
      <p>
        {c.affiliation?.state === 'ACTIVE'
          ? 'Vinculado a la flotilla'
          : c.affiliation?.state === 'EXIT_PENDING'
            ? 'Salida solicitada; afiliación pendiente de terminar'
            : 'Sin afiliación actual'}
      </p>
      {c.affiliation && (
        <p>
          Inicio de afiliación:{' '}
          {c.affiliation.startedAt ?? 'Fecha no acreditada'}
        </p>
      )}
      {c.exit && (
        <>
          <SummaryPanel scope={scope} item={c.exit} />
          <Link to={exitLink(scope, c.exit.id)}>Consultar salida</Link>
        </>
      )}
      {scope.surface === 'provider' &&
        (c.capabilities.canRequestExit &&
        c.capabilities.requestExitReason === null &&
        c.affiliation ? (
          <button
            className="button"
            disabled={cmd.blocked || fetching}
            onClick={() =>
              cmd.prepare('START', c.affiliation!.id, {
                expectedAffiliationRevision: c.affiliation!.revision,
                reasonCode: 'PROVIDER_REMOVAL',
              })
            }
          >
            Solicitar retiro de flotilla
          </button>
        ) : (
          <p>
            {reasons[c.capabilities.requestExitReason ?? ''] ??
              'No está autorizada una nueva solicitud.'}
          </p>
        ))}
      {scope.surface === 'admin' && (
        <>
          <p>
            La administración consulta y reevalúa; no inicia salidas en nombre
            de las partes.
          </p>
          {c.independent && (
            <section aria-label="Elegibilidad independiente">
              <h3>Elegibilidad independiente</h3>
              <p>
                Perfil: {c.independent.profileState}.{' '}
                {c.independent.canOperate
                  ? 'Elegibilidad operativa informada por el servidor.'
                  : 'Sin operación independiente habilitada.'}
              </p>
              {c.independent.reasons.map((r) => (
                <p key={r}>{reasons[r] ?? r}</p>
              ))}
              <p>
                Zonas propias autorizadas: {c.independent.allowedZoneIds.length}
                . La selección e inicio de recepción corresponden al conductor;
                no se heredan zonas de flotilla.
              </p>
            </section>
          )}
          <Link to={`/independent-drivers/${encodeURIComponent(driverId)}`}>
            Consultar habilitación independiente
          </Link>
        </>
      )}
    </section>
  )
}
export function SummaryPanel({ scope, item }: { scope: Scope; item: Summary }) {
  return (
    <section className="panel panel-body">
      <h3>
        {item.status === 'COMPLETED'
          ? 'Desvinculación completada'
          : 'Salida pendiente'}
      </h3>
      <p>
        Solicitada: {item.requestedAt}
        {item.completedAt ? ` · Completada: ${item.completedAt}` : ''}
      </p>
      <p>
        {item.initiatedByKinds.includes('DRIVER_REQUEST')
          ? 'El conductor solicitó salir. No necesita aprobación del dueño ni admite veto.'
          : 'Retiro solicitado por el proveedor.'}
        {item.initiatedByKinds.length > 1
          ? ' Ambas partes registraron su solicitud.'
          : ''}
      </p>
      <h4>Situación operativa</h4>
      {item.blockers.length ? (
        item.blockers.map((b, n) => (
          <div key={n}>
            <p>
              {reasons[b.code] ??
                'La operación requiere revisión; no se fuerza la salida.'}
            </p>
            {b.assistanceCaseId && (
              <Link
                to={`${scope.surface === 'admin' ? '/admin' : ''}/fleet-assistance/${encodeURIComponent(b.assistanceCaseId)}${scope.providerId ? '?providerId=' + scope.providerId : ''}`}
              >
                Consultar asistencia autorizada
              </Link>
            )}
            {scope.surface === 'admin' && b.assignmentId && (
              <Link to="/custody-incidents">
                Consultar incidencias de custodia
              </Link>
            )}
          </div>
        ))
      ) : (
        <p>Sin bloqueos operativos informados en esta evaluación.</p>
      )}
      <p>
        {item.hasPendingEconomics
          ? 'Hay asuntos económicos pendientes. Pueden continuar tras la salida; no acreditan liquidación ni son por sí solos un veto.'
          : 'No se informan pendientes económicos en esta evaluación. No acredita pagos.'}
      </p>
      <p>
        La cuenta, el historial y las responsabilidades se conservan. La salida
        no habilita operación independiente ni transfiere vehículo, documentos,
        saldo o zonas.
      </p>
    </section>
  )
}
function ExitDetail({ scope, id }: { scope: Scope; id: string }) {
  const cmd = useExitCommands(),
    q = useQuery({
      queryKey: [...queryKey(scope), 'detail', id],
      queryFn: ({ signal }) => exits.detail(scope, id, signal),
      retry: false,
      gcTime: 0,
      staleTime: 0,
    })
  if (q.isError)
    return <QueryError error={q.error} reset={() => void q.refetch()} />
  if (!q.data) return <Loading />
  const d = q.data
  return (
    <>
      <Link to={exitLink(scope)}>Volver a salidas</Link>
      <button
        className="button secondary"
        disabled={q.isFetching}
        onClick={() => void q.refetch()}
      >
        Actualizar salida
      </button>
      <SummaryPanel scope={scope} item={d} />
      <p>Última evaluación: {d.lastEvaluatedAt ?? 'No disponible'}</p>
      {d.capabilities.canRecheck && d.capabilities.recheckReason === null ? (
        <button
          className="button"
          disabled={cmd.blocked || q.isFetching}
          onClick={() =>
            cmd.prepare('RECHECK', d.id, { expectedExitRevision: d.revision })
          }
        >
          Solicitar reevaluación
        </button>
      ) : (
        <p>
          {reasons[d.capabilities.recheckReason ?? ''] ??
            'Reevaluación no autorizada.'}
        </p>
      )}
      <p>
        El proveedor conserva sólo su participación histórica autorizada; la
        ventana de consulta de salidas completadas es de doce meses. No implica
        borrado de datos.
      </p>
      <Link
        to={`${scope.surface === 'admin' ? '/admin' : ''}/fleet-assistance${scope.providerId ? '?providerId=' + scope.providerId : ''}`}
      >
        Asistencia y conciliación histórica
      </Link>
      {scope.surface === 'admin' && (
        <Affiliation scope={scope} driverId={d.driverId} />
      )}
      <NoticeRows scope={scope} items={d.notices} />
    </>
  )
}
function ExitList({ scope, driverId }: { scope: Scope; driverId?: string }) {
  const [status, setStatus] = useState<Status | ''>(''),
    [limit, setLimit] = useState(25),
    [generation, reset] = useState(0)
  const filters = { status: status || undefined, driverId, limit }
  const q = useInfiniteQuery({
    queryKey: [...queryKey(scope), 'list', filters, generation],
    queryFn: ({ pageParam, signal }) =>
      exits.list(scope, { ...filters, pageToken: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
  const rows = [
    ...new Map(
      q.data?.pages.flatMap((p) => p.items).map((r) => [r.id, r]),
    ).values(),
  ]
  return (
    <section className="panel panel-body">
      <h2>Solicitudes de salida</h2>
      <div className="filters">
        <Field label="Estado de salida">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | '')}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="COMPLETED">Completadas</option>
          </select>
        </Field>
        <Field label="Resultados por página">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[25, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <button disabled={q.isFetching} onClick={() => reset((n) => n + 1)}>
          Actualizar salidas
        </button>
      </div>
      {q.isError ? (
        <QueryError error={q.error} reset={() => reset((n) => n + 1)} />
      ) : q.isPending ? (
        <Loading />
      ) : (
        <>
          {!rows.length && <p>Sin solicitudes para esta consulta.</p>}
          {rows.map((r) => (
            <article key={r.id}>
              <SummaryPanel scope={scope} item={r} />
              <Link to={exitLink(scope, r.id)}>
                Ver salida · {r.requestedAt}
              </Link>
            </article>
          ))}
          {q.hasNextPage && (
            <button
              disabled={q.isFetching}
              onClick={() => void q.fetchNextPage()}
            >
              Cargar más salidas
            </button>
          )}
        </>
      )}
    </section>
  )
}
function NoticeRows({ scope, items }: { scope: Scope; items: Notice[] }) {
  const unique = [...new Map(items.map((n) => [n.id, n])).values()]
  return (
    <section aria-label="Avisos de salida">
      <h3>Avisos de salida</h3>
      <p>
        Los avisos no necesitan aceptación. Consulta el estado actual aunque el
        aviso sea anterior.
      </p>
      {!unique.length && <p>Sin avisos disponibles.</p>}
      {unique.map((n) => (
        <p key={n.id}>
          <Link to={exitLink(scope, n.exitId)}>
            {n.type === 'REQUESTED'
              ? 'Solicitud registrada'
              : 'Salida completada'}{' '}
            · {n.createdAt}
          </Link>
        </p>
      ))}
    </section>
  )
}
function Notices({ scope }: { scope: Scope }) {
  const [generation, reset] = useState(0)
  const q = useInfiniteQuery({
    queryKey: [...queryKey(scope), 'notices', generation],
    queryFn: ({ pageParam, signal }) =>
      exits.notices(scope, { limit: 25, pageToken: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  })
  return (
    <section className="panel panel-body">
      {q.isError ? (
        <QueryError error={q.error} reset={() => reset((n) => n + 1)} />
      ) : q.isPending ? (
        <Loading />
      ) : (
        <NoticeRows
          scope={scope}
          items={q.data.pages.flatMap((p) => p.items)}
        />
      )}
      <button disabled={q.isFetching} onClick={() => reset((n) => n + 1)}>
        Actualizar avisos
      </button>
      {!q.isError && q.hasNextPage && (
        <button disabled={q.isFetching} onClick={() => void q.fetchNextPage()}>
          Cargar más avisos
        </button>
      )}
    </section>
  )
}
export function PrivateExitRecovery() {
  const { user, restricted } = useAuth(),
    actor = user?.id ?? restricted?.identity.id
  return actor ? (
    <PrivateRecovery key={actor} actor={actor} />
  ) : (
    <p role="alert">Reautentica la misma cuenta para recuperar.</p>
  )
}
function PrivateRecovery({ actor }: { actor: string }) {
  const [scopes, setScopes] = useState<Scope[]>([]),
    [error, setError] = useState(''),
    [selected, setSelected] = useState('')
  useEffect(() => {
    let live = true
    intentStore
      .scopes(actor)
      .then((s) => {
        if (live) setScopes(s)
      })
      .catch((e) => {
        if (live) setError(exitError(e))
      })
    return () => {
      live = false
    }
  }, [actor])
  return (
    <>
      <PageTitle title="Recuperación privada de salida" />
      <p>
        Reautenticación con la cuenta original. Sólo se consultan intenciones
        guardadas en este dispositivo y entorno.
      </p>
      {error && <p role="alert">{error}</p>}
      {!scopes.length && !error && (
        <p>No hay intenciones locales de salida para esta cuenta.</p>
      )}
      {scopes.length > 1 && (
        <Field label="Ámbito guardado para recuperación">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Seleccionar</option>
            {scopes.map((s, n) => (
              <option key={JSON.stringify(s)} value={String(n)}>
                {s.surface === 'admin'
                  ? 'Administración'
                  : `Proveedor ${s.providerId?.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </Field>
      )}
      {scopes
        .filter((_, n) => scopes.length === 1 || selected === String(n))
        .map((s) => (
          <ExitCommands key={JSON.stringify(s)} scope={s} restricted />
        ))}
    </>
  )
}
