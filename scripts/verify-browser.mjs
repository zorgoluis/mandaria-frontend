import { chromium } from '@playwright/test'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import assert from 'node:assert/strict'

// Credentials are loaded in process memory; never put tokens, secrets or passwords in reports.
const backendEnv = process.env.MANDARIA_BACKEND_ENV
const credentials = {
  ...(backendEnv ? parseEnv(readFileSync(backendEnv, 'utf8')) : {}),
  ...(existsSync('.env.e2e') ? parseEnv(readFileSync('.env.e2e', 'utf8')) : {}),
  ...process.env,
}
const email = credentials.E2E_ADMIN_EMAIL || credentials.BOOTSTRAP_ADMIN_EMAIL
const password =
  credentials.E2E_ADMIN_PASSWORD || credentials.BOOTSTRAP_ADMIN_PASSWORD
if (!email || !password)
  throw new Error(
    'Configure E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD in .env.e2e, or MANDARIA_BACKEND_ENV pointing to the local bootstrap configuration.',
  )
const base = credentials.E2E_WEB_URL || 'http://localhost:5173'
const browser = await chromium.launch(
  credentials.E2E_BROWSER_CHANNEL
    ? { channel: credentials.E2E_BROWSER_CHANNEL }
    : {},
)
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = []
const checks = []
const run = Date.now().toString(36).toUpperCase()
const integrationName = `Validación Web ${run}`
const artifacts = 'test-results/manual'
mkdirSync(artifacts, { recursive: true })
page.on('pageerror', () => errors.push('Unhandled browser error'))
const consoleMessages = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push('Browser console error')
  consoleMessages.push(message.text())
})
const check = (name) => {
  checks.push(name)
  console.log(`PASS ${name}`)
}
async function click(name) {
  console.log(`ACTION ${name}`)
  await page.getByRole('button', { name, exact: true }).click()
}
async function login(account, pass) {
  await page.goto(`${base}/login`)
  await page.getByLabel('Correo electrónico').fill(account)
  await page.getByLabel('Contraseña', { exact: true }).fill(pass)
  await click('Iniciar sesión')
  await page.waitForURL('**/dashboard')
  await page
    .getByRole('heading', { name: /Vista general|Bienvenido a tu operación/ })
    .waitFor()
}
async function logout() {
  await page.locator('.user-trigger').click()
  await click('Cerrar sesión')
  await page.waitForURL('**/login')
}
async function confirmAction(name) {
  await click(name)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
}
async function secretCheck() {
  await page
    .getByText('Este secreto sólo se mostrará una vez.', { exact: true })
    .waitFor()
  const secret = await page
    .getByLabel('Client secret', { exact: true })
    .inputValue()
  assert.ok(secret.length > 20)
  await click('Copiar secreto')
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    secret,
  )
  const storage = await page.evaluate(async () => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    databases: indexedDB.databases ? await indexedDB.databases() : [],
  }))
  assert.ok(!JSON.stringify(storage).includes(secret))
  assert.equal(Object.keys(storage.local).length, 0)
  assert.ok(!consoleMessages.some((message) => message.includes(secret)))
  await click('Ya lo guardé, cerrar')
  assert.equal(
    await page.getByLabel('Client secret', { exact: true }).count(),
    0,
  )
  assert.ok(!(await page.locator('body').innerText()).includes(secret))
  await page.evaluate(() => navigator.clipboard.writeText(''))
  return secret
}
let providerId
let integrationId
try {
  await page.goto(`${base}/login`)
  await page.screenshot({
    path: `${artifacts}/login-desktop.png`,
    fullPage: true,
  })
  await login(email, password)
  check('SUPER_ADMIN login and dashboard')
  await page.getByRole('heading', { name: 'Proveedores recientes' }).waitFor()
  await page.screenshot({
    path: `${artifacts}/dashboard-desktop.png`,
    fullPage: true,
  })
  await page.reload()
  await page.getByRole('heading', { name: 'Vista general' }).waitFor()
  check('session restoration through real refresh')
  await page.getByRole('link', { name: 'Integraciones', exact: true }).click()
  await page.getByRole('heading', { name: 'Clientes B2B' }).waitFor()
  const coitaExists = (await page.getByText(/Coita Eats/i).count()) > 0
  check(
    `integration listing (Coita Eats ${coitaExists ? 'present' : 'not present in returned records'})`,
  )
  await page.getByRole('link', { name: 'Nueva integración' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill(integrationName)
  await page.getByLabel('Código', { exact: false }).fill(`WEB_${run}`)
  await click('Crear integración')
  await page.waitForURL(/\/integrations\/[^/]+$/)
  await page.getByRole('heading', { name: integrationName }).waitFor()
  integrationId = page.url().split('/').at(-1)
  check('create integration')
  await click('Crear credencial')
  await page.getByLabel('deliveries:read').check()
  await click('Generar credencial')
  const originalSecret = await secretCheck()
  check('create credential, one-time warning, copy and no persisted secret')
  await page.getByRole('button', { name: 'Rotar', exact: true }).first().click()
  await page.getByText(/La anterior seguirá activa/).waitFor()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar' })
    .click()
  await secretCheck()
  check('rotate credential preserving previous until explicit revocation')
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole('button', { name: 'Revocar', exact: true })
      .first()
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Revocar', exact: true })
      .click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.waitForTimeout(150)
  }
  check('revoke original and replacement credentials')
  await confirmAction('Suspender integración')
  await page.getByRole('button', { name: 'Activar integración' }).waitFor()
  await confirmAction('Activar integración')
  check('suspend and activate integration')
  await page.reload()
  await page.getByRole('heading', { name: integrationName }).waitFor()
  assert.ok(!(await page.locator('body').innerText()).includes(originalSecret))
  check('secret cannot be recovered after closing and reload')
  for (const type of ['FLEET', 'INDEPENDENT']) {
    await page.goto(`${base}/providers/new`)
    await page
      .getByLabel('Nombre', { exact: true })
      .fill(`Validación ${type} ${run}`)
    await page.getByLabel('Código', { exact: false }).fill(`WEB_${type}_${run}`)
    await page.getByLabel('Tipo de proveedor').selectOption(type)
    await click('Crear proveedor')
    await page.waitForURL(/\/providers\/[^/]+$/)
    await page
      .getByRole('heading', { name: `Validación ${type} ${run}` })
      .waitFor()
    if (type === 'FLEET') providerId = page.url().split('/').at(-1)
    assert.ok(
      Number(await page.getByLabel('Máximo de repartidores').inputValue()) >= 1,
    )
    await page.getByLabel('Máximo de repartidores').fill('7')
    await page.getByLabel('Máximo de vehículos').fill('9')
    await click('Guardar cambios')
    await page
      .getByRole('status')
      .filter({ hasText: 'Proveedor actualizado correctamente.' })
      .waitFor()
    await confirmAction('Activar proveedor')
    await page.getByRole('button', { name: 'Suspender proveedor' }).waitFor()
    await confirmAction('Suspender proveedor')
    await page.getByRole('button', { name: 'Activar proveedor' }).waitFor()
    await confirmAction('Activar proveedor')
    check(
      `create ${type}, backend defaults, edit limits, activate/suspend/reactivate`,
    )
  }
  await page.goto(`${base}/providers`)
  await page.getByLabel('Filtrar por tipo').selectOption('FLEET')
  await page.getByLabel('Filtrar por estado').selectOption('ACTIVE')
  await page.getByLabel('Buscar proveedor').fill(`WEB_FLEET_${run}`)
  await click('Buscar')
  await page
    .getByRole('link', { name: new RegExp(`Validación FLEET ${run}`) })
    .waitFor()
  check('provider filters and search')
  await page.screenshot({
    path: `${artifacts}/providers-desktop.png`,
    fullPage: true,
  })
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${base}/dashboard`)
    await page.getByRole('heading', { name: 'Vista general' }).waitFor()
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    if (width === 390) {
      await click('Abrir menú')
      await page.getByRole('link', { name: 'Proveedores', exact: true }).click()
      await page
        .getByRole('heading', { name: 'Proveedores', exact: true })
        .waitFor()
    }
    await page.screenshot({
      path: `${artifacts}/responsive-${width}.png`,
      fullPage: true,
    })
    check(`responsive ${width}px without page overflow`)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  if (credentials.E2E_PROVIDER_EMAIL && credentials.E2E_PROVIDER_PASSWORD) {
    await logout()
    await login(
      credentials.E2E_PROVIDER_EMAIL,
      credentials.E2E_PROVIDER_PASSWORD,
    )
    const userId = await page.evaluate(async () => {
      const stored = sessionStorage.getItem('mandaria.refresh')
      const part = stored.split('.')[1]
      return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))).sub
    })
    await logout()
    await login(email, password)
    await page.goto(`${base}/providers/${providerId}`)
    await page.getByLabel('ID del usuario').fill(userId)
    await click('Asociar administrador')
    await page
      .getByText(credentials.E2E_PROVIDER_EMAIL, { exact: true })
      .waitFor()
    await logout()
    await login(
      credentials.E2E_PROVIDER_EMAIL,
      credentials.E2E_PROVIDER_PASSWORD,
    )
    await page.goto(`${base}/provider/profile`)
    await page
      .getByRole('heading', { name: 'Mi proveedor', exact: true })
      .waitFor()
    assert.equal(
      await page
        .getByRole('link', { name: 'Integraciones', exact: true })
        .count(),
      0,
    )
    await page.goto(`${base}/integrations`)
    await page.getByRole('heading', { name: 'Sin permisos' }).waitFor()
    check('real PROVIDER_ADMIN login, membership and URL authorization')
  } else {
    checks.push(
      'PENDING real PROVIDER_ADMIN: no account credentials configured',
    )
    console.log('PENDING PROVIDER_ADMIN real account')
  }
  await logout()
  check('logout and protected route')
  await page.goto(`${base}/integrations`)
  await page.waitForURL('**/login')
  assert.equal(errors.length, 0)
  check('browser console without errors')
  writeFileSync(
    `${artifacts}/report.json`,
    JSON.stringify(
      {
        checks,
        integrationId,
        providerId,
        note: 'Test records retained because the API has no delete endpoint. Credentials revoked. No secrets stored in artifacts.',
      },
      null,
      2,
    ),
  )
} catch (error) {
  // Locator errors can include DOM content; report a generic failure while keeping secrets out of logs.
  console.error(
    'Browser verification failed at step',
    checks.length + 1,
    error instanceof Error ? error.name : 'unknown',
  )
  console.error(
    'Failed operation:',
    error instanceof Error
      ? error.message
          .split('\n')[0]
          .replace(/[A-Za-z0-9_-]{35,}/g, '[redacted]')
      : 'unknown',
  )
  await page
    .screenshot({
      path: `${artifacts}/failure-masked.png`,
      fullPage: true,
      mask: [page.locator('input'), page.locator('textarea')],
    })
    .catch(() => undefined)
  writeFileSync(
    `${artifacts}/report.json`,
    JSON.stringify(
      { checks, failedAfter: checks.at(-1), integrationId, providerId },
      null,
      2,
    ),
  )
  process.exitCode = 1
} finally {
  await browser.close()
}
