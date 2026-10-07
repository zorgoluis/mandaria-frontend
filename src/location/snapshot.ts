import type { LocationView } from './types'
export const terminalLocation = (v: LocationView) =>
  !!v.progress.terminalOutcome ||
  ['DELIVERED', 'RETURNED', 'CANCELLED', 'EXPIRED'].includes(v.progress.status)
export const decimal = (v: string) => /^\d+$/.test(v)
export function versions(v: LocationView) {
  const values = [
    v.progress.publicVersion,
    v.location.locationVersion,
    v.location.assignmentGeneration,
  ]
  if (!values.every(decimal))
    throw new Error('Fotografía de seguimiento no válida.')
  return values.map(BigInt)
}
/** Entire snapshots only: never combine a progress record with another GPS record. */
export function retainLocation(
  old: LocationView | undefined,
  next: LocationView,
): LocationView {
  const n = versions(next)
  if (!old) return next
  if (old.publicId !== next.publicId)
    throw new Error('La solicitud de seguimiento cambió.')
  const p = versions(old)
  if (terminalLocation(old)) return old
  if (n.some((value, i) => value < p[i])) {
    // Conflicting watermarks: hide the old sample if ANY newer axis invalidates it.
    if (n.some((value, i) => value > p[i])) return withoutSample(old)
    return old
  }
  return next
}
export function withoutSample(
  v: LocationView,
  reason = v.location.unavailableReason,
): LocationView {
  return {
    ...v,
    location: {
      ...v.location,
      sample: null,
      availability: 'UNAVAILABLE',
      unavailableReason: reason,
    },
  }
}
/** Monotonic watermarks survive a crossed/incoherent response without splicing records. */
export class LocationSequence {
  private high: bigint[] = []
  private snapshot?: LocationView
  accept(next: LocationView): LocationView {
    const values = versions(next)
    if (this.snapshot && this.snapshot.publicId !== next.publicId)
      throw Error('Solicitud distinta')
    if (this.snapshot && terminalLocation(this.snapshot)) return this.snapshot
    const stale = values.some(
      (v, i) => this.high[i] !== undefined && v < this.high[i],
    )
    const newer = values.some(
      (v, i) => this.high[i] === undefined || v > this.high[i],
    )
    this.high = values.map((v, i) =>
      v > (this.high[i] ?? -1n) ? v : this.high[i],
    )
    if (stale && this.snapshot) {
      if (newer) this.snapshot = withoutSample(this.snapshot)
      return this.snapshot
    }
    this.snapshot = next
    return next
  }
  erase() {
    if (this.snapshot) this.snapshot = withoutSample(this.snapshot)
  }
}
export function usableSample(v: LocationView, now: number, recipient = false) {
  const s = v.location.sample
  const phases = recipient
    ? ['PICKED_UP', 'TO_DROPOFF', 'AT_DROPOFF']
    : ['TO_PICKUP', 'AT_PICKUP', 'PICKED_UP', 'TO_DROPOFF', 'AT_DROPOFF']
  if (
    !s ||
    v.location.availability !== 'AVAILABLE' ||
    terminalLocation(v) ||
    v.progress.attentionRequired ||
    v.progress.trackingMode !== 'DETAILED' ||
    v.progress.assignmentState !== 'ACTIVE' ||
    !phases.includes(v.progress.phase ?? '') ||
    !(now < Date.parse(s.eraseAfter)) ||
    !Number.isFinite(s.latitude) ||
    !Number.isFinite(s.longitude) ||
    Math.abs(s.latitude) > 90 ||
    Math.abs(s.longitude) > 180 ||
    !(s.accuracyMeters > 0 && s.accuracyMeters <= 100)
  )
    return null
  return s
}
