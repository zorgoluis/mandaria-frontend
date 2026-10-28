import { useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import { ActionForm, Field } from '../components/ui'
import { clearPending, type Pending } from './pending'
import {
  readAttempt,
  refreshApplied,
  refreshAttemptViews,
} from './reconciliation'
import type { HumanAttemptResult } from './reconciliation-contract'
export function AttemptRecovery({
  pending,
  onRecovered,
}: {
  pending: Pending
  onRecovered: (ref?: string) => void
}) {
  const { user } = useAuth()
  const activeActor = useRef(user?.id)
  useLayoutEffect(() => {
    activeActor.current = user?.id
    return () => {
      activeActor.current = undefined
    }
  }, [user?.id])
  const busy = useRef(false)
  const [result, setResult] = useState<HumanAttemptResult | null>(null)
  const [message, setMessage] = useState('')
  const own =
    user?.id === pending.actor &&
    (pending.kind !== 'policy' || user.role === 'SUPER_ADMIN')
  async function inspect(close = false) {
    if (busy.current || !own) return
    busy.current = true
    try {
      setResult(null)
      const response = await readAttempt(pending, pending.actor, close)
      if (activeActor.current !== pending.actor) return
      if (response.state === 'APPLIED') {
        const target = await refreshApplied(pending, response)
        if (activeActor.current !== pending.actor) return
        clearPending(pending.key)
        onRecovered(target)
      } else setResult(response)
    } catch {
      setMessage(
        close
          ? 'No se confirmó el cierre. El intento puede haber cambiado: conserva el bloqueo y consulta el resultado antes de continuar.'
          : 'No se pudo reconciliar. Se conserva el bloqueo.',
      )
    } finally {
      busy.current = false
    }
  }
  return (
    <section className="panel customer-panel">
      <h2>Pendiente de reconciliación</h2>
      <p>
        Una respuesta perdida no significa fracaso. No borres el marcador ni
        repitas con otra clave.
      </p>
      <p role="status">{message}</p>
      {!own ? (
        <p>
          Inicia sesión con la cuenta que inició esta operación. Cambiar de
          usuario no la elimina.
        </p>
      ) : (
        <>
          <ActionForm
            initialDirty
            submitLabel="Consultar resultado"
            onSubmit={() => inspect()}
          >
            <p>Consulta el recibo original y después el estado actual.</p>
          </ActionForm>
          {result?.state === 'PENDING_OR_UNKNOWN' && (
            <>
              <p>
                El resultado sigue pendiente o desconocido. Consultar no cierra
                el intento.
              </p>
              <ActionForm
                submitLabel="Cerrar intento técnico"
                onSubmit={() => inspect(true)}
              >
                <p>
                  El cierre impide publicar el recurso o confirmar la política
                  de este intento. No cancela servicios ni revierte entregas
                  físicas.
                </p>
                <p>
                  En precotizaciones, no deshace routing ni presupuesto ya
                  autorizados; esos efectos pueden conservarse.
                </p>
                <Field label="Confirmo el cierre técnico de este intento">
                  <input type="checkbox" required />
                </Field>
              </ActionForm>
            </>
          )}
          {result?.state === 'CLOSED_NO_EFFECTS' && (
            <>
              <p>
                Intento cerrado para publicación de recursos o política. No
                significa que no ocurrió absolutamente nada: routing y
                presupuesto autorizados pueden conservarse.
              </p>
              {result.canPrepareNewAttempt && (
                <ActionForm
                  submitLabel="Preparar otra intención"
                  onSubmit={async () => {
                    const confirmed = await readAttempt(pending, pending.actor)
                    if (activeActor.current !== pending.actor) return
                    if (
                      confirmed.state !== 'CLOSED_NO_EFFECTS' ||
                      !confirmed.canPrepareNewAttempt
                    )
                      throw new Error('El estado cambió. Consulta nuevamente.')
                    await refreshAttemptViews(pending)
                    if (activeActor.current !== pending.actor) return
                    clearPending(pending.key)
                    onRecovered()
                  }}
                >
                  <Field label="Deseo preparar otra intención sin enviarla automáticamente">
                    <input type="checkbox" required />
                  </Field>
                </ActionForm>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
