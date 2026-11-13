// Authorized disposable real HTTP/UI acceptance; backend sources are read-only.
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import {
  readFile,
  writeFile,
  mkdir,
  symlink,
  readdir,
  cp,
} from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { join, relative } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import {
  root,
  work,
  database,
  apiPort,
  webPort,
  requireBackend,
  prepareDatabase,
  stopDatabase,
} from './onboarding-isolated-environment.mjs'
const api = `http://127.0.0.1:${apiPort}`,
  web = `http://127.0.0.1:${webPort}`
const runtime = join(work, 'backend-runtime')
const report = {
  kind: 'REAL_NEST_POSTGRES_HTTP_AND_CHROME',
  startedAt: new Date().toISOString(),
  api,
  web,
  checks: [],
  http: [],
  fixtures: [],
  cleanup: {},
}
const secret = () => randomBytes(32).toString('hex'),
  password = secret(),
  phone = '0000000000'
let app,
  vite,
  browser,
  db,
  page,
  step = 'prepare'
const mark = (value) => {
  step = value
  console.log(value)
}
const load = (file) => import(pathToFileURL(join(runtime, 'dist', file)).href)
async function treeHash(dir) {
  const hash = createHash('sha256')
  async function walk(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const p = join(path, entry.name)
      if (entry.isDirectory()) await walk(p)
      else {
        hash.update(relative(dir, p).replaceAll('\\', '/'))
        hash.update(await readFile(p))
      }
    }
  }
  await walk(dir)
  return hash.digest('hex')
}
async function request(path, token, status = 200, method = 'GET', body) {
  const r = await fetch(api + '/api/v1' + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  report.http.push({
    method,
    path,
    status: r.status,
    requestId: r.headers.get('x-request-id'),
  })
  assert.equal(r.status, status, 'Unexpected HTTP status at ' + path)
  return { body: await r.json(), headers: r.headers }
}
async function account(role, index) {
  return db.user.create({
    data: {
      email: `contact-${index}@example.invalid`,
      role,
      active: true,
      emailVerifiedAt: new Date(),
      passwordHash: await requireBackend('argon2').hash(password),
    },
  })
}
async function fixture(kind, index) {
  const user = await account('DRIVER', index)
  const driver = await db.driver.create({
    data: {
      userId: user.id,
      name: 'Contacto sintético ' + index,
      status: 'ACTIVE',
      independentProfile: { create: { status: 'PENDING' } },
    },
    include: { independentProfile: true },
  })
  const subject = await db.verificationSubject.create({
    data: {
      driverId: driver.id,
      independentProfileId: driver.independentProfile.id,
    },
  })
  const f = {
    kind,
    userId: user.id,
    driverId: driver.id,
    profileId: driver.independentProfile.id,
    subjectId: subject.id,
    email: user.email,
  }
  if (kind !== 'NOT_RECORDED') {
    const c = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('mandaria.verification_environment','LOCAL_TEST',true)`
      return tx.verificationCase.create({
        data: {
          subjectId: subject.id,
          presenterId: user.id,
          environment: 'LOCAL_TEST',
          policyVersion: 'LOCAL-TEST-1',
          data: { contactPhone: phone },
        },
      })
    })
    f.caseId = c.id
    if (kind === 'UNAVAILABLE')
      await db.verificationCase.update({
        where: { id: c.id },
        data: { status: 'WITHDRAWN', revision: 2 },
      })
  }
  assert.equal(new Set([f.userId, f.driverId, f.profileId]).size, 3)
  report.fixtures.push({
    kind,
    userId: f.userId,
    driverId: f.driverId,
    profileId: f.profileId,
    caseId: f.caseId ?? null,
  })
  return f
}
async function login(email) {
  return (
    await request('/auth/login', undefined, 200, 'POST', { email, password })
  ).body.accessToken
}
async function uiLogin(email) {
  await page.goto(web + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible()
}
async function show(f, label) {
  await page.goto(web + '/independent-drivers/' + f.driverId)
  await expect(page.locator('[data-private-contact]')).toHaveText(label)
  await expect(
    page.getByRole('region', { name: 'Información del usuario' }),
  ).toContainText(f.email)
}
try {
  mark('Compile read-only backend sources into frontend temporary runtime')
  await mkdir(runtime, { recursive: true })
  await writeFile(
    join(runtime, 'package.json'),
    await readFile(root + '/package.json'),
  )
  await cp(root + '/src', join(runtime, 'src'), { recursive: true })
  for (const file of ['tsconfig.json', 'tsconfig.build.json'])
    await cp(root + '/' + file, join(runtime, file))
  await mkdir(join(runtime, 'prisma'), { recursive: true })
  await cp(
    root + '/prisma/schema.prisma',
    join(runtime, 'prisma/schema.prisma'),
  )
  await mkdir(join(runtime, 'node_modules'), { recursive: true })
  for (const entry of await readdir(root + '/node_modules', {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.')) continue
    const source = root + '/node_modules/' + entry.name,
      target = join(runtime, 'node_modules', entry.name)
    if (entry.name === '@prisma') await cp(source, target, { recursive: true })
    else if (entry.isDirectory()) await symlink(source, target, 'junction')
  }
  const generated = spawnSync(
    process.execPath,
    [
      requireBackend.resolve('prisma/build/index.js'),
      'generate',
      '--schema',
      join(runtime, 'prisma/schema.prisma'),
    ],
    {
      cwd: runtime,
      env: { ...process.env, DATABASE_URL: database },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 60000,
    },
  )
  await writeFile(
    join(work, 'generate.txt'),
    generated.stdout + generated.stderr,
  )
  assert.equal(generated.status, 0, 'Isolated Prisma generation failed')
  report.sourceSha256 = await treeHash(root + '/src')
  const compilation = spawnSync(
    process.execPath,
    [
      requireBackend.resolve('typescript/bin/tsc'),
      '-p',
      runtime + '/tsconfig.build.json',
      '--outDir',
      join(runtime, 'dist'),
      '--incremental',
      'false',
      '--declaration',
      'false',
      '--sourceMap',
      'false',
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 120000 },
  )
  await writeFile(
    join(work, 'compile.txt'),
    compilation.stdout + compilation.stderr,
  )
  assert.equal(
    compilation.status,
    0,
    'Temporary backend compilation failed; inspect compile.txt',
  )
  report.buildSha256 = await treeHash(join(runtime, 'dist'))
  report.backendVersion = JSON.parse(
    await readFile(root + '/package.json', 'utf8'),
  ).version
  mark('Disposable PostgreSQL identity and migrations')
  report.environment = await prepareDatabase()
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = database
  const config = {
    NODE_ENV: 'test',
    DATABASE_URL: database,
    CORS_ORIGINS: web,
    JWT_ACCESS_SECRET: secret(),
    JWT_REFRESH_SECRET: secret(),
    INTEGRATION_JWT_SECRET: secret(),
    DELIVERY_CONFIRMATION_ENABLED: 'false',
    DRIVER_VERIFICATION_LOCAL_ENABLED: 'true',
    DOCUMENT_DELETION_STORAGE_MODE: 'DISABLED',
    ROUTING_PROVIDER: 'local_fake',
    MAIL_PROVIDER: 'local_outbox',
    LOCAL_MAIL_OUTBOX_DIR: join(work, 'outbox'),
    B2B_WEBHOOK_POLL_SECONDS: '0',
    DISPATCH_SEARCH_POLL_SECONDS: '0',
    INDEPENDENT_OFFERS_FCM_ENABLED: 'false',
    FLEET_OFFERS_FCM_ENABLED: 'false',
  }
  requireBackend('reflect-metadata')
  const { ConfigModule } = requireBackend('@nestjs/config'),
    original = ConfigModule.forRoot
  ConfigModule.forRoot = function (options) {
    return original.call(this, {
      ...options,
      ignoreEnvFile: true,
      ignoreEnvVars: true,
      skipProcessEnv: true,
      validate: () => options.validate(config),
    })
  }
  const { AppModule } = await load('app.module.js'),
    { setup } = await load('setup.js')
  const module = await requireBackend('@nestjs/testing')
    .Test.createTestingModule({ imports: [AppModule] })
    .compile()
  app = module.createNestApplication({ logger: false, bodyParser: false })
  setup(app)
  await app.listen(apiPort, '127.0.0.1')
  const { PrismaService } = await load('prisma/prisma.service.js')
  db = app.get(PrismaService)
  mark('Synthetic fixtures; preparation is not UI onboarding')
  const admin = await account('SUPER_ADMIN', 'admin'),
    customer = await account('CUSTOMER', 'customer'),
    provider = await account('PROVIDER_ADMIN', 'provider')
  const fixtures = []
  for (const [i, kind] of [
    'AVAILABLE',
    'NOT_RECORDED',
    'UNAVAILABLE',
  ].entries())
    fixtures.push(await fixture(kind, i))
  const [available, absent, unavailable] = fixtures
  const adminToken = await login(admin.email)
  const path = (f) => '/admin/drivers/' + f.driverId + '/independent'
  for (const f of fixtures) {
    const { body, headers } = await request(path(f), adminToken)
    assert.equal(body.declaredContact.availability, f.kind)
    assert.equal(body.declaredContact.source, 'DRIVER_IDENTITY_DECLARATION')
    assert.ok(
      f.kind === 'AVAILABLE'
        ? body.declaredContact.phone === phone
        : body.declaredContact.phone === null,
      'Contact projection mismatch (redacted)',
    )
    assert.equal(headers.get('cache-control'), 'private, no-store')
    assert.equal(body.driverId, f.driverId)
    assert.equal(body.id, f.profileId)
    assert.equal(body.driver.user.id, f.userId)
  }
  report.checks.push(
    'Real login + three contact states, distinct IDs and private/no-store',
  )
  for (const email of [available.email, customer.email, provider.email])
    await request(path(available), await login(email), 403)
  await request(path(available), undefined, 401)
  for (const id of [available.userId, available.profileId])
    await request('/admin/drivers/' + id + '/independent', adminToken, 404)
  const list = (await request('/admin/independent-drivers', adminToken)).body
  assert.ok(
    !JSON.stringify(list).includes('declaredContact') &&
      !JSON.stringify(list).includes(phone),
    'Shared projection leaked contact',
  )
  report.checks.push(
    'DRIVER/CUSTOMER/PROVIDER_ADMIN 403, anonymous 401, wrong identity 404; list excludes contact',
  )
  mark('Chrome real HTTP, no routing or response mocks')
  vite = await createServer({
    envDir: false,
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(api) },
    server: {
      host: '127.0.0.1',
      port: webPort,
      strictPort: true,
      fs: { deny: ['**/test-results/**', '**/.env*', '**/.git/**'] },
    },
  })
  await vite.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('response', (r) => {
    const u = new URL(r.url())
    if (u.origin === api)
      report.http.push({
        method: r.request().method(),
        path: u.pathname,
        status: r.status(),
      })
  })
  await uiLogin(admin.email)
  for (const f of fixtures)
    await show(
      f,
      f.kind === 'AVAILABLE'
        ? phone
        : f.kind === 'NOT_RECORDED'
          ? 'No registrado'
          : 'No disponible',
    )
  await show(available, phone)
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    if (width === 390)
      await expect
        .poll(async () => {
          const box = await page.locator('.sidebar').boundingBox()
          return !box || box.x + box.width <= 1
        })
        .toBe(true)
    await page.screenshot({
      path: join(work, `contact-${width}-masked.png`),
      fullPage: true,
      mask: [page.locator('[data-private-contact]')],
    })
  }
  assert.ok(
    !(
      await page.evaluate(
        () => JSON.stringify(localStorage) + JSON.stringify(sessionStorage),
      )
    ).includes(phone),
    'Browser storage leak',
  )
  await page.goto(web + '/profile')
  await expect(page.locator('[data-private-contact]')).toHaveCount(0)
  await show(available, phone)
  report.checks.push(
    'Real SUPER_ADMIN UI AVAILABLE/NOT_RECORDED/UNAVAILABLE, exit/reentry and masked 1280/390 captures',
  )
  mark('Disposable-only fixture transitions; never application writes')
  await db.verificationCase.update({
    where: { id: available.caseId },
    data: { data: {}, revision: 2 },
  })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('[data-private-contact]')).toHaveText(
    'No registrado',
  )
  await db.verificationCase.update({
    where: { id: available.caseId },
    data: { status: 'WITHDRAWN', revision: 3 },
  })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('[data-private-contact]')).toHaveText(
    'No disponible',
  )
  await show(unavailable, 'No disponible')
  await db.$executeRawUnsafe('CREATE SCHEMA mandaria_recovery')
  await db.$executeRawUnsafe(
    'CREATE TABLE mandaria_recovery.fence (id integer PRIMARY KEY, state jsonb)',
  )
  try {
    await request(path(unavailable), adminToken, 503)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect
      .poll(async () => {
        const contact = page.locator('[data-private-contact]')
        return (
          (await contact.count()) === 0 ||
          (await contact.innerText()) === 'No se pudo consultar el teléfono'
        )
      })
      .toBe(true)
  } finally {
    await db.$executeRawUnsafe('DROP TABLE mandaria_recovery.fence')
    await db.$executeRawUnsafe('DROP SCHEMA mandaria_recovery')
  }
  report.checks.push(
    'HTTP/UI transitions to NOT_RECORDED/UNAVAILABLE; recovery fence 503 clears phone (synthetic fixture changes)',
  )
  mark('Real UI logout')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(web + '/profile')
  const menu = page.getByRole('button', { name: new RegExp(admin.email) })
  await expect(menu).toBeVisible()
  await menu.click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.locator('[data-private-contact]')).toHaveCount(0)
  report.checks.push('Real UI logout clears contact')
  assert.equal(
    await treeHash(root + '/src'),
    report.sourceSha256,
    'Backend sources changed during run',
  )
  report.status = 'PASS'
} catch (e) {
  report.status = 'FAIL'
  report.failedStep = step
  report.error =
    e instanceof assert.AssertionError
      ? 'Assertion failed (values redacted)'
      : String(e.message)
          .replaceAll(phone, '[redacted]')
          .replaceAll(password, '[redacted]')
          .slice(0, 450)
  console.error(report.failedStep, report.error)
  process.exitCode = 1
} finally {
  await browser?.close()
  report.cleanup.browserClosed = true
  await vite?.close()
  report.cleanup.webStopped = true
  await app?.close()
  report.cleanup.nestStopped = true
  report.cleanup.postgresStopped = await stopDatabase()
  report.finishedAt = new Date().toISOString()
  await mkdir(work, { recursive: true })
  await writeFile(
    join(work, 'contact-http.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(join(work, 'contact-http.json'))
}
