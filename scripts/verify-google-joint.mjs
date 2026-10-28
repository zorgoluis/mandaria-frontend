/** Browser -> actual Nest -> isolated PostgreSQL. No Playwright route interception. */
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
const root = process.cwd(),
  backend = 'C:/Users/zorgl/Documents/mandaria-backend'
const database = 'mandaria_v118_google_race3_20261007_test',
  web = 'http://localhost:5173'
const upstream = 'http://127.0.0.1:43181'
const out = resolve(root, 'test-results/v118-google-race3')
await fs.mkdir(out, { recursive: true })
const work = await fs.mkdtemp(join(tmpdir(), 'mandaria-v118-web-'))
const requireBackend = createRequire(join(backend, 'package.json'))
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: `postgresql://postgres@127.0.0.1:55439/${database}`,
  JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  INTEGRATION_JWT_SECRET: randomBytes(48).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: '3600',
  PREQUOTE_PER_MINUTE: '1000',
  PREQUOTE_PER_DAY: '100000',
  PREQUOTE_GLOBAL_DAILY_ROUTING_UNITS: '100000',
  CUSTOMER_ADMISSION_ENABLED: 'true',
  DETAILED_EXECUTION_ENABLED: 'true',
  PREQUOTE_ENABLED: 'true',
  PREQUOTE_CONVERSION_ENABLED: 'true',
  PREQUOTE_AUTHORIZED_ACCEPT_ENABLED: 'true',
  LOCATION_TRACKING_ENABLED: 'true',
  SHARED_TRACKING_ENABLED: 'true',
  LOCATION_LINK_MUTATIONS_PER_TEN_MINUTES: '100',
  LOCATION_RECIPIENT_PER_MINUTE: '300',
  LOCATION_OWNER_PER_MINUTE: '1000',
  LOCATION_IP_PER_MINUTE: '1000',
  ROUTING_PROVIDER: 'local_fake',
  MAIL_PROVIDER: 'local_outbox',
  LOCAL_MAIL_OUTBOX_DIR: join(work, 'mail'),
  B2B_WEBHOOK_POLL_SECONDS: '0',
  MANDARIA_WEB_URL: web,
  CORS_ORIGINS: web,
  VITE_API_URL: web,
  DISPATCH_TTL_MINUTES: '60',
})
process.chdir(work)
requireBackend('reflect-metadata')
const { PrismaClient } = requireBackend('@prisma/client')
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
const results = [],
  errors = []
let app,
  vite,
  browser,
  step = 'identify',
  customer,
  driver,
  password,
  mdr,
  dispatchId
const record = (name) => {
  results.push({ name, result: 'PASS' })
  console.log('PASS ' + name)
}
async function request(
  path,
  token,
  body,
  method = body === undefined ? 'GET' : 'POST',
  key,
) {
  const r = await fetch(upstream + '/api/v1' + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await r.json()
  if (!r.ok)
    throw Error(
      `HTTP ${r.status} ${path} ${data.code ?? data.error?.code ?? ''}`,
    )
  return data
}
// Real backend clock, no service replacements or API interception.
try {
  const identity = await db.$queryRawUnsafe(
    'SELECT current_database() AS db,version() AS version',
  )
  assert.equal(identity[0].db, database)
  const migrations = await db.$queryRawUnsafe(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
  )
  assert.equal(
    migrations.at(-1).migration_name,
    '20261007000200_location_policy_epoch',
  )
  await fs.writeFile(
    join(out, 'identity.json'),
    JSON.stringify(
      {
        identity,
        migrations: migrations.slice(-2),
        backend: 'b97b9d1be54a2c37601e51990d66ccaf73d0203f',
        locationDistSha256: createHash('sha256')
          .update(
            await fs.readFile(
              join(backend, 'dist/location/location.service.js'),
            ),
          )
          .digest('hex'),
      },
      null,
      2,
    ),
  )
  mdr = 'MDR-000029'
  const initial = await db.deliveryRequest.findUniqueOrThrow({
    where: { publicId: mdr },
    include: {
      customerAccount: { include: { user: true } },
      dispatches: {
        include: {
          deliveryAssignments: {
            where: { status: 'ACTIVE' },
            include: { driver: { include: { user: true } } },
          },
        },
      },
    },
  })
  customer = initial.customerAccount.user
  const dispatch = initial.dispatches.find(
    (d) => d.deliveryAssignments.length === 1,
  )
  assert.ok(dispatch)
  dispatchId = dispatch.id
  driver = dispatch.deliveryAssignments[0].driver
  const admin = await db.user.findFirstOrThrow({
    where: {
      role: 'SUPER_ADMIN',
      active: true,
      email: { endsWith: '@execution.test' },
    },
  })
  password = randomBytes(24).toString('base64url')
  const passwordHash = await requireBackend('argon2').hash(password)
  await db.user.updateMany({
    where: { id: { in: [customer.id, driver.userId, admin.id] } },
    data: { passwordHash },
  })
  const { NestFactory } = requireBackend('@nestjs/core'),
    { AppModule } = await import(
      pathToFileURL(join(backend, 'dist/app.module.js'))
    ),
    { setup } = await import(pathToFileURL(join(backend, 'dist/setup.js')))
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  })
  setup(app)
  await app.listen(43181, '127.0.0.1')
  const csp = (await fs.readFile(join(root, 'nginx.conf'), 'utf8')).match(
    /Content-Security-Policy "([^"]+)"/,
  )[1]
  vite = await createServer({
    root,
    configFile: false,
    oxc: { jsx: { runtime: 'automatic' } },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      headers: { 'Content-Security-Policy': csp, 'Referrer-Policy': 'origin' },
      proxy: { '/api': { target: upstream, changeOrigin: true } },
    },
  })
  await vite.listen()
  const login = async (user) =>
    (await request('/auth/login', null, { email: user.email, password }))
      .accessToken
  const driverToken = await login(driver.user)
  const execution = (
    await request(`/driver/dispatches/${dispatchId}/execution`, driverToken)
  ).execution
  assert.equal(execution.phase, 'PICKED_UP')
  const gpsPath = `/driver/dispatches/${dispatchId}/assignments/${execution.activeAssignmentId}`
  const current = await request(gpsPath + '/location-stream', driverToken)
  const stream = await request(
    gpsPath + '/location-stream',
    driverToken,
    { expectedStreamRevision: current.streamRevision },
    'POST',
    randomUUID(),
  )
  const publish = async (sequence, latitude) =>
    request(
      gpsPath + '/location',
      driverToken,
      {
        streamId: stream.streamId,
        sequence,
        capturedAt: new Date().toISOString(),
        latitude,
        longitude: -93.38,
        accuracyMeters: 40,
      },
      'PUT',
    )
  await publish(1, 17.42)
  const secrets = [password, driverToken, customer.email, mdr, dispatchId]
  const network = { google: 0, leaks: 0, additional: 0, errors: [], csp: [] }
  browser = await chromium.launch({ headless: true })
  async function createPage() {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
    })
    await context.addInitScript(() => {
      window.__maps = 0
      window.__circles = []
      window.__csp = []
      document.addEventListener('securitypolicyviolation', (e) =>
        window.__csp.push(e.violatedDirective),
      )
      let cb
      Object.defineProperty(window, 'mandariaMapsReady', {
        configurable: true,
        get() {
          return cb
        },
        set(fn) {
          window.__hashAtSDK = location.hash
          cb = () => {
            const m = window.google.maps
            m.Map = new Proxy(m.Map, {
              construct(t, a) {
                window.__maps++
                return Reflect.construct(t, a)
              },
            })
            m.Circle = new Proxy(m.Circle, {
              construct(t, a) {
                const c = Reflect.construct(t, a)
                window.__circles.push(c)
                return c
              },
            })
            fn()
          }
        },
      })
    })
    const p = await context.newPage()
    p.on('pageerror', () => network.errors.push('pageerror'))
    p.on('console', (m) => {
      if (m.type() === 'error')
        network.errors.push(
          m.text().match(/[A-Za-z]+MapError/)?.[0] ?? 'redacted_console_error',
        )
    })
    p.on('request', (r) => {
      const u = new URL(r.url())
      if (/google|gstatic|ggpht/.test(u.hostname)) {
        network.google++
        const raw =
          r.url() +
          ' ' +
          JSON.stringify(r.headers()) +
          ' ' +
          (r.postData() ?? '')
        if (
          secrets.some(
            (v) =>
              v && (raw.includes(v) || raw.includes(encodeURIComponent(v))),
          )
        )
          network.leaks++
        if (
          /\/geocode|\/places|\/directions|routes\.googleapis|places\.googleapis/i.test(
            u.href,
          )
        )
          network.additional++
      }
    })
    return p
  }
  const page = await createPage()
  step = 'real customer login'
  await page.goto(web + '/login')
  await page.getByLabel('Correo electrónico').fill(customer.email)
  await page.locator('input[name=password]').fill(password)
  const logged = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  secrets.push((await (await logged).json()).accessToken)
  await page.locator('.user-trigger').waitFor()
  await page.goto(web + '/customer/requests/' + mdr)
  const waitMap = async (p) =>
    p.waitForFunction(
      () =>
        window.__maps === 1 &&
        window.__circles.length === 2 &&
        [...document.images].some(
          (i) => /google|gstatic/.test(i.src) && i.naturalWidth > 0,
        ),
    )
  await waitMap(page)
  record('Customer detail: real login, GPS API and Google tiles/circles')
  await page
    .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
    .check()
  await page.getByRole('button', { name: 'Emitir o sustituir enlace' }).click()
  const link = await page.getByLabel('Enlace temporal generado').inputValue()
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get('t')
  secrets.push(token)
  await page.getByRole('button', { name: 'Cerrar enlace', exact: true }).click()
  const shared = await createPage()
  await shared.goto(link)
  await waitMap(shared)
  assert.equal(await shared.evaluate(() => window.__hashAtSDK), '')
  record('Real tracking link and anonymous /track, fragment removed before SDK')
  step = 'second GPS sample'
  await publish(2, 17.421)
  for (const p of [page, shared])
    await p.waitForFunction(
      () => window.__circles.at(-1)?.getCenter()?.lat() === 17.421,
      {},
      { timeout: 30000 },
    )
  assert.equal(await page.evaluate(() => window.__maps), 1)
  assert.equal(await shared.evaluate(() => window.__maps), 1)
  record('Second DRIVER sample updates both real maps without reconstruction')
  // Screenshots exclude account/contact data; no browser chrome, link or key visible.
  await page
    .getByRole('region', { name: 'Seguimiento GPS', exact: true })
    .screenshot({ path: join(out, 'customer-map.png') })
  await shared.setViewportSize({ width: 390, height: 844 })
  await shared
    .getByRole('region', { name: 'Seguimiento GPS', exact: true })
    .screenshot({ path: join(out, 'recipient-map.png') })
  step = 'in-flight real response and authorized incident'
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditionsByRule', {
    offline: false,
    matchedNetworkConditions: [
      {
        urlPattern:
          web + '/api/v1/customer/delivery-requests/' + mdr + '/location',
        latency: 10000,
        downloadThroughput: 10,
        uploadThroughput: -1,
      },
    ],
  })
  let finished = false
  const observe = (req, res) => {
    if (req.method === 'GET' && req.url.endsWith('/location'))
      res.once('finish', () => {
        finished = true
      })
  }
  app.getHttpServer().on('request', observe)
  let completedAt = 0
  const previous = page
    .waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith('/location'),
      { timeout: 45000 },
    )
    .then(async (response) => {
      await response.finished()
      completedAt = Date.now()
      return response
    })
  for (let i = 0; i < 700 && !finished; i++)
    await new Promise((r) => setTimeout(r, 50))
  assert.ok(finished, 'No real GPS read observed')
  const e = (
    await request(`/driver/dispatches/${dispatchId}/execution`, driverToken)
  ).execution
  await request(
    `/driver/dispatches/${dispatchId}/custody-incidents`,
    driverToken,
    {
      assignmentId: e.activeAssignmentId,
      expectedRevision: e.revision,
      reasonCode: 'VEHICLE_FAILURE',
      reasonDetail: 'Incidencia sintética para validación integrada',
    },
    'POST',
    randomUUID(),
  )
  await page.getByRole('button', { name: 'Actualizar seguimiento' }).click()
  await page
    .getByText('Requiere atención operativa. Ubicación retirada.')
    .waitFor()
  const hiddenAt = Date.now()
  await cdp.send('Network.emulateNetworkConditionsByRule', {
    offline: false,
    matchedNetworkConditions: [],
  })
  let oldBody = null,
    oldAborted = false
  try {
    oldBody = await (await previous).json()
  } catch {
    oldAborted = true
  }
  await shared
    .getByText(/Ubicación no disponible durante la incidencia/)
    .waitFor({ timeout: 30000 })
  await cdp.send('Network.emulateNetworkConditionsByRule', {
    offline: false,
    matchedNetworkConditions: [],
  })
  await page.waitForTimeout(1500)
  for (const p of [page, shared]) {
    assert.equal(await p.locator('.location-map').count(), 0)
    assert.ok(
      await p.evaluate(() =>
        window.__circles.every((c) => c.getMap() === null),
      ),
    )
    network.csp.push(...(await p.evaluate(() => window.__csp)))
  }
  assert.equal(network.leaks, 0)
  assert.equal(network.additional, 0)
  assert.equal(network.errors.length, 0)
  assert.equal(network.csp.length, 0)
  record('Authorized DRIVER incident removes coordinates and both maps')
  console.log('Response delta milliseconds: ' + (completedAt - hiddenAt))
  if (oldBody?.location.sample) {
    assert.ok(
      completedAt > hiddenAt,
      'Response must finish after visible withdrawal',
    )
    record(
      'Real pre-incident GPS response completes after withdrawal and cannot restore marker',
    )
  } else if (oldAborted)
    record('In-flight GPS response aborted after withdrawal; no restoration')
  else
    errors.push(
      'Old response was not demonstrably pre-incident; race not accredited',
    )
  app.getHttpServer().off('request', observe)
  await fs.writeFile(
    join(out, 'network.json'),
    JSON.stringify(
      {
        ...network,
        oldResponseSample: !!oldBody?.location.sample,
        oldAborted,
        responseCompletedAfterWithdrawalMs: completedAt - hiddenAt,
      },
      null,
      2,
    ),
  )
} catch (e) {
  errors.push({ step, code: e.code ?? e.name ?? 'Error' })
  console.log('FAILED ' + step + ' (details redacted)')
  process.exitCode = 1
} finally {
  await fs.writeFile(
    join(out, 'results.json'),
    JSON.stringify({ database, results, errors }, null, 2),
  )
  await browser?.close()
  await vite?.close()
  await app?.close()
  await db.$disconnect()
  process.chdir(root)
}
