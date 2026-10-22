import { useResolutionMarkers } from '../execution/reconciliation-store'
import { useHistoricalMarkers } from '../execution/historical-store'
export function HistoricalOperationsNotice() {
  const r = useResolutionMarkers()
  const h = useHistoricalMarkers()
  return r.unavailable || r.markers.length || h.markers.length ? (
    <p className="notice" role="alert">
      Hay referencias de operaciones detalladas del entorno anterior. Este
      backend main no puede reconciliarlas. Se conservan los marcadores: vuelve
      al entorno de origen con la cuenta iniciadora; no repitas ni cierres la
      operación aquí.
    </p>
  ) : null
}
