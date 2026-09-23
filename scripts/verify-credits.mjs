import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Mandaria V1.10-F — real backend and real browser, credits and monetization administration.
// Balances are read from the API, never derived here. Every movement this check writes is
// compensated before it ends, so the local accounts keep the balance they had. Credits are a
// Mandaria unit of consumption: the check also proves they are never rendered as money.
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
  providerA: {
    email: env.E2E_PROVIDER_EMAIL || 'provider-admin-a@mandaria.local',
    password: env.E2E_PROVIDER_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  driver: {
    email: env.E2E_DRIVER_EMAIL || 'driver-luis@mandaria.local',
    password:
      env.E2E_DRIVER_PASSWORD ||
      env.LOCAL_DRIVER_PASSWORD ||
      env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
}
if (Object.values(accounts).some((a) => !a.email || !a.password))
  throw new Error('Configure real local accounts. No credentials were printed.')
const sensitive = new Set(
  Object.entries(env)
    .filter(([k, v]) => /SECRET|PASSWORD|KEY|TOKEN/.test(k) && v.length > 8)
    .map(([, v]) => v),
)
const output = 'test-results/credits'
mkdirSync(output, { recursive: true })
const report = { checks: [], failures: [], mutations: [], scenario: {} }
let phase = 'startup'
const begin = (name) => {
  phase = name
  console.log(`CHECK ${name}`)
}
const pass = () => {
  report.checks.push(phase)
  console.log(`PASS ${phase}`)
}

// ---------------------------------------------------------------- API layer
const tokens = {}
// POST /auth/login allows 5 per minute per IP: keep every login below 4 per rolling minute.
const logins = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function loginSlot() {
  for (;;) {
    const now = Date.now()
    while (logins.length && now - logins[0] > 61_000) logins.shift()
    if (logins.length < 4) return logins.push(now)
    await sleep(61_000 - (now - logins[0]) + 500)
  }
}
async function login(who) {
  await loginSlot()
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts[who]),
  })
  assert.equal(r.status, 200, `login ${who}`)
  const t = await r.json()
  sensitive.add(t.accessToken)
  sensitive.add(t.refreshToken)
  tokens[who] = t
  return t
}
async function api(who, path, method = 'GET', body, expected, headers = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${tokens[who].accessToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data =
    r.status === 204 ? undefined : await r.json().catch(() => undefined)
  if (expected !== undefined)
    assert.equal(
      r.status,
      expected,
      `${method} ${path.split('?')[0]} -> ${r.status} (expected ${expected}) code=${data?.code ?? '-'}`,
    )
  return {
    status: r.status,
    data,
    replayed: r.headers.get('Idempotent-Replayed'),
  }
}

// ------------------------------------------------------------ browser layer
const browser = await chromium.launch(
  env.E2E_BROWSER_CHANNEL ? { channel: env.E2E_BROWSER_CHANNEL } : {},
)
const sessions = []
async function session() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  const state = { page, console: [], requests: [] }
  sessions.push(state)
  page.on('pageerror', () => report.failures.push('Uncaught browser exception'))
  page.on('console', (m) =>
    state.console.push({ type: m.type(), text: m.text() }),
  )
  page.on('request', (r) => state.requests.push(r.url()))
  return state
}
async function uiLogin(state, who) {
  await sleep(3000)
  await state.page.goto(`${web}/login`)
  await state.page.getByLabel('Correo electrónico').fill(accounts[who].email)
  await state.page
    .getByLabel('Contraseña', { exact: true })
    .fill(accounts[who].password)
  await loginSlot()
  await state.page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await state.page.waitForURL('**/dashboard')
}
const region = (state, name) =>
  state.page.getByRole('region', { name, exact: true })
async function noHorizontalOverflow(state) {
  const overflow = await state.page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  assert.ok(overflow <= 1, `Page overflows horizontally by ${overflow}px`)
}
async function consoleAudit(state) {
  const errors = state.console.filter((c) => c.type === 'error')
  assert.ok(
    errors.every((c) =>
      /Failed to load resource.*(?:400|401|403|404|409)/.test(c.text),
    ),
    'Unexpected console error',
  )
  state.console = []
}
/** Credits are never money: no currency symbol and no currency code next to them. */
function assertNoMoney(text, where) {
  assert.ok(!/\$\s?\d/.test(text), `A money amount appeared in ${where}`)
  assert.ok(!/\d\s?MXN/.test(text), `A currency code appeared in ${where}`)
}

let providerId
let restore = []
try {
  begin('Real backend: accounts, provider and independent driver')
  await login('admin')
  await login('providerA')
  providerId = (
    await api(
      'providerA',
      '/provider/profiles?pageSize=20',
      'GET',
      undefined,
      200,
    )
  ).data.items[0].id
  const independents = (
    await api(
      'admin',
      '/admin/independent-drivers?pageSize=100',
      'GET',
      undefined,
      200,
    )
  ).data.items
  let approved = independents.find((item) => item.status === 'APPROVED')
  if (!approved) {
    // The independent credit account is created when a profile is approved, so the check enables
    // one real local Driver instead of inventing an account. It stays enabled afterwards.
    const people = (await api('admin', '/users', 'GET', undefined, 200)).data
    const list = Array.isArray(people) ? people : people.items
    const user = list.find(
      (u) => u.email === accounts.driver.email && u.role === 'DRIVER',
    )
    assert.ok(user, `Local DRIVER ${accounts.driver.email} is required`)
    const providers = (
      await api('admin', '/admin/providers?pageSize=100', 'GET', undefined, 200)
    ).data.items
    let driverRecord
    for (const provider of providers) {
      const owned = (
        await api(
          'admin',
          `/admin/providers/${provider.id}/drivers?pageSize=100`,
          'GET',
          undefined,
          200,
        )
      ).data.items
      driverRecord = owned.find((d) => d.userId === user.id)
      if (driverRecord) break
    }
    assert.ok(
      driverRecord,
      'The local DRIVER has no Driver profile in any provider',
    )
    approved = (
      await api(
        'admin',
        `/admin/drivers/${driverRecord.id}/independent`,
        'POST',
        {
          reason: 'Validación local V1.10-F: cuenta de créditos independiente',
        },
        200,
      )
    ).data
    report.mutations.push(
      `driver ${driverRecord.id}: habilitación independiente (queda habilitado)`,
    )
  }
  assert.equal(approved.status, 'APPROVED')
  const providerAccount = (
    await api(
      'admin',
      `/admin/providers/${providerId}/credits`,
      'GET',
      undefined,
      200,
    )
  ).data
  const independentAccount = (
    await api(
      'admin',
      `/admin/drivers/${approved.driverId}/independent/credits`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(providerAccount.ownerType, 'PROVIDER')
  assert.equal(independentAccount.ownerType, 'INDEPENDENT_DRIVER')
  assert.notEqual(providerAccount.id, independentAccount.id)
  assert.ok(Number.isInteger(providerAccount.balance))
  report.scenario = {
    providerId,
    independentDriverId: approved.driverId,
    providerBalanceBefore: providerAccount.balance,
    independentBalanceBefore: independentAccount.balance,
  }
  pass()

  begin('Recharge and adjustment are atomic, idempotent and compensated')
  const key = randomUUID()
  const recharge = await api(
    'admin',
    `/admin/providers/${providerId}/credits/recharge`,
    'POST',
    {
      credits: 25,
      method: 'TRANSFER',
      externalReference: `V110F ${key.slice(0, 8)}`,
    },
    201,
    { 'Idempotency-Key': key },
  )
  report.mutations.push(`provider ${providerId}: +25 créditos (recharge)`)
  restore = [
    {
      amount: -25,
      reason: 'Validación V1.10-F: se revierte la recarga de prueba',
    },
  ]
  assert.equal(recharge.data.entry.type, 'RECHARGE')
  assert.equal(recharge.data.entry.amount, 25)
  assert.equal(
    recharge.data.account.balance,
    providerAccount.balance + 25,
    'The balance comes back applied',
  )
  // The same key with the same body returns the original movement and applies nothing.
  const replay = await api(
    'admin',
    `/admin/providers/${providerId}/credits/recharge`,
    'POST',
    {
      credits: 25,
      method: 'TRANSFER',
      externalReference: `V110F ${key.slice(0, 8)}`,
    },
    200,
    { 'Idempotency-Key': key },
  )
  assert.equal(replay.replayed, 'true')
  assert.equal(replay.data.entry.id, recharge.data.entry.id)
  assert.equal(replay.data.account.balance, providerAccount.balance + 25)
  // Same key, different body: refused, nothing applied.
  const conflict = await api(
    'admin',
    `/admin/providers/${providerId}/credits/recharge`,
    'POST',
    { credits: 99, method: 'CASH' },
    409,
    { 'Idempotency-Key': key },
  )
  assert.equal(conflict.data.code, 'CREDIT_IDEMPOTENCY_CONFLICT')
  const adjustment = await api(
    'admin',
    `/admin/providers/${providerId}/credits/adjustment`,
    'POST',
    {
      amount: -25,
      reason: 'Validación V1.10-F: se revierte la recarga de prueba',
    },
    201,
    { 'Idempotency-Key': randomUUID() },
  )
  report.mutations.push(
    `provider ${providerId}: -25 créditos (adjustment, restaura el saldo)`,
  )
  assert.equal(adjustment.data.entry.type, 'ADMIN_ADJUSTMENT')
  assert.equal(
    adjustment.data.account.balance,
    providerAccount.balance,
    'The balance is back to what it was',
  )
  restore = []
  pass()

  begin('The ledger is immutable and has no write route')
  for (const [method, path] of [
    ['PATCH', `/admin/providers/${providerId}/credits/ledger`],
    ['DELETE', `/admin/providers/${providerId}/credits/ledger`],
    ['POST', `/admin/providers/${providerId}/credits/refund`],
  ]) {
    const answer = await api(
      'admin',
      path,
      method,
      method === 'POST' ? {} : undefined,
    )
    assert.ok(
      [404, 405].includes(answer.status),
      `${method} ${path} should not exist (${answer.status})`,
    )
  }
  const ledger = (
    await api(
      'admin',
      `/admin/providers/${providerId}/credits/ledger?page=1&pageSize=20`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.ok(
    ledger.items.length >= 2,
    'The two movements above are in the history',
  )
  assert.equal(ledger.items[0].type, 'ADMIN_ADJUSTMENT')
  assert.equal(ledger.items[1].type, 'RECHARGE')
  for (const entry of ledger.items)
    assert.equal(entry.balanceAfter, entry.balanceBefore + entry.amount)
  pass()

  begin(
    'Credit policies: versioned, immutable and the calculation comes from the backend',
  )
  const policies = (
    await api(
      'admin',
      '/admin/credit-policies?pageSize=100',
      'GET',
      undefined,
      200,
    )
  ).data
  const active = policies.items.find((p) => p.status === 'ACTIVE')
  assert.ok(active, 'An ACTIVE credit policy is required for the calculation')
  for (const [method, path] of [
    ['PATCH', `/admin/credit-policies/${active.id}`],
    ['DELETE', `/admin/credit-policies/${active.id}`],
  ]) {
    const answer = await api(
      'admin',
      path,
      method,
      method === 'PATCH' ? {} : undefined,
    )
    assert.ok(
      [404, 405].includes(answer.status),
      `${method} ${path} should not exist (${answer.status})`,
    )
  }
  const calculation = (
    await api(
      'admin',
      `/admin/credit-policies/calculation?serviceType=${active.serviceType}&actorType=${active.actorType}&distanceMeters=4200`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(calculation.policyId, active.id)
  assert.ok(Number.isInteger(calculation.credits) && calculation.credits > 0)
  assert.ok(
    !('currency' in calculation),
    'A credit cost never carries a currency',
  )
  report.scenario.policy = `${active.serviceType}/${active.actorType} v${active.version} → ${calculation.credits} créditos`
  pass()

  begin('Role isolation on the real credit API')
  await api(
    'providerA',
    `/admin/providers/${providerId}/credits`,
    'GET',
    undefined,
    403,
  )
  await api(
    'providerA',
    `/admin/providers/${providerId}/credits/recharge`,
    'POST',
    { credits: 10, method: 'CASH' },
    403,
    { 'Idempotency-Key': randomUUID() },
  )
  await api('providerA', '/admin/credit-policies', 'GET', undefined, 403)
  const own = (
    await api(
      'providerA',
      `/provider/credits?providerId=${providerId}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(own.ownerType, 'PROVIDER')
  const ownLedger = (
    await api(
      'providerA',
      `/provider/credits/ledger?providerId=${providerId}&page=1&pageSize=20`,
      'GET',
      undefined,
      200,
    )
  ).data
  // The owner view never exposes who acted administratively.
  for (const entry of ownLedger.items) {
    assert.ok(!('createdByUserId' in entry), 'The owner view hides the actor')
    assert.ok(!('idempotencyKey' in entry), 'The owner view hides the key')
  }
  await api('admin', '/provider/credits', 'GET', undefined, 403)
  pass()

  begin('SUPER_ADMIN administers credits inside the provider file')
  const sa = await session()
  await uiLogin(sa, 'admin')
  await sa.page.goto(`${web}/providers/${providerId}`)
  const credits = region(sa, 'Créditos Mandaria')
  await expect(credits.getByText(/créditos$/).first()).toBeVisible()
  const balanceText = await credits.innerText()
  assertNoMoney(balanceText, 'the provider credit panel')
  assert.ok(
    balanceText.includes(String(own.balance)),
    'The panel shows the balance the API returned',
  )
  for (const raw of ['RECHARGE', 'ADMIN_ADJUSTMENT', 'PROVIDER'])
    assert.ok(!balanceText.includes(raw), `Raw enum ${raw} rendered`)
  // A real recharge through the UI, compensated right after.
  await credits.getByRole('button', { name: 'Registrar recarga' }).click()
  const dialog = sa.page.getByRole('dialog')
  await dialog.getByLabel('Créditos a sumar').fill('10')
  await dialog
    .getByLabel('Referencia externa (opcional)')
    .fill('Validación V1.10-F')
  await dialog.getByRole('button', { name: 'Continuar' }).click()
  await expect(dialog.getByText('10 créditos')).toBeVisible()
  await dialog.getByRole('button', { name: 'Registrar recarga' }).click()
  await expect(
    sa.page.getByText('Recarga registrada: +10 créditos.'),
  ).toBeVisible()
  report.mutations.push(
    `provider ${providerId}: +10 créditos (recarga desde la UI)`,
  )
  restore = [
    {
      amount: -10,
      reason: 'Validación V1.10-F: se revierte la recarga de prueba',
    },
  ]
  await expect(
    credits.getByText(String(own.balance + 10), { exact: false }).first(),
  ).toBeVisible()
  await credits.getByRole('button', { name: 'Ajuste administrativo' }).click()
  await dialog.getByLabel('Créditos del ajuste').fill('-10')
  await dialog
    .getByLabel('Motivo')
    .fill('Validación V1.10-F: se revierte la recarga de prueba')
  await dialog.getByRole('button', { name: 'Continuar' }).click()
  await expect(
    dialog.getByText(/Este ajuste disminuye los créditos de la cuenta/),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Aplicar ajuste' }).click()
  await expect(
    sa.page.getByText('Ajuste aplicado: -10 créditos.'),
  ).toBeVisible()
  report.mutations.push(
    `provider ${providerId}: -10 créditos (ajuste desde la UI, restaura el saldo)`,
  )
  restore = []
  const after = (
    await api(
      'admin',
      `/admin/providers/${providerId}/credits`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(
    after.balance,
    providerAccount.balance,
    'The balance is restored',
  )
  await consoleAudit(sa)
  pass()

  begin('SUPER_ADMIN reads the independent driver credits and the policies')
  await sa.page.goto(`${web}/independent-drivers/${approved.driverId}`)
  const independentPanel = region(sa, 'Créditos Mandaria')
  await expect(independentPanel.getByText(/créditos$/).first()).toBeVisible()
  assertNoMoney(
    await independentPanel.innerText(),
    'the independent credit panel',
  )
  assert.ok(
    !sa.page.url().includes('/providers/'),
    'The independent file is not the provider file',
  )
  await sa.page.goto(`${web}/credit-policies`)
  await expect(
    sa.page.getByRole('heading', { name: 'Políticas de créditos' }),
  ).toBeVisible()
  await sa.page.getByLabel('Distancia en metros').fill('4200')
  await sa.page.getByRole('button', { name: 'Calcular' }).click()
  await expect(
    sa.page.getByText(`${calculation.credits} créditos`).first(),
  ).toBeVisible()
  await sa.page
    .getByRole('link', { name: new RegExp(`^${'Entrega local'}`) })
    .first()
    .click()
  await expect(
    sa.page.getByText('Una versión publicada no se edita ni se elimina'),
  ).toBeVisible()
  for (const name of [/^Editar/, /^Eliminar/])
    await expect(sa.page.getByRole('button', { name })).toHaveCount(0)
  await consoleAudit(sa)
  pass()

  begin('PROVIDER_ADMIN reads its own credits and nothing else')
  const pa = await session()
  await uiLogin(pa, 'providerA')
  await pa.page.getByRole('link', { name: 'Créditos', exact: true }).click()
  await expect(pa.page.getByText('Saldo actual')).toBeVisible()
  const providerText = await pa.page.getByRole('main').innerText()
  assertNoMoney(providerText, 'the provider credits page')
  for (const name of ['Registrar recarga', 'Ajuste administrativo'])
    await expect(pa.page.getByRole('button', { name })).toHaveCount(0)
  await pa.page.goto(`${web}/credit-policies`)
  await expect(
    pa.page.getByRole('heading', { name: 'Sin permisos' }),
  ).toBeVisible()
  assert.ok(
    pa.requests.every((url) => !url.includes('/api/v1/admin/')),
    'The provider never called an administrative route',
  )
  await consoleAudit(pa)
  pass()

  begin('DRIVER reads its own credits in the portal')
  await login('driver').catch(() => {
    throw new Error(
      'Configure a local independent DRIVER account (E2E_DRIVER_EMAIL)',
    )
  })
  const driverAccount = await api('driver', '/driver/credits', 'GET', undefined)
  const dr = await session()
  await uiLogin(dr, 'driver')
  await dr.page.goto(`${web}/driver/credits`)
  if (driverAccount.status === 200) {
    await expect(dr.page.getByText('Saldo actual')).toBeVisible()
    assertNoMoney(
      await dr.page.getByRole('main').innerText(),
      'the driver credits page',
    )
  } else {
    // A fleet driver has no own account: the UI says so instead of showing a zero balance.
    assert.equal(driverAccount.data.code, 'CREDIT_ACCOUNT_NOT_FOUND')
    await expect(dr.page.getByText('Sin cuenta de créditos')).toBeVisible()
    await expect(dr.page.getByText('0 créditos')).toHaveCount(0)
  }
  for (const path of ['/credit-policies', `/providers/${providerId}`]) {
    await dr.page.goto(`${web}${path}`)
    await expect(
      dr.page.getByRole('heading', { name: 'Sin permisos' }),
    ).toBeVisible()
  }
  await api(
    'driver',
    `/admin/providers/${providerId}/credits`,
    'GET',
    undefined,
    403,
  )
  await api(
    'driver',
    `/provider/credits?providerId=${providerId}`,
    'GET',
    undefined,
    403,
  )
  assert.ok(
    dr.requests.every((url) => !url.includes('/api/v1/admin/')),
    'The driver never called an administrative route',
  )
  await consoleAudit(dr)
  pass()

  begin('Responsive credit surfaces and no secret in storage or URL')
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await sa.page.setViewportSize({ width, height })
    await sa.page.goto(`${web}/providers/${providerId}`)
    await expect(region(sa, 'Créditos Mandaria').first()).toBeVisible()
    await noHorizontalOverflow(sa)
    await sa.page.screenshot({
      path: `${output}/provider-credits-${width}.png`,
      fullPage: true,
    })
    await pa.page.setViewportSize({ width, height })
    await pa.page.goto(`${web}/provider/credits`)
    await expect(pa.page.getByText('Saldo actual')).toBeVisible()
    await noHorizontalOverflow(pa)
  }
  await sa.page.setViewportSize({ width: 1440, height: 1000 })
  for (const state of sessions) {
    const stored = await state.page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    )
    const parsed = JSON.parse(stored)
    assert.deepEqual(parsed.local, {})
    assert.ok(
      Object.keys(parsed.session).every((k) => k === 'mandaria.refresh'),
    )
    for (const value of sensitive)
      assert.ok(
        !stored.includes(value) || value === parsed.session['mandaria.refresh'],
        'A secret leaked into storage',
      )
    assert.ok(!state.page.url().includes('token'), 'No token in the URL')
  }
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
  console.error(message.split('\n').slice(0, 8).join('\n'))
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
  // Compensate anything a failed run left behind, so local balances stay as they were.
  for (const movement of restore)
    await api(
      'admin',
      `/admin/providers/${providerId}/credits/adjustment`,
      'POST',
      movement,
      undefined,
      { 'Idempotency-Key': randomUUID() },
    ).catch(() => undefined)
  for (const who of Object.keys(tokens))
    await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens[who].refreshToken }),
    }).catch(() => undefined)
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
