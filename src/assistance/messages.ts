import { ApiError } from '../services/errors'
export const messages: Record<string, string> = {
  MOVEMENT_COMBINATION_NOT_AUTHORIZED:
    'La combinación ya no está autorizada. Recupera el intento y revisa las opciones actuales; no combines otras partes bajo la misma clave.',
  MOVEMENT_ADMIN_REVIEW_REQUIRED:
    'La reversión requiere revisión administrativa. Puedes aportar información o disputar el movimiento autorizado.',
  MOVEMENT_DUPLICATE:
    'El hecho ya tiene un movimiento registrado. Consulta el resultado; no generes otro identificador para declararlo de nuevo.',
  RESOURCE_NOT_FOUND:
    'El expediente o movimiento no está disponible para esta cuenta y proveedor.',
  CASE_CLOSED: 'El expediente está cerrado; no admite nuevas declaraciones.',
  NO_AUTHORIZED_MOVEMENT_REFERENCES:
    'No hay combinaciones autorizadas para declarar. Puedes aportar información para revisión administrativa.',
  EVIDENCE_STORAGE_NOT_CONFIGURED:
    'El almacenamiento privado no está habilitado. Conserva el intento y consulta su resultado; las lecturas y recuperación siguen sus permisos.',
  EVIDENCE_TOO_LARGE:
    'La evidencia supera el límite admitido. Consulta el recibo antes de preparar otro archivo.',
  EVIDENCE_TYPE_UNSUPPORTED:
    'El contenido no es una imagen JPEG/PNG válida para este flujo.',
  EVIDENCE_DUPLICATE:
    'Esta evidencia ya está registrada. Revisa el expediente y el recibo.',
  VALIDATION_ERROR:
    'Los datos no cumplen el contrato. Revisa los campos; no se reenvía ni cambia la intención original.',
  ROLE_FORBIDDEN:
    'Tu rol no está autorizado para esta operación. No cambies de cuenta para reenviar el intento.',
  ASSISTANCE_DISABLED:
    'Los comandos de asistencia están deshabilitados. Puedes consultar el expediente y recuperar intentos.',
  ASSISTANCE_RESTRICTED:
    'Existe una restricción de asistencia. No se levanta por iniciar sesión ni por cerrar un intento.',
  CASE_REVISION_CONFLICT:
    'El expediente cambió. Recupera el recibo y revisa los hechos antes de una nueva intención.',
  PROPOSAL_STALE:
    'La propuesta quedó obsoleta. Revisa nuevamente los hechos; los votos anteriores no autorizan una nueva versión.',
  APPROVALS_REQUIRED:
    'Faltan votos efectivos de operadores distintos. Dos sesiones de la misma persona cuentan como una.',
  COUNTERPARTY_UNVERIFIED:
    'Falta verificar la contraparte por un canal registrado.',
  OBLIGATIONS_UNVERIFIED:
    'Falta acreditar positivamente el inventario de obligaciones; desconocido no significa cero.',
  MONEY_ALLOCATION_CONFLICT:
    'Las asignaciones económicas son incompatibles. Revisa parciales, originales y correcciones.',
  EVIDENCE_UNAVAILABLE:
    'La evidencia no está disponible o no pudo verificarse.',
  CASE_NOT_CLOSABLE:
    'El caso no reúne las condiciones de cierre. El estado físico y el económico son independientes.',
  IDEMPOTENCY_KEY_REUSED:
    'La clave ya identifica otro cuerpo. Conserva el intento y consulta su recibo.',
  ATTEMPT_CLOSED:
    'El intento está cerrado. Consulta su recibo antes de preparar otra intención.',
  RETRY_SAME_ATTEMPT:
    'No se confirmó el resultado. Recupera o reenvía explícitamente el mismo intento.',
  INVALID_CURSOR:
    'El cursor venció o cambió la autorización. Refresca desde la primera página.',
}
export function assistanceError(error: unknown) {
  if (error instanceof ApiError)
    return (
      messages[error.code ?? ''] ??
      ([401, 403, 404].includes(error.status)
        ? 'No hay acceso a esta información. Reautentica la misma cuenta o consulta soporte.'
        : 'Resultado no confirmado. Consulta el intento; no presupongas ausencia de efectos.')
    )
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.'
}
