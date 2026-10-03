export const phaseLabels: Record<string, string> = {
  TO_PICKUP: 'En camino al origen',
  AT_PICKUP: 'En el origen',
  PICKED_UP: 'Mercancía recogida',
  TO_DROPOFF: 'En camino al destino',
  AT_DROPOFF: 'En el destino',
}
export const reasonLabels: Record<string, string> = {
  RECIPIENT_UNAVAILABLE: 'Destinatario no disponible',
  DELIVERY_REFUSED: 'Entrega rechazada',
  VEHICLE_FAILURE: 'Falla del vehículo',
  SAFETY_CONCERN: 'Riesgo de seguridad',
  OTHER: 'Otro motivo',
}
export const kindLabels: Record<string, string> = {
  ASSIGNED: 'Asignación',
  ADVANCED: 'Avance',
  INCIDENT: 'Incidencia',
  TRANSFER: 'Transferencia de custodia',
  RETURN: 'Devolución al origen',
  DELIVERED: 'Entregado',
  ENDED: 'Ejecución finalizada',
}
export const sourceLabels: Record<string, string> = {
  PHONE_REPORT: 'Aviso por teléfono',
  SELF_REPORT: 'Reporte propio',
  ADMIN_RESOLUTION: 'Resolución administrativa',
  SYSTEM_CANCELLATION: 'Cancelación del sistema',
}
