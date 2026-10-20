// Real Web/API/SQL; seed preparation declared; only mail/storage transports simulated.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import {
  web,
  work,
  apiPort,
  webPort,
  prepareDatabase,
  stopDatabase,
  loadSource,
} from './retention-isolated-environment.mjs'
import { startBackend } from './retention-isolated-backend.mjs'
import { backendSnapshot, hashes } from './retention-contract-snapshot.mjs'
import { launchRepresentativeBrowser } from './representative-browser.mjs'
const origin = 'http://127.0.0.1:' + webPort,
  DAY = 86400000
const report = {
  status: 'RUNNING',
  startedAt: new Date().toISOString(),
  checkpoints: {},
  seeds: [],
  visual: [],
  recovery: {},
  cleanup: {},
  http: [],
  isolation: {
    docker: false,
    envFiles: false,
    shared43000: false,
    realMail: false,
    realStorage: false,
    systemClockChanged: false,
  },
}
for (const id of ['SETUP', 'A', 'B', 'C', 'D', 'E', 'F', 'VISUAL'])
  report.checkpoints[id] = { status: 'BLOCKED', reason: 'Not started' }
const scrub = (s) =>
  String(s)
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi, ':uuid')
    .replace(/[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+/g, '[synthetic-email]')
    .slice(0, 1500)
const save = () =>
  writeFile(work + '/report.json', JSON.stringify(report, null, 2) + '\n')
let backend,
  vite,
  browser,
  admin,
  owner,
  foreign,
  service,
  plans = {}
const pages = []
async function checkpoint(id, deps, fn) {
  if (deps.some((d) => report.checkpoints[d].status !== 'PASS')) return
  report.checkpoints[id] = { status: 'RUNNING' }
  await save()
  try {
    await fn()
    report.checkpoints[id].status = 'PASS'
    console.log('PASS ' + id)
  } catch (e) {
    report.checkpoints[id] = {
      status: 'FAIL',
      reason: scrub(e.stack),
      alerts: [],
    }
    for (const p of pages)
      report.checkpoints[id].alerts.push(
        ...(await p
          .locator('[role=alert]')
          .allTextContents()
          .then((x) => x.map(scrub))
          .catch(() => [])),
      )
    console.log('FAIL ' + id + ' ' + scrub(e.message))
  }
  await save()
}
async function page() {
  const c = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  await c.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  )
  const p = await c.newPage()
  p.setDefaultTimeout(12000)
  p.on('response', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/api/v1'))
      report.http.push({
        method: r.request().method(),
        path: scrub(u.pathname),
        status: r.status(),
      })
  })
  pages.push(p)
  return p
}
async function login(p, email) {
  await p.goto(origin + '/login')
  await p.getByLabel('Correo electrónico').fill(email)
  await p.getByLabel('Contraseña', { exact: true }).fill(backend.password)
  const done = p.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST',
  )
  await p.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  assert.equal((await done).status(), 200)
  await expect(p.getByLabel('Correo electrónico')).toHaveCount(0)
}
async function follow(p, plan, administrative = false) {
  await p.goto(
    origin +
      (administrative ? '/admin/privacy/deletion/' : '/privacy/deletion/') +
      plan.id,
  )
  await expect(
    p.getByRole('region', { name: 'Conservación de imágenes' }),
  ).toBeVisible()
}
async function capture(p, name) {
  for (const width of [1365, 320]) {
    await p.setViewportSize({ width, height: 900 })
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'Horizontal overflow ' + width,
    )
    await p.screenshot({
      path: work + '/' + name + '-' + width + '.png',
      fullPage: true,
      animations: 'disabled',
    })
    report.visual.push({
      name,
      width,
      overflow: false,
      file: name + '-' + width + '.png',
    })
  }
  await p.setViewportSize({ width: 1365, height: 900 })
}
async function seed(label, status = 'DRAFT') {
  const db = backend.db,
    u = await db.user.create({
      data: {
        email: label + '@example.invalid',
        passwordHash: backend.admin.passwordHash,
        role: 'DRIVER',
        emailVerifiedAt: backend.clock.now,
      },
    })
  const d = await db.driver.create({
    data: {
      userId: u.id,
      name: 'Conductor sintético ' + label,
      independentProfile: { create: {} },
    },
    include: { independentProfile: true },
  })
  const subject = await db.verificationSubject.create({
    data: { driverId: d.id, independentProfileId: d.independentProfile.id },
  })
  const c = await db.verificationCase.create({
    data: {
      subjectId: subject.id,
      presenterId: u.id,
      status: 'DRAFT',
      publicReason:
        status === 'REJECTED'
          ? 'Motivo sintético: revisión concluida. '.repeat(20)
          : null,
    },
  })
  const id = randomUUID()
  const a = await db.verificationAttachment.create({
    data: {
      id,
      caseId: c.id,
      category: 'FACE_PHOTO',
      quarantineKey: 'verification/v1/quarantine/' + id + '/source',
      objectKey: 'verification/v1/synthetic/' + c.id + '/' + id + '/original',
      expiresAt: backend.clock.now,
    },
  })
  for (const key of [a.quarantineKey, a.objectKey])
    backend.deletionStorage.seed(key)
  if (status === 'REJECTED') {
    await db.verificationCase.update({
      where: { id: c.id },
      data: {
        status: 'SUBMITTED',
        revision: 2,
        submittedAt: backend.clock.now,
      },
    })
    await db.verificationCase.update({
      where: { id: c.id },
      data: {
        status: 'REJECTED',
        revision: 3,
        decidedAt: backend.clock.now,
        reviewerId: backend.admin.id,
      },
    })
  }
  const { scheduleImages } = await loadSource(
    'dist/verification/image-retention.js',
  )
  const plan =
    status === 'DRAFT'
      ? await db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe('SELECT document_deletion_lock()')
          return scheduleImages(tx, c.id, backend.clock.now, 'DRAFT_ACTIVITY')
        })
      : null
  return { u, c, a, plan }
}
const at = (day) => {
  backend.clock.now = new Date(Date.parse('2027-04-01T00:00:00Z') + day * DAY)
}
async function rounds(id) {
  await service.runOne(id)
  await service.runOne(id)
}
async function absent(a) {
  for (const key of [a.objectKey, a.quarantineKey]) {
    const i = await backend.deletionStorage.inspect({
      bucket: 'synthetic-only',
      key,
    })
    assert(i.currentAbsent)
    assert.equal(i.versions.length, 0)
    assert.equal(i.uploads.length, 0)
  }
}
await mkdir(work, { recursive: true })
await save()
try {
  await checkpoint('SETUP', [], async () => {
    report.backendBefore = await backendSnapshot()
    report.environment = await prepareDatabase()
    backend = await startBackend()
    const { DocumentDeletionService } = await loadSource(
      'dist/verification/deletion.service.js',
    )
    service = backend.app.get(DocumentDeletionService)
    assert.equal(backend.deletionStorage.destination, 'synthetic-only')
    assert.equal(backend.clock.now.toISOString(), '2027-04-01T00:00:00.000Z')
    for (const name of ['accepted', 'failed', 'exception'])
      plans[name] = await seed(name)
    plans.final = await seed('final', 'REJECTED')
    report.seeds = [
      'Four synthetic independent users/drivers/subjects/cases and private synthetic storage objects prepared through Prisma; not registration/upload UI evidence.',
      'Three DRAFT calendars prepared through the real scheduleImages function under documentary lock.',
      'Ordinary REJECTED case and long communicable reason seeded for explicit Web finality; not an ordinary review UI test.',
      'Technical administrator and historical LOCAL_TEST driver from reused isolated bootstrap. No policy publication.',
    ]
    vite = await createServer({
      root: web,
      configFile: false,
      envDir: false,
      plugins: [react()],
      logLevel: 'silent',
      cacheDir: work + '/vite-cache',
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
      server: {
        host: '127.0.0.1',
        port: webPort,
        strictPort: true,
        proxy: { '/api/v1': { target: 'http://127.0.0.1:' + apiPort } },
      },
    })
    await vite.listen()
    browser = await launchRepresentativeBrowser(work)
    report.browser = {
      name: 'Chrome',
      version: browser.version(),
      temporaryProfile: true,
    }
    admin = await page()
    owner = await page()
    foreign = await page()
    await login(admin, backend.admin.email)
    await login(owner, plans.accepted.u.email)
    await login(foreign, plans.failed.u.email)
  })
  await checkpoint('A', ['SETUP'], async () => {
    const f = plans.accepted
    await follow(owner, f.plan)
    const calendar = f.plan.imageRetention
    assert.equal(
      Date.parse(calendar.noticeAt) - Date.parse(calendar.anchorAt),
      23 * DAY,
    )
    assert.equal(
      Date.parse(calendar.dueAt) - Date.parse(calendar.anchorAt),
      30 * DAY,
    )
    await expect(
      owner.getByText('2027-04-24 00:00:00 UTC', { exact: true }),
    ).toBeVisible()
    await expect(
      owner.getByText('2027-05-01 00:00:00 UTC', { exact: true }),
    ).toBeVisible()
    await expect(
      owner.getByRole('button', { name: /Solicitar cancelación/ }),
    ).toHaveCount(0)
    await capture(owner, 'calendar')
    report.checkpoints.A.source =
      'Browser GET of real calendar; seed explicitly declared'
  })
  await checkpoint('B', ['A'], async () => {
    const f = plans.accepted
    at(23)
    await service.sendNotice(f.plan.id)
    let r = await backend.db.documentDeletion.findUniqueOrThrow({
      where: { id: f.plan.id },
    })
    assert.equal(
      r.imageRetention.noticeAcceptedAt,
      backend.clock.now.toISOString(),
    )
    assert(backend.mail.some((m) => [m.to].flat().includes(f.u.email)))
    await follow(owner, f.plan)
    await expect(
      owner.getByText(/no acredita entrega ni lectura/),
    ).toBeVisible()
    at(30)
    await service.imageRetentionTick(f.plan.id)
    await rounds(f.plan.id)
    const o = await backend.db.documentDeletionObject.findFirstOrThrow({
      where: { requestId: f.plan.id },
    })
    assert(o.baselineAt)
    for (const offset of [900000, 3600000, DAY]) {
      backend.clock.now = new Date(+o.baselineAt + offset)
      await rounds(f.plan.id)
    }
    assert.equal(await service.finalize(f.plan.id), true)
    await absent(f.a)
    r = await backend.db.documentDeletion.findUniqueOrThrow({
      where: { id: f.plan.id },
    })
    assert(r.closedAt)
    assert.equal(
      await backend.db.verificationCase.count({ where: { id: f.c.id } }),
      1,
    )
    assert.equal(
      (await backend.db.user.findUniqueOrThrow({ where: { id: f.u.id } }))
        .active,
      true,
    )
    await follow(owner, f.plan)
    await expect(
      owner.getByText(/Hay alcance documental comprobado/),
    ).toBeVisible()
    await capture(owner, 'verified-scope')
    report.checkpoints.B.effects = {
      objects: 2,
      allVersionsAndUploadsAbsent: true,
      casePreserved: true,
      accountActive: true,
      mail: 'provider accepted; not delivery or reading',
    }
  })
  await checkpoint('C', ['SETUP'], async () => {
    const f = plans.failed,
      before = backend.deletionStorage.effects.length
    at(23)
    backend.clock.mailFail = true
    for (let n = 0; n < 5; n++) {
      await service.sendNotice(f.plan.id)
      backend.clock.now = new Date(+backend.clock.now + 60001)
    }
    backend.clock.mailFail = false
    at(30)
    await service.imageRetentionTick(f.plan.id)
    await rounds(f.plan.id)
    const r = await backend.db.documentDeletion.findUniqueOrThrow({
      where: { id: f.plan.id },
    })
    assert.equal(r.errorCode, 'IMAGE_NOTICE_NOT_ACCEPTED_IN_WINDOW')
    assert.equal(r.imageRetention.dueAt, f.plan.imageRetention.dueAt)
    assert.equal(r.imageRetention.noticeAcceptedAt, null)
    assert.equal(backend.deletionStorage.effects.length, before)
    await follow(foreign, f.plan)
    await expect(
      foreign.getByText(/La eliminación automática está bloqueada/).first(),
    ).toBeVisible()
    await capture(foreign, 'notice-blocked')
    report.checkpoints.C.effects = {
      noticeAttempts: r.noticeAttempts,
      deleteEffects: 0,
      originalDatesPreserved: true,
    }
  })
  await checkpoint('D', ['SETUP'], async () => {
    const f = plans.exception
    at(1)
    await follow(admin, f.plan, true)
    const action = admin.getByLabel('Acción administrativa')
    await expect(action).toBeEnabled()
    await action.selectOption('retention')
    await admin
      .getByLabel('Categoría concreta')
      .selectOption('IMAGE_ATTACHMENT')
    await admin
      .getByLabel('UUID del responsable', { exact: true })
      .fill(backend.admin.id)
    await admin
      .getByLabel('UUID del adjunto (obligatorio para excepción de imagen)', {
        exact: true,
      })
      .fill(f.a.id)
    await admin
      .getByLabel('UUID de evidencia (obligatorio para excepción de imagen)', {
        exact: true,
      })
      .fill(randomUUID())
    await admin
      .getByLabel('Finalidad concreta')
      .fill('Revisión sintética del alcance de imagen')
    await admin
      .getByLabel('Fundamento concreto')
      .fill('Evidencia sintética de revisión pendiente')
    await admin
      .getByLabel(/Próxima revisión acreditada/)
      .fill('2027-05-02T00:00:00Z')
    await admin
      .getByLabel(/Vencimiento acreditado/)
      .fill('2027-05-05T00:00:00Z')
    await admin
      .getByRole('button', { name: 'Revisar decisión', exact: true })
      .click()
    const dialog = admin.getByRole('dialog')
    await dialog.getByRole('checkbox').check()
    const response = admin.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().endsWith('/retention-decisions'),
    )
    await dialog
      .getByRole('button', { name: 'Confirmar decisión', exact: true })
      .click()
    assert.equal((await response).status(), 200)
    await expect(dialog).toHaveCount(0)
    assert.equal(
      await backend.db.documentRetention.count({
        where: { requestId: f.plan.id, category: 'IMAGE_ATTACHMENT' },
      }),
      1,
    )
    at(23)
    await service.sendNotice(f.plan.id)
    at(30)
    const before = backend.deletionStorage.effects.length
    await service.imageRetentionTick(f.plan.id)
    await rounds(f.plan.id)
    assert.equal(backend.deletionStorage.effects.length, before)
    const objects = await backend.db.documentDeletionObject.findMany({
      where: { requestId: f.plan.id },
    })
    assert.equal(objects.length, 2)
    assert(objects.every((o) => o.status === 'RETAINED'))
    await follow(admin, f.plan, true)
    await expect(
      admin.getByText(/Conservado por excepción/).first(),
    ).toBeVisible()
    await capture(admin, 'exception')
    report.checkpoints.D.effects = {
      explicitWebDecision: 1,
      objectsRetained: 2,
      deleteEffects: 0,
      privateReasonNotProjected: true,
      exceptionValidityDetail: 'not exposed by GET; no inference',
    }
  })
  await checkpoint('E', ['SETUP'], async () => {
    at(0)
    const f = plans.final
    await admin.goto(origin + '/verification/cases/' + f.c.id)
    const review = admin.getByRole('button', {
      name: 'Revisar rechazo definitivo',
      exact: true,
    })
    await expect(review).toBeEnabled()
    await admin
      .getByLabel(/Referencia UUID de evidencia del cierre/)
      .fill(randomUUID())
    await review.focus()
    await admin.keyboard.press('Enter')
    const dialog = admin.getByRole('dialog', {
      name: 'Confirmar rechazo definitivo',
    })
    await expect(dialog).toBeVisible()
    assert(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
      'Modal focus',
    )
    await capture(admin, 'final-confirmation')
    await dialog.getByRole('checkbox').check()
    let dropped = false,
      posts = 0
    let lostKey
    const pattern =
      '**/api/v1/admin/verification-cases/' + f.c.id + '/final-rejection'
    await admin.route(pattern, async (route) => {
      posts++
      lostKey = route.request().headers()['idempotency-key']
      const response = await route.fetch()
      assert.equal(response.status(), 200)
      dropped = true
      await route.abort('failed')
    })
    await dialog
      .getByRole('button', {
        name: 'Confirmar rechazo definitivo',
        exact: true,
      })
      .click()
    await expect.poll(() => dropped).toBe(true)
    await expect(
      admin.getByRole('heading', { name: 'Pendiente de reconciliación' }),
    ).toBeVisible()
    const counts = async () => ({
      commands: await backend.db.verificationCommand.count({
        where: { operation: 'FINAL_REJECTION', target: f.c.id },
      }),
      plans: await backend.db.documentDeletion.count({
        where: {
          scope: 'IMAGE_RETENTION',
          resourceId: f.c.id,
          imageRetention: { path: ['reason'], equals: 'FINAL_REJECTION' },
        },
      }),
    })
    const after = await counts()
    assert.deepEqual(after, { commands: 1, plans: 1 })
    await admin.unroute(pattern)
    await admin.reload()
    await admin
      .getByRole('button', { name: 'Consultar intento', exact: true })
      .click()
    await expect(
      admin.getByText(
        /Comprobante histórico recuperado; estado vigente consultado/,
      ),
    ).toBeVisible()
    assert.deepEqual(await counts(), after)
    assert.equal(posts, 1)
    const markerCount = await admin.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) || '[]').length,
      'mandaria.verification.pending:' + origin,
    )
    assert.equal(markerCount, 0)
    const command = await backend.db.verificationCommand.findFirstOrThrow({
      where: { operation: 'FINAL_REJECTION', target: f.c.id },
    })
    assert.equal(command.key, lostKey)
    report.recovery = {
      postCount: posts,
      before: { commands: 0, plans: 0 },
      afterLost: after,
      afterRecovery: await counts(),
      sameKey: true,
      markerCleared: true,
    }
    await capture(admin, 'final-recovered')
  })
  await checkpoint('F', ['B', 'C'], async () => {
    const f = plans.accepted
    const before = await backend.db.verificationCase.count({
      where: { subjectId: f.c.subjectId },
    })
    await owner.goto(origin + '/verification/cases/' + f.c.id)
    await expect(
      owner.getByRole('alert').filter({ hasText: /restringido/ }),
    ).toBeVisible()
    await expect(
      owner.getByRole('button', {
        name: /Presentar|Preparar nueva|Confirmar rechazo/,
      }),
    ).toHaveCount(0)
    await foreign.goto(origin + '/privacy/deletion/' + f.plan.id)
    await expect(
      foreign.getByRole('alert').filter({ hasText: /no está disponible/ }),
    ).toBeVisible()
    await expect(
      foreign.getByRole('region', { name: 'Conservación de imágenes' }),
    ).toHaveCount(0)
    assert.equal(
      await backend.db.verificationCase.count({
        where: { subjectId: f.c.subjectId },
      }),
      before,
    )
    report.checkpoints.F.effects = {
      caseRetained: true,
      noReopening: true,
      foreignAccessDenied: true,
      accountStillActive: true,
    }
    await capture(owner, 'restricted-case')
  })
  await checkpoint('VISUAL', ['A', 'E'], async () => {
    assert(report.visual.some((v) => v.width === 320))
    assert(report.visual.some((v) => v.name === 'final-confirmation'))
    report.checkpoints.VISUAL.checks = [
      'desktop and 320 no horizontal overflow',
      'keyboard Enter opens confirmation; focus contained in modal',
      'long synthetic public reason and error surfaces',
      'synthetic screenshots only',
    ]
  })
} finally {
  report.backendAfter = await backendSnapshot()
  report.backendUnchanged =
    JSON.stringify(report.backendAfter) === JSON.stringify(report.backendBefore)
  if (!report.backendUnchanged)
    report.checkpoints.CONTRACT = {
      status: 'FAIL',
      reason: 'Backend changed during run',
    }
  await browser?.close()
  report.cleanup.browserClosed = true
  await vite?.close()
  report.cleanup.viteClosed = true
  await backend?.close()
  report.cleanup.backendClosed = true
  report.cleanup.databaseStopped = await stopDatabase()
  const files = JSON.parse(
    await readFile('docs/retention-web-files.json', 'utf8'),
  )
  report.webHashes = await hashes(web, files)
  report.finishedAt = new Date().toISOString()
  report.status = Object.values(report.checkpoints).every(
    (c) => c.status === 'PASS',
  )
    ? 'PASS'
    : 'INCOMPLETE'
  await save()
  console.log('REPORT ' + work + '/report.json')
  if (report.status !== 'PASS') process.exitCode = 1
}
