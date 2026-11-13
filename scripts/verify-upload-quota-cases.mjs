// Runs only inside verify-simple-driver-registration's disposable Nest/PostgreSQL setup.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { expect } from '@playwright/test'

export async function verifyUploadQuota({
  service,
  db,
  storage,
  actor,
  identity,
  unit,
  image,
  page,
  web,
  apiCall,
}) {
  const checks = []
  const revision = async (id) =>
    (await db.verificationCase.findUniqueOrThrow({ where: { id } })).revision
  const create = async (id, category) =>
    service.upload(actor, randomUUID(), id, {
      expectedVersion: await revision(id),
      category,
    })
  const attachment = (id) =>
    db.verificationAttachment.findUniqueOrThrow({ where: { id } })
  const complete = async (id, upload, bytes = image) => {
    const row = await attachment(upload.id)
    await storage.write(row.quarantineKey, bytes)
    return service.complete(actor, randomUUID(), id, row.id, await revision(id))
  }
  assert.equal(service.requirements().fileLimitMode, 'VALIDATED')

  // Existing historical exhaustion: ten actual upload records, including expired, failed and removed attempts.
  for (let i = 0; i < 10; i++) {
    const upload = await create(
      identity.id,
      ['FACE_PHOTO', 'INE_FRONT', 'INE_BACK', 'LICENSE'][i % 4],
    )
    if (i < 4) {
      await db.verificationAttachment.update({
        where: { id: upload.id },
        data: { expiresAt: new Date(0) },
      })
      await assert.rejects(
        service.complete(
          actor,
          randomUUID(),
          identity.id,
          upload.id,
          await revision(identity.id),
        ),
        /VERIFICATION_UPLOAD_EXPIRED/,
      )
    } else if (i < 6) {
      await assert.rejects(
        complete(identity.id, upload, Buffer.from('invalid synthetic image')),
        /VERIFICATION_FILE_INVALID/,
      )
    } else if (i < 8) {
      await assert.rejects(
        service.complete(
          actor,
          randomUUID(),
          identity.id,
          upload.id,
          await revision(identity.id),
        ),
        /STORAGE_UNAVAILABLE/,
      )
    } else {
      await service.removeAttachment(
        actor,
        randomUUID(),
        identity.id,
        upload.id,
        await revision(identity.id),
      )
    }
  }
  const history = await db.verificationAttachment.findMany({
    where: { caseId: identity.id },
    orderBy: { id: 'asc' },
  })
  assert.equal(history.length, 10)
  assert.equal(history.filter((a) => a.status === 'VALIDATED').length, 0)
  await page.goto(web + '/verification/cases/' + identity.id)
  await expect(
    page.getByText(
      'Las cargas incompletas y las imágenes retiradas no consumen cupo.',
    ),
  ).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: image,
  })
  const uploadButton = page.getByRole('button', {
    name: 'Cargar imagen sintética',
    exact: true,
  })
  await expect(uploadButton).toBeEnabled()
  await uploadButton.click()
  await expect(
    page.getByText('Carga confirmada: synthetic.png.', { exact: true }),
  ).toBeVisible()
  const valid = await db.verificationAttachment.findFirstOrThrow({
    where: { caseId: identity.id, status: 'VALIDATED' },
  })
  assert.equal(
    await db.verificationAttachment.count({ where: { caseId: identity.id } }),
    11,
  )
  assert.deepEqual(
    await db.verificationAttachment.findMany({
      where: { id: { in: history.map((a) => a.id) } },
      orderBy: { id: 'asc' },
    }),
    history,
  )
  checks.push(
    'Existing ten expired/invalid/missing/removed attempts: real mobile detail UI uploads an eleventh record; all historical rows unchanged',
  )

  // A failed replacement must never remove the usable image.
  const replacement = await create(identity.id, 'FACE_PHOTO')
  await assert.rejects(
    complete(identity.id, replacement, Buffer.from('invalid replacement')),
    /VERIFICATION_FILE_INVALID/,
  )
  assert.deepEqual(await attachment(valid.id), valid)
  assert.equal((await storage.read(valid.objectKey)).length, valid.bytes)
  checks.push(
    'Invalid replacement preserves the valid attachment, hash and stored bytes',
  )

  // Nine genuine validated images and two racing completions can consume only one remaining slot.
  for (let i = 0; i < 9; i++)
    await complete(unit.id, await create(unit.id, 'REGISTRATION_CARD'))
  const a = await create(unit.id, 'REGISTRATION_CARD')
  const b = await create(unit.id, 'REGISTRATION_CARD')
  for (const upload of [a, b])
    await storage.write((await attachment(upload.id)).quarantineKey, image)
  const version = await revision(unit.id)
  const keyA = randomUUID(),
    keyB = randomUUID()
  let releaseRead, reachedRead
  const blockedRead = new Promise((resolve) => {
    reachedRead = resolve
  })
  const resumeRead = new Promise((resolve) => {
    releaseRead = resolve
  })
  const read = storage.read
  const key = (await attachment(a.id)).quarantineKey
  storage.read = async function (requested, ...args) {
    if (requested === key) {
      reachedRead()
      await resumeRead
    }
    return read.call(this, requested, ...args)
  }
  let resultA
  try {
    resultA = service.complete(actor, keyA, unit.id, a.id, version).then(
      () => 'unexpected success',
      (e) => e.message,
    )
    await Promise.race([
      blockedRead,
      resultA.then((result) => {
        throw new Error(
          'Completion ended before the controlled race: ' + result,
        )
      }),
    ])
    await service.complete(actor, keyB, unit.id, b.id, version)
    releaseRead()
    assert.match(await resultA, /VERIFICATION_VERSION_CONFLICT/)
  } finally {
    releaseRead()
    if (resultA) await resultA
    storage.read = read
  }
  assert.equal(
    await db.verificationAttachment.count({
      where: { caseId: unit.id, status: 'VALIDATED' },
    }),
    10,
  )
  const capped = await apiCall(`/verification-cases/${unit.id}/uploads`, {
    expectedVersion: await revision(unit.id),
    category: 'REGISTRATION_CARD',
  })
  assert.equal(capped.status, 409)
  assert.equal(capped.body.code, 'VERIFICATION_FILE_LIMIT')
  const cappedCompletion = await apiCall(
    `/verification-cases/${unit.id}/uploads/${a.id}/complete`,
    { expectedVersion: await revision(unit.id) },
  )
  assert.equal(cappedCompletion.status, 409)
  assert.equal(cappedCompletion.body.code, 'VERIFICATION_FILE_LIMIT')
  // Applied receipt remains replayable at full capacity; no duplicate validation event.
  const replay = await service.complete(actor, keyB, unit.id, b.id, version)
  assert.equal(replay.id, b.id)
  assert.equal(
    await db.verificationEvent.count({
      where: { target: unit.id, kind: 'COMPLETE_UPLOAD' },
    }),
    10,
  )
  checks.push(
    'Concurrent completions stop at ten valid images; create/complete reject excess over HTTP; applied replay remains idempotent',
  )

  // Real withdrawal frees a slot but keeps the immutable normalized file and audit history.
  const saved = await db.verificationAttachment.findMany({
    where: { caseId: unit.id, status: 'VALIDATED' },
  })
  const savedBytes = new Map(
    await Promise.all(
      saved.map(async (row) => [row.id, await storage.read(row.objectKey)]),
    ),
  )
  for (const row of saved)
    await service.removeAttachment(
      actor,
      randomUUID(),
      unit.id,
      row.id,
      await revision(unit.id),
    )
  const newlyAllowed = await apiCall(`/verification-cases/${unit.id}/uploads`, {
    expectedVersion: await revision(unit.id),
    category: 'REGISTRATION_CARD',
  })
  assert.equal(newlyAllowed.status, 201)
  for (const row of saved) {
    assert.deepEqual(await attachment(row.id), { ...row, status: 'REMOVED' })
    assert((await storage.read(row.objectKey)).equals(savedBytes.get(row.id)))
  }
  checks.push(
    'Ten retired valid images release capacity without deleting historical rows or image bytes',
  )
  await page.goto(web + '/driver/onboarding')
  await expect(
    page.getByRole('heading', { name: 'Tus fotos', exact: true }),
  ).toBeVisible()
  const pending = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'INE: frente', exact: true }),
  })
  await expect(
    pending.getByText('Volver a tomar o elegir foto', { exact: true }),
  ).toBeVisible()
  await expect(pending.locator('input[type=file]')).toBeEnabled()
  const savedCard = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: 'Fotografía de rostro',
      exact: true,
    }),
  })
  await expect(savedCard.getByText('Guardada', { exact: true })).toBeVisible()
  await expect(savedCard.getByText(/Esta carga quedó incompleta/)).toHaveCount(
    0,
  )
  checks.push(
    'Reloaded assistant offers an explicit new selection for incomplete uploads and still shows the valid photo as saved',
  )
  return { checks, historicalIdentityIds: history.map((a) => a.id) }
}
