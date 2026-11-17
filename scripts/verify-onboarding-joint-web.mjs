// REAL HTTP acceptance against a coordinator-owned, isolated backend session.
// No API mocking/interception, backend lifecycle, database access or operational commands.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { watch as watchDirectory } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { build, preview } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium, expect } from '@playwright/test'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, '').split('=')
    return [key, value.length ? value.join('=') : true]
  }),
)
if (args['review-report']) {
  const originalPath = resolve(args['review-report'])
  const original = JSON.parse(await readFile(originalPath, 'utf8'))
  assert.equal(original.mode, 'documentary')
  assert.equal(
    original.failure?.message,
    'Unexpected write outside documentary acceptance',
  )
  validateWrites(original)
  assert.deepEqual(original.errors, [])
  const submitted = original.snapshots.find(
    (snapshot) => snapshot.stage === 'submitted',
  )
  assert.equal(submitted?.cases.length, 2)
  assert(submitted.cases.every((record) => record.status === 'SUBMITTED'))
  assert(
    original.http
      .filter((entry) => entry.path === '/api/v1/driver/onboarding')
      .every((entry) => entry.view === 'DOCUMENTARY' && entry.status === 200),
  )
  const review = {
    status: 'PASS_REVIEWED_WITHOUT_REPLAY',
    originalReport: originalPath,
    reason:
      'Authenticated POST attachment/access is a read; original report preserved',
    newPhotoUploads: original.http.filter(
      (entry) => entry.method === 'POST' && /\/uploads$/.test(entry.path),
    ).length,
    submittedCases: submitted.cases,
    errors: original.errors,
  }
  await writeFile(
    originalPath.replace(/report\.json$/, 'review.json'),
    JSON.stringify(review, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      status: review.status,
      newPhotoUploads: review.newPhotoUploads,
    }),
  )
  process.exit(0)
}
if (args.help || !args.ready) {
  console.log(
    'Prepared only; no server, credentials or API accessed. After explicit READY: --ready --session-id=<new session> --access-file=<private JSON> --mode=documentary|mixed|observe [--expected-state=OFFLINE|READY]',
  )
  process.exit(args.help ? 0 : 2)
}
assert.equal(
  typeof args['session-id'],
  'string',
  'A fresh coordinator session ID is required',
)
assert.equal(
  typeof args['access-file'],
  'string',
  'A private access file is required',
)
assert(
  ['serve', 'documentary', 'documentary-readback', 'mixed', 'observe'].includes(
    args.mode,
  ),
  'Choose an acceptance mode',
)
let config
try {
  const access = JSON.parse(
    await readFile(resolve(args['access-file']), 'utf8'),
  )
  if (args['ready-file']) {
    const ready = JSON.parse(
      await readFile(resolve(args['ready-file']), 'utf8'),
    )
    config = {
      ...ready,
      sessionId: ready.alias,
      apiOrigin: new URL(ready.apiWindowsUrl).origin,
      accounts: access,
      fixtureAccounts: ready.accounts,
      synthetic: ready.flags?.documentaryEnvironment === 'LOCAL_TEST',
    }
  } else config = access
} catch {
  throw new Error(
    'The private access file could not be loaded or parsed; contents omitted',
  )
}
assert.equal(config.status, 'READY', 'The coordinator session is not READY')
assert.equal(
  config.sessionId,
  args['session-id'],
  'Session mismatch; do not reuse an old fixture',
)
if (config.expiresAt)
  assert(Date.parse(config.expiresAt) > Date.now(), 'Session access expired')
else
  assert(
    Date.now() - Date.parse(config.checkedAt) < 12 * 60 * 60 * 1000,
    'READY metadata is not from this new session window',
  )
assert.equal(
  config.synthetic,
  true,
  'Only a synthetic isolated session is accepted',
)
const localOrigin = (value) => {
  const url = new URL(value)
  assert(
    ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
    'Only loopback origins from this handoff are accepted',
  )
  assert(
    url.protocol === 'http:' &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password,
    'Expected a plain local HTTP origin',
  )
  return url.origin
}
const api = localOrigin(config.apiOrigin)
const web = localOrigin(config.webOrigin)
const account = args.mode.startsWith('documentary')
  ? (config.accounts.documentary ?? config.accounts.onboarding)
  : config.accounts.mixed
const expected =
  config.fixtureAccounts?.[
    args.mode.startsWith('documentary') ? 'onboarding' : 'mixed'
  ]
if (expected)
  assert.equal(
    account.driverId,
    expected.driverId,
    'Private access and public fixture differ',
  )
assert(
  typeof account?.email === 'string' && typeof account?.password === 'string',
  'Missing private account access',
)
if (args.mode === 'observe')
  assert(
    ['OFF', 'OFFLINE', 'READY'].includes(args['expected-state']),
    'Observation needs one coordinated expected state',
  )
const output = resolve(
  'test-results',
  'onboarding-joint-web',
  Date.now() + '-' + args.mode,
)
const dist = join(output, 'dist')
const serverStatePath = resolve(
  'test-results/onboarding-joint-web/server-current.json',
)
await mkdir(output, { recursive: true })
const hash = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex')
const report = {
  kind: 'REAL_NEST_POSTGRES_BROWSER_HTTP',
  status: 'RUNNING',
  sessionId: config.sessionId,
  mode: args.mode,
  startedAt: new Date().toISOString(),
  api,
  web,
  simulatedResponses: false,
  backendStartedByWeb: false,
  checks: [],
  http: [],
  snapshots: [],
  observations: [],
  errors: [],
}
let server, browser, context, page
let step = 'build'
const pendingReads = new Set()
const onboardingResponses = []
function mark(label) {
  step = label
  console.log(label)
}
function sanitize(value) {
  let text = String(value)
  for (const entry of Object.values(config.accounts)) {
    for (const secret of [entry.email, entry.password].filter(Boolean))
      text = text.replaceAll(secret, '[private]')
  }
  return text
}
function watch(target) {
  target.on('pageerror', (error) => report.errors.push(sanitize(error.message)))
  target.on('response', (response) => {
    const url = new URL(response.url())
    if (url.origin !== api) return
    const request = response.request()
    // No headers, request bodies, auth responses, signed URLs or tokens in evidence.
    report.http.push({
      method: request.method(),
      path: url.pathname,
      view: url.pathname.endsWith('/driver/onboarding')
        ? url.searchParams.get('view')
        : undefined,
      status: response.status(),
    })
    if (
      [
        '/api/v1/driver/onboarding',
        '/api/v1/driver/me',
        '/api/v1/driver/offer-reception',
      ].includes(url.pathname) &&
      response.ok()
    ) {
      const read = response.json().then((data) => {
        if (url.pathname.endsWith('/onboarding')) onboardingResponses.push(data)
        else
          report.observations.push({
            at: new Date().toISOString(),
            path: url.pathname,
            availability: data.availability,
            state: data.state,
            reason: data.reason,
          })
      })
      pendingReads.add(read)
      void read
        .catch(() => report.errors.push('Unreadable onboarding response'))
        .finally(() => pendingReads.delete(read))
    }
  })
}
async function freshPage() {
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  page = await context.newPage()
  page.setDefaultTimeout(15000)
  watch(page)
}
async function login() {
  mark('login-' + args.mode)
  await page.goto(web + '/login?next=onboarding')
  await page.getByLabel('Correo electrónico').fill(account.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password)
  const response = page.waitForResponse(
    (r) =>
      r.url() === api + '/api/v1/auth/login' && r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  assert((await response).ok(), 'Real UI login failed')
  await expect(page).not.toHaveURL(/\/login/)
}
async function logout() {
  await page.goto(web + '/profile')
  await page.locator('.user-trigger').click()
  const response = page.waitForResponse(
    (r) => r.url() === api + '/api/v1/auth/logout',
  )
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  assert((await response).ok(), 'Remote logout was not confirmed')
  await expect(page).toHaveURL(/\/login/)
}
async function onboarding(path = '/driver/onboarding?view=details') {
  const response = page.waitForResponse((r) => {
    const url = new URL(r.url())
    return (
      url.origin === api &&
      url.pathname === '/api/v1/driver/onboarding' &&
      r.request().method() === 'GET'
    )
  })
  await page.goto(web + path)
  const r = await response
  assert(r.ok(), 'Onboarding read failed')
  assert.equal(new URL(r.url()).searchParams.get('view'), 'DOCUMENTARY')
  const data = await r.json()
  assert.equal(data.view, 'DOCUMENTARY')
  return data
}
async function readCase(id) {
  const response = page.waitForResponse(
    (r) =>
      r.url() === api + '/api/v1/verification-cases/' + id &&
      r.request().method() === 'GET',
  )
  await page.goto(web + '/verification/cases/' + id)
  const r = await response
  assert(r.ok(), 'Own case read failed')
  const record = await r.json()
  assert.equal(record.id, id)
  return record
}
const compact = (record) => ({
  id: record.id,
  resourceId: record.resourceId,
  status: record.status,
  revision: record.revision,
  dataHash: hash(record.data),
  attachments: record.attachments.map(
    ({ id, category, status, hash: contentHash }) => ({
      id,
      category,
      status,
      contentHash,
    }),
  ),
})
async function capture(label) {
  assert(
    !new URL(page.url()).pathname.startsWith('/login'),
    'Never capture credentials',
  )
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'Horizontal overflow: ' + label,
    )
    // Only main content; excludes account menu/email and the login form.
    await page.locator('main').screenshot({
      path: join(output, `${label}-${width}.png`),
      mask: [page.locator('.user-menu')],
    })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}
async function inspectPhoto(record) {
  if (
    !record.attachments.some((attachment) => attachment.status === 'VALIDATED')
  )
    return false
  await page
    .getByRole('button', { name: 'Ver evidencia', exact: true })
    .first()
    .click()
  await expect(
    page.getByText('Imagen normalizada recibida por proxy autenticado.'),
  ).toBeVisible()
  await expect(
    page.getByAltText('Evidencia privada del expediente'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Cerrar evidencia', exact: true })
    .click()
  return true
}
async function syntheticImage() {
  return Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 800
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'black'
      ctx.font = '36px sans-serif'
      ctx.fillText('SYNTHETIC LOCAL TEST — NOT A REAL DOCUMENT', 40, 100)
      ctx.fillText('Mandaria isolated onboarding acceptance', 40, 180)
      ctx.strokeRect(40, 240, 1100, 480)
      return canvas.toDataURL('image/png').split(',')[1]
    }),
    'base64',
  )
}
function validateWrites(runReport) {
  const writes = runReport.http.filter(
    (entry) =>
      !['GET', 'OPTIONS'].includes(entry.method) &&
      !entry.path.startsWith('/api/v1/auth/') &&
      !(
        entry.method === 'POST' &&
        /^\/api\/v1\/verification-cases\/[^/]+\/attachments\/[^/]+\/access$/.test(
          entry.path,
        )
      ),
  )
  if (runReport.mode !== 'documentary')
    assert.equal(writes.length, 0, 'Mixed account must remain read-only')
  else {
    const ids = runReport.documentaryIds
    assert(
      writes.every(
        (entry) =>
          (entry.method === 'POST' &&
            entry.path === '/api/v1/driver/onboarding/submit') ||
          [ids.identity, ids.unit].some(
            (id) =>
              (entry.method === 'PATCH' &&
                entry.path === '/api/v1/verification-cases/' + id) ||
              (entry.method === 'POST' &&
                new RegExp(
                  '^/api/v1/verification-cases/' +
                    id +
                    '/uploads(?:/[^/]+/complete)?$',
                ).test(entry.path)),
          ),
      ),
      'Unexpected write outside documentary acceptance',
    )
    assert.equal(
      writes.filter((entry) => entry.path.endsWith('/onboarding/submit'))
        .length,
      1,
      'Expected one submission',
    )
  }
}
try {
  const options = {
    configFile: false,
    envDir: false,
    plugins: [react()],
    logLevel: 'error',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(api),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
    },
    build: { outDir: dist, emptyOutDir: false },
  }
  if (args['existing-web']) {
    const serving = JSON.parse(await readFile(serverStatePath, 'utf8'))
    assert.equal(serving.status, 'SERVING')
    assert.equal(serving.sessionId, config.sessionId)
    assert.equal(serving.checkedAt, config.checkedAt)
    assert.equal(serving.api, api)
    assert.equal(serving.web, web)
    report.buildIndexHash = serving.buildIndexHash
    report.serverOutput = serving.output
  } else {
    await build(options)
    report.buildIndexHash = hash(
      await readFile(join(dist, 'index.html'), 'utf8'),
    )
    server = await preview({
      ...options,
      preview: {
        host: new URL(web).hostname,
        port: Number(new URL(web).port),
        strictPort: true,
        open: false,
      },
    })
  }
  if (args.mode === 'serve') {
    assert(server, 'Serve mode owns its preview process')
    mark('serving-until-coordinated-close')
    const state = {
      status: 'SERVING',
      sessionId: config.sessionId,
      checkedAt: config.checkedAt,
      api,
      web,
      output,
      buildIndexHash: report.buildIndexHash,
      pid: process.pid,
    }
    await writeFile(serverStatePath, JSON.stringify(state, null, 2) + '\n')
    console.log(JSON.stringify(state))
    await new Promise((done) => {
      const watcher = watchDirectory(output, (_event, filename) => {
        if (String(filename) === 'stop.request') {
          watcher.close()
          done()
        }
      })
    })
    report.status = 'CLOSED'
    await writeFile(
      serverStatePath,
      JSON.stringify({ ...state, status: 'CLOSED' }, null, 2) + '\n',
    )
  } else {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
    await freshPage()
    await login()
    if (args.mode === 'documentary') {
      mark('documentary-baseline')
      const initial = await onboarding()
      const vehicle = initial.driver.independentProfile.vehicles.find(
        (v) => v.id === expected?.vehicles.primary,
      )
      assert.equal(initial.driver.independentProfile.vehicles.length, 1)
      assert(vehicle, 'Use the exact vehicle ID from the new public fixture')
      assert.equal(vehicle.status, 'INACTIVE')
      const findDraft = (subject) =>
        subject?.cases.find(
          (record) =>
            record.status === 'DRAFT' &&
            record.environment === initial.environment,
        )
      const identitySummary = findDraft(
        initial.subjects.find(
          (s) => s.driverId === initial.driver.id && !s.vehicleId,
        ),
      )
      const unitSummary = findDraft(
        initial.subjects.find((s) => s.vehicleId === vehicle.id),
      )
      assert(
        identitySummary && unitSummary,
        'The seeded documentary drafts must already exist',
      )
      assert.equal(identitySummary.id, expected.cases.identity)
      assert.equal(unitSummary.id, expected.cases.primary)
      assert.equal(initial.driver.id, expected.driverId)
      report.documentaryIds = {
        identity: identitySummary.id,
        unit: unitSummary.id,
        vehicle: vehicle.id,
      }
      const initialIdentity = await readCase(identitySummary.id)
      const initialUnit = await readCase(unitSummary.id)
      report.snapshots.push({
        stage: 'initial',
        cases: [compact(initialIdentity), compact(initialUnit)],
      })
      await inspectPhoto(initialUnit)
      mark('save-existing-drafts')
      await onboarding('/driver/onboarding')
      const edit = page.getByRole('button', {
        name: 'Revisar mis datos',
        exact: true,
      })
      await expect(
        page.getByRole('heading', {
          name: /Tus fotos|Tus datos y tu vehículo/,
        }),
      ).toBeVisible()
      if (await edit.isVisible()) await edit.click()
      await page
        .getByLabel('Teléfono de contacto', { exact: false })
        .fill('0000000099')
      await page
        .getByRole('button', {
          name: 'Guardar y continuar con las fotos',
          exact: true,
        })
        .click()
      await expect(
        page.getByRole('heading', { name: 'Tus fotos', exact: true }),
      ).toBeVisible()
      const savedIdentity = await readCase(identitySummary.id)
      const savedUnit = await readCase(unitSummary.id)
      assert.equal(savedIdentity.data.contactPhone, '0000000099')
      assert.equal(savedUnit.resourceId, vehicle.id)
      assert.deepEqual(savedIdentity.attachments, initialIdentity.attachments)
      assert.deepEqual(savedUnit.attachments, initialUnit.attachments)
      report.snapshots.push({
        stage: 'saved',
        cases: [compact(savedIdentity), compact(savedUnit)],
      })
      await logout()
      await context.close()
      await freshPage()
      await login()
      mark('reenter-fresh-session')
      const resumed = await onboarding()
      assert.deepEqual(
        resumed.driver.independentProfile.vehicles.map((v) => v.id),
        [vehicle.id],
      )
      assert.deepEqual(
        compact(await readCase(identitySummary.id)),
        compact(savedIdentity),
      )
      assert.deepEqual(
        compact(await readCase(unitSummary.id)),
        compact(savedUnit),
      )
      await page.goto(web + '/profile')
      await expect(
        page.getByText('Borrador guardado · aún no enviado'),
      ).toHaveCount(2)
      await capture('saved-account')
      report.checks.push(
        'Same INACTIVE vehicle and draft UUIDs/data/photos after real UI save, logout and new browser context',
      )
      mark('complete-missing-synthetic-photos')
      await onboarding('/driver/onboarding')
      await expect(
        page.getByRole('heading', { name: 'Tus fotos', exact: true }),
      ).toBeVisible()
      const image = await syntheticImage()
      await writeFile(join(output, 'synthetic-document.png'), image)
      const missing = page.locator('article.journey-photo:not(.received)')
      report.newPhotoUploads = 0
      while (await missing.count()) {
        const card = missing.first()
        const category = await card.locator('h3').innerText()
        await card.locator('input[type=file]').setInputFiles({
          name: 'synthetic-document.png',
          mimeType: 'image/png',
          buffer: image,
        })
        await expect(
          page
            .locator('article.journey-photo')
            .filter({
              has: page.getByRole('heading', { name: category, exact: true }),
            })
            .getByText('Guardada', { exact: true }),
        ).toBeVisible()
        report.newPhotoUploads++
      }
      const completeIdentity = await readCase(identitySummary.id)
      assert(
        await inspectPhoto(completeIdentity),
        'A saved identity image must be readable through the real authenticated proxy',
      )
      const completeUnit = await readCase(unitSummary.id)
      await inspectPhoto(completeUnit)
      for (const [before, after] of [
        [savedIdentity, completeIdentity],
        [savedUnit, completeUnit],
      ]) {
        assert(
          before.attachments
            .filter((a) => a.status === 'VALIDATED')
            .every((a) =>
              after.attachments.some(
                (b) => b.id === a.id && b.status === 'VALIDATED',
              ),
            ),
          'Existing photos must survive continuation',
        )
      }
      report.snapshots.push({
        stage: 'complete',
        cases: [compact(completeIdentity), compact(completeUnit)],
      })
      await onboarding('/driver/onboarding')
      mark('submit-original-drafts-once')
      const submitted = page.waitForResponse(
        (r) =>
          r.url() === api + '/api/v1/driver/onboarding/submit' &&
          r.request().method() === 'POST',
      )
      await page
        .getByRole('button', { name: 'Enviar mi solicitud', exact: true })
        .click()
      assert((await submitted).ok(), 'Real submission rejected')
      await expect(
        page.getByRole('heading', {
          name: 'Tu solicitud está en revisión',
          exact: true,
        }),
      ).toBeVisible()
      await capture('submitted')
      const finalIdentity = await readCase(identitySummary.id)
      const finalUnit = await readCase(unitSummary.id)
      assert.equal(finalIdentity.status, 'SUBMITTED')
      assert.equal(finalUnit.status, 'SUBMITTED')
      const final = await onboarding()
      assert.deepEqual(
        final.driver.independentProfile.vehicles.map((v) => v.id),
        [vehicle.id],
      )
      assert.equal(final.driver.availability, 'OFFLINE')
      report.snapshots.push({
        stage: 'submitted',
        cases: [compact(finalIdentity), compact(finalUnit)],
      })
      report.checks.push(
        `Existing photos preserved, ${report.newPhotoUploads} missing-photo uploads and authenticated previews; original drafts submitted once by UI, driver remains OFFLINE`,
      )
    } else if (args.mode === 'documentary-readback') {
      mark('readback-submitted-without-replay')
      const identity = await readCase(expected.cases.identity)
      const unit = await readCase(expected.cases.primary)
      assert.equal(identity.status, 'SUBMITTED')
      assert.equal(unit.status, 'SUBMITTED')
      assert.equal(unit.resourceId, expected.vehicles.primary)
      const state = await onboarding('/driver/onboarding')
      assert.equal(state.driver.id, expected.driverId)
      assert.equal(state.driver.availability, 'OFFLINE')
      assert.equal(state.driver.independentProfile.vehicles.length, 1)
      assert.equal(
        state.driver.independentProfile.vehicles[0].id,
        expected.vehicles.primary,
      )
      assert.equal(
        state.driver.independentProfile.vehicles[0].status,
        'INACTIVE',
      )
      await expect(
        page.getByRole('heading', {
          name: 'Tu solicitud está en revisión',
          exact: true,
        }),
      ).toBeVisible()
      await capture('confirmed-submitted')
      report.snapshots.push({
        stage: 'readback',
        cases: [compact(identity), compact(unit)],
      })
      report.checks.push(
        'Fresh UI login confirms original SUBMITTED cases, same INACTIVE unit and OFFLINE driver without replay',
      )
    } else if (args.mode === 'mixed') {
      mark('mixed-historical-consultation')
      const baseline = await onboarding()
      const vehicles = baseline.driver.independentProfile.vehicles
      assert.equal(baseline.driver.id, expected.driverId)
      assert.deepEqual(
        vehicles.map((v) => v.id).sort(),
        Object.values(expected.vehicles).sort(),
      )
      assert.equal(
        vehicles.find((v) => v.id === expected.vehicles.primary)?.status,
        'ACTIVE',
      )
      for (const id of [expected.cases.identity, expected.cases.primary]) {
        assert(
          baseline.subjects.some((s) =>
            s.cases.some((c) => c.id === id && c.status === 'APPROVED'),
          ),
          'Mixed active/identity approval must match the fixture',
        )
      }
      assert(
        vehicles.some((v) => v.status === 'ACTIVE'),
        'Mixed fixture needs an ACTIVE vehicle',
      )
      const inactive = vehicles
        .filter((v) => v.status === 'INACTIVE')
        .map((v) => v.id)
      const history = baseline.subjects
        .filter((s) => inactive.includes(s.vehicleId))
        .flatMap((s) => s.cases)
      assert(history.length, 'Mixed fixture needs inactive history')
      assert.deepEqual(
        history.map((c) => c.id).sort(),
        [
          expected.cases.rejected,
          expected.cases.withdrawn,
          expected.cases.approvedInactive,
        ].sort(),
      )
      const snapshots = []
      for (const entry of history) {
        const record = await readCase(entry.id)
        assert.equal(record.status, entry.status)
        assert(inactive.includes(record.resourceId))
        snapshots.push(compact(record))
        await inspectPhoto(record)
        await capture(
          'history-' + record.status.toLowerCase() + '-' + snapshots.length,
        )
      }
      for (const status of config.expectedHistoricalStatuses ?? [
        'REJECTED',
        'WITHDRAWN',
        'APPROVED',
      ])
        assert(
          history.some((record) => record.status === status),
          'Missing historical status: ' + status,
        )
      const after = await onboarding()
      const documentaryState = (data) => ({
        subjects: data.subjects,
        vehicles: data.driver.independentProfile.vehicles,
        terms: data.terms,
      })
      assert.deepEqual(
        documentaryState(after),
        documentaryState(baseline),
        'Historical consultation changed documentary state',
      )
      report.snapshots.push({ stage: 'mixed-history', cases: snapshots })
      report.checks.push(
        'Mixed ACTIVE and INACTIVE catalog/history preserved; no vehicle, availability or reception writes',
      )
    } else {
      mark('observe-driver-coordinated-state')
      await onboarding()
      await page.goto(web + '/driver/reception')
      if (args['expected-state'] === 'OFFLINE') {
        await expect(
          page.getByRole('radio', { name: 'Fuera de línea', exact: true }),
        ).toBeChecked({ timeout: 60000 })
      } else {
        await expect
          .poll(async () => page.locator('main').innerText(), {
            timeout: 60000,
          })
          .toContain(args['expected-state'] + ' · Revisión')
      }
      await capture('observed-' + args['expected-state'].toLowerCase())
      report.checks.push(
        'Read-only reception observation: ' +
          args['expected-state'] +
          '; CONNECT belongs to Driver',
      )
    }
    await Promise.all(pendingReads)
    assert(onboardingResponses.length > 0)
    assert(onboardingResponses.every((data) => data.view === 'DOCUMENTARY'))
    validateWrites(report)
    assert.deepEqual(report.errors, [])
    await logout()
    await Promise.all(pendingReads)
    report.checks.push('UI logout confirmed for this acceptance context')
    report.status = 'PASS'
  }
} catch (error) {
  report.status = 'FAIL'
  report.failure = {
    step,
    message: step.startsWith('login')
      ? 'Login failed; credential details omitted'
      : sanitize(error.message),
  }
  process.exitCode = 1
} finally {
  await browser?.close()
  if (server) await new Promise((done) => server.httpServer.close(done))
  report.finishedAt = new Date().toISOString()
  await writeFile(
    join(output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({ status: report.status, mode: args.mode, step, output }),
  )
}
