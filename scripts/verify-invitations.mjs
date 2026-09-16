import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// Local V1.6.1-B validation: real invitations, emails captured by the backend local_outbox
// provider (MAIL_PROVIDER=local_outbox), real activation and login. Creates invited accounts
// with unique web161-* emails; never changes provider limits. Tokens and generated passwords
// are never printed, stored in reports or screenshots. No traces, HAR or storageState.
const env = {
  ...(process.env.MANDARIA_BACKEND_ENV
    ? parseEnv(readFileSync(process.env.MANDARIA_BACKEND_ENV, 'utf8'))
    : {}),
  ...(existsSync('.env.e2e') ? parseEnv(readFileSync('.env.e2e', 'utf8')) : {}),
  ...process.env,
}
const web = env.E2E_WEB_URL || 'http://localhost:5173'
const base = `${env.E2E_API_URL || 'http://localhost:3000'}/api/v1`
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error(
    'This mutating validation is restricted to the local backend.',
  )
const outbox = env.E2E_MAIL_OUTBOX_DIR
if (!outbox || !existsSync(outbox))
  throw new Error(
    'Start the backend with MAIL_PROVIDER=local_outbox and set E2E_MAIL_OUTBOX_DIR to its LOCAL_MAIL_OUTBOX_DIR.',
  )
const accounts = {
  admin: {
    email: env.E2E_ADMIN_EMAIL || env.BOOTSTRAP_ADMIN_EMAIL,
    password: env.E2E_ADMIN_PASSWORD || env.BOOTSTRAP_ADMIN_PASSWORD,
  },
  providerA: {
    email: env.E2E_PROVIDER_EMAIL || 'provider-admin-a@mandaria.local',
    password: env.E2E_PROVIDER_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
}
if (Object.values(accounts).some((a) => !a.email || !a.password))
  throw new Error('Configure real local accounts. No credentials were printed.')
const tag = Date.now().toString(36)
const newPassword = () => `web161 ${randomBytes(12).toString('base64url')}`
const invited = {
  providerAdmin: {
    email: `web161-pa-${tag}@mandaria.local`,
    password: newPassword(),
  },
  driver: {
    email: `web161-driver-${tag}@mandaria.local`,
    password: newPassword(),
  },
  revoked: { email: `web161-revoked-${tag}@mandaria.local` },
}
const sensitive = new Set(
  [
    ...Object.entries(env)
      .filter(([k, v]) => /SECRET|PASSWORD|KEY|TOKEN/.test(k) && v.length > 8)
      .map(([, v]) => v),
    invited.providerAdmin.password,
    invited.driver.password,
  ].filter(Boolean),
)
const output = 'test-results/invitations'
mkdirSync(output, { recursive: true })
const report = { checks: [], failures: [], mutations: [] }
const browser = await chromium.launch(
  env.E2E_BROWSER_CHANNEL ? { channel: env.E2E_BROWSER_CHANNEL } : {},
)
const sessions = []
let phase = 'startup'
function begin(name) {
  phase = name
  console.log(`CHECK ${name}`)
}
function pass() {
  report.checks.push(phase)
  console.log(`PASS ${phase}`)
}
async function session(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const state = { page, auth: null, pending: [], console: [], requests: [] }
  sessions.push(state)
  page.on('pageerror', () => report.failures.push('Uncaught browser exception'))
  page.on('console', (msg) =>
    state.console.push({ type: msg.type(), text: msg.text() }),
  )
  page.on('request', (req) => state.requests.push(req.url()))
  page.on('response', (response) => {
    if (/\/auth\/(login|refresh)$/.test(response.url()) && response.ok())
      state.pending.push(
        response.json().then((tokens) => {
          state.auth = tokens
          sensitive.add(tokens.accessToken)
          sensitive.add(tokens.refreshToken)
        }),
      )
  })
  return state
}
// Pace real navigations below the backend refresh limit.
async function visit(state, address) {
  await new Promise((resolve) => setTimeout(resolve, 3500))
  await state.page.goto(address)
}
async function login(state, credentials) {
  await visit(state, `${web}/login`)
  await state.page.getByLabel('Correo electrónico').fill(credentials.email)
  await state.page
    .getByLabel('Contraseña', { exact: true })
    .fill(credentials.password)
  await state.page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await state.page.waitForURL('**/dashboard')
  await Promise.all(state.pending)
  assert.ok(state.auth)
}
async function request(state, path, method = 'GET', body, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${state.auth.accessToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  assert.equal(
    response.status,
    expected,
    `${method} ${path.split('?')[0]} returned unexpected status`,
  )
  return response.json().catch(() => null)
}
/** Latest activation link emailed to this address, read from the local outbox. */
function activationLink(email, after = 0) {
  const mails = readdirSync(outbox)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(join(outbox, name), 'utf8')))
    .filter((mail) => mail.to === email && Date.parse(mail.createdAt) >= after)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const mail = mails.at(-1)
  assert.ok(mail, 'Invitation email not found in the local outbox')
  const link = new URL(mail.activationUrl)
  sensitive.add(link.searchParams.get('token'))
  return `${web}/activate-account${link.search}`
}
const nav = (state) =>
  state.page.getByRole('navigation', { name: 'Navegación principal' })
const dialog = (state) => state.page.getByRole('dialog')
async function noHorizontalOverflow(state) {
  const overflow = await state.page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  assert.ok(overflow <= 1, `Page overflows horizontally by ${overflow}px`)
}
async function noSecretsOnPage(state) {
  const text = await state.page.locator('body').innerText()
  for (const value of sensitive)
    assert.ok(!text.includes(value), 'Secret value rendered in the page')
  assert.ok(!/passwordHash|tokenHash/.test(text), 'Hash field rendered')
}
async function audit(state) {
  const data = await state.page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }))
  assert.deepEqual(data.local, {})
  assert.ok(
    Object.keys(data.session).every((key) => key === 'mandaria.refresh'),
  )
  const stored = JSON.stringify({
    ...data,
    session: Object.fromEntries(
      Object.entries(data.session).filter(([k]) => k !== 'mandaria.refresh'),
    ),
  })
  for (const value of sensitive) {
    assert.ok(!stored.includes(value), 'Secret persisted in browser storage')
    assert.ok(
      state.console.every((c) => !c.text.includes(value)),
      'Secret printed to console',
    )
    // The emailed link necessarily carries the token on first load; API calls never may.
    assert.ok(
      state.requests
        .filter((url) => url.startsWith(base))
        .every((url) => !url.includes(value)),
      'Secret sent in an API URL',
    )
  }
  const errors = state.console.filter((c) => c.type === 'error')
  assert.ok(
    errors.every((c) =>
      /Failed to load resource.*(?:400|401|403|404|409|410|429)/.test(c.text),
    ),
    'Unexpected console error',
  )
  state.console = []
}
async function activate(state, link, password) {
  await visit(state, link)
  await expect(
    state.page.getByRole('heading', { name: 'Crea tu contraseña' }),
  ).toBeVisible()
  await expect.poll(() => new URL(state.page.url()).search).toBe('')
  await state.page.getByLabel('Crear contraseña').fill(password)
  await state.page.getByLabel('Confirmar contraseña').fill(password)
  await state.page.getByRole('button', { name: 'Activar cuenta' }).click()
  await expect(
    state.page.getByRole('heading', { name: 'Cuenta activada correctamente.' }),
  ).toBeVisible()
}
async function logout(state) {
  await state.page.getByRole('button', { name: /@/ }).click()
  await state.page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await state.page.waitForURL('**/login')
  state.auth = null
}

try {
  begin('SUPER_ADMIN login and V1.6 navigation regression')
  const admin = await session()
  await login(admin, accounts.admin)
  for (const [name, path] of [
    ['Integraciones', '/integrations'],
    ['Proveedores', '/providers'],
    ['Administradores', '/users'],
    ['Invitaciones', '/invitations'],
    ['Repartidores', '/drivers'],
    ['Vehículos', '/vehicles'],
    ['Solicitudes', '/delivery-requests'],
    ['Cotizaciones', '/delivery-quotes'],
    ['Zonas de servicio', '/service-zones'],
    ['Dashboard', '/dashboard'],
  ]) {
    await nav(admin).getByRole('link', { name, exact: true }).click()
    await admin.page.waitForURL(`**${path}`)
    await expect(
      admin.page.getByRole('heading', { level: 1 }).first(),
    ).toBeVisible()
    await expect(
      admin.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toHaveCount(0)
  }
  const providerPage = await request(admin, '/admin/providers?pageSize=100')
  const providerA = providerPage.items.find(
    (p) => p.code === 'LOCAL_RAPIDOS_COITA',
  )
  const providerB = providerPage.items.find(
    (p) => p.code === 'LOCAL_MANDADOS_CENTRO',
  )
  assert.ok(providerA && providerB, 'Local providers A and B required')
  const zones = await request(admin, '/admin/service-zones?pageSize=1')
  if (zones.items?.[0]) {
    await visit(admin, `${web}/service-zones/${zones.items[0].id}`)
    await expect(admin.page.getByRole('heading', { level: 1 })).toBeVisible()
    const plans = admin.page.getByRole('link', { name: /Ver|versión|tarifa/i })
    if (await plans.count()) {
      await plans.first().click()
      await expect(admin.page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  }
  pass()

  begin('SUPER_ADMIN invites a PROVIDER_ADMIN from Administradores')
  await visit(admin, `${web}/users`)
  await expect(admin.page.getByRole('table')).toContainText(/Activo/)
  await admin.page
    .getByRole('button', { name: 'Invitar administrador' })
    .click()
  await expect(
    dialog(admin).getByRole('option', { name: /SUPER|Superadmin/i }),
  ).toHaveCount(0)
  await dialog(admin)
    .getByLabel('Correo electrónico')
    .fill(invited.providerAdmin.email)
  await dialog(admin).getByLabel('Buscar proveedor').fill(providerB.code)
  await expect(
    dialog(admin)
      .getByLabel('Proveedor', { exact: true })
      .locator(`option[value="${providerB.id}"]`),
  ).toHaveCount(1)
  await dialog(admin)
    .getByLabel('Proveedor', { exact: true })
    .selectOption(providerB.id)
  await dialog(admin).getByRole('button', { name: 'Enviar invitación' }).click()
  await expect(
    admin.page.getByText(
      `Invitación enviada a ${invited.providerAdmin.email}.`,
    ),
  ).toBeVisible()
  report.mutations.push('invite PROVIDER_ADMIN to provider B')
  await admin.page
    .getByRole('button', { name: 'Invitar administrador' })
    .click()
  await dialog(admin)
    .getByLabel('Correo electrónico')
    .fill(invited.providerAdmin.email)
  await dialog(admin).getByLabel('Buscar proveedor').fill(providerB.code)
  await expect(
    dialog(admin)
      .getByLabel('Proveedor', { exact: true })
      .locator(`option[value="${providerB.id}"]`),
  ).toHaveCount(1)
  await dialog(admin)
    .getByLabel('Proveedor', { exact: true })
    .selectOption(providerB.id)
  await dialog(admin).getByRole('button', { name: 'Enviar invitación' }).click()
  await expect(dialog(admin).getByRole('alert')).toContainText(
    'Ya existe una invitación pendiente',
  )
  await dialog(admin).getByRole('button', { name: 'Volver' }).click()
  await admin.page
    .getByLabel('Filtrar por estado de cuenta')
    .selectOption('INVITED')
  await expect(admin.page.getByRole('table')).toContainText(
    invited.providerAdmin.email,
  )
  await expect(admin.page.getByRole('table')).toContainText(
    'Invitación pendiente',
  )
  pass()

  begin('Invitation list, resend cooldown (429) and provider detail')
  await visit(admin, `${web}/invitations`)
  await admin.page
    .getByLabel('Buscar invitación por correo')
    .fill(invited.providerAdmin.email)
  await admin.page.getByRole('button', { name: 'Buscar invitaciones' }).click()
  const row = admin.page.getByRole('row', {
    name: new RegExp(invited.providerAdmin.email),
  })
  await expect(row).toContainText('Invitación pendiente')
  await expect(row).toContainText(providerB.name)
  await row.getByRole('button', { name: /Reenviar invitación/ }).click()
  await dialog(admin)
    .getByRole('button', { name: 'Reenviar invitación' })
    .click()
  await expect(dialog(admin).getByRole('alert')).toContainText(
    'Espera un momento antes de reenviarla',
  )
  await dialog(admin).getByRole('button', { name: 'Cancelar' }).click()
  await noSecretsOnPage(admin)
  await visit(admin, `${web}/providers/${providerB.id}`)
  await expect(
    admin.page.getByRole('region', { name: 'Invitaciones del proveedor' }),
  ).toContainText(invited.providerAdmin.email)
  pass()

  begin('SUPER_ADMIN invites a DRIVER to provider B and revokes it')
  await visit(admin, `${web}/drivers?providerId=${providerB.id}`)
  await admin.page.getByRole('button', { name: 'Invitar repartidor' }).click()
  await dialog(admin)
    .getByLabel('Correo electrónico')
    .fill(invited.revoked.email)
  await dialog(admin).getByLabel('Nombre operativo').fill('Web161 Revocado')
  await dialog(admin).getByRole('button', { name: 'Enviar invitación' }).click()
  await expect(
    admin.page.getByText(`Invitación enviada a ${invited.revoked.email}.`),
  ).toBeVisible()
  report.mutations.push('invite DRIVER to provider B (revoked)')
  const revokedLink = activationLink(invited.revoked.email)
  const driverPanel = admin.page.getByRole('region', {
    name: 'Invitaciones de repartidores',
  })
  await driverPanel
    .getByRole('button', {
      name: `Revocar invitación de ${invited.revoked.email}`,
    })
    .click()
  await dialog(admin)
    .getByRole('button', { name: 'Revocar invitación' })
    .click()
  await expect(
    admin.page.getByText('Invitación revocada correctamente.'),
  ).toBeVisible()
  await expect(
    driverPanel.getByRole('row', { name: new RegExp(invited.revoked.email) }),
  ).toContainText('Revocada')
  pass()

  begin('Activation page: invalid, revoked, mismatch, success and reused link')
  const guest = await session({ width: 390, height: 844 })
  await visit(guest, `${web}/activate-account?token=not-a-real-token`)
  await guest.page
    .getByLabel('Crear contraseña')
    .fill('una frase inválida pero larga')
  await guest.page
    .getByLabel('Confirmar contraseña')
    .fill('una frase inválida pero larga')
  await guest.page.getByRole('button', { name: 'Activar cuenta' }).click()
  await expect(
    guest.page.getByRole('heading', { name: 'La invitación no es válida.' }),
  ).toBeVisible()
  await visit(guest, revokedLink)
  await guest.page
    .getByLabel('Crear contraseña')
    .fill('una frase de prueba revocada')
  await guest.page
    .getByLabel('Confirmar contraseña')
    .fill('una frase de prueba revocada')
  await guest.page.getByRole('button', { name: 'Activar cuenta' }).click()
  await expect(
    guest.page.getByRole('heading', {
      name: 'Esta invitación ya no está disponible.',
    }),
  ).toBeVisible()
  const adminLink = activationLink(invited.providerAdmin.email)
  await visit(guest, adminLink)
  await guest.page
    .getByLabel('Crear contraseña')
    .fill(invited.providerAdmin.password)
  await guest.page
    .getByLabel('Confirmar contraseña')
    .fill(`${invited.providerAdmin.password}x`)
  await guest.page.getByRole('button', { name: 'Activar cuenta' }).click()
  await expect(guest.page.getByRole('alert')).toContainText(
    'Las contraseñas no coinciden.',
  )
  await noHorizontalOverflow(guest)
  await guest.page.screenshot({
    path: `${output}/activation-390.png`,
    fullPage: true,
    mask: [guest.page.locator('input')],
  })
  await activate(guest, adminLink, invited.providerAdmin.password)
  await noSecretsOnPage(guest)
  await guest.page.screenshot({
    path: `${output}/activation-success-390.png`,
    fullPage: true,
  })
  await visit(guest, adminLink)
  await guest.page
    .getByLabel('Crear contraseña')
    .fill(invited.providerAdmin.password)
  await guest.page
    .getByLabel('Confirmar contraseña')
    .fill(invited.providerAdmin.password)
  await guest.page.getByRole('button', { name: 'Activar cuenta' }).click()
  await expect(
    guest.page.getByRole('heading', {
      name: 'Esta invitación ya fue utilizada.',
    }),
  ).toBeVisible()
  report.mutations.push('activate PROVIDER_ADMIN')
  pass()

  begin('Activated PROVIDER_ADMIN: login, Mi proveedor, no admin UI')
  const pa = await session()
  await login(pa, invited.providerAdmin)
  await expect(
    nav(pa).getByRole('link', { name: 'Administradores' }),
  ).toHaveCount(0)
  await expect(nav(pa).getByRole('link', { name: 'Invitaciones' })).toHaveCount(
    0,
  )
  await nav(pa).getByRole('link', { name: 'Mi proveedor', exact: true }).click()
  await expect(pa.page.getByRole('main')).toContainText(providerB.name)
  for (const path of ['/users', '/invitations']) {
    await visit(pa, `${web}${path}`)
    await expect(
      pa.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeVisible()
  }
  assert.ok(
    pa.requests
      .filter((u) => u.startsWith(base))
      .every(
        (u) => !/\/users|\/admin\/user-invitations/.test(new URL(u).pathname),
      ),
    'Provider Admin UI called user administration endpoints',
  )
  pass()

  begin(
    'PROVIDER_ADMIN invites a DRIVER to its provider; resend rotates the link',
  )
  await visit(pa, `${web}/drivers`)
  await expect(pa.page.getByRole('main')).toContainText(providerB.name)
  await pa.page.getByRole('button', { name: 'Invitar repartidor' }).click()
  await expect(dialog(pa).getByLabel('Proveedor', { exact: true })).toHaveCount(
    0,
  )
  await dialog(pa).getByLabel('Correo electrónico').fill(invited.driver.email)
  await dialog(pa).getByLabel('Nombre operativo').fill('Web161 Repartidor')
  await dialog(pa).getByRole('button', { name: 'Enviar invitación' }).click()
  await expect(
    pa.page.getByText(`Invitación enviada a ${invited.driver.email}.`),
  ).toBeVisible()
  report.mutations.push('invite DRIVER to provider B by PROVIDER_ADMIN')
  const firstDriverLink = activationLink(invited.driver.email)
  assert.ok(
    pa.requests.some((u) => u.includes('/provider/driver-invitations')) &&
      pa.requests
        .filter((u) => u.startsWith(base))
        .every((u) => !u.includes('/admin/')),
  )
  console.log('  waiting for the backend resend cooldown (61s)')
  await new Promise((resolve) => setTimeout(resolve, 61_000))
  const resentAfter = Date.now()
  const panel = pa.page.getByRole('region', {
    name: 'Invitaciones de repartidores',
  })
  await panel
    .getByRole('button', {
      name: `Reenviar invitación a ${invited.driver.email}`,
    })
    .click()
  await dialog(pa).getByRole('button', { name: 'Reenviar invitación' }).click()
  await expect(
    pa.page.getByText('Invitación reenviada correctamente.'),
  ).toBeVisible()
  const driverLink = activationLink(invited.driver.email, resentAfter - 1000)
  assert.notEqual(driverLink, firstDriverLink)
  await noSecretsOnPage(pa)
  pass()

  begin('DRIVER activation: old link invalid, new link activates, login works')
  const driverGuest = await session()
  await visit(driverGuest, firstDriverLink)
  await driverGuest.page
    .getByLabel('Crear contraseña')
    .fill(invited.driver.password)
  await driverGuest.page
    .getByLabel('Confirmar contraseña')
    .fill(invited.driver.password)
  await driverGuest.page.getByRole('button', { name: 'Activar cuenta' }).click()
  await expect(
    driverGuest.page.getByRole('heading', {
      name: 'La invitación no es válida.',
    }),
  ).toBeVisible()
  await activate(driverGuest, driverLink, invited.driver.password)
  report.mutations.push('activate DRIVER')
  await driverGuest.page
    .getByRole('link', { name: 'Ir a iniciar sesión' })
    .click()
  await login(driverGuest, invited.driver)
  await expect(
    nav(driverGuest).getByRole('link', { name: 'Repartidores' }),
  ).toHaveCount(0)
  for (const path of ['/users', '/invitations', '/drivers']) {
    await visit(driverGuest, `${web}${path}`)
    await expect(
      driverGuest.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeVisible()
  }
  await visit(pa, `${web}/drivers`)
  await expect(pa.page.getByRole('table').first()).toContainText(
    'Web161 Repartidor',
  )
  pass()

  begin('Provider isolation and real capacity conflict for Provider Admin A')
  const a = await session()
  await login(a, accounts.providerA)
  await visit(a, `${web}/drivers`)
  await expect(a.page.getByRole('main')).toContainText(providerA.name)
  await request(
    a,
    `/provider/driver-invitations?providerId=${providerB.id}`,
    'GET',
    undefined,
    403,
  )
  await request(
    a,
    `/provider/driver-invitations?providerId=${providerB.id}`,
    'POST',
    { email: `web161-cross-${tag}@mandaria.local`, driverName: 'Cruzado' },
    403,
  )
  await request(a, '/admin/user-invitations', 'GET', undefined, 403)
  await request(
    a,
    `/provider/driver-invitations?providerId=${providerA.id}`,
    'POST',
    {
      email: `web161-a-${tag}@mandaria.local`,
      driverName: 'Sin lugar',
      role: 'PROVIDER_ADMIN',
    },
    400,
  )
  const capacity = await request(
    a,
    `/provider/capacity?providerId=${providerA.id}`,
  )
  if (capacity.drivers.count >= capacity.drivers.max) {
    await expect(
      a.page.getByRole('button', { name: 'Invitar repartidor' }),
    ).toBeDisabled()
    const conflict = await request(
      a,
      `/provider/driver-invitations?providerId=${providerA.id}`,
      'POST',
      { email: `web161-a-${tag}@mandaria.local`, driverName: 'Sin lugar' },
      409,
    )
    assert.equal(conflict.code, 'PROVIDER_DRIVER_LIMIT_REACHED')
  }
  await visit(a, `${web}/drivers?providerId=${providerB.id}`)
  await expect(a.page.getByRole('alert').first()).toBeVisible()
  await expect(a.page.getByRole('main')).not.toContainText('Web161 Repartidor')
  pass()

  begin('Responsive invitation screens and security audit')
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await admin.page.setViewportSize({ width, height })
    await visit(admin, `${web}/invitations`)
    await expect(admin.page.getByRole('table')).toBeVisible()
    await noHorizontalOverflow(admin)
    await admin.page.screenshot({
      path: `${output}/invitations-${width}.png`,
      fullPage: true,
    })
    await visit(admin, `${web}/users`)
    await expect(admin.page.getByRole('table')).toBeVisible()
    await noHorizontalOverflow(admin)
  }
  await admin.page.setViewportSize({ width: 1440, height: 1000 })
  for (const state of sessions) await audit(state)
  pass()

  begin('Logout')
  for (const state of sessions) if (state.auth) await logout(state)
  pass()
  assert.deepEqual(report.failures, [])
} catch (error) {
  report.failures.push(phase)
  console.error(
    `FAIL ${phase}: ${error instanceof Error ? error.name : 'Error'}`,
  )
  let message = error instanceof Error ? error.message : 'Unknown failure'
  for (const value of sensitive)
    message = message.replaceAll(value, '[REDACTED]')
  writeFileSync(`${output}/failure.txt`, message)
  for (const [i, state] of sessions.entries())
    await state.page
      .screenshot({
        path: `${output}/failure-${i}.png`,
        fullPage: true,
        mask: [state.page.locator('input')],
      })
      .catch(() => undefined)
  process.exitCode = 1
} finally {
  for (const state of sessions) {
    await Promise.all(state.pending)
    if (state.auth?.refreshToken)
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.auth.refreshToken }),
      }).catch(() => undefined)
  }
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
