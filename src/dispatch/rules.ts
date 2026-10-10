import { searchAllowsTake } from './search'
import { remaining } from './format'
import type { DeliveryAssignment } from '../delivery-assignments/types'
import type { ProviderDispatch } from './types'

/** UI hints only: the backend decides every claim and release. */
export const canClaim = (dispatch: ProviderDispatch, now: number) =>
  dispatch.trackingMode !== undefined &&
  searchAllowsTake(dispatch.search, now) &&
  dispatch.access === 'OFFER' &&
  dispatch.status === 'OPEN' &&
  dispatch.myCandidate?.status === 'OFFERED' &&
  remaining(dispatch.expiresAt, now) !== null
export const canRelease = (dispatch: ProviderDispatch) =>
  dispatch.access === 'OWNER' &&
  dispatch.status === 'CLAIMED' &&
  (dispatch.trackingMode === 'DETAILED'
    ? !!dispatch.execution &&
      dispatch.execution.allowedActions.includes(
        'ORDINARY_ASSIGNMENT_OPERATIONS',
      ) &&
      !!dispatch.execution.activeAssignmentId &&
      !dispatch.execution.openIncidentId
    : (dispatch.trackingMode === 'LEGACY' || dispatch.trackingMode === null) &&
      dispatch.claimedByMe)
/**
 * A delivered service is still mine: the detail, the assignment history and who executed it stay
 * visible after the close, even though nothing can be done to it any more.
 */
export const isClaimOwner = (dispatch: ProviderDispatch) =>
  dispatch.access === 'OWNER'
/** V1.11: only a claimed service with someone executing it can be confirmed as delivered. */
export const canDeliver = (
  dispatch: ProviderDispatch,
  active: DeliveryAssignment | null,
) =>
  legacyProjection(dispatch) &&
  canRelease(dispatch) &&
  active !== null &&
  active.status === 'ACTIVE'

/** Only an explicit LEGACY projection can authorize the old completion route. */
export function legacyProjection(value: {
  trackingMode?: unknown
  execution?: unknown
  collectionActionAllowed?: unknown
  advanceToOriginAllowed?: unknown
  access?: string
  status?: string
  assignment?: unknown
  service?: unknown
  deliveredAt?: unknown
}) {
  const service = value.service
  const completeService =
    typeof service === 'object' &&
    service !== null &&
    'pickup' in service &&
    service.pickup !== null &&
    'dropoff' in service &&
    service.dropoff !== null &&
    'route' in service &&
    service.route !== null &&
    'packages' in service &&
    Array.isArray(service.packages)
  return (
    value.trackingMode === 'LEGACY' &&
    value.access === 'OWNER' &&
    value.status === 'CLAIMED' &&
    value.execution === undefined &&
    value.collectionActionAllowed === undefined &&
    value.advanceToOriginAllowed === undefined &&
    value.assignment !== undefined &&
    completeService &&
    value.deliveredAt === null
  )
}
