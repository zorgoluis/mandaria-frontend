import { apiOnce } from '../services/api'
import { ApiError } from '../services/errors'
import { revision, uuid } from '../fleet-exit/validation'
export interface Zones {
  revision: string
  zoneIds: string[]
}
export interface ZonesCommand {
  requestId: string
  expectedRevision: string
  zoneIds: string[]
  reason: string
}
export interface ZonesReceipt extends Zones {
  requestId: string
}
export function validateCommand(b: ZonesCommand) {
  if (
    Object.keys(b).sort().join(',') !==
      'expectedRevision,reason,requestId,zoneIds' ||
    !uuid(b.requestId) ||
    !revision(b.expectedRevision) ||
    !Array.isArray(b.zoneIds) ||
    b.zoneIds.length > 100 ||
    b.zoneIds.some((z) => !uuid(z)) ||
    new Set(b.zoneIds.map((z) => z.toLowerCase())).size !== b.zoneIds.length ||
    typeof b.reason !== 'string' ||
    b.reason.trim().length < 3 ||
    b.reason.length > 500
  )
    throw Error(
      'Selecciona hasta 100 zonas únicas y escribe un motivo de 3 a 500 caracteres.',
    )
}
export const zonesPath = (profileId: string) => {
  if (!uuid(profileId)) throw Error('Perfil independiente no válido.')
  return `/admin/independent-drivers/${encodeURIComponent(profileId)}/offer-zones`
}
function read(value: unknown, requestId?: string): ZonesReceipt | Zones {
  const r = value as ZonesReceipt
  if (
    !r ||
    !revision(r.revision) ||
    !Array.isArray(r.zoneIds) ||
    r.zoneIds.length > 100 ||
    r.zoneIds.some((z) => !uuid(z)) ||
    new Set(r.zoneIds).size !== r.zoneIds.length ||
    Object.keys(r).sort().join(',') !==
      (requestId ? 'requestId,revision,zoneIds' : 'revision,zoneIds') ||
    (requestId && r.requestId !== requestId)
  )
    throw new ApiError(
      502,
      'Respuesta de zonas incompatible. Conserva la intención.',
    )
  return r
}
export const offerZones = {
  get: async (profileId: string, signal?: AbortSignal) =>
    read(
      await apiOnce(zonesPath(profileId), 'GET', undefined, signal),
    ) as Zones,
  put: async (profileId: string, body: ZonesCommand) => {
    validateCommand(body)
    const r = read(
      await apiOnce(zonesPath(profileId), 'PUT', body),
      body.requestId,
    ) as ZonesReceipt
    if (
      JSON.stringify(r.zoneIds) !== JSON.stringify(body.zoneIds) ||
      BigInt(r.revision) !== BigInt(body.expectedRevision) + 1n
    )
      throw new ApiError(502, 'Recibo incompatible con la intención original.')
    return r
  },
}
export function zonesError(e: unknown) {
  if (!(e instanceof ApiError))
    return e instanceof Error
      ? e.message
      : 'Resultado incierto. Conserva la intención.'
  if (e.status === 401)
    return 'Reautentica la misma cuenta. La intención se conserva.'
  const messages: Record<string, string> = {
    FEATURE_DISABLED:
      'La administración de zonas no está habilitada en este servidor.',
    REVISION_CONFLICT:
      'Otro cambio modificó la revisión. Consulta el estado vigente y revísalo antes de preparar otra intención.',
    ZONE_NOT_ALLOWED:
      'Una zona ya no está activa o autorizada. Refresca el catálogo; no se sustituye la intención.',
    IDEMPOTENCY_KEY_REUSED:
      'El requestId tiene otro contenido. Conserva la intención y solicita revisión asistida.',
    ACCOUNT_CLOSING:
      'La cuenta está restringida. Conserva la intención; no se permiten nuevos cambios.',
  }
  return (
    messages[e.code ?? ''] ??
    (e.status === 404
      ? 'Perfil o ruta no disponible para esta cuenta.'
      : e.status === 403
        ? 'Sin autorización para administrar estas zonas.'
        : 'No se pudo confirmar el cambio. Conserva la intención y consulta el estado actual.')
  )
}
