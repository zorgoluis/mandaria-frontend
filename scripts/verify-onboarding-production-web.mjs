// One bounded integration run; only transport substitution, never functional API fixtures.
// PostgreSQL identity is checked before migrations/seeds. No backend files are written.
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import {
  root,
  web,
  work,
  database,
  pgPort,
  apiPort,
  webPort,
  prepareDatabase,
  stopDatabase,
} from './onboarding-isolated-environment.mjs'
import { startBackend } from './onboarding-isolated-backend.mjs'

const report = {
  status: 'RUNNING',
  startedAt: new Date().toISOString(),
  checkpoints: {},
  http: [],
  captures: [],
  seeds: [
    'SUPER_ADMIN account with confirmed email',
    'historical DRIVER/PENDING/OFFLINE with independent PENDING profile',
    'LOCAL_TEST/DRAFT subject and case with no copied production evidence',
  ],
  isolation: {
    temporaryDatabaseIdentity: false,
    envFilesRead: false,
    docker: false,
    externalMailOrStorage: false,
    realActivation: false,
  },
  counts: { publicationPosts: 0, acceptancePosts: 0, storagePuts: 0 },
  recovery: {},
  hashes: {},
  cleanup: {},
}
for (const id of [
  'SETUP',
  'H',
  'A',
  'B',
  'C',
  'D',
  'G',
  'E_IDENTITY',
  'E_UNIT',
  'F_IDENTITY',
  'F_UNIT',
  'H_FINAL',
])
  report.checkpoints[id] = { status: 'BLOCKED', reason: 'Not started' }
let backend,
  vite,
  browser,
  admin,
  driver,
  historical,
  person,
  personDriver,
  identityCase,
  unitCase
const origin = `http://127.0.0.1:${webPort}`,
  markerKey = 'mandaria.verification.pending:' + origin
const version = 'SYNTHETIC-DRIVER-1',
  privacyVersion = 'SYNTHETIC-PRIVACY-1'
const legalText =
  'TEXTO SINTÉTICO DE ENSAYO SIN VALIDEZ LEGAL. Se conserva la versión íntegra devuelta por el servidor.\n\n'.repeat(
    30,
  )
const privacyText =
  'AVISO SINTÉTICO NO AUTORIZADO PARA PRODUCCIÓN.\n' + legalText
const pages = [],
  failures = [],
  transportFailures = []
const hash = (value) => createHash('sha256').update(value).digest('hex')
const scrub = (value) =>
  String(value)
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/gi, ':uuid')
    .replace(/[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+/g, '[synthetic-email]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[opaque]')
    .slice(0, 1500)
let writes = Promise.resolve()
function save() {
  const body = JSON.stringify(report, null, 2) + '\n'
  writes = writes.then(() => writeFile(work + '/report.json', body))
  return writes
}
async function checkpoint(id, dependencies, fn) {
  const blocked = dependencies.filter(
    (x) => report.checkpoints[x].status !== 'PASS',
  )
  if (blocked.length) {
    report.checkpoints[id] = {
      status: 'BLOCKED',
      reason: 'Dependency: ' + blocked.join(','),
    }
    await save()
    return
  }
  report.checkpoints[id] = {
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
  }
  await save()
  try {
    await fn()
    report.checkpoints[id].status = 'PASS'
    console.log('PASS ' + id)
  } catch (e) {
    report.checkpoints[id].status = 'FAIL'
    report.checkpoints[id].error = scrub(e.message)
    failures.push(id)
    console.log('FAIL ' + id + ': ' + scrub(e.message))
    report.checkpoints[id].visibleAlerts = []
    for (const page of pages)
      if (!page.isClosed())
        try {
          report.checkpoints[id].visibleAlerts.push(
            ...(await page.locator('[role=alert]').allTextContents()).map(
              scrub,
            ),
          )
        } catch {
          /* diagnostic only */
        }
  }
  report.checkpoints[id].finishedAt = new Date().toISOString()
  await save()
}
const passed = (id) => report.checkpoints[id].status === 'PASS'
async function mark(name, detail) {
  report.checkpoints[name] ||= {}
  report.checkpoints[name].detail = detail
  await save()
}
async function capture(page, name) {
  const file = name + '.png'
  try {
    await page.screenshot({
      path: work + '/' + file,
      fullPage: false,
      mask: [
        page.locator('input[type=password]'),
        page.getByText(/@example\.invalid/),
      ],
    })
    report.captures.push({
      file,
      sha256: hash(await readFile(work + '/' + file)),
    })
  } catch (e) {
    report.captures.push({ file, status: 'FAILED', error: scrub(e.message) })
  }
  await save()
}
function bodyShape(req) {
  if (!['POST', 'PATCH'].includes(req.method())) return undefined
  let b
  try {
    b = req.postDataJSON()
  } catch {
    return { body: 'non-json' }
  }
  if (!b) return undefined
  const safe = { fields: Object.keys(b).sort() }
  for (const key of [
    'scope',
    'version',
    'privacyVersion',
    'expectedVersion',
    'category',
    'decision',
    'checklistVersion',
    'subjectType',
    'type',
    'accepted',
    'privacyAcknowledged',
    'publicationAuthorized',
    'method',
  ])
    if (key in b) safe[key] = b[key]
  for (const k of ['text', 'privacyText'])
    if (typeof b[k] === 'string')
      safe[k] = { length: b[k].length, sha256: hash(b[k]) }
  if (b.specificConsents)
    safe.specificConsents = b.specificConsents.map((c) => ({
      id: c.id,
      accepted: c.accepted,
      hasHash: typeof c.hash === 'string',
    }))
  return safe
}
function pathOf(url) {
  return new URL(url).pathname.replace(
    /[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/gi,
    ':uuid',
  )
}
async function context() {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  ctx.setDefaultTimeout(12000)
  await ctx.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.origin === origin) return route.continue()
    if (url.hostname === backend.storageHost && req.method() === 'PUT') {
      try {
        const key = decodeURIComponent(url.pathname.slice(1))
        assert(key.startsWith('verification/v1/'))
        assert.equal(url.searchParams.get('x-amz-acl'), 'private')
        assert.equal(req.headers().authorization, undefined)
        const attachment = await backend.db.verificationAttachment.findUnique({
          where: { quarantineKey: key },
        })
        assert(
          attachment &&
            attachment.status === 'CREATED' &&
            attachment.expiresAt > new Date(),
          'Backend-authorized unexpired quarantine target required',
        )
        backend.objects.set(key, req.postDataBuffer())
        report.counts.storagePuts++
        return route.fulfill({
          status: 200,
          headers: { 'access-control-allow-origin': origin },
        })
      } catch (e) {
        transportFailures.push(scrub(e.message))
        return route.abort()
      }
    }
    transportFailures.push('Unexpected external request blocked')
    return route.abort()
  })
  const page = await ctx.newPage()
  pages.push(page)
  page.on('response', async (r) => {
    const req = r.request()
    if (!new URL(r.url()).pathname.startsWith('/api/v1/')) return
    const entry = {
      method: req.method(),
      path: pathOf(r.url()),
      status: r.status(),
      request: bodyShape(req),
    }
    report.http.push(entry)
    if (r.status() >= 400) {
      try {
        const b = await r.json()
        entry.error = {
          code: scrub(b.code || ''),
          message: scrub(b.message || ''),
        }
      } catch {
        /* no raw response */
      }
    }
  })
  page.on('request', (r) => {
    if (r.method() !== 'POST') return
    if (r.url().endsWith('/admin/verification-terms/publications'))
      report.counts.publicationPosts++
    if (r.url().endsWith('/verification-terms/accept'))
      report.counts.acceptancePosts++
  })
  return page
}
async function mutation(page, suffix, act, status, method = 'POST') {
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === method &&
      new URL(r.url()).pathname.endsWith(suffix),
    { timeout: 15000 },
  )
  void response.catch(() => {})
  await act()
  const r = await response
  assert.equal(
    r.status(),
    status,
    method +
      ' ' +
      suffix.replace(/[a-f\d-]{36}/gi, ':uuid') +
      ' HTTP ' +
      r.status(),
  )
  return r.json()
}
async function login(page, email) {
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(backend.password)
  await mutation(
    page,
    '/auth/login',
    () =>
      page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(),
    200,
  )
  await expect(page.getByLabel('Correo electrónico')).toHaveCount(0)
}
async function noPending(page) {
  assert.deepEqual(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) || '[]'),
      markerKey,
    ),
    [],
    'Pending mutation: stop dependent commands',
  )
}
async function publicationCounts() {
  const p = await backend.db.verificationPolicy.findUniqueOrThrow({
    where: { id: 1 },
  })
  return {
    versions: await backend.db.verificationTerms.count({ where: { version } }),
    commands: await backend.db.verificationCommand.count({
      where: { actorId: backend.admin.id, operation: 'PUBLISH_TERMS' },
    }),
    events: await backend.db.verificationEvent.count({
      where: { kind: 'TERMS_PUBLISHED', target: version },
    }),
    revision: p.revision,
    enforcement: p.enabled,
  }
}
async function newCase(page, button, label) {
  await noPending(page)
  const c = await mutation(
    page,
    '/driver/verification-cases',
    () => page.getByRole('button', { name: button, exact: true }).click(),
    201,
  )
  await page.waitForURL('**/verification/cases/' + c.id)
  await expect(
    page.getByRole('heading', { name: 'Datos del borrador' }),
  ).toBeVisible()
  const row = await backend.db.verificationCase.findUniqueOrThrow({
    where: { id: c.id },
  })
  assert.equal(row.environment, 'PRODUCTION')
  assert.equal(row.policyVersion, 'DOCUMENTARY-1')
  await mark(label, {
    environment: row.environment,
    checklist: row.policyVersion,
    createdVia: 'Web',
  })
  return c.id
}
async function saveData(page, id) {
  await mutation(
    page,
    '/verification-cases/' + id,
    () =>
      page.getByRole('button', { name: 'Guardar datos', exact: true }).click(),
    200,
    'PATCH',
  )
  await expect(
    page.getByRole('button', { name: 'Guardar datos', exact: true }),
  ).toBeEnabled()
  await expect(page.getByText(/Revisión 2\. Estado documental/)).toBeVisible()
}
async function uploadAndSubmit(page, id, categories, label) {
  for (const [index, category] of categories.entries()) {
    await noPending(page)
    const jpeg = index === 1 || category === 'REGISTRATION_CARD',
      name = 'synthetic-' + category + (jpeg ? '.jpg' : '.png')
    await page.getByLabel('Categoría').selectOption(category)
    await page
      .getByLabel('Imagen *', { exact: true })
      .setInputFiles({
        name,
        mimeType: jpeg ? 'image/jpeg' : 'image/png',
        buffer: jpeg ? backend.jpeg : backend.png,
      })
    const r = await mutation(
      page,
      '/complete',
      () =>
        page
          .getByRole('button', { name: 'Cargar imagen', exact: true })
          .click(),
      200,
    )
    await expect(
      page.getByText('Carga confirmada: ' + name + '.', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Cargar imagen', exact: true }),
    ).toBeEnabled()
    const a = await backend.db.verificationAttachment.findUniqueOrThrow({
      where: { id: r.id },
    })
    assert.equal(a.status, 'VALIDATED')
    assert.equal(a.mime, 'image/png')
    report.checkpoints[label].uploads ||= []
    report.checkpoints[label].uploads.push({
      category,
      input: jpeg ? 'JPEG' : 'PNG',
      normalized: a.mime,
      status: a.status,
    })
    await save()
  }
  assert.equal(
    await backend.db.verificationAttachment.count({
      where: { caseId: id, status: 'VALIDATED' },
    }),
    categories.length,
  )
  await page
    .getByRole('button', { name: 'Presentar para revisión', exact: true })
    .click()
  await mutation(
    page,
    '/verification-cases/' + id + '/submit',
    () =>
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirmar', exact: true })
        .click(),
    200,
  )
  await expect(
    page.getByRole('heading', { name: /^(Identidad|Unidad) · En revisión$/ }),
  ).toBeVisible()
  await capture(page, label.toLowerCase() + '-submitted')
}
async function review(id, label) {
  await admin.goto(origin + '/verification/cases/' + id)
  await noPending(admin)
  await expect(
    admin.getByRole('heading', { name: 'Decisión SUPER_ADMIN' }),
  ).toBeVisible()
  const previews = admin.getByRole('button', {
    name: 'Ver evidencia',
    exact: true,
  })
  const count = await previews.count()
  assert(count > 0)
  for (let i = 0; i < count; i++) {
    await previews.nth(i).click()
    const image = admin.getByRole('img', {
      name: 'Evidencia privada del expediente',
    })
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((e) => e.naturalWidth))
      .toBeGreaterThan(0)
    await admin.getByRole('button', { name: 'Cerrar evidencia' }).click()
  }
  for (const box of await admin.locator('input[name=check]').all()) {
    await expect(box).not.toBeChecked()
    await box.check()
  }
  await mutation(
    admin,
    '/admin/verification-cases/' + id + '/decision',
    () =>
      admin
        .getByRole('button', { name: 'Registrar decisión explícita' })
        .click(),
    200,
  )
  await expect(
    admin.getByRole('heading', { name: /^(Identidad|Unidad) · Aprobado$/ }),
  ).toBeVisible()
  const c = await backend.db.verificationCase.findUniqueOrThrow({
    where: { id },
  })
  assert.equal(c.status, 'APPROVED')
  assert.equal(c.checklist.version, 'DOCUMENTARY-1')
  assert.equal(c.environment, 'PRODUCTION')
  await mark(label, {
    previewsViaAuthenticatedWeb: count,
    decision: 'APPROVED',
    checklist: c.checklist.version,
    environment: c.environment,
  })
  await capture(admin, label.toLowerCase())
}

await mkdir(work, { recursive: true })
await save()
console.log('Report: ' + work + '/report.json')
try {
  await checkpoint('SETUP', [], async () => {
    const prior = JSON.parse(
      await readFile('docs/onboarding-production-web-evidence.json', 'utf8'),
    )
    report.hashes.web = await Promise.all(
      prior.sources.web.map(async (x) => ({
        file: x.file,
        sha256: hash(await readFile(x.file)),
      })),
    )
    report.hashes.backend = await Promise.all(
      [
        ...prior.sources.backendCompared,
        ...prior.sources.backendRuntimeUsedInPartialAttempt,
      ].map(async (x) => ({
        file: x.file,
        sha256: hash(await readFile(root + '/' + x.file)),
      })),
    )
    report.hashes.backendHead = (
      await readFile(
        root + '/.git/refs/heads/feature/driver-verification',
        'utf8',
      )
    ).trim()
    report.hashes.webHead = prior.webHead
    const env = await prepareDatabase()
    assert.equal(env.status, 'PASS')
    report.isolation.temporaryDatabaseIdentity = true
    backend = await startBackend()
    const rows = await backend.db.$queryRawUnsafe(
      'SELECT current_database() AS name,inet_server_port() AS port',
    )
    assert.equal(rows[0].name, new URL(database).pathname.slice(1))
    assert.equal(rows[0].port, pgPort)
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
        proxy: { '/api/v1': { target: `http://127.0.0.1:${apiPort}` } },
      },
    })
    await vite.listen()
    browser = await chromium.launch({ timeout: 15000 })
    admin = await context()
    driver = await context()
    historical = await context()
    await login(admin, backend.admin.email)
  })
  await checkpoint('H', ['SETUP'], async () => {
    await login(historical, backend.oldUser.email)
    await historical.goto(
      origin + '/verification/cases/' + backend.historicalCase.id,
    )
    await expect(
      historical.getByText(/Expediente histórico o sin procedencia/),
    ).toBeVisible()
    await expect(
      historical.getByRole('button', { name: 'Guardar datos' }),
    ).toHaveCount(0)
    await expect(
      historical.getByRole('button', { name: 'Presentar para revisión' }),
    ).toHaveCount(0)
    await expect(
      historical.getByRole('button', {
        name: 'Retirar expediente',
        exact: true,
      }),
    ).toBeVisible()
    await capture(historical, 'historical-local-test')
    await mark('H', {
      seededHistory: true,
      environment: 'LOCAL_TEST',
      autoConversion: false,
    })
  })
  let lostPublication
  await checkpoint('A', ['SETUP'], async () => {
    await admin.goto(origin + '/admin/verification-publications')
    await expect(
      admin.getByRole('heading', { name: 'Nueva publicación inmutable' }),
    ).toBeVisible()
    report.recovery.before = await publicationCounts()
    await admin.getByLabel('Ámbito de publicación').selectOption('DRIVER')
    await admin.getByLabel('Versión de términos').fill(version)
    await admin
      .getByLabel('Texto completo de términos', { exact: true })
      .fill(legalText)
    await admin.getByLabel('Versión de privacidad').fill(privacyVersion)
    await admin
      .getByLabel('Texto completo del aviso de privacidad', { exact: true })
      .fill(privacyText)
    await admin
      .getByRole('button', { name: 'Añadir consentimiento específico' })
      .click()
    await admin
      .getByLabel('Identificador de consentimiento 1')
      .fill('synthetic-purpose')
    await admin
      .getByLabel('Texto de consentimiento 1')
      .fill('FINALIDAD SINTÉTICA SEPARADA, SIN VALIDEZ LEGAL.')
    await admin
      .getByLabel('Referencia no secreta de autorización')
      .fill('ISOLATED-TEST-NOT-LEGAL-APPROVAL')
    await expect(admin.getByRole('checkbox')).not.toBeChecked()
    await admin.getByRole('checkbox').check()
    await admin
      .getByRole('button', { name: 'Revisar publicación', exact: true })
      .click()
    await expect(admin.getByRole('dialog')).toBeVisible()
    await admin.route(
      '**/api/v1/admin/verification-terms/publications',
      async (route) => {
        try {
          const r = await route.fetch({ maxRetries: 0, timeout: 15000 })
          const b = await r.json()
          report.http.push({
            method: 'POST',
            path: '/api/v1/admin/verification-terms/publications',
            status: r.status(),
            error:
              r.status() >= 400
                ? { code: scrub(b.code || ''), message: scrub(b.message || '') }
                : undefined,
            request: bodyShape(route.request()),
            transport: 'Response dropped after real backend commit',
          })
          assert.equal(r.status(), 201)
          assert.equal(b.version, version)
          const cmd = await backend.db.verificationCommand.findUniqueOrThrow({
            where: {
              actorId_key: {
                actorId: backend.admin.id,
                key: route.request().headers()['idempotency-key'],
              },
            },
          })
          assert.equal(cmd.state, 'APPLIED')
          assert.equal(cmd.result.version, version)
          lostPublication = { status: r.status(), committed: true }
          report.recovery.afterCommit = await publicationCounts()
          await save()
          await route.abort()
        } catch (e) {
          lostPublication = { error: scrub(e.message) }
          await route.abort()
        }
      },
      { times: 1 },
    )
    const button = admin.getByRole('button', {
      name: 'Publicar versión autorizada',
    })
    await button.focus()
    await admin.keyboard.press('Enter')
    await expect.poll(() => !!lostPublication, { timeout: 18000 }).toBe(true)
    assert.equal(lostPublication.committed, true, lostPublication.error)
    assert.deepEqual(report.recovery.afterCommit, {
      versions: 1,
      commands: 1,
      events: 1,
      revision: report.recovery.before.revision + 1,
      enforcement: false,
    })
    await expect(
      admin.getByRole('button', { name: 'Consultar intento', exact: true }),
    ).toBeVisible()
    await capture(admin, 'publication-response-lost')
  })
  await checkpoint('B', ['A'], async () => {
    const markers = await admin.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) || '[]'),
      markerKey,
    )
    assert.equal(markers.length, 1)
    assert.deepEqual(Object.keys(markers[0]).sort(), [
      'actor',
      'key',
      'operation',
      'target',
    ])
    assert.equal(markers[0].operation, 'PUBLISH_TERMS')
    assert.equal(markers[0].target, 'POLICY')
    report.recovery.markerKeyHash = hash(markers[0].key)
    await admin.reload()
    const get = admin.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        new URL(r.url()).pathname.includes('/verification-command-attempts/'),
      { timeout: 12000 },
    )
    void get.catch(() => {})
    await admin
      .getByRole('button', { name: 'Consultar intento', exact: true })
      .click()
    const res = await get
    assert.equal(res.status(), 200)
    assert.equal((await res.json()).state, 'APPLIED')
    assert(new URL(res.url()).pathname.endsWith('/' + markers[0].key))
    assert.equal(
      new URL(res.url()).searchParams.get('operation'),
      'PUBLISH_TERMS',
    )
    assert.equal(new URL(res.url()).searchParams.get('target'), 'POLICY')
    await expect(
      admin.getByRole('heading', {
        name: 'Publicación recuperada · fotografía histórica',
      }),
    ).toBeVisible()
    await noPending(admin)
    report.recovery.afterGet = await publicationCounts()
    assert.deepEqual(report.recovery.afterGet, report.recovery.afterCommit)
    assert.equal(report.counts.publicationPosts, 1)
    report.recovery.getStatus = 200
    report.recovery.sameOriginalKey = true
    report.recovery.duplicateEffects = 0
    await capture(admin, 'publication-recovered')
  })
  await checkpoint('C', ['A'], async () => {
    await driver.goto(origin + '/driver/register')
    await driver.getByLabel('Correo electrónico').fill('driver@example.invalid')
    await mutation(
      driver,
      '/independent-driver-registrations',
      () =>
        driver
          .getByRole('button', { name: 'Solicitar correo de registro' })
          .click(),
      202,
    )
    await expect(driver.getByText(/Revisa tu correo/)).toBeVisible()
    const token = backend.mail
      .findLast((x) =>
        x.text.includes('confirmación (vigencia máxima de 30 minutos)'),
      )
      ?.text.match(
        /confirmación \(vigencia máxima de 30 minutos\): ([A-Za-z0-9_-]{43})/,
      )?.[1]
    assert(token, 'Captured mail must contain confirmation challenge')
    await driver
      .getByRole('link', { name: 'Confirmar con el código recibido' })
      .click()
    await driver.getByLabel('Código de confirmación').fill(token)
    await driver
      .getByLabel('Nombre *', { exact: true })
      .fill('Persona sintética')
    await driver.getByLabel('Contraseña nueva').fill(backend.password)
    await mutation(
      driver,
      '/independent-driver-registrations/confirm',
      () =>
        driver
          .getByRole('button', { name: 'Confirmar y continuar a login' })
          .click(),
      200,
    )
    await expect(
      driver.getByRole('button', { name: 'Iniciar sesión', exact: true }),
    ).toBeVisible()
    await login(driver, 'driver@example.invalid')
    await driver.goto(origin + '/driver/onboarding')
    person = await backend.db.user.findUniqueOrThrow({
      where: { email: 'driver@example.invalid' },
    })
    personDriver = await backend.db.driver.findUniqueOrThrow({
      where: { userId: person.id },
      include: { independentProfile: true },
    })
    assert.equal(personDriver.providerId, null)
    assert.equal(personDriver.status, 'PENDING')
    assert.equal(personDriver.independentProfile.status, 'PENDING')
    await mark('C', {
      browserRegistration: true,
      confirmationFromCapturedMail: true,
      automaticLogin: false,
      providerId: null,
      driver: 'PENDING',
      profile: 'PENDING',
    })
  })
  await checkpoint('D', ['C'], async () => {
    await expect(driver.getByRole('checkbox')).toHaveCount(3)
    for (const b of await driver.getByRole('checkbox').all())
      await expect(b).not.toBeChecked()
    assert.equal(
      (
        await driver
          .getByRole('region', {
            name: 'Texto completo de los términos',
            exact: true,
          })
          .innerText()
      ).trim(),
      legalText.trim(),
    )
    assert.equal(
      (
        await driver
          .getByRole('region', {
            name: 'Texto completo del aviso de privacidad',
            exact: true,
          })
          .innerText()
      ).trim(),
      privacyText.trim(),
    )
    await driver.getByRole('checkbox').nth(0).check()
    await driver.getByRole('checkbox').nth(1).check()
    await expect(
      driver.getByRole('button', {
        name: 'Aceptar personalmente',
        exact: true,
      }),
    ).toBeDisabled()
    assert.equal(
      await backend.db.verificationAcceptance.count({
        where: { userId: person.id },
      }),
      0,
    )
    await driver.getByRole('checkbox').nth(2).check()
    const r = await mutation(
      driver,
      '/verification-terms/accept',
      () =>
        driver
          .getByRole('button', { name: 'Aceptar personalmente', exact: true })
          .click(),
      200,
    )
    await expect(driver.getByText(/Comprobante recibido/)).toBeVisible()
    const a = await backend.db.verificationAcceptance.findUniqueOrThrow({
      where: { id: r.id },
    })
    assert.equal(a.scope, 'DRIVER')
    assert.equal(a.providerId, null)
    assert.equal(a.version, version)
    assert.equal(a.privacyVersion, privacyVersion)
    assert.equal(a.specificConsents.length, 1)
    assert.equal(a.specificConsents[0].id, 'synthetic-purpose')
    assert.equal(report.counts.acceptancePosts, 1)
    await noPending(driver)
    await capture(driver, 'personal-acceptance')
    await mark('D', {
      separateCheckboxes: 3,
      acceptanceCount: 1,
      scope: 'DRIVER',
      privacySeparate: true,
      consents: 1,
    })
  })
  await checkpoint('G', ['D'], async () => {
    const d = await backend.db.driver.findUniqueOrThrow({
      where: { id: personDriver.id },
      include: { independentProfile: true },
    })
    assert.equal(d.status, 'PENDING')
    assert.equal(d.availability, 'OFFLINE')
    assert.equal(d.independentProfile.status, 'PENDING')
    assert.equal(
      await backend.db.verificationCase.count({
        where: { presenterId: person.id },
      }),
      0,
    )
    assert.equal(
      (
        await backend.db.verificationPolicy.findUniqueOrThrow({
          where: { id: 1 },
        })
      ).enabled,
      false,
    )
    await expect(
      driver.getByText(/Aceptar no aprueba el expediente ni habilita/),
    ).toBeVisible()
    await mark('G', {
      driver: d.status,
      availability: d.availability,
      profile: d.independentProfile.status,
      cases: 0,
      enforcement: false,
    })
  })
  await checkpoint('E_IDENTITY', ['D'], async () => {
    identityCase = await newCase(
      driver,
      'Preparar expediente de identidad independiente',
      'E_IDENTITY',
    )
    await driver.getByLabel('Nombre completo').fill('Persona sintética')
    await driver.getByLabel('Teléfono de contacto').fill('0000000000')
    await driver.getByLabel('Ciudad de operación').fill('Ciudad sintética')
    await saveData(driver, identityCase)
    await uploadAndSubmit(
      driver,
      identityCase,
      ['FACE_PHOTO', 'INE_FRONT', 'INE_BACK'],
      'E_IDENTITY',
    )
  })
  await checkpoint('E_UNIT', ['D'], async () => {
    await driver.goto(origin + '/driver/onboarding')
    await noPending(driver)
    await driver
      .getByText('Registrar unidad independiente', { exact: true })
      .click()
    await driver
      .getByLabel('Identificador *', { exact: true })
      .fill('SYNTHETIC-BICYCLE')
    await driver.getByLabel('Tipo *', { exact: true }).selectOption('BICYCLE')
    await mutation(
      driver,
      '/driver/onboarding/vehicles',
      () =>
        driver
          .getByRole('button', { name: 'Crear unidad pendiente', exact: true })
          .click(),
      201,
    )
    await expect(
      driver.getByText(
        'Unidad creada. Selecciónala para preparar su expediente.',
      ),
    ).toBeVisible()
    unitCase = await newCase(
      driver,
      'Preparar expediente de esta unidad',
      'E_UNIT',
    )
    await driver
      .getByLabel('Nombre del titular declarado')
      .fill('Persona sintética')
    await driver.getByLabel('Número de serie').fill('SYNTHETIC-SERIAL')
    await driver.getByLabel('Propiedad o uso autorizado').selectOption('OWNED')
    await saveData(driver, unitCase)
    await uploadAndSubmit(
      driver,
      unitCase,
      ['REGISTRATION_CARD', 'OWNERSHIP_PROOF'],
      'E_UNIT',
    )
  })
  await checkpoint('F_IDENTITY', ['E_IDENTITY', 'B'], () =>
    review(identityCase, 'F_IDENTITY'),
  )
  await checkpoint('F_UNIT', ['E_UNIT', 'B'], () => review(unitCase, 'F_UNIT'))
  await checkpoint('H_FINAL', ['SETUP', 'H'], async () => {
    assert.deepEqual(
      await backend.db.verificationCase.findUniqueOrThrow({
        where: { id: backend.historicalCase.id },
      }),
      backend.historicalCase,
    )
    assert.equal(
      await backend.db.verificationAcceptance.count({
        where: { userId: backend.oldUser.id },
      }),
      0,
    )
    assert.equal(
      (
        await backend.db.verificationPolicy.findUniqueOrThrow({
          where: { id: 1 },
        })
      ).enabled,
      false,
    )
    await mark('H_FINAL', {
      historicalRowUnchanged: true,
      oldActorAcceptances: 0,
      enforcement: false,
    })
  })
  report.transportFailures = transportFailures
  assert.deepEqual(transportFailures, [])
  report.status = Object.values(report.checkpoints).every(
    (x) => x.status === 'PASS',
  )
    ? 'PASS'
    : 'INCOMPLETE'
} catch (e) {
  report.status = 'FAIL'
  report.fatal = scrub(e.message)
} finally {
  report.counts.mailCaptured = backend?.mail.length || 0
  report.counts.storageSdkCalls = backend?.storageCalls.length || 0
  for (const [name, stop] of [
    ['browser', () => browser?.close()],
    ['vite', () => vite?.close()],
    ['backend', () => backend?.close()],
    ['database', () => stopDatabase()],
  ]) {
    try {
      const r = await stop()
      report.cleanup[name] = r === false ? 'FAILED' : 'STOPPED'
    } catch (e) {
      report.cleanup[name] = 'FAILED'
      report.cleanup[name + 'Error'] = scrub(e.message)
    }
    await save()
  }
  if (Object.values(report.cleanup).includes('FAILED')) report.status = 'FAIL'
  report.finishedAt = new Date().toISOString()
  await save()
  if (report.status !== 'PASS') process.exitCode = 1
  console.log('Final: ' + report.status + '; ' + work + '/report.json')
}
