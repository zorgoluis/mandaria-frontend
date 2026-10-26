// Real Web + real Nest HTTP + disposable PostgreSQL in WSL. No external services.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
const output = `test-results/admin-references-http-${Date.now()}`
await mkdir(output, { recursive: true })
const wslPath = resolve('scripts/admin-references-http-wsl.mjs')
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
  report.database = { migrations: info.migrations, isolated: true }
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
  const origin = 'http://127.0.0.1:4238'
  // WSL loopback forwarding becomes available after Nest starts listening.
  for (let n = 0; n < 30; n++) {
    const health = await fetch(origin + '/api/v1/health').catch(() => null)
    if (health && [200, 404].includes(health.status)) break
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  const http = async (path, token, method = 'GET', body, key, status = 200) => {
    const r = await fetch(origin + '/api/v1' + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const v = await r.json()
    assert.equal(
      r.status,
      status,
      `${method} ${path.split('?')[0]}: ${v.code ?? v.message ?? 'unexpected status'}`,
    )
    return v
  }
  const loginApi = async (email) =>
    (
      await http('/auth/login', null, 'POST', {
        email,
        password: info.credentials.password,
      })
    ).accessToken
  const token = await loginApi(info.credentials.adminEmail),
    owner = await loginApi(info.credentials.email),
    other = await loginApi(info.credentials.admin2Email)
  const history = await http(
    `/admin/dispatches/${info.ids.dispatch}/assignments`,
    token,
  )
  const assignment = history.find((a) => a.status === 'ACTIVE')
  assert(assignment)
  let caseId = randomUUID(),
    base = `/admin/fleet-assistance-cases/${caseId}`
  await http(
    '/admin/fleet-assistance-cases',
    token,
    'POST',
    {
      caseId,
      assignmentId: assignment.id,
      reason: 'ACCESS_LOST',
      description: 'Comprobación Web sintética de referencias administrativas',
    },
    randomUUID(),
    201,
  )
  const refs = async (section) => {
    const items = [],
      seen = new Set()
    let cursor
    do {
      const p = await http(
        base +
          '/administrative-references/' +
          section +
          '?limit=1' +
          (cursor ? '&pageToken=' + encodeURIComponent(cursor) : ''),
        token,
      )
      assert.equal(p.schemaVersion, 1)
      assert.equal(typeof p.caseRevision, 'string')
      assert.equal(p.caseId, caseId)
      for (const item of p.items) {
        assert(!seen.has(item.id))
        seen.add(item.id)
        items.push(item)
      }
      cursor = p.nextPageToken
    } while (cursor !== null)
    return items
  }
  for (const section of [
    'parties',
    'stops',
    'participations',
    'recovery-sessions',
    'release-receipts',
    'shipping-declarations',
    'evidence-sources',
  ])
    await refs(section)
  await http(
    base + '/administrative-references/parties',
    owner,
    'GET',
    undefined,
    undefined,
    403,
  )
  await http(
    base +
      '/administrative-references/parties?providerId=' +
      info.ids.providers.A,
    token,
    'GET',
    undefined,
    undefined,
    400,
  )
  const first = await http(
    base + '/administrative-references/parties?limit=1',
    token,
  )
  assert(first.nextPageToken)
  const cursorIssuedAt = Date.now(),
    firstBase = base
  await http(
    base +
      '/administrative-references/parties?pageToken=' +
      encodeURIComponent(first.nextPageToken),
    other,
    'GET',
    undefined,
    undefined,
    400,
  )
  await http(
    base +
      '/administrative-references/participations?pageToken=' +
      encodeURIComponent(first.nextPageToken),
    token,
    'GET',
    undefined,
    undefined,
    400,
  )
  await http(
    base + '/administrative-references/parties?pageToken=invalid',
    token,
    'GET',
    undefined,
    undefined,
    400,
  )
  report.checks.push(
    'seven-real-sections-multipage-no-duplicates-provider-denied-strict-query-actor-section-cursors',
  )
  const parties = await refs('parties'),
    party = parties.find((p) => p.kind === 'DRIVER')
  const command = async (suffix, body, status = 200, key = randomUUID()) => {
    const d = await http(base, token)
    return http(
      base + '/' + suffix,
      token,
      'POST',
      { expectedCaseRevision: d.summary.revision, ...body },
      key,
      status,
    )
  }
  const source = (await refs('evidence-sources')).find(
    (s) => s.sourceRef.type === 'ASSIGNMENT',
  )
  await command(
    'evidence',
    {
      kind: source.kind,
      sourceRef: { ...source.sourceRef, sha256: '0'.repeat(64) },
      observedAt: new Date().toISOString(),
    },
    409,
  )
  await command(
    'evidence',
    {
      kind: source.kind,
      sourceRef: { ...source.sourceRef, id: randomUUID() },
      observedAt: new Date().toISOString(),
    },
    404,
  )
  report.checks.push('tampered-and-foreign-evidence-rejected')
  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror', () => report.networkErrors.push('browser-error'))
  page.on('response', async (response) => {
    if (
      response.status() >= 400 &&
      response.url().includes('fleet-assistance')
    ) {
      const body = await response.json().catch(() => ({}))
      report.httpErrors ??= []
      report.httpErrors.push({ status: response.status(), code: body.code })
      console.log('http-error:' + response.status() + ':' + body.code)
    }
  })
  let loseEvidence = false,
    originalEvidence
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.origin !== origin) return route.abort()
    if (
      loseEvidence &&
      req.method() === 'POST' &&
      url.pathname.endsWith('/evidence')
    ) {
      loseEvidence = false
      originalEvidence = {
        body: req.postDataJSON(),
        key: req.headers()['idempotency-key'],
      }
      const r = await route.fetch()
      assert.equal(r.status(), 200)
      return route.abort('failed')
    }
    return route.continue()
  })
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill(info.credentials.adminEmail)
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(info.credentials.password)
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto(origin + '/admin/fleet-assistance/' + caseId)
  const action = async (value) => {
    console.log('action:' + value)
    await page.getByLabel('Acción administrativa').selectOption(value)
    await expect(
      page.getByRole('status').filter({ hasText: 'Cargando todas' }),
    ).toHaveCount(0)
  }
  const review = async () => {
    const invalid = await page
      .getByRole('button', { name: 'Revisar intención', exact: true })
      .evaluate((button) =>
        [
          ...button
            .closest('form')
            .querySelectorAll('input:invalid,select:invalid,textarea:invalid'),
        ].map((n) => n.closest('label')?.textContent ?? n.name),
      )
    if (invalid.length) throw Error('Invalid fields: ' + invalid.join(', '))
    await page
      .getByRole('button', { name: 'Revisar intención', exact: true })
      .click()
    const alerts = await page.getByRole('alert').allTextContents()
    if (alerts.length) throw Error('Form validation: ' + alerts.join(' | '))
    await page
      .getByRole('button', { name: 'Confirmar revisión', exact: true })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar', exact: true })
      .click()
  }
  const acknowledge = async () => {
    await expect(page.getByText('Estado del intento: APPLIED')).toBeVisible()
    await page
      .getByRole('button', { name: 'Reconocer resultado y continuar' })
      .click()
    await expect(
      page.getByRole('button', { name: 'Consultar intento' }),
    ).toHaveCount(0)
  }
  await action('CONTRIBUTE')
  await page.getByLabel('Parte', { exact: true }).selectOption(party.id)
  await page
    .getByLabel('Información', { exact: true })
    .fill(
      'Comprobación de contacto sintética por operador autorizado; no corresponde a una llamada real.',
    )
  await review()
  await acknowledge()
  await action('RECORD_EVIDENCE')
  await page
    .getByLabel('Tipo', { exact: true })
    .selectOption('VERIFIED_CONTACT_NOTE')
  await page
    .getByLabel('Parte de la nota de verificación')
    .selectOption(party.id)
  await page
    .getByLabel('Fuente canónica de evidencia')
    .selectOption({ index: 1 })
  await page
    .getByLabel('Fecha de observación')
    .fill(new Date().toISOString().slice(0, 19))
  loseEvidence = true
  await review()
  await expect(
    page.getByRole('button', { name: 'Consultar intento' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Consultar intento' }).click()
  await acknowledge()
  assert(originalEvidence)
  const replay = await http(
    base + '/evidence',
    token,
    'POST',
    originalEvidence.body,
    originalEvidence.key,
  )
  assert(replay.result.evidenceId)
  report.checks.push(
    'browser-contribution-canonical-note-evidence-lost-response-receipt-exact-replay',
  )
  await action('VERIFY_IDENTITY')
  await page.getByLabel('Parte', { exact: true }).selectOption(party.id)
  await page.getByLabel('Método').selectOption('REGISTERED_CHANNEL_CALLBACK')
  await page.getByLabel('Resultado').selectOption('VERIFIED')
  await page
    .getByLabel('Acta de verificación')
    .selectOption(replay.result.evidenceId)
  await page
    .getByLabel('Fecha física del hecho')
    .fill(new Date().toISOString().slice(0, 19))
  await review()
  await acknowledge()
  report.checks.push(
    'browser-identity-same-party-canonical-channel-offered-method-real-receipt',
  )
  await request('createRecoverySession')
  await action('PROPOSE')
  await page.getByLabel('Tipo de propuesta').selectOption('ACCESS_RECOVERED')
  await page.getByLabel('Nueva sesión verificada').selectOption({ index: 1 })
  await page
    .getByLabel('Verificación', { exact: true })
    .selectOption({ index: 1 })
  await page
    .getByLabel('Motivo', { exact: true })
    .fill('Revisión sintética de acceso recuperado')
  await page
    .getByLabel('Fecha física del hecho')
    .fill(new Date().toISOString().slice(0, 19))
  await page
    .getByLabel('Evidencias', { exact: true })
    .selectOption(replay.result.evidenceId)
  const proposalResponse = page.waitForResponse(
    (r) => r.url().endsWith('/proposals') && r.request().method() === 'POST',
  )
  await review()
  const proposal = (await (await proposalResponse).json()).result
  await acknowledge()
  assert(proposal.proposalId)
  const pendingProposal = await http(
    base + '/proposals/' + proposal.proposalId,
    token,
  )
  assert.notEqual(pendingProposal.status, 'APPLIED')
  const beforeReview = await command(
    'proposals/' + proposal.proposalId + '/apply',
    {
      expectedProposalRevision: proposal.proposalRevision,
      snapshotHash: proposal.snapshotHash,
    },
    409,
  )
  assert(beforeReview.code)
  report.checks.push(
    'browser-current-driver-session-proposal-no-automatic-apply-review-barrier',
  )
  await action('RECORD_OBLIGATION')
  const participation = (await refs('participations'))[0]
  await page
    .getByLabel('Participación histórica')
    .selectOption(participation.id)
  await page.getByLabel('Concepto').selectOption('GOODS')
  for (const label of ['Deudor', 'Acreedor', 'Beneficiario'])
    await page.getByLabel(label, { exact: true }).selectOption(party.id)
  await page.getByLabel('Conocimiento').selectOption('UNKNOWN')
  await page
    .getByLabel('Evidencias', { exact: true })
    .selectOption(replay.result.evidenceId)
  await page
    .getByLabel('Referencia de términos')
    .fill('Inventario sintético inicial')
  await page.getByLabel('Orden', { exact: true }).fill('0')
  await page
    .getByLabel('Fecha física del hecho')
    .fill(new Date().toISOString().slice(0, 19))
  await review()
  await acknowledge()
  report.checks.push('browser-first-obligation-with-real-participation-id')
  await action('REGISTER_PARTY')
  await page.getByLabel('Tipo', { exact: true }).selectOption('ORIGIN')
  await page
    .getByLabel('Parada con contacto registrado')
    .selectOption({ index: 1 })
  await page
    .getByLabel('Nombre de referencia')
    .fill('Origen sintético autorizado')
  await review()
  await acknowledge()
  report.checks.push(
    'browser-stop-registration-exact-channel-refreshes-parties',
  )
  await request('staleAssignmentSource', { caseId })
  await command(
    'evidence',
    {
      kind: source.kind,
      sourceRef: source.sourceRef,
      observedAt: new Date().toISOString(),
    },
    409,
  )
  report.checks.push('changed-source-hash-rejected-without-silent-replacement')
  const shippingFixture = await request('shippingReferenceFixture')
  caseId = randomUUID()
  base = `/admin/fleet-assistance-cases/${caseId}`
  await http(
    '/admin/fleet-assistance-cases',
    token,
    'POST',
    {
      caseId,
      assignmentId: shippingFixture.assignmentId,
      reason: 'ACCESS_LOST',
      description: 'Caso sintético de declaración original',
    },
    randomUUID(),
    201,
  )
  await http(
    base +
      '/administrative-references/parties?pageToken=' +
      encodeURIComponent(first.nextPageToken),
    token,
    'GET',
    undefined,
    undefined,
    400,
  )
  await command(
    'evidence',
    {
      kind: source.kind,
      sourceRef: source.sourceRef,
      observedAt: new Date().toISOString(),
    },
    404,
  )
  await page.goto(origin + '/admin/fleet-assistance/' + caseId)
  const shipping = (await refs('shipping-declarations'))[0],
    shippingParties = await refs('parties')
  assert(shipping)
  await action('RECORD_EVIDENCE')
  await page
    .getByLabel('Tipo', { exact: true })
    .selectOption('EXISTING_INTERNAL_RECORD')
  await page.getByLabel('Fuente canónica de evidencia').selectOption({
    label: (
      await page
        .getByLabel('Fuente canónica de evidencia')
        .locator('option')
        .allTextContents()
    ).find((t) => t.includes('SHIPPING_DECLARATION')),
  })
  await page
    .getByLabel('Fecha de observación')
    .fill(new Date().toISOString().slice(0, 19))
  await review()
  await acknowledge()
  await action('DECLARE_MOVEMENT')
  await page
    .getByLabel('Origen del movimiento')
    .selectOption('SHIPPING_DECLARATION')
  await page
    .getByLabel('Declaración de cobro original')
    .selectOption(shipping.id)
  await page
    .getByLabel('Entregante')
    .selectOption(shippingParties.find((p) => p.kind === 'PROVIDER').id)
  await page
    .getByLabel('Receptor', { exact: true })
    .selectOption(shipping.toPartyIds[0])
  await page
    .getByLabel('Beneficiario', { exact: true })
    .selectOption(shipping.toPartyIds[0])
  await page
    .getByLabel('Evidencias', { exact: true })
    .selectOption({ index: 0 })
  const movementResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/movement-declarations') &&
      r.request().method() === 'POST',
  )
  await review()
  const movement = await (await movementResponse).json()
  assert.equal(movement.result.status, 'DECLARED')
  await acknowledge()
  assert.equal((await request('shippingUnchanged')).unchanged, true)
  report.checks.push(
    'browser-shipping-selector-exact-source-amount-date-concepts-real-DECLARED-original-unchanged-foreign-case-denied',
  )
  const historical = await request('historicalReleaseReference')
  const releaseCase = randomUUID()
  await http(
    '/admin/fleet-assistance-cases',
    token,
    'POST',
    {
      caseId: releaseCase,
      assignmentId: historical.assignmentId,
      reason: 'ACCESS_LOST',
      description: 'Caso sintético con recibo histórico; sin nueva liberación',
    },
    randomUUID(),
    201,
  )
  const releaseBase = `/admin/fleet-assistance-cases/${releaseCase}`
  const releases = await http(
    releaseBase + '/administrative-references/release-receipts',
    token,
  )
  const release = releases.items.find(
    (r) => r.existingReceiptId === historical.requestId,
  )
  assert(release)
  assert.notEqual(release.id, historical.requestId)
  assert.notEqual(release.existingReceiptId, historical.responseId)
  await page.goto(origin + '/admin/fleet-assistance/' + releaseCase)
  await action('PROPOSE')
  await page.getByLabel('Tipo de propuesta').selectOption('ASSISTED_RELEASE')
  await page
    .getByLabel('Fuente de acreditación')
    .selectOption('EXISTING_RELEASE')
  await page
    .getByLabel('Recibo original de liberación')
    .selectOption(historical.requestId)
  assert.equal(
    await page.getByLabel('Recibo original de liberación').inputValue(),
    historical.requestId,
  )
  report.checks.push(
    'historical-release-fixture-selector-uses-original-requestId-not-opaque-id-or-response-receipt',
  )
  report.pending = [
    'Full EXISTING_RELEASE: synthetic historical receipt selection only; no verified zero-obligation inventory, required confirmations, proposal approvals or apply in this fixture.',
  ]
  await page.goto(origin + '/admin/fleet-assistance/' + caseId)
  await action('CONTRIBUTE')
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect(page.getByLabel('Información', { exact: true })).toBeVisible()
    await page.getByLabel('Información', { exact: true }).focus()
    await page.keyboard.press('Tab')
    assert(await page.evaluate(() => document.activeElement !== document.body))
    await page.screenshot({
      path: `${output}/admin-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  await request('assistanceDisabled')
  await page.getByRole('button', { name: 'Actualizar expediente' }).click()
  await expect(
    page.getByRole('button', { name: 'Revisar intención', exact: true }),
  ).toBeDisabled()
  report.checks.push('desktop-mobile-keyboard-and-real-flag-off')
  console.log('waiting-real-five-minute-cursor-expiry')
  while (Date.now() - cursorIssuedAt < 301000)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  await http(
    firstBase +
      '/administrative-references/parties?pageToken=' +
      encodeURIComponent(first.nextPageToken),
    token,
    'GET',
    undefined,
    undefined,
    400,
  )
  report.checks.push('real-five-minute-cursor-expiration')
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
    } catch {
      report.shutdown = { stopped: false }
    }
  } else if (!exited) child.stdin.end()
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      output,
      complete: report.complete,
      checks: report.checks,
      stopped: report.shutdown?.stopped,
    }),
  )
}
