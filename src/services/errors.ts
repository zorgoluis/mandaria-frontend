export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    429: 'Demasiados intentos. Espera un minuto antes de continuar.',
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
  }
  const raw =
    body && typeof body === 'object' && 'message' in body
      ? body.message
      : undefined
  return new ApiError(
    status,
    (typeof raw === 'string' && safe[raw]) ||
      messages[status] ||
      'Mandaria no está disponible en este momento. Inténtalo más tarde.',
  )
}
export const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'No fue posible completar la operación. Inténtalo nuevamente.'
