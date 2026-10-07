/** Browser -> actual Nest -> isolated PostgreSQL. No Playwright route interception. */
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import http from 'node:http'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
const root = process.cwd(),
  backend = 'C:/Users/zorgl/Documents/mandaria-backend'
const earlyExpiry = process.env.V118_EARLY_EXPIRY === 'true'
const database = earlyExpiry
    ? 'mandaria_v118_grace_20261007_test'
    : 'mandaria_v118_boundaries_20261007_test',
  web = 'http://127.0.0.1:4181'
const api = 'http://127.0.0.1:43182',
  upstream = 'http://127.0.0.1:43181'
const out = resolve(
  root,
  earlyExpiry ? 'test-results/v118-grace' : 'test-results/v118-boundaries',
)
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
  VITE_API_URL: api,
  DISPATCH_TTL_MINUTES: '60',
})
process.chdir(work)
requireBackend('reflect-metadata')
const { PrismaClient } = requireBackend('@prisma/client')
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
const held = []
const results = [],
  errors = [],
  traffic = []
let app,
  vite,
  proxy,
  browser,
  armed,
  step = 'identify',
  customer,
  driver,
  providerAdmin,
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
// Only the already-existing injectable LocationClock is controlled; no fake HTTP bodies.
let frozenTime = null,
  restoreClock
const boundaryEvidence = []
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
  const { LocationClock } = await import(
    pathToFileURL(join(backend, 'dist/location/location.service.js'))
  )
  const clock = app.get(LocationClock),
    realNow = clock.now.bind(clock)
  clock.now = async (tx) =>
    frozenTime === null ? realNow(tx) : new Date(frozenTime)
  restoreClock = () => {
    clock.now = realNow
  }
  // Delay a REAL already-authorized GPS response; never construct/replay response JSON.
  proxy = http.createServer(async (req, res) => {
    const parts = []
    for await (const part of req) parts.push(part)
    const fault =
      armed && req.method === armed.method && req.url === armed.path
        ? armed
        : null
    if (fault) armed = null
    const u = http.request(
      upstream + req.url,
      {
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:43181' },
      },
      (reply) => {
        const chunks = []
        reply.on('data', (c) => chunks.push(c))
        reply.on('end', () => {
          const bytes = Buffer.concat(chunks)
          traffic.push({
            method: req.method,
            path: req.url,
            status: reply.statusCode,
            delayed: !!fault,
          })
          const send = () => {
            if (!res.destroyed) {
              res.writeHead(reply.statusCode, reply.headers)
              res.end(bytes)
            }
          }
          if (fault) {
            fault.body = JSON.parse(bytes)
            held.push(send)
            fault.ready = true
          } else send()
        })
      },
    )
    u.on('error', () => res.destroy())
    u.end(Buffer.concat(parts))
  })
  await new Promise((r) => proxy.listen(43182, '127.0.0.1', r))
  vite = await createServer({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 4181, strictPort: true },
  })
  await vite.listen()
  const login = async (u) =>
    (await request('/auth/login', null, { email: u.email, password }))
      .accessToken
  const driverToken = await login(driver.user),
    adminToken = await login(admin)
  const head = async (token) =>
    (await request(`/driver/dispatches/${dispatchId}/execution`, token))
      .execution
  const incident = async (token) => {
    const e = await head(token)
    return request(
      `/driver/dispatches/${dispatchId}/custody-incidents`,
      token,
      {
        assignmentId: e.activeAssignmentId,
        expectedRevision: e.revision,
        reasonCode: 'VEHICLE_FAILURE',
        reasonDetail: 'Incidencia sintética de prueba GPS',
      },
      'POST',
      randomUUID(),
    )
  }
  const resolveIncident = async (i, body) =>
    request(
      `/admin/dispatches/${dispatchId}/custody-incidents/${i.id}/resolve`,
      adminToken,
      {
        assignmentId: i.execution.activeAssignmentId,
        expectedRevision: i.execution.revision,
        reason: 'Resolución sintética de prueba',
        occurredAt: new Date().toISOString(),
        confirmationMethod: 'PHONE',
        ...body,
      },
      'POST',
      randomUUID(),
    )
  async function publish(token, lat = 17.42, lng = -93.38) {
    const e = await head(token),
      path = `/driver/dispatches/${dispatchId}/assignments/${e.activeAssignmentId}`
    const before = await request(path + '/location-stream', token),
      opened = await request(
        path + '/location-stream',
        token,
        { expectedStreamRevision: before.streamRevision },
        'POST',
        randomUUID(),
      )
    const body = {
      streamId: opened.streamId,
      sequence: 1,
      capturedAt: new Date().toISOString(),
      latitude: lat,
      longitude: lng,
      accuracyMeters: 12,
    }
    await request(path + '/location', token, body, 'PUT')
    return { path, body }
  }
  browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await ctx.newPage()
  page.on('pageerror', () => errors.push('owner pageerror'))
  step = 'login existing synthetic owner'
  await page.goto(web + '/login')
  await page.getByLabel('Correo electrónico').fill(customer.email)
  await page.locator('input[name=password]').fill(password)
  const loginResponse = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  const customerToken = (await (await loginResponse).json()).accessToken
  await page.locator('.user-trigger').waitFor()
  const locationPath = `/customer/delivery-requests/${mdr}/location`,
    linkPath = `/customer/delivery-requests/${mdr}/tracking-link`
  const ownerReload = async () => {
    const response = page.waitForResponse((r) => r.url().endsWith(locationPath))
    await page.goto(web + `/customer/requests/${mdr}`)
    const r = await response
    assert.equal(r.status(), 200)
    return r.json()
  }
  await ownerReload()
  if (earlyExpiry) frozenTime = Date.now() - (23 * 60 + 30) * 60000
  await page
    .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
    .check()
  await page.getByRole('button', { name: 'Emitir o sustituir enlace' }).click()
  const link = await page.getByLabel('Enlace temporal generado').inputValue()
  await page.getByRole('button', { name: 'Cerrar enlace', exact: true }).click()
  const metadata = await request(linkPath, customerToken)
  assert.equal(
    Date.parse(metadata.expiresAt) - Date.parse(metadata.createdAt),
    86400000,
  )
  frozenTime = null
  const recipient = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    shared = await recipient.newPage()
  shared.on('pageerror', () => errors.push('recipient pageerror'))
  const recipientRead = async () => {
    await shared.goto('about:blank')
    const response = shared.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.url().endsWith('/shared/delivery-tracking'),
    )
    await shared.goto(link)
    const r = await response
    return {
      status: r.status(),
      body: r.status() === 200 ? await r.json() : null,
    }
  }
  if (!earlyExpiry) {
    step = 'real sample and time boundaries'
    const originalGps = await publish(driverToken)
    let owned = await ownerReload(),
      seen = await recipientRead()
    assert.equal(seen.status, 200)
    await page.getByText('17.42, -93.38', { exact: true }).waitFor()
    await shared.getByText('17.42, -93.38', { exact: true }).waitFor()
    if (process.env.V118_SKIP_TIME !== 'true') {
      const sample = owned.location.sample
      assert.ok(sample)
      // These are backend decisions from the injectable production clock, not browser timer mocks.
      for (const [label, millis, freshness, available] of [
        ['60s inclusive', Date.parse(sample.freshUntil), 'RECENT', true],
        ['60s + 1ms', Date.parse(sample.freshUntil) + 1, 'STALE', true],
        ['600s - 1ms', Date.parse(sample.eraseAfter) - 1, 'STALE', true],
        ['600s exact', Date.parse(sample.eraseAfter), 'UNAVAILABLE', false],
      ]) {
        frozenTime = millis
        owned = await ownerReload()
        seen = await recipientRead()
        assert.equal(owned.observation.freshness, freshness)
        assert.equal(seen.body.observation.freshness, freshness)
        assert.equal(!!owned.location.sample, available)
        assert.equal(!!seen.body.location.sample, available)
        if (available) {
          await page
            .getByText(freshness === 'RECENT' ? 'Reciente' : 'Desactualizada', {
              exact: true,
            })
            .waitFor()
          await shared
            .getByText(freshness === 'RECENT' ? 'Reciente' : 'Desactualizada', {
              exact: true,
            })
            .waitFor()
        } else {
          await page.getByText('La última posición caducó.').waitFor()
          await shared.getByText('La última posición caducó.').waitFor()
        }
        boundaryEvidence.push({
          label,
          evaluatedAt: owned.observation.evaluatedAt,
          freshness,
          samplePresent: available,
        })
      }
      const purged = await db.deliveryLocationHead.findUniqueOrThrow({
        where: { deliveryRequestId: initial.id },
      })
      assert.equal(purged.sample, null)
      assert.equal(purged.sampleHash, null)
      assert.equal(purged.eraseAfter, null)
      record(
        'Backend60s/600s boundaries through both browsers; durable PostgreSQL purge at600s',
      )
      await shared.screenshot({
        path: join(out, 'expired-sample-mobile.png'),
        fullPage: true,
      })
      frozenTime = null
    }
    step = 'absolute24h'
    console.log('STEP ' + step)
    frozenTime = Date.parse(metadata.expiresAt) - 1
    seen = await recipientRead()
    assert.equal(seen.status, 200)
    frozenTime = Date.parse(metadata.expiresAt)
    seen = await recipientRead()
    assert.equal(seen.status, 404)
    await shared.getByText(/El enlace no está disponible/).waitFor()
    const unchanged = await request(linkPath, customerToken)
    assert.equal(unchanged.expiresAt, metadata.expiresAt)
    boundaryEvidence.push({
      label: '24h exact',
      at: metadata.expiresAt,
      status: seen.status,
    })
    record(
      'Absolute24h: before expiry200, exact boundary404, reads never renew expiry',
    )
    frozenTime = null
    await publish(driverToken)
    await ownerReload()
    await recipientRead()
    step = 'incident then transfer'
    const before = await request(locationPath, customerToken),
      opening = await incident(driverToken)
    owned = await ownerReload()
    seen = await recipientRead()
    assert.equal(owned.progress.attentionRequired, true)
    assert.equal(seen.body.progress.attentionRequired, true)
    assert.equal(owned.location.sample, null)
    assert.equal(seen.body.location.sample, null)
    await page.getByText(/Ubicación retirada/).waitFor()
    await shared
      .getByText(/Ubicación no disponible durante la incidencia/)
      .waitFor()
    record('Authorized DRIVER incident removes GPS for customer and recipient')
    await shared.screenshot({
      path: join(out, 'incident-mobile.png'),
      fullPage: true,
    })
    const candidates = await request(
      `/admin/dispatches/${dispatchId}/custody-transfer-candidates?mode=FLEET&page=1&pageSize=100`,
      adminToken,
    )
    const candidate = candidates.items.find((c) => c.driverId !== driver.id)
    assert.ok(candidate, 'No eligible recipient from real API')
    const members = await request(
      `/admin/providers/${candidate.providerId}/members?page=1&pageSize=100`,
      adminToken,
    )
    const rows = Array.isArray(members) ? members : members.items
    const member = rows.find((m) => m.user?.active !== false)
    assert.ok(member, 'No recipient membership')
    const receivingAdmin = member.userId ?? member.user.id
    const ledgerBefore = await db.creditLedgerEntry.count({
      where: { referenceId: dispatchId },
    })
    const transfer = await resolveIncident(opening, {
      type: 'TRANSFER',
      recipient: {
        mode: 'FLEET',
        providerId: candidate.providerId,
        driverId: candidate.driverId,
        vehicleId: candidate.vehicleId,
      },
      releasingCustodianConfirmed: true,
      receivingCustodianConfirmed: true,
      atCurrentStageLocation: true,
      recipientProviderAdminUserId: receivingAdmin,
      recipientProviderAdminConfirmed: true,
    })
    assert.equal(transfer.execution.phase, 'PICKED_UP')
    assert.equal(
      await db.deliveryAssignment.count({
        where: { dispatchId, status: 'ACTIVE' },
      }),
      1,
    )
    assert.equal(
      await db.creditLedgerEntry.count({ where: { referenceId: dispatchId } }),
      ledgerBefore,
    )
    owned = await ownerReload()
    seen = await recipientRead()
    assert.equal(owned.location.sample, null)
    assert.equal(seen.body.location.sample, null)
    assert.ok(
      BigInt(owned.location.assignmentGeneration) >
        BigInt(before.location.assignmentGeneration),
    )
    const denied = await fetch(
      upstream + '/api/v1' + originalGps.path + '/location',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${driverToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...originalGps.body,
          sequence: 2,
          capturedAt: new Date().toISOString(),
        }),
      },
    )
    assert.ok([403, 404, 409].includes(denied.status))
    assert.equal(
      (await request(locationPath, customerToken)).location.sample,
      null,
    )
    const receiver = await db.driver.findUniqueOrThrow({
      where: { id: candidate.driverId },
      include: { user: true },
    })
    await db.user.update({
      where: { id: receiver.userId },
      data: { passwordHash },
    })
    const receiverToken = await login(receiver.user)
    await publish(receiverToken, 17.43, -93.36)
    owned = await ownerReload()
    seen = await recipientRead()
    assert.equal(owned.location.sample.latitude, 17.43)
    assert.equal(seen.body.location.sample.latitude, 17.43)
    await page.getByText('17.43, -93.36', { exact: true }).waitFor()
    await shared.getByText('17.43, -93.36', { exact: true }).waitFor()
    assert.equal(
      await page.getByText('17.42, -93.38', { exact: true }).count(),
      0,
    )
    record(
      'Transfer keeps one custodian/progress/no debit; old DRIVER denied; only recipient sample replaces GPS',
    )
    await page.screenshot({
      path: join(out, 'transfer-desktop.png'),
      fullPage: true,
    })
    step = 'terminal with delayed prior response'
    const delayed = {
      method: 'GET',
      path: '/api/v1' + locationPath,
      ready: false,
    }
    armed = delayed
    await page.reload({ waitUntil: 'domcontentloaded' })
    for (let i = 0; i < 100 && !delayed.ready; i++)
      await new Promise((r) => setTimeout(r, 50))
    assert.ok(delayed.ready)
    assert.ok(delayed.body.location.sample)
    const secondIncident = await incident(receiverToken)
    const returned = await resolveIncident(secondIncident, {
      type: 'RETURN_TO_ORIGIN',
      custodianConfirmed: true,
      originConfirmed: true,
      originContactLabel: 'Contacto sintético',
      originContactRole: 'Responsable sintético',
    })
    assert.equal(returned.type, 'RETURN_TO_ORIGIN')
    await page.getByRole('button', { name: 'Actualizar seguimiento' }).click()
    await page
      .getByText('Servicio finalizado. GPS retirado.', { exact: true })
      .waitFor()
    for (const send of held.splice(0)) send()
    seen = await recipientRead()
    assert.equal(seen.body.location.sample, null)
    assert.equal(seen.body.progress.terminalOutcome.type, 'RETURNED_TO_ORIGIN')
    await shared
      .getByText('Servicio finalizado. GPS retirado.', { exact: true })
      .waitFor()
    assert.ok(
      BigInt(seen.body.progress.publicVersion) >
        BigInt(delayed.body.progress.publicVersion),
    )
    await page.waitForTimeout(1200)
    assert.equal(
      await page.getByText('17.43, -93.36', { exact: true }).count(),
      0,
    )
    record(
      'RETURNED terminal removes GPS; held preterminal HTTP response cannot restore it',
    )
    await shared.screenshot({
      path: join(out, 'terminal-mobile.png'),
      fullPage: true,
    })
  } else {
    step = 'terminal for earlier absolute expiry'
    const opening = await incident(driverToken)
    await resolveIncident(opening, {
      type: 'RETURN_TO_ORIGIN',
      custodianConfirmed: true,
      originConfirmed: true,
      originContactLabel: 'Contacto sintético',
      originContactRole: 'Responsable sintético',
    })
  }
  step = 'terminal grace minimum'
  const terminal = await request(locationPath, customerToken)
  const closedAt = Date.parse(terminal.progress.terminalOutcome.occurredAt),
    until = Math.min(Date.parse(metadata.expiresAt), closedAt + 3600000)
  assert.equal(earlyExpiry, Date.parse(metadata.expiresAt) < closedAt + 3600000)
  frozenTime = until - 1
  let seen = await recipientRead()
  assert.equal(seen.status, 200)
  assert.equal(seen.body.location.sample, null)
  frozenTime = until
  seen = await recipientRead()
  assert.equal(seen.status, 404)
  await shared.getByText(/El enlace no está disponible/).waitFor()
  const latest = await request(linkPath, customerToken)
  assert.equal(Date.parse(latest.terminalAccessUntil), until)
  boundaryEvidence.push({
    label: earlyExpiry
      ? 'expiry earlier than terminal+1h'
      : 'terminal+1h earlier than expiry',
    expiresAt: metadata.expiresAt,
    closedAt: new Date(closedAt).toISOString(),
    until: new Date(until).toISOString(),
    beforeStatus: 200,
    atStatus: 404,
  })
  record(
    earlyExpiry
      ? 'Grace=min(expiresAt,terminal+1h): earlier absolute expiry enforced'
      : 'Grace=min(expiresAt,terminal+1h): terminal+1h enforced',
  )
  frozenTime = null
  assert.equal(errors.length, 0)
} catch (e) {
  console.log('FAILED ' + step)
  errors.push({
    step,
    message: String(e.message)
      .replace(/[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, '[redacted-link]')
      .replaceAll(password ?? '__absent__', '[redacted-password]'),
  })
  process.exitCode = 1
} finally {
  await fs.writeFile(
    join(out, 'results.json'),
    JSON.stringify(
      { database, mdr, results, errors, boundaryEvidence, traffic },
      null,
      2,
    ),
  )
  restoreClock?.()
  await browser?.close()
  await vite?.close()
  if (proxy) {
    proxy.closeAllConnections()
    await new Promise((r) => proxy.close(r))
  }
  await app?.close()
  await db.$disconnect()
  process.chdir(root)
}
