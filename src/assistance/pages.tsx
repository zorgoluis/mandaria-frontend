import { useAssistanceAccess } from './command-context'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { ErrorState, Field, Loading, PageTitle } from '../components/ui'
import { ProviderScope } from '../logistics/components'
import { fleet } from '../fleet/service'
import { assistance, type Filters } from './service'
import { AssistanceCommands } from './commands'
import { CommandForm } from './forms'
import { labels } from './form-model'
import { AdminCase } from './workbench'
import { assistanceError } from './messages'
import type {
  CaseDetail,
  Collection,
  CursorPage,
  RecordRow,
  Scope,
  Surface,
} from './types'
const key = (s: Scope) => ['assistance', s.actor, s.surface, s.providerId]
export function AssistancePage({ surface }: { surface: Surface }) {
  const { user } = useAuth()
  if (user?.role !== (surface === 'admin' ? 'SUPER_ADMIN' : 'PROVIDER_ADMIN'))
    return <p role="alert">Sin acceso a esta área de asistencia.</p>
  return (
    <>
      <PageTitle
        title="Asistencia y conciliación"
        description="Expediente del segmento histórico. Servicio, asistencia y economía se consultan por separado."
      />
      {surface === 'provider' ? (
        <ProviderScope>
          {(p) => (
            <Scoped
              key={`${user.id}:${p.providerId}`}
              actor={user.id}
              surface={surface}
              providerId={p.providerId}
            />
          )}
        </ProviderScope>
      ) : (
        <Scoped key={user.id} actor={user.id} surface={surface} />
      )}
    </>
  )
}
function Scoped({
  actor,
  surface,
  providerId,
}: {
  actor: string
  surface: Surface
  providerId?: string
}) {
  const scope = useMemo(
      () => ({ actor, surface, providerId }),
      [actor, surface, providerId],
    ),
    { id } = useParams(),
    [params] = useSearchParams()
  const creating = params.get('new') === '1'
  return (
    <AssistanceCommands scope={scope}>
      {id ? (
        <Detail scope={scope} id={id} />
      ) : creating ? (
        <Create scope={scope} />
      ) : (
        <List scope={scope} />
      )}
    </AssistanceCommands>
  )
}
const caseLink = (s: Scope, id = '') =>
  `${s.surface === 'admin' ? '/admin' : ''}/fleet-assistance${id ? '/' + encodeURIComponent(id) : ''}${s.providerId ? '?providerId=' + encodeURIComponent(s.providerId) : ''}`
function List({ scope }: { scope: Scope }) {
  const [byProvider, setByProvider] = useState(false)
  return (
    <>
      {scope.surface === 'admin' && (
        <label>
          <input
            type="checkbox"
            checked={byProvider}
            onChange={(e) => setByProvider(e.target.checked)}
          />
          Filtrar por proveedor
        </label>
      )}
      {scope.surface === 'admin' && byProvider ? (
        <ProviderScope>
          {(p) => (
            <CaseList
              key={p.providerId}
              scope={{ ...scope, providerId: p.providerId }}
            />
          )}
        </ProviderScope>
      ) : (
        <CaseList scope={scope} />
      )}
    </>
  )
}
function CaseList({ scope }: { scope: Scope }) {
  const [filters, setFilters] = useState<Filters>({}),
    [generation, setGeneration] = useState(0)
  const query = useInfiniteQuery({
    queryKey: [...key(scope), 'list', filters, generation],
    queryFn: ({ pageParam, signal }) =>
      assistance.list(scope, { ...filters, pageToken: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
  return (
    <>
      <p>
        Comandos deshabilitados por defecto. La disponibilidad se confirma en el
        servidor; las capacidades no activan la función.
      </p>
      <form
        className="panel panel-body"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          setFilters({
            status: (f.get('status') || undefined) as Filters['status'],
            dispatchId: String(f.get('dispatchId') || '') || undefined,
            limit: Number(f.get('limit') || 25),
          })
          setGeneration((n) => n + 1)
        }}
      >
        <Field label="Estado del caso">
          <select name="status">
            <option value="">Todos</option>
            <option>OPEN</option>
            <option>CLOSED</option>
          </select>
        </Field>
        <Field label="Envío de un expediente visible">
          <select
            name="dispatchId"
            key={filters.dispatchId ?? 'all'}
            defaultValue={filters.dispatchId ?? ''}
          >
            <option value="">Todos los envíos</option>
            {filters.dispatchId && (
              <option value={filters.dispatchId}>Envío seleccionado</option>
            )}
            {query.data?.pages
              .flatMap((p) => p.items)
              .filter(
                (c, i, all) =>
                  c.dispatchId !== filters.dispatchId &&
                  all.findIndex((a) => a.dispatchId === c.dispatchId) === i,
              )
              .map((c) => (
                <option key={c.dispatchId} value={c.dispatchId}>
                  Envío del caso {c.id.slice(0, 8)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Casos por página">
          <select name="limit" defaultValue="25">
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>
        </Field>
        <button className="button">Aplicar filtros</button>
      </form>
      <button
        className="button secondary"
        onClick={() => setGeneration((n) => n + 1)}
      >
        Refrescar casos
      </button>
      {scope.surface === 'provider' && (
        <p>
          Solicita asistencia desde la participación correspondiente en{' '}
          <Link to={'/fleet-services?providerId=' + scope.providerId}>
            Envíos de mi flotilla
          </Link>
          .
        </p>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <SafeError
          error={query.error}
          retry={() => setGeneration((n) => n + 1)}
        />
      ) : (
        <>
          {query.data.pages
            .flatMap((p) => p.items)
            .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
            .map((c) => (
              <article key={c.id} className="panel panel-body">
                <h2>
                  <Link to={caseLink(scope, c.id)}>
                    Caso {c.id.slice(0, 8)}
                  </Link>
                </h2>
                <p>
                  Caso: {c.status} · Asistencia: {c.operationalState} ·
                  Economía: {c.economicState}
                </p>
                <p>Actualizado: {c.updatedAt}</p>
              </article>
            ))}
          {!query.data.pages[0].items.length && (
            <p>Sin casos para esta consulta.</p>
          )}
          {query.hasNextPage && (
            <button
              className="button"
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
            >
              Cargar más casos
            </button>
          )}
        </>
      )}
    </>
  )
}
function SafeError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <p role="alert">
        {assistanceError(error)} No se muestran datos anteriores.
      </p>
      <ErrorState error={error} retry={retry} />
    </>
  )
}
function Create({ scope }: { scope: Scope }) {
  const [p] = useSearchParams(),
    dispatch = p.get('dispatchId') ?? '',
    assignment = p.get('assignmentId') ?? ''
  const q = useInfiniteQuery({
    queryKey: [...key(scope), 'create-source', dispatch, assignment],
    enabled: scope.surface === 'provider' && !!dispatch && !!assignment,
    queryFn: ({ pageParam, signal }) =>
      fleet.services(scope.providerId!, {}, pageParam, dispatch, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    retry: false,
    gcTime: 0,
  })
  const segment = q.data?.pages
    .flatMap((p) => p.items)
    .find((s) => s.assignmentId === assignment)
  return (
    <>
      <Link to={caseLink(scope)}>Volver a casos</Link>
      {q.isError ? (
        <SafeError error={q.error} retry={() => void q.refetch()} />
      ) : segment ? (
        <>
          <p>
            Participación histórica: {segment.reference} ·{' '}
            {segment.driver.name ?? 'Nombre no disponible'} · {segment.status}
          </p>
          <CommandForm
            operation="CREATE"
            admin={false}
            assignmentId={segment.assignmentId}
          />
        </>
      ) : q.isFetching ? (
        <Loading />
      ) : q.hasNextPage ? (
        <button onClick={() => void q.fetchNextPage()}>
          Buscar participación en la página siguiente
        </button>
      ) : (
        <p role="alert">
          No se encontró una participación FLEET autorizada. Abre la solicitud
          desde su historial.
        </p>
      )}
    </>
  )
}
function Detail({ scope, id }: { scope: Scope; id: string }) {
  const client = useQueryClient(),
    q = useQuery({
      queryKey: [...key(scope), 'detail', id],
      queryFn: ({ signal }) => assistance.detail(scope, id, signal),
      retry: false,
      gcTime: 0,
      staleTime: 0,
    })
  useEffect(() => {
    if (q.isError)
      client.removeQueries({ queryKey: [...key(scope), 'collection', id] })
  }, [q.isError, client, scope, id])
  return (
    <>
      <Link to={caseLink(scope)}>Volver a casos</Link>
      <button className="button secondary" onClick={() => void q.refetch()}>
        Actualizar expediente
      </button>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <SafeError error={q.error} retry={() => void q.refetch()} />
      ) : (
        <fieldset className="execution-fieldset" disabled={q.isFetching}>
          <CaseContent
            key={`${id}:${q.data.summary.revision}`}
            scope={scope}
            detail={q.data}
          />
        </fieldset>
      )}
    </>
  )
}
function CaseContent({
  scope,
  detail: d,
}: {
  scope: Scope
  detail: CaseDetail
}) {
  return (
    <>
      <section className="panel panel-body">
        <h2>Caso {d.summary.id.slice(0, 8)}</h2>
        <dl>
          <dt>Estado del caso</dt>
          <dd>{d.summary.status}</dd>
          <dt>Estado operativo asistido</dt>
          <dd>{d.summary.operationalState}</dd>
          <dt>Estado económico</dt>
          <dd>{d.summary.economicState}</dd>
          <dt>Conductor histórico</dt>
          <dd>{d.participation.driverDisplayName ?? 'No disponible'}</dd>
          <dt>Proveedor histórico</dt>
          <dd>{d.participation.providerName ?? 'No disponible'}</dd>
          <dt>Inicio del segmento</dt>
          <dd>{d.participation.startedAt}</dd>
          <dt>Fin del segmento</dt>
          <dd>{d.participation.endedAt ?? 'Sin cierre informado'}</dd>
        </dl>
        <p>
          El expediente no expone el estado actual del servicio. Acceso
          recuperado no termina ACTIVE; transferencia no entrega el segmento
          receptor; entrega acreditada no demuestra pago.
        </p>
        <h3>Restricciones vigentes</h3>
        {d.summary.restrictions.map((r) => (
          <p key={r.id}>
            {r.publicReason} · {r.scope}
          </p>
        ))}
        {!d.summary.restrictions.length && (
          <p>
            Sin restricciones informadas en este caso. No implica ausencia de
            otros bloqueos.
          </p>
        )}
        <h3>Economía MXN — separada de créditos</h3>
        {d.economics.map((o) => (
          <article key={o.obligationId}>
            <h4>{o.concept}</h4>
            <p>
              Esperado: {o.expectedAmount ?? 'Desconocido'} · Acreditado:{' '}
              {o.creditedAmount} · Pendiente:{' '}
              {o.remainingAmount ?? 'Desconocido'} {o.currency}
            </p>
            <p>{o.state}</p>
          </article>
        ))}
        {!d.economics.length && (
          <p>
            Sin obligaciones visibles. No acredita ausencia de obligaciones.
          </p>
        )}
      </section>
      <CollectionView
        scope={scope}
        id={d.summary.id}
        name="history"
        initial={{
          items: d.history,
          nextPageToken: d.nextHistoryPageToken,
          asOf: d.summary.updatedAt,
        }}
      />
      {scope.surface === 'admin' ? (
        <AdminCase scope={scope} detail={d} />
      ) : (
        <>
          {d.summary.capabilities?.canContribute === true && (
            <CommandForm detail={d} operation="CONTRIBUTE" admin={false} />
          )}
          {d.summary.capabilities?.canDispute === true && (
            <CommandForm detail={d} operation="DISPUTE" admin={false} />
          )}
          {d.summary.capabilities?.canDeclareMovement === true && (
            <CommandForm
              detail={d}
              operation="DECLARE_MOVEMENT"
              admin={false}
            />
          )}
        </>
      )}
    </>
  )
}
export function CollectionView({
  scope,
  id,
  name,
  initial,
  onRows,
}: {
  scope: Scope
  id: string
  name: Collection
  initial: CursorPage<RecordRow>
  onRows?: (rows: RecordRow[]) => void
}) {
  const [generation, setGeneration] = useState(0)
  const q = useInfiniteQuery({
    queryKey: [...key(scope), 'collection', id, name, initial.asOf, generation],
    queryFn: ({ pageParam, signal }) =>
      assistance.collection(scope, id, name, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    initialData:
      generation === 0
        ? { pages: [initial], pageParams: [undefined] }
        : undefined,
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  useAssistanceAccess(q.error)
  const items = useMemo(
    () =>
      q.isError
        ? []
        : (q.data?.pages
            .flatMap((p) => p.items)
            .filter((r, i, a) => a.findIndex((v) => v.id === r.id) === i) ??
          []),
    [q.data, q.isError],
  )
  useEffect(() => {
    onRows?.(items)
  }, [items, onRows])
  return (
    <section className="panel panel-body">
      <h3>{name === 'history' ? 'Historial' : (labels[name] ?? name)}</h3>
      {q.isError ? (
        <SafeError error={q.error} retry={() => setGeneration((n) => n + 1)} />
      ) : (
        <>
          {items.map((r) => (
            <details key={r.id}>
              <summary>
                {String(
                  r.type ??
                    r.label ??
                    r.concept ??
                    r.kind ??
                    r.eventType ??
                    name,
                )}{' '}
                · {String(r.recordedAt ?? r.activatedAt ?? '')}
              </summary>
              <dl>
                {Object.entries(r)
                  .filter(
                    ([k]) =>
                      ![
                        'snapshotHash',
                        'beforeHash',
                        'afterHash',
                        'sha256',
                        'objectId',
                      ].includes(k),
                  )
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{labels[k] ?? k}</dt>
                      <dd style={{ overflowWrap: 'anywhere' }}>
                        {v === null
                          ? 'No disponible'
                          : typeof v === 'object'
                            ? JSON.stringify(v)
                            : String(v)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </details>
          ))}
          {!items.length && <p>Sin registros visibles.</p>}
          {q.hasNextPage && (
            <button
              className="button secondary"
              disabled={q.isFetching}
              onClick={() => void q.fetchNextPage()}
            >
              Cargar más {name}
            </button>
          )}
        </>
      )}
    </section>
  )
}
