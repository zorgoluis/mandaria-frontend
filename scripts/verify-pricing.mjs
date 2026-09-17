import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Local V1.6-B validation: real human login and the real admin API for ServiceZones,
// RatePlans and DeliveryQuotes. The only mutation is a new RatePlan version cloned from the
// active one: its bands are restored before activating, so the effective tariff does not
// change. Quotes are only read: creating one would call the configured routing provider, an
// external paid service, so this script never does. No traces, HAR, storageState or dumps.
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
const sensitive = new Set(
  Object.entries(env)
    .filter(([k, v]) => /SECRET|PASSWORD|KEY|TOKEN/.test(k) && v.length > 8)
    .map(([, v]) => v),
)
const output = 'test-results/pricing'
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
  return response.status === 204 ? undefined : response.json()
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
async function audit(state) {
  const data = await state.page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }))
  assert.deepEqual(data.local, {})
  assert.ok(
    Object.keys(data.session).every((key) => key === 'mandaria.refresh'),
  )
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
  // The user menu trigger: action buttons may also mention emails in their labels.
  await state.page.locator('button.user-trigger').click()
  await state.page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await state.page.waitForURL('**/login')
  assert.equal(await state.page.evaluate(() => sessionStorage.length), 0)
  state.auth = null
}
const meters = (value) => Math.round(Number(value) * 1000)
const planLabels = { DRAFT: 'Borrador', ACTIVE: 'Activa', INACTIVE: 'Inactiva' }
/** Clicks and waits for the real API call, so assertions never race the request. */
async function act(state, button, method, path) {
  const [response] = await Promise.all([
    state.page.waitForResponse(
      (r) =>
        r.request().method() === method &&
        new URL(r.url()).pathname.endsWith(path),
    ),
    button.click(),
  ])
  assert.ok(response.ok(), `${method} ${path} failed with ${response.status()}`)
  return response
}

try {
  begin('SUPER_ADMIN login, V1.6 navigation and V1.4/V1.5 regression')
  const admin = await session()
  await login(admin, 'admin')
  // allTextContents does not wait: read the menu only once it has rendered.
  await expect(
    nav(admin).getByRole('link', { name: 'Zonas de servicio' }),
  ).toBeVisible()
  const links = await nav(admin).getByRole('link').allTextContents()
  assert.equal(links.indexOf('Cotizaciones'), links.indexOf('Solicitudes') + 1)
  assert.equal(
    links.indexOf('Zonas de servicio'),
    links.indexOf('Cotizaciones') + 1,
  )
  for (const [name, heading] of [
    ['Integraciones', 'Clientes B2B'],
    ['Proveedores', 'Tu red logística'],
    ['Repartidores', 'Repartidores'],
    ['Vehículos', 'Vehículos'],
    ['Solicitudes', 'Solicitudes de entrega'],
    ['Cotizaciones', 'Cotizaciones emitidas'],
    ['Zonas de servicio', 'Cobertura configurada'],
  ]) {
    await nav(admin).getByRole('link', { name, exact: true }).click()
    await expect(
      admin.page.getByRole('heading', { name: heading, exact: true }).first(),
    ).toBeVisible()
  }
  pass()

  begin('Resolve the real V1.6 scenario from the admin API')
  const zones = await request(admin, '/admin/service-zones?pageSize=100')
  assert.ok(zones.items.length, 'At least one ServiceZone is required')
  const target = env.E2E_ZONE_CODE
    ? zones.items.find((z) => z.code === env.E2E_ZONE_CODE)
    : zones.items.find((z) => z.status === 'ACTIVE')
  assert.ok(target, 'No ACTIVE service zone available')
  const zone = await request(admin, `/admin/service-zones/${target.id}`)
  const history = await request(
    admin,
    `/admin/rate-plans?serviceZoneId=${zone.id}&serviceType=LOCAL_DELIVERY&pageSize=100`,
  )
  const active = history.items.find((p) => p.status === 'ACTIVE')
  assert.ok(active, 'The zone needs an ACTIVE LOCAL_DELIVERY rate plan')
  assert.ok(active.bands.length, 'The active plan needs bands')
  // An interrupted run leaves a DRAFT behind; reuse it so the script stays repeatable.
  const existingDraft = history.items.find((p) => p.status === 'DRAFT')
  report.scenarios = {
    zone: zone.code,
    activeVersion: active.version,
    bands: active.bands.length,
  }
  pass()

  begin(
    'Service zone detail: status, currency and coverage, read-only while active',
  )
  await visit(admin, `${web}/service-zones/${zone.id}`)
  await expect(
    admin.page.getByRole('heading', { name: zone.name, level: 1 }),
  ).toBeVisible()
  const summary = region(admin, 'Resumen')
  await expect(field(summary, 'Estado')).toHaveText('Activa')
  await expect(field(summary, 'Moneda')).toHaveText(zone.currency)
  const coverage = region(admin, 'Cobertura')
  await expect(field(coverage, 'Geometría')).toHaveText(zone.boundary.type)
  await expect(coverage.getByLabel('GeoJSON de la cobertura')).toContainText(
    zone.boundary.type,
  )
  await expect(
    admin.page.getByRole('button', { name: 'Reemplazar cobertura' }),
  ).toHaveCount(0)
  await noHorizontalOverflow(admin)
  pass()

  begin('Rate plan history and active version inside the zone')
  const plansPanel = region(admin, 'Entrega local')
  await expect(field(plansPanel, 'Tarifa activa')).toHaveText(
    `Versión ${active.version}`,
  )
  await expect(field(plansPanel, 'Bandas')).toHaveText(
    String(active.bands.length),
  )
  for (const item of history.items)
    await expect(
      plansPanel.getByRole('row', {
        name: new RegExp(`Versión ${item.version}\\b`),
      }),
    ).toContainText(planLabels[item.status])
  pass()

  begin('Create a new version cloned from the active one')
  if (existingDraft) {
    console.log(
      `SKIP reusing the DRAFT v${existingDraft.version} left in place`,
    )
    await request(admin, `/admin/rate-plans/${existingDraft.id}/bands`, 'PUT', {
      bands: active.bands.map((b) => ({
        minDistanceMeters: b.minDistanceMeters,
        maxDistanceMeters: b.maxDistanceMeters,
        amount: b.amount,
      })),
    })
    await visit(admin, `${web}/rate-plans/${existingDraft.id}`)
  } else {
    await plansPanel
      .getByRole('button', { name: 'Crear nueva versión' })
      .click()
    await act(
      admin,
      admin.page.getByRole('button', { name: 'Crear borrador' }),
      'POST',
      '/clone',
    )
    await admin.page.waitForURL('**/rate-plans/**')
  }
  const draftId = new URL(admin.page.url()).pathname.split('/').pop()
  const draft = await request(admin, `/admin/rate-plans/${draftId}`)
  report.mutations.push(`RatePlan v${draft.version} prepared as DRAFT`)
  assert.equal(draft.status, 'DRAFT')
  assert.equal(draft.bands.length, active.bands.length)
  await expect(
    admin.page.getByRole('heading', {
      name: `Versión ${draft.version}`,
      level: 1,
    }),
  ).toBeVisible()
  await expect(field(region(admin, 'Resumen'), 'Estado')).toHaveText('Borrador')
  pass()

  begin('Draft bands are edited in kilometres and stored in metres')
  const editor = admin.page.getByRole('form', { name: 'Editor de bandas' })
  const last = draft.bands.length
  const maxField = editor.getByLabel(`Banda ${last}: hasta, en kilómetros`, {
    exact: true,
  })
  const save = () =>
    act(
      admin,
      editor.getByRole('button', { name: 'Guardar bandas' }),
      'PUT',
      '/bands',
    )
  const original = await maxField.inputValue()
  const edited = String(Number(original) + 1.5)
  await maxField.fill(edited)
  await save()
  const saved = await request(admin, `/admin/rate-plans/${draftId}`)
  assert.equal(
    saved.bands.at(-1).maxDistanceMeters,
    meters(edited),
    'Kilometres were not converted into the metres the DTO requires',
  )
  pass()

  begin('Validation reports a gap in Spanish, never raw backend text')
  const minField = editor.getByLabel(`Banda ${last}: desde, en kilómetros`, {
    exact: true,
  })
  const originalMin = await minField.inputValue()
  await minField.fill(String(Number(originalMin) + 1))
  await save()
  const validation = region(admin, 'Validación')
  const revalidate = () =>
    act(
      admin,
      validation.getByRole('button', { name: 'Volver a validar' }),
      'POST',
      '/validate',
    )
  await revalidate()
  await expect(validation.getByRole('alert')).toContainText(
    'Hueco entre rangos',
  )
  await expect(validation.getByRole('alert')).not.toContainText('gap between')
  // Restore the cloned bands so the activated version prices exactly like the current one.
  await minField.fill(originalMin)
  await maxField.fill(original)
  await save()
  await revalidate()
  await expect(validation.getByText(/puede activarse/)).toBeVisible()
  const restored = await request(admin, `/admin/rate-plans/${draftId}`)
  assert.deepEqual(
    restored.bands.map((b) => [
      b.minDistanceMeters,
      b.maxDistanceMeters,
      b.amount,
    ]),
    active.bands.map((b) => [
      b.minDistanceMeters,
      b.maxDistanceMeters,
      b.amount,
    ]),
    'The draft no longer matches the tariff it was cloned from',
  )
  pass()

  begin('The band editor stays usable on a phone viewport')
  await admin.page.setViewportSize({ width: 390, height: 844 })
  await expect(maxField).toBeVisible()
  await expect(
    editor.getByRole('button', { name: 'Guardar bandas' }),
  ).toBeVisible()
  await noHorizontalOverflow(admin)
  await admin.page.setViewportSize({ width: 1440, height: 1000 })
  pass()

  begin('Activation replaces the previous ACTIVE version')
  await admin.page.getByRole('button', { name: 'Activar tarifa' }).click()
  await expect(
    admin.page.getByText(/Las cotizaciones existentes no cambiarán/),
  ).toBeVisible()
  await act(
    admin,
    admin.page.getByRole('button', { name: 'Activar versión' }),
    'POST',
    '/activate',
  )
  await expect(field(region(admin, 'Resumen'), 'Estado')).toHaveText('Activa')
  report.mutations.push(`RatePlan v${draft.version} activated`)
  const after = await request(
    admin,
    `/admin/rate-plans?serviceZoneId=${zone.id}&serviceType=LOCAL_DELIVERY&pageSize=100`,
  )
  assert.equal(
    after.items.filter((p) => p.status === 'ACTIVE').length,
    1,
    'More than one ACTIVE version for the same zone and service',
  )
  assert.equal(
    after.items.find((p) => p.id === active.id).status,
    'INACTIVE',
    'The previous version was not moved to history',
  )
  pass()

  begin('History stays read-only after the change')
  await visit(admin, `${web}/rate-plans/${active.id}`)
  await expect(field(region(admin, 'Resumen'), 'Estado')).toHaveText('Inactiva')
  await expect(
    admin.page.getByRole('form', { name: 'Editor de bandas' }),
  ).toHaveCount(0)
  await expect(
    admin.page.getByRole('button', { name: 'Activar tarifa' }),
  ).toHaveCount(0)
  await request(
    admin,
    `/admin/rate-plans/${active.id}/bands`,
    'PUT',
    { bands: active.bands.map((b) => ({ ...b, id: undefined })) },
    409,
  )
  pass()

  begin('Quotes are a read-only admin surface')
  const quotes = await request(admin, '/admin/delivery-quotes?pageSize=20')
  await visit(admin, `${web}/delivery-quotes`)
  if (quotes.items.length) {
    const quote = quotes.items[0]
    report.scenarios.quote = quote.publicId
    await admin.page
      .getByRole('link', { name: new RegExp(quote.publicId) })
      .first()
      .click()
    await expect(
      admin.page.getByRole('heading', { name: quote.publicId, level: 1 }),
    ).toBeVisible()
    const detail = region(admin, 'Resumen')
    await expect(field(detail, 'Precio')).toContainText(quote.currency)
    await expect(field(detail, 'Precio')).toContainText(quote.amount)
    await expect(field(detail, 'Tarifa')).toContainText(
      `Versión ${quote.ratePlan.version}`,
    )
    await expect(field(detail, 'Servicio')).toHaveText('Entrega local')
    const body = await admin.page.getByRole('main').innerText()
    for (const technical of ['OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED'])
      assert.ok(!body.includes(technical), 'A raw quote enum reached the UI')
    assert.ok(!/\$0(?:\.00)?\b/.test(body), 'A quote was presented as $0')
    await expect(
      admin.page.getByRole('button', { name: /^Aceptar|^Cancelar/ }),
    ).toHaveCount(0)
  } else {
    await expect(
      admin.page.getByRole('heading', { name: 'No hay cotizaciones.' }),
    ).toBeVisible()
    report.scenarios.quote = null
  }
  await noHorizontalOverflow(admin)
  pass()

  begin('Delivery request detail keeps V1.5 and adds Cotizaciones')
  const requests = await request(admin, '/admin/delivery-requests?pageSize=1')
  if (requests.items.length) {
    const requestId = requests.items[0].publicId
    report.scenarios.request = requestId
    await visit(admin, `${web}/delivery-requests/${requestId}`)
    for (const name of [
      'Recogida',
      'Entrega',
      'Paquetes',
      'Contexto económico',
      'Cotizaciones',
    ])
      await expect(region(admin, name)).toBeVisible()
    const body = await admin.page.getByRole('main').innerText()
    assert.ok(
      !/\bTotal\b/i.test(body),
      'An operational total that the backend does not define was presented',
    )
  } else {
    report.scenarios.request = null
    console.log('SKIP no local DeliveryRequest to extend')
  }
  await audit(admin)
  pass()

  begin('PROVIDER_ADMIN has no access to zones, tariffs or global quotes')
  const provider = await session()
  await login(provider, 'provider')
  await expect(
    nav(provider).getByRole('link', { name: 'Repartidores' }),
  ).toBeVisible()
  const providerLinks = await nav(provider).getByRole('link').allTextContents()
  for (const name of ['Zonas de servicio', 'Cotizaciones', 'Solicitudes'])
    assert.ok(!providerLinks.includes(name), `${name} leaked into the menu`)
  for (const path of [
    '/service-zones',
    '/service-zones/new',
    `/service-zones/${zone.id}`,
    `/rate-plans/${draftId}`,
    '/delivery-quotes',
    '/delivery-quotes/MQ-000001',
  ]) {
    await visit(provider, `${web}${path}`)
    await expect(
      provider.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeVisible()
  }
  assert.ok(
    provider.requests.every(
      (u) =>
        !/\/admin\/(service-zones|rate-plans|delivery-quotes)/.test(
          new URL(u).pathname,
        ),
    ),
    'Provider Admin UI requested a V1.6 admin endpoint',
  )
  for (const [path, method, body] of [
    ['/admin/service-zones', 'GET', undefined],
    [`/admin/service-zones/${zone.id}`, 'GET', undefined],
    [`/admin/service-zones/${zone.id}/activate`, 'POST', {}],
    ['/admin/rate-plans', 'GET', undefined],
    [`/admin/rate-plans/${draftId}/activate`, 'POST', {}],
    ['/admin/delivery-quotes', 'GET', undefined],
  ])
    await request(provider, path, method, body, 403)
  await visit(provider, `${web}/provider/profile`)
  await expect(provider.page.getByRole('main')).not.toContainText(
    'Sin permisos',
  )
  await audit(provider)
  pass()

  begin('Logout')
  for (const state of sessions) await logout(state)
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
