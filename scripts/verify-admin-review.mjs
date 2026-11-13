import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import {
  prepareDatabase,
  stopDatabase,
  requireBackend,
  loadSource,
  work,
  database,
  apiPort,
  webPort,
} from './onboarding-isolated-environment.mjs'

const api = 'http://127.0.0.1:' + apiPort,
  web = 'http://127.0.0.1:' + webPort
const secret = () => randomBytes(32).toString('hex')
const password = secret(),
  email = 'reviewer@example.invalid'
let app, browser, vite
try {
  await prepareDatabase()
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
    ROUTING_PROVIDER: 'local_fake',
    LOCAL_MAIL_OUTBOX_DIR: join(work, 'outbox'),
    B2B_WEBHOOK_POLL_SECONDS: '0',
    DISPATCH_SEARCH_POLL_SECONDS: '0',
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
  const { AppModule } = await loadSource('dist/app.module.js'),
    { setup } = await loadSource('dist/setup.js')
  const module = await requireBackend('@nestjs/testing')
    .Test.createTestingModule({ imports: [AppModule] })
    .compile()
  app = module.createNestApplication({ logger: false })
  setup(app)
  await app.listen(apiPort, '127.0.0.1')
  const db = app.get(
    (await loadSource('dist/prisma/prisma.service.js')).PrismaService,
  )
  const hash = await requireBackend('argon2').hash(password)
  const admin = await db.user.create({
    data: {
      email,
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      emailVerifiedAt: new Date(),
    },
  })
  const fleets = await Promise.all(
    ['Centro', 'Norte'].map((name) =>
      db.deliveryProvider.create({
        data: {
          name,
          code: name,
          type: 'FLEET',
          status: 'ACTIVE',
          maxDrivers: 30,
          maxVehicles: 30,
        },
      }),
    ),
  )
  const statuses = ['APPROVED', 'DRAFT', 'SUBMITTED', 'WITHDRAWN', 'REJECTED']
  const now = Date.now(),
    day = 86400000,
    cases = []
  for (let i = 0; i < 24; i++) {
    const providerId = fleets[i === 23 ? 1 : 0].id
    const user = await db.user.create({
      data: {
        email: 'driver' + i + '@example.invalid',
        passwordHash: hash,
        role: 'DRIVER',
      },
    })
    const driver = await db.driver.create({
      data: { name: 'Repartidor de prueba', userId: user.id, providerId },
    })
    const subject = await db.verificationSubject.create({
      data: { driverId: driver.id, providerId },
    })
    const status = statuses[i % 5],
      createdAt = new Date(now - (60 + i) * day)
    const record = await db.verificationCase.create({
      data: {
        subjectId: subject.id,
        presenterId: admin.id,
        revision: 4 * i + 1,
        createdAt,
      },
    })
    const submittedAt = new Date(now - (i + 1) * day)
    let current = record
    if (status !== 'DRAFT')
      current = await db.verificationCase.update({
        where: { id: record.id },
        data: {
          revision: { increment: 1 },
          status: status === 'WITHDRAWN' ? status : 'SUBMITTED',
          submittedAt,
        },
      })
    if (status === 'APPROVED' || status === 'REJECTED')
      current = await db.verificationCase.update({
        where: { id: record.id },
        data: {
          status,
          revision: { increment: 1 },
          reviewerId: admin.id,
          checklist: ['IDENTITY_MATCH', 'LEGIBLE'],
          decidedAt: new Date(submittedAt.getTime() + 1000),
          publicReason:
            status === 'APPROVED'
              ? 'Documentación vigente'
              : 'Revisar legibilidad',
        },
      })
    cases.push(current)
  }
  await db.verificationEvent.create({
    data: { actorId: admin.id, target: cases[23].id, kind: 'UPDATE_CASE' },
  })
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
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1000 },
  })
  await page.goto(web + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible()
  await page.goto(web + '/admin/verification-cases')
  const table = page.getByRole('table')
  await expect(table.getByRole('row')).toHaveCount(21)
  await expect(table.getByRole('row').nth(1)).toContainText(
    'Revisión ' + cases[23].revision,
  )
  await expect(
    page.getByRole('link', { name: 'Revisar el más antiguo' }),
  ).toHaveAttribute('href', '/verification/cases/' + cases[22].id)
  await expect(
    page.getByRole('button', { name: 'En revisión 5', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: join(work, 'review-desktop.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(table.getByRole('row')).toHaveCount(5)
  await page
    .getByRole('searchbox', { name: 'Buscar revisión o nota' })
    .fill('Revisión ' + cases[22].revision)
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table).toContainText('Revisión ' + cases[22].revision)
  await page.getByRole('searchbox').fill('legibilidad')
  await expect(table.getByRole('row')).toHaveCount(5)
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'En revisión 5', exact: true }).click()
  await expect(table.getByRole('row')).toHaveCount(6)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() =>
      page
        .locator('.sidebar')
        .evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0)
  await page.screenshot({
    path: join(work, 'review-mobile.png'),
    fullPage: true,
  })
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  )
  await page.getByRole('button', { name: /Proveedor: Todos/ }).click()
  await page.getByLabel('Seleccionar proveedor').selectOption(fleets[1].id)
  await page.getByRole('button', { name: 'Filtrar: Norte' }).click()
  await expect(page.getByText('Sin expedientes en espera')).toBeVisible()
  await expect(page.getByText('Sin expedientes en este estado')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Revisar el más antiguo' }),
  ).toHaveCount(0)
  const driverLogin = await fetch(api + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver0@example.invalid', password }),
  })
  const { accessToken } = await driverLogin.json()
  assert.equal(
    (
      await fetch(api + '/api/v1/admin/verification-cases', {
        headers: { Authorization: 'Bearer ' + accessToken },
      })
    ).status,
    403,
  )
  await writeFile(
    join(work, 'admin-review.json'),
    JSON.stringify(
      {
        status: 'PASS',
        cases: 24,
        checks: [
          'global counts outside page',
          'latest event first',
          'oldest by submission',
          'pagination',
          'revision and note search',
          'status and provider filters',
          'empty queue',
          'mobile width',
          'DRIVER forbidden',
        ],
      },
      null,
      2,
    ),
  )
  console.log(work)
} finally {
  await browser?.close()
  await vite?.close()
  await app?.close()
  await stopDatabase()
}
