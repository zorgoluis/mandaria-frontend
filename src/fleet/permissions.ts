import { createContext, useContext } from 'react'
import type { OperationContext } from './types'
export const FleetContext = createContext<OperationContext | null>(null)
export function allows(
  context: OperationContext | null,
  capability: keyof OperationContext['capabilities'],
) {
  if (
    !context ||
    !['ADMIN_DISPATCH', 'DRAINING', 'DRIVER_TAKE', 'PAUSED'].includes(
      context.operationMode,
    )
  )
    return false
  if (
    capability !== 'canManageResources' &&
    capability !== 'canObserveServices'
  ) {
    if (
      context.operationMode === 'DRIVER_TAKE' ||
      context.operationMode === 'PAUSED'
    )
      return false
    if (capability === 'canClaim' && context.operationMode === 'DRAINING')
      return false
  }
  return context.capabilities[capability] === true
}
export function useFleetPermission(
  capability: keyof OperationContext['capabilities'],
) {
  return allows(useContext(FleetContext), capability)
}
