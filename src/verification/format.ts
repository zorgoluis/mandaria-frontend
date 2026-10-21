import { ApiError } from '../services/errors'
import { availabilityError } from './availability'
export const vkey = (actor: string, ...parts: unknown[]) => [
  'verification',
  actor,
  ...parts,
]
export const labels: Record<string, string> = {
  REPRESENTATIVE: 'Representación legal',
  SELF: 'Titular persona física por derecho propio',
  APPOINTMENT: 'Representación por nombramiento',
  POWER: 'Representación por poder',
  REPRESENTATIVE_INE_FRONT: 'INE del representante: frente',
  REPRESENTATIVE_INE_BACK: 'INE del representante: reverso',
  REPRESENTATION_AUTHORITY_PAGE: 'Página de nombramiento o poder',
  IDENTITY_VALIDITY: 'INE vigente',
  REPRESENTED_PERSON_MATCH: 'Persona representada concordante',
  AUTHORITY_SUFFICIENT: 'Facultades suficientes para este contrato',
  AUTHORITY_CURRENT: 'Facultades vigentes',
  LIMITS_REVIEWED: 'Límites revisados',
  INDIVIDUAL_SIGNATURE_SUFFICIENT: 'Firma individual suficiente',
  DRAFT: 'Borrador',
  SUBMITTED: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  WITHDRAWN: 'Retirado',
  EXPIRED: 'Vencido',
  NOT_SUBMITTED: 'Sin presentar',
  UNDER_REVIEW: 'En revisión',
  REVIEW_REQUIRED: 'Revisión requerida',
  REVALIDATION_REQUIRED: 'Requiere nueva revisión',
  ACCEPTED_BY_PROVIDER:
    'Aceptado por proveedor de correo (no acredita entrega)',
  PENDING: 'Pendiente',
  FAILED: 'Aviso fallido',
  CREATED: 'Carga incompleta',
  VALIDATED: 'Formato validado',
  REMOVED: 'Retirado',
  DRIVER_IDENTITY: 'Identidad',
  VEHICLE: 'Unidad',
  OWNED: 'Propia',
  RENTED: 'Rentada',
  BORROWED: 'Prestada',
  FACE_PHOTO: 'Fotografía de rostro',
  INE_FRONT: 'INE: frente',
  INE_BACK: 'INE: reverso',
  LICENSE: 'Licencia del conductor',
  REGISTRATION_CARD: 'Tarjeta de circulación',
  OWNERSHIP_PROOF: 'Comprobante de propiedad',
  RENTAL_CONTRACT: 'Contrato de arrendamiento',
  OWNER_AUTHORIZATION: 'Autorización del titular',
  IDENTITY_MATCH: 'Identidad concordante',
  LEGIBLE: 'Evidencia legible',
  LICENSE_HOLDER: 'Titular de licencia',
  LICENSE_VALIDITY: 'Vigencia de licencia',
  LICENSE_CATEGORY: 'Categoría y tipos de vehículo exactos',
  UNIT_MATCH: 'Unidad concordante',
  AUTHORIZED_USE: 'Propiedad o uso autorizado',
}
const errors: Record<string, string> = {
  IMAGE_RETENTION_DISABLED:
    'La confirmación de rechazo definitivo no está disponible en este momento.',
  IMAGE_RETENTION_EVIDENCE_REQUIRED:
    'Indica la referencia de evidencia que acredita el cierre de revisión o apelación.',
  IMAGE_RETENTION_CASE_NOT_ELIGIBLE:
    'Este expediente no admite confirmar rechazo definitivo. Actualiza su estado.',
  DOCUMENT_DELETION_RESTRICTED:
    'El expediente está restringido por eliminación. No se reabre ni se restauran archivos al consultar.',
  DELETION_RESTRICTED:
    'Este alcance documental está restringido. Consulta el seguimiento de baja; una constancia histórica no restablece permisos.',
  REPRESENTATIVE_APPLICANT_INVALID:
    'La cuenta solicitante debe estar activa, tener correo confirmado y no ser SUPER_ADMIN.',
  REPRESENTATIVE_LINK_EXISTS:
    'Ya existe un vínculo activo para esa cuenta y flotilla.',
  REPRESENTATIVE_LINK_REVOKED:
    'El vínculo fue revocado. No se restablece al consultar un recibo histórico.',
  REPRESENTATIVE_PRIVACY_UNAVAILABLE:
    'Falta un aviso personal aplicable. No se puede recoger información ni cargar documentos.',
  REPRESENTATIVE_ACCREDITATION_REQUIRED:
    'Se requiere representación acreditada vigente y privacidad confirmada para aceptar por esta flotilla.',
  REPRESENTATIVE_PAGE_ORDER_REQUIRED:
    'Revisa y guarda el orden de todas las páginas de facultades confirmadas.',
  REPRESENTATIVE_REVIEW_REASON_REQUIRED:
    'Indica el motivo comunicable de la decisión.',
  REPRESENTATIVE_JOINT_SIGNATURE_UNRESOLVED:
    'La firma conjunta sigue sin resolver. No se puede acreditar una firma individual.',
  REPRESENTATIVE_AUTHORITY_NOT_CURRENT:
    'Las facultades declaradas todavía no están vigentes.',
  VERIFICATION_EXPIRED:
    'La vigencia documental terminó. Consulta los requisitos para un nuevo expediente.',
  DOCUMENT_RESOURCE_RESTRICTED:
    'Este alcance documental está restringido. Consulta el seguimiento de baja; una constancia histórica no restablece permisos.',
  VERIFICATION_DATA_INVALID:
    'Revisa los datos, fechas y forma de actuación del expediente.',
  VERIFICATION_CATEGORY_INVALID: 'Esta categoría no corresponde al expediente.',
  VERIFICATION_FILE_LIMIT:
    'Se alcanzó el límite de archivos. Solicita orientación sin omitir páginas indispensables.',
  VERIFICATION_PUBLICATION_ENVIRONMENT_REQUIRED:
    'La publicación no está disponible en este modo. Conserva el borrador y consulta con la administración.',
  VERIFICATION_VERSION_EXISTS:
    'Esa versión ya existe y es inmutable. No puede sobrescribirse; consulta la política vigente.',
  PRIVACY_VERSION_CONFLICT:
    'La versión del aviso ya identifica otro texto. No puede reutilizarse para un contenido distinto.',
  PRIVACY_ACKNOWLEDGMENT_REQUIRED:
    'Consulta el aviso vigente y confirma su lectura por separado.',
  SPECIFIC_CONSENT_REQUIRED:
    'Revisa y confirma cada consentimiento específico de la publicación vigente por separado.',
  REGISTRATION_ENVIRONMENT_MISMATCH:
    'Este código pertenece a otro entorno. Solicita un nuevo correo de registro; no se modifica la cuenta anterior.',
  VERIFICATION_EVIDENCE_RENEWAL_REQUIRED:
    'Este expediente es histórico o de otro entorno. Requiere aceptaciones vigentes, un nuevo expediente, nuevas evidencias y revisión; no se copian archivos ni aprobaciones.',
  TERMS_ACCEPTANCE_REQUIRED:
    'Falta aceptación vigente del conductor o de un representante de la flotilla. Cada persona debe aceptar con su cuenta.',
  VERIFICATION_EMAIL_REQUIRED: 'Confirma primero el correo de esta cuenta.',
  VERIFICATION_VERSION_CONFLICT:
    'El expediente o la política cambió. Revisa la versión actual antes de preparar otra acción.',
  TERMS_VERSION_CONFLICT:
    'Los términos cambiaron. Lee la versión vigente y vuelve a marcar la casilla.',
  VERIFICATION_UPLOAD_EXPIRED:
    'La carga caducó. Consulta su estado y retira la referencia incompleta antes de preparar otra carga explícita.',
  VERIFICATION_DOCUMENTS_PENDING:
    'Faltan evidencias validadas de las categorías requeridas antes de presentar.',
  VERIFICATION_OPEN_CASE_EXISTS:
    'Ya existe un expediente abierto para este recurso. Continúa desde el listado.',
  STORAGE_UNAVAILABLE:
    'Almacenamiento no disponible. La creación del intento de carga pudo aplicarse; consulta el intento antes de continuar.',
  VERIFICATION_ATTEMPT_CLOSED:
    'La clave original fue cerrada técnicamente. Consulta el intento; no se reenviará.',
  IDEMPOTENCY_KEY_REUSED:
    'La clave ya pertenece a otra intención. Consulta el intento original.',
  VERIFICATION_NOT_FOUND: 'El recurso no está disponible para esta cuenta.',
  VERIFICATION_FLEET_PRESENTER_REQUIRED:
    'El expediente de flotilla lo presenta su administrador; el conductor acepta personalmente sus términos.',
}
export function message(e: unknown) {
  return e instanceof ApiError
    ? availabilityError(e) ||
        errors[e.code || ''] ||
        (e.status === 0
          ? 'Respuesta no confirmada. Consulta la operación pendiente; no crees otra clave.'
          : e.status === 409
            ? 'El recurso cambió o no cumple un requisito. Revisa su estado actual.'
            : e.status === 401
              ? 'No se pudo verificar tu sesión. Revisa tu acceso antes de continuar.'
              : e.status === 403
                ? 'Sin permiso para esta acción.'
                : e.status === 404
                  ? 'Recurso no disponible. No se deduce ausencia de soporte.'
                  : e.status === 429
                    ? 'Demasiadas solicitudes. Espera antes de volver a consultar.'
                    : 'No fue posible completar la solicitud.')
    : e instanceof Error
      ? e.message
      : 'No fue posible completar la solicitud.'
}
