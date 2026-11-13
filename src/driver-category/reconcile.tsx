import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import { ActionForm, Field, Confirm } from '../components/ui'
import { independentDrivers } from '../independent-drivers/service'
import { refreshIndependent } from '../independent-drivers/queries'
import { ApiError } from '../services/errors'
import {
  categoryStore,
  locked,
  makeIntent,
  replay,
  type Intent,
} from './intent'
import type { DriverCategory } from './contract'
export function ReconcileCategory({
  driverId,
  value,
}: {
  driverId: string
  value?: DriverCategory
}) {
  const { user } = useAuth()
  return user?.role === 'SUPER_ADMIN' ? (
    <Editor
      key={user.id + driverId}
      actor={user.id}
      driverId={driverId}
      value={value}
    />
  ) : null
}
function Editor({
  actor,
  driverId,
  value,
}: {
  actor: string
  driverId: string
  value?: DriverCategory
}) {
  const scope = { actor, driverId }
  const live = useRef(true)
  const [pending, setPending] = useState<Intent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [review, setReview] = useState<Intent | null>(null)
  const [terminal, setTerminal] = useState(false)
  useEffect(() => {
    let active = true
    live.current = true
    void categoryStore
      .read({ actor, driverId })
      .then((i) => {
        if (active) {
          setPending(i)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active)
          setError('No se pudo recuperar la intención; no se permiten cambios.')
      })
    return () => {
      active = false
      live.current = false
    }
  }, [actor, driverId])
  async function send(i: Intent) {
    try {
      await replay(i, scope)
      if (live.current) {
        setTerminal(true)
        setError(
          'Recibo confirmado. Consulta la categoría vigente antes de continuar.',
        )
      }
    } catch (e) {
      if (
        live.current &&
        e instanceof ApiError &&
        e.code === 'REVISION_CONFLICT'
      )
        setTerminal(true)
      throw e
    } finally {
      await refreshIndependent(driverId)
    }
  }
  if (!pending && !(value?.category === 'REVIEW_REQUIRED' && value.providerId))
    return null
  return (
    <section
      className="panel panel-body"
      aria-label="Conciliación de categoría"
    >
      <h2>Conciliar legado a flotilla</h2>
      <p>
        Sólo para perfiles duales en revisión. Conserva el perfil como
        histórico, dinero y servicios; no da de baja un independiente vigente ni
        inicia recepción.
      </p>
      {error && <p role="status">{error}</p>}
      {pending ? (
        <>
          <p>
            Hay una intención conservada. Una lectura coincidente no prueba que
            la aplicó esta cuenta.
          </p>
          <ActionForm
            children={null}
            initialDirty
            submitLabel="Recuperar con el mismo cuerpo y clave"
            onSubmit={async () => {
              await locked(scope, async () => {
                const i = await categoryStore.read(scope)
                if (!i) throw Error('Intención no disponible.')
                await send(i)
              })
            }}
          />
          {terminal && (
            <ActionForm
              children={null}
              initialDirty
              submitLabel="Reconocer resultado y revisar"
              onSubmit={async () => {
                await locked(scope, async () => {
                  await independentDrivers.get(driverId)
                  await categoryStore.clear(scope, pending.body.requestId)
                  if (live.current) {
                    setPending(null)
                    setTerminal(false)
                  }
                })
                await refreshIndependent(driverId)
              }}
            />
          )}
        </>
      ) : (
        <ActionForm
          submitDisabled={loading}
          submitLabel="Revisar conciliación"
          onSubmit={async (data) => {
            const fresh = await independentDrivers.get(driverId)
            if (
              fresh.driverCategory?.category !== 'REVIEW_REQUIRED' ||
              !fresh.driverCategory.providerId ||
              fresh.driverCategory.categoryRevision !== value?.categoryRevision
            ) {
              await refreshIndependent(driverId)
              throw Error('La categoría cambió. Revisa el estado actualizado.')
            }
            const i = makeIntent(scope, {
              requestId: crypto.randomUUID(),
              expectedRevision: fresh.driverCategory.categoryRevision,
              reason: String(data.get('reason') ?? '').trim(),
            })
            if (live.current) setReview(i)
          }}
        >
          <Field label="Motivo de conciliación">
            <textarea name="reason" required minLength={3} maxLength={500} />
          </Field>
        </ActionForm>
      )}
      {review && (
        <Confirm
          title="Confirmar categoría flotilla"
          description={
            review.body.reason + '. El perfil independiente quedará histórico.'
          }
          onClose={() => setReview(null)}
          onConfirm={async () => {
            await locked(scope, async () => {
              const fresh = await independentDrivers.get(driverId)
              if (
                fresh.driverCategory?.categoryRevision !==
                  review.body.expectedRevision ||
                fresh.driverCategory.category !== 'REVIEW_REQUIRED'
              ) {
                await refreshIndependent(driverId)
                throw Error('La revisión cambió; vuelve a revisar.')
              }
              await categoryStore.save(review)
              if (!live.current) return
              setPending(review)
              setReview(null)
              await send(review)
            })
          }}
        />
      )}
    </section>
  )
}
