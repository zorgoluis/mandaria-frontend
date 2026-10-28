import { ApiError } from '../services/errors'
export const reasons: Record<string, string> = {
  ACTIVE_ASSIGNMENT:
    'Existe un servicio activo. Su ejecución debe continuar; la salida espera su resolución.',
  CUSTODY_UNRESOLVED: 'La custodia necesita resolución acreditada.',
  OPERATION_ATTEMPT_UNRESOLVED:
    'Hay un efecto operativo sin resolver. Recupera el intento por su procedimiento autorizado.',
  OPERATIONAL_STATE_INCONSISTENT:
    'La operación requiere revisión administrativa.',
  FEATURE_DISABLED: 'No se admiten nuevas solicitudes de salida.',
  FLEET_EXIT_DISABLED:
    'No se admiten nuevas solicitudes. Se conservan lecturas y recuperación.',
  NOT_AFFILIATED: 'Sin afiliación actual.',
  EXIT_ALREADY_REQUESTED: 'La salida ya está registrada; consulta su estado.',
  EXIT_COMPLETED: 'La salida está completada.',
  ACCOUNT_RESTRICTED:
    'La cuenta tiene acceso restringido; consulta las acciones autorizadas.',
  ACCOUNT_CLOSING:
    'Reautentica la misma cuenta para consultar resultados propios existentes desde recuperación privada. No se permiten nuevos comandos.',
  PROVIDER_SCOPE_REQUIRED: 'Selecciona explícitamente un proveedor autorizado.',
  RESOURCE_NOT_FOUND:
    'El recurso no está disponible para esta cuenta y proveedor.',
  ROLE_FORBIDDEN: 'Esta cuenta no tiene permiso para esta operación.',
  AFFILIATION_REVISION_CONFLICT:
    'La afiliación cambió. Recupera el intento antes de preparar otra solicitud.',
  EXIT_REVISION_CONFLICT:
    'La salida cambió. Recupera el intento y actualiza el detalle.',
  FLEET_EXIT_PENDING:
    'Hay una salida pendiente; no se permiten nuevas operaciones incompatibles.',
  AFFILIATION_ENDED:
    'La afiliación terminó; no se reactiva mediante esta solicitud.',
  IDEMPOTENCY_KEY_REUSED:
    'La clave pertenece a otro contenido. No la reutilices ni sustituyas la intención.',
  ATTEMPT_CLOSED: 'Esta intención está cerrada y no puede reenviarse.',
  RETRY_SAME_ATTEMPT:
    'Consulta el resultado o reintenta expresamente con la misma clave y cuerpo.',
  INVALID_CURSOR: 'El cursor ya no es válido. Reinicia la consulta.',
  VALIDATION_ERROR:
    'La solicitud no cumple el contrato; revisa los datos sin modificar una intención ya enviada.',
}
export function exitError(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 401)
      return 'Reautentica la misma cuenta; la intención se conserva.'
    if (e.code && reasons[e.code]) return reasons[e.code]
    if (e.status === 404)
      return 'Ruta o recurso no disponible. No se puede confirmar la disponibilidad de esta API ni la autorización del recurso.'
    if (e.status >= 500)
      return 'Servicio no disponible o respuesta incompatible. Conserva la intención y consulta su resultado.'
  }
  return e instanceof Error
    ? e.message
    : 'Resultado no confirmado. Conserva la intención.'
}
export const confirmation =
  'Se registrará el retiro y se detendrán nuevas operaciones incompatibles del conductor. La salida puede quedar pendiente por servicio, custodia o efectos inciertos. No desactiva la cuenta, cancela servicios, liquida obligaciones ni habilita operación independiente. No transfiere vehículo, documentos, créditos ni zonas.'
