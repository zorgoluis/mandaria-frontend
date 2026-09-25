import type { IndependentStatus } from './types'

/**
 * A DRIVER is the account and the person; the independent profile is an added operational
 * capability. The labels keep that distinction visible everywhere.
 */
export const independentStatusLabels: Record<IndependentStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Habilitado',
  SUSPENDED: 'Suspendido',
  REJECTED: 'Rechazado',
}
export const independentStatusHints: Record<IndependentStatus, string> = {
  PENDING: 'Todavía no puede tomar servicios por su cuenta.',
  APPROVED: 'Puede tomar servicios por su cuenta, con sus propios vehículos.',
  SUSPENDED: 'Mandaria le retiró la habilitación independiente.',
  REJECTED: 'La habilitación se cerró y no está vigente.',
}
export const driverStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
}
