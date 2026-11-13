import type { DeclarationOption, MovementContext, MovementParty } from './types'

const kinds = ['DRIVER', 'PROVIDER', 'ORIGIN', 'RECIPIENT', 'EXTERNAL']
const concepts = [
  'SHIPPING_FEE',
  'GOODS',
  'COURIER_ADVANCE',
  'REFUND',
  'DIFFERENCE',
]
const row = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const id = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const date = (v: unknown) =>
  typeof v === 'string' &&
  /^\d{4}-\d\d-\d\dT/.test(v) &&
  Number.isFinite(Date.parse(v))
const nullableText = (v: unknown) => v === null || typeof v === 'string'
export function validMovementContext(v: unknown): v is MovementContext {
  if (
    !row(v) ||
    v.schemaVersion !== 1 ||
    typeof v.caseRevision !== 'string' ||
    !/^\d+$/.test(v.caseRevision) ||
    !date(v.asOf) ||
    !nullableText(v.nextPageToken)
  )
    return false
  if (
    !Array.isArray(v.parties) ||
    !v.parties.every(
      (p) =>
        row(p) &&
        id(p.partyId) &&
        kinds.includes(String(p.kind)) &&
        nullableText(p.label) &&
        typeof p.isOwn === 'boolean',
    )
  )
    return false
  if (
    !Array.isArray(v.declarationOptions) ||
    !v.declarationOptions.every(
      (o) =>
        row(o) &&
        [
          'obligationId',
          'fromPartyId',
          'toPartyId',
          'beneficiaryPartyId',
        ].every((k) => id(o[k])) &&
        concepts.includes(String(o.concept)) &&
        o.currency === 'MXN',
    )
  )
    return false
  const c = v.capabilities
  if (
    !row(c) ||
    typeof c.canDeclareMovement !== 'boolean' ||
    !nullableText(c.declareMovementReason) ||
    c.canReverseMovement !== false ||
    c.reverseMovementReason !== 'MOVEMENT_ADMIN_REVIEW_REQUIRED'
  )
    return false
  return (
    Array.isArray(v.movements) &&
    v.movements.every(
      (m) =>
        row(m) &&
        ['id', 'fromPartyId', 'toPartyId', 'beneficiaryPartyId'].every((k) =>
          id(m[k]),
        ) &&
        Array.isArray(m.declaredConcepts) &&
        m.declaredConcepts.every((x) => typeof x === 'string') &&
        typeof m.amount === 'string' &&
        /^\d+\.\d{2}$/.test(m.amount) &&
        m.currency === 'MXN' &&
        date(m.occurredAt) &&
        date(m.recordedAt) &&
        ['DECLARED', 'ACCREDITED', 'RETRACTED'].includes(String(m.status)) &&
        typeof m.canDispute === 'boolean' &&
        nullableText(m.disputeReason) &&
        m.canReverse === false &&
        m.reverseReason === 'MOVEMENT_ADMIN_REVIEW_REQUIRED',
    )
  )
}
const kindLabels: Record<MovementParty['kind'], string> = {
  DRIVER: 'Conductor',
  PROVIDER: 'Proveedor',
  ORIGIN: 'Origen',
  RECIPIENT: 'Receptor',
  EXTERNAL: 'Parte externa',
}
export const partyLabel = (p: MovementParty) =>
  kindLabels[p.kind] + (p.isOwn ? ' (parte propia)' : '')
export function optionLabel(
  o: DeclarationOption,
  context: MovementContext,
): string | null {
  const names: string[] = []
  for (const field of [
    'fromPartyId',
    'toPartyId',
    'beneficiaryPartyId',
  ] as const) {
    const party = context.parties.find((p) => p.partyId === o[field])
    if (
      !party ||
      context.parties.some(
        (p) =>
          p.partyId !== party.partyId && partyLabel(p) === partyLabel(party),
      )
    )
      return null
    names.push(partyLabel(party))
  }
  return `${o.concept}: ${names[0]} → ${names[1]} · Beneficiario: ${names[2]} · MXN`
}
export function exactPositiveMoney(value: string): string {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim())
  if (!match)
    throw Error(
      'Introduce un importe positivo con hasta dos decimales, sin separadores de miles ni redondeos.',
    )
  const whole = match[1].replace(/^0+(?=\d)/, ''),
    cents = (match[2] ?? '').padEnd(2, '0')
  if (whole.length > 12 || (whole === '0' && cents === '00'))
    throw Error(
      'El importe debe ser mayor que cero y no superar 999999999999.99 MXN.',
    )
  return whole + '.' + cents
}
export function declarationBody(
  context: MovementContext,
  selected: DeclarationOption,
  amount: string,
  occurredAt: string,
  startedAt: string,
) {
  if (
    !context.capabilities.canDeclareMovement ||
    context.capabilities.declareMovementReason !== null
  )
    throw Error('La declaración no está habilitada.')
  const option = context.declarationOptions.find((o) =>
    (Object.keys(o) as (keyof DeclarationOption)[]).every(
      (k) => o[k] === selected[k],
    ),
  )
  if (!option || !optionLabel(option, context))
    throw Error(
      'La combinación no está autorizada o la contraparte es ambigua. Aporta información para revisión.',
    )
  const timestamp = Date.parse(occurredAt)
  if (
    !Number.isFinite(timestamp) ||
    timestamp < Date.parse(startedAt) ||
    timestamp > Date.now()
  )
    throw Error(
      'La fecha física debe estar dentro del segmento conocido y no ser futura.',
    )
  return {
    expectedCaseRevision: context.caseRevision,
    physicalMovementId: crypto.randomUUID(),
    sourceKind: 'DECLARATION',
    fromPartyId: option.fromPartyId,
    toPartyId: option.toPartyId,
    beneficiaryPartyId: option.beneficiaryPartyId,
    declaredConcepts: [option.concept],
    amount: exactPositiveMoney(amount),
    currency: 'MXN',
    occurredAt: new Date(timestamp).toISOString(),
  }
}
