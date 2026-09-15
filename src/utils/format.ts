const formatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
export function date(value?: string | null) {
  if (!value) return 'Sin registro'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? 'Fecha no disponible'
    : formatter.format(parsed)
}
export const labels: Record<string, string> = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  SUSPENDED: 'Suspendido',
  REVOKED: 'Revocado',
  FLEET: 'Flotilla',
  INDEPENDENT: 'Independiente',
  SUPER_ADMIN: 'Superadministrador',
  PROVIDER_ADMIN: 'Administrador de proveedor',
  DRIVER: 'Repartidor',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
}
