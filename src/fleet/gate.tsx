import { useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { ErrorState, Loading } from '../components/ui'
import { ApiError } from '../services/errors'
import { fleet } from './service'
import { FleetContext } from './permissions'
import type { OperationContext } from './types'

/** No cached authority after failure; remount callers by actor/provider/revision. */
export function FleetGate({
  providerId,
  children,
}: {
  providerId: string
  children: (context: OperationContext) => ReactNode
}) {
  const { user } = useAuth()
  const client = useQueryClient()
  const key = ['fleet', user?.id, providerId]
  const query = useQuery({
    queryKey: [...key, 'context'],
    queryFn: ({ signal }) => fleet.context(providerId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (q) => (q.state.error ? false : 30000),
  })
  useEffect(() => {
    if (
      query.error instanceof ApiError &&
      [401, 403].includes(query.error.status)
    ) {
      client.removeQueries({
        queryKey: ['fleet', user?.id, providerId],
        predicate: (q) => q.queryKey[3] !== 'context',
      })
      client.removeQueries({ queryKey: ['dispatches', 'provider', providerId] })
      client.removeQueries({ queryKey: ['delivery-assignments', providerId] })
    }
  }, [query.error, client, user?.id, providerId])
  if (query.isPending) return <Loading />
  if (query.isError)
    return <ErrorState error={query.error} retry={() => void query.refetch()} />
  if (
    !['ADMIN_DISPATCH', 'DRAINING', 'DRIVER_TAKE', 'PAUSED'].includes(
      query.data.operationMode,
    )
  )
    return <p role="alert">Modo de operación desconocido. Consulta soporte.</p>
  return (
    <FleetContext.Provider value={query.data}>
      <div className="notice" role="status">
        Modo: {query.data.operationMode} · Revisión {query.data.revision} ·
        Última actualización: {new Date(query.dataUpdatedAt).toLocaleString()}
        <button className="text-button" onClick={() => void query.refetch()}>
          Actualizar modo
        </button>
      </div>
      <fieldset
        className="execution-fieldset"
        disabled={query.isFetching}
        key={`${user?.id}:${providerId}:${query.data.revision}`}
      >
        {children(query.data)}
      </fieldset>
    </FleetContext.Provider>
  )
}
