/** publicVersion belongs to one MDR and is a decimal string, never a JS float. */
export function retainCustomerSnapshot(
  previous: unknown,
  incoming: unknown,
): unknown {
  if (
    !previous ||
    !incoming ||
    typeof previous !== 'object' ||
    typeof incoming !== 'object'
  )
    return incoming
  if (
    !('publicId' in previous) ||
    !('publicId' in incoming) ||
    previous.publicId !== incoming.publicId ||
    !('publicVersion' in previous) ||
    !('publicVersion' in incoming)
  )
    return incoming
  if (
    typeof previous.publicVersion !== 'string' ||
    typeof incoming.publicVersion !== 'string' ||
    !/^\d+$/.test(previous.publicVersion) ||
    !/^\d+$/.test(incoming.publicVersion)
  )
    return incoming
  return BigInt(previous.publicVersion) > BigInt(incoming.publicVersion)
    ? previous
    : incoming
}
