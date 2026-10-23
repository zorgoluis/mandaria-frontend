// Real Web + real Nest HTTP + disposable PostgreSQL in WSL. No external services.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
const output = `test-results/fleet-http-${Date.now()}`
await mkdir(output, { recursive: true })
const wslPath = resolve('scripts/fleet-http-wsl.mjs')
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
  const { providers, drivers, dispatch, historicalDispatch } = info.ids
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
      'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4228'),
    },
    server: {
      host: '127.0.0.1',
      port: 4228,
      strictPort: true,
      proxy: { '/api': 'http://127.0.0.1:4227' },
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
  page.on('pageerror', (e) => report.networkErrors.push(e.message))
  let token,
    lose = false,
    corruptCursor = false
  const spendingBodies = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.pathname.startsWith('/api/')) {
      reqs.push({ method: req.method(), path: url.pathname })
      if (req.headers().authorization) token = req.headers().authorization
    }
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:4228') {
      report.networkErrors.push('Unexpected external origin')
      return route.abort()
    }
    if (
      corruptCursor &&
      url.pathname.startsWith('/api/v1/provider/fleet-services') &&
      url.searchParams.has('pageToken')
    ) {
      corruptCursor = false
      url.searchParams.set('pageToken', 'invalid')
      return route.continue({ url: url.toString() })
    }
    if (
      url.pathname.endsWith('/fleet-spending') &&
      route.request().method() === 'PUT'
    ) {
      spendingBodies.push(route.request().postDataJSON())
      if (lose) {
        lose = false
        const response = await route.fetch()
        assert.equal(
          response.status(),
          200,
          'Lost response must be after server commit',
        )
        report.lostResponseCommitted = true
        return route.abort('failed')
      }
    }
    return route.continue()
  })
  const open = (path) => page.goto('http://127.0.0.1:4228' + path)
  const http = async (path, method = 'GET', body) => {
    const response = await context.request.fetch(
      'http://127.0.0.1:4228/api/v1' + path,
      {
        method,
        headers: { Authorization: token },
        ...(body ? { data: body } : {}),
      },
    )
    return { status: response.status(), body: await response.json() }
  }
  await open('/login')
  await page.getByLabel('Correo electrónico').fill(info.credentials.email)
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(info.credentials.password)
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await expect(page).not.toHaveURL(/\/login$/)
  await open('/fleet-services?providerId=' + providers.A)
  await expect(page.getByRole('article')).toHaveCount(1)
  report.checks.push('real-login-and-own-history')
  const own = await http(
    '/provider/fleet-services/' + dispatch + '?providerId=' + providers.A,
  )
  assert.equal(own.status, 200)
  assert.equal(own.body.items.length, 1)
  assert(!JSON.stringify(own.body).includes('9614443322'))
  assert(!JSON.stringify(own.body).includes('Pedido secreto'))
  report.checks.push('private-envelope-without-contact-or-package-content')
  const beforeOldLink = reqs.length
  await open('/services/' + dispatch + '?providerId=' + providers.A)
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(
    page.getByRole('button', {
      name: /TOMAR|LIBERAR|ENTREGADO|ASIGNAR|Reportar incidencia/,
    }),
  ).toHaveCount(0)
  assert(
    !reqs
      .slice(beforeOldLink)
      .some((r) => r.path.includes('/provider/dispatches/')),
  )
  for (const suffix of [
    'claim',
    'release',
    'deliver',
    'assignment',
    'assignment/reassign',
    'assignment/cancel',
    'execution-events',
    'custody-incidents',
  ])
    assert.equal(
      (
        await http(
          '/provider/dispatches/' +
            dispatch +
            '/' +
            suffix +
            '?providerId=' +
            providers.A,
          'POST',
          {},
        )
      ).status,
      403,
    )
  report.checks.push(
    'old-deep-link-no-legacy-projection-and-eight-HTTP-mutations-denied',
  )
  const before = await request('metrics')
  await open('/drivers/' + drivers.carlos + '?providerId=' + providers.A)
  await page.getByRole('button', { name: 'Revocar gasto', exact: true }).click()
  lose = true
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await expect(page.getByText(/Resultado no confirmado/)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const afterLost = await request('metrics')
  assert.equal(afterLost.commands, before.commands + 1)
  assert.equal(afterLost.spending.enabled, false)
  assert.equal(afterLost.active, 1)
  assert.equal(afterLost.ledger, before.ledger)
  await page.reload()
  await page
    .getByRole('button', { name: 'Recuperar comando pendiente' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Habilitar gasto', exact: true }),
  ).toBeVisible()
  const afterReplay = await request('metrics')
  assert.equal(afterReplay.commands, afterLost.commands)
  assert.deepEqual(spendingBodies[0], spendingBodies[1])
  report.idempotency = {
    originalPuts: 1,
    exactReplays: 1,
    commandsBefore: before.commands,
    commandsAfterLost: afterLost.commands,
    commandsAfterReplay: afterReplay.commands,
    activeBefore: before.active,
    activeAfter: afterReplay.active,
    ledgerUnchanged: before.ledger === afterReplay.ledger,
  }
  report.checks.push(
    'spending-revoke-lost-response-reload-exact-replay-one-effect-ACTIVE-preserved',
  )
  await page
    .getByRole('button', { name: 'Habilitar gasto', exact: true })
    .click()
  assert.equal((await request('spending', { enabled: true })).status, 200)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await expect(page.getByText(/La revisión cambió/)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  report.checks.push('real-revision-conflict-requires-review')
  assert.equal(
    (await request('mode', { provider: 'A', mode: 'PAUSED' })).status,
    200,
  )
  await open('/services/' + dispatch + '?providerId=' + providers.A)
  await expect(page.getByText(/Modo: PAUSED/)).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)
  assert.equal(
    (
      await http(
        '/provider/dispatches/' +
          dispatch +
          '/deliver?providerId=' +
          providers.A,
        'POST',
        {},
      )
    ).status,
    403,
  )
  report.checks.push('PAUSED-observer-and-real-denial')
  await open('/fleet-services?providerId=' + providers.B)
  await expect(page.getByRole('article')).toHaveCount(25)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(page.getByRole('article')).toHaveCount(27)
  await page.getByLabel('Estado de asignación').selectOption('CANCELLED')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(page.getByRole('article')).toHaveCount(25)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(page.getByRole('article')).toHaveCount(27)
  await open(
    '/fleet-services/' + historicalDispatch + '?providerId=' + providers.B,
  )
  await expect(page.getByRole('article')).toHaveCount(25)
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(page.getByRole('article')).toHaveCount(27)
  const invalidCursor = await http(
    '/provider/fleet-services?providerId=' + providers.B + '&pageToken=invalid',
  )
  assert.equal(invalidCursor.status, 409)
  assert.equal(invalidCursor.body.code, 'ECONOMIC_CONTEXT_CHANGED')
  report.invalidCursor = {
    status: invalidCursor.status,
    code: invalidCursor.body.code,
  }
  await open('/fleet-services?providerId=' + providers.B)
  await expect(page.getByRole('article')).toHaveCount(25)
  corruptCursor = true
  await page.getByRole('button', { name: 'Cargar más' }).click()
  await expect(
    page.getByText(
      'No se pudo validar el cursor del historial. Refresca el historial para volver al inicio.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.getByRole('button', { name: 'Refrescar historial' }).click()
  await expect(page.getByRole('article')).toHaveCount(25)
  report.checks.push(
    'real-invalid-cursor-error-clears-rows-and-refresh-recovers',
  )
  assert.equal(
    (
      await http(
        '/provider/fleet-services/' + dispatch + '?providerId=' + providers.B,
      )
    ).status,
    404,
  )
  report.checks.push(
    '27-seeded-historical-segments-real-list-detail-cursor-filter-reset-and-foreign-404',
  )
  await open('/services?providerId=' + providers.B)
  await expect(page.getByText(/Modo: ADMIN_DISPATCH/)).toBeVisible()
  assert.equal(
    (await request('mode', { provider: 'B', mode: 'DRAINING' })).status,
    200,
  )
  await open('/services?providerId=' + providers.B)
  await expect(page.getByText(/Modo: DRAINING/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: /TOMAR SERVICIO/ }),
  ).toHaveCount(0)
  assert.equal(
    (
      await http(
        '/provider/dispatches/' +
          historicalDispatch +
          '/claim?providerId=' +
          providers.B,
        'POST',
        {},
      )
    ).status,
    403,
  )
  report.checks.push('ADMIN_DISPATCH-read-regression-and-DRAINING-claim-denial')
  await open('/fleet-services/' + dispatch + '?providerId=' + providers.A)
  await expect(page.getByRole('article')).toHaveCount(1)
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 950 })
    if (width === 320) {
      const menu = page.getByRole('button', { name: 'Abrir menú' })
      if ((await menu.getAttribute('aria-expanded')) === 'true') {
        await page
          .getByRole('button', { name: 'Cerrar menú', exact: true })
          .click()
      }
      await expect
        .poll(() =>
          page
            .locator('aside.sidebar')
            .evaluate((el) => el.getBoundingClientRect().right),
        )
        .toBeLessThanOrEqual(0)
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: `${output}/real-detail-${width}.png`,
      fullPage: true,
    })
  }
  await request('revokeMembership')
  await page.getByRole('button', { name: 'Actualizar modo' }).click()
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByText('403 — Sin permisos')).toBeVisible()
  assert.equal(
    (await http('/provider/fleet-services?providerId=' + providers.A)).status,
    403,
  )
  report.checks.push(
    'membership-revocation-clears-visible-private-data-and-HTTP-denies',
  )
  assert.equal(report.networkErrors.length, 0)
  report.complete = true
} catch (error) {
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
      shutdown: report.shutdown,
    }),
  )
}
