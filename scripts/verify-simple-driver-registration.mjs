// End-to-end option A: real Nest, isolated PostgreSQL, browser, captured mail and private local storage.
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFile, readFile } from 'node:fs/promises'
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
const api = 'http://127.0.0.1:' + apiPort,
  web = 'http://127.0.0.1:' + webPort
const report = { startedAt: new Date().toISOString(), cameraPhotos: process.env.CAMERA_PHOTOS === '1', checks: [], cleanup: {} }
const mail = []
const secret = () => randomBytes(32).toString('hex')
const password = secret(),
  email = 'option-a@example.invalid'
let app,
  storage,
  db,
  vite,
  browser,
  page,
  step = 'preparation'
const mark = (name) => {
  step = name
  console.log(name)
}
const checked = (route, method) => (r) =>
  r.url() === api + '/api/v1' + route && r.request().method() === method
const button = (name) => page.getByRole('button', { name, exact: true })
const captureViews = async (name) => {
  await page.evaluate(() => document.fonts.ready)
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => window.scrollTo(0, 0))
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${name}: overflow at ${width}px`,
    )
    if (width === 390 || width === 1280)
      await page.screenshot({
        path: join(work, `${name}-${width === 390 ? 'mobile' : 'desktop'}.png`),
        fullPage: true,
      })
  }
  await page.setViewportSize({ width: 390, height: 844 })
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
  const { MAIL_PROVIDER } = await loadSource('dist/mail/mail.types.js')
  const module = await requireBackend('@nestjs/testing')
    .Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(VERIFICATION_STORAGE)
    .useValue(storage)
    .overrideProvider(MAIL_PROVIDER)
    .useValue({
      sendDriverVerification: async (value) => {
        mail.push(value)
      },
    })
    .compile()
  app = module.createNestApplication({ logger: false })
  setup(app)
  await app.listen(apiPort, '127.0.0.1')
  const { PrismaService } = await loadSource('dist/prisma/prisma.service.js')
  db = app.get(PrismaService)

  const { DriverSignupService } = await loadSource(
    'dist/verification/driver-signup.js',
  )
  const signup = app.get(DriverSignupService)
  const start = async (suffix) => {
    const address = suffix + '@example.invalid'
    const r = await signup.start({ email: address })
    const sent = mail.findLast((m) => m.to === address)
    assert.match(sent.token, /^[0-9]{6}$/)
    const stored = await db.driverSignupChallenge.findUniqueOrThrow({
      where: { id: r.challengeId },
    })
    assert.notEqual(stored.codeHash, sent.token)
    return {
      challengeId: r.challengeId,
      code: sent.token,
      name: 'Persona sintética',
      password,
    }
  }
  mark('Límites, vencimiento, reenvío y concurrencia con PostgreSQL')
  const bad = await start('bad-attempts')
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      signup.complete({
        ...bad,
        code: bad.code === '000000' ? '000001' : '000000',
      }),
      /SIGNUP_CODE_INVALID/,
    )
  await assert.rejects(signup.complete(bad), /SIGNUP_CODE_INVALID/)
  assert.equal(
    (
      await db.driverSignupChallenge.findUnique({
        where: { id: bad.challengeId },
      })
    ).attempts,
    5,
  )
  report.checks.push('Five failed attempts persist; correct code then rejected')
  const expired = await start('expired')
  await db.driverSignupChallenge.update({
    where: { id: expired.challengeId },
    data: { expiresAt: new Date(0) },
  })
  await assert.rejects(signup.complete(expired), /SIGNUP_CODE_INVALID/)
  const cross = await start('environment')
  await db.driverSignupChallenge.update({
    where: { id: cross.challengeId },
    data: { environment: 'PRODUCTION' },
  })
  await assert.rejects(signup.complete(cross), /SIGNUP_CODE_INVALID/)
  report.checks.push('Expired and cross-environment challenges rejected')
  const old = await start('resend')
  await db.driverSignupChallenge.update({
    where: { id: old.challengeId },
    data: { createdAt: new Date(Date.now() - 61000) },
  })
  const fresh = await start('resend')
  await assert.rejects(signup.complete(old), /SIGNUP_CODE_INVALID/)
  const outcomes = await Promise.allSettled([
    signup.complete(fresh),
    signup.complete(fresh),
  ])
  assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal(
    await db.user.count({ where: { email: 'resend@example.invalid' } }),
    1,
  )
  await assert.rejects(signup.complete(fresh), /SIGNUP_CODE_INVALID/)
  const mailCount = mail.length
  assert.equal(
    (await signup.start({ email: 'resend@example.invalid' })).status,
    'CHECK_EMAIL',
  )
  assert.equal(mail.length, mailCount)
  report.checks.push(
    'Resend invalidates old code; concurrent completion creates one account; replay and existing email do not change it',
  )
  const { renderDriverVerification } = await loadSource(
    'dist/mail/mail-templates.js',
  )
  const rendered = renderDriverVerification({
    kind: 'SIGNUP',
    to: 'sample@example.invalid',
    reference: randomUUID(),
    token: '012345',
  })
  assert(rendered.text.includes('012345') && rendered.html.includes('012345'))
  report.checks.push(
    'Six digits, including leading zero, appear in both email formats',
  )
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
  page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.setDefaultTimeout(15000)
  mark('Registro por UI y acceso automático')
  await page.goto(web + '/driver/register')
  await expect(
    page.getByRole('heading', { name: 'Crea tu cuenta de conductor' }),
  ).toBeVisible()
  await page.screenshot({ path: join(work, 'signup.png'), fullPage: true })
  await captureViews('signup')
  await page.getByLabel('Tu correo electrónico').fill(email)
  await button('Recibir código').click()
  await expect(page.getByLabel('Código de 6 dígitos')).toBeVisible()
  await captureViews('code')
  const challenge = mail.findLast((m) => m.to === email)
  await page.getByLabel('Código de 6 dígitos').fill(challenge.token)
  await page
    .getByLabel('Nombre completo', { exact: true })
    .fill('Conductor sintético')
  await page.getByLabel('Crea una contraseña', { exact: true }).fill(password)
  const sessionResponse = page.waitForResponse(checked('/auth/login', 'POST'))
  await button('Crear cuenta y continuar').click()
  const tokens = await (await sessionResponse).json()
  await expect(page).toHaveURL(web + '/driver/onboarding')
  await expect(
    page.getByRole('heading', { name: 'Tu cuenta está lista' }),
  ).toBeVisible()
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { driver: { include: { independentProfile: true } } },
  })
  assert(user.emailVerifiedAt)
  assert.equal(user.driver.status, 'PENDING')
  assert.equal(user.driver.independentProfile.status, 'PENDING')
  report.checks.push(
    'UI registration enters onboarding automatically; email verified; driver remains pending',
  )
  await expect(page.getByRole('checkbox')).toBeVisible()
  await captureViews('terms')
  await page.getByRole('checkbox').check()
  await button('Aceptar personalmente (prueba)').click()
  await expect(
    page.getByRole('heading', { name: 'Tus datos y tu vehículo' }),
  ).toBeVisible()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue(
    'Conductor sintético',
  )
  await captureViews('data')
  await page
    .getByLabel('Teléfono de contacto', { exact: true })
    .fill('0000000000')
  await page.getByLabel('Placa', { exact: true }).fill('PRB001')
  await page.getByLabel('Categoría de tu licencia').fill('A')
  await page.getByLabel('Vencimiento de tu licencia').fill('2030-11-05')
  await page.getByLabel('Número de serie del vehículo').fill('SYNTHUNIT001')
  await button('Guardar y continuar con las fotos').click()
  await expect(
    page.getByRole('heading', { name: 'Tus fotos', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Tus fotos', exact: true }),
  ).toBeVisible()
  assert.equal(
    await db.vehicle.count({
      where: { independentDriverProfileId: user.driver.independentProfile.id },
    }),
    1,
  )
  assert.equal(
    await db.verificationCase.count({ where: { presenterId: user.id } }),
    2,
  )
  report.checks.push(
    'Name prefilled; vehicle identifier and two drafts created automatically; reload resumes photos',
  )
  const apiCall = async (
    route,
    body,
    key = randomUUID(),
    token = tokens.accessToken,
  ) => {
    const response = await fetch(api + '/api/v1' + route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  const cases = await db.verificationCase.findMany({
    where: { presenterId: user.id },
    include: { subject: true },
  })
  const identity = cases.find((c) => c.subject.driverId),
    unit = cases.find((c) => c.subject.vehicleId)
  let submitBody = {
    identityCaseId: identity.id,
    identityRevision: identity.revision,
    vehicleCaseId: unit.id,
    vehicleRevision: unit.revision,
  }
  assert.equal(
    (await apiCall('/driver/onboarding/submit', submitBody)).status,
    409,
  )
  assert.equal(
    await db.verificationCase.count({
      where: { presenterId: user.id, status: 'SUBMITTED' },
    }),
    0,
  )
  report.checks.push(
    'Missing files reject the entire submission; neither case changes',
  )
  mark('Cinco fotos guiadas y envío único')
  await captureViews('photos')
  const image = await requireBackend('sharp')(
    Buffer.from(
      '<svg width="520" height="150"><rect width="100%" height="100%" fill="white"/><text x="12" y="65" font-size="22">PRUEBA SINTETICA SIN VALIDEZ</text></svg>',
    ),
  )
    .png()
    .toBuffer()
  const cameraFixtures =
    process.env.CAMERA_PHOTOS === '1'
      ? {
          'Fotografía de rostro': {
            name: 'example.heic',
            mimeType: 'image/heic',
            buffer: await readFile('test-results/camera-photos/example.heic'),
          },
          'INE: frente': {
            name: 'camera-48MP.jpg',
            mimeType: 'image/jpeg',
            buffer: await requireBackend('sharp')({
              create: {
                width: 8000,
                height: 6000,
                channels: 3,
                background: '#abc',
              },
            })
              .jpeg()
              .toBuffer(),
          },
        }
      : {}
  for (const label of [
    'Fotografía de rostro',
    'INE: frente',
    'INE: reverso',
    'Licencia del conductor',
    'Tarjeta de circulación',
  ]) {
    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: label, exact: true }) })
    await expect(card.locator('input[type=file]')).toBeEnabled()
    await card.locator('input[type=file]').setInputFiles(
      cameraFixtures[label] || {
        name: 'synthetic.png',
        mimeType: 'image/png',
        buffer: image,
      },
    )
    await expect(card.getByText('Guardada', { exact: true })).toBeVisible()
    await expect(card.getByText('Preparando y guardando foto…')).toHaveCount(0)
  }
  assert.equal(await page.locator('input[type=file]').count(), 5)
  await page
    .locator('img.journey-preview')
    .evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  await page.screenshot({
    path: join(work, 'guided-mobile.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({
    path: join(work, 'guided-desktop.png'),
    fullPage: true,
  })
  const a = await db.verificationCase.findUnique({
      where: { id: identity.id },
    }),
    b = await db.verificationCase.findUnique({ where: { id: unit.id } })
  submitBody = {
    identityCaseId: a.id,
    identityRevision: a.revision,
    vehicleCaseId: b.id,
    vehicleRevision: b.revision,
  }
  assert.equal(
    (
      await apiCall('/driver/onboarding/submit', {
        ...submitBody,
        vehicleRevision: 1,
      })
    ).status,
    409,
  )
  assert.equal(
    await db.verificationCase.count({
      where: { presenterId: user.id, status: 'SUBMITTED' },
    }),
    0,
  )
  // Reuse another authenticated driver's session to prove ownership is checked.
  const otherLogin = await fetch(api + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'resend@example.invalid', password }),
  })
  const otherTokens = await otherLogin.json()
  assert.equal(
    (
      await apiCall(
        '/driver/onboarding/submit',
        submitBody,
        randomUUID(),
        otherTokens.accessToken,
      )
    ).status,
    404,
  )
  report.checks.push(
    'Stale revision and foreign driver are rejected before either case changes',
  )
  const requestPromise = page.waitForRequest((r) =>
    checked(
      '/driver/onboarding/submit',
      'POST',
    )({ url: () => r.url(), request: () => r }),
  )
  await page.route('**/api/v1/driver/onboarding/submit', async (route) => {
    const response = await route.fetch()
    assert.equal(response.status(), 200)
    await route.abort('failed')
  })
  await button('Enviar mi solicitud').click()
  const submission = await requestPromise
  await expect(
    page.getByRole('alert').filter({ hasText: 'Respuesta no confirmada' }),
  ).toBeVisible()
  await expect(button('Consultar intento')).toBeVisible()
  await button('Consultar intento').click()
  await expect(
    page.getByRole('heading', { name: 'Recibimos tu solicitud', exact: true }),
  ).toBeVisible()
  const key = submission.headers()['idempotency-key']
  assert.equal(
    (await apiCall('/driver/onboarding/submit', submission.postDataJSON(), key))
      .status,
    200,
  )
  assert.equal(
    await db.verificationCase.count({
      where: { presenterId: user.id, status: 'SUBMITTED' },
    }),
    2,
  )
  for (const c of [identity, unit])
    assert.equal(
      await db.verificationEvent.count({
        where: { target: c.id, kind: 'SUBMIT' },
      }),
      1,
    )
  assert.equal(
    (await db.driver.findUnique({ where: { id: user.driver.id } })).status,
    'PENDING',
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Recibimos tu solicitud', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: join(work, 'submitted.png'), fullPage: true })
  await captureViews('submitted')
  report.checks.push(
    'Six redesigned screens captured on mobile and desktop; no horizontal overflow at 320, 390, 768 and 1280 px',
  )
  report.checks.push(
    'Lost HTTP response recovered from UI; one submission presents both cases; idempotent replay adds no event; reload confirms review; driver remains pending',
  )
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.failedStep = step
  report.error = String(error.message)
    .replace(/https?:\/\/[^\s]+/g, '[local URL]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[opaque]')
    .slice(0, 1000)
  console.error(report.failedStep, report.error)
  if (page)
    console.error('UI alerts:', await page.getByRole('alert').allTextContents())
  process.exitCode = 1
} finally {
  await browser?.close()
  await vite?.close()
  await app?.close()
  await storage?.close()
  report.cleanup.postgresStopped = await stopDatabase()
  report.finishedAt = new Date().toISOString()
  await writeFile(
    join(work, 'simple-registration.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(join(work, 'simple-registration.json'))
}
