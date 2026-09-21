export class ApiError extends Error {
  status: number
  /** Stable backend code (DomainException), e.g. OUT_OF_SERVICE_AREA. Never shown raw. */
  code: string | null
  /** Raw backend validation strings. Never rendered verbatim; translate before display. */
  details: string[]
  constructor(
    status: number,
    message: string,
    code: string | null = null,
    details: string[] = [],
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}
export function normalizeError(status: number, body: unknown): ApiError {
  const messages: Record<number, string> = {
    0: 'No se pudo conectar con Mandaria. Comprueba tu conexión e inténtalo de nuevo.',
    400: 'Revisa los campos del formulario y sus valores permitidos.',
    401: 'La sesión expiró o las credenciales no son válidas. Inicia sesión nuevamente.',
    403: 'No tienes permisos para consultar o modificar este recurso.',
    404: 'El recurso solicitado ya no está disponible.',
    409: 'La operación entra en conflicto con el estado actual. Revisa el código, las asociaciones y el estado.',
    422: 'La configuración no es válida todavía. Revisa los datos marcados.',
    410: 'El recurso ya no está disponible.',
    429: 'Demasiados intentos. Intenta nuevamente más tarde.',
    503: 'Un servicio necesario no está disponible en este momento. Inténtalo más tarde.',
  }
  // V1.6: DomainException codes are stable machine values; they translate exactly.
  const codes: Record<string, string> = {
    SERVICE_ZONE_CODE_EXISTS: 'Ya existe una zona de servicio con ese código.',
    SERVICE_ZONE_NOT_EDITABLE:
      'Desactiva la zona antes de reemplazar su cobertura.',
    SERVICE_ZONE_OVERLAP:
      'La cobertura toca o se superpone con otra zona activa. Ajusta el área antes de activarla.',
    SERVICE_ZONE_AMBIGUOUS:
      'El punto pertenece a más de una zona activa. Revisa las coberturas.',
    RATE_PLAN_NOT_EDITABLE:
      'Sólo las versiones en borrador pueden editarse. Crea una nueva versión a partir de la activa.',
    RATE_PLAN_NOT_ACTIVATABLE: 'Sólo una versión en borrador puede activarse.',
    RATE_PLAN_NOT_ACTIVE: 'Sólo una versión activa puede desactivarse.',
    RATE_PLAN_INVALID:
      'Las bandas de la tarifa no son válidas todavía. Revisa los rangos y precios.',
    RATE_PLAN_CONFLICT:
      'Otra persona cambió esta tarifa al mismo tiempo. Vuelve a cargar e inténtalo de nuevo.',
    OUT_OF_SERVICE_AREA: 'Fuera de cobertura.',
    CROSS_ZONE_NOT_SUPPORTED: 'Entrega entre zonas no disponible.',
    ROUTE_NOT_FOUND: 'No se encontró una ruta.',
    ROUTING_UNAVAILABLE: 'Servicio de rutas temporalmente no disponible.',
    DISTANCE_NOT_SUPPORTED: 'Distancia fuera de las tarifas disponibles.',
    RATE_CONFIGURATION_UNAVAILABLE: 'No existe una tarifa activa.',
    RATE_CONFIGURATION_INVALID:
      'La tarifa activa tiene una configuración inválida. Revisa sus bandas.',
    DELIVERY_REQUEST_NOT_QUOTABLE:
      'La solicitud ya no admite cotizaciones en su estado actual.',
    QUOTE_EXPIRED: 'La cotización expiró; debe solicitarse una nueva.',
    QUOTE_NOT_ACCEPTABLE:
      'La cotización o la solicitud ya no pueden aceptarse.',
    // V1.7 dispatch claiming. The backend decides every outcome.
    DISPATCH_ALREADY_CLAIMED: 'Este servicio ya fue tomado por otro proveedor.',
    DISPATCH_EXPIRED: 'El tiempo para tomar este servicio terminó.',
    DISPATCH_CANCELLED:
      'La solicitud fue cancelada; el servicio ya no está disponible.',
    DISPATCH_RECLAIM_NOT_ALLOWED:
      'Tu proveedor liberó este servicio y no puede volver a tomarlo.',
    DISPATCH_NOT_CLAIMED_BY_PROVIDER:
      'Este servicio ya no está tomado por tu proveedor.',
    // V1.9-C: the 409 carries no id; the web finds the row and offers to reactivate it.
    SERVICE_COVERAGE_EXISTS:
      'Este proveedor ya tiene cobertura para esa zona y tipo de servicio. Actívala desde la lista en lugar de crearla de nuevo.',
    PROVIDER_NOT_ELIGIBLE:
      'Tu proveedor ya no está habilitado para esta zona o tipo de servicio.',
    // V1.8 driver and vehicle assignment. Every conflict is a 409 the backend already resolved.
    DRIVER_BUSY:
      'Ese repartidor acaba de recibir otro servicio. Actualiza la lista y elige a alguien más.',
    VEHICLE_BUSY:
      'Ese vehículo acaba de asignarse a otro servicio. Actualiza la lista y elige otro.',
    DRIVER_VEHICLE_MISMATCH:
      'Ese repartidor y ese vehículo no pueden combinarse: alguno está emparejado con otro en su ficha.',
    // Shared by V1.8 assignment and V1.9 independent enabling: the driver is not operational.
    DRIVER_NOT_ELIGIBLE:
      'Ese repartidor no cumple los requisitos: necesita una cuenta activa con rol de repartidor y estar activo.',
    VEHICLE_NOT_ELIGIBLE:
      'Ese vehículo ya no puede asignarse. Actualiza la lista de disponibles.',
    DISPATCH_ALREADY_ASSIGNED:
      'Este servicio ya tiene un repartidor asignado. Actualiza para ver quién quedó asignado.',
    DISPATCH_HAS_ACTIVE_ASSIGNMENT:
      'Cancela la asignación antes de liberar el servicio.',
    NO_ACTIVE_ASSIGNMENT:
      'Este servicio ya no tiene una asignación vigente. Actualiza para ver su estado.',
    ASSIGNMENT_UNCHANGED:
      'Elige un repartidor o un vehículo distinto del actual.',
    ASSIGNMENT_CONFLICT:
      'Otra persona cambió la asignación al mismo tiempo. Actualiza e inténtalo de nuevo.',
    PROVIDER_NOT_ACTIVE:
      'Tu proveedor no está activo y no puede asignar servicios.',
    // V1.9 independent drivers. Every conflict is a 409 the backend already resolved.
    INDEPENDENT_PROFILE_EXISTS:
      'Ese repartidor ya tiene una habilitación independiente registrada.',
    INDEPENDENT_NOT_APPROVED:
      'Tu habilitación para tomar servicios por tu cuenta no está vigente.',
    INDEPENDENT_DRIVER_HAS_ACTIVE_ASSIGNMENT:
      'El repartidor está ejecutando un servicio. Espera a que termine o libéralo antes de cambiar su habilitación.',
    DISPATCH_NOT_OPEN_TO_INDEPENDENT:
      'Este servicio no admite repartidores independientes.',
    DISPATCH_RETAKE_NOT_ALLOWED:
      'Ya liberaste este servicio y no puedes volver a tomarlo.',
    DISPATCH_NOT_CLAIMED_BY_DRIVER:
      'Este servicio ya no es tuyo. Actualiza para ver su estado.',
    VEHICLE_HAS_ACTIVE_ASSIGNMENT:
      'Ese vehículo está ejecutando un servicio. No puede desactivarse hasta que termine.',
    // The limit is configurable in the backend and counts inactive vehicles too.
    VEHICLE_LIMIT_REACHED:
      'Este repartidor ya tiene el máximo de vehículos propios permitido, incluidos los inactivos.',
    // A race lost inside the database: another executor changed the service first.
    TAKE_CONFLICT:
      'El servicio cambió mientras lo tomabas o liberabas. Actualiza para ver su estado.',
    // V1.6.1 invitations and account activation.
    USER_ALREADY_ACTIVE: 'Ya existe una cuenta activa con ese correo.',
    USER_INVITATION_PENDING:
      'Ya existe una invitación pendiente para ese correo. Reenvíala desde la lista de invitaciones.',
    USER_DISABLED:
      'La cuenta con ese correo está deshabilitada y no puede reactivarse mediante una invitación.',
    PROVIDER_DRIVER_LIMIT_REACHED:
      'Límite de repartidores alcanzado; las invitaciones pendientes también ocupan lugar. Solicita ampliar la capacidad del proveedor.',
    INVITATION_NOT_PENDING: 'La invitación ya fue aceptada o revocada.',
    INVITATION_RESEND_COOLDOWN:
      'La invitación se envió hace poco. Espera un momento antes de reenviarla.',
    MAIL_NOT_CONFIGURED:
      'El envío de invitaciones no está configurado en Mandaria. Contacta al equipo técnico.',
    INVITATION_TOKEN_INVALID: 'La invitación no es válida.',
    INVITATION_EXPIRED:
      'Esta invitación ha expirado. Solicita una nueva invitación a tu administrador.',
    INVITATION_REVOKED:
      'Esta invitación fue revocada. Solicita una nueva invitación a tu administrador.',
    INVITATION_ALREADY_ACCEPTED: 'Esta invitación ya fue utilizada.',
    ACCOUNT_NOT_ACTIVATABLE:
      'Esta cuenta no puede activarse con la invitación. Contacta a tu administrador.',
  }
  // Never reflect arbitrary backend messages, SQL, request paths or values into the UI.
  const safe: Record<string, string> = {
    'User must be active with global role DRIVER':
      'El usuario debe estar activo y tener rol de repartidor.',
    'User already has a driver profile':
      'Este usuario ya tiene un perfil de repartidor.',
    'Provider driver limit reached':
      'Límite de repartidores alcanzado. Solicita ampliar la capacidad del proveedor.',
    'Provider vehicle limit reached':
      'Límite de vehículos alcanzado. Solicita ampliar la capacidad del proveedor.',
    'Vehicle identifier already exists in this provider':
      'Ya existe un vehículo con ese identificador en el proveedor.',
    'Vehicle identifier already exists for this independent driver':
      'Este repartidor ya tiene un vehículo con ese identificador.',
    'Driver not found': 'El repartidor no está disponible en este proveedor.',
    'Vehicle not found': 'El vehículo no está disponible en este proveedor.',
    'Invalid driver status transition':
      'El estado actual del repartidor no permite ese cambio.',
    'Suspended providers cannot assign vehicles':
      'Activa el proveedor antes de asignar vehículos.',
    'Suspended drivers cannot receive vehicles':
      'Activa el repartidor antes de asignarle un vehículo.',
    'Only ACTIVE vehicles can be assigned':
      'El vehículo debe estar activo. No se pueden asignar vehículos inactivos, en mantenimiento o suspendidos.',
    'Driver already has an active vehicle assignment':
      'El repartidor ya tiene un vehículo. Desasígnalo antes de elegir otro.',
    'Vehicle is already assigned to another driver':
      'El vehículo está ocupado por otro repartidor. Elige uno libre.',
    'Driver or vehicle already assigned':
      'El repartidor o el vehículo ya tiene una asignación. Actualiza la información e inténtalo de nuevo.',
    'Driver has no active vehicle assignment':
      'El repartidor ya no tiene una asignación vigente.',
    'Delivery request not found':
      'La solicitud de entrega no existe o ya no está disponible.',
    'requestedFrom must be before or equal to requestedTo':
      'La fecha inicial debe ser anterior o igual a la fecha final.',
    'Invalid credentials': 'El correo o la contraseña son incorrectos.',
    'Invalid refresh token': 'Tu sesión expiró. Inicia sesión nuevamente.',
    'Integration code already exists':
      'Ya existe una integración con ese código.',
    'Provider code already exists': 'Ya existe un proveedor con ese código.',
    'Provider not found': 'El proveedor ya no está disponible.',
    'User not found': 'No existe un usuario con ese ID.',
    'User must be active with global role PROVIDER_ADMIN':
      'El usuario debe estar activo y tener el rol de administrador de proveedor.',
    'User is already a member of this provider':
      'Este usuario ya está asociado al proveedor.',
    'Provider membership not found': 'La asociación ya no está disponible.',
    'Invalid provider status transition':
      'El estado actual del proveedor no permite esa operación.',
    'Credential cannot be rotated':
      'La credencial está revocada o vencida y no puede rotarse.',
    'Integration is revoked': 'Esta integración está revocada.',
    'Revoked integrations cannot be reactivated':
      'Una integración revocada no puede reactivarse.',
    'Credential expiration must be in the future':
      'La fecha de expiración debe estar en el futuro.',
    'Provider access denied':
      'Tu cuenta no tiene una asociación vigente con este proveedor.',
    'Service zone not found': 'La zona de servicio ya no está disponible.',
    'Coverage not found':
      'Esa cobertura ya no existe para este proveedor. Actualiza la lista.',
    'Invitation not found': 'La invitación ya no está disponible.',
    'Dispatch not found':
      'El servicio no existe o no está disponible para tu proveedor.',
    'Rate plan not found': 'La tarifa ya no está disponible.',
    'Delivery quote not found': 'La cotización ya no está disponible.',
  }
  const record = body && typeof body === 'object' ? body : undefined
  const raw = record && 'message' in record ? record.message : undefined
  const code = record && 'code' in record ? record.code : undefined
  const list = record && 'errors' in record ? record.errors : undefined
  const details =
    Array.isArray(list) && list.every((item) => typeof item === 'string')
      ? (list as string[])
      : []
  return new ApiError(
    status,
    (typeof code === 'string' && codes[code]) ||
      (typeof raw === 'string' && safe[raw]) ||
      messages[status] ||
      'Mandaria no está disponible en este momento. Inténtalo más tarde.',
    typeof code === 'string' ? code : null,
    details,
  )
}
export const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'No fue posible completar la operación. Inténtalo nuevamente.'
