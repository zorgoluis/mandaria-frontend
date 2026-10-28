import type { CaseDetail, RecordRow, Schema } from './types'
export const labels: Record<string, string> = {
  stopReference: 'Parada con contacto registrado',
  shippingReference: 'Declaración de cobro original',
  evidenceReference: 'Fuente canónica de evidencia',
  referenceParty: 'Parte de la nota de verificación',
  existingReceiptId: 'Recibo original de liberación',
  userId: 'Usuario histórico',
  providerId: 'Proveedor histórico',
  CREATE: 'Solicitar asistencia',
  CONTRIBUTE: 'Aportar información',
  REGISTER_PARTY: 'Registrar parte',
  VERIFY_IDENTITY: 'Verificar identidad',
  RECORD_EVIDENCE: 'Registrar evidencia',
  CONFIRM: 'Registrar confirmación',
  REVOKE_SESSIONS: 'Revocar sesiones',
  RESTRICT: 'Registrar restricción',
  RECORD_OBLIGATION: 'Registrar obligación',
  DECLARE_MOVEMENT: 'Declarar movimiento',
  DISPUTE: 'Abrir disputa',
  PROPOSE: 'Preparar propuesta',
  REVIEW: 'Revisar propuesta',
  CANCEL_PROPOSAL: 'Cancelar propuesta',
  APPLY: 'Aplicar propuesta',
  CLOSE: 'Cerrar caso',
  REOPEN: 'Reabrir caso',
  UPLOAD_EVIDENCE: 'Reservar imagen',
  text: 'Información',
  reason: 'Motivo',
  description: 'Descripción',
  occurredAt: 'Fecha física del hecho',
  observedAt: 'Fecha de observación',
  partyId: 'Parte',
  verificationId: 'Verificación',
  evidenceIds: 'Evidencias',
  confirmationIds: 'Confirmaciones',
  obligationId: 'Obligación',
  movementId: 'Movimiento',
  amount: 'Importe MXN',
  expectedAmount: 'Importe esperado MXN',
  coveredAmount: 'Importe cubierto MXN',
  label: 'Nombre de referencia',
  kind: 'Tipo',
  type: 'Resolución',
  knowledge: 'Conocimiento',
  targetId: 'Registro original',
  replacementId: 'Registro de reemplazo',
  decision: 'Decisión',
  assertion: 'Hecho confirmado',
  sourceRef: 'Referencia privada del movimiento',
  termsRef: 'Referencia de términos',
  fromPartyId: 'Entregante',
  toPartyId: 'Receptor',
  beneficiaryPartyId: 'Beneficiario',
  debtorPartyId: 'Deudor',
  creditorPartyId: 'Acreedor',
  participationId: 'Participación histórica',
  inventoryEvidenceIds: 'Evidencias del inventario',
  receiverConfirmationId: 'Confirmación del receptor',
  newSessionId: 'Nueva sesión verificada',
  custodyResolutionId: 'Resolución física de custodia',
  contactSourceRef: 'Canal registrado',
  physicalMovementId: 'Movimiento físico',
  authorizationEvidenceId: 'Evidencia de autorización',
  proofSource: 'Fuente de acreditación',
  availability: 'Disponibilidad',
  incidentIdsToResolve: 'Incidencias que se resolverán',
  targetType: 'Tipo de registro',
  exceptionType: 'Excepción autorizada',
  disputeId: 'Disputa',
  restrictionId: 'Restricción',
  basisResolutionId: 'Resolución que satisface la causa',
  evidenceId: 'Evidencia',
  reverseAllocationIds: 'Asignaciones a revertir',
  confirmedMovementIds: 'Movimientos acreditados',
  counterpartyConfirmationIds: 'Confirmaciones de las contrapartes',
  allocations: 'Asignaciones por obligación',
  scope: 'Alcance',
  currency: 'Moneda',
  method: 'Método',
  outcome: 'Resultado',
  concept: 'Concepto',
  declaredConcepts: 'Conceptos declarados',
  ordinal: 'Orden',
  dimension: 'Dimensión',
  verificationNoteEvidenceId: 'Acta de verificación',
  supersedesId: 'Evidencia anterior',
  reversesMovementId: 'Movimiento original',
  sourceKind: 'Origen del movimiento',
  coveredConcepts: 'Conceptos cubiertos',
}
export type Options = Record<string, { value: string; label: string }[]>
export const rows = (d: CaseDetail, name: string): RecordRow[] =>
  d.collections?.[name as keyof NonNullable<CaseDetail['collections']>]
    ?.items ?? []
export function references(d: CaseDetail): Options {
  const map: Record<string, string> = {
    partyId: 'parties',
    fromPartyId: 'parties',
    toPartyId: 'parties',
    beneficiaryPartyId: 'parties',
    debtorPartyId: 'parties',
    creditorPartyId: 'parties',
    verificationId: 'verifications',
    verificationNoteEvidenceId: 'evidence',
    evidenceIds: 'evidence',
    evidenceId: 'evidence',
    inventoryEvidenceIds: 'evidence',
    authorizationEvidenceId: 'evidence',
    supersedesId: 'evidence',
    confirmationIds: 'confirmations',
    counterpartyConfirmationIds: 'confirmations',
    receiverConfirmationId: 'confirmations',
    obligationIds: 'obligations',
    obligationId: 'obligations',
    movementId: 'movements',
    confirmedMovementIds: 'movements',
    reversesMovementId: 'movements',
    disputeId: 'disputes',
    restrictionId: 'restrictions',
    basisResolutionId: 'resolutions',
    reverseAllocationIds: 'allocations',
  }
  return Object.fromEntries(
    Object.entries(map).map(([key, collection]) => [
      key,
      rows(d, collection)
        .filter((r) => collection !== 'evidence' || r.status === 'AVAILABLE')
        .map((r, i) => ({
          value: r.id,
          label:
            String(
              r.label ??
                r.concept ??
                r.assertion ??
                r.type ??
                r.cause ??
                r.kind ??
                collection,
            ) +
            ' · ' +
            String(r.amount ?? r.recordedAt ?? i + 1) +
            (r.status ? ' · ' + String(r.status) : ''),
        })),
    ]),
  )
}
export function variant(s: Schema): Schema {
  return s.anyOf?.find((v) => v.type !== 'null') ?? s
}
export function validate(s: Schema, value: unknown): boolean {
  if (s.oneOf) return s.oneOf.some((v) => validate(v, value))
  if (s.anyOf) return s.anyOf.some((v) => validate(v, value))
  if (Array.isArray(s.type))
    return s.type.some((t) => validate({ ...s, type: t }, value))
  if (s.const !== undefined && value !== s.const) return false
  if (s.enum && !s.enum.includes(String(value))) return false
  if (s.type === 'null') return value === null
  if (s.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false
    const r = value as Record<string, unknown>
    return (
      (s.required ?? []).every((k) => r[k] !== undefined) &&
      Object.entries(r).every(
        ([k, v]) => !!s.properties?.[k] && validate(s.properties[k], v),
      )
    )
  }
  if (s.type === 'array')
    return (
      Array.isArray(value) &&
      value.length >= (s.minItems ?? 0) &&
      value.length <= (s.maxItems ?? Infinity) &&
      value.every((v) => validate(s.items ?? {}, v)) &&
      new Set(value.filter((v) => typeof v === 'string')).size ===
        value.filter((v) => typeof v === 'string').length
    )
  if (s.type === 'string')
    return (
      typeof value === 'string' &&
      value.length >= (s.minLength ?? 0) &&
      value.length <= (s.maxLength ?? Infinity) &&
      (!s.pattern || new RegExp(s.pattern).test(value)) &&
      (!s.format ||
        s.format !== 'date-time' ||
        !Number.isNaN(Date.parse(value)))
    )
  if (s.type === 'integer' || s.type === 'number')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (s.type !== 'integer' || Number.isInteger(value)) &&
      value >= (s.minimum ?? -Infinity) &&
      value <= (s.maximum ?? Infinity)
    )
  return true
}
