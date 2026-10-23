import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { Confirm, ErrorState, Loading } from '../components/ui'
import { ApiError } from '../services/errors'
import { fleet } from './service'
import { FleetGate } from './gate'
import { allows } from './permissions'
import type { SpendingCommand } from './types'

export function FleetSpending({
  providerId,
  driverId,
}: {
  providerId: string
  driverId: string
}) {
  const { user } = useAuth()
  return (
    <FleetGate providerId={providerId}>
      {(context) =>
        allows(context, 'canManageResources') ? (
          <SpendingEditor
            key={`${user?.id}:${providerId}:${driverId}`}
            providerId={providerId}
            driverId={driverId}
          />
        ) : (
          <p>Sin permiso para administrar gasto.</p>
        )
      }
    </FleetGate>
  )
}
export function SpendingEditor({
  providerId,
  driverId,
}: {
  providerId: string
  driverId: string
}) {
  const { user } = useAuth()
  const client = useQueryClient()
  const storageKey = `mandaria.fleet-spending:${user?.id}:${providerId}:${driverId}`
  const [pending, setPending] = useState<
    SpendingCommand | null | 'unavailable'
  >(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return null
      const value = JSON.parse(raw) as SpendingCommand
      return value &&
        typeof value.requestId === 'string' &&
        /^[0-9a-f-]{36}$/i.test(value.requestId) &&
        typeof value.expectedRevision === 'string' &&
        /^\d+$/.test(value.expectedRevision) &&
        typeof value.enabled === 'boolean'
        ? value
        : 'unavailable'
    } catch {
      return 'unavailable'
    }
  })
  const [intent, setIntent] = useState<SpendingCommand | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState('')
  const queryKey = ['fleet', user?.id, providerId, 'spending', driverId]
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fleet.spending(providerId, driverId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
  const send = async () => {
    if (
      !query.data ||
      query.isError ||
      query.isFetching ||
      !intent ||
      pending === 'unavailable'
    )
      return
    // Intent/revision were captured when opening the confirmation, not recomputed after a refetch.
    const body = intent
    // Persist BEFORE sending. Storage failure prevents an unrecoverable mutation.
    sessionStorage.setItem(storageKey, JSON.stringify(body))
    setPending(body)
    try {
      await fleet.setSpending(providerId, driverId, body)
      sessionStorage.removeItem(storageKey)
      setPending(null)
      setNotice(
        'Comando confirmado. Consulta actualizada; la auditoría se conserva en backend.',
      )
      await query.refetch()
    } catch (error) {
      setConfirm(false)
      if (error instanceof ApiError && error.code === 'REVISION_CONFLICT') {
        sessionStorage.removeItem(storageKey)
        setPending(null)
        setNotice(
          'La revisión cambió. Revisa el estado actual antes de confirmar una nueva intención.',
        )
        await query.refetch()
      } else {
        setNotice(
          'Resultado no confirmado. Se conserva el comando original; recuperar repite exactamente su clave y cuerpo, sin crear otra autorización.',
        )
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          client.removeQueries({ queryKey: ['fleet', user?.id, providerId] })
          await query.refetch()
        }
      }
      throw error
    }
  }
  if (pending === 'unavailable')
    return (
      <p role="alert">
        No se puede leer el intento de gasto pendiente. No se enviará otra
        autorización. Recupera el almacenamiento de esta sesión o consulta
        soporte.
      </p>
    )
  return (
    <section className="panel panel-body">
      <h2>Gasto con créditos de la flotilla</h2>
      <p>
        El conductor autorizado puede tomar servicios con créditos de esta
        flotilla. No existe aprobación por envío ni cupo individual. Revocar
        bloquea nuevas tomas; no cancela servicios ACTIVE.
      </p>
      {notice && <p role="status">{notice}</p>}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <p>
            Estado actual: {query.data.enabled ? 'Habilitado' : 'Revocado'} ·
            Revisión {query.data.revision}
          </p>
          {pending && (
            <p>
              Intento pendiente: {pending.enabled ? 'habilitar' : 'revocar'}. No
              se puede enviar una intención diferente hasta recuperar su
              resultado.
            </p>
          )}
          <button
            className="button"
            disabled={query.isFetching}
            onClick={() => {
              setIntent(
                pending ?? {
                  requestId: crypto.randomUUID(),
                  expectedRevision: query.data.revision,
                  enabled: !query.data.enabled,
                },
              )
              setConfirm(true)
            }}
          >
            {pending
              ? 'Recuperar comando pendiente'
              : query.data.enabled
                ? 'Revocar gasto'
                : 'Habilitar gasto'}
          </button>
          <button
            className="button secondary"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Actualizar autorización
          </button>
          {confirm && (
            <Confirm
              title={
                pending
                  ? 'Recuperar autorización pendiente'
                  : intent?.enabled === false
                    ? 'Confirmar revocación de gasto'
                    : 'Confirmar habilitación de gasto'
              }
              description={
                pending
                  ? 'Se reenviará exclusivamente el mismo comando confirmado originalmente, con su clave y revisión originales.'
                  : intent?.enabled === false
                    ? 'Revocar impedirá nuevas tomas con créditos de esta flotilla. Los servicios activos continúan.'
                    : 'Autorizas a este conductor a tomar servicios utilizando créditos de esta flotilla, sin aprobación individual por envío.'
              }
              onClose={() => setConfirm(false)}
              onConfirm={send}
            />
          )}
        </>
      )}
    </section>
  )
}
