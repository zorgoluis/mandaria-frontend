// Real browser against an isolated Nest application, PostgreSQL and private local PUT endpoint.
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import {
  root,
  work,
  apiPort,
  webPort,
  pgPort,
  database,
  loadSource,
  requireBackend,
  prepareDatabase,
  stopDatabase,
} from './onboarding-isolated-environment.mjs'

const api = 'http://127.0.0.1:' + apiPort
const web = 'http://127.0.0.1:' + webPort
const report = {
  startedAt: new Date().toISOString(),
  mode: 'LOCAL_TEST',
  api,
  web,
  pgPort,
  preparation:
    'Confirmed synthetic DRIVER with pending independent profile; zero cases or vehicles at entry',
  steps: [],
  http: [],
  cases: [],
  cleanup: {},
}
const secret = () => randomBytes(32).toString('hex')
const password = secret()
const email = 'courier@example.invalid'
let app,
  storage,
  db,
  vite,
  browser,
  page,
  step = 'database'
const mark = (name) => {
  step = name
  console.log(name)
}
function checked(route, method) {
  return (r) =>
    r.url() === api + '/api/v1' + route && r.request().method() === method
}
async function action(route, method, click) {
  const [r] = await Promise.all([
    page.waitForResponse(checked(route, method)),
    click(),
  ])
  const body = await r.json()
  assert(
    r.ok(),
    method + ' ' + route + ' ' + r.status() + ' ' + (body.code || ''),
  )
  return body
}
const button = (name) => page.getByRole('button', { name, exact: true })
async function goFromAccount() {
  await page.goto(web + '/profile')
  await page.locator('a[href="/driver/onboarding"]').click()
  await expect(page).toHaveURL(web + '/driver/onboarding')
  report.steps.push('Mi cuenta → Mi verificación documental')
}
async function createCase(label) {
  const c = await action('/driver/verification-cases', 'POST', () =>
    button(label).click(),
  )
  await expect(page).toHaveURL(web + '/verification/cases/' + c.id)
  return c.id
}
async function readCase(id) {
  await expect(
    page.getByText('Tu expediente ya está en revisión.', { exact: false }),
  ).toBeVisible()
  await page.goto(web + '/profile')
  await expect(page.locator('a[href="/driver/onboarding"]')).toBeVisible()
  return action('/verification-cases/' + id, 'GET', () =>
    page.goto(web + '/verification/cases/' + id),
  )
}
async function upload(id, category, label) {
  mark('Carga ' + category)
  const image = await requireBackend('sharp')(
    Buffer.from(
      '<svg width="520" height="150"><rect width="100%" height="100%" fill="white"/><text x="12" y="52" font-size="22">PRUEBA SINTETICA - SIN VALIDEZ</text><text x="12" y="100">' +
        category +
        '</text></svg>',
    ),
  )
    .png()
    .toBuffer()
  await page.getByRole('radio', { name: label, exact: true }).check()
  await page.locator('input[type=file]').setInputFiles({
    name: category + '.png',
    mimeType: 'image/png',
    buffer: image,
  })
  const base = '/verification-cases/' + id + '/uploads'
  const [created, put, complete] = await Promise.all([
    page.waitForResponse(checked(base, 'POST')),
    page.waitForResponse(
      (r) =>
        new URL(r.url()).origin === 'http://127.0.0.1:' + storage.port &&
        r.request().method() === 'PUT',
    ),
    page.waitForResponse(
      (r) =>
        r.url().startsWith(api + '/api/v1' + base + '/') &&
        r.url().endsWith('/complete') &&
        r.request().method() === 'POST',
    ),
    button('Cargar imagen sintética').click(),
  ])
  assert(created.ok() && put.ok() && complete.ok())
  await expect(
    page.getByRole('radio', { name: label, exact: true }),
  ).toHaveAccessibleDescription(/Imagen recibida/)
}
async function submit(id, subjectType, expected) {
  mark('Presentar ' + subjectType)
  await expect(
    page.getByRole('heading', { name: 'Listo para enviar a revisión' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Ir al envío' }).click()
  await button('Presentar para revisión').click()
  await action('/verification-cases/' + id + '/submit', 'POST', () =>
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar', exact: true })
      .click(),
  )
  const c = await readCase(id)
  assert.equal(c.id, id)
  assert.equal(c.subjectType, subjectType)
  assert.equal(c.status, 'SUBMITTED')
  assert.equal(c.environment, 'LOCAL_TEST')
  assert.equal(c.scope.providerId, null)
  assert.deepEqual(
    c.attachments.map((a) => [a.category, a.status]).sort(),
    expected.map((category) => [category, 'VALIDATED']).sort(),
  )
  assert.equal(c.events.filter((e) => e.kind === 'SUBMIT').length, 1)
  await expect(
    page.getByText('Tu expediente ya está en revisión.', { exact: false }),
  ).toBeVisible()
  await expect(button('Presentar para revisión')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Expediente enviado' }),
  ).toBeVisible()
  await page.screenshot({
    path: join(work, subjectType + '.png'),
    fullPage: true,
  })
  report.cases.push({
    id,
    resourceId: c.resourceId,
    subjectType,
    status: c.status,
    revision: c.revision,
    submittedAt: c.submittedAt,
    attachments: c.attachments.map(({ category, status }) => ({
      category,
      status,
    })),
    submissionEvents: 1,
    afterReload: true,
  })
}
try {
  const env = await prepareDatabase()
  report.database = env.targetIdentityBeforeMigration.database
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
    LOCAL_MAIL_OUTBOX_DIR: join(work, 'outbox'),
    B2B_WEBHOOK_POLL_SECONDS: '0',
    DISPATCH_SEARCH_POLL_SECONDS: '0',
  }
  requireBackend('reflect-metadata')
  const { ConfigModule } = requireBackend('@nestjs/config')
  const original = ConfigModule.forRoot
  ConfigModule.forRoot = function (options) {
    return original.call(this, {
      ...options,
      ignoreEnvFile: true,
      ignoreEnvVars: true,
      skipProcessEnv: true,
      validate: () => options.validate(config),
    })
  }
  mark('Nest y almacenamiento privado')
  const { LocalVerificationStorage } = await loadSource(
    'scripts/local-verification-storage.mjs',
  )
  storage = await new LocalVerificationStorage({
    root: join(work, 'objects'),
    origins: [web],
    environment: 'test',
  }).start()
  const { AppModule } = await loadSource('dist/app.module.js')
  const { setup } = await loadSource('dist/setup.js')
  const { VERIFICATION_STORAGE } = await loadSource(
    'dist/verification/verification-storage.js',
  )
  const module = await requireBackend('@nestjs/testing')
    .Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(VERIFICATION_STORAGE)
    .useValue(storage)
    .compile()
  app = module.createNestApplication({ logger: false })
  setup(app)
  await app.listen(apiPort, '127.0.0.1')
  const { PrismaService } = await loadSource('dist/prisma/prisma.service.js')
  db = app.get(PrismaService)
  const actor = await db.user.create({
    data: {
      email,
      passwordHash: await requireBackend('argon2').hash(password),
      role: 'DRIVER',
      emailVerifiedAt: new Date(),
    },
  })
  const driver = await db.driver.create({
    data: {
      userId: actor.id,
      name: 'Repartidor sintético',
      independentProfile: { create: {} },
    },
  })
  report.driverId = driver.id
  report.backendPackage = JSON.parse(
    await readFile(root + '/package.json', 'utf8'),
  ).version
  report.verificationDistSha256 = createHash('sha256')
    .update(await readFile(root + '/dist/verification/verification.service.js'))
    .digest('hex')
  assert.equal(await db.verificationCase.count(), 0)
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
  browser = await chromium.launch()
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(8500)
  page.on('response', (r) => {
    const u = new URL(r.url())
    const method = r.request().method()
    if (u.origin === 'http://127.0.0.1:' + storage.port && method === 'PUT')
      report.http.push({ method, path: '[private upload]', status: r.status() })
    if (
      u.origin === api &&
      /^\/api\/v1\/(verification-|driver\/(onboarding|verification-cases)|auth\/login)/.test(
        u.pathname,
      )
    )
      report.http.push({ method, path: u.pathname, status: r.status() })
  })
  mark('Login y Mi cuenta')
  await page.goto(web + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await action('/auth/login', 'POST', () => button('Iniciar sesión').click())
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible()
  await goFromAccount()
  mark('Términos')
  await page.getByRole('link', { name: 'Ir a los términos' }).click()
  await page.getByRole('checkbox').check()
  await action('/verification-terms/accept', 'POST', () =>
    button('Aceptar personalmente (prueba)').click(),
  )
  mark('Identidad')
  await page.getByRole('link', { name: 'Ir a mi identidad' }).click()
  const identity = await createCase(
    'Preparar expediente de identidad independiente',
  )
  await page.getByLabel('Nombre completo').fill('Repartidor de prueba')
  await page.getByLabel('Teléfono de contacto').fill('0000000000')
  await page.getByLabel(/Declarar licencia/).check()
  await page
    .getByRole('textbox', { name: 'Categoría *', exact: true })
    .fill('A')
  await page.getByLabel('Fecha de vencimiento').fill('2029-11-04')
  await page.locator('input[name=vehicleTypes][value=MOTORCYCLE]').check()
  await action('/verification-cases/' + identity, 'PATCH', () =>
    button('Guardar datos').click(),
  )
  const identityDocs = [
    ['FACE_PHOTO', 'Fotografía de rostro'],
    ['INE_FRONT', 'INE: frente'],
    ['INE_BACK', 'INE: reverso'],
    ['LICENSE', 'Licencia del conductor'],
  ]
  for (const [c, l] of identityDocs) await upload(identity, c, l)
  await submit(
    identity,
    'DRIVER_IDENTITY',
    identityDocs.map(([c]) => c),
  )
  await goFromAccount()
  mark('Alta de motocicleta')
  await page.getByRole('link', { name: 'Ir a mis vehículos' }).click()
  await page
    .getByText('Registrar unidad independiente', { exact: true })
    .click()
  const identifier = page.getByLabel('Identificador')
  await identifier.fill('WEB/PRUEBA')
  assert(await identifier.evaluate((input) => input.validity.patternMismatch))
  await identifier.fill('WEB-PRUEBA')
  await page.getByLabel('Tipo *', { exact: true }).selectOption('MOTORCYCLE')
  await page.getByLabel('Placa').fill('PRB-001')
  const vehicleForm = page
    .locator('form')
    .filter({ has: button('Crear unidad pendiente') })
  const invalid = await vehicleForm
    .locator('input:invalid,select:invalid')
    .evaluateAll((fields) => fields.map((f) => f.name))
  assert.deepEqual(invalid, [], 'Invalid vehicle fields: ' + invalid.join(', '))
  await expect(button('Crear unidad pendiente')).toBeEnabled()
  await action('/driver/onboarding/vehicles', 'POST', () =>
    button('Crear unidad pendiente').click(),
  )
  const unit = await createCase('Preparar expediente de esta unidad')
  await page
    .getByLabel('Nombre del titular declarado')
    .fill('Titular sintético')
  await page.getByLabel('Número de serie').fill('SYNTHUNIT001')
  await page.getByRole('radio', { name: 'Propia', exact: true }).check()
  await action('/verification-cases/' + unit, 'PATCH', () =>
    button('Guardar datos').click(),
  )
  await expect(
    page.getByRole('radio', { name: 'Tarjeta de circulación' }),
  ).toBeVisible()
  assert.equal(
    await page.locator('input[name=category][type=radio]').count(),
    1,
  )
  await upload(unit, 'REGISTRATION_CARD', 'Tarjeta de circulación')
  await submit(unit, 'VEHICLE', ['REGISTRATION_CARD'])
  assert.equal(report.http.filter((r) => r.method === 'PUT').length, 5)
  report.status = 'PASS'
} catch (e) {
  report.status = 'FAIL'
  report.failedStep = step
  if (page)
    console.error(
      'Estado UI',
      await page.getByRole('alert').allTextContents(),
      await page
        .locator('input:invalid')
        .evaluateAll((fields) => fields.map((f) => f.name)),
    )
  report.error = String(e.message)
    .replace(/https?:\/\/[^\s]+/g, '[local URL]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[opaque]')
    .slice(0, 700)
  console.error(report.failedStep, report.error)
  process.exitCode = 1
} finally {
  await browser?.close()
  await vite?.close()
  await app?.close()
  await storage?.close()
  report.cleanup.postgresStopped = await stopDatabase()
  report.finishedAt = new Date().toISOString()
  await writeFile(
    join(work, 'journey.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(join(work, 'journey.json'))
}
