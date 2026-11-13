import type { ReferenceCatalog } from './admin-references'
import type { Options } from './form-model'
import type { CaseDetail } from './types'
import { rows } from './form-model'

export function referenceOptions(
  c: ReferenceCatalog,
  value: Record<string, unknown>,
  detail: CaseDetail,
  evidenceParties: Record<string, string> = {},
): Options {
  const parties = c.parties.items.map((p) => ({
    value: p.id,
    label: `${p.label} · ${p.kind}`,
  }))
  const party = c.parties.items.find((p) => p.id === value.partyId)
  const shipping = c['shipping-declarations'].items.find(
    (p) => p.id === value.shippingReference,
  )
  const options: Options = Object.fromEntries(
    [
      'partyId',
      'fromPartyId',
      'toPartyId',
      'beneficiaryPartyId',
      'debtorPartyId',
      'creditorPartyId',
    ].map((k) => [k, parties]),
  )
  options.method = (party?.methods ?? []).map((value) => ({
    value,
    label: value,
  }))
  options.participationId = c.participations.items.map((p, i) => ({
    value: p.id,
    label: `Participación histórica ${i + 1} · ${p.startedAt}`,
  }))
  options.newSessionId = c['recovery-sessions'].items
    .filter((s) => Date.parse(s.expiresAt) > Date.now())
    .map((s, i) => ({
      value: s.newSessionId,
      label: `Sesión ${i + 1} · vence ${s.expiresAt}`,
    }))
  options.existingReceiptId = c['release-receipts'].items.map((s, i) => ({
    value: s.existingReceiptId,
    label: `Liberación original ${i + 1} · ${s.createdAt}`,
  }))
  options.stopReference = c.stops.items
    .filter((s) => s.registrationKinds.includes(value.kind as 'ORIGIN'))
    .map((s) => ({ value: s.id, label: `${s.type} · parada ${s.sequence}` }))
  options.shippingReference = c['shipping-declarations'].items.map((s, i) => ({
    value: s.id,
    label: `Declaración original ${i + 1} · ${s.amount} ${s.currency} · ${s.occurredAt}`,
  }))
  if (value.sourceKind === 'SHIPPING_DECLARATION')
    options.toPartyId = parties.filter((p) =>
      shipping?.toPartyIds.includes(p.value),
    )
  options.evidenceReference = c['evidence-sources'].items
    .filter(
      (s) =>
        s.kind === value.kind &&
        (s.kind !== 'VERIFIED_CONTACT_NOTE' ||
          (!!value.referenceParty && s.partyId === value.referenceParty)),
    )
    .map((s, i) => ({
      value: s.id,
      label: `${s.sourceRef.type} · fuente ${i + 1}`,
    }))
  options.referenceParty = parties
  // Join only the source id actually returned on the evidence with a canonical
  // same-party note. A freshly obtained receipt supplies an in-memory fallback.
  options.verificationNoteEvidenceId = rows(detail, 'evidence')
    .filter(
      (e) =>
        e.status === 'AVAILABLE' &&
        e.kind === 'VERIFIED_CONTACT_NOTE' &&
        (evidenceParties[`${detail.summary.id}:${e.id}`] === value.partyId ||
          (typeof e.sourceRef === 'object' &&
            e.sourceRef !== null &&
            c['evidence-sources'].items.some(
              (s) =>
                s.partyId === value.partyId &&
                s.sourceRef.type === 'CONTACT_VERIFICATION_NOTE' &&
                s.sourceRef.id === (e.sourceRef as { id?: string }).id,
            ))),
    )
    .map((e) => ({ value: e.id, label: 'Acta de la parte seleccionada' }))
  return options
}

export function bindReferences(
  c: ReferenceCatalog,
  operation: string,
  body: Record<string, unknown>,
  value: Record<string, unknown>,
  detail: CaseDetail,
  evidenceParties: Record<string, string> = {},
) {
  if (
    Object.values(c).some(
      (p) =>
        !p.commandsEnabled ||
        p.caseRevision !== detail.summary.revision ||
        (detail.materialRevision !== undefined &&
          p.materialRevision !== detail.materialRevision),
    )
  )
    throw Error(
      'Referencias deshabilitadas u obsoletas. Recarga el expediente y revisa.',
    )
  const requireValue = <T>(v: T | undefined, message: string): T => {
    if (!v) throw Error(message)
    return v
  }
  const options = referenceOptions(c, value, detail, evidenceParties)
  if (operation === 'VERIFY_IDENTITY') {
    const p = requireValue(
      c.parties.items.find(
        (p) =>
          p.id === body.partyId &&
          p.contactSourceRef &&
          p.methods.includes(body.method as 'AUTHENTICATED_SELF'),
      ),
      'La parte no ofrece un canal y método compatibles.',
    )
    if (
      !options.verificationNoteEvidenceId.some(
        (o) => o.value === body.verificationNoteEvidenceId,
      )
    )
      throw Error('Selecciona un acta autorizada de esta misma parte.')
    body.contactSourceRef = p.contactSourceRef
  }
  if (
    operation === 'REGISTER_PARTY' &&
    !['DRIVER', 'PROVIDER'].includes(String(body.kind))
  ) {
    body.contactSourceRef = requireValue(
      c.stops.items.find(
        (s) =>
          s.id === value.stopReference &&
          s.registrationKinds.includes(body.kind as 'ORIGIN'),
      ),
      'Selecciona una parada y un tipo de registro autorizado.',
    ).contactSourceRef
  }
  if (operation === 'RECORD_OBLIGATION')
    requireValue(
      c.participations.items.find((p) => p.id === body.participationId),
      'Selecciona la participación histórica; no la asignación.',
    )
  if (operation === 'RECORD_EVIDENCE' && body.kind !== 'PRIVATE_IMAGE') {
    const source = requireValue(
      c['evidence-sources'].items.find(
        (s) =>
          s.id === value.evidenceReference &&
          s.kind === body.kind &&
          (s.kind !== 'VERIFIED_CONTACT_NOTE' ||
            (!!value.referenceParty && s.partyId === value.referenceParty)),
      ),
      'Selecciona una fuente autorizada para esta parte y tipo de evidencia.',
    )
    body.kind = source.kind
    body.sourceRef = { ...source.sourceRef }
  }
  if (
    operation === 'DECLARE_MOVEMENT' &&
    body.sourceKind === 'SHIPPING_DECLARATION'
  ) {
    const source = requireValue(
      c['shipping-declarations'].items.find(
        (s) =>
          s.id === value.shippingReference &&
          s.toPartyIds.includes(String(body.toPartyId)),
      ),
      'Selecciona la declaración original y un receptor permitido.',
    )
    Object.assign(body, {
      sourceRef: source.sourceRef,
      amount: source.amount,
      currency: source.currency,
      occurredAt: source.occurredAt,
      declaredConcepts: [...source.declaredConcepts],
    })
  }
  if (operation === 'PROPOSE') {
    const payload = body.payload as Record<string, unknown>
    if (body.type === 'ACCESS_RECOVERED')
      requireValue(
        c['recovery-sessions'].items.find(
          (s) =>
            s.newSessionId === payload.newSessionId &&
            Date.parse(s.expiresAt) > Date.now(),
        ),
        'La sesión ya no está vigente. Recarga y revisa; seleccionar no recupera acceso.',
      )
    if (
      body.type === 'ASSISTED_RELEASE' &&
      payload.proofSource === 'EXISTING_RELEASE'
    )
      requireValue(
        c['release-receipts'].items.find(
          (s) =>
            s.existingReceiptId === payload.existingReceiptId &&
            s.assignmentId === detail.summary.assignmentId,
        ),
        'Selecciona el recibo original de liberación de la asignación ancla.',
      )
  }
  for (const key of [
    'partyId',
    'fromPartyId',
    'toPartyId',
    'beneficiaryPartyId',
    'debtorPartyId',
    'creditorPartyId',
  ])
    if (
      body[key] !== undefined &&
      !c.parties.items.some((p) => p.id === body[key])
    )
      throw Error('Parte fuera del contexto autorizado.')
  for (const key of [
    'stopReference',
    'shippingReference',
    'evidenceReference',
    'referenceParty',
  ])
    delete body[key]
}
