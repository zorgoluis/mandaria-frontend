import { AttemptRecovery } from '../customer/AttemptRecovery'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { api } from '../services/api'
import { ActionForm, Field, ErrorState, Loading } from '../components/ui'
import type { ShippingPolicyResponse } from '../customer/contract'
import { command, usePending } from '../customer/pending'
export function ShippingPolicyPanel({ id }: { id: string }) {
  const { user } = useAuth()
  const path = `/admin/integrations/${encodeURIComponent(id)}/shipping-policy`
  const q = useQuery({
    queryKey: ['shipping-policy', id],
    queryFn: () => api<ShippingPolicyResponse>(path),
    enabled: user?.role === 'SUPER_ADMIN',
    retry: false,
  })
  const pending = usePending().find((p) => p.kind === 'policy' && p.ref === id)
  const [message, setMessage] = useState('')
  if (user?.role !== 'SUPER_ADMIN') return null
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState error={q.error} />
  return (
    <section className="panel shipping-policy">
      <h2>Pagador del envío</h2>
      <p>
        Destinatario es el valor predeterminado B2B. Cambiarlo no modifica
        solicitudes existentes y puede exigir renovar precotizaciones
        anteriores. Solicitante requiere un integrador compatible con contacto y
        consentimiento v2.
      </p>
      <p role="status">{message}</p>
      <button className="button secondary" onClick={() => void q.refetch()}>
        Actualizar política desde servidor
      </button>
      {pending ? (
        <AttemptRecovery
          pending={pending}
          onRecovered={() => {
            void q.refetch()
            setMessage(
              'Resultado reconciliado; se muestra la política vigente.',
            )
          }}
        />
      ) : (
        <ActionForm
          key={q.data.revision}
          submitLabel="Guardar política"
          onSubmit={async (d) => {
            const payer = String(d.get('payer'))
            await command(
              user.id,
              'policy',
              id,
              path,
              { payer, expectedRevision: q.data.revision },
              `${payer}:${q.data.revision + 1}`,
            )
            await q.refetch()
            setMessage('Política guardada.')
          }}
        >
          <Field label="Quién paga el envío">
            <select name="payer" defaultValue={q.data.payer}>
              <option value="RECIPIENT">Destinatario</option>
              <option value="REQUESTER">Solicitante</option>
            </select>
          </Field>
          <Field label="Confirmo compatibilidad del integrador y el efecto en nuevas solicitudes">
            <input type="checkbox" required />
          </Field>
        </ActionForm>
      )}
    </section>
  )
}
