import { remaining } from './format'
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
