// Real resume journey; no HTTP interception and no pre-seeded driver documents.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import { backendSnapshot } from './backend-readonly-snapshot.mjs'
import {
  work,
  apiPort,
  webPort,
  database,
  loadSource,
  requireBackend,
  prepareDatabase,
  stopDatabase,
} from './onboarding-isolated-environment.mjs'
const api = `http://127.0.0.1:${apiPort}`,
  web = `http://127.0.0.1:${webPort}`
const secret = () => randomBytes(32).toString('hex'),
  password = secret(),
  email = 'resume@example.invalid',
  phone = '0000000000'
const mail = [],
  report = {
    startedAt: new Date().toISOString(),
    kind: 'REAL_HTTP_UI_RESUME',
    api,
    web,
    checks: [],
    http: [],
    cleanup: {},
  }
let app,
  storage,
  db,
  vite,
  browser,
  context,
  page,
  user,
  step = 'compile'
const mark = (value) => {
  step = value
  console.log(value)
}
const button = (name) => page.getByRole('button', { name, exact: true })
async function snapshot() {
  const cases = await db.verificationCase.findMany({
    where: { presenterId: user.id },
    orderBy: { id: 'asc' },
    include: { attachments: { orderBy: { id: 'asc' } } },
  })
  const vehicles = await db.vehicle.findMany({
    where: { independentDriverProfileId: user.driver.independentProfile.id },
    orderBy: { id: 'asc' },
  })
  return {
    cases: cases.map((c) => ({
      id: c.id,
      revision: c.revision,
      status: c.status,
      data: c.data,
      attachments: c.attachments.map((a) => ({
        id: a.id,
        category: a.category,
        status: a.status,
      })),
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      identifier: v.identifier,
      plate: v.plate,
      type: v.type,
    })),
  }
}
async function sameSnapshot(before) {
  assert.ok(
    JSON.stringify(await snapshot()) === JSON.stringify(before),
    'Saved state changed during read-only resume (values redacted)',
  )
}
async function account() {
  await page.goto(web + '/profile')
  await expect(
    page.getByRole('link', { name: 'Continuar mi registro' }),
  ).toBeVisible()
}
async function freshSession() {
  await page.setViewportSize({ width: 1280, height: 900 })
  const menu = page.getByRole('button', { name: new RegExp(email) })
  await expect(menu).toBeVisible()
  await menu.click()
  await button('Cerrar sesión').click()
  await expect(page).toHaveURL(/\/login/)
  await context.close()
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  page = await context.newPage()
  watch()
  await page.goto(web + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await button('Iniciar sesión').click()
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible()
}
function watch() {
  page.on('response', (r) => {
    const url = new URL(r.url())
    if (url.origin === api)
      report.http.push({
        method: r.request().method(),
        path: url.pathname,
        status: r.status(),
      })
    else if (storage && url.port === String(storage.port))
      report.http.push({
        method: r.request().method(),
        path: '[private local storage]',
        status: r.status(),
      })
  })
}
async function capture(name) {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    if (width === 390)
      await expect
        .poll(async () => {
          if (!(await page.locator('.sidebar').count())) return true
          const b = await page.locator('.sidebar').boundingBox()
          return !b || b.x + b.width <= 1
        })
        .toBe(true)
    await page.screenshot({
      path: join(work, `${name}-${width}.png`),
      fullPage: true,
      mask: [page.locator('input[name=contactPhone]')],
    })
  }
  await page.setViewportSize({ width: 1280, height: 900 })
}
try {
  const compiled = await backendSnapshot()
  report.backend = compiled.report
  const load = compiled.load
  mark('Isolated database and Nest')
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
  const { LocalVerificationStorage } = await loadSource(
    'scripts/local-verification-storage.mjs',
  )
  storage = await new LocalVerificationStorage({
    root: join(work, 'objects'),
    origins: [web],
    environment: 'test',
  }).start()
  const { AppModule } = await load('app.module.js'),
    { setup } = await load('setup.js'),
    { VERIFICATION_STORAGE } = await load(
      'verification/verification-storage.js',
    ),
    { MAIL_PROVIDER } = await load('mail/mail.types.js')
  const module = await requireBackend('@nestjs/testing')
    .Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(VERIFICATION_STORAGE)
    .useValue(storage)
    .overrideProvider(MAIL_PROVIDER)
    .useValue({ sendDriverVerification: async (value) => mail.push(value) })
    .compile()
  app = module.createNestApplication({ logger: false, bodyParser: false })
  setup(app)
  await app.listen(apiPort, '127.0.0.1')
  const { PrismaService } = await load('prisma/prisma.service.js')
  db = app.get(PrismaService)
  assert.equal(await db.user.count(), 0)
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
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  page = await context.newPage()
  watch()
  mark('Real public UI registration')
  await page.goto(web + '/driver/register')
  await page.getByLabel('Tu correo electrónico').fill(email)
  await button('Recibir código').click()
  await expect(page.getByLabel('Código de 6 dígitos')).toBeVisible()
  await page
    .getByLabel('Código de 6 dígitos')
    .fill(mail.findLast((m) => m.to === email).token)
  await page
    .getByLabel('Nombre completo', { exact: true })
    .fill('Conductor de reanudación sintético')
  await page.getByLabel('Crea una contraseña', { exact: true }).fill(password)
  await button('Crear cuenta y continuar').click()
  await expect(page).toHaveURL(web + '/driver/onboarding')
  user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { driver: { include: { independentProfile: true } } },
  })
  report.identity = {
    userId: user.id,
    driverId: user.driver.id,
    profileId: user.driver.independentProfile.id,
  }
  await expect(page.getByRole('checkbox')).toBeVisible()
  await page.getByRole('checkbox').check()
  await button('Aceptar personalmente (prueba)').click()
  await expect(
    page.getByRole('heading', { name: 'Tus datos y tu vehículo' }),
  ).toBeVisible()
  mark('Resume after accepted terms with a fresh browser context')
  await account()
  await expect(page.getByText('Aceptaciones guardadas')).toBeVisible()
  await freshSession()
  await account()
  await page.getByRole('link', { name: 'Continuar mi registro' }).click()
  await expect(
    page.getByRole('heading', { name: 'Tus datos y tu vehículo' }),
  ).toBeVisible()
  assert.equal(
    await db.verificationCase.count({ where: { presenterId: user.id } }),
    0,
  )
  report.checks.push(
    'Registration and terms via UI; fresh login from Mi cuenta resumes data without duplicate cases',
  )
  // Native required validation must keep the form and avoid any data command.
  const writesBefore = report.http.filter(
    (r) => r.method !== 'GET' && r.method !== 'OPTIONS',
  ).length
  await button('Guardar y continuar con las fotos').click()
  assert.equal(
    await page
      .locator('input[name=contactPhone]')
      .evaluate((el) => el.validity.valueMissing),
    true,
  )
  assert.equal(
    report.http.filter((r) => r.method !== 'GET' && r.method !== 'OPTIONS')
      .length,
    writesBefore,
  )
  await page.getByLabel('Teléfono de contacto', { exact: true }).fill(phone)
  await page.getByLabel('Placa', { exact: true }).fill('PRB001')
  await page.getByLabel('Categoría de tu licencia').fill('A')
  await page.getByLabel('Vencimiento de tu licencia').fill('2030-11-05')
  await page.getByLabel('Número de serie del vehículo').fill('SYNTHUNIT001')
  await button('Guardar y continuar con las fotos').click()
  await expect(
    page.getByRole('heading', { name: 'Tus fotos', exact: true }),
  ).toBeVisible()
  const saved = await snapshot()
  assert.equal(saved.cases.length, 2)
  assert.equal(saved.vehicles.length, 1)
  mark('Resume saved data through Mi cuenta after logout')
  await account()
  await expect(
    page.getByText('Borrador guardado · aún no enviado'),
  ).toHaveCount(2)
  await capture('account-drafts')
  await freshSession()
  await account()
  await page.getByRole('link', { name: 'Continuar mi registro' }).click()
  await expect(
    page.getByRole('heading', { name: 'Tus fotos', exact: true }),
  ).toBeVisible()
  await sameSnapshot(saved)
  await button('Revisar mis datos').click()
  await expect(
    page.getByLabel('Teléfono de contacto', { exact: true }),
  ).toHaveValue(phone)
  await expect(page.getByLabel('Placa', { exact: true })).toHaveValue('PRB001')
  await expect(page.getByLabel('Número de serie del vehículo')).toHaveValue(
    'SYNTHUNIT001',
  )
  await sameSnapshot(saved)
  // Leave without saving again: this is a read-only verification of restored values.
  await account()
  await page.getByRole('link', { name: 'Continuar mi registro' }).click()
  await expect(
    page.getByRole('heading', { name: 'Tus fotos', exact: true }),
  ).toBeVisible()
  await expect(button('Enviar mi solicitud')).toBeDisabled()
  report.checks.push(
    'Required phone remains enforced; same saved fields, vehicle and two draft IDs/revisions after logout and fresh login',
  )
  const image = await requireBackend('sharp')(
    Buffer.from(
      '<svg width="520" height="160"><rect width="100%" height="100%" fill="white"/><text x="12" y="70" font-size="20">PRUEBA SINTETICA SIN VALIDEZ</text></svg>',
    ),
  )
    .png()
    .toBuffer()
  async function upload(label) {
    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: label, exact: true }) })
    await card
      .locator('input[type=file]')
      .setInputFiles({
        name: 'synthetic.png',
        mimeType: 'image/png',
        buffer: image,
      })
    await expect(card.getByText('Guardada', { exact: true })).toBeVisible()
    await expect(card.getByText('Guardando foto…')).toHaveCount(0)
  }
  await upload('Fotografía de rostro')
  await upload('INE: frente')
  const partial = await snapshot()
  assert.equal(
    partial.cases
      .flatMap((c) => c.attachments)
      .filter((a) => a.status === 'VALIDATED').length,
    2,
  )
  mark('Resume two saved uploads after closing session and browser storage')
  await account()
  await freshSession()
  await account()
  await page.getByRole('link', { name: 'Continuar mi registro' }).click()
  await expect(page.getByText('Guardada', { exact: true })).toHaveCount(2)
  await expect(page.getByText('Faltan 3 fotos por guardar.')).toBeVisible()
  await sameSnapshot(partial)
  await expect(button('Enviar mi solicitud')).toBeDisabled()
  await capture('resumed-photos')
  report.checks.push(
    'Two validated uploads survive a fresh browser context; three missing photos still prevent submission',
  )
  for (const label of [
    'INE: reverso',
    'Licencia del conductor',
    'Tarjeta de circulación',
  ])
    await upload(label)
  await expect(button('Enviar mi solicitud')).toBeEnabled()
  await button('Enviar mi solicitud').click()
  await expect(
    page.getByRole('heading', { name: 'Recibimos tu solicitud', exact: true }),
  ).toBeVisible()
  mark('Reenter submitted state, without resubmitting')
  await page.goto(web + '/profile')
  await expect(
    page.getByRole('link', { name: 'Ver estado de mi solicitud' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Continuar mi registro' }),
  ).toHaveCount(0)
  await capture('account-submitted')
  await freshSession()
  await page.goto(web + '/profile')
  await page.getByRole('link', { name: 'Ver estado de mi solicitud' }).click()
  await expect(
    page.getByRole('heading', { name: 'Recibimos tu solicitud', exact: true }),
  ).toBeVisible()
  const final = await snapshot()
  assert.deepEqual(
    final.cases.map((c) => c.id),
    saved.cases.map((c) => c.id),
  )
  assert.deepEqual(final.vehicles, saved.vehicles)
  assert(final.cases.every((c) => c.status === 'SUBMITTED'))
  assert.equal(
    final.cases
      .flatMap((c) => c.attachments)
      .filter((a) => a.status === 'VALIDATED').length,
    5,
  )
  for (const c of final.cases)
    assert.equal(
      await db.verificationEvent.count({
        where: { target: c.id, kind: 'SUBMIT' },
      }),
      1,
    )
  report.cases = final.cases.map((c) => ({
    id: c.id,
    status: c.status,
    revision: c.revision,
    validatedAttachments: c.attachments.filter((a) => a.status === 'VALIDATED')
      .length,
    submitEvents: 1,
  }))
  report.vehicleId = final.vehicles[0].id
  report.checks.push(
    'Complete remaining photos and submit once via UI; fresh session returns to review, same cases/vehicle and one SUBMIT event each',
  )
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.failedStep = step
  report.error =
    error instanceof assert.AssertionError
      ? 'Assertion failed (values redacted)'
      : String(error.message)
          .replaceAll(phone, '[redacted]')
          .replaceAll(password, '[redacted]')
          .slice(0, 650)
  console.error(report.failedStep, report.error)
  process.exitCode = 1
} finally {
  await browser?.close()
  await vite?.close()
  await app?.close()
  await storage?.close()
  report.cleanup = {
    browserClosed: true,
    webStopped: true,
    nestStopped: true,
    storageStopped: true,
    postgresStopped: await stopDatabase(),
  }
  report.finishedAt = new Date().toISOString()
  await mkdir(work, { recursive: true })
  await writeFile(
    join(work, 'account-resume.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(join(work, 'account-resume.json'))
}
