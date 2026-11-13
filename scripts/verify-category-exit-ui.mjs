// Browser/component acceptance with explicitly mocked HTTP. NOT backend integration.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const out = 'docs/evidence/driver-exit-ui-20261028'
mkdirSync(out, { recursive: true })
const origin = 'http://127.0.0.1:4269'
const ids = {
  actor: '10000000-0000-4000-8000-000000000001',
  provider: '10000000-0000-4000-8000-000000000002',
  driver: '10000000-0000-4000-8000-000000000003',
  affiliation: '10000000-0000-4000-8000-000000000004',
  exit: '10000000-0000-4000-8000-000000000005',
  receipt: '10000000-0000-4000-8000-000000000006',
}
const at = '2026-10-28T21:00:00.000Z'
const category = (c = 'FLEET') => ({
  contractVersion: '1.0.0',
  categoryRevision: '9007199254740993',
  category: c,
  providerId: c === 'FLEET' ? ids.provider : null,
  independentMembershipState: c === 'INDEPENDENT' ? 'CURRENT' : null,
  independentApprovalStatus: c === 'INDEPENDENT' ? 'SUSPENDED' : null,
  resolutionRequired: c === 'REVIEW_REQUIRED',
})
let state = 'ACTIVE',
  cat = 'FLEET',
  receipt,
  lose = true
const summary = () => ({
  id: ids.exit,
  affiliationId: ids.affiliation,
  driverId: ids.driver,
  providerId: ids.provider,
  status: state === 'ENDED' ? 'COMPLETED' : 'PENDING',
  revision: '9007199254740994',
  requestedAt: at,
  completedAt: state === 'ENDED' ? at : null,
  initiatedByKinds: ['DRIVER_REQUEST'],
  blockers: state === 'ENDED' ? [] : [{ code: 'ACTIVE_ASSIGNMENT' }],
  hasPendingEconomics: true,
  capabilities: {
    canRecheck: state !== 'ENDED',
    recheckReason: state === 'ENDED' ? 'EXIT_COMPLETED' : null,
  },
  lastEvaluatedAt: at,
})
const context = () => ({
  schemaVersion: 1,
  serverTime: at,
  affiliation:
    state === 'ENDED'
      ? null
      : {
          id: ids.affiliation,
          driverId: ids.driver,
          providerId: ids.provider,
          state,
          revision: '9007199254740993',
          startedAt: null,
          observedAt: at,
        },
  exit: state === 'ACTIVE' ? null : summary(),
  capabilities: {
    canRequestExit: state === 'ACTIVE',
    requestExitReason: state === 'ACTIVE' ? null : 'EXIT_ALREADY_REQUESTED',
  },
})
const user = {
  id: ids.actor,
  email: 'driver@example.test',
  role: 'DRIVER',
  active: true,
  emailVerifiedAt: at,
  createdAt: at,
  updatedAt: at,
}
const records = [],
  errors = [],
  checks = []
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4269, strictPort: true },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', async (route) => {
    const r = route.request(),
      u = new URL(r.url())
    if (u.origin !== origin) return route.abort()
    if (!u.pathname.startsWith('/api/v1/')) return route.continue()
    const p = u.pathname.slice(7),
      method = r.method()
    records.push({ path: p, method })
    const reply = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (p === '/auth/login' || p === '/auth/refresh')
      return reply({
        accessToken: 'synthetic-ui-token',
        refreshToken: 'synthetic-ui-refresh',
      })
    if (p === '/auth/me')
      return reply({ accessMode: 'STANDARD', identity: user })
    if (p === '/driver/me')
      return reply({
        id: ids.driver,
        name: 'Conductor sintético',
        status: 'ACTIVE',
        availability: 'OFFLINE',
        provider:
          cat === 'FLEET'
            ? { id: ids.provider, name: 'Flotilla sintética' }
            : null,
        currentAssignment: null,
        activeDeliveryAssignment: null,
        independent: null,
        driverCategory: category(cat),
      })
    if (p === '/driver/fleet-affiliation-context') return reply(context())
    if (p === '/driver/fleet-exit-requests')
      return reply({
        items: state === 'ACTIVE' ? [] : [summary()],
        nextPageToken: null,
        asOf: at,
      })
    if (p === '/driver/fleet-exit-notices')
      return reply({
        items:
          state === 'ACTIVE'
            ? []
            : [
                {
                  id: ids.receipt,
                  exitId: ids.exit,
                  type: state === 'ENDED' ? 'COMPLETED' : 'REQUESTED',
                  createdAt: at,
                },
              ],
        nextPageToken: null,
        asOf: at,
      })
    if (p === '/driver/fleet-exit-requests/' + ids.exit)
      return reply({ ...summary(), notices: [] })
    if (p.startsWith('/fleet-exit-attempts/'))
      return reply({
        schemaVersion: 1,
        key: receipt.key,
        operation: receipt.operation,
        resourceType: receipt.resourceType,
        resourceId: receipt.resourceId,
        status: 'APPLIED',
        receipt,
        redacted: false,
      })
    if (
      p ===
      '/driver/fleet-affiliations/' + ids.affiliation + '/exit-requests'
    ) {
      assert.deepEqual(r.postDataJSON(), {
        expectedAffiliationRevision: '9007199254740993',
        reasonCode: 'VOLUNTARY_EXIT',
      })
      assert.ok(r.headers()['idempotency-key'])
      assert.equal(u.search, '')
      state = 'EXIT_PENDING'
      receipt = {
        schemaVersion: 1,
        receiptId: ids.receipt,
        key: r.headers()['idempotency-key'],
        operation: 'START',
        resourceType: 'AFFILIATION',
        resourceId: ids.affiliation,
        status: 'APPLIED',
        exitId: ids.exit,
        exitRevision: '9007199254740994',
        exitStatus: 'PENDING',
        appliedAt: at,
      }
      if (lose) {
        lose = false
        return route.abort('failed')
      }
      return reply(receipt)
    }
    return reply({ code: 'MOCK_ROUTE_NOT_DEFINED' }, 404)
  })
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill(user.email)
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill('Synthetic-ui-only-123')
  await page.getByRole('button', { name: /Iniciar sesión|Entrar/ }).click()
  await page.goto(origin + '/driver/fleet-exits')
  await expect(
    page.getByRole('button', { name: 'Solicitar mi salida voluntaria' }),
  ).toBeVisible()
  await page.screenshot({ path: out + '/01-active-mock.png', fullPage: true })
  checks.push(
    'DRIVER own route ACTIVE; explicit voluntary exit without owner veto',
  )
  await page
    .getByRole('button', { name: 'Solicitar mi salida voluntaria' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await expect
    .poll(
      () =>
        records.filter(
          (r) => r.method === 'POST' && r.path.endsWith('/exit-requests'),
        ).length,
    )
    .toBe(1)
  await page.reload()
  const recovery = page.getByRole('button', { name: /Consultar intento/ })
  await expect(recovery).toBeVisible()
  await recovery.click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await expect(
    page.getByText(/La desvinculación sigue pendiente/),
  ).toBeVisible()
  assert.equal(
    records.filter(
      (r) => r.method === 'POST' && r.path.endsWith('/exit-requests'),
    ).length,
    1,
  )
  await page.screenshot({
    path: out + '/02-pending-recovered-mock.png',
    fullPage: true,
  })
  checks.push(
    'Lost mock response; reload reads IndexedDB; GET recovery by affiliation; APPLIED/PENDING; one START',
  )
  state = 'ENDED'
  cat = 'NONE'
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Categoría vigente' }),
  ).toContainText('NONE')
  await page.screenshot({
    path: out + '/03-ended-none-mock.png',
    fullPage: true,
  })
  checks.push(
    'COMPLETED/ENDED leaves NONE; no independent approval or reception command',
  )
  cat = 'INDEPENDENT'
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Categoría vigente' }),
  ).toContainText('transición de independiente a flotilla está bloqueada')
  await page.screenshot({
    path: out + '/04-independent-suspended-mock.png',
    fullPage: true,
  })
  checks.push(
    'Suspended independent keeps category; reverse transition explicitly blocked',
  )
  cat = 'REVIEW_REQUIRED'
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Categoría vigente' }),
  ).toContainText('REVIEW_REQUIRED')
  await page.screenshot({
    path: out + '/05-review-required-mock.png',
    fullPage: true,
  })
  checks.push(
    'Ambiguous legacy displayed without automatic resolution (mock only)',
  )
  assert.equal(errors.length, 0)
  writeFileSync(
    out + '/results.json',
    JSON.stringify(
      {
        scope: 'Browser UI with mocked HTTP only; NO live backend integration',
        checks,
        passed: checks.length,
        failed: 0,
        errors,
        requests: records,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await browser?.close()
  await server.close()
}
