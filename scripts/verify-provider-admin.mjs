import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// This test only authenticates real accounts and reads existing resources.
// The only writes are auth login/refresh/logout for sessions created by this run.
// Never save storageState, HAR, traces, response bodies, passwords or tokens.
const values = {
  ...(process.env.MANDARIA_BACKEND_ENV
    ? parseEnv(readFileSync(process.env.MANDARIA_BACKEND_ENV, 'utf8'))
    : {}),
  ...(existsSync('.env.e2e') ? parseEnv(readFileSync('.env.e2e', 'utf8')) : {}),
  ...process.env,
}
const web = values.E2E_WEB_URL || 'http://127.0.0.1:5173'
const api = `${values.E2E_API_URL || 'http://localhost:3000'}/api/v1`
const accounts = {
  a: {
    email: values.E2E_PROVIDER_EMAIL || 'provider-admin-a@mandaria.local',
    password:
      values.E2E_PROVIDER_PASSWORD || values.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  b: {
    email: values.E2E_PROVIDER_B_EMAIL || 'provider-admin-b@mandaria.local',
    password:
      values.E2E_PROVIDER_B_PASSWORD || values.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  none: {
    email:
      values.E2E_UNASSIGNED_EMAIL ||
      'provider-admin-sin-membership@mandaria.local',
    password:
      values.E2E_UNASSIGNED_PASSWORD || values.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  admin: {
    email: values.E2E_ADMIN_EMAIL || values.BOOTSTRAP_ADMIN_EMAIL,
    password: values.E2E_ADMIN_PASSWORD || values.BOOTSTRAP_ADMIN_PASSWORD,
  },
}
if (
  Object.values(accounts).some((account) => !account.email || !account.password)
) {
  console.error(
    'Configure the four real test accounts in .env.e2e or MANDARIA_BACKEND_ENV. No credentials were printed.',
  )
  process.exit(1)
}
const forbiddenValues = new Set(
  Object.entries(values)
    .filter(
      ([key, value]) =>
        /PASSWORD|SECRET/.test(key) &&
        typeof value === 'string' &&
        value.length > 8,
    )
    .map(([, value]) => value),
)
const tokens = new Set()
const report = {
  checks: [],
  failures: [],
  backendStatuses: [],
  observedAccessLifetimeSeconds: null,
  mutations:
    'Only authentication sessions created by this test; no provider, user, integration or membership changes.',
}
const output = 'test-results/provider-admin'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch()
const sessions = []
let phase = 'startup'
function begin(name) {
  phase = name
  console.log(`CHECK ${name}`)
}
function pass(name = phase) {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
async function makeSession() {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 950 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const state = {
    context,
    page,
    auth: null,
    user: null,
    profiles: null,
    network: [],
    console: [],
    pageErrors: 0,
    pending: [],
  }
  sessions.push(state)
  page.on('console', (entry) =>
    state.console.push({ type: entry.type(), text: entry.text() }),
  )
  page.on('pageerror', () => {
    state.pageErrors++
  })
  page.on('request', (request) => {
    const address = new URL(request.url())
    if (address.pathname.startsWith('/api/v1'))
      state.network.push({
        method: request.method(),
        path: address.pathname,
        status: null,
      })
    if (
      [...forbiddenValues, ...tokens].some((secret) =>
        request.url().includes(secret),
      ) ||
      /password|clientSecret|accessToken|refreshToken/i.test(address.search)
    ) {
      report.failures.push('Sensitive information in network URL')
    }
  })
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (!path.startsWith('/api/v1')) return
    state.network.push({
      method: response.request().method(),
      path,
      status: response.status(),
    })
    const pending = (async () => {
      if (!response.ok()) return
      if (path.endsWith('/auth/login') || path.endsWith('/auth/refresh')) {
        state.auth = await response.json()
        tokens.add(state.auth.accessToken)
        tokens.add(state.auth.refreshToken)
      } else if (path.endsWith('/auth/me')) state.user = await response.json()
      else if (path.endsWith('/provider/profiles'))
        state.profiles = await response.json()
    })().catch(() => {
      report.failures.push('Could not inspect an API response')
    })
    state.pending.push(pending)
  })
  return state
}
async function settle(state) {
  await Promise.all(state.pending)
  state.pending = []
}
async function login(state, account, role) {
  await state.page.goto(`${web}/login`)
  await state.page.getByLabel('Correo electrónico').fill(account.email)
  await state.page
    .getByLabel('Contraseña', { exact: true })
    .fill(account.password)
  await state.page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await state.page.waitForURL('**/dashboard')
  await expect(
    state.page.getByRole('heading', {
      name:
        role === 'SUPER_ADMIN' ? 'Vista general' : 'Bienvenido a tu operación.',
    }),
  ).toBeVisible()
  if (role === 'PROVIDER_ADMIN')
    await expect
      .poll(async () => {
        await settle(state)
        return state.profiles !== null
      })
      .toBe(true)
  await settle(state)
  assert.ok(
    state.user?.role === role &&
      state.user?.email === account.email &&
      state.user?.active === true,
    'Backend identity mismatch',
  )
  assert.ok(
    state.auth?.accessToken && state.auth?.refreshToken,
    'Missing real tokens',
  )
}
async function logout(state) {
  await state.page.locator('.user-trigger').click()
  const response = state.page.waitForResponse(
    (item) => new URL(item.url()).pathname === '/api/v1/auth/logout',
  )
  await state.page.getByRole('button', { name: 'Cerrar sesión' }).click()
  assert.equal((await response).status(), 204)
  await state.page.waitForURL('**/login')
  assert.equal(
    await state.page.evaluate(() => sessionStorage.getItem('mandaria.refresh')),
    null,
  )
  state.auth = null
}
async function storageAudit(state) {
  const storage = await state.page.evaluate(async () => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    databases: await indexedDB.databases(),
  }))
  assert.equal(Object.keys(storage.local).length, 0, 'Unexpected localStorage')
  assert.equal(storage.databases.length, 0, 'Unexpected IndexedDB')
  assert.ok(
    Object.keys(storage.session).every((key) => key === 'mandaria.refresh'),
    'Unexpected sessionStorage key',
  )
  assert.ok(
    ![...forbiddenValues].some((secret) =>
      JSON.stringify(storage).includes(secret),
    ),
    'Sensitive value persisted',
  )
  assert.ok(
    !JSON.stringify(storage).includes('clientSecret'),
    'B2B secret persisted',
  )
  if (state.auth)
    assert.ok(
      storage.session['mandaria.refresh'] === state.auth.refreshToken,
      'Session does not follow V1.3 storage strategy',
    )
  assert.equal(state.pageErrors, 0, 'Uncaught browser error')
  assert.ok(
    !state.console.some((entry) =>
      [...tokens, ...forbiddenValues].some((secret) =>
        entry.text.includes(secret),
      ),
    ),
    'Sensitive console output',
  )
  const unexpected = state.console.filter(
    (entry) =>
      entry.type === 'error' &&
      !/^Failed to load resource: the server responded with a status of (401|403)\b/.test(
        entry.text,
      ),
  )
  assert.equal(unexpected.length, 0, 'Unexpected console error')
  assert.ok(
    !state.network.some(
      (request) =>
        request.method !== 'GET' && !request.path.startsWith('/api/v1/auth/'),
    ),
    'Privileged mutation sent',
  )
}
async function allowedNavigation(state) {
  await expect(
    state.page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link'),
  ).toHaveText(['Dashboard', 'Mi proveedor', 'Mi perfil'])
  for (const label of [
    'Integraciones',
    'Proveedores',
    'Administradores',
    'Configuración',
  ])
    await expect(
      state.page.getByRole('link', { name: label, exact: true }),
    ).toHaveCount(0)
  assert.ok(
    !state.network.some(
      (entry) =>
        entry.path.startsWith('/api/v1/admin/') ||
        entry.path === '/api/v1/users',
    ),
    'Provider UI fetched global data',
  )
}
async function directDenied(state, path) {
  // A read-only authenticated request tests the real backend guard independently
  // of the frontend router. Credentials come from that page's actual login.
  const status = await state.page.evaluate(
    async ({ url, token }) => {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      return response.status
    },
    { url: `${api}${path}`, token: state.auth.accessToken },
  )
  report.backendStatuses.push({ path, status })
  assert.equal(status, 403, 'Backend must independently deny provider admin')
}
async function profileMatches(state, expected) {
  await expect(
    state.page.getByRole('heading', { name: expected.name, exact: true }),
  ).toBeVisible()
  for (const [label, expectedValue] of [
    ['Tipo', expected.type === 'FLEET' ? 'Flotilla' : 'Independiente'],
    ['Máximo de repartidores', String(expected.limits.maxDrivers)],
    ['Máximo de vehículos', String(expected.limits.maxVehicles)],
  ]) {
    await expect(
      state.page
        .locator('.info-grid > div')
        .filter({ has: state.page.locator('dt', { hasText: label }) })
        .locator('dd'),
    ).toHaveText(expectedValue)
  }
}
async function waitUntilExpired(state) {
  const payload = JSON.parse(
    Buffer.from(state.auth.accessToken.split('.')[1], 'base64url').toString(),
  )
  const remaining = Math.max(0, payload.exp * 1000 + 1200 - Date.now())
  console.log(
    `Waiting for actual access-token expiry (${Math.ceil(remaining / 1000)} seconds); no token or role changes`,
  )
  let wait = remaining
  while (wait > 0) {
    const duration = Math.min(wait, 30000)
    await new Promise((resolve) => setTimeout(resolve, duration))
    wait -= duration
  }
}
let a
try {
  begin('PROVIDER_ADMIN real login and backend identity')
  a = await makeSession()
  await login(a, accounts.a, 'PROVIDER_ADMIN')
  report.observedAccessLifetimeSeconds = a.auth.expiresIn
  assert.equal(
    a.profiles.total,
    1,
    'Account A must have exactly its prepared membership',
  )
  const providerA = a.profiles.items[0]
  await profileMatches(a, providerA)
  pass()
  begin('Dashboard and sidebar contain only authorized data')
  await allowedNavigation(a)
  await storageAudit(a)
  pass()
  begin('Mi proveedor and perfil preserve the real identity')
  await a.page.getByRole('link', { name: 'Mi proveedor', exact: true }).click()
  await profileMatches(a, providerA)
  await a.page.getByRole('link', { name: 'Mi perfil', exact: true }).click()
  await expect(
    a.page.getByText(accounts.a.email, { exact: true }).last(),
  ).toBeVisible()
  await a.page.getByRole('link', { name: 'Mi proveedor', exact: true }).click()
  await profileMatches(a, providerA)
  pass()
  begin('Reload rotates the real refresh token and preserves PROVIDER_ADMIN')
  const before = a.auth.refreshToken
  const refreshed = a.page.waitForResponse(
    (response) =>
      response.url().endsWith('/auth/refresh') && response.status() === 200,
  )
  await a.page.reload()
  await refreshed
  await profileMatches(a, providerA)
  await settle(a)
  assert.ok(a.auth.refreshToken !== before && a.user.role === 'PROVIDER_ADMIN')
  pass()
  begin('Resolve Provider B through its own real account')
  const b = await makeSession()
  await login(b, accounts.b, 'PROVIDER_ADMIN')
  assert.equal(b.profiles.total, 1)
  const providerB = b.profiles.items[0]
  assert.notEqual(providerB.id, providerA.id)
  await profileMatches(b, providerB)
  await storageAudit(b)
  await logout(b)
  pass()
  begin(
    'Manual SUPER_ADMIN URLs are denied without privileged fetch or content flash',
  )
  const protectedRoutes = [
    '/integrations',
    '/integrations/new',
    `/integrations/${providerB.id}`,
    '/providers',
    '/providers/new',
    `/providers/${providerB.id}`,
    '/users',
    '/settings',
  ]
  await a.page.addInitScript(() => {
    window.__privilegedFlash = false
    const inspect = () => {
      if (
        document.querySelector(
          'table, .stat-grid, .quick-links, .form-panel, .scope-options',
        )
      )
        window.__privilegedFlash = true
    }
    new MutationObserver(inspect).observe(document, {
      subtree: true,
      childList: true,
    })
  })
  for (const path of protectedRoutes) {
    await a.page.goto(`${web}${path}`)
    await expect(
      a.page.getByRole('heading', { name: 'Sin permisos', exact: true }),
    ).toBeVisible()
    assert.equal(
      await a.page.evaluate(() => window.__privilegedFlash),
      false,
      'Privileged content flash',
    )
    await allowedNavigation(a)
  }
  pass()
  begin('Provider B URL produces real backend 403 and safe UI')
  const denied = a.page.waitForResponse((response) =>
    response
      .url()
      .includes(`/api/v1/provider/profile?providerId=${providerB.id}`),
  )
  await a.page.goto(`${web}/provider/profile?providerId=${providerB.id}`)
  assert.equal((await denied).status(), 403)
  await expect(
    a.page.getByRole('heading', { name: '403 — Sin permisos' }),
  ).toBeVisible()
  await expect(
    a.page.getByRole('heading', { name: providerB.name, exact: true }),
  ).toHaveCount(0)
  await expect(a.page.locator('pre')).toHaveCount(0)
  await a.page.screenshot({
    path: `${output}/provider-b-forbidden.png`,
    fullPage: true,
    animations: 'disabled',
  })
  pass()
  begin(
    'Backend independently rejects integrations, credentials, global providers and users',
  )
  for (const path of [
    '/admin/integrations',
    `/admin/integrations/${providerB.id}/credentials`,
    '/admin/providers',
    `/admin/providers/${providerB.id}`,
    '/users',
  ])
    await directDenied(a, path)
  await storageAudit(a)
  pass()
  begin('Account without membership is safe and shows no arbitrary provider')
  const none = await makeSession()
  await login(none, accounts.none, 'PROVIDER_ADMIN')
  assert.equal(none.profiles.total, 0)
  await expect(
    none.page.getByText('Aún no tienes un proveedor asociado'),
  ).toBeVisible()
  await none.page
    .getByRole('link', { name: 'Mi proveedor', exact: true })
    .click()
  await expect(
    none.page.getByText('Aún no tienes un proveedor asociado'),
  ).toBeVisible()
  await none.page.goto(`${web}/provider/profile?providerId=${providerA.id}`)
  await expect(
    none.page.getByText('Aún no tienes un proveedor asociado'),
  ).toBeVisible()
  await allowedNavigation(none)
  await directDenied(none, `/provider/profile?providerId=${providerA.id}`)
  await storageAudit(none)
  await none.page.screenshot({
    path: `${output}/no-membership.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await logout(none)
  pass()
  begin(
    'Expired access token triggers real 401, refresh 200 and successful retry',
  )
  await a.page.goto(`${web}/provider/profile`)
  await profileMatches(a, providerA)
  await settle(a)
  // Stay on the same document: reload would refresh proactively instead of testing 401.
  await a.page.getByRole('link', { name: 'Mi perfil', exact: true }).click()
  await waitUntilExpired(a)
  const requestStart = a.network.length
  const retried = a.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/v1/provider/profile' &&
      response.status() === 200,
  )
  await a.page.getByRole('link', { name: 'Mi proveedor', exact: true }).click()
  await retried
  await profileMatches(a, providerA)
  await settle(a)
  const cycle = a.network.slice(requestStart)
  assert.ok(
    cycle.some((entry) => entry.status === 401),
    'No actual 401 observed',
  )
  assert.ok(
    cycle.some(
      (entry) => entry.path.endsWith('/auth/refresh') && entry.status === 200,
    ),
    'No successful refresh observed',
  )
  assert.ok(
    cycle.some(
      (entry) =>
        entry.path.endsWith('/provider/profile') && entry.status === 200,
    ),
    'No successful retry observed',
  )
  assert.equal(a.user.role, 'PROVIDER_ADMIN')
  pass()
  begin('Revoked refresh token expires the session safely')
  // Revoke only this test session through the real logout endpoint. Storage is untouched.
  const revocation = await fetch(`${api}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: a.auth.refreshToken }),
  })
  assert.equal(revocation.status, 204)
  const refreshDenied = a.page.waitForResponse(
    (response) =>
      response.url().endsWith('/auth/refresh') && response.status() === 401,
  )
  await a.page.reload()
  await refreshDenied
  await a.page.waitForURL('**/login')
  await expect(
    a.page.getByText('Tu sesión expiró. Inicia sesión nuevamente.'),
  ).toBeVisible()
  assert.equal(await a.page.evaluate(() => sessionStorage.length), 0)
  a.auth = null
  await storageAudit(a)
  pass()
  begin('PROVIDER_ADMIN login again and explicit logout')
  await login(a, accounts.a, 'PROVIDER_ADMIN')
  await profileMatches(a, providerA)
  await a.page.screenshot({
    path: `${output}/provider-dashboard.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await storageAudit(a)
  await logout(a)
  await a.page.goto(`${web}/provider/profile`)
  await a.page.waitForURL('**/login')
  pass()
  begin(
    'SUPER_ADMIN regression: login, dashboard, integrations, providers and navigation',
  )
  await login(a, accounts.admin, 'SUPER_ADMIN')
  for (const name of [
    'Integraciones',
    'Proveedores',
    'Administradores',
    'Configuración',
  ])
    await expect(a.page.getByRole('link', { name, exact: true })).toBeVisible()
  await expect(
    a.page.getByRole('heading', { name: 'Proveedores recientes' }),
  ).toBeVisible()
  await a.page.getByRole('link', { name: 'Integraciones', exact: true }).click()
  await expect(
    a.page.getByRole('heading', { name: 'Clientes B2B' }),
  ).toBeVisible()
  await a.page.getByRole('link', { name: 'Proveedores', exact: true }).click()
  await expect(
    a.page.getByRole('heading', { name: 'Tu red logística' }),
  ).toBeVisible()
  await expect(
    a.page.getByRole('link', { name: 'Nuevo proveedor', exact: true }),
  ).toBeVisible()
  await a.page.screenshot({
    path: `${output}/super-admin-regression.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await storageAudit(a)
  await logout(a)
  pass()
  assert.equal(report.failures.length, 0)
  report.expectedConsoleResponses = sessions.reduce(
    (count, state) =>
      count + state.console.filter((entry) => entry.type === 'error').length,
    0,
  )
  pass(
    'Storage, console, IndexedDB and network URL audit; no sensitive values persisted',
  )
} catch (error) {
  report.failures.push(
    `${phase}: ${error instanceof Error ? error.name : 'Unknown error'}`,
  )
  console.error(
    `FAIL ${phase}. Diagnostic details were not printed to avoid exposing sensitive data.`,
  )
  const frame =
    error instanceof Error
      ? error.stack
          ?.split('\n')
          .find((line) => /verify-provider-admin\.mjs:\d+:\d+/.test(line))
      : undefined
  if (frame) console.error(frame.trim())
  for (const [index, state] of sessions.entries()) {
    await state.page
      .screenshot({
        path: `${output}/failure-session-${index}.png`,
        fullPage: true,
        mask: [state.page.locator('input'), state.page.locator('textarea')],
        animations: 'disabled',
      })
      .catch(() => undefined)
  }
  if (a)
    await a.page
      .screenshot({
        path: `${output}/failure-masked.png`,
        fullPage: true,
        mask: [a.page.locator('input'), a.page.locator('textarea')],
        animations: 'disabled',
      })
      .catch(() => undefined)
  process.exitCode = 1
} finally {
  for (const state of sessions) {
    await settle(state)
    if (state.auth?.refreshToken)
      await fetch(`${api}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.auth.refreshToken }),
      }).catch(() => undefined)
  }
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
