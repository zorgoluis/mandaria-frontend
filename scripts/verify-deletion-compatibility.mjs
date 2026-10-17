// Isolated browser + real Nest controllers/services/guards + existing synthetic PostgreSQL.
// No .env, AppModule, backend source writes, migration, external storage or backend suite.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
const backend = 'C:/Users/zorgl/Documents/mandaria-backend'
const cluster = backend + '/.tmp/compatibility-implementation/pgdata'
const pgctl = 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe'
const output = resolve('test-results/deletion-compatibility')
const database = 'deletion_compatibility_20261017_test'
const requireBackend = createRequire(backend + '/package.json')
const load = (path) => import(pathToFileURL(backend + '/' + path).href)
requireBackend('reflect-metadata')
const { PrismaClient } = requireBackend('@prisma/client')
const { Test } = requireBackend('@nestjs/testing')
const { ConfigService } = requireBackend('@nestjs/config')
const { JwtService } = requireBackend('@nestjs/jwt')
const { ValidationPipe, Logger } = requireBackend('@nestjs/common')
const argon2 = requireBackend('argon2')
Logger.overrideLogger(false)
let started = false,
  db,
  app,
  vite,
  browser,
  stage = 'preflight'
const report = {
  date: '2026-10-17',
  database,
  cluster,
  realBackend: true,
  externalStorage: false,
  newMigrations: 0,
  checks: [],
  sources: [],
  postCommit: {},
  session: {},
  cleanup: {},
}
await mkdir(output, { recursive: true })
try {
  for (const path of [
    'src/auth/auth.controller.ts',
    'src/auth/auth.guards.ts',
    'src/auth/auth.responses.ts',
    'src/verification/deletion.controller.ts',
    'src/verification/deletion.service.ts',
    'src/verification/deletion-command-receipt.ts',
    'dist/auth/auth.controller.js',
    'dist/auth/auth.guards.js',
    'dist/verification/deletion.controller.js',
    'dist/verification/deletion.service.js',
    'dist/verification/deletion-command-receipt.js',
    'docs/openapi.json',
    'docs/DOCUMENT-DELETION-COMPATIBILITY-IMPLEMENTATION.md',
  ]) {
    const bytes = await readFile(backend + '/' + path)
    report.sources.push({
      path,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }
  const openapi = JSON.parse(
    await readFile(backend + '/docs/openapi.json', 'utf8'),
  )
  assert.ok(
    openapi.paths['/api/v1/auth/me'].get.parameters.some(
      (p) => p.name === 'projection',
    ),
  )
  assert.ok(
    openapi.paths[
      '/api/v1/admin/privacy/deletion-requests/{id}/commands/by-key/{key}'
    ],
  )
  assert.match(
    await readFile(backend + '/dist/auth/auth.controller.js', 'utf8'),
    /query.projection === 'session'/,
  )
  assert.match(
    await readFile(
      backend + '/dist/verification/deletion.controller.js',
      'utf8',
    ),
    /commands\/by-key/,
  )
  for (const [name, cwd] of [
    ['web', process.cwd()],
    ['backend', backend],
  ]) {
    report[name] = {
      head: spawnSync('git', ['rev-parse', 'HEAD'], {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
      }).stdout.trim(),
      branch: spawnSync('git', ['branch', '--show-current'], {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
      }).stdout.trim(),
      workingTree: true,
    }
  }
  const status = spawnSync(pgctl, ['status', '-D', cluster], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (status.status === 3) {
    const start = spawnSync(
      pgctl,
      [
        'start',
        '-D',
        cluster,
        '-l',
        output + '/postgres.log',
        '-o',
        '-h 127.0.0.1 -p 55441',
        '-w',
      ],
      { stdio: 'ignore', windowsHide: true, timeout: 60000 },
    )
    assert.equal(start.status, 0, 'isolated cluster start')
    started = true
  } else assert.equal(status.status, 0, 'cluster status')
  stage = 'database identity'
  console.log('Checking isolated database identity')
  db = new PrismaClient({
    datasourceUrl: `postgresql://postgres@127.0.0.1:55441/${database}`,
  })
  const [identity] = await db.$queryRawUnsafe(
    "SELECT current_database() AS name, current_setting('data_directory') AS directory, host(inet_server_addr()) AS host, inet_server_port() AS port",
  )
  report.databaseIdentity = { ...identity, port: Number(identity.port) }
  assert.equal(identity.name, database)
  assert.equal(identity.port, 55441)
  assert.equal(identity.host, '127.0.0.1')
  assert.equal(
    resolve(identity.directory).toLowerCase(),
    resolve(cluster).toLowerCase(),
  )
  report.databaseIdentityVerified = true
  // Preserve prior backend test fixtures; use an empty schema copy for this journey.
  report.sourceRequestCount = await db.documentDeletion.count()
  const isolatedDatabase = 'deletion_compatibility_web_' + Date.now() + '_test'
  const schemaPath = output + '/isolated-schema.sql'
  const dump = spawnSync(
    'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe',
    [
      '-h',
      '127.0.0.1',
      '-p',
      '55441',
      '-U',
      'postgres',
      '-d',
      database,
      '--schema-only',
      '--no-owner',
      '--no-privileges',
      '-f',
      schemaPath,
    ],
    { stdio: 'ignore', windowsHide: true, timeout: 60000 },
  )
  assert.equal(dump.status, 0, 'isolated schema copy')
  await db.$executeRawUnsafe('CREATE DATABASE "' + isolatedDatabase + '"')
  const install = spawnSync(
    'C:/Program Files/PostgreSQL/18/bin/psql.exe',
    [
      '-h',
      '127.0.0.1',
      '-p',
      '55441',
      '-U',
      'postgres',
      '-d',
      isolatedDatabase,
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      schemaPath,
    ],
    { stdio: 'ignore', windowsHide: true, timeout: 60000 },
  )
  assert.equal(install.status, 0, 'existing schema install')
  await db.$disconnect()
  db = new PrismaClient({
    datasourceUrl: `postgresql://postgres@127.0.0.1:55441/${isolatedDatabase}`,
  })
  const [isolated] = await db.$queryRawUnsafe(
    "SELECT current_database() AS name, current_setting('data_directory') AS directory",
  )
  assert.equal(isolated.name, isolatedDatabase)
  assert.equal(
    resolve(isolated.directory).toLowerCase(),
    resolve(cluster).toLowerCase(),
  )
  assert.equal(await db.documentDeletion.count(), 0)
  report.database = isolatedDatabase
  report.schemaSource = database
  console.log('Isolated database verified; preparing synthetic fixtures')
  const [
    { AuthController },
    { AuthService },
    { UsersService },
    { AccessGuard, RolesGuard },
    controllers,
    { DocumentDeletionService },
    { HttpErrorFilter },
    { DeletionStorageDouble },
    { DriverSelfController },
    { DriversService },
    { DriverDispatchesController },
    { IndependentDispatchesService },
  ] = await Promise.all([
    load('dist/auth/auth.controller.js'),
    load('dist/auth/auth.service.js'),
    load('dist/users/users.service.js'),
    load('dist/auth/auth.guards.js'),
    load('dist/verification/deletion.controller.js'),
    load('dist/verification/deletion.service.js'),
    load('dist/common/http-exception.filter.js'),
    load('test/helpers/deletion-storage-double.ts'),
    load('dist/drivers/driver-self.controller.js'),
    load('dist/drivers/drivers.service.js'),
    load('dist/independent-drivers/driver-dispatches.controller.js'),
    load('dist/independent-drivers/independent-dispatches.service.js'),
  ])
  const cfg = new ConfigService({
    NODE_ENV: 'test',
    DOCUMENT_DELETION_LOCAL_ENABLED: true,
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
    JWT_ACCESS_EXPIRES_IN: 900,
    JWT_REFRESH_EXPIRES_IN: 3600,
  })
  const jwt = new JwtService(),
    users = new UsersService(db),
    auth = new AuthService(db, users, jwt, cfg)
  const storage = new DeletionStorageDouble()
  const service = new DocumentDeletionService(
    db,
    cfg,
    storage,
    () => new Date(),
    {
      name: 'captured-local',
      async sendUserInvitation() {},
      async sendPartnerApplicationNotice() {},
      async sendDocumentDeletion() {},
    },
  )
  const password = randomBytes(24).toString('hex'),
    hash = await argon2.hash(password)
  const makeUser = (role) =>
    db.user.create({
      data: {
        email: randomUUID() + '@example.test',
        role,
        passwordHash: hash,
        emailVerifiedAt: new Date(),
      },
    })
  const admin = await makeUser('SUPER_ADMIN'),
    otherAdmin = await makeUser('SUPER_ADMIN'),
    restricted = await makeUser('DRIVER'),
    subject = await makeUser('DRIVER')
  const restrictedRequest = await service.create(restricted.id, randomUUID(), {
    scope: 'ACCOUNT',
    password,
    acknowledgment: true,
  })
  const request = await service.create(admin.id, randomUUID(), {
    scope: 'ACCOUNT',
    subjectUserId: subject.id,
    acknowledgment: true,
  })
  report.fixtures = {
    restrictedRequest: restrictedRequest.id,
    administrativeRequest: request.id,
  }
  let drop = false,
    droppedKey,
    postCount = 0
  const mod = await Test.createTestingModule({
    controllers: [
      AuthController,
      controllers.DocumentDeletionController,
      controllers.DocumentDeletionAdminController,
      controllers.DocumentDeletionAccessController,
      DriverSelfController,
      DriverDispatchesController,
    ],
    providers: [
      AccessGuard,
      RolesGuard,
      { provide: AuthService, useValue: auth },
      { provide: UsersService, useValue: users },
      { provide: JwtService, useValue: jwt },
      { provide: ConfigService, useValue: cfg },
      { provide: DocumentDeletionService, useValue: service },
      { provide: DriversService, useValue: new DriversService(db) },
      {
        provide: IndependentDispatchesService,
        useValue: new IndependentDispatchesService(db, { nudge() {} }),
      },
    ],
  }).compile()
  app = mod.createNestApplication({ logger: false })
  app.use((req, res, next) => {
    if (
      req.method === 'POST' &&
      req.path ===
        `/api/v1/admin/privacy/deletion-requests/${request.id}/resolve`
    ) {
      postCount++
      if (drop) {
        drop = false
        droppedKey = req.header('idempotency-key')
        res.json = () => {
          void (async () => {
            // Independent DB reads happen AFTER the controller/service transaction returned.
            const commandCount = await db.documentDeletionCommand.count({
              where: {
                actorId: admin.id,
                key: droppedKey,
                requestId: request.id,
              },
            })
            const eventCount = await db.documentDeletionEvent.count({
              where: {
                requestId: request.id,
                kind: 'REQUEST_IDENTITY_INFORMATION',
              },
            })
            const current = await db.documentDeletion.findUniqueOrThrow({
              where: { id: request.id },
            })
            report.postCommit = {
              verifiedBeforeDrop: commandCount === 1 && eventCount === 1,
              commandCount,
              eventCount,
              revisionDelta: current.revision - request.revision,
            }
            res.socket?.destroy()
          })().catch(() => res.socket?.destroy())
          return res
        }
      }
    }
    next()
  })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new HttpErrorFilter())
  await app.listen(4195, '127.0.0.1')
  vite = await createServer({
    logLevel: 'silent',
    configFile: false,
    envDir: false,
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4196'),
    },
    server: {
      host: '127.0.0.1',
      port: 4196,
      strictPort: true,
      proxy: { '/api/v1': { target: 'http://127.0.0.1:4195' } },
    },
  })
  await vite.listen()
  browser = await chromium.launch()
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage()
  const counts = { login: 0, refresh: 0, session: 0, legacy: 0, receipt: 0 },
    modes = [],
    errors = []
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue()
      : route.abort(),
  )
  page.on('pageerror', () => errors.push('render-error'))
  page.on('response', async (res) => {
    const url = new URL(res.url())
    if (url.pathname === '/api/v1/admin/privacy/deletion-requests') {
      const rows = await res.json().catch(() => null)
      report.adminList = {
        status: res.status(),
        rows: Array.isArray(rows) ? rows.length : null,
        containsFixture:
          Array.isArray(rows) && rows.some((r) => r.id === request.id),
        minimumRevision: Array.isArray(rows)
          ? Math.min(...rows.map((r) => r.revision))
          : null,
      }
    }
    if (url.pathname.endsWith('/auth/login')) counts.login++
    if (url.pathname.endsWith('/auth/refresh')) counts.refresh++
    if (url.pathname.endsWith('/auth/me')) {
      if (url.search === '?projection=session') {
        counts.session++
        if (res.status() === 200) {
          const r = await res.json().catch(() => null)
          if (r)
            modes.push({
              accessMode: r.accessMode,
              identityFields: Object.keys(r.identity).sort(),
            })
        }
      } else counts.legacy++
    }
    if (url.pathname.includes('/commands/by-key/')) counts.receipt++
  })
  const go = (path) => page.goto('http://127.0.0.1:4196' + path)
  const login = async (u) => {
    await go('/login')
    await page.getByLabel('Correo electrónico').fill(u.email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await expect(page.getByLabel('Correo electrónico')).toHaveCount(0)
  }
  const shot = async (name) => {
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'horizontal-overflow',
    )
    await page.screenshot({
      path: output + '/' + name + '.png',
      fullPage: true,
      mask: [
        page.locator('input[type=password]'),
        page.getByText(/@example\.test/),
      ],
    })
  }
  stage = 'A restricted login'
  console.log('Running browser journey A')
  await login(restricted)
  await expect(
    page.getByText(/Identidad autenticada con acceso restringido/),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Preparar solicitud', exact: true }),
  ).toHaveCount(0)
  await shot('restricted-desktop')
  const full = await page.evaluate(async () => {
    const { api } = await import('/src/services/api.ts')
    try {
      await api('/auth/me')
      return 200
    } catch (e) {
      return e.status
    }
  })
  assert.equal(full, 403)
  await expect(
    page.getByText(/Identidad autenticada con acceso restringido/),
  ).toBeVisible()
  await go('/driver/services')
  await expect(page).toHaveURL(/\/privacy\/deletion$/)
  await page.reload()
  await expect(
    page.getByText(/Identidad autenticada con acceso restringido/),
  ).toBeVisible()
  await page.getByLabel('Folio de solicitud').fill(restrictedRequest.id)
  await page
    .getByRole('button', { name: 'Consultar folio', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Seguimiento', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  await shot('restricted-followup-320')
  const prohibited = await page.evaluate(async () => {
    const { api } = await import('/src/services/api.ts')
    try {
      await api('/driver/dispatches/available')
      return 200
    } catch (e) {
      return e.status
    }
  })
  assert.equal(prohibited, 403)
  report.session = {
    restrictedFullProjection: full,
    prohibitedOperation: prohibited,
    retainsIdentity: true,
  }
  report.checks.push(
    'A: real restricted login, restoration, follow-up, forbidden operation and full projection; no logout',
  )
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  stage = 'B administrator command'
  console.log('Running browser journey B')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await login(admin)
  stage = 'B administrative detail'
  await go('/admin/privacy/deletion/' + request.id)
  const select = page.getByLabel('Acción administrativa')
  await expect(select).toBeEnabled()
  await select.selectOption('REQUEST_IDENTITY_INFORMATION')
  stage = 'B prepare command'
  await page
    .getByLabel('Referencia UUID de evidencia custodiada')
    .fill(randomUUID())
  await page
    .getByRole('button', { name: 'Revisar decisión', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  assert.ok(
    await page.evaluate(() => !!document.activeElement?.closest('dialog')),
  )
  await page.getByRole('dialog').getByRole('checkbox').check()
  drop = true
  await page
    .getByRole('button', { name: 'Confirmar decisión', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    /No se pudo confirmar|El servidor no confirmó/,
  )
  assert.equal(report.postCommit.verifiedBeforeDrop, true)
  assert.equal(report.postCommit.revisionDelta, 1)
  stage = 'B recovery after reload'
  await page.reload()
  await expect(
    page.getByRole('button', {
      name: 'Consultar recibo administrativo',
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole('button', {
      name: 'Consultar recibo administrativo',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Comando aplicado: recibo histórico' }),
  ).toBeVisible()
  assert.equal(postCount, 1)
  await shot('admin-recovered-after-reload')
  stage = 'B historical and current state'
  // Change current resource using a distinct, explicit backend command, then prove history stays separate.
  const before = await db.documentDeletion.findUniqueOrThrow({
    where: { id: request.id },
  })
  await service.resolve(
    admin.id,
    request.id,
    {
      expectedRevision: before.revision,
      action: 'IDENTITY_EVIDENCE_RECEIVED',
      evidenceRef: randomUUID(),
    },
    randomUUID(),
  )
  await page
    .getByRole('button', {
      name: 'Consultar recibo administrativo',
      exact: true,
    })
    .click()
  await expect(
    page.getByText('Revisión histórica: ' + (request.revision + 1) + '.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    page.getByText(String(request.revision + 2), { exact: true }),
  ).toBeVisible()
  report.postCommit.recoveredByGet = true
  report.postCommit.originalPostCount = postCount
  report.postCommit.originalCommandCount =
    await db.documentDeletionCommand.count({
      where: { actorId: admin.id, key: droppedKey },
    })
  report.postCommit.originalEventCount = await db.documentDeletionEvent.count({
    where: { requestId: request.id, kind: 'REQUEST_IDENTITY_INFORMATION' },
  })
  report.postCommit.historicalRevision = request.revision + 1
  report.postCommit.currentRevision = request.revision + 2
  assert.equal(report.postCommit.originalCommandCount, 1)
  assert.equal(report.postCommit.originalEventCount, 1)
  const otherContext = await browser.newContext(),
    otherPage = await otherContext.newPage()
  await otherPage.goto('http://127.0.0.1:4196/login')
  await otherPage.getByLabel('Correo electrónico').fill(otherAdmin.email)
  await otherPage.getByLabel('Contraseña', { exact: true }).fill(password)
  await otherPage
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await expect(
    otherPage.getByRole('link', { name: 'Baja y privacidad', exact: true }),
  ).toBeVisible()
  const foreign = await otherPage.evaluate(
    async ({ id, key }) => {
      const { apiOnce } = await import('/src/services/api.ts')
      try {
        await apiOnce(
          '/admin/privacy/deletion-requests/' + id + '/commands/by-key/' + key,
          'GET',
        )
        return { status: 200 }
      } catch (e) {
        return { status: e.status, code: e.code }
      }
    },
    { id: request.id, key: droppedKey },
  )
  assert.equal(foreign.status, 404)
  assert.equal(foreign.code, 'COMMAND_RECEIPT_UNAVAILABLE')
  await otherContext.close()
  report.postCommit.foreignAdministrator = foreign
  report.checks.push(
    'B: real commit checked before transport drop, reload, GET receipt, one original command/event; other admin denied; historical/current separated',
  )
  assert.ok(modes.some((x) => x.accessMode === 'STANDARD'))
  assert.ok(
    modes.some(
      (x) =>
        x.accessMode === 'DELETION_RESTRICTED' &&
        x.identityFields.join(',') === 'id',
    ),
  )
  assert.ok(counts.refresh < 12, 'no refresh loop')
  assert.deepEqual(errors, [])
  assert.equal(storage.effects.length, 0)
  report.session = { ...report.session, counts, modes }
  report.externalStorageOperations = storage.effects.length
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.failure = { stage, type: error.name }
  process.exitCode = 1
  console.error(
    'Compatibility validation failed at ' +
      stage +
      ' (' +
      error.name +
      '); no sensitive response logged.',
  )
} finally {
  await browser?.close()
  await vite?.close()
  await app?.close()
  await db?.$disconnect()
  report.cleanup.browserAndServersStopped = true
  if (started) {
    const stopped = spawnSync(
      pgctl,
      ['stop', '-D', cluster, '-m', 'fast', '-w'],
      { encoding: 'utf8', windowsHide: true },
    )
    report.cleanup.ownedClusterStopped = stopped.status === 0
    if (stopped.status !== 0) process.exitCode = 1
  } else report.cleanup.ownedClusterStopped = 'not started by this run'
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
  console.log(
    JSON.stringify({
      status: report.status,
      stage,
      checks: report.checks,
      postCommit: report.postCommit,
      cleanup: report.cleanup,
    }),
  )
}
