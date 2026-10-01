export const transportLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  DELIVERED: 'Aceptado por el receptor',
  EXHAUSTED: 'Intentos agotados',
  NO_DELIVERY: 'Sin envío programado',
}
export const reasonLabels: Record<string, string> = {
  NO_ENDPOINT: 'Falta destino o secreto',
  BEFORE_BOUNDARY: 'Anterior al inicio de entrega automática',
  NOT_YET_PICKED_UP: 'Pendiente de recogida por el worker',
}
export const failureLabels: Record<string, string> = {
  HTTP_STATUS: 'Respuesta HTTP no aceptada',
  TIMEOUT: 'Tiempo de espera agotado',
  NETWORK: 'Error de red',
  INVALID_ENDPOINT: 'Destino no permitido',
}
export const uncertainSecret =
  'No se recibió el secreto. El secreto pudo cambiar aunque no se haya recibido el valor. Consulta la fecha de generación y coordina el receptor antes de iniciar otra rotación explícita.'
