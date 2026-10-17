import { ApiError } from '../services/errors'
export const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const label = (values: Record<string, string>, key: string) =>
  Object.hasOwn(values, key) ? values[key] : undefined
export const scopes = {
  ACCOUNT: 'Cerrar mi cuenta personal',
  PERSONAL_DOCUMENTS: 'Eliminar documentación personal',
  INDEPENDENT_SCOPE: 'Dar de baja mi actividad independiente',
  FLEET_LINK: 'Desvincularme de la flotilla',
  VEHICLE: 'Retirar una unidad',
  ORGANIZATION: 'Dar de baja la flotilla',
  REPRESENTATIVE: 'Dejar de representar a la flotilla',
}
export type Scope = keyof typeof scopes
export const states: Record<string, string> = {
  IDENTITY_REQUIRED: 'Identidad o facultades pendientes',
  INVENTORY: 'Restricciones aplicadas; inventario en revisión',
  DELETING: 'Eliminación en curso',
  MANUAL_REQUIRED: 'Intervención requerida',
  MINIMIZING: 'Minimización pendiente',
  CLOSED: 'Alcance operativo cerrado',
  CANCELLED: 'Solicitud cancelada',
  PURGED: 'Depuración registrada',
}
export const reasons: Record<string, string> = {
  WRITER_QUIESCENCE_NOT_VERIFIED:
    'La eliminación sigue pendiente porque aún no se ha podido confirmar que todas las cargas anteriores terminaron.',
  ACTIVE_SERVICE_MINIMIZATION_REQUIRED:
    'Hay un servicio activo que requiere resolución. La minimización de la cuenta sigue pendiente; no se cancela ni reasigna el servicio automáticamente.',
  OPERATIONAL_DEADLINE_EXCEEDED:
    'El plazo operativo venció. Esto no acredita que la eliminación haya terminado.',
  DELETION_RETRY_WINDOW_EXPIRED:
    'Terminó la ventana de reintentos. Se requiere intervención; los intentos y plazos no se reinician.',
  REMOTE_COMPLETION_UNKNOWN:
    'No se ha podido comprobar el resultado de una operación de almacenamiento.',
  MANUAL_ATTENTION_REQUIRED: 'La solicitud requiere intervención autorizada.',
  RESTORE_OWNER_OR_REVIEW_REQUIRED:
    'Está pendiente asignar o revisar la responsabilidad de recuperación.',
  ACCESS_DENIED: 'No se pudo comprobar el almacenamiento por falta de acceso.',
  CAPABILITY_UNKNOWN:
    'No se ha podido acreditar la capacidad de verificación del almacenamiento.',
  UNKNOWN: 'El resultado de almacenamiento sigue sin comprobarse.',
}
export const tasks: Record<string, string> = {
  IDENTITY_REVIEW: 'Revisión de identidad y facultades',
  MISSING_IDENTITY_FOLLOWUP: 'Seguimiento de información de identidad faltante',
  IDENTITY_DECISION: 'Decisión sobre evidencia de identidad',
  CLASSIFICATION_REVIEW: 'Revisión de documentos compartidos',
  MIXED_REPLACEMENT: 'Documentación sustituta pendiente',
  ACTIVE_SERVICE: 'Resolución de servicio activo',
  ACTIVE_SERVICE_MINIMIZATION: 'Resolución de servicio activo',
  PARTIAL_RECEIPT: 'Aviso de constancia parcial',
  OPERATIONAL_DEADLINE_EXCEEDED: 'Plazo operativo vencido',
  RETENTION_REVIEW: 'Revisión de conservación excepcional',
  RESTORE_REVIEW: 'Revisión de recuperación',
  MANUAL_ATTENTION: 'Intervención requerida',
}
export interface Snapshot {
  id: string
  scope: string
  status: string
  revision: number
  receivedAt: string
  confirmedAt: string | null
  deadline: string | null
  replacementDeadline: string | null
  closedAt: string | null
  auditUntil: string | null
  contactUntil: string | null
  irreversibleStarted: boolean
  blockingReason: string | null
  providerBackups: string
  productionReady: boolean
  completedDocumentaryScopes: number
  pendingActions?: { kind: string; dueAt: string | null }[]
  evidenceLevel?: string
  fullErasureAttested?: boolean
}
export interface CreateBody {
  scope: Scope
  resourceId?: string
  subjectUserId?: string
  password?: string
  acknowledgment: true
}
export interface WorkItem {
  id: string
  attachmentId: string | null
  caseId: string | null
  classification: string
  status: string
  attempts: number
  retryAt: string | null
  errorCode: string | null
}
export interface Task {
  id: string
  kind: string
  status: string
  dueAt: string | null
}
export interface Replacement {
  newCaseId: string
  oldCaseId: string
  presenterId: string
  acceptedAt: string | null
}
export function snapshot(raw: unknown, minimumRevision = 0): Snapshot {
  const r = raw as Snapshot
  if (
    !r ||
    !uuid.test(r.id) ||
    typeof r.scope !== 'string' ||
    typeof r.status !== 'string' ||
    !Number.isInteger(r.revision) ||
    r.revision < minimumRevision ||
    typeof r.receivedAt !== 'string' ||
    typeof r.irreversibleStarted !== 'boolean' ||
    !Number.isInteger(r.completedDocumentaryScopes) ||
    r.completedDocumentaryScopes < 0 ||
    !Number.isFinite(Date.parse(r.receivedAt)) ||
    [
      r.confirmedAt,
      r.deadline,
      r.replacementDeadline,
      r.closedAt,
      r.auditUntil,
      r.contactUntil,
    ].some(
      (v) =>
        v !== null &&
        (typeof v !== 'string' || !Number.isFinite(Date.parse(v))),
    ) ||
    (r.blockingReason !== null && typeof r.blockingReason !== 'string') ||
    typeof r.providerBackups !== 'string' ||
    typeof r.productionReady !== 'boolean' ||
    (r.pendingActions !== undefined &&
      (!Array.isArray(r.pendingActions) ||
        r.pendingActions.some(
          (t) =>
            !t ||
            typeof t.kind !== 'string' ||
            (t.dueAt !== null &&
              (typeof t.dueAt !== 'string' ||
                !Number.isFinite(Date.parse(t.dueAt)))),
        )))
  )
    throw new ApiError(
      0,
      'Respuesta incompleta; conserva la referencia para recuperar la solicitud.',
    )
  // Explicit projection: never persist/render transport internals or third-party data.
  return {
    id: r.id,
    scope: r.scope,
    status: r.status,
    revision: r.revision,
    receivedAt: r.receivedAt,
    confirmedAt: r.confirmedAt,
    deadline: r.deadline,
    replacementDeadline: r.replacementDeadline,
    closedAt: r.closedAt,
    auditUntil: r.auditUntil,
    contactUntil: r.contactUntil,
    irreversibleStarted: r.irreversibleStarted,
    blockingReason: r.blockingReason,
    providerBackups: r.providerBackups,
    productionReady: r.productionReady,
    completedDocumentaryScopes: r.completedDocumentaryScopes,
    ...(Array.isArray(r.pendingActions)
      ? {
          pendingActions: r.pendingActions.map((t) => ({
            kind: t.kind,
            dueAt: t.dueAt,
          })),
        }
      : {}),
    ...(typeof r.evidenceLevel === 'string'
      ? {
          evidenceLevel: r.evidenceLevel,
          fullErasureAttested: r.fullErasureAttested,
        }
      : {}),
  }
}
export function newer(old: Snapshot | undefined, next: Snapshot) {
  return old && old.id === next.id && old.revision > next.revision ? old : next
}
const messages: Record<string, string> = {
  COMMAND_RECEIPT_UNAVAILABLE:
    'El recibo no está disponible. Puede no haberse registrado todavía o haber sido depurado; el resultado sigue siendo desconocido. No envíes otra mutación.',
  FORM_RESPONSIBLES:
    'El responsable y el suplente deben ser personas distintas.',
  FORM_OBJECT: 'Selecciona el objeto concreto para esta excepción.',
  FORM_DATE:
    'Usa fechas ISO 8601 válidas con zona horaria en los campos de revisión y vencimiento.',
  PRIVACY_WORKFLOW_UNAVAILABLE:
    'Este procedimiento sólo está habilitado en el entorno de prueba local autorizado.',
  REAUTH_REQUIRED:
    'Se requiere verificar nuevamente tu identidad. La sesión puede haber sido restringida; utiliza el canal privado si no puedes volver a entrar.',
  AUTH_REQUIRED:
    'El código privado no es válido o caducó. Solicita otro mediante el canal asistido disponible.',
  ACCOUNT_CLOSING:
    'El acceso está restringido por una baja. Conserva el folio y consulta el canal privado; no significa eliminación completada.',
  AUTHORITY_NOT_VERIFIED:
    'No se acreditaron las facultades necesarias para esta acción.',
  REQUEST_NOT_FOUND:
    'La solicitud no está disponible para esta cuenta. Esto no demuestra que no se haya registrado.',
  ACTIVE_REQUEST_EXISTS:
    'Ya hay una solicitud activa para este alcance. Consulta su folio; no envíes otra.',
  INVALID_SCOPE:
    'El alcance o recurso no corresponde a la relación verificada por el servidor.',
  SCOPE_VERSION_CONFLICT:
    'La solicitud cambió. Actualiza antes de preparar otra acción.',
  IDEMPOTENCY_KEY_REUSED:
    'La clave ya corresponde a otro contenido. Conserva la referencia y solicita revisión.',
  IRREVERSIBLE_ACTION_STARTED:
    'Ya comenzaron efectos irreversibles. No se pueden deshacer desde aquí.',
  RECEIPT_NOT_READY:
    'Todavía no hay una constancia acreditada para este alcance.',
  RETENTION_DECISION_REQUIRED:
    'Se requiere una decisión concreta de conservación; no se puede omitir.',
  ...reasons,
}
export function message(e: unknown) {
  if (e instanceof ApiError)
    return (
      label(messages, e.code ?? '') ??
      (e.status === 401
        ? 'No hay sesión autorizada. Usa el canal privado; esto no acredita eliminación.'
        : e.status === 403
          ? 'No tienes autorización para consultar o modificar este alcance.'
          : e.status === 404
            ? messages.REQUEST_NOT_FOUND
            : e.status === 0
              ? 'No se pudo confirmar la respuesta. Conserva el intento y consulta su recuperación.'
              : 'El servidor no confirmó esta acción. Actualiza y revisa los datos; no se muestran detalles internos.')
    )
  return 'No se pudo completar la operación. Conserva el intento pendiente y revisa el almacenamiento local.'
}
export const terminal = (s: Snapshot) =>
  ['CLOSED', 'CANCELLED', 'PURGED'].includes(s.status)
export const known = (s: Snapshot) =>
  Object.hasOwn(states, s.status) && Object.hasOwn(scopes, s.scope)
