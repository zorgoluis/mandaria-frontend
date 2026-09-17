import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// Local V1.7-B validation with the real backend: IntegrationClient creates a DeliveryRequest,
// quotes it and accepts the Quote → Dispatch OPEN; PROVIDER_ADMIN A and B claim, lose a race,
// release and see real expiration in Mandaria Web. Requirements (LOCAL ONLY):
// - backend started with ROUTING_PROVIDER=local_fake (quotes must never call a paid routing API)
//   and E2E_ROUTING_LOCAL_FAKE=1 here to acknowledge it; a short DISPATCH_TTL_MINUTES (e.g. 3);
// - MAIL_PROVIDER=local_outbox and E2E_MAIL_OUTBOX_DIR to create the DRIVER by invitation.
// Mutations: provider service coverages in the zone (created or reactivated), a temporary
// integration credential (revoked at the end), DeliveryRequests/Quotes/Dispatches and one
// invited DRIVER. No tokens, secrets or passwords are printed or stored.
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
if (env.E2E_ROUTING_LOCAL_FAKE !== '1')
  throw new Error(
    'Start the backend with ROUTING_PROVIDER=local_fake and set E2E_ROUTING_LOCAL_FAKE=1.',
  )
const outbox = env.E2E_MAIL_OUTBOX_DIR
if (!outbox || !existsSync(outbox))
  throw new Error(
    'Set E2E_MAIL_OUTBOX_DIR to the backend LOCAL_MAIL_OUTBOX_DIR.',
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
}
if (Object.values(accounts).some((a) => !a.email || !a.password))
  throw new Error('Configure real local accounts. No credentials were printed.')
const integrationCode = env.E2E_INTEGRATION_CODE || 'WEB_V15_VALIDATION'
const zoneCode = env.E2E_ZONE_CODE || 'LOCAL_OCOZOCOAUTLA'
const driver = {
  email: `web17-driver-${Date.now().toString(36)}@mandaria.local`,
  password: `web17 ${randomBytes(12).toString('base64url')}`,
}
const sensitive = new Set(
  [
    ...Object.entries(env)
      .filter(([k, v]) => /SECRET|PASSWORD|KEY|TOKEN/.test(k) && v.length > 8)
      .map(([, v]) => v),
    driver.password,
  ].filter(Boolean),
)
const output = 'test-results/dispatch'
mkdirSync(output, { recursive: true })
const report = { checks: [], failures: [], mutations: [], scenarios: {} }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let phase = 'startup'
const begin = (name) => {
  phase = name
  console.log(`CHECK ${name}`)
}
const pass = () => {
  report.checks.push(phase)
  console.log(`PASS ${phase}`)
}

async function http(method, path, token, body, expected, headers = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => null)
  if (expected !== undefined)
    assert.equal(
      response.status,
      expected,
      `${method} ${path.split('?')[0]} -> ${response.status} ${data?.code ?? ''}`,
    )
  return { status: response.status, data }
}
// POST /auth/login allows 5/min per IP: keep every login below 4 per rolling minute.
const logins = []
async function loginSlot() {
  for (;;) {
    const now = Date.now()
    while (logins.length && now - logins[0] > 61_000) logins.shift()
    if (logins.length < 4) return logins.push(now)
    await sleep(61_000 - (now - logins[0]) + 500)
  }
}
async function apiLogin(credentials) {
  await loginSlot()
  const { data } = await http('POST', '/auth/login', null, credentials, 200)
  sensitive.add(data.accessToken)
  sensitive.add(data.refreshToken)
  return data
}

const browser = await chromium.launch(
  env.E2E_BROWSER_CHANNEL ? { channel: env.E2E_BROWSER_CHANNEL } : {},
)
const sessions = []
async function session(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const state = {
    page,
    auth: null,
    pending: [],
    console: [],
    requests: [],
    responses: [],
  }
  sessions.push(state)
  page.on('pageerror', () =>
    report.failures.push(`${phase}: uncaught browser exception`),
  )
  page.on('console', (m) =>
    state.console.push({ type: m.type(), text: m.text() }),
  )
  page.on('request', (r) => state.requests.push(r.url()))
  page.on('response', (r) => {
    state.responses.push({ url: r.url(), status: r.status() })
    if (/\/auth\/(login|refresh)$/.test(r.url()) && r.ok())
      state.pending.push(
        r.json().then((t) => {
          state.auth = t
          sensitive.add(t.accessToken)
          sensitive.add(t.refreshToken)
        }),
      )
  })
  return state
}
async function visit(state, url) {
  await sleep(2500)
  await state.page.goto(url)
}
async function webLogin(state, credentials) {
  await visit(state, `${web}/login`)
  await state.page.getByLabel('Correo electrónico').fill(credentials.email)
  await state.page
    .getByLabel('Contraseña', { exact: true })
    .fill(credentials.password)
  await loginSlot()
  await state.page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await state.page.waitForURL('**/dashboard')
  await Promise.all(state.pending)
}
const nav = (state) =>
  state.page.getByRole('navigation', { name: 'Navegación principal' })
const dialog = (state) => state.page.getByRole('dialog')
const cardFor = (state, request) =>
  state.page.getByRole('article').filter({ hasText: request.pickup })
async function noOverflow(state) {
  const overflow = await state.page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  assert.ok(overflow <= 1, `Page overflows horizontally by ${overflow}px`)
}

let adminApi
let credential
let client
try {
  begin(
    'Real setup: coverages, IntegrationClient accepts Quotes → Dispatch OPEN',
  )
  adminApi = await apiLogin(accounts.admin)
  const admin = adminApi.accessToken
  const providers = (
    await http('GET', '/admin/providers?pageSize=100', admin, undefined, 200)
  ).data.items
  const A = providers.find((p) => p.code === 'LOCAL_RAPIDOS_COITA')
  const B = providers.find((p) => p.code === 'LOCAL_MANDADOS_CENTRO')
  assert.ok(A && B, 'Local providers A and B required')
  const zones = (
    await http(
      'GET',
      '/admin/service-zones?pageSize=100',
      admin,
      undefined,
      200,
    )
  ).data.items
  const zone = zones.find((z) => z.code === zoneCode && z.status === 'ACTIVE')
  assert.ok(zone, `ACTIVE zone ${zoneCode} required`)
  for (const p of [A, B]) {
    const coverages = (
      await http(
        'GET',
        `/admin/providers/${p.id}/service-coverages`,
        admin,
        undefined,
        200,
      )
    ).data
    const current = coverages.find(
      (c) => c.serviceZone.id === zone.id && c.serviceType === 'LOCAL_DELIVERY',
    )
    if (!current) {
      await http(
        'POST',
        `/admin/providers/${p.id}/service-coverages`,
        admin,
        { serviceZoneId: zone.id, serviceType: 'LOCAL_DELIVERY' },
        201,
      )
      report.mutations.push(`coverage ${p.code} → ${zone.code} created`)
    } else if (current.status !== 'ACTIVE') {
      await http(
        'PATCH',
        `/admin/providers/${p.id}/service-coverages/${current.id}`,
        admin,
        { status: 'ACTIVE' },
        200,
      )
      report.mutations.push(`coverage ${p.code} → ${zone.code} reactivated`)
    }
  }
  const boundary = (
    await http('GET', `/admin/service-zones/${zone.id}`, admin, undefined, 200)
  ).data.boundary
  const ring =
    boundary.type === 'MultiPolygon'
      ? boundary.coordinates[0][0]
      : boundary.coordinates[0]
  const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
  client = (
    await http('GET', '/admin/integrations', admin, undefined, 200)
  ).data.find((c) => c.code === integrationCode)
  assert.ok(client, `IntegrationClient ${integrationCode} required`)
  credential = (
    await http(
      'POST',
      `/admin/integrations/${client.id}/credentials`,
      admin,
      {
        scopes: ['deliveries:create', 'quotes:create', 'quotes:accept'],
      },
      201,
    )
  ).data
  sensitive.add(credential.clientSecret)
  report.mutations.push('temporary integration credential (revoked at the end)')
  const b2b = (
    await http(
      'POST',
      '/integrations/token',
      null,
      { clientId: credential.clientId, clientSecret: credential.clientSecret },
      200,
    )
  ).data.accessToken
  sensitive.add(b2b)
  const tag = Date.now().toString(36).toUpperCase()
  async function openDispatch(label, goods) {
    const pickup = `Recogida ${label} ${tag}, Ocozocoautla`
    const request = (
      await http(
        'POST',
        '/delivery-requests',
        b2b,
        {
          externalReference: `WEB17-${label}-${tag}`,
          stops: [
            {
              type: 'PICKUP',
              sequence: 1,
              address: pickup,
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lon.toFixed(6)),
              contactName: `Comercio ${label}`,
              contactPhone: '+52 961 000 0171',
              instructions: 'Mostrador',
            },
            {
              type: 'DROPOFF',
              sequence: 2,
              address: `Entrega ${label} ${tag}, Ocozocoautla`,
              latitude: Number((lat + 0.012).toFixed(6)),
              longitude: Number(lon.toFixed(6)),
              contactName: `Cliente ${label}`,
              contactPhone: '+52 961 000 0172',
            },
          ],
          packages: [
            { category: 'FOOD', description: `Pedido ${label}`, quantity: 1 },
          ],
          financialContext: goods,
        },
        201,
        { 'Idempotency-Key': randomUUID() },
      )
    ).data
    const quote = (
      await http(
        'POST',
        `/delivery-requests/${request.publicId}/quotes`,
        b2b,
        undefined,
      )
    ).data
    assert.ok(quote.publicId, 'Quote was not created')
    await http(
      'POST',
      `/delivery-quotes/${quote.publicId}/accept`,
      b2b,
      undefined,
      undefined,
      { 'Idempotency-Key': randomUUID() },
    )
    const dispatch = (
      await http(
        'GET',
        `/admin/dispatches?deliveryRequestPublicId=${request.publicId}`,
        admin,
        undefined,
        200,
      )
    ).data.items[0]
    assert.equal(dispatch.status, 'OPEN')
    assert.deepEqual(
      new Set(dispatch.candidates.map((c) => c.provider.id)),
      new Set([A.id, B.id]),
    )
    report.mutations.push(
      `${request.publicId} → ${quote.publicId} ACCEPTED → Dispatch OPEN`,
    )
    return {
      id: dispatch.id,
      publicId: request.publicId,
      pickup,
      expiresAt: dispatch.expiresAt,
      fee: dispatch.deliveryQuote.amount,
    }
  }
  const race = await openDispatch('RACE', {
    goodsValue: '350.00',
    goodsPaymentMode: 'COURIER_ADVANCE',
    currency: 'MXN',
  })
  const expiring = await openDispatch('EXPIRY', {
    goodsValue: '120.00',
    goodsPaymentMode: 'PREPAID',
    currency: 'MXN',
  })
  report.scenarios = {
    race: race.publicId,
    expiring: expiring.publicId,
    ttlSeconds: Math.round(
      (Date.parse(expiring.expiresAt) - Date.now()) / 1000,
    ),
  }
  assert.ok(
    Date.parse(expiring.expiresAt) - Date.now() <= 10 * 60_000,
    'Use a short DISPATCH_TTL_MINUTES for the expiration check',
  )
  pass()

  begin(
    'PROVIDER_ADMIN A and B both see the available service with separated money',
  )
  const a = await session()
  await webLogin(a, accounts.a)
  await nav(a).getByRole('link', { name: 'Servicios', exact: true }).click()
  await expect(cardFor(a, race)).toBeVisible()
  const raceCard = cardFor(a, race)
  await expect(raceCard.getByText('Costo del envío')).toBeVisible()
  await expect(raceCard.getByText('Valor de mercancía')).toBeVisible()
  await expect(raceCard.getByText('Adelanto por repartidor')).toBeVisible()
  await expect(
    raceCard.getByText(/El repartidor adelanta \$350\.00 MXN al recoger\./),
  ).toBeVisible()
  await expect(raceCard.getByText(/Vence en \d+:\d{2}/)).toBeVisible()
  await expect(
    cardFor(a, expiring).getByText('Mercancía prepagada'),
  ).toBeVisible()
  const text = await a.page.getByRole('main').innerText()
  for (const raw of ['COURIER_ADVANCE', 'PREPAID', 'LOCAL_DELIVERY', 'OFFERED'])
    assert.ok(!text.includes(raw), `Raw enum ${raw} rendered`)
  const b = await session()
  await webLogin(b, accounts.b)
  await visit(b, `${web}/services`)
  await expect(cardFor(b, race)).toBeVisible()
  pass()

  begin(
    'A claims after confirmation; the service moves to Mis servicios with full detail',
  )
  await raceCard.getByRole('button', { name: 'TOMAR SERVICIO' }).click()
  await expect(dialog(a)).toContainText(race.pickup)
  await expect(dialog(a).getByText('Costo del envío')).toBeVisible()
  await dialog(a).getByRole('button', { name: 'Confirmar y tomar' }).click()
  await expect(a.page.getByText('Servicio tomado correctamente.')).toBeVisible()
  await expect(
    a.page.getByRole('tab', { name: 'Mis servicios' }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    cardFor(a, race).getByRole('button', { name: 'LIBERAR SERVICIO' }),
  ).toBeVisible()
  await cardFor(a, race)
    .getByRole('link', { name: /Ver detalle/ })
    .click()
  await expect(
    a.page.getByRole('heading', { name: race.publicId, level: 1 }),
  ).toBeVisible()
  await expect(a.page.getByText('Comercio RACE')).toBeVisible()
  await expect(
    a.page.getByText(/asignación de repartidor y vehículo llegará/),
  ).toBeVisible()
  await expect(a.page.getByRole('button', { name: /Asignar/ })).toHaveCount(0)
  pass()

  begin('B loses the race: clear 409 message and the list refreshes')
  await cardFor(b, race).getByRole('button', { name: 'TOMAR SERVICIO' }).click()
  await dialog(b).getByRole('button', { name: 'Confirmar y tomar' }).click()
  await expect(dialog(b).getByRole('alert')).toHaveText(
    'Este servicio ya fue tomado por otro proveedor.',
  )
  assert.ok(
    b.responses.some(
      (r) => r.url.includes(`/dispatches/${race.id}/claim`) && r.status === 409,
    ),
  )
  await dialog(b).getByRole('button', { name: 'Entendido' }).click()
  await expect(cardFor(b, race)).toHaveCount(0)
  pass()

  begin(
    'A releases with a reason after the warning; it reopens for B and never returns to A',
  )
  await visit(a, `${web}/services?tab=claimed`)
  await cardFor(a, race)
    .getByRole('button', { name: 'LIBERAR SERVICIO' })
    .click()
  await expect(
    dialog(a).getByText(
      'Si liberas este servicio, no podrás volver a tomarlo.',
    ),
  ).toBeVisible()
  await dialog(a).getByLabel('Sin repartidor disponible').check()
  await dialog(a).getByRole('button', { name: 'Liberar servicio' }).click()
  await expect(a.page.getByText('Servicio liberado.')).toBeVisible()
  await expect(cardFor(a, race)).toHaveCount(0)
  await a.page.getByRole('tab', { name: 'Disponibles' }).click()
  await expect(cardFor(a, expiring)).toBeVisible()
  await expect(cardFor(a, race)).toHaveCount(0)
  await a.page.getByRole('tab', { name: 'Historial' }).click()
  await expect(cardFor(a, race)).toHaveCount(0)
  await expect(
    a.page
      .getByText(
        'Tu proveedor liberó este servicio y no puede volver a tomarlo.',
      )
      .first(),
  ).toBeVisible()
  const reclaim = await http(
    'POST',
    `/provider/dispatches/${race.id}/claim?providerId=${A.id}`,
    a.auth.accessToken,
  )
  assert.deepEqual(
    [reclaim.status, reclaim.data.code],
    [409, 'DISPATCH_RECLAIM_NOT_ALLOWED'],
  )
  await b.page.getByRole('button', { name: 'Actualizar' }).click()
  await expect(cardFor(b, race)).toBeVisible()
  await cardFor(b, race).getByRole('button', { name: 'TOMAR SERVICIO' }).click()
  await dialog(b).getByRole('button', { name: 'Confirmar y tomar' }).click()
  await expect(b.page.getByText('Servicio tomado correctamente.')).toBeVisible()
  const releaseAgain = await http(
    'POST',
    `/provider/dispatches/${race.id}/release?providerId=${A.id}`,
    a.auth.accessToken,
    { reason: 'Intento repetido' },
  )
  assert.deepEqual(
    [releaseAgain.status, releaseAgain.data.code],
    [409, 'DISPATCH_NOT_CLAIMED_BY_PROVIDER'],
  )
  pass()

  begin('Provider isolation: A cannot switch to Provider B by query string')
  await visit(a, `${web}/services?providerId=${B.id}`)
  await expect(a.page.getByRole('alert').first()).toBeVisible()
  await expect(a.page.getByRole('article')).toHaveCount(0)
  await http(
    'GET',
    `/provider/dispatches?providerId=${B.id}`,
    a.auth.accessToken,
    undefined,
    403,
  )
  await http(
    'POST',
    `/provider/dispatches/${expiring.id}/claim?providerId=${B.id}`,
    a.auth.accessToken,
    undefined,
    403,
  )
  const bodyClaim = await http(
    'POST',
    `/provider/dispatches/${expiring.id}/claim?providerId=${A.id}`,
    a.auth.accessToken,
    { providerId: B.id },
  )
  assert.equal(bodyClaim.status, 400)
  pass()

  begin(
    'Real expiration: countdown ends, claim is disabled and the backend confirms EXPIRED',
  )
  await visit(a, `${web}/services`)
  await expect(cardFor(a, expiring)).toBeVisible()
  const waitMs = Date.parse(expiring.expiresAt) - Date.now() + 2000
  if (waitMs > 0) {
    console.log(
      `  waiting ${Math.ceil(waitMs / 1000)}s for the real dispatch window to close`,
    )
    await sleep(waitMs)
  }
  await expect(
    cardFor(a, expiring).getByRole('button', { name: 'Tiempo terminado' }),
  ).toBeDisabled()
  const late = await http(
    'POST',
    `/provider/dispatches/${expiring.id}/claim?providerId=${A.id}`,
    a.auth.accessToken,
  )
  assert.deepEqual([late.status, late.data.code], [409, 'DISPATCH_EXPIRED'])
  await a.page.getByRole('button', { name: 'Actualizar' }).click()
  await expect(cardFor(a, expiring)).toHaveCount(0)
  await visit(a, `${web}/services?tab=history&status=EXPIRED`)
  await expect(
    a.page.getByText('El tiempo para tomar este servicio terminó.').first(),
  ).toBeVisible()
  pass()

  begin('SUPER_ADMIN audits dispatches read-only; cannot claim')
  const sa = await session()
  await webLogin(sa, accounts.admin)
  await nav(sa).getByRole('link', { name: 'Despachos', exact: true }).click()
  await sa.page.getByLabel('Buscar por solicitud').fill(race.publicId)
  await sa.page.getByRole('button', { name: 'Buscar' }).click()
  await expect(sa.page.getByRole('table')).toContainText(race.publicId)
  await sa.page
    .getByRole('link', { name: `Ver despacho de ${race.publicId}` })
    .click()
  const candidates = sa.page.getByRole('region', { name: /Candidatos/ })
  await expect(
    candidates.getByRole('row', { name: new RegExp(A.name) }),
  ).toContainText('Liberado')
  await expect(
    candidates.getByRole('row', { name: new RegExp(A.name) }),
  ).toContainText('Sin repartidor disponible')
  await expect(
    candidates.getByRole('row', { name: new RegExp(B.name) }),
  ).toContainText('Tomado')
  await expect(
    sa.page.getByRole('button', { name: /TOMAR|LIBERAR/ }),
  ).toHaveCount(0)
  await visit(sa, `${web}/services`)
  await expect(
    sa.page.getByRole('heading', { name: 'Sin permisos' }),
  ).toBeVisible()
  await http('GET', '/provider/dispatches', sa.auth.accessToken, undefined, 403)
  pass()

  begin('DRIVER (created by real invitation) has no dispatch UI or API access')
  const invite = await http(
    'POST',
    `/admin/providers/${B.id}/invitations`,
    admin,
    { email: driver.email, role: 'DRIVER', driverName: 'Web17 Driver' },
    201,
  )
  report.mutations.push(
    `DRIVER invitation ${driver.email} → Provider B (activated)`,
  )
  const mail = readdirSync(outbox)
    .map((n) => JSON.parse(readFileSync(join(outbox, n), 'utf8')))
    .filter((m) => m.to === driver.email)
    .at(-1)
  assert.ok(mail && invite.data.id, 'Invitation email not found')
  const token = new URL(mail.activationUrl).searchParams.get('token')
  sensitive.add(token)
  await http(
    'POST',
    '/auth/activate-account',
    null,
    { token, password: driver.password },
    200,
  )
  const d = await session({ width: 390, height: 844 })
  await webLogin(d, driver)
  await expect(nav(d).getByRole('link', { name: 'Servicios' })).toHaveCount(0)
  for (const path of ['/services', '/dispatches']) {
    await visit(d, `${web}${path}`)
    await expect(
      d.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeVisible()
  }
  await http('GET', '/provider/dispatches', d.auth.accessToken, undefined, 403)
  await http(
    'POST',
    `/provider/dispatches/${expiring.id}/claim`,
    d.auth.accessToken,
    undefined,
    403,
  )
  pass()

  begin(
    'Responsive services and dispatch screens; storage, console and URL audit',
  )
  const fresh = await openDispatch('MOBILE', {
    goodsValue: '90.00',
    goodsPaymentMode: 'COURIER_ADVANCE',
    currency: 'MXN',
  })
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await a.page.setViewportSize({ width, height })
    await visit(a, `${web}/services`)
    await expect(cardFor(a, fresh)).toBeVisible()
    await noOverflow(a)
    await a.page.screenshot({
      path: `${output}/services-${width}.png`,
      fullPage: true,
    })
    await visit(sa, `${web}/dispatches`)
    await sa.page.setViewportSize({ width, height })
    await expect(sa.page.getByRole('table')).toBeVisible()
    await noOverflow(sa)
  }
  await cardFor(a, fresh)
    .getByRole('button', { name: 'TOMAR SERVICIO' })
    .click()
  await noOverflow(a)
  await a.page.screenshot({
    path: `${output}/claim-dialog-390.png`,
    fullPage: true,
  })
  await dialog(a).getByRole('button', { name: 'Volver' }).click()
  for (const state of sessions) {
    const data = await state.page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }))
    assert.deepEqual(data.local, {})
    assert.ok(Object.keys(data.session).every((k) => k === 'mandaria.refresh'))
    const stored = JSON.stringify(
      Object.entries(data.session).filter(([k]) => k !== 'mandaria.refresh'),
    )
    for (const value of sensitive) {
      assert.ok(!stored.includes(value), 'secret in storage')
      assert.ok(
        state.console.every((c) => !c.text.includes(value)),
        'secret in console',
      )
      assert.ok(
        state.requests
          .filter((u) => u.startsWith(base))
          .every((u) => !u.includes(value)),
        'secret in API URL',
      )
    }
    const errors = state.console.filter((c) => c.type === 'error')
    assert.ok(
      errors.every((c) =>
        /Failed to load resource.*(?:400|401|403|404|409)/.test(c.text),
      ),
      'Unexpected console error',
    )
  }
  pass()
  assert.deepEqual(report.failures, [])
} catch (error) {
  report.failures.push(phase)
  let message = error instanceof Error ? error.message : String(error)
  for (const value of sensitive)
    if (value) message = message.replaceAll(value, '[REDACTED]')
  console.error(`FAIL ${phase}`)
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
  if (credential && client && adminApi) {
    const creds =
      (
        await http(
          'GET',
          `/admin/integrations/${client.id}/credentials`,
          adminApi.accessToken,
        )
      ).data ?? []
    for (const c of creds.filter((c) => c.status === 'ACTIVE'))
      await http(
        'POST',
        `/admin/integrations/${client.id}/credentials/${c.id}/revoke`,
        adminApi.accessToken,
      )
  }
  for (const tokens of [adminApi, ...sessions.map((s) => s.auth)])
    if (tokens?.refreshToken)
      await http('POST', '/auth/logout', null, {
        refreshToken: tokens.refreshToken,
      }).catch(() => undefined)
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
