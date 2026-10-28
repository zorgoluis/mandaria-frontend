// Real Web + real Nest HTTP + disposable PostgreSQL in WSL. No external services.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
const output = `test-results/fleet-exit-http-${Date.now()}`
await mkdir(output, { recursive: true })
const wslPath = resolve('scripts/fleet-exit-http-wsl.mjs')
  .replaceAll('\\', '/')
  .replace(/^C:/i, '/mnt/c')
const child = spawn(
  'wsl.exe',
  [
    '-d',
    'Mandaria-Postgres',
    '--',
    '/opt/mandaria-node/node-v24.15.0-linux-x64/bin/node',
    wslPath,
  ],
  { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
)
const pending = new Map()
let next = 0,
  readyResolve,
  readyReject,
  readyInfo,
  browser,
  server,
  exited = false
const ready = new Promise((yes, no) => {
  readyResolve = yes
  readyReject = no
})
const report = {
  scope:
    'real Web/Nest HTTP/PostgreSQL; synthetic identities/data; external routing/mail simulated',
  output,
  checks: [],
  networkErrors: [],
  complete: false,
}
const reqs = []
const request = (action, args = {}) =>
  new Promise((yes, no) => {
    const id = ++next
    const timer = setTimeout(() => {
      pending.delete(id)
      no(Error('Fixture control timeout: ' + action))
    }, 45000)
    pending.set(id, {
      yes: (v) => {
        clearTimeout(timer)
        yes(v)
      },
      no: (e) => {
        clearTimeout(timer)
        no(e)
      },
    })
    child.stdin.write(JSON.stringify({ id, action, ...args }) + '\n')
  })
const lines = createInterface({ input: child.stdout })
lines.on('line', (line) => {
  let value
  try {
    value = JSON.parse(line)
  } catch {
    return
  }
  if (value.stage === 'ready') {
    readyInfo = value
    readyResolve(value)
  } else if (value.stage === 'failed') readyReject(Error(value.message))
  else if (value.stage === 'closed') {
    report.processClosed = true
  } else if (value.stage) {
    console.log(value.stage)
    report.database = value
  } else if (value.id) {
    const p = pending.get(value.id)
    pending.delete(value.id)
    if (value.error) p?.no(Error(value.error))
    else p?.yes(value.result)
  }
})
let stderr = ''
child.stderr.on('data', (b) => {
  stderr += b.toString()
})
child.on('exit', (code) => {
  exited = true
  if (!readyInfo) readyReject(Error('WSL exited before ready: ' + code))
  for (const p of pending.values()) p.no(Error('WSL closed'))
  pending.clear()
})
const readyTimer = setTimeout(
  () => readyReject(Error('Isolated startup timeout')),
  180000,
)
try {
  const info = await ready
  clearTimeout(readyTimer)
  const { providers, drivers } = info.ids
  report.database = {
    name: info.database,
    directory: info.data,
    migrations: info.migrations,
    apiPort: info.apiPort,
  }
  console.log('Real backend ready with synthetic fixture')
  server = await createServer({
    configFile: false,
    envDir: false,
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4238'),
    },
    server: {
      host: '127.0.0.1',
      port: 4238,
      strictPort: true,
      proxy: { '/api': 'http://127.0.0.1:4237' },
    },
  })
  await server.listen()
  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(20000)

  page.on('pageerror', (e) => report.networkErrors.push(e.message))
  let lose = false,
    drop = false,
    lateRequest,
    lastResult
  const posts = []
  await page.route('**/*', async (route) => {
    const r = route.request(),
      u = new URL(r.url())
    if (u.origin !== 'http://127.0.0.1:4238') {
      report.networkErrors.push('External origin blocked')
      return route.abort()
    }
    if (u.pathname.startsWith('/api/'))
      reqs.push({ method: r.method(), path: u.pathname })
    if (r.method() === 'POST' && u.pathname.includes('/fleet-affiliations/')) {
      posts.push({
        path: u.pathname,
        key: r.headers()['idempotency-key'],
        body: r.postDataJSON(),
      })
      if (drop) {
        drop = false
        lateRequest = {
          url: r.url(),
          headers: r.headers(),
          data: r.postDataJSON(),
        }
        return route.abort('failed')
      }
      if (lose) {
        lose = false
        const response = await route.fetch()
        assert.equal(response.status(), 200)
        lastResult = await response.json()
        return route.abort('failed')
      }
    }
    return route.continue()
  })
  const open = (path) => page.goto('http://127.0.0.1:4238' + path)
  const loginTimes = []
  const login = async (email, loginPage = page) => {
    // Respect the real auth controller's five logins per minute per IP.
    if (loginTimes.length >= 5) {
      const wait = 61000 - (Date.now() - loginTimes[loginTimes.length - 5])
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    }
    loginTimes.push(Date.now())
    console.log('browser-login')
    await loginPage.goto('http://127.0.0.1:4238/login')
    await loginPage.evaluate(() => sessionStorage.clear())
    await loginPage.reload()
    await loginPage.getByLabel('Correo electrónico').fill(email)
    await loginPage
      .getByLabel('Contraseña', { exact: true })
      .fill(info.credentials.password)
    for (let attempt = 0; attempt < 3; attempt++) {
      const received = loginPage.waitForResponse(
        (r) =>
          r.url().endsWith('/auth/login') && r.request().method() === 'POST',
      )
      await loginPage
        .getByRole('button', { name: 'Iniciar sesión', exact: true })
        .click()
      const response = await received
      if (response.status() !== 429) {
        assert.equal(response.status(), 200)
        break
      }
      const seconds = Number(response.headers()['retry-after']) || 60
      console.log('Respecting local authentication Retry-After')
      await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000))
    }
    await expect(loginPage).not.toHaveURL(/\/login$/, { timeout: 20000 })
  }
  const confirm = async () =>
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar', exact: true })
      .click()
  const acknowledge = async () => {
    if (
      !(await page
        .getByRole('button', { name: 'Reconocer resultado y continuar' })
        .count())
    )
      await page.getByRole('button', { name: 'Consultar intento' }).click()
    await page
      .getByRole('button', { name: 'Reconocer resultado y continuar' })
      .click()
    await expect(
      page.getByRole('button', { name: 'Consultar intento' }),
    ).toHaveCount(0)
  }

  const target = (driver) =>
    '/fleet-exits?providerId=' + providers.A + '&driverId=' + driver
  const start = async () => {
    await page
      .getByRole('button', {
        name: 'Solicitar retiro de flotilla',
        exact: true,
      })
      .click()
    await expect(page.getByRole('dialog')).toContainText('No transfiere')
    await confirm()
  }
  await login(info.credentials.email)
  await open('/fleet-exits')
  await expect(
    page.getByRole('heading', { name: 'Selecciona un proveedor' }),
  ).toBeVisible()
  report.checks.push('multiple-memberships-require-explicit-provider')
  const before = await request('exitMetrics', { driverId: drivers.carlos })
  await open(target(drivers.carlos))
  lose = true
  await start()
  await expect(
    page.getByRole('button', { name: 'Consultar intento' }),
  ).toBeVisible()
  await expect.poll(() => lastResult?.exitStatus).toBe('PENDING')
  assert.deepEqual(Object.keys(posts[0].body).sort(), [
    'expectedAffiliationRevision',
    'reasonCode',
  ])
  assert.equal(posts[0].body.reasonCode, 'PROVIDER_REMOVAL')
  const otherTab = await context.newPage()
  await login(info.credentials.email, otherTab)
  await otherTab.goto('http://127.0.0.1:4238' + target(drivers.carlos))
  await expect(
    otherTab.getByRole('button', { name: 'Consultar intento' }),
  ).toBeVisible()
  await expect(
    otherTab.getByRole('button', { name: 'Solicitar retiro de flotilla' }),
  ).toHaveCount(0)
  await otherTab.close()
  report.checks.push(
    'two-tabs-share-encrypted-original-intent-without-new-START',
  )
  await page.reload()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await expect(
    page.getByText(/Solicitud registrada. La desvinculación sigue pendiente/),
  ).toBeVisible()
  const pendingExitId = lastResult.exitId
  const after = await request('exitMetrics', { driverId: drivers.carlos })
  assert.equal(after.exits, 1)
  assert.equal(after.activeAssignments, before.activeAssignments)
  assert.equal(after.ledger, before.ledger)
  assert.equal(after.providerId, before.providerId)
  assert.equal(posts.length, 1)
  report.checks.push(
    'owner-START-lost-real-response-reload-recovers-by-affiliation-without-exitId-one-PENDING-active-service-preserved',
  )
  await page.getByRole('link', { name: 'Consultar salida actual' }).click()
  await expect(page).toHaveURL(/\/fleet-exits\/[0-9a-f-]+/)
  await expect(
    page.getByRole('link', { name: 'Volver a salidas' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Salida pendiente', exact: true }),
  ).toBeVisible()
  await acknowledge()
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 950 })
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: output + '/provider-pending-' + width + '.png',
      fullPage: true,
    })
  }
  await page.setViewportSize({ width: 1280, height: 950 })
  await page.getByRole('button', { name: 'Solicitar reevaluación' }).click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  report.checks.push('provider-RECHECK-keeps-PENDING-no-force-no-cancellation')
  await request('exitFlag', { enabled: false })
  await open(target(drivers.pedro))
  await expect(
    page.getByText('No se admiten nuevas solicitudes de salida.'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Solicitar retiro de flotilla' }),
  ).toHaveCount(0)
  report.checks.push('START-flag-off-retains-reading')
  await request('exitFlag', { enabled: true })
  await request('ownerRole', { role: 'ADMIN' })
  await page.reload()
  drop = true
  await start()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: UNKNOWN')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar intento técnico' }).click()
  await confirm()
  await expect(
    page.getByText('Estado del intento: CLOSED_NO_EFFECTS'),
  ).toBeVisible()
  const late = await context.request.post(lateRequest.url, {
    headers: lateRequest.headers,
    data: lateRequest.data,
  })
  assert.equal(late.status(), 409)
  assert.equal((await late.json()).code, 'ATTEMPT_CLOSED')
  lateRequest = undefined
  assert.equal(
    (await request('exitMetrics', { driverId: drivers.pedro })).exits,
    0,
  )
  await acknowledge()
  report.checks.push(
    'UNKNOWN-close-original-START-affiliation-tombstone-blocks-late-request',
  )
  const luisBefore = await request('exitMetrics', { driverId: drivers.pedro })
  await start()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await page.getByRole('link', { name: 'Consultar salida actual' }).click()
  await expect(page).toHaveURL(/\/fleet-exits\/[0-9a-f-]+/)
  await expect(
    page.getByRole('heading', {
      name: 'Desvinculación completada',
      exact: true,
    }),
  ).toBeVisible()
  const luisAfter = await request('exitMetrics', { driverId: drivers.pedro })
  assert.equal(luisAfter.exits, 1)
  assert.equal(luisAfter.userId, luisBefore.userId)
  assert.equal(luisAfter.userActive, true)
  assert.equal(luisAfter.providerId, null)
  assert.equal(luisAfter.availability, 'OFFLINE')
  assert.equal(luisAfter.mode, 'NONE')
  assert.equal(luisAfter.activePairings, 0)
  assert.equal(luisAfter.independentProfiles, luisBefore.independentProfiles)
  assert.equal(luisAfter.ledger, luisBefore.ledger)
  await expect(
    page.getByRole('region', { name: 'Elegibilidad independiente' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Asistencia y conciliación histórica' }),
  ).toBeVisible()
  const completedUrl = new URL(page.url()).pathname + new URL(page.url()).search
  await page.screenshot({
    path: output + '/provider-completed-1280.png',
    fullPage: true,
  })
  assert(
    !reqs.some(
      (r) =>
        r.path.startsWith('/api/v1/admin/') ||
        r.path.startsWith('/api/v1/driver/'),
    ),
  )
  report.checks.push(
    'ADMIN-membership-START-COMPLETED-identity-history-ledger-preserved-no-new-independent-profile-no-driver-admin-fallback',
  )
  const { caseId } = await request('historicalExitedCase')
  await request('seedProviderMovements', { caseId })
  await open('/fleet-assistance/' + caseId + '?providerId=' + providers.A)
  await expect(page.getByLabel('Combinación autorizada')).toBeVisible()
  const moneyBefore = await request('providerMovementMetrics', { caseId })
  await page.getByLabel('Combinación autorizada').selectOption('0')
  await page.getByLabel('Importe declarado MXN').fill('25,10')
  await page
    .getByLabel('Fecha física del movimiento (UTC)')
    .fill(new Date().toISOString().slice(0, 19).replace(/:00$/, ''))
  await page
    .getByRole('button', { name: 'Revisar declaración', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirmar declaración revisada' })
    .click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  const movement = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'REFUND · 25.10 MXN' }) })
  await movement
    .getByLabel('Motivo de disputa del movimiento')
    .fill('Disputa sintética histórica después de COMPLETED')
  await movement
    .getByRole('button', { name: 'Revisar disputa del movimiento' })
    .click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  const moneyAfter = await request('providerMovementMetrics', { caseId })
  assert.equal(moneyAfter.movements.length, 1)
  assert.equal(moneyAfter.disputes, 1)
  assert.equal(moneyAfter.allocations, 0)
  assert.equal(moneyAfter.ledgerEntries, moneyBefore.ledgerEntries)
  assert.equal(moneyAfter.assignmentStatus, 'CANCELLED')
  assert.equal(
    (await request('exitMetrics', { driverId: drivers.pedro })).providerId,
    null,
  )
  await page.screenshot({
    path: output + '/post-exit-movement-context.png',
    fullPage: true,
  })
  report.checks.push(
    'COMPLETED-ex-provider-authorized-historical-movementContext-declaration-and-dispute-no-ledger-no-reaffiliation',
  )
  await login(info.credentials.owner2Email)
  await open(completedUrl)
  await expect(
    page.getByRole('heading', {
      name: 'Desvinculación completada',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Consultar intento' }),
  ).toHaveCount(0)
  report.checks.push(
    'second-provider-member-reads-history-without-original-private-intent',
  )
  await login(info.credentials.adminEmail)
  await open('/admin/fleet-exits/' + pendingExitId)
  await expect(
    page.getByRole('button', { name: 'Solicitar retiro de flotilla' }),
  ).toHaveCount(0)
  await request('exitFlag', { enabled: false })
  await page.getByRole('button', { name: 'Solicitar reevaluación' }).click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  await page.screenshot({ path: output + '/admin-1280.png', fullPage: true })
  report.checks.push(
    'SUPER_ADMIN-no-START-RECHECK-accepted-with-flag-off-and-independent-separate',
  )
  await login(info.credentials.email)
  await open(completedUrl)
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Actualizar salida' }),
  ).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Consultar intento' }),
  ).toBeEnabled()
  await request('revokeMembership')
  await page.getByRole('button', { name: 'Actualizar salida' }).click()
  await expect(page.getByText(/El acceso cambió/)).toBeVisible()
  await open('/privacy/fleet-exit-recovery')
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText(/Resultado técnico redactado/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Consultar salida actual' }),
  ).toHaveCount(0)
  report.checks.push(
    'membership-loss-removes-private-detail-preserves-original-APPLIED-redacted-recovery',
  )
  await open('/fleet-exits?providerId=' + providers.B)
  await expect(
    page.getByRole('button', { name: 'Consultar intento' }),
  ).toHaveCount(0)
  report.checks.push('provider-switch-never-shows-another-provider-intent')
  assert.equal(report.networkErrors.length, 0)
  report.complete = true
} catch (error) {
  const failedPage = browser?.contexts()[0]?.pages()[0]
  if (failedPage) {
    report.alerts = await failedPage
      .getByRole('alert')
      .allTextContents()
      .catch(() => [])
    report.invalidFields = await failedPage
      .locator('input:invalid, select:invalid, textarea:invalid')
      .evaluateAll((els) =>
        els.map((el) => ({
          label: el.closest('label')?.textContent,
          message: el.validationMessage,
        })),
      )
      .catch(() => [])
    await failedPage
      .screenshot({ path: output + '/failure.png', fullPage: true })
      .catch(() => {})
  }
  report.failure = String(error.message).replace(
    /postgres(?:ql)?:\/\/\S+/g,
    '[isolated database]',
  )
  console.error(report.failure)
  process.exitCode = 1
} finally {
  clearTimeout(readyTimer)
  await browser?.close()
  await server?.close()
  if (readyInfo && !exited) {
    try {
      report.shutdown = await request('stop')
      child.stdin.end()
      await new Promise((yes) => child.once('exit', yes))
    } catch (e) {
      report.shutdown = { error: e.message }
    }
  } else if (!exited) child.stdin.end()
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(report, null, 2) + '\n',
  )
  await writeFile(
    `${output}/requests.json`,
    JSON.stringify(reqs, null, 2) + '\n',
  )
  // No credentials, authorization headers, bodies or stderr persisted.
  if (!report.complete && stderr.includes('Error'))
    console.log(
      'WSL emitted diagnostic stderr; not retained to avoid secret leakage',
    )
  console.log(
    JSON.stringify({
      output,
      complete: report.complete,
      checks: report.checks,
      shutdown: {
        stopped: report.shutdown?.stopped,
        backendUnchanged: report.shutdown?.backendUnchanged,
        runtimeBuiltFromCurrentSources:
          report.shutdown?.runtimeBuiltFromCurrentSources,
      },
    }),
  )
}
