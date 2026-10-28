// Matches assistance.persistence.hash/wire; never used for server snapshotHash.
export async function sha256(bytes: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('')
}
export function canonical(value: unknown): string {
  const wire = JSON.parse(
    JSON.stringify(value, (k, v) =>
      typeof v === 'bigint'
        ? String(v)
        : ['amount', 'expectedAmount'].includes(k) &&
            typeof v === 'string' &&
            /^\d+(\.\d{1,2})?$/.test(v)
          ? v.split('.')[0] + '.' + (v.split('.')[1] ?? '').padEnd(2, '0')
          : v,
    ),
  )
  return JSON.stringify(wire, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  )
}
export const hash = (v: unknown) =>
  sha256(new TextEncoder().encode(canonical(v)).buffer)
export const concepts = [
  'SHIPPING_FEE',
  'GOODS',
  'COURIER_ADVANCE',
  'REFUND',
  'DIFFERENCE',
] as const
export const noObligationsTerms = (assignmentId: string) => ({
  assignmentId,
  concepts,
  noPickup: true,
  noCollection: true,
  noAdvance: true,
  noObligations: true,
})
export const economicTerms = (r: Record<string, unknown>) =>
  Object.fromEntries(
    [
      'id',
      'caseId',
      'concept',
      'physicalMovementId',
      'sourceKind',
      'sourceRef',
      'fromPartyId',
      'toPartyId',
      'beneficiaryPartyId',
      'debtorPartyId',
      'creditorPartyId',
      'knowledge',
      'expectedAmount',
      'amount',
      'currency',
      'occurredAt',
      'termsRef',
      'ordinal',
      'declaredConcepts',
    ]
      .filter((k) => r[k] !== undefined)
      .map((k) => [k, r[k]]),
  )
