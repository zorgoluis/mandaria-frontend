import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Local V1.5-B validation: real human login, real API and DeliveryRequests created by
// Mandaria Backend V1.5. Only E2E_MDR_CANCEL is cancelled; no other request is mutated.
// No traces, HAR, storageState or contact data dumps.
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
  provider: {
    email: env.E2E_PROVIDER_EMAIL || 'provider-admin-a@mandaria.local',
    password: env.E2E_PROVIDER_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
}
if (Object.values(accounts).some((a) => !a.email || !a.password))
  throw new Error('Configure real local accounts. No credentials were printed.')
if (!/^MDR-\d{6,}$/.test(env.E2E_MDR_CANCEL ?? ''))
  throw new Error('Set E2E_MDR_CANCEL to a local CREATED request to cancel.')
const sensitive = new Set(
  Object.entries(env)
    .filter(([k, v]) => /SECRET|PASSWORD/.test(k) && v.length > 8)
    .map(([, v]) => v),
)
const output = 'test-results/delivery-requests'
mkdirSync(output, { recursive: true })
const report = { checks: [], failures: [], mutations: [], scenarios: {} }
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
// Pace real reloads below the backend refresh limit.
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
  return response.json()
}
const nav = (state) =>
  state.page.getByRole('navigation', { name: 'Navegación principal' })
const region = (state, name) =>
  state.page.getByRole('region', { name, exact: true })
const field = (scope, label) =>
  scope.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('+ dd')
async function noHorizontalOverflow(state) {
  const overflow = await state.page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  assert.ok(overflow <= 1, `Page overflows horizontally by ${overflow}px`)
}
async function audit(state, personal) {
  const data = await state.page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }))
  assert.deepEqual(data.local, {})
  assert.ok(
    Object.keys(data.session).every((key) => key === 'mandaria.refresh'),
  )
  const stored = JSON.stringify(data)
  for (const value of personal) {
    assert.ok(!stored.includes(value), 'Personal data persisted in storage')
    assert.ok(
      state.console.every((c) => !c.text.includes(value)),
      'Personal data printed to console',
    )
  }
  const errors = state.console.filter((c) => c.type === 'error')
  assert.ok(
    errors.every((c) =>
      /Failed to load resource.*(?:401|403|404)/.test(c.text),
    ),
    'Unexpected console error',
  )
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
  begin('SUPER_ADMIN login, Solicitudes navigation and V1.4 regression')
  const admin = await session()
  await login(admin, 'admin')
  await expect(
    nav(admin).getByRole('link', { name: 'Solicitudes' }),
  ).toBeVisible()
  const links = await nav(admin).getByRole('link').allTextContents()
  assert.equal(links.indexOf('Solicitudes'), links.indexOf('Vehículos') + 1)
  for (const [name, heading] of [
    ['Integraciones', 'Clientes B2B'],
    ['Proveedores', 'Tu red logística'],
    ['Repartidores', 'Repartidores'],
    ['Vehículos', 'Vehículos'],
    ['Solicitudes', 'Solicitudes de entrega'],
  ]) {
    await nav(admin).getByRole('link', { name, exact: true }).click()
    await expect(
      admin.page.getByRole('heading', { name: heading, exact: true }).first(),
    ).toBeVisible()
  }
  pass()

  begin('Resolve V1.5 scenarios from the real admin API')
  const all = await request(admin, '/admin/delivery-requests?pageSize=100')
  const details = []
  for (const item of all.items)
    details.push(
      await request(admin, `/admin/delivery-requests/${item.publicId}`),
    )
  const pick = (key, test) =>
    details.find((d) => (env[key] ? d.publicId === env[key] : test(d)))
  const A = pick(
    'E2E_MDR_A',
    (d) =>
      d.status === 'CREATED' &&
      d.financialContext?.goodsPaymentMode === 'PREPAID' &&
      d.packages.some((p) => p.category === 'FOOD') &&
      d.publicId !== env.E2E_MDR_CANCEL,
  )
  const B = pick(
    'E2E_MDR_B',
    (d) =>
      d.status === 'CREATED' &&
      d.financialContext?.goodsPaymentMode === 'COURIER_ADVANCE' &&
      d.publicId !== env.E2E_MDR_CANCEL,
  )
  const C = pick(
    'E2E_MDR_C',
    (d) =>
      d.status === 'CANCELLED' &&
      d.packages.some((p) => p.category === 'PARCEL'),
  )
  const D = details.find((d) => d.publicId === env.E2E_MDR_CANCEL)
  assert.ok(
    A && B && C && D,
    'V1.5 scenarios A, B, C and cancel target required',
  )
  assert.equal(D.status, 'CREATED', 'Cancel target must be CREATED')
  report.scenarios = {
    A: A.publicId,
    B: B.publicId,
    C: C.publicId,
    cancel: D.publicId,
  }
  const personal = details.flatMap((d) =>
    d.stops.flatMap((s) => [s.contactPhone, s.contactName]),
  )
  pass()

  begin('List shows real rows and translated states')
  await visit(admin, `${web}/delivery-requests`)
  const table = admin.page.getByRole('table')
  await expect(
    table.getByRole('link', { name: A.publicId, exact: true }),
  ).toBeVisible()
  await expect(table).toContainText('Creada')
  await expect(table).not.toContainText('null')
  await expect(admin.page.getByText(/registros · Página 1/)).toBeVisible()
  pass()

  begin('Server-side filters: publicId, status, integration, reference, dates')
  // Resolves when the UI sends exactly these filters (besides pagination) to the backend.
  const sent = (filters) =>
    admin.page.waitForResponse((r) => {
      const u = new URL(r.url())
      if (!u.pathname.endsWith('/api/v1/admin/delivery-requests')) return false
      const params = Object.fromEntries(u.searchParams)
      delete params.page
      delete params.pageSize
      const keys = Object.keys(filters)
      return (
        Object.keys(params).length === keys.length &&
        keys.every((k) =>
          filters[k] === true ? !!params[k] : params[k] === filters[k],
        )
      )
    })
  const link = (item) =>
    table.getByRole('link', { name: item.publicId, exact: true })
  let wait = sent({ publicId: A.publicId })
  await admin.page.getByLabel('Identificador').fill(A.publicId.toLowerCase())
  await admin.page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await wait
  await expect(table.getByRole('row')).toHaveCount(2)
  await admin.page.getByRole('button', { name: 'Limpiar' }).click()
  wait = sent({ status: 'CANCELLED' })
  await admin.page.getByLabel('Filtrar por estado').selectOption('CANCELLED')
  await wait
  await expect(link(C)).toBeVisible()
  await expect(link(A)).toHaveCount(0)
  await admin.page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(admin.page.getByLabel('Filtrar por estado')).toHaveValue('')
  wait = sent({ integrationClientId: B.integrationClientId })
  await admin.page
    .getByLabel('Filtrar por integración')
    .selectOption(B.integrationClientId)
  await wait
  await expect(link(B)).toBeVisible()
  if (B.externalReference) {
    wait = sent({
      integrationClientId: B.integrationClientId,
      externalReference: B.externalReference,
    })
    await admin.page.getByLabel('Referencia externa').fill(B.externalReference)
    await admin.page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await wait
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(link(B)).toBeVisible()
  }
  await admin.page.getByRole('button', { name: 'Limpiar' }).click()
  const day = (iso, offset) => {
    const d = new Date(iso)
    d.setDate(d.getDate() + offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  wait = sent({ requestedFrom: true, requestedTo: true })
  await admin.page.getByLabel('Solicitadas desde').fill(day(A.requestedAt, 0))
  await admin.page.getByLabel('Solicitadas hasta').fill(day(A.requestedAt, 0))
  await admin.page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await wait
  await expect(link(A)).toBeVisible()
  await admin.page.getByLabel('Solicitadas desde').fill(day(A.requestedAt, 3))
  await admin.page.getByLabel('Solicitadas hasta').fill(day(A.requestedAt, 3))
  await admin.page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(
    admin.page.getByRole('heading', { name: 'No hay solicitudes de entrega.' }),
  ).toBeVisible()
  await visit(admin, `${web}/delivery-requests?publicId=123`)
  await expect(admin.page.getByRole('alert')).toContainText('MDR-000123')
  pass()

  begin('Detail A: FOOD, PREPAID, pickup, dropoff and package')
  await visit(admin, `${web}/delivery-requests/${A.publicId}`)
  await expect(
    admin.page.getByRole('heading', { name: A.publicId, level: 1 }),
  ).toBeVisible()
  await expect(field(region(admin, 'Resumen'), 'Estado')).toHaveText('Creada')
  await expect(
    region(admin, 'Resumen').getByRole('link', {
      name: new RegExp(A.integrationClient.name),
    }),
  ).toHaveAttribute('href', `/integrations/${A.integrationClient.id}`)
  const pickup = A.stops.find((s) => s.type === 'PICKUP')
  await expect(field(region(admin, 'Recogida'), 'Dirección')).toHaveText(
    pickup.address,
  )
  await expect(field(region(admin, 'Recogida'), 'Teléfono')).toHaveText(
    pickup.contactPhone,
  )
  await expect(region(admin, 'Entrega')).toBeVisible()
  await expect(region(admin, 'Paquetes')).toContainText('Comida')
  await expect(
    field(region(admin, 'Contexto económico'), 'Modalidad'),
  ).toContainText('Mercancía prepagada')
  if (A.financialContext.goodsValue)
    await expect(
      field(region(admin, 'Contexto económico'), 'Valor de mercancía'),
    ).toContainText(A.financialContext.currency)
  const main = admin.page.getByRole('main')
  await expect(main).not.toContainText('null')
  await expect(main).not.toContainText(/Costo de envío/i)
  await expect(
    admin.page.getByRole('button', { name: /Editar|Eliminar/ }),
  ).toHaveCount(0)
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await admin.page.setViewportSize({ width, height })
    await noHorizontalOverflow(admin)
    await admin.page.screenshot({
      path: `${output}/detail-${width}.png`,
      fullPage: true,
    })
  }
  await admin.page.setViewportSize({ width: 1440, height: 1000 })
  pass()

  begin('Detail B: COURIER_ADVANCE and packages')
  await visit(admin, `${web}/delivery-requests/${B.publicId}`)
  const packages = region(admin, 'Paquetes')
  await expect(packages.getByRole('listitem')).toHaveCount(B.packages.length)
  await expect(
    field(region(admin, 'Contexto económico'), 'Modalidad'),
  ).toContainText('Adelanto por repartidor')
  await expect(region(admin, 'Contexto económico')).toContainText(
    'El repartidor deberá adelantar el valor de la mercancía al recogerla.',
  )
  const sized = B.packages.find((p) => p.lengthCm && p.widthCm && p.heightCm)
  if (sized) await expect(packages).toContainText(/\d × \d+ × \d+ cm/)
  await expect(admin.page.getByRole('main')).not.toContainText('null')
  pass()

  begin('Detail C: CANCELLED is read-only with date and reason')
  await visit(admin, `${web}/delivery-requests/${C.publicId}`)
  const cancellation = region(admin, 'Cancelación')
  await expect(field(cancellation, 'Estado')).toHaveText('Cancelada')
  await expect(field(cancellation, 'Motivo')).toHaveText(C.cancellationReason)
  if (C.externalReference === null)
    await expect(
      field(region(admin, 'Resumen'), 'Referencia externa'),
    ).toHaveText('—')
  await expect(
    admin.page.getByRole('button', {
      name: /Cancelar solicitud|Editar|Eliminar/,
    }),
  ).toHaveCount(0)
  pass()

  begin('Cancel from the UI with confirmation and reason; double cancel')
  await visit(admin, `${web}/delivery-requests/${D.publicId}`)
  await admin.page.getByRole('button', { name: 'Cancelar solicitud' }).click()
  const dialog = admin.page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Volver' }).click()
  await expect(dialog).not.toBeVisible()
  await admin.page.getByRole('button', { name: 'Cancelar solicitud' }).click()
  const reason = 'Validación Mandaria Web V1.5-B'
  await dialog.getByLabel('Motivo de cancelación').fill(reason)
  await dialog.getByRole('button', { name: 'Confirmar cancelación' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    admin.page.getByText('Solicitud cancelada correctamente.'),
  ).toBeVisible()
  await expect(field(region(admin, 'Cancelación'), 'Motivo')).toHaveText(reason)
  await expect(
    admin.page.getByRole('button', { name: 'Cancelar solicitud' }),
  ).toHaveCount(0)
  report.mutations.push(`cancel ${D.publicId}`)
  const again = await request(
    admin,
    `/admin/delivery-requests/${D.publicId}/cancel`,
    'POST',
    { reason: 'Segundo intento' },
  )
  assert.equal(again.status, 'CANCELLED')
  assert.equal(again.cancellationReason, reason)
  pass()

  begin('List responsive, dashboard counts and refresh')
  await visit(admin, `${web}/delivery-requests`)
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await admin.page.setViewportSize({ width, height })
    await expect(
      admin.page.getByRole('link', { name: A.publicId, exact: true }).first(),
    ).toBeVisible()
    await noHorizontalOverflow(admin)
    await admin.page.screenshot({
      path: `${output}/list-${width}.png`,
      fullPage: true,
    })
  }
  await admin.page.setViewportSize({ width: 1440, height: 1000 })
  await visit(admin, `${web}/dashboard`)
  const created = await request(
    admin,
    '/admin/delivery-requests?pageSize=1&status=CREATED',
  )
  await expect(
    admin.page.locator('.stat-card', { hasText: 'Solicitudes creadas' }),
  ).toContainText(created.total.toLocaleString('es-MX'))
  assert.ok(
    admin.requests
      .filter((u) => /\/admin\/delivery-requests\?/.test(u))
      .slice(-2)
      .every((u) => new URL(u).searchParams.get('pageSize') === '1'),
  )
  await admin.page.reload()
  await expect(
    nav(admin).getByRole('link', { name: 'Solicitudes' }),
  ).toBeVisible()
  await audit(admin, personal)
  pass()

  begin('PROVIDER_ADMIN: menu hidden, route and API blocked, V1.4 intact')
  const provider = await session()
  await login(provider, 'provider')
  await expect(
    nav(provider).getByRole('link', { name: 'Solicitudes' }),
  ).toHaveCount(0)
  for (const name of ['Mi proveedor', 'Repartidores', 'Vehículos'])
    await expect(
      nav(provider).getByRole('link', { name, exact: true }),
    ).toBeVisible()
  for (const path of [
    '/delivery-requests',
    `/delivery-requests/${A.publicId}`,
  ]) {
    await visit(provider, `${web}${path}`)
    await expect(
      provider.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeVisible()
  }
  assert.ok(
    provider.requests.every((u) => !u.includes('/admin/delivery-requests')),
    'Provider Admin UI requested admin DeliveryRequests',
  )
  await request(provider, '/admin/delivery-requests', 'GET', undefined, 403)
  await request(
    provider,
    `/admin/delivery-requests/${A.publicId}/cancel`,
    'POST',
    { reason: 'no' },
    403,
  )
  await visit(provider, `${web}/provider/profile`)
  await expect(provider.page.getByRole('main')).not.toContainText(
    'Sin permisos',
  )
  await audit(provider, personal)
  pass()

  begin('Logout')
  for (const state of sessions) await logout(state)
  pass()
  assert.deepEqual(report.failures, [])
} catch (error) {
  report.failures.push(phase)
  // Query strings only: filters never carry contact data.
  report.lastListQueries = (sessions[0]?.requests ?? [])
    .filter((u) => u.includes('/admin/delivery-requests?'))
    .slice(-5)
    .map((u) => new URL(u).search)
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
