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
const database = 'mandaria_v118_web_20261007_test',
  web = 'http://127.0.0.1:4181'
const api = 'http://127.0.0.1:43182',
  upstream = 'http://127.0.0.1:43181'
const out = resolve(root, 'test-results/v118-real')
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
try {
  const identity = await db.$queryRawUnsafe(
    'SELECT current_database() AS db,version() AS version',
  )
  assert.equal(identity[0].db, database)
  const migrations = await db.$queryRawUnsafe(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
  )
  assert.ok(
    migrations.some(
      (x) => x.migration_name === '20261007000200_location_policy_epoch',
    ),
  )
  await fs.writeFile(
    join(out, 'identity.json'),
    JSON.stringify(
      {
        identity,
        migrations,
        backendCommit: 'b97b9d1be54a2c37601e51990d66ccaf73d0203f',
        sourceHash: createHash('sha256')
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
  step = 'seed synthetic account and coverage'
  password = randomBytes(24).toString('base64url')
  const passwordHash = await requireBackend('argon2').hash(password)
  customer = await db.user.create({
    data: {
      email: `v118-${Date.now()}@browser.test`,
      passwordHash,
      role: 'CUSTOMER',
      emailVerifiedAt: new Date(),
      customerAccount: {
        create: { type: 'BUSINESS', displayName: 'Cliente GPS sintético' },
      },
    },
  })
  const provider = await db.deliveryProvider.findFirstOrThrow({
    where: { code: { startsWith: 'E2E_V117_A_' }, status: 'ACTIVE' },
  })
  const membership = await db.providerMembership.findFirstOrThrow({
    where: { providerId: provider.id },
    include: { user: true },
  })
  providerAdmin = membership.user
  driver = await db.driver.findFirstOrThrow({
    where: { providerId: provider.id, name: 'ana' },
    include: { user: true },
  })
  await db.user.updateMany({
    where: { id: { in: [providerAdmin.id, driver.userId] } },
    data: { passwordHash, active: true },
  })
  const vehicle = await db.vehicle.findFirstOrThrow({
    where: { providerId: provider.id, status: 'ACTIVE' },
  })
  const zone = await db.serviceZone.findFirstOrThrow({
    where: { code: { startsWith: 'E2E_V117_ZONE_' } },
    orderBy: { createdAt: 'desc' },
  })
  await db.serviceZone.update({
    where: { id: zone.id },
    data: { status: 'ACTIVE' },
  })
  const account = await db.creditAccount.findUniqueOrThrow({
    where: { providerId: provider.id },
  })
  await db.creditLedgerEntry.create({
    data: {
      creditAccountId: account.id,
      type: 'RECHARGE',
      amount: 100,
      balanceBefore: account.balance,
      balanceAfter: account.balance + 100,
      rechargeMethod: 'OTHER',
      reason: 'Synthetic browser GPS fixture',
      createdByUserId: (
        await db.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' } })
      ).id,
      idempotencyKey: randomUUID(),
      requestHash: randomBytes(32).toString('hex'),
    },
  })
  const { NestFactory } = requireBackend('@nestjs/core')
  const { AppModule } = await import(
    pathToFileURL(join(backend, 'dist/app.module.js'))
  )
  const { setup } = await import(pathToFileURL(join(backend, 'dist/setup.js')))
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  })
  setup(app)
  await app.listen(43181, '127.0.0.1')
  // Fault transport relays REAL status/body, truncating only a selected response after actual application.
  proxy = http.createServer(async (req, res) => {
    const parts = []
    for await (const part of req) parts.push(part)
    const fault =
      armed && req.method === 'POST' && req.url === armed.path ? armed : null
    if (fault) armed = null
    const relay = () => {
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
            traffic.push({
              method: req.method,
              path: req.url,
              status: reply.statusCode,
              fault: !!fault,
            })
            const bytes = Buffer.concat(chunks)
            if (fault && fault.mode !== 'hold') {
              res.writeHead(reply.statusCode, reply.headers)
              res.write(bytes.subarray(0, 1))
              const timer = setTimeout(() => res.destroy(), 23000)
              res.on('close', () => clearTimeout(timer))
            } else {
              res.writeHead(reply.statusCode, reply.headers)
              res.end(bytes)
            }
          })
        },
      )
      u.on('error', () => res.destroy())
      u.end(Buffer.concat(parts))
    }
    if (fault?.mode === 'hold') held.push(relay)
    else relay()
  })
  await new Promise((r) => proxy.listen(43182, '127.0.0.1', r))
  vite = await createServer({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 4181, strictPort: true },
  })
  await vite.listen()
  if (process.env.V118_FINAL === 'true') {
    step = 'resume shared navigation and revocation'
    const prior = JSON.parse(
      await fs.readFile(join(out, 'results.json'), 'utf8'),
    )
    mdr = prior.mdr
    const delivery = await db.deliveryRequest.findUniqueOrThrow({
      where: { publicId: mdr },
      include: { customerAccount: { include: { user: true } } },
    })
    customer = delivery.customerAccount.user
    await db.user.update({ where: { id: customer.id }, data: { passwordHash } })
    browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await ctx.newPage()
    page.on('pageerror', () => errors.push('owner pageerror'))
    await page.goto(web + '/login')
    await page.getByLabel('Correo electrónico').fill(customer.email)
    await page.locator('input[name=password]').fill(password)
    await page
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await page.locator('.user-trigger').waitFor()
    await page.goto(web + '/customer/requests/' + mdr)
    await page
      .getByRole('button', { name: 'Consultar estado e intentos' })
      .waitFor()
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page
      .getByRole('button', { name: 'Emitir o sustituir enlace' })
      .click()
    const link = await page.getByLabel('Enlace temporal generado').inputValue()
    const recipient = await browser.newContext({
        viewport: { width: 390, height: 844 },
      }),
      shared = await recipient.newPage()
    shared.on('pageerror', () => errors.push('shared pageerror'))
    await shared.goto(link)
    await shared
      .getByRole('heading', { name: 'Seguimiento · ' + mdr })
      .waitFor()
    assert.equal(new URL(shared.url()).hash, '')
    await shared.reload()
    await shared.getByText(/Abre el enlace original/).waitFor()
    await shared.goto(link)
    await shared
      .getByRole('heading', { name: 'Seguimiento · ' + mdr })
      .waitFor()
    assert.equal(new URL(shared.url()).hash, '')
    record(
      'Reopen original fragment in same document after reload (regression)',
    )
    await page
      .getByRole('button', { name: 'Cerrar enlace', exact: true })
      .click()
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page.getByRole('button', { name: /Revocar enlace/ }).click()
    await page.getByText(/Revocación confirmada/).waitFor()
    await shared.goto(link)
    await shared.getByText(/El enlace no está disponible/).waitFor()
    assert.equal(new URL(shared.url()).hash, '')
    assert.equal(
      await shared.getByText('17.42, -93.38', { exact: true }).count(),
      0,
    )
    record('Real revoked link: generic error and GPS withdrawn')
    step = 'pending technical closure race'
    armed = {
      path: '/api/v1/customer/delivery-requests/' + mdr + '/tracking-link',
      mode: 'hold',
    }
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page
      .getByRole('button', { name: 'Emitir o sustituir enlace' })
      .click()
    await page.getByText(/Respuesta no confirmada/).waitFor({ timeout: 26000 })
    await page.reload()
    await page
      .getByRole('button', { name: 'Consultar estado e intentos' })
      .click()
    await page.getByText(/No se conoce el resultado/).waitFor()
    assert.ok(
      await page
        .getByRole('button', { name: 'Emitir o sustituir enlace' })
        .isDisabled(),
    )
    record('Real PENDING_OR_UNKNOWN survives reload without retransmission')
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page.getByRole('button', { name: /Revocar enlace/ }).click()
    await page.getByText(/Revocación confirmada/).waitFor()
    await page
      .getByRole('button', { name: 'Consultar estado e intentos' })
      .click()
    await page.getByText(/La revisión avanzó/).waitFor()
    for (const send of held.splice(0)) send()
    for (
      let i = 0;
      i < 40 &&
      !traffic.some(
        (t) => t.status === 409 && t.path.endsWith('/tracking-link'),
      );
      i++
    )
      await new Promise((r) => setTimeout(r, 100))
    assert.ok(
      traffic.some(
        (t) => t.status === 409 && t.path.endsWith('/tracking-link'),
      ),
    )
    record(
      'Real technical revoke fences delayed ISSUE; SUPERSEDED then late POST409',
    )
    const stored = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    )
    assert.ok(!stored.includes(new URL(link).hash.slice(3)))
    assert.ok(!stored.includes(password))
    assert.equal(errors.length, 0)
    await page.screenshot({
      path: join(out, 'owner-reconciled.png'),
      fullPage: true,
    })
    await shared.screenshot({
      path: join(out, 'revoked-mobile.png'),
      fullPage: true,
    })
    record('Real browser storage privacy and no pageerror')
  } else {
    step = 'create real synthetic dispatch'
    const login = async (u) =>
      (await request('/auth/login', null, { email: u.email, password }))
        .accessToken
    const ct = await login(customer),
      pt = await login(providerAdmin),
      dt = await login(driver.user)
    const conditions = {
      conditionsVersion: 1,
      serviceType: 'LOCAL_DELIVERY',
      stops: [
        { type: 'PICKUP', sequence: 1, latitude: 17.42, longitude: -93.38 },
        { type: 'DROPOFF', sequence: 2, latitude: 17.45, longitude: -93.35 },
      ],
      packages: [{ category: 'PARCEL', quantity: 1 }],
    }
    const pre = await request(
      '/customer/delivery-prequotes',
      ct,
      { conditions, shippingPayer: 'RECIPIENT' },
      'POST',
      randomUUID(),
    )
    const conversion = await request(
      `/customer/delivery-prequotes/${pre.prequote.publicId}/convert`,
      ct,
      {
        conditionsVersion: 1,
        deliveryRequest: {
          serviceType: 'LOCAL_DELIVERY',
          stops: conditions.stops.map((s) => ({
            ...s,
            address: 'Calle sintética',
            contactName: 'Contacto sintético',
            contactPhone: '0000000000',
          })),
          packages: [
            {
              category: 'PARCEL',
              quantity: 1,
              description: 'Paquete sintético',
            },
          ],
          financialContext: { goodsPaymentMode: 'PREPAID', currency: 'MXN' },
        },
      },
      'POST',
      randomUUID(),
    )
    const c = conversion.result
    mdr = c.deliveryRequestPublicId
    await request(
      `/customer/delivery-quotes/${c.quote.publicId}/accept`,
      ct,
      {
        customerAuthorization: {
          version: 1,
          status: 'AUTHORIZED_BY_CUSTOMER',
          reference: 'synthetic-browser-consent',
          authorizedAt: new Date().toISOString(),
          quotePublicId: c.quote.publicId,
          amount: c.quote.amount,
          currency: c.quote.currency,
          expiresAt: c.quote.expiresAt,
          shippingTermsVersion: 1,
          shippingTermsHash: c.shippingTerms.termsHash,
        },
      },
      'POST',
      randomUUID(),
    )
    dispatchId = (
      await db.dispatch.findFirstOrThrow({
        where: { deliveryRequest: { publicId: mdr } },
      })
    ).id
    await request(`/provider/dispatches/${dispatchId}/claim`, pt, {})
    await request(`/provider/dispatches/${dispatchId}/assignment`, pt, {
      driverId: driver.id,
      vehicleId: vehicle.id,
    })
    const head = async () =>
      (await request(`/driver/dispatches/${dispatchId}/execution`, dt))
        .execution
    const advance = async (phase) => {
      const e = await head()
      return request(
        `/driver/dispatches/${dispatchId}/execution-events`,
        dt,
        {
          assignmentId: e.activeAssignmentId,
          expectedRevision: e.revision,
          phase,
        },
        'POST',
        randomUUID(),
      )
    }
    await advance('TO_PICKUP')
    const e = await head(),
      gpsPath = `/driver/dispatches/${dispatchId}/assignments/${e.activeAssignmentId}`
    const stream = await request(gpsPath + '/location-stream', dt)
    const opened = await request(
      gpsPath + '/location-stream',
      dt,
      { expectedStreamRevision: stream.streamRevision },
      'POST',
      randomUUID(),
    )
    await request(
      gpsPath + '/location',
      dt,
      {
        streamId: opened.streamId,
        sequence: 1,
        capturedAt: new Date().toISOString(),
        latitude: 17.42,
        longitude: -93.38,
        accuracyMeters: 12,
      },
      'PUT',
    )
    step = 'browser owner'
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    })
    const page = await context.newPage()
    page.on('pageerror', () => errors.push('browser pageerror'))
    await page.goto(web + '/login')
    await page.getByLabel('Correo electrónico').fill(customer.email)
    await page.locator('input[name=password]').fill(password)
    await page
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await page.locator('.user-trigger').waitFor()
    await page.goto(web + `/customer/requests/${mdr}`)
    await page.getByText('17.42, -93.38', { exact: true }).waitFor()
    record('Owner real TO_PICKUP location and accuracy')
    await page.screenshot({
      path: join(out, 'owner-desktop.png'),
      fullPage: true,
    })
    step = 'issue shared link'
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page
      .getByRole('button', { name: 'Emitir o sustituir enlace' })
      .click()
    const link = await page.getByLabel('Enlace temporal generado').inputValue()
    assert.equal(new URL(link).origin, web)
    const sharedContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const shared = await sharedContext.newPage()
    shared.on('pageerror', () => errors.push('shared pageerror'))
    await shared.goto(link)
    await shared
      .getByRole('heading', { name: `Seguimiento · ${mdr}` })
      .waitFor()
    assert.equal(new URL(shared.url()).hash, '')
    assert.equal(
      await shared.getByText('17.42, -93.38', { exact: true }).count(),
      0,
    )
    record(
      'Real shared link anonymous; fragment removed; recipient hidden before pickup',
    )
    await page
      .getByRole('button', { name: 'Cerrar enlace', exact: true })
      .click()
    assert.equal(await page.getByLabel('Enlace temporal generado').count(), 0)
    await advance('AT_PICKUP')
    await advance('PICKED_UP')
    await shared
      .getByText('17.42, -93.38', { exact: true })
      .waitFor({ timeout: 22000 })
    record('Recipient sees real GPS only after PICKED_UP')
    await shared.screenshot({
      path: join(out, 'recipient-mobile.png'),
      fullPage: true,
    })
    assert.ok(
      await shared.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await shared.keyboard.press('Tab')
    assert.equal(
      await shared.evaluate(() => document.activeElement.tagName),
      'A',
    )
    await shared.reload()
    await shared.getByText(/Abre el enlace original/).waitFor()
    record('Reload cannot restore shared token; mobile and keyboard')
    step = 'lost issuance'
    armed = { path: `/api/v1/customer/delivery-requests/${mdr}/tracking-link` }
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page
      .getByRole('button', { name: 'Emitir o sustituir enlace' })
      .click()
    await page.getByText(/Respuesta no confirmada/).waitFor({ timeout: 26000 })
    await page.reload()
    await page
      .getByRole('button', { name: 'Consultar estado e intentos' })
      .click()
    await page.getByText(/La emisión se aplicó/).waitFor()
    assert.equal(await page.getByLabel('Enlace temporal generado').count(), 0)
    record(
      'Real lost issuance and reload => APPLIED_SECRET_UNAVAILABLE without replay',
    )
    step = 'lost revocation'
    armed = {
      path: `/api/v1/customer/delivery-requests/${mdr}/tracking-link/revoke`,
    }
    await page
      .getByLabel('Confirmo cambiar el enlace vigente con esta revisión')
      .check()
    await page.getByRole('button', { name: /Revocar enlace/ }).click()
    await page.getByText(/Respuesta no confirmada/).waitFor({ timeout: 26000 })
    await page.reload()
    await page
      .getByRole('button', { name: 'Consultar estado e intentos' })
      .click()
    await page.getByText(/Ese intento revocó/).waitFor()
    record('Real revoke response loss => APPLIED_REVOKED and current metadata')
    await shared.goto(link)
    await shared.getByText(/El enlace no está disponible/).waitFor()
    assert.equal(
      await shared.getByText('17.42, -93.38', { exact: true }).count(),
      0,
    )
    record('Revoked real link generic unavailable, coordinates removed')
    const stored = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    )
    assert.ok(!stored.includes(new URL(link).hash.slice(3)))
    assert.ok(!stored.includes(password))
    assert.equal(errors.length, 0)
    await page.screenshot({
      path: join(out, 'owner-reconciled.png'),
      fullPage: true,
    })
    record('No link/password in storage; no browser pageerror')
  }
} catch (e) {
  console.log('FAILED step: ' + step)
  errors.push({
    step,
    message: String(e.message)
      .replace(/Tracking [^ ]+/g, 'Tracking [redacted]')
      .replace(/[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, '[redacted-link]')
      .replaceAll(password ?? '__absent__', '[redacted-password]'),
  })
  process.exitCode = 1
} finally {
  await fs.writeFile(
    join(
      out,
      process.env.V118_FINAL === 'true' ? 'final-results.json' : 'results.json',
    ),
    JSON.stringify({ database, mdr, results, errors, traffic }, null, 2),
  )
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
