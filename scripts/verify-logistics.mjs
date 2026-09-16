import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Local integration test: real human login, real API and existing local memberships.
// V1.6.1: Repartidores also renders the driver invitations table; the drivers table is first.
// No role/storage mocks, traces, HAR, storageState or sensitive response dumps.
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
const accounts = {
  admin: {
    email: env.E2E_ADMIN_EMAIL || env.BOOTSTRAP_ADMIN_EMAIL,
    password: env.E2E_ADMIN_PASSWORD || env.BOOTSTRAP_ADMIN_PASSWORD,
  },
  a: {
    email: env.E2E_PROVIDER_EMAIL || 'provider-admin-a@mandaria.local',
    password: env.E2E_PROVIDER_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  b: {
    email: env.E2E_PROVIDER_B_EMAIL || 'provider-admin-b@mandaria.local',
    password: env.E2E_PROVIDER_B_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  none: {
    email:
      env.E2E_UNASSIGNED_EMAIL ||
      'provider-admin-sin-membership@mandaria.local',
    password: env.E2E_UNASSIGNED_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
}
if (Object.values(accounts).some((a) => !a.email || !a.password))
  throw new Error('Configure real local accounts. No credentials were printed.')
const sensitive = new Set(
  Object.entries(env)
    .filter(([k, v]) => /SECRET|PASSWORD/.test(k) && v.length > 8)
    .map(([, v]) => v),
)
const output = 'test-results/logistics'
mkdirSync(output, { recursive: true })
const report = {
  checks: [],
  failures: [],
  mutations: [],
  expectedHttpErrors: 0,
}
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
async function session() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const state = {
    page,
    context,
    auth: null,
    pending: [],
    console: [],
    requests: [],
  }
  sessions.push(state)
  page.on('pageerror', () => report.failures.push('Uncaught browser exception'))
  page.on('console', (msg) =>
    state.console.push({ type: msg.type(), text: msg.text() }),
  )
  page.on('request', (req) => {
    state.requests.push(req.url())
    if ([...sensitive].some((v) => req.url().includes(v)))
      report.failures.push('Sensitive URL')
  })
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
// Pace real reloads below the backend limit of 20 refreshes per minute.
async function visit(state, address) {
  await new Promise((resolve) => setTimeout(resolve, 3500))
  await state.page.goto(address)
}
async function login(state, who) {
  await visit(state, `${web}/login`)
  await state.page.getByLabel('Correo electrónico').fill(accounts[who].email)
  await state.page
    .getByLabel('Contraseña', { exact: true })
    .fill(accounts[who].password)
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
  return response.status === 204 ? null : response.json()
}
const url = (kind, provider, id) =>
  `${web}/${kind}${id ? `/${id}` : ''}?providerId=${provider.id}`
async function openDriver(state, provider, driver) {
  await visit(state, url('drivers', provider, driver.id))
  await expect(
    state.page.getByRole('heading', { name: driver.name, exact: true }),
  ).toBeVisible()
}
async function openVehicle(state, provider, vehicle) {
  await visit(state, url('vehicles', provider, vehicle.id))
  await expect(
    state.page.getByRole('heading', { name: vehicle.identifier, exact: true }),
  ).toBeVisible()
}
async function unassign(state, provider, driver) {
  await openDriver(state, provider, driver)
  const button = state.page.getByRole('button', {
    name: 'Desasignar',
    exact: true,
  })
  if (await button.count()) {
    await button.click()
    const dialog = state.page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Desasignar' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(
      state.page.getByText('Sin vehículo', { exact: true }),
    ).toBeVisible()
  }
}
async function assign(state, provider, driver, vehicle) {
  await openDriver(state, provider, driver)
  await state.page
    .getByRole('button', { name: 'Asignar vehículo', exact: true })
    .click()
  await state.page
    .getByLabel('Seleccionar vehículo', { exact: true })
    .selectOption(vehicle.id)
  await state.page.getByRole('button', { name: 'Asignar', exact: true }).click()
  await expect(state.page.getByRole('dialog')).not.toBeVisible()
  await expect(
    state.page.getByRole('button', { name: 'Desasignar', exact: true }),
  ).toBeVisible()
}
async function changeVehicle(state, provider, vehicle, status) {
  await openVehicle(state, provider, vehicle)
  await state.page.getByLabel('Cambiar estado').selectOption(status)
  await state.page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar' })
    .click()
  await expect(state.page.getByRole('dialog')).not.toBeVisible()
}
async function audit(state) {
  const data = await state.page.evaluate(async () => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    databases: await indexedDB.databases(),
  }))
  assert.deepEqual(data.local, {})
  assert.equal(data.databases.length, 0)
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
    assert.ok(!stored.includes(value))
    assert.ok(state.console.every((c) => !c.text.includes(value)))
  }
  const errors = state.console.filter((c) => c.type === 'error')
  assert.ok(
    errors.every((c) =>
      /Failed to load resource.*(?:401|403|404|409)/.test(c.text),
    ),
    'Unexpected console error',
  )
  report.expectedHttpErrors += errors.length
  state.console = []
}
async function logout(state) {
  await state.page.getByRole('button', { name: /@/ }).click()
  await state.page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await state.page.waitForURL('**/login')
  assert.equal(await state.page.evaluate(() => sessionStorage.length), 0)
  state.auth = null
}
try {
  begin('Real admin login and V1.3 navigation regression')
  const admin = await session()
  await login(admin, 'admin')
  await expect(
    admin.page.getByRole('heading', { name: 'Proveedores recientes' }),
  ).toBeVisible()
  for (const [name, heading] of [
    ['Integraciones', 'Clientes B2B'],
    ['Proveedores', 'Tu red logística'],
  ]) {
    await admin.page.getByRole('link', { name, exact: true }).click()
    await expect(
      admin.page.getByRole('heading', { name: heading }),
    ).toBeVisible()
  }
  const providerPage = await request(admin, '/admin/providers?pageSize=100')
  const providerA = providerPage.items.find(
    (p) => p.code === 'LOCAL_RAPIDOS_COITA',
  )
  const providerB = providerPage.items.find(
    (p) => p.code === 'LOCAL_MANDADOS_CENTRO',
  )
  let independent = providerPage.items.find(
    (p) => p.type === 'INDEPENDENT' && p.code.startsWith('WEB_'),
  )
  assert.ok(
    providerA && providerB && independent,
    'Existing local providers required',
  )
  const people = await request(admin, '/users')
  const luis = people.find(
    (u) => u.email === 'driver-luis@mandaria.local' && u.role === 'DRIVER',
  )
  assert.ok(luis, 'Existing local Luis DRIVER account required')
  // Other suites create new WEB_ INDEPENDENT providers; a User has one Driver profile, so
  // reuse the independent provider that already holds Luis instead of the newest one.
  for (const candidate of providerPage.items.filter(
    (p) => p.type === 'INDEPENDENT' && p.code.startsWith('WEB_'),
  )) {
    const found = await request(
      admin,
      `/admin/providers/${candidate.id}/drivers`,
    )
    if (found.items.some((d) => d.userId === luis.id)) {
      independent = candidate
      break
    }
  }
  pass()

  begin('Real Admin A: own drivers, vehicles, filters, reload and limits')
  const a = await session()
  await login(a, 'a')
  await expect(
    a.page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link'),
  ).toHaveText([
    'Dashboard',
    'Mi proveedor',
    'Repartidores',
    'Vehículos',
    'Mi perfil',
  ])
  const listA = await request(a, '/provider/drivers')
  const vehiclesA = await request(a, '/provider/vehicles')
  const carlos = listA.items.find((d) => d.name === 'Carlos')
  const pedro = listA.items.find((d) => d.name === 'Pedro')
  const jose = listA.items.find((d) => d.name === 'José')
  const moto1 = vehiclesA.items.find((v) => v.identifier === 'MOTO-01')
  const moto2 = vehiclesA.items.find((v) => v.identifier === 'MOTO-02')
  const bici = vehiclesA.items.find((v) => v.identifier === 'BICI-01')
  assert.ok(carlos && pedro && jose && moto1 && moto2 && bici)
  await visit(a, url('drivers', providerA))
  await expect(a.page.getByRole('table').first()).toContainText('Carlos')
  await expect(
    a.page.getByRole('button', { name: 'Nuevo repartidor' }),
  ).toBeDisabled()
  await a.page.getByLabel('Buscar', { exact: true }).fill('Carlos')
  await a.page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(a.page.getByRole('table').first().getByRole('row')).toHaveCount(
    2,
  )
  await a.page.getByLabel('Filtrar por disponibilidad').selectOption('OFFLINE')
  await expect(a.page.getByRole('table').first()).toContainText('Desconectado')
  const oldRefresh = a.auth.refreshToken
  await a.page.reload()
  await expect(a.page.getByRole('table').first()).toContainText('Carlos')
  await Promise.all(a.pending)
  assert.notEqual(a.auth.refreshToken, oldRefresh)
  await visit(a, url('vehicles', providerA))
  await expect(
    a.page.getByRole('button', { name: 'Nuevo vehículo' }),
  ).toBeDisabled()
  await a.page.getByLabel('Filtrar por tipo').selectOption('BICYCLE')
  await expect(a.page.getByRole('table').first()).toContainText('Sin placa')
  await expect(a.page.getByRole('table').first().getByRole('row')).toHaveCount(
    2,
  )
  for (const kind of ['drivers', 'vehicles']) {
    await visit(a, url(kind, providerA, 'new'))
    await expect(
      a.page.getByRole('heading', { name: 'Límite alcanzado' }),
    ).toBeVisible()
  }
  await request(
    a,
    '/provider/drivers',
    'POST',
    { userId: luis.id, name: 'Limit probe' },
    409,
  )
  await request(
    a,
    '/provider/vehicles',
    'POST',
    { identifier: 'LIMIT-PROBE-V14B', type: 'BICYCLE' },
    409,
  )
  pass()

  begin('Assign, unassign, reassign and history with real fleet resources')
  await unassign(a, providerA, carlos)
  await unassign(a, providerA, pedro)
  await assign(a, providerA, carlos, moto1)
  await unassign(a, providerA, carlos)
  await assign(a, providerA, carlos, moto2)
  await unassign(a, providerA, carlos)
  await expect(
    a.page.getByRole('heading', { name: 'Historial de asignaciones' }),
  ).toBeVisible()
  const history = await request(a, `/provider/drivers/${carlos.id}/assignments`)
  assert.ok(history.items.some((h) => h.unassignedAt))
  pass()

  begin(
    'Maintenance, inactive, suspended, occupied and cross-provider assignment errors',
  )
  await changeVehicle(a, providerA, moto1, 'MAINTENANCE')
  await openDriver(a, providerA, carlos)
  await a.page.getByRole('button', { name: 'Asignar vehículo' }).click()
  await expect(
    a.page
      .getByLabel('Seleccionar vehículo', { exact: true })
      .locator(`option[value="${moto1.id}"]`),
  ).toHaveCount(0)
  await a.page.getByRole('button', { name: 'Cerrar diálogo' }).click()
  await request(
    a,
    `/provider/drivers/${carlos.id}/vehicle`,
    'POST',
    { vehicleId: moto1.id },
    409,
  )
  for (const status of ['INACTIVE', 'SUSPENDED']) {
    await changeVehicle(a, providerA, moto1, status)
    await request(
      a,
      `/provider/drivers/${carlos.id}/vehicle`,
      'POST',
      { vehicleId: moto1.id },
      409,
    )
  }
  await changeVehicle(a, providerA, moto1, 'ACTIVE')
  await openDriver(a, providerA, carlos)
  await a.page.getByRole('button', { name: 'Suspender repartidor' }).click()
  await a.page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar' })
    .click()
  await expect(
    a.page.getByRole('button', { name: 'Asignar vehículo' }),
  ).toBeDisabled()
  await request(
    a,
    `/provider/drivers/${carlos.id}/vehicle`,
    'POST',
    { vehicleId: moto1.id },
    409,
  )
  await a.page.getByRole('button', { name: 'Activar repartidor' }).click()
  await a.page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar' })
    .click()
  await expect(a.page.getByRole('dialog')).not.toBeVisible()
  await request(
    a,
    `/provider/drivers/${carlos.id}/vehicle`,
    'POST',
    { vehicleId: bici.id },
    409,
  )
  // Real concurrent state change after opening the selector exercises the visible 409 handler.
  await a.page.getByRole('button', { name: 'Asignar vehículo' }).click()
  await a.page
    .getByLabel('Seleccionar vehículo', { exact: true })
    .selectOption(moto1.id)
  await request(
    admin,
    `/admin/providers/${providerA.id}/vehicles/${moto1.id}`,
    'PATCH',
    { status: 'MAINTENANCE' },
  )
  await a.page.getByRole('button', { name: 'Asignar', exact: true }).click()
  await expect(a.page.getByRole('dialog').getByRole('alert')).toContainText(
    'El vehículo debe estar activo',
  )
  await a.page.getByRole('button', { name: 'Cerrar diálogo' }).click()
  await changeVehicle(a, providerA, moto1, 'ACTIVE')
  await assign(a, providerA, carlos, moto1)
  await assign(a, providerA, pedro, moto2)
  await request(
    a,
    `/provider/drivers/${carlos.id}/vehicle`,
    'POST',
    { vehicleId: moto2.id },
    409,
  )
  const bVehicles = await request(
    admin,
    `/admin/providers/${providerB.id}/vehicles`,
  )
  await request(
    a,
    `/provider/drivers/${carlos.id}/vehicle`,
    'POST',
    { vehicleId: bVehicles.items[0].id },
    404,
  )
  report.mutations.push(
    'Fleet states ACTIVE; Carlos → MOTO-01, Pedro → MOTO-02, José → BICI-01; history retained',
  )
  pass()

  begin('Bidirectional Admin A/B isolation in UI and backend')
  const b = await session()
  await login(b, 'b')
  for (const [state, own, foreign] of [
    [a, providerA, providerB],
    [b, providerB, providerA],
  ]) {
    for (const kind of ['drivers', 'vehicles']) {
      await visit(state, url(kind, own))
      await expect(state.page.getByRole('table').first()).toBeVisible()
      const ownData = await request(
        state,
        `/provider/${kind}?providerId=${own.id}`,
      )
      assert.ok(ownData.items.every((item) => item.providerId === own.id))
      await visit(state, url(kind, foreign))
      await expect(state.page.getByText('403 — Sin permisos')).toBeVisible()
      await expect(state.page.getByRole('table')).toHaveCount(0)
      await request(
        state,
        `/provider/${kind}?providerId=${foreign.id}`,
        'GET',
        undefined,
        403,
      )
      await request(
        state,
        `/provider/${kind}?providerId=${foreign.id}`,
        'POST',
        {},
        403,
      )
      const foreignData = await request(
        admin,
        `/admin/providers/${foreign.id}/${kind}`,
      )
      await visit(state, url(kind, own, foreignData.items[0].id))
      await expect(state.page.getByRole('alert')).toContainText(
        'no está disponible en este proveedor',
      )
      await request(
        state,
        `/provider/${kind}/${foreignData.items[0].id}?providerId=${own.id}`,
        'GET',
        undefined,
        404,
      )
    }
    for (const route of ['/integrations', '/providers', '/users']) {
      await visit(state, web + route)
      await expect(
        state.page.getByRole('heading', { name: 'Sin permisos' }),
      ).toBeVisible()
    }
    await request(state, '/admin/integrations', 'GET', undefined, 403)
    await request(state, '/admin/providers', 'GET', undefined, 403)
  }
  pass()

  begin('No membership remains empty with no logistics data')
  const none = await session()
  await login(none, 'none')
  for (const route of [
    '/drivers',
    '/vehicles',
    `/drivers?providerId=${providerA.id}`,
    `/vehicles?providerId=${providerB.id}`,
  ]) {
    await visit(none, web + route)
    await expect(
      none.page.getByText('Aún no tienes un proveedor asociado'),
    ).toBeVisible()
    await expect(none.page.getByRole('table')).toHaveCount(0)
  }
  await request(none, '/provider/drivers', 'GET', undefined, 403)
  await request(none, '/provider/vehicles', 'GET', undefined, 403)
  pass()

  begin(
    'Real INDEPENDENT create driver and bicycle without plate, detail and assignment',
  )
  let independentDrivers = await request(
    admin,
    `/admin/providers/${independent.id}/drivers`,
  )
  let independentDriver = independentDrivers.items.find(
    (d) => d.userId === luis.id,
  )
  if (!independentDriver) {
    await visit(admin, url('drivers', independent, 'new'))
    await admin.page.getByLabel('Nombre operativo').fill('Luis')
    await admin.page.getByLabel('ID del usuario').fill(luis.id)
    await admin.page.getByRole('button', { name: 'Crear repartidor' }).click()
    await expect(
      admin.page.getByRole('heading', { name: 'Luis', exact: true }),
    ).toBeVisible()
    independentDrivers = await request(
      admin,
      `/admin/providers/${independent.id}/drivers`,
    )
    independentDriver = independentDrivers.items.find(
      (d) => d.userId === luis.id,
    )
    report.mutations.push(
      'Created Luis Driver in existing INDEPENDENT provider',
    )
  }
  let independentVehicles = await request(
    admin,
    `/admin/providers/${independent.id}/vehicles`,
  )
  let independentVehicle = independentVehicles.items.find(
    (v) => v.identifier === 'BICI-V14B',
  )
  if (!independentVehicle) {
    await visit(admin, url('vehicles', independent, 'new'))
    await admin.page.getByLabel('Identificador').fill('BICI-V14B')
    await admin.page.getByLabel('Tipo', { exact: true }).selectOption('BICYCLE')
    await admin.page.getByRole('button', { name: 'Crear vehículo' }).click()
    await expect(
      admin.page.getByRole('heading', { name: 'BICI-V14B', exact: true }),
    ).toBeVisible()
    independentVehicles = await request(
      admin,
      `/admin/providers/${independent.id}/vehicles`,
    )
    independentVehicle = independentVehicles.items.find(
      (v) => v.identifier === 'BICI-V14B',
    )
    report.mutations.push(
      'Created BICI-V14B without plate in INDEPENDENT provider',
    )
  }
  assert.equal(independentVehicle.plate, null)
  await openDriver(admin, independent, independentDriver)
  if (independentDriver.status !== 'ACTIVE') {
    await admin.page.getByRole('button', { name: 'Activar repartidor' }).click()
    await admin.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar' })
      .click()
    await expect(admin.page.getByRole('dialog')).not.toBeVisible()
  }
  await unassign(admin, independent, independentDriver)
  await assign(admin, independent, independentDriver, independentVehicle)
  await openVehicle(admin, independent, independentVehicle)
  await expect(
    admin.page.getByRole('link', { name: 'Luis', exact: true }).first(),
  ).toBeVisible()
  pass()

  begin('Responsive desktop/tablet/mobile, browser storage and console')
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await a.page.setViewportSize({ width, height })
    for (const kind of ['drivers', 'vehicles']) {
      await visit(a, url(kind, providerA))
      await expect(a.page.getByRole('table').first()).toBeVisible()
      assert.ok(
        await a.page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `Overflow ${kind} at ${width}`,
      )
      await a.page.screenshot({
        path: `${output}/${kind}-${width}.png`,
        fullPage: true,
      })
    }
    if (width === 390) {
      await a.page.getByRole('button', { name: 'Abrir menú' }).click()
      await expect(
        a.page
          .getByRole('navigation')
          .getByRole('link', { name: 'Repartidores' }),
      ).toBeVisible()
      await a.page.getByRole('button', { name: 'Cerrar menú' }).click()
    }
  }
  for (const state of sessions) await audit(state)
  pass()

  begin(
    'Revoked refresh expires session; logout/login and identity remain correct',
  )
  await Promise.all(a.pending)
  await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: a.auth.refreshToken }),
  })
  await a.page.reload()
  await a.page.waitForURL('**/login')
  await expect(
    a.page.getByText('Tu sesión expiró. Inicia sesión nuevamente.'),
  ).toBeVisible()
  assert.equal(await a.page.evaluate(() => sessionStorage.length), 0)
  await a.page.setViewportSize({ width: 1440, height: 1000 })
  await login(a, 'a')
  await expect(
    a.page.getByRole('heading', { name: providerA.name, exact: true }),
  ).toBeVisible()
  for (const state of sessions) {
    await audit(state)
    await logout(state)
  }
  pass()
  assert.deepEqual(report.failures, [])
} catch (error) {
  report.failures.push(phase)
  console.error(
    `FAIL ${phase}: ${error instanceof Error ? error.name : 'Error'}`,
  )
  // Assertion messages can contain page text; only persist redacted diagnostics.
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
