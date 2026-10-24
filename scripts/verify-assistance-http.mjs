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
const output = `test-results/assistance-http-${Date.now()}`
await mkdir(output, { recursive: true })
const wslPath = resolve('scripts/assistance-http-wsl.mjs')
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

  page.on('response', async (response) => {
    if (
      response.status() >= 400 &&
      response.url().includes('/fleet-assistance')
    ) {
      const b = await response.json().catch(() => ({}))
      report.httpErrors ??= []
      report.httpErrors.push({
        path: new URL(response.url()).pathname,
        status: response.status(),
        code: b.code,
      })
    }
  })
  const posts = []
  let lose = false,
    drop = false
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.origin !== 'http://127.0.0.1:4238') {
      report.networkErrors.push('External origin blocked')
      return route.abort()
    }
    if (url.pathname.startsWith('/api/'))
      reqs.push({ method: req.method(), path: url.pathname })
    if (req.method() === 'POST' && url.pathname.includes('fleet-assistance')) {
      if (!url.pathname.endsWith('/content'))
        posts.push({
          path: url.pathname,
          key: req.headers()['idempotency-key'],
          body: req.postDataJSON(),
        })
      if (drop && url.pathname.endsWith('/contributions')) {
        drop = false
        return route.abort('failed')
      }
      if (lose && url.pathname.endsWith('/contributions')) {
        lose = false
        const result = await route.fetch()
        assert.equal(result.status(), 200)
        report.lostResponseCommitted = true
        return route.abort('failed')
      }
    }
    return route.continue()
  })
  const open = (path) => page.goto('http://127.0.0.1:4238' + path)
  const login = async (email) => {
    console.log('browser-login')
    await open('/login')
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    await page.getByLabel('Correo electrónico').fill(email)
    await page
      .getByLabel('Contraseña', { exact: true })
      .fill(info.credentials.password)
    await page
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await expect(page).not.toHaveURL(/\/login$/)
  }
  const confirm = async () =>
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar', exact: true })
      .click()
  const acknowledge = async () => {
    await page
      .getByRole('button', { name: 'Reconocer resultado y continuar' })
      .click()
    await expect(
      page.getByRole('button', { name: 'Consultar intento' }),
    ).toHaveCount(0)
  }
  const review = async () => {
    await page
      .getByRole('button', { name: 'Revisar intención', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Confirmar revisión', exact: true })
      .click()
    await confirm()
  }
  await login(info.credentials.email)
  console.log('owner-create')
  await open('/fleet-services/' + dispatch + '?providerId=' + providers.A)
  await page
    .getByRole('link', {
      name: 'Solicitar asistencia sobre esta participación',
    })
    .click()
  await page.getByLabel('Motivo', { exact: true }).selectOption('ACCESS_LOST')
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Solicitud sintética desde el segmento histórico')
  await review()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  const created = posts.find(
    (p) => p.path === '/api/v1/provider/fleet-assistance-cases',
  )
  assert(created?.body.caseId)
  const caseId = created.body.caseId
  report.caseId = caseId
  await acknowledge()
  await open('/fleet-assistance/' + caseId + '?providerId=' + providers.A)
  await expect(page.getByText('EN_REVISIÓN', { exact: true })).toBeVisible()
  await expect(
    page.getByText(/proyección propia no incluye partes/),
  ).toBeVisible()
  report.checks.push(
    'owner-real-login-historical-create-private-detail-and-missing-reference-gate',
  )
  const before = await request('assistanceMetrics')
  const contribution = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', {
        name: 'Aportar información',
        exact: true,
      }),
    })
    .last()
  await contribution
    .getByLabel('Información', { exact: true })
    .fill('Información sintética con respuesta perdida')
  lose = true
  await contribution
    .getByRole('button', { name: 'Revisar intención', exact: true })
    .click()
  await contribution
    .getByRole('button', { name: 'Confirmar revisión', exact: true })
    .click()
  await confirm()
  await expect(page.getByText(/Resultado no confirmado/)).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  const after = await request('assistanceMetrics')
  assert.equal(
    after.find((x) => x.operation === 'CONTRIBUTE' && x.status === 'APPLIED')
      .count,
    1,
  )
  report.checks.push(
    'lost-real-response-restart-encrypted-intent-recovery-without-duplicate',
  )
  assert(
    reqs.filter((r) => r.path.includes('/admin/fleet-assistance')).length === 0,
  )
  report.checks.push('owner-no-administrative-http-requests')
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 950 })
    if (width === 320)
      await expect
        .poll(() =>
          page
            .locator('aside.sidebar')
            .evaluate((e) => e.getBoundingClientRect().right),
        )
        .toBeLessThanOrEqual(0)
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: output + '/owner-' + width + '.png',
      fullPage: true,
    })
  }
  await login(info.credentials.adminEmail)
  await open('/admin/fleet-assistance/' + caseId)
  await expect(page.getByText('EN_REVISIÓN', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Consultar intento' }),
  ).toHaveCount(0)
  await page
    .getByLabel('Parte', { exact: true })
    .selectOption({ label: 'Driver · 1' })
    .catch(async () => {
      const s = page.getByLabel('Parte', { exact: true })
      await s.selectOption(
        await s.locator('option').nth(1).getAttribute('value'),
      )
    })
  await page
    .getByLabel('Información', { exact: true })
    .fill('Acta sintética de callback por canal registrado')
  await review()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  await page.getByLabel('Acción administrativa').selectOption('RECORD_EVIDENCE')
  await page
    .getByLabel('Tipo', { exact: true })
    .selectOption('VERIFIED_CONTACT_NOTE')
  await page
    .getByLabel('Fecha de observación')
    .fill(
      new Date(Date.now() - 1000)
        .toISOString()
        .slice(0, 19)
        .replace(/:00$/, ''),
    )
  const noteSelect = page.getByLabel('Aporte que documenta la verificación')
  await noteSelect.selectOption({
    label: 'Acta sintética de callback por canal registrado',
  })
  await review()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  report.checks.push(
    'admin-contribution-note-sourceHash-compatible-with-real-backend',
  )
  await page.getByLabel('Acción administrativa').selectOption('VERIFY_IDENTITY')
  await expect(
    page.getByText(/proyección administrativa omite contactSourceRef/),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Revisar intención', exact: true }),
  ).toBeDisabled()
  report.checks.push('admin-identity-blocked-by-real-redacted-contactSourceRef')
  await page.getByLabel('Archivo de evidencia').setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: await readFile(output + '/owner-320.png'),
  })
  await page.getByRole('button', { name: 'Revisar reserva privada' }).click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await page
    .getByLabel('Seleccionar nuevamente el archivo original')
    .setInputFiles({
      name: 'wrong.png',
      mimeType: 'image/png',
      buffer: Buffer.from('wrong'),
    })
  await expect(
    page.getByText('El archivo no coincide con la reserva original.'),
  ).toBeVisible()
  await page
    .getByLabel('Seleccionar nuevamente el archivo original')
    .setInputFiles({
      name: 'original.png',
      mimeType: 'image/png',
      buffer: await readFile(output + '/owner-320.png'),
    })
  await expect(page.getByText(/Archivo original comprobado/)).toBeVisible()
  report.checks.push(
    'upload-restart-no-persisted-image-reselect-original-fingerprint-before-send',
  )
  await page
    .getByRole('button', { name: 'Preparar envío del archivo original' })
    .click()
  // A draft is not durable until confirmed. Reload must retain the applied reservation.
  await page.reload()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(
    page.getByText(/Intento pendiente: UPLOAD_EVIDENCE/),
  ).toBeVisible()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await expect(page.getByLabel('Seleccionar nuevamente el archivo original')).toBeEnabled()
  await page
    .getByLabel('Seleccionar nuevamente el archivo original')
    .setInputFiles({
      name: 'original.png',
      mimeType: 'image/png',
      buffer: await readFile(output + '/owner-320.png'),
    })
  await expect(page.getByText(/Archivo original comprobado/)).toBeVisible()
  await page
    .getByRole('button', { name: 'Preparar envío del archivo original' })
    .click()
  report.checks.push(
    'unconfirmed-upload-transition-reload-preserves-previous-reservation',
  )
  let sealCommitted = false
  await page.route('**/evidence-uploads/*/content*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const response = await route.fetch()
    assert.equal(response.status(), 200)
    sealCommitted = true
    await route.abort('failed')
  })
  await confirm()
  await expect.poll(() => sealCommitted).toBe(true)
  await page.unroute('**/evidence-uploads/*/content*')
  await page.reload()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  report.checks.push(
    'lost-SEAL_EVIDENCE-response-restart-recovers-applied-without-original-image-or-resend',
  )
  await page
    .getByRole('button', { name: 'Preparar registro de evidencia sellada' })
    .click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  await page.getByRole('button', { name: 'Consultar imagen privada' }).click()
  await expect(page.getByAltText('Evidencia privada autorizada')).toBeVisible()
  report.checks.push(
    'private-image-reserve-access-multipart-SEAL_EVIDENCE-register-authenticated-proxy',
  )
  await page.getByLabel('Acción administrativa').selectOption('PROPOSE')
  await page.getByLabel('Tipo de propuesta').selectOption('RETRACT_EVIDENCE')
  await page
    .getByLabel('Fecha física del hecho')
    .fill(new Date().toISOString().slice(0, 19).replace(/:00$/, ''))
  await page
    .getByLabel('Motivo', { exact: true })
    .nth(0)
    .fill('Revisión sintética de evidencia privada')
  await page
    .getByLabel('Motivo', { exact: true })
    .nth(1)
    .fill('Retractación sintética conservando auditoría')
  const evidenceSelect = page.getByLabel('Evidencias', { exact: true })
  await evidenceSelect.selectOption(
    await evidenceSelect.locator('option').first().getAttribute('value'),
  )
  const target = page.getByLabel('Evidencia', { exact: true })
  await target.selectOption(
    await target
      .locator('option')
      .filter({ hasText: 'PRIVATE_IMAGE' })
      .first()
      .getAttribute('value'),
  )
  await review()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  const vote = async () => {
    await page
      .getByLabel('Motivo de revisión')
      .fill('Revisión humana sintética independiente')
    await page.getByRole('button', { name: 'Confirmar voto' }).click()
    await confirm()
    await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
    await acknowledge()
  }
  await vote()
  await expect(page.getByText('Votos efectivos: 1 / 1')).toBeVisible()
  await login(info.credentials.adminEmail)
  await open('/admin/fleet-assistance/' + caseId)
  await vote()
  await expect(page.getByText('Votos efectivos: 1 / 1')).toBeVisible()
  await login(info.credentials.admin2Email)
  await open('/admin/fleet-assistance/' + caseId)
  await vote()
  await expect(page.getByText('Votos efectivos: 2 / 1')).toBeVisible()
  const beforeApply = reqs.length
  await page.getByRole('button', { name: 'Aplicar propuesta revisada' }).click()
  await confirm()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  assert(
    !reqs
      .slice(beforeApply)
      .some(
        (r) => r.method === 'POST' && !r.path.includes('/fleet-assistance'),
      ),
  )
  await expect(
    page.getByRole('button', { name: 'Consultar imagen privada' }),
  ).toBeDisabled()
  report.checks.push(
    'proposal-preview-frozen-votes-same-user-one-vote-two-identities-apply-no-extra-operational-call',
  )
  await request('assistanceDisabled', { disabled: true })
  await page.getByLabel('Acción administrativa').selectOption('CLOSE')
  await page
    .getByLabel('Motivo', { exact: true })
    .fill('Ensayo sintético comandos apagados')
  await review()
  await expect(
    page.getByText(/Los comandos de asistencia están deshabilitados/),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: REJECTED')).toBeVisible()
  report.checks.push('commands-off-real-durable-REJECTED')
  await acknowledge()
  await page.getByLabel('Acción administrativa').selectOption('CONTRIBUTE')
  const party = page.getByLabel('Parte', { exact: true })
  await party.selectOption(
    await party.locator('option').nth(1).getAttribute('value'),
  )
  await page
    .getByLabel('Información', { exact: true })
    .fill('Intento sintético que no llega al servidor')
  drop = true
  await review()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: UNKNOWN')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar intento técnico' }).click()
  await expect(
    page.getByText('Estado del intento: CLOSED_NO_EFFECTS'),
  ).toBeVisible()
  report.checks.push(
    'commands-off-real-rejection-UNKNOWN-and-technical-close-without-operational-effect',
  )
  await acknowledge()
  await page.setViewportSize({ width: 1280, height: 950 })
  await page.screenshot({ path: output + '/admin-1280.png', fullPage: true })
  await login(info.credentials.email)
  await open('/fleet-assistance/' + caseId + '?providerId=' + providers.A)
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
  await acknowledge()
  report.checks.push('same-account-pending-intent-survives-other-role-login')
  await request('revokeMembership')
  await page.getByRole('button', { name: 'Actualizar expediente' }).click()
  await expect(page.getByText('EN_REVISIÓN', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/No se muestran datos anteriores/)).toBeVisible()
  report.checks.push('real-membership-revocation-removes-private-case')
  report.idempotency = { before, after }
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
      shutdown: report.shutdown,
    }),
  )
}
