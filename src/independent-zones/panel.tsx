import { independentDrivers } from '../independent-drivers/service'
import { categoryBlock } from '../driver-category/contract'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { Confirm, Field, Loading } from '../components/ui'
import { ApiError } from '../services/errors'
import { serviceZones } from '../pricing/service'
import {
  offerZones,
  validateCommand,
  zonesError,
  type Zones,
  type ZonesCommand,
  type ZonesReceipt,
} from './service'
import {
  locked,
  makeIntent,
  replay,
  zoneStore,
  type Intent,
  type Scope,
} from './intent'
export function IndependentOfferZones({
  profileId,
  driverId,
  canEdit = false,
}: {
  profileId: string
  driverId?: string
  canEdit?: boolean
}) {
  const { user } = useAuth()
  return user?.role === 'SUPER_ADMIN' ? (
    <Editor
      key={`${user.id}:${profileId}`}
      actor={user.id}
      driverId={driverId}
      canEdit={canEdit}
      profileId={profileId}
    />
  ) : null
}
function Editor({
  actor,
  profileId,
  driverId,
  canEdit,
}: Scope & { driverId?: string; canEdit: boolean }) {
  const scope = useMemo(() => ({ actor, profileId }), [actor, profileId]),
    client = useQueryClient(),
    live = useRef(true),
    busyRef = useRef(false)
  const [pending, setPending] = useState<Intent | null>(null),
    [loading, setLoading] = useState(true),
    [broken, setBroken] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [receipt, setReceipt] = useState<ZonesReceipt | null>(null),
    [conflict, setConflict] = useState(false),
    [draft, setDraft] = useState<Zones | null>(null),
    [confirm, setConfirm] = useState<ZonesCommand | null>(null),
    [retry, setRetry] = useState(false)
  const q = useQuery({
    queryKey: ['independent-offer-zones', actor, profileId],
    queryFn: ({ signal }) => offerZones.get(profileId, signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  useEffect(() => {
    let mounted = true
    live.current = true
    const read = () =>
      zoneStore
        .read(scope)
        .then((i) => {
          if (mounted) {
            setPending(i)
            setLoading(false)
          }
        })
        .catch((e) => {
          if (mounted) {
            setBroken(true)
            setLoading(false)
            setMessage(zonesError(e))
          }
        })
    void read()
    const c =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('offer-zone-intent')
        : null
    if (c)
      c.onmessage = () => {
        setDraft(null)
        setConfirm(null)
        setReceipt(null)
        setConflict(false)
        void read()
        void client.invalidateQueries({
          queryKey: ['independent-offer-zones', actor, profileId],
        })
      }
    window.addEventListener('offer-zone-intent', read)
    return () => {
      mounted = false
      live.current = false
      c?.close()
      window.removeEventListener('offer-zone-intent', read)
    }
  }, [scope, actor, profileId, client])
  const refresh = async () => {
    const fresh = await q.refetch()
    await client.invalidateQueries({ queryKey: ['fleet-exit'] })
    return fresh
  }
  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await locked(scope, fn)
    } catch (e) {
      if (live.current) setMessage(zonesError(e))
    } finally {
      busyRef.current = false
      if (live.current) setBusy(false)
    }
  }
  const send = async (i: Intent) => {
    try {
      const r = await replay(i, scope)
      if (!live.current) return
      setReceipt(r)
      setConflict(false)
      setMessage(
        'PUT confirmado. El recibo puede ser histórico; se consulta la proyección vigente.',
      )
      await refresh()
    } catch (e) {
      if (!live.current) return
      setMessage(zonesError(e))
      const fresh = await refresh()
      if (!live.current) return
      setConflict(
        e instanceof ApiError &&
          e.code === 'REVISION_CONFLICT' &&
          fresh.isSuccess &&
          fresh.data.revision !== i.body.expectedRevision,
      )
    }
  }
  const denied =
    q.error instanceof ApiError && [401, 403, 404].includes(q.error.status)
  const blocked =
    loading || broken || busy || !!pending || q.isFetching || !q.isSuccess
  return (
    <section
      className="panel panel-body"
      aria-label="Zonas propias autorizadas"
    >
      <h2>Zonas propias autorizadas</h2>
      <p>
        Autoriza zonas del catálogo al perfil independiente. No aprueba la
        habilitación, levanta restricciones, hereda cobertura de flotilla,
        selecciona zona ni inicia turno.
      </p>
      {message && <p role="alert">{message}</p>}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <p role="alert">
          {zonesError(q.error)} No se muestran autorizaciones anteriores.
        </p>
      ) : (
        <>
          <p>
            Revisión vigente: {q.data.revision} · {q.data.zoneIds.length} zonas
            autorizadas.
          </p>
          <p>
            Esta lectura no identifica quién aplicó un cambio ni resuelve por sí
            sola una intención incierta.
          </p>
        </>
      )}
      <button
        className="button secondary"
        disabled={busy || q.isFetching}
        onClick={() => void refresh()}
      >
        Consultar zonas vigentes
      </button>
      {pending && (
        <div className="notice">
          <p>
            Hay una intención de zonas guardada para esta cuenta y perfil. Se
            conserva el cuerpo y requestId originales.
          </p>
          {!denied && (
            <>
              {receipt && (
                <p>
                  Recibo confirmado · revisión {receipt.revision}. No sustituye
                  el estado vigente.
                </p>
              )}
              <button
                className="button secondary"
                disabled={busy || loading || !q.isSuccess || q.isFetching}
                onClick={() => setRetry(true)}
              >
                Reenviar misma intención de zonas
              </button>
              {(receipt || conflict) && q.isSuccess && !q.isFetching && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const fresh = await refresh()
                      if (!live.current || !fresh.isSuccess) return
                      if (
                        !receipt &&
                        fresh.data.revision === pending.body.expectedRevision
                      )
                        throw Error(
                          'No se confirmó el conflicto. Conserva la intención.',
                        )
                      await zoneStore.clear(scope, pending.body.requestId)
                      if (live.current) {
                        setPending(null)
                        setReceipt(null)
                        setConflict(false)
                        setDraft(null)
                        setMessage(
                          'Revisa expresamente el estado vigente antes de preparar un nuevo cambio.',
                        )
                      }
                    })
                  }
                >
                  {conflict
                    ? 'Reconocer conflicto y revisar estado'
                    : 'Reconocer recibo y continuar'}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {!canEdit && (
        <p>
          Las zonas del perfil histórico no conceden autorización vigente. No se
          permiten nuevas autorizaciones mientras la categoría sea incompatible;
          la recuperación de intenciones previas se conserva.
        </p>
      )}
      {!pending && (
        <button
          className="button"
          disabled={blocked || !canEdit}
          onClick={() => {
            if (q.isSuccess) {
              setDraft(structuredClone(q.data))
              setMessage('')
            }
          }}
        >
          Editar autorizaciones de zonas
        </button>
      )}
      {draft && !blocked && !denied && canEdit && (
        <ZoneForm
          key={draft.revision}
          actor={actor}
          snapshot={draft}
          onReview={(b) => setConfirm(b)}
          onCancel={() => setDraft(null)}
        />
      )}
      {confirm && !blocked && canEdit && (
        <Confirm
          title={
            confirm.zoneIds.length
              ? 'Confirmar zonas autorizadas'
              : 'Retirar todas las autorizaciones'
          }
          description={
            confirm.zoneIds.length
              ? `Se autorizarán ${confirm.zoneIds.length} zonas. El conductor deberá elegir zona e iniciar recepción explícitamente.`
              : 'La lista quedará vacía. Se retirarán todas las zonas propias autorizadas; no se elimina el perfil ni se liquida ninguna obligación.'
          }
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            run(async () => {
              if (driverId) {
                const profile = await independentDrivers.get(driverId)
                if (
                  profile.id !== profileId ||
                  profile.driverCategory?.category !== 'INDEPENDENT' ||
                  profile.driverCategory.independentMembershipState !==
                    'CURRENT'
                )
                  throw Error(
                    categoryBlock(profile.driverCategory) ??
                      'Categoría incompatible con nuevas autorizaciones.',
                  )
              }
              const i = makeIntent(scope, confirm)
              await zoneStore.save(i)
              if (!live.current) return
              setPending(i)
              setDraft(null)
              setConfirm(null)
              setReceipt(null)
              await send(i)
            })
          }
        />
      )}
      {retry && pending && !denied && (
        <Confirm
          title="Reenviar la misma intención"
          description="Se enviará el PUT con idénticos cuerpo y requestId. Un replay devuelve el recibo original; después se leerá el estado actual. No existe cierre técnico de zonas."
          onClose={() => setRetry(false)}
          onConfirm={() =>
            run(async () => {
              setRetry(false)
              await send(pending)
            })
          }
        />
      )}
    </section>
  )
}
function ZoneForm({
  actor,
  snapshot,
  onReview,
  onCancel,
}: {
  actor: string
  snapshot: Zones
  onReview: (b: ZonesCommand) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState(snapshot.zoneIds),
    [reason, setReason] = useState(''),
    [error, setError] = useState('')
  const q = useInfiniteQuery({
    queryKey: ['offer-zone-catalog', actor],
    queryFn: ({ pageParam, signal }) =>
      serviceZones.list(
        { page: pageParam, pageSize: 25, status: 'ACTIVE' },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (p) => (p.page < p.totalPages ? p.page + 1 : undefined),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
  const rows = [
    ...new Map(
      q.data?.pages
        .flatMap((p) => p.items)
        .filter((z) => z.status === 'ACTIVE')
        .map((z) => [z.id, z]),
    ).values(),
  ]
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    )
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        try {
          const body = {
            requestId: crypto.randomUUID(),
            expectedRevision: snapshot.revision,
            zoneIds: selected,
            reason: reason.trim(),
          }
          validateCommand(body)
          onReview(body)
        } catch (e) {
          setError(zonesError(e))
        }
      }}
    >
      <p>
        Revisión que se enviará: {snapshot.revision}. Las zonas seleccionadas se
        conservan al cargar más páginas.
      </p>
      {q.isError ? (
        <p role="alert">{zonesError(q.error)}</p>
      ) : q.isPending ? (
        <Loading />
      ) : (
        <>
          {rows.map((z) => (
            <label className="field" key={z.id}>
              <span>
                <input
                  type="checkbox"
                  checked={selected.includes(z.id)}
                  onChange={() => toggle(z.id)}
                />{' '}
                {z.name} · {z.code}
              </span>
            </label>
          ))}
          {selected
            .filter((id) => !rows.some((z) => z.id === id))
            .map((id) => (
              <p key={id}>
                Autorización actual fuera de esta página del catálogo: {id}{' '}
                <button type="button" onClick={() => toggle(id)}>
                  Retirar esta autorización
                </button>
              </p>
            ))}
          {q.hasNextPage && (
            <button
              type="button"
              disabled={q.isFetching}
              onClick={() => void q.fetchNextPage()}
            >
              Cargar más zonas activas
            </button>
          )}
        </>
      )}
      <p>{selected.length} seleccionadas (máximo 100).</p>
      <button type="button" onClick={() => setSelected([])}>
        Retirar todas las autorizaciones
      </button>
      <Field label="Motivo de autorización de zonas">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={3}
          maxLength={500}
          required
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      <button className="button" disabled={!q.isSuccess || q.isFetching}>
        Revisar cambio de zonas
      </button>
      <button type="button" className="button secondary" onClick={onCancel}>
        Cancelar edición
      </button>
    </form>
  )
}
