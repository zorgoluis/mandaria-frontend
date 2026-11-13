export interface DriverCategory {
  contractVersion: '1.0.0'
  categoryRevision: string
  category: 'FLEET' | 'INDEPENDENT' | 'NONE' | 'REVIEW_REQUIRED'
  providerId: string | null
  independentMembershipState:
    'CURRENT' | 'HISTORICAL' | 'REVIEW_REQUIRED' | null
  independentApprovalStatus:
    'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' | null
  resolutionRequired: boolean
}
export function validCategory(
  c: DriverCategory | undefined,
): c is DriverCategory {
  return (
    !!c &&
    c.contractVersion === '1.0.0' &&
    typeof c.categoryRevision === 'string' &&
    (c.providerId === null || typeof c.providerId === 'string') &&
    [null, 'CURRENT', 'HISTORICAL', 'REVIEW_REQUIRED'].includes(
      c.independentMembershipState,
    ) &&
    [null, 'PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'].includes(
      c.independentApprovalStatus,
    ) &&
    /^\d+$/.test(c.categoryRevision) &&
    ['FLEET', 'INDEPENDENT', 'NONE', 'REVIEW_REQUIRED'].includes(c.category) &&
    c.resolutionRequired === (c.category === 'REVIEW_REQUIRED')
  )
}
export function categoryBlock(c: DriverCategory | undefined): string | null {
  if (!validCategory(c))
    return 'Categoría no confirmada por el servidor. Actualiza antes de operar.'
  if (c.category === 'FLEET')
    return 'Pertenece a una flotilla. ACTIVE y EXIT_PENDING impiden habilitar operación independiente; requiere salida completada.'
  if (c.category === 'REVIEW_REQUIRED')
    return 'Categoría pendiente de conciliación. No se permiten nuevas tomas ni una conversión automática.'
  if (c.category === 'NONE')
    return 'Sin vinculación operativa. Requiere habilitación independiente expresa; no inicia recepción automáticamente.'
  if (
    c.independentMembershipState !== 'CURRENT' ||
    c.independentApprovalStatus !== 'APPROVED'
  )
    return 'La pertenencia independiente se conserva, pero la aprobación no permite nuevas tomas. Suspender o rechazar no permite incorporarse a flotilla.'
  return null
}
export function canApprove(c: DriverCategory | undefined) {
  return (
    validCategory(c) &&
    !c.providerId &&
    ['NONE', 'INDEPENDENT'].includes(c.category)
  )
}
