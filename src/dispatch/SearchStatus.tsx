import { remaining } from './format'
import { useNow } from './use-now'
import { date } from '../utils/format'
import type { DispatchSearch } from './search'

export function SearchStatus({ search }: { search?: DispatchSearch }) {
  const now = useNow(search?.state === 'SEARCHING')
  if (!search) return null
  const left = remaining(search.windowExpiresAt, now)
  let message: string
  switch (search.state) {
    case 'SEARCHING':
      message = `Buscando repartidor — intento ${search.attempt} de ${search.maxAttempts}`
      break
    case 'RETRY_PENDING':
      message = `Esperando reintento automático — intento ${search.attempt} de ${search.maxAttempts}`
      break
    case 'EXHAUSTED':
      message = `No se encontró ejecutor. Búsqueda agotada — ${search.attempt} de ${search.maxAttempts} intentos.`
      break
    case 'CANCELLED':
      message = 'Búsqueda cancelada por cancelación de la solicitud.'
      break
    case 'STOPPED':
      message =
        search.stoppedReason === 'SERVICE_UNAVAILABLE'
          ? 'Búsqueda detenida: servicio no disponible.'
          : search.stoppedReason === 'INTEGRATION_UNAVAILABLE'
            ? 'Búsqueda detenida: integración no disponible.'
            : 'Búsqueda detenida por Mandaria.'
      break
    case 'EXECUTOR_FOUND':
      message =
        'Búsqueda finalizada: hubo una toma. Consulta el estado actual del servicio; no habrá más reintentos automáticos.'
      break
  }
  return (
    <div className="panel-note" role="status">
      <strong>{message}</strong>
      {search.state === 'SEARCHING' && (
        <div>
          Ventana vigente: {left ?? '0:00'}.
          {!left &&
            ' Esperando confirmación de Mandaria; el contador no confirma el cierre.'}
        </div>
      )}
      {(search.state === 'SEARCHING' || search.state === 'RETRY_PENDING') && (
        <div>Vencimiento informado: {date(search.windowExpiresAt)}</div>
      )}
      {search.state === 'RETRY_PENDING' && (
        <div>
          La ventana venció. Mandaria confirmará la siguiente ronda; la búsqueda
          aún no se ha agotado.
        </div>
      )}
    </div>
  )
}
