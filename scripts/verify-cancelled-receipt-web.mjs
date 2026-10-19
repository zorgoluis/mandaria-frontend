// Real Web + Nest/PostgreSQL; only storage, mail and transport-loss boundary are test doubles.
// Run with backend's existing tsx CLI. Never writes backend or reads an existing .env.
import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect } from '@playwright/test'
import {
  root,
  web,
  work,
  database,
  pgPort,
  apiPort,
  requireBackend,
  loadSource,
  prepareDatabase,
  stopDatabase,
} from './deletion-isolated-environment.mjs'
import { startBrowser } from './deletion-isolated-browser.mjs'

requireBackend('reflect-metadata')
const { PrismaClient } = requireBackend('@prisma/client'),
  { Test } = requireBackend('@nestjs/testing'),
  { Logger } = requireBackend('@nestjs/common')
const argon2 = requireBackend('argon2'),
  { DeletionStorageDouble } = await loadSource(
    'test/helpers/deletion-storage-double.ts',
  )
const load = (p) => import(pathToFileURL(join(root, 'dist', p)).href)
const password = randomBytes(24).toString('hex'),
  clock = new Date(),
  mail = []
const report = {
  kind: 'REAL_WEB_NEST_POSTGRESQL_WITH_STORAGE_MAIL_DOUBLES',
  status: 'RUNNING',
  scenarios: [],
  requests: [],
  postCommit: [],
  preconditions: [],
  work,
  externalServices: false,
}
let app,
  browser,
  db,
  audit,
  target,
  admin,
  other,
  subject,
  requestId,
  independentId,
  page
const posts = [],
  gets = [],
  runtimeErrors = []
const hash = async (p) =>
  createHash('sha256')
    .update(await readFile(p))
    .digest('hex')
const manifest = JSON.parse(
  await readFile(join(web, 'docs/cancelled-receipt-web-sources.json'), 'utf8'),
)
const fingerprint = async (base, files) =>
  Promise.all(
    files.map(async (file) => ({ file, sha256: await hash(join(base, file)) })),
  )
const webFiles = [
  'src/deletion/receipt.ts',
  'src/deletion/review.tsx',
  'src/deletion/operational-review.tsx',
  'src/deletion/pages.tsx',
  'src/deletion/hooks.ts',
  'src/deletion/pending.ts',
  'src/deletion/service.ts',
  'src/auth/session.ts',
  'src/services/api.ts',
  'src/app/App.tsx',
]
const save = () =>
  writeFile(
    join(work, 'cancelled-receipt-result.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
async function stage(name) {
  report.stage = name
  await save()
  console.log(name)
}
const redact = (path) => path.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, ':uuid')
async function api(method, path, token, body, status = 200, key) {
  const res = await fetch(`http://127.0.0.1:${apiPort}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  report.requests.push({ method, path: redact(path), status: res.status })
  assert.equal(
    res.status,
    status,
    `${method} ${redact(path)} status (${data.code ?? ''})`,
  )
  return data
}
const receiptPath = (id, key) =>
  `/admin/privacy/deletion-requests/${id}/commands/by-key/${key}`
async function state() {
  const r = await db.documentDeletion.findUniqueOrThrow({
    where: { id: requestId },
  })
  return {
    status: r.status,
    revision: r.revision,
    authorization: r.authorizationState,
    errorCode: r.errorCode,
    dates: {
      receivedAt: r.createdAt,
      confirmedAt: r.confirmedAt,
      deadline: r.deadline,
      replacementDeadline: r.replacementDeadline,
      closedAt: r.closedAt,
      auditUntil: r.auditUntil,
      contactUntil: r.contactUntil,
    },
    accountActive: (
      await db.user.findUniqueOrThrow({ where: { id: subject.id } })
    ).active,
    gates: await db.documentDeletionGate.findMany({
      where: { requestId },
      orderBy: { id: 'asc' },
    }),
    independent: await db.documentDeletionGate.findMany({
      where: { requestId: independentId },
      orderBy: { id: 'asc' },
    }),
    budget: await db.documentDeletionObject.findMany({
      where: { requestId },
      select: {
        id: true,
        attempts: true,
        baselineAt: true,
        finalVerifiedAt: true,
        watchUntil: true,
        firstFailureAt: true,
      },
      orderBy: { id: 'asc' },
    }),
    commandCount: await db.documentDeletionCommand.count({
      where: { requestId },
    }),
    eventCount: await db.documentDeletionEvent.count({ where: { requestId } }),
  }
}
async function capture(name) {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      name + ' overflow ' + width,
    )
    await browser.capture(page, name + '-' + width)
  }
  await page.setViewportSize({ width: 1280, height: 900 })
}
async function detail() {
  await page.goto(browser.origin + '/admin/privacy/deletion/' + requestId)
  await expect(page.getByLabel('Acción administrativa')).toBeEnabled()
  await expect(page.getByLabel('Decisión operativa V2')).toBeEnabled()
}
async function recover(key, label) {
  const markers = await browser.markers(page),
    index = markers.findIndex((m) => m.key === key)
  assert.ok(index >= 0)
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'GET' &&
      r.url().endsWith(receiptPath(requestId, key)),
  )
  response.catch(() => {})
  const button = page
    .getByRole('button', {
      name: 'Consultar recibo administrativo',
      exact: true,
    })
    .nth(index)
  await button.focus()
  await expect(button).toBeFocused()
  await page.keyboard.press('Enter')
  const res = await response
  assert.equal(res.status(), 200)
  const body = await res.json()
  assert.equal(body.status, 'APPLIED')
  assert.equal(body.result.status, 'CANCELLED')
  assert.equal(body.key, key)
  assert.equal(body.requestId, requestId)
  assert.equal(body.receiptVersion, undefined)
  assert.equal(body.result.evidenceRef, undefined)
  await expect(
    page.getByRole('heading', { name: 'Comando aplicado: recibo histórico' }),
  ).toBeVisible()
  await expect(
    page.getByText(/La decisión administrativa fue aplicada/),
  ).toBeVisible()
  await expect(page.getByLabel('Correo electrónico')).toHaveCount(0)
  await expect
    .poll(async () => (await browser.markers(page))[index]?.accepted)
    .toBe(true)
  await expect(
    page.getByRole('button', { name: 'Actualizar estado', exact: true }),
  ).toBeEnabled()
  await capture(label)
  return body
}
async function decide(action, fields, label, token, otherToken) {
  await detail()
  const before = await state(),
    evidenceRef = randomUUID()
  const legacy = action === 'ACKNOWLEDGE_TASK'
  await page
    .getByLabel(legacy ? 'Acción administrativa' : 'Decisión operativa V2')
    .selectOption(action)
  await page
    .getByLabel(
      legacy
        ? 'Referencia UUID de evidencia custodiada'
        : 'Referencia UUID de evidencia V2',
    )
    .fill(evidenceRef)
  if (legacy) {
    await page.getByLabel('UUID del responsable').fill(admin.id)
    await page.getByLabel('UUID del suplente').fill(other.id)
    await page.getByLabel('Tarea pendiente').selectOption(fields.taskId)
  } else if (action === 'REVIEW_RESTRICTION') {
    await page.getByLabel('Revisión asignada').selectOption(fields.taskId)
    await page.getByLabel('Restricción concreta').selectOption(fields.gateId)
    await page
      .getByLabel('Decisión sobre esta restricción')
      .selectOption(fields.decision)
    if (fields.decision === 'KEEP')
      await page.getByLabel(/Próxima revisión \(ISO/).fill(fields.reviewAt)
    await page
      .getByLabel('Motivo concreto')
      .fill('Revisión sintética del gate seleccionado')
  } else {
    await page.getByLabel('Alcance exacto de la actuación').selectOption('')
    await page
      .getByLabel('Motivo concreto')
      .fill('Bloqueo sintético revisado sin reversión')
  }
  await page
    .getByRole('button', {
      name: legacy ? 'Revisar decisión' : 'Revisar actuación V2',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  assert.equal(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
    true,
  )
  await dialog.getByRole('checkbox').focus()
  await page.keyboard.press('Space')
  await capture(label + '-confirmation')
  target = { requestId, action, evidenceRef, label, key: null, verified: false }
  const seen = target,
    postBefore = posts.length,
    getBefore = gets.length
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      r.url().endsWith('/' + requestId + '/resolve'),
  )
  response.catch(() => {})
  const button = dialog.getByRole('button', {
    name: legacy ? 'Confirmar decisión' : 'Confirmar actuación V2',
    exact: true,
  })
  await button.focus()
  await expect(button).toBeFocused()
  await page.keyboard.press('Enter')
  const lost = await response
  assert.equal(
    lost.status(),
    502,
    'Proxy must report lost post-commit response',
  )
  await expect.poll(() => seen.verified).toBe(true)
  const key = seen.key
  assert.ok(key)
  await expect(page.getByRole('alert').last()).toBeVisible()
  const marker = (await browser.markers(page)).find((m) => m.key === key)
  assert.deepEqual(marker, {
    actor: admin.id,
    key,
    op: 'resolve',
    id: requestId,
  })
  const committed = await state()
  assert.equal(committed.commandCount, before.commandCount + 1)
  assert.equal(committed.eventCount, before.eventCount + 1)
  assert.equal(committed.status, 'CANCELLED')
  assert.equal(committed.accountActive, false)
  assert.deepEqual(committed.dates, before.dates)
  assert.deepEqual(committed.budget, before.budget)
  assert.deepEqual(committed.independent, before.independent)
  if (action === 'REVIEW_RESTRICTION') {
    assert.equal(
      committed.gates.find((g) => g.id === fields.gateId).active,
      fields.decision === 'KEEP',
    )
    assert.deepEqual(
      committed.gates.filter((g) => g.id !== fields.gateId),
      before.gates.filter((g) => g.id !== fields.gateId),
    )
  } else assert.deepEqual(committed.gates, before.gates)
  target = null
  // Hard reload discards form body/memory. Marker is the sole original key source.
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Solicitud de baja', exact: true }),
  ).toBeVisible()
  assert.deepEqual(
    (await browser.markers(page)).find((m) => m.key === key),
    marker,
  )
  const receipt = await recover(key, label + '-recovered')
  assert.equal(receipt.result.revision, committed.revision)
  assert.deepEqual(
    await api('GET', receiptPath(requestId, key), token),
    receipt,
  )
  assert.deepEqual(
    await api('GET', receiptPath(requestId, key), token),
    receipt,
  )
  assert.equal(
    (await api('GET', receiptPath(requestId, key), otherToken, undefined, 404))
      .code,
    'COMMAND_RECEIPT_UNAVAILABLE',
  )
  assert.deepEqual(await state(), committed)
  assert.equal(posts.length - postBefore, 1)
  assert.ok(gets.length - getBefore >= 4)
  report.scenarios.push({
    name: label,
    action,
    status: 'PASS',
    postCommitVerified: true,
    postCount: 1,
    browserResponse: 502,
    commandsAdded: 1,
    eventsAdded: 1,
    recovery: {
      method: 'GET',
      status: 200,
      command: 'APPLIED',
      historicalStatus: 'CANCELLED',
      historicalRevision: receipt.result.revision,
      originalKey: true,
    },
    repeatedGetsNoEffects: true,
    foreignAdminStatus: 404,
    markerAccepted: true,
    sessionPreserved: true,
    independentRestrictionsUnchanged: true,
    accountActive: false,
    datesUnchanged: true,
    budgetsUnchanged: true,
    currentRevision: committed.revision,
  })
  await save()
  return { key, receipt, committed }
}
try {
  report.environment = await prepareDatabase()
  await stage('isolated-preflight')
  db = new PrismaClient({ datasourceUrl: database })
  audit = new PrismaClient({ datasourceUrl: database })
  const [identity] =
    await db.$queryRaw`SELECT current_database() AS name, host(inet_server_addr()) AS host, inet_server_port() AS port, current_setting('data_directory') AS directory`
  assert.equal(identity.host, '127.0.0.1')
  assert.equal(identity.port, pgPort)
  assert.equal(identity.name, new URL(database).pathname.slice(1))
  assert.equal(
    identity.directory.replaceAll('\\', '/'),
    join(work, 'pgdata').replaceAll('\\', '/'),
  )
  report.identityBeforeSeed = identity
  report.backend = {
    head: manifest.backendHead,
    hashes: await fingerprint(
      root,
      manifest.backend.map((x) => x.file),
    ),
  }
  assert.deepEqual(report.backend.hashes, manifest.backend)
  report.web = {
    head: manifest.webHead,
    hashes: await fingerprint(web, webFiles),
  }
  report.harnessHashes = await fingerprint(web, [
    'scripts/verify-cancelled-receipt-web.mjs',
    'scripts/deletion-isolated-environment.mjs',
    'scripts/deletion-isolated-browser.mjs',
  ])
  Logger.overrideLogger(false)
  Object.assign(process.env, {
    DATABASE_URL: database,
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
    INTEGRATION_JWT_SECRET: randomBytes(48).toString('hex'),
    JWT_ACCESS_EXPIRES_IN: '3600',
    JWT_REFRESH_EXPIRES_IN: '7200',
    INTEGRATION_ACCESS_TOKEN_EXPIRES_IN: '3600',
    DOCUMENT_DELETION_LOCAL_ENABLED: 'true',
    DRIVER_VERIFICATION_LOCAL_ENABLED: 'true',
    MAIL_PROVIDER: 'local_outbox',
    CORS_ORIGINS: 'http://127.0.0.1:4218',
    DISPATCH_TTL_MINUTES: '60',
    LOCAL_DELIVERY_ASSIGNMENT_TTL_MINUTES: '5',
  })
  process.chdir(work)
  const { AppModule } = await load('app.module.js'),
    { setup } = await load('setup.js'),
    { ROUTING_PROVIDER } = await load('routing/routing.types.js'),
    { MAIL_PROVIDER } = await load('mail/mail.types.js'),
    { DELETION_STORAGE, DELETION_CLOCK } = await load(
      'verification/deletion-policy.js',
    ),
    { DocumentDeletionWorker } = await load('verification/deletion-worker.js')
  const storage = new DeletionStorageDouble()
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ROUTING_PROVIDER)
    .useValue({
      name: 'fake',
      async calculateRoute() {
        throw Error('No logistics allowed')
      },
    })
    .overrideProvider(MAIL_PROVIDER)
    .useValue({
      name: 'fake',
      async sendUserInvitation() {},
      async sendPartnerApplicationNotice() {},
      async sendDocumentDeletion(m) {
        mail.push(m)
      },
    })
    .overrideProvider(DELETION_STORAGE)
    .useValue(storage)
    .overrideProvider(DELETION_CLOCK)
    .useValue(() => clock)
    .overrideProvider(DocumentDeletionWorker)
    .useValue({})
    .compile()
  app = module.createNestApplication({ logger: false, bodyParser: false })
  setup(app)
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.url.endsWith('/resolve'))
      posts.push({ id: req.url, key: req.headers['idempotency-key'] })
    if (req.method === 'GET' && req.url.includes('/commands/by-key/'))
      gets.push(req.url)
    if (
      target &&
      req.method === 'POST' &&
      req.url.endsWith('/' + target.requestId + '/resolve')
    ) {
      const boundary = target,
        original = res.json.bind(res)
      res.json = (body) => {
        if (res.statusCode !== 200 || boundary.key) return original(body)
        boundary.key = req.headers['idempotency-key']
        void (async () => {
          const command = await audit.documentDeletionCommand.findUnique({
            where: { actorId_key: { actorId: admin.id, key: boundary.key } },
          })
          const events = await audit.documentDeletionEvent.count({
            where: {
              requestId: boundary.requestId,
              kind: boundary.action,
              evidenceRef: boundary.evidenceRef,
            },
          })
          assert.equal(command.result.receiptVersion, 1)
          assert.equal(command.result.operation, 'RESOLVE')
          assert.equal(command.result.result.status, 'CANCELLED')
          assert.equal(events, 1)
          boundary.verified = true
          report.postCommit.push({
            scenario: boundary.label,
            independentConnection: true,
            commands: 1,
            events,
            storedOperation: 'RESOLVE',
            receiptVersion: 1,
            resultStatus: 'CANCELLED',
          })
          await save()
          res.destroy()
        })().catch((e) => {
          runtimeErrors.push(e.name)
          res.destroy()
        })
        return res
      }
    }
    next()
  })
  await app.listen(apiPort, '127.0.0.1')
  browser = await startBrowser(report)
  const secretHash = await argon2.hash(password)
  const user = (role, active = true) =>
    db.user.create({
      data: {
        email: randomUUID() + '@example.test',
        passwordHash: secretHash,
        role,
        active,
        emailVerifiedAt: clock,
      },
    })
  admin = await user('SUPER_ADMIN')
  other = await user('SUPER_ADMIN')
  subject = await user('DRIVER', false)
  const independentSubject = await user('DRIVER', false)
  page = await browser.context()
  page.on('pageerror', (e) => runtimeErrors.push(e.name))
  await browser.login(page, admin.email, password)
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toHaveCount(1)
  // Brief real login/identity + health before any complete business scenario.
  const a = (
    await api('POST', '/auth/login', null, { email: admin.email, password })
  ).accessToken
  const b = (
    await api('POST', '/auth/login', null, { email: other.email, password })
  ).accessToken
  report.preflight = {
    status: 'PASS',
    sqlIdentity: true,
    health: 200,
    webLogin: true,
    realApi: true,
  }
  await writeFile(
    join(work, 'preflight.json'),
    JSON.stringify(report.preflight, null, 2),
  )
  await save()
  if (process.argv.includes('--preflight-only')) {
    report.status = 'PREFLIGHT_PASS'
  } else {
    await stage('synthetic-preconditions')
    const provider = await db.deliveryProvider.create({
      data: {
        name: 'Synthetic cancelled receipt',
        code: randomUUID(),
        type: 'FLEET',
        status: 'ACTIVE',
        maxDrivers: 5,
        maxVehicles: 5,
      },
    })
    const driver = await db.driver.create({
      data: {
        userId: subject.id,
        providerId: provider.id,
        name: 'Synthetic',
        status: 'ACTIVE',
      },
    })
    const owner = await db.verificationSubject.create({
      data: { driverId: driver.id, providerId: provider.id },
    })
    const dossier = await db.verificationCase.create({
      data: { subjectId: owner.id, presenterId: subject.id },
    })
    const attachment = randomUUID()
    const object = await db.verificationAttachment.create({
      data: {
        id: attachment,
        caseId: dossier.id,
        category: 'FACE_PHOTO',
        quarantineKey: `verification/v1/quarantine/${attachment}/source`,
        objectKey: `verification/v1/providers/${provider.id}/${dossier.id}/${attachment}/original`,
        expiresAt: new Date(+clock + 300000),
      },
    })
    storage.seed(object.objectKey)
    storage.seed(object.quarantineKey)
    const create = (subjectUserId = subject.id) =>
      api(
        'POST',
        '/privacy/deletion-requests',
        a,
        { scope: 'ACCOUNT', subjectUserId, acknowledgment: true },
        202,
        randomUUID(),
      )
    const confirm = (r) =>
      api(
        'POST',
        `/admin/privacy/deletion-requests/${r.id}/resolve`,
        a,
        {
          action: 'IDENTITY_AND_AUTHORITY_VERIFIED',
          expectedRevision: r.revision,
          evidenceRef: randomUUID(),
        },
        200,
        randomUUID(),
      )
    const initial = await confirm(await create())
    requestId = initial.id
    const cancelled = await api(
      'POST',
      `/privacy/deletion-requests/${requestId}/cancel`,
      a,
      { expectedRevision: initial.revision },
      200,
      randomUUID(),
    )
    assert.equal(cancelled.status, 'CANCELLED')
    const independent = await confirm(await create(independentSubject.id))
    independentId = independent.id
    const before = await state()
    assert.equal(before.accountActive, false)
    assert.equal(before.budget.length, 2)
    assert.ok(before.independent.length >= 1)
    const task = await db.documentDeletionTask.findUniqueOrThrow({
      where: { requestId_kind: { requestId, kind: 'RESTRICTION_REVIEW' } },
    })
    const gate = before.gates.find((g) => g.kind === 'USER')
    assert.ok(gate)
    report.preconditions = [
      'Two synthetic admins; subject seeded inactive before business actions',
      'Synthetic FLEET driver, dossier and two storage-double objects; no real bytes/services',
      'Assisted ACCOUNT creation, identity confirmation and personal cancellation via auxiliary real HTTP only to prepare CANCELLED',
      'Second synthetic inactive subject has an independently confirmed ACCOUNT request; same-resource overlapping confirmation is rejected by backend',
      'No manual updates to requests, gates, events, commands, dates or budgets; no worker/finalize/maintenance, delivery or restore',
    ]
    report.initial = {
      status: before.status,
      authorization: before.authorization,
      accountActive: before.accountActive,
      ownGates: before.gates.length,
      independentGates: before.independent.length,
      objects: before.budget.length,
      attempts: before.budget.map((o) => o.attempts),
      dates: before.dates,
    }
    await stage('ack-post-commit-loss')
    const ack = await decide(
      'ACKNOWLEDGE_TASK',
      { taskId: task.id },
      'assignment',
      a,
      b,
    )
    await stage('keep-post-commit-loss')
    await decide(
      'REVIEW_RESTRICTION',
      {
        taskId: task.id,
        gateId: gate.id,
        decision: 'KEEP',
        reviewAt: new Date(+clock + 86400000).toISOString(),
      },
      'keep',
      a,
      b,
    )
    await stage('historical-receipt-current-later')
    const later = await state(),
      postCount = posts.length
    const old = await recover(ack.key, 'historical-versus-current')
    assert.deepEqual(old, ack.receipt)
    assert.ok(later.revision > old.result.revision)
    const current = page.getByRole('region', { name: 'Estado de solicitud' })
    await expect(
      current
        .locator('dt')
        .filter({ hasText: /^Revisión$/ })
        .locator('+ dd'),
    ).toHaveText(String(later.revision))
    assert.deepEqual(await state(), later)
    assert.equal(posts.length, postCount)
    report.historicalCurrent = {
      status: 'PASS',
      historicalRevision: old.result.revision,
      currentRevision: later.revision,
      transition: 'Real REVIEW_RESTRICTION KEEP',
      receiptUnchanged: true,
      currentNotOverwritten: true,
    }
    await stage('release-post-commit-loss')
    await decide(
      'REVIEW_RESTRICTION',
      { taskId: task.id, gateId: gate.id, decision: 'RELEASE' },
      'release',
      a,
      b,
    )
    await stage('block-post-commit-loss')
    await decide('BLOCK_CLEANUP_AUTHORIZATION', {}, 'block-authorization', a, b)
    const final = await state()
    assert.equal(final.accountActive, false)
    assert.deepEqual(final.dates, before.dates)
    assert.deepEqual(final.budget, before.budget)
    assert.deepEqual(final.independent, before.independent)
    report.final = {
      status: final.status,
      authorization: final.authorization,
      errorCode: final.errorCode,
      accountActive: final.accountActive,
      activeOwnGates: final.gates.filter((g) => g.active).length,
      activeIndependentGates: final.independent.filter((g) => g.active).length,
      attempts: final.budget.map((o) => o.attempts),
    }
    report.deliveryAssignments = await db.deliveryAssignment.count()
    assert.equal(report.deliveryAssignments, 0)
    report.runtimeErrors = runtimeErrors
    assert.deepEqual(runtimeErrors, [])
    report.status = 'PASS'
  }
} catch (error) {
  report.status = 'FAIL'
  report.failure = {
    stage: report.stage,
    type: error.name,
    message: redact(String(error.message)).slice(0, 800),
  }
  process.exitCode = 1
} finally {
  await browser?.close()
  await app?.close()
  await db?.$disconnect()
  await audit?.$disconnect()
  process.chdir(web)
  report.cleanup = {
    postgresStopped: await stopDatabase(),
    browserClosed: true,
    backendClosed: true,
  }
  report.backendUnchanged =
    JSON.stringify(
      await fingerprint(
        root,
        manifest.backend.map((x) => x.file),
      ),
    ) === JSON.stringify(manifest.backend)
  if (report.web)
    report.webUnchanged =
      JSON.stringify(await fingerprint(web, webFiles)) ===
      JSON.stringify(report.web.hashes)
  await save()
  console.log(
    JSON.stringify({
      status: report.status,
      work,
      failure: report.failure,
      cleanup: report.cleanup,
    }),
  )
}
