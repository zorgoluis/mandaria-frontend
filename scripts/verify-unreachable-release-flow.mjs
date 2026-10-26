import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { expect } from '@playwright/test'

export async function verifyUnreachableRelease({
  http,
  token,
  other,
  sameActor,
  request,
  page,
  origin,
  action,
  review,
  acknowledge,
}) {
  const fixture = await request('unreachableReleaseFixture')
  const caseId = randomUUID(),
    base = '/admin/fleet-assistance-cases/' + caseId
  await http(
    '/admin/fleet-assistance-cases',
    token,
    'POST',
    {
      caseId,
      assignmentId: fixture.assignmentId,
      reason: 'ACCESS_LOST',
      description:
        'Conductor sintético no localizable; liberación con dos aprobaciones',
    },
    randomUUID(),
    201,
  )
  const command = async (
    suffix,
    body,
    status = 200,
    actor = token,
    key = randomUUID(),
  ) =>
    http(
      base + '/' + suffix,
      actor,
      'POST',
      {
        expectedCaseRevision: (await http(base, actor)).summary.revision,
        ...body,
      },
      key,
      status,
    )
  const refs = async (section) => {
    const items = []
    let cursor
    do {
      const p = await http(
        base +
          '/administrative-references/' +
          section +
          (cursor ? '?pageToken=' + encodeURIComponent(cursor) : ''),
        token,
      )
      items.push(...p.items)
      cursor = p.nextPageToken
    } while (cursor)
    return items
  }
  const stop = (await refs('stops')).find((s) => s.type === 'PICKUP')
  assert(stop?.registrationKinds.includes('ORIGIN'))
  const originParty = (
    await command('parties', {
      kind: 'ORIGIN',
      label: 'Origen sintético UNREACHABLE',
      contactSourceRef: stop.contactSourceRef,
    })
  ).result.partyId
  const parties = await refs('parties'),
    driver = parties.find((p) => p.kind === 'DRIVER'),
    originRef = parties.find((p) => p.id === originParty)
  const evidenceIds = []
  const verify = async (party, outcome) => {
    assert(party.methods.includes('REGISTERED_CHANNEL_CALLBACK'))
    const contribution = await command('contributions', {
      partyId: party.id,
      text:
        outcome === 'UNREACHABLE'
          ? 'Acta sintética: intentos de contacto por canal registrado sin respuesta. No llamada real.'
          : 'Acta sintética de origen: canal comprobado; sin recogida, cobro, anticipo ni obligaciones. No llamada real.',
    })
    const source = (await refs('evidence-sources')).find(
      (s) => s.sourceRef.id === contribution.result.contributionId,
    )
    assert.equal(source.partyId, party.id)
    const evidence = (
      await command('evidence', {
        kind: source.kind,
        sourceRef: source.sourceRef,
        observedAt: new Date().toISOString(),
      })
    ).result.evidenceId
    evidenceIds.push(evidence)
    return (
      await command('identity-verifications', {
        partyId: party.id,
        method: 'REGISTERED_CHANNEL_CALLBACK',
        outcome,
        contactSourceRef: party.contactSourceRef,
        verificationNoteEvidenceId: evidence,
        occurredAt: new Date().toISOString(),
      })
    ).result.verificationId
  }
  const originVerification = await verify(originRef, 'VERIFIED')
  const concepts = [
    'SHIPPING_FEE',
    'GOODS',
    'COURIER_ADVANCE',
    'REFUND',
    'DIFFERENCE',
  ]
  const terms = {
    assignmentId: fixture.assignmentId,
    concepts,
    noPickup: true,
    noCollection: true,
    noAdvance: true,
    noObligations: true,
  }
  const termsHash = createHash('sha256')
    .update(
      JSON.stringify(terms, (_k, v) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(
              Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
            )
          : v,
      ),
    )
    .digest('hex')
  const confirmations = []
  for (const assertion of [
    'NO_PICKUP',
    'NO_COLLECTION',
    'NO_ADVANCE',
    'NO_OBLIGATIONS',
  ])
    confirmations.push(
      (
        await command('confirmations', {
          partyId: originParty,
          verificationId: originVerification,
          assertion,
          targetType: 'CASE',
          targetId: caseId,
          termsHash,
          evidenceIds,
          observedAt: new Date().toISOString(),
        })
      ).result.confirmationId,
    )
  const proposeInventory = async () =>
    (
      await command('proposals', {
        type: 'VERIFY_NO_OBLIGATIONS',
        assignmentId: fixture.assignmentId,
        occurredAt: new Date().toISOString(),
        reason: 'Inventario positivo sintético de conductor no localizable',
        evidenceIds,
        confirmationIds: confirmations,
        payload: {
          inventoryEvidenceIds: evidenceIds,
          coveredConcepts: concepts,
        },
      })
    ).result
  const frozen = (p) => ({
    expectedProposalRevision: p.proposalRevision,
    snapshotHash: p.snapshotHash,
  })
  const approve = (p, actor) =>
    command(
      'proposals/' + p.proposalId + '/reviews',
      {
        ...frozen(p),
        decision: 'APPROVE',
        reason: 'Revisión sintética de evidencia y disponibilidad',
      },
      200,
      actor,
    )
  const apply = (p, status = 200) =>
    command('proposals/' + p.proposalId + '/apply', frozen(p), status)
  const missingProof = await proposeInventory()
  await approve(missingProof, other)
  assert.equal((await apply(missingProof, 409)).code, 'COUNTERPARTY_UNVERIFIED')
  await verify(driver, 'UNREACHABLE')
  const inventory = await proposeInventory()
  await approve(inventory, other)
  await apply(inventory)
  assert.equal(
    (await http(base, token)).summary.economicState,
    'SIN_OBLIGACIONES_VERIFICADAS',
  )
  const invariants = () =>
    request('releaseInvariants', { assignmentId: fixture.assignmentId, caseId })
  const before = await invariants()
  assert.equal(before.assignmentStatus, 'ACTIVE')
  assert.equal(before.dispatchStatus, 'CLAIMED')
  for (const k of [
    'releases',
    'refunds',
    'obligations',
    'movements',
    'shipping',
  ])
    assert.equal(before[k], 0)
  await page.goto(origin + '/admin/fleet-assistance/' + caseId)
  await action('PROPOSE')
  await page.getByLabel('Tipo de propuesta').selectOption('ASSISTED_RELEASE')
  await page.getByLabel('Fuente de acreditación').selectOption('NEW_ACTION')
  await page
    .getByLabel('Disponibilidad', { exact: true })
    .selectOption('UNREACHABLE')
  await page
    .getByLabel('Motivo', { exact: true })
    .fill(
      'Liberación sintética de conductor no localizable con doble aprobación',
    )
  await page
    .getByLabel('Fecha física del hecho')
    .fill(new Date().toISOString().slice(0, 19).replace(/:00$/, ''))
  await page.getByLabel('Evidencias', { exact: true }).selectOption(evidenceIds)
  await page
    .getByLabel('Confirmaciones', { exact: true })
    .selectOption(confirmations)
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/proposals') && r.request().method() === 'POST',
  )
  await review()
  const p = (await (await response).json()).result
  await acknowledge()
  assert.equal(p.requiredApprovals, 2)
  assert.equal((await apply(p, 409)).code, 'APPROVALS_REQUIRED')
  const first = await approve(p, token)
  assert.equal(first.result.effectiveApprovalCount, 1)
  assert.equal(first.result.proposalStatus, 'DRAFT')
  assert.equal((await apply(p, 409)).code, 'APPROVALS_REQUIRED')
  const repeated = await approve(p, sameActor)
  assert.equal(repeated.result.effectiveApprovalCount, 1)
  assert.equal(repeated.result.proposalStatus, 'DRAFT')
  assert.equal((await apply(p, 409)).code, 'APPROVALS_REQUIRED')
  assert.deepEqual(await invariants(), before)
  const second = await approve(p, other)
  assert.equal(second.result.effectiveApprovalCount, 2)
  assert.equal(second.result.proposalStatus, 'READY')
  const path = base + '/proposals/' + p.proposalId + '/apply',
    key = randomUUID()
  const body = {
    expectedCaseRevision: (await http(base, token)).summary.revision,
    ...frozen(p),
  }
  const applied = await http(path, token, 'POST', body, key)
  assert.equal(applied.result.operationalState, 'LIBERADO')
  assert.equal(
    applied.result.effectRefs.filter((e) => e.kind === 'ASSIGNMENT').length,
    1,
  )
  assert.equal(
    applied.result.effectRefs.filter((e) => e.kind === 'REFUND').length,
    1,
  )
  const receipt = await http(
    '/fleet-assistance-attempts/' +
      key +
      '?caseId=' +
      caseId +
      '&operation=APPLY',
    token,
  )
  assert.equal(receipt.status, 'APPLIED')
  assert.equal(receipt.receipt.result.resolutionId, applied.result.resolutionId)
  assert.deepEqual(await http(path, token, 'POST', body, key), applied)
  assert.equal((await apply(p, 409)).code, 'PROPOSAL_STALE')
  const after = await invariants()
  assert.equal(after.assignmentStatus, 'CANCELLED')
  assert.equal(after.dispatchStatus, 'OPEN')
  assert.equal(after.refunds, 1)
  for (const k of ['releases', 'obligations', 'movements', 'shipping'])
    assert.equal(after[k], 0)
  assert.equal(
    (await http(base + '/proposals/' + p.proposalId, token)).status,
    'APPLIED',
  )
  assert.equal((await http(base, token)).summary.operationalState, 'LIBERADO')
  await page.getByRole('button', { name: 'Actualizar expediente' }).click()
  await expect(
    page.getByText('LIBERADO', { exact: true }).first(),
  ).toBeVisible()
  return {
    proofSource: 'NEW_ACTION',
    availability: 'UNREACHABLE',
    syntheticHumanStatements: true,
    driverUnreachable: true,
    originConfirmations: 4,
    inventoryVerified: true,
    missingUnreachableProofRejected: true,
    requiredApprovals: 2,
    zeroAndOneApprovalRejected: true,
    sameIdentityDifferentSessionCountsOnce: true,
    twoDistinctAdminsReady: true,
    proposalFromBrowser: true,
    applied: true,
    attemptLookup: true,
    exactReplay: true,
    newKeyReapplyRejected: true,
    before,
    after,
  }
}
