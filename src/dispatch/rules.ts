import { remaining } from './format'
import type { DeliveryAssignment } from '../delivery-assignments/types'
import type { ProviderDispatch } from './types'

/** UI hints only: the backend decides every claim and release. */
export const canClaim = (dispatch: ProviderDispatch, now: number) =>
  dispatch.access === 'OFFER' &&
  dispatch.status === 'OPEN' &&
  dispatch.myCandidate?.status === 'OFFERED' &&
  remaining(dispatch.expiresAt, now) !== null
export const canRelease = (dispatch: ProviderDispatch) =>
  dispatch.access === 'OWNER' &&
  dispatch.status === 'CLAIMED' &&
  dispatch.claimedByMe
/**
 * A delivered service is still mine: the detail, the assignment history and who executed it stay
 * visible after the close, even though nothing can be done to it any more.
 */
export const isClaimOwner = (dispatch: ProviderDispatch) =>
  dispatch.access === 'OWNER' && dispatch.claimedByMe
/** V1.11: only a claimed service with someone executing it can be confirmed as delivered. */
export const canDeliver = (
  dispatch: ProviderDispatch,
  active: DeliveryAssignment | null,
) => canRelease(dispatch) && active !== null
