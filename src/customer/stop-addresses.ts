import type { DirectPrequoteResponse, PrequoteStopAddress } from './contract'

const MAX = 300
const clean = (value: unknown) =>
  typeof value === 'string' && value.trim() && value.trim().length <= MAX
    ? value.trim()
    : undefined

/** Snapshot for the prequote body: only real address text, by stop sequence. */
export function stopAddresses(
  values: (string | undefined)[],
): PrequoteStopAddress[] {
  return values.flatMap((value, i) => {
    const address = clean(value)
    return address ? [{ sequence: i + 1, address }] : []
  })
}

/** Server snapshot for the stop at `index`; anything malformed is ignored. */
export function snapshotAddress(
  prequote: Pick<DirectPrequoteResponse, 'conditions' | 'stopAddresses'>,
  index: number,
) {
  const sequence = prequote.conditions.stops[index]?.sequence
  if (sequence === undefined || !Array.isArray(prequote.stopAddresses)) return
  const matches = prequote.stopAddresses.filter((s) => s?.sequence === sequence)
  return matches.length === 1 ? clean(matches[0].address) : undefined
}
