// Real local Web/API/SQL. Only storage/mail transports are simulated; no functional HTTP fixtures.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import {
  web,
  work,
  apiPort,
  webPort,
  prepareDatabase,
  stopDatabase,
  loadSource,
  requireBackend,
  resumeRun,
  resourceRoot,
  resumeFrom,
} from './representative-isolated-environment.mjs'
import { startBackend } from './representative-isolated-backend.mjs'
import { contractSnapshot } from './representative-contract-snapshot.mjs'
import {
  launchRepresentativeBrowser,
  representativeBrowserPath,
} from './representative-browser.mjs'

const origin = `http://127.0.0.1:${webPort}`
const report = {
  status: 'RUNNING',
  startedAt: new Date().toISOString(),
  checkpoints: {},
  recovery: {},
  captures: [],
  visual: [],
  http: [],
  seeds: [],
  counts: { privacyPosts: 0, storagePuts: 0 },
  cleanup: {},
  isolation: {
    docker: false,
    envFiles: false,
    shared43000: false,
    realMail: false,
    realSpaces: false,
  },
}
const ids = [
  'SETUP',
  'LINK',
  'PRIVACY_RECOVERY',
  'DOSSIER',
  'REVIEW',
  'FLEET',
  'FOREIGN_ACCESS',
  'RESTRICTION',
  'VISUAL',
]
for (const id of ids)
  report.checkpoints[id] = { status: 'BLOCKED', reason: 'Not started' }
let backend,
  vite,
  browser,
  admin,
  representative,
  coordinator,
  foreign,
  foreignPerson,
  person,
  outsider,
  provider,
  subject,
  caseId,
  attachmentId
let carriedReport
let reviewAlreadyApplied = false
let reviewCommand
let restrictionAlreadyApplied = false
const failures = [],
  pages = [],
  httpErrors = [],
  auth = new Map()
const scrub = (s) =>
  String(s)
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi, ':uuid')
    .replace(/[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+/g, '[synthetic-email]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[opaque]')
    .slice(0, 1000)
let saves = Promise.resolve()
function save() {
  const content = JSON.stringify(report, null, 2) + '\n'
  saves = saves.then(() => writeFile(work + '/report.json', content))
  return saves
}
async function checkpoint(id, dependencies, fn) {
  if (id !== 'SETUP' && carriedReport?.checkpoints[id]?.status === 'PASS') {
    report.checkpoints[id] = {
      ...carriedReport.checkpoints[id],
      reusedFrom: resumeFrom || resumeRun,
    }
    console.log('REUSED ' + id)
    await save()
    return
  }
  const blocked = dependencies.filter(
    (d) => report.checkpoints[d].status !== 'PASS',
  )
  if (blocked.length) {
    report.checkpoints[id] = {
      status: 'BLOCKED',
      reason: 'Dependency: ' + blocked.join(','),
    }
    await save()
    return
  }
  report.checkpoints[id] = { status: 'RUNNING' }
  await save()
  try {
    await fn()
    report.checkpoints[id].status = 'PASS'
    console.log('PASS ' + id)
  } catch (e) {
    report.checkpoints[id] = {
      ...report.checkpoints[id],
      status: 'FAIL',
      reason: scrub(e.message),
      alerts: [],
      headings: [],
    }
    failures.push(id)
    for (const p of pages)
      if (!p.isClosed()) {
        report.checkpoints[id].headings.push({
          path: scrub(new URL(p.url()).pathname),
          headings: (await p.locator('h1').allTextContents()).map(scrub),
        })
        report.checkpoints[id].alerts.push(
          ...(
            await p
              .locator('[role=alert]')
              .allTextContents()
              .catch(() => [])
          ).map(scrub),
        )
      }
    console.log('FAIL ' + id + ': ' + scrub(e.message))
  }
  await save()
}
async function context() {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  ctx.setDefaultTimeout(15000)
  await ctx.route('**/*', async (route) => {
    const r = route.request(),
      url = new URL(r.url())
    if (url.origin === origin) return route.continue()
    if (url.hostname === backend.storageHost && r.method() === 'PUT') {
      const key = decodeURIComponent(url.pathname.slice(1))
      assert(key.startsWith('verification/v1/quarantine/'))
      assert.equal(r.headers().authorization, undefined)
      assert.equal(url.searchParams.get('x-amz-acl'), 'private')
      const row = await backend.db.verificationAttachment.findUnique({
        where: { quarantineKey: key },
      })
      assert(row && row.status === 'CREATED' && row.expiresAt > new Date())
      backend.objects.set(key, r.postDataBuffer())
      backend.deletionStorage.objects.set(key, {
        current: true,
        versions: [{ id: 'synthetic', marker: false }],
        uploads: [],
      })
      report.counts.storagePuts++
      return route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': origin },
      })
    }
    httpErrors.push('Unexpected external request blocked')
    return route.abort()
  })
  const page = await ctx.newPage()
  pages.push(page)
  page.on('request', (r) => {
    if (new URL(r.url()).origin === origin && r.headers().authorization)
      auth.set(page, r.headers().authorization)
    if (r.method() === 'POST' && r.url().endsWith('/privacy/acknowledge'))
      report.counts.privacyPosts++
  })
  page.on('pageerror', (e) => httpErrors.push(scrub(e.message)))
  page.on('response', async (r) => {
    const url = new URL(r.url())
    if (!url.pathname.startsWith('/api/v1/')) return
    const entry = {
      method: r.request().method(),
      path: scrub(url.pathname),
      status: r.status(),
    }
    if (r.status() >= 400) {
      try {
        const body = await r.json()
        entry.code = scrub(body.code || body.error?.code || '')
      } catch {
        /* no raw response */
      }
    }
    report.http.push(entry)
  })
  return page
}
async function mutation(page, suffix, action, expected = 200, method = 'POST') {
  const pending = page.waitForResponse(
    (r) =>
      r.request().method() === method &&
      new URL(r.url()).pathname.endsWith(suffix),
  )
  void pending.catch(() => {})
  await action()
  const response = await pending
  assert.equal(
    response.status(),
    expected,
    `${method} ${scrub(suffix)} HTTP ${response.status()}`,
  )
  return response.json()
}
async function login(page, email) {
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(backend.password)
  await mutation(page, '/auth/login', () =>
    page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(),
  )
  await expect(page.getByLabel('Correo electrónico')).toHaveCount(0)
}
async function settled(page) {
  await expect
    .poll(async () =>
      page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k) || '[]').length,
        'mandaria.verification.pending:' + origin,
      ),
    )
    .toBe(0)
}
async function capture(page, name) {
  const file = name + '.png'
  await page.screenshot({
    path: work + '/' + file,
    fullPage: true,
    animations: 'disabled',
  })
  report.captures.push({
    file,
    sha256: createHash('sha256')
      .update(await readFile(work + '/' + file))
      .digest('hex'),
    syntheticOnly: true,
  })
}
async function visual(page, name) {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 })
    if (width === 320)
      await expect
        .poll(() =>
          page
            .locator('.sidebar')
            .evaluate((e) => e.getBoundingClientRect().right),
        )
        .toBeLessThanOrEqual(1)
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }))
    assert(
      layout.document <= layout.viewport,
      `${name}: horizontal overflow at ${width}`,
    )
    report.visual.push({ name, width, overflow: false })
    await capture(page, name + '-' + width)
  }
  await page.setViewportSize({ width: 1280, height: 900 })
}
async function privacyCounts() {
  return {
    acceptances: await backend.db.verificationAcceptance.count({
      where: {
        representativeSubjectId: subject,
        scope: 'REPRESENTATIVE_PRIVACY',
      },
    }),
    commands: await backend.db.verificationCommand.count({
      where: {
        actorId: person.id,
        operation: 'REPRESENTATIVE_PRIVACY',
        target: subject,
      },
    }),
  }
}
async function webSnapshot() {
  const previous = JSON.parse(
    await readFile(
      web + '/docs/fleet-representative-web-evidence.json',
      'utf8',
    ),
  )
  const paths = [
    ...Object.keys(previous.web.sourceHashes),
    ...Object.keys(previous.harness.closureHashes),
    'scripts/representative-browser.mjs',
    'scripts/verify-representative-browser.mjs',
  ]
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (p) => [
        p,
        createHash('sha256')
          .update(await readFile(web + '/' + p))
          .digest('hex'),
      ]),
    ),
  )
}
await mkdir(work, { recursive: true })
await save()
try {
  report.backendBefore = await contractSnapshot()
  report.webBefore = await webSnapshot()
  await checkpoint('SETUP', [], async () => {
    const isolation = await prepareDatabase()
    report.isolation.temporaryIdentity = isolation.status === 'PASS'
    backend = await startBackend()
    const db = backend.db
    if (resumeRun) {
      const previous = JSON.parse(
        await readFile(
          resourceRoot + (resumeFrom ? '/' + resumeFrom : '') + '/report.json',
          'utf8',
        ),
      )
      assert.equal(previous.checkpoints.LINK.status, 'PASS')
      assert.deepEqual(previous.backendAfter, report.backendBefore)
      person = await db.user.findUniqueOrThrow({
        where: { email: 'representative@example.invalid' },
      })
      outsider = await db.user.findUniqueOrThrow({
        where: { email: 'coordinator@example.invalid' },
      })
      foreignPerson = await db.user.findUniqueOrThrow({
        where: { email: 'other-fleet@example.invalid' },
      })
      provider = await db.deliveryProvider.findFirstOrThrow({
        where: { code: 'SYNTHETIC-REP' },
      })
      const links = await db.verificationSubject.findMany({
        where: { representativeUserId: person.id, providerId: provider.id },
      })
      assert.equal(links.length, 1)
      subject = links[0].id
      if (resumeFrom) {
        assert.equal(previous.checkpoints.PRIVACY_RECOVERY.status, 'PASS')
        assert.equal(previous.checkpoints.DOSSIER.status, 'PASS')
        assert(['FAIL', 'PASS'].includes(previous.checkpoints.REVIEW.status))
        assert.deepEqual(await privacyCounts(), { acceptances: 1, commands: 1 })
        const cases = await db.verificationCase.findMany({
          where: { subjectId: subject },
        })
        assert.equal(cases.length, 1)
        assert(['SUBMITTED', 'APPROVED'].includes(cases[0].status))
        caseId = cases[0].id
        reviewAlreadyApplied = cases[0].status === 'APPROVED'
        assert.equal(
          await db.verificationCommand.count({
            where: { operation: 'DECIDE', target: caseId },
          }),
          reviewAlreadyApplied ? 1 : 0,
        )
        if (reviewAlreadyApplied)
          reviewCommand = await db.verificationCommand.findFirstOrThrow({
            where: {
              operation: 'DECIDE',
              target: caseId,
              actorId: backend.admin.id,
            },
          })
        assert.equal(
          await db.verificationAcceptance.count({
            where: { userId: person.id, scope: 'FLEET' },
          }),
          previous.checkpoints.FLEET.status === 'PASS' ? 1 : 0,
        )
        if (previous.checkpoints.FLEET.status === 'PASS') {
          assert.equal(previous.checkpoints.RESTRICTION.status, 'FAIL')
          const restrictions = await db.documentDeletion.findMany({
            where: {
              actorId: person.id,
              scope: 'REPRESENTATIVE',
              resourceId: provider.id,
            },
          })
          assert.equal(restrictions.length, 1)
          assert(restrictions[0].confirmedAt)
          assert(
            !['CANCELLED', 'CLOSED', 'PURGED'].includes(restrictions[0].status),
          )
          restrictionAlreadyApplied = true
          report.restrictionReused = {
            confirmedRequests: 1,
            repeatedPost: false,
          }
        }
        const attachments = await db.verificationAttachment.findMany({
          where: { caseId },
        })
        assert.equal(attachments.length, 3)
        for (const attachment of attachments) {
          assert.equal(attachment.status, 'VALIDATED')
          const source =
            attachment.category === 'REPRESENTATIVE_INE_BACK'
              ? backend.jpeg
              : backend.png
          const normalized = await requireBackend('sharp')(source)
            .rotate()
            .png()
            .toBuffer()
          assert.equal(
            createHash('sha256').update(source).digest('hex'),
            attachment.sourceHash,
          )
          assert.equal(
            createHash('sha256').update(normalized).digest('hex'),
            attachment.hash,
          )
          for (const [key, bytes] of [
            [attachment.quarantineKey, source],
            [attachment.objectKey, normalized],
          ]) {
            backend.objects.set(key, bytes)
            backend.deletionStorage.objects.set(key, {
              current: true,
              versions: [{ id: 'synthetic', marker: false }],
              uploads: [],
            })
          }
        }
        attachmentId = attachments[0].id
        carriedReport = previous
        report.recovery = previous.recovery
        report.uploadAB = previous.uploadAB
        report.counts = { ...previous.counts }
        report.carriedCounts = { ...previous.counts }
        report.visual = previous.visual.map((v) => ({
          ...v,
          reusedFrom: resumeFrom,
        }))
        report.captures = previous.captures.map((c) => ({
          ...c,
          file: '../' + resumeFrom + '/' + c.file,
          reusedFrom: resumeFrom,
        }))
        report.transportPreparation =
          'Three synthetic fixtures regenerated in memory; source and normalized SHA256 match persisted attachment hashes. No upload, confirmation or case mutation repeated.'
        report.reviewAlreadyApplied = reviewAlreadyApplied
      } else {
        assert.equal(
          previous.counts.privacyPosts,
          0,
          'Resume boundary requires no privacy mutation',
        )
        assert.equal(previous.counts.storagePuts, 0)
        assert.deepEqual(await privacyCounts(), { acceptances: 0, commands: 0 })
      }
      report.seeds = previous.seeds
      report.resumedFrom = {
        run: resumeRun,
        attempt: resumeFrom || null,
        checkpoint: restrictionAlreadyApplied
          ? 'RESTRICTION'
          : resumeFrom
            ? 'REVIEW'
            : 'PRIVACY_RECOVERY',
        linkReused: true,
        reseeded: false,
      }
    } else {
      const hash = await requireBackend('argon2').hash(backend.password)
      person = await db.user.create({
        data: {
          email: 'representative@example.invalid',
          passwordHash: hash,
          role: 'PROVIDER_ADMIN',
          emailVerifiedAt: new Date(),
        },
      })
      outsider = await db.user.create({
        data: {
          email: 'coordinator@example.invalid',
          passwordHash: hash,
          role: 'PROVIDER_ADMIN',
          emailVerifiedAt: new Date(),
        },
      })
      foreignPerson = await db.user.create({
        data: {
          email: 'other-fleet@example.invalid',
          passwordHash: hash,
          role: 'PROVIDER_ADMIN',
          emailVerifiedAt: new Date(),
        },
      })
      provider = await db.deliveryProvider.create({
        data: {
          name: 'Flotilla Sintética',
          code: 'SYNTHETIC-REP',
          type: 'FLEET',
          status: 'ACTIVE',
          maxDrivers: 10,
          maxVehicles: 10,
        },
      })
      await db.providerMembership.create({
        data: { userId: outsider.id, providerId: provider.id, role: 'ADMIN' },
      })
      const foreignProvider = await db.deliveryProvider.create({
        data: {
          name: 'Otra Flotilla Sintética',
          code: 'SYNTHETIC-OTHER',
          type: 'FLEET',
          status: 'ACTIVE',
          maxDrivers: 10,
          maxVehicles: 10,
        },
      })
      await db.providerMembership.create({
        data: {
          userId: foreignPerson.id,
          providerId: foreignProvider.id,
          role: 'ADMIN',
        },
      })
      const { VerificationService } = await loadSource(
        'dist/verification/verification.service.js',
      )
      const service = backend.app.get(VerificationService)
      const policy = await service.policyState(backend.admin.id)
      await service.publishTerms(backend.admin.id, randomUUID(), {
        expectedVersion: policy.revision,
        scope: 'FLEET',
        version: 'SYNTHETIC-REP-WEB-1',
        text: 'Texto sintético de ensayo, sin validez legal. '.repeat(40),
        privacyVersion: 'SYNTHETIC-REP-NOTICE-1',
        privacyText:
          'Aviso sintético de ensayo sobre identidad y facultades. No autorizado para recepción real. '.repeat(
            40,
          ),
        specificConsents: [
          {
            id: 'identity',
            text: 'Consentimiento sintético de identidad, exclusivo del ensayo.',
          },
          {
            id: 'authority',
            text: 'Consentimiento sintético de facultades, exclusivo del ensayo.',
          },
        ],
        approvalReference: 'ISOLATED-SYNTHETIC-ONLY',
        publicationAuthorized: true,
      })
      report.seeds = [
        'confirmed SUPER_ADMIN and historical LOCAL_TEST driver/case from reused helper',
        'confirmed representative without operational membership',
        'coordinator with ADMIN membership in same synthetic fleet',
        'separate account with ADMIN membership in another synthetic fleet',
        'synthetic FLEET policy via real backend service, not Web; no real legal publication',
      ]
    }
    vite = await createServer({
      root: web,
      configFile: false,
      envDir: false,
      plugins: [react()],
      logLevel: 'silent',
      cacheDir: work + '/vite-cache',
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
      server: {
        host: '127.0.0.1',
        port: webPort,
        strictPort: true,
        proxy: { '/api/v1': { target: `http://127.0.0.1:${apiPort}` } },
      },
    })
    await vite.listen()
    browser = await launchRepresentativeBrowser(work)
    report.browser = {
      executable: representativeBrowserPath,
      version: browser.version(),
      chromiumSandbox: true,
      temporaryProfile: true,
    }
    admin = await context()
    representative = await context()
    coordinator = await context()
    foreign = await context()
    await login(admin, backend.admin.email)
    await login(representative, person.email)
    await login(coordinator, outsider.email)
    await login(foreign, foreignPerson.email)
    assert.equal(
      (await db.verificationPolicy.findUniqueOrThrow({ where: { id: 1 } }))
        .enabled,
      false,
    )
  })
  await checkpoint('LINK', ['SETUP'], async () => {
    if (resumeRun) {
      report.checkpoints.LINK.via =
        'Reused Web-created link from original run; no POST repeated'
      return
    }
    await admin.goto(origin + '/admin/fleet-representatives')
    await admin
      .getByLabel('Identificador de cuenta con correo confirmado')
      .fill(person.id)
    await admin
      .getByLabel('Identificador de flotilla', { exact: true })
      .fill(provider.id)
    await admin.getByRole('button', { name: 'Revisar vinculación' }).click()
    const receipt = await mutation(
      admin,
      '/admin/fleet-representatives',
      () =>
        admin.getByRole('button', { name: 'Confirmar', exact: true }).click(),
      201,
    )
    subject = receipt.id
    await settled(admin)
    assert.equal(
      await backend.db.providerMembership.count({
        where: { userId: person.id },
      }),
      0,
    )
    report.checkpoints.LINK.via = 'Web confirmation; no operational membership'
  })
  await checkpoint('PRIVACY_RECOVERY', ['LINK'], async () => {
    await representative.goto(
      origin + '/verification/representatives/' + subject,
    )
    const notice = representative.getByRole('region', {
      name: 'Aviso personal de representación',
    })
    await expect(notice).toBeVisible()
    await expect(representative.locator('input[type=file]')).toHaveCount(0)
    await expect(
      representative.getByLabel('Nombre completo de quien comparece'),
    ).toHaveCount(0)
    await expect(
      representative.getByRole('button', { name: 'Aceptar por esta flotilla' }),
    ).toHaveCount(0)
    await notice.focus()
    await representative.keyboard.press('PageDown')
    await expect
      .poll(() => notice.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0)
    await representative.keyboard.press('Tab')
    assert((await representative.locator(':focus').count()) === 1)
    await visual(representative, 'privacy')
    await expect(
      representative.getByRole('button', {
        name: 'Crear expediente de representación',
      }),
    ).toBeDisabled()
    assert.equal(await representative.getByRole('checkbox').count(), 3)
    for (const box of await representative.getByRole('checkbox').all()) {
      await expect(box).not.toBeChecked()
      await box.check()
    }
    report.recovery.before = await privacyCounts()
    let committed = false
    const lost = '**/fleet-representatives/' + subject + '/privacy/acknowledge'
    await representative.route(
      lost,
      async (route) => {
        const response = await route.fetch()
        assert.equal(response.status(), 200)
        report.recovery.afterCommit = await privacyCounts()
        committed = true
        await route.abort('failed')
      },
      { times: 1 },
    )
    await representative
      .getByRole('button', { name: 'Confirmar privacidad personal' })
      .click()
    await expect.poll(() => committed).toBe(true)
    await expect(
      representative.getByRole('button', { name: 'Consultar intento' }),
    ).toBeVisible()
    const marker = await representative.evaluate(
      (k) => JSON.parse(localStorage.getItem(k))[0],
      'mandaria.verification.pending:' + origin,
    )
    assert.deepEqual(Object.keys(marker).sort(), [
      'actor',
      'key',
      'operation',
      'target',
    ])
    assert.equal(marker.operation, 'REPRESENTATIVE_PRIVACY')
    await visual(representative, 'pending-recovery')
    await representative.reload() // marker survives; no body, new key or automatic POST.
    const recoveredMarker = await representative.evaluate(
      (k) => JSON.parse(localStorage.getItem(k))[0],
      'mandaria.verification.pending:' + origin,
    )
    assert.deepEqual(recoveredMarker, marker)
    await representative
      .getByRole('button', { name: 'Consultar intento' })
      .click()
    await expect(
      representative.getByText(
        /Privacidad personal confirmada para esta versión/,
      ),
    ).toBeVisible()
    await settled(representative)
    report.recovery.afterGet = await privacyCounts()
    assert.deepEqual(report.recovery.before, { acceptances: 0, commands: 0 })
    assert.deepEqual(report.recovery.afterCommit, {
      acceptances: 1,
      commands: 1,
    })
    assert.deepEqual(report.recovery.afterGet, report.recovery.afterCommit)
    assert.equal(report.counts.privacyPosts, 1)
    const command = await backend.db.verificationCommand.findUniqueOrThrow({
      where: { actorId_key: { actorId: person.id, key: marker.key } },
    })
    assert.equal(command.state, 'APPLIED')
    assert.equal(command.operation, marker.operation)
    assert.equal(command.target, marker.target)
    report.recovery.originalKeyPreserved = true
    report.recovery.markerFields = Object.keys(marker).sort()
    report.recovery.postCount = report.counts.privacyPosts
    await expect(
      representative.getByText(
        /Comprobante histórico recuperado; estado vigente consultado/,
      ),
    ).toBeVisible()
    assert.equal(
      await backend.db.verificationCase.count({
        where: { subjectId: subject },
      }),
      0,
    )
    assert.equal(
      await backend.db.verificationAcceptance.count({
        where: { userId: person.id, scope: 'FLEET' },
      }),
      0,
    )
  })
  await checkpoint('DOSSIER', ['PRIVACY_RECOVERY'], async () => {
    const created = await mutation(
      representative,
      `/fleet-representatives/${subject}/cases`,
      () =>
        representative
          .getByRole('button', { name: 'Crear expediente de representación' })
          .click(),
      201,
    )
    caseId = created.id
    await representative.waitForURL('**/verification/cases/' + caseId)
    await representative
      .getByLabel('Forma de actuación')
      .selectOption('APPOINTMENT')
    await representative
      .getByLabel('Nombre completo de quien comparece')
      .fill('Persona Sintética')
    await representative
      .getByLabel('Nombre del titular o razón social')
      .fill('Organización Sintética')
    await representative
      .getByLabel('Vencimiento de INE, hora local')
      .fill('2035-01-01T12:00')
    await representative
      .getByLabel('Inicio de vigencia declarado, hora local')
      .fill('2026-01-01T12:00')
    await representative
      .getByLabel('Límites de la actuación')
      .fill('Sólo contrato sintético de flotilla.')
    await representative
      .getByRole('checkbox', { name: /Declaro vigente/ })
      .check()
    await mutation(
      representative,
      '/verification-cases/' + caseId,
      () =>
        representative
          .getByRole('button', { name: 'Guardar representación' })
          .click(),
      200,
      'PATCH',
    )
    await settled(representative)
    for (const [i, category] of [
      'REPRESENTATIVE_INE_FRONT',
      'REPRESENTATIVE_INE_BACK',
      'REPRESENTATION_AUTHORITY_PAGE',
    ].entries()) {
      await representative.getByLabel('Categoría').selectOption(category)
      if (i !== 1)
        await representative
          .getByLabel('Imagen *', { exact: true })
          .setInputFiles({
            name: 'synthetic-' + i + (i === 1 ? '.jpg' : '.png'),
            mimeType: i === 1 ? 'image/jpeg' : 'image/png',
            buffer: i === 1 ? backend.jpeg : backend.png,
          })
      const committed = Promise.withResolvers()
      const release = Promise.withResolvers()
      if (i === 0)
        await representative.route(
          '**/uploads/*/complete',
          async (route) => {
            try {
              const response = await route.fetch()
              assert.equal(response.status(), 200)
              committed.resolve()
              await release.promise
              await route.fulfill({ response })
            } catch (error) {
              committed.reject(error)
              await route.abort()
            }
          },
          { times: 1 },
        )
      const pending = representative.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          /\/uploads\/[^/]+\/complete$/.test(new URL(r.url()).pathname),
      )
      void pending.catch(() => {})
      await representative
        .getByRole('button', { name: 'Cargar imagen', exact: true })
        .click()
      if (i === 0) {
        try {
          await Promise.race([committed.promise, pending])
          await representative
            .getByLabel('Imagen *', { exact: true })
            .setInputFiles({
              name: 'synthetic-1.jpg',
              mimeType: 'image/jpeg',
              buffer: backend.jpeg,
            })
        } finally {
          release.resolve()
        }
      }
      assert.equal((await pending).status(), 200)
      await settled(representative)
      await expect(
        representative.getByRole('button', {
          name: 'Cargar imagen',
          exact: true,
        }),
      ).toBeEnabled()
      if (i === 0) {
        assert.equal(
          await representative
            .getByLabel('Imagen *', { exact: true })
            .evaluate((e) => e.files[0]?.name),
          'synthetic-1.jpg',
        )
        assert.equal(report.counts.storagePuts, 1)
        assert.equal(
          await backend.db.verificationAttachment.count({ where: { caseId } }),
          1,
        )
        report.uploadAB = {
          afterA: { selected: 'B', puts: 1, attachments: 1 },
          automaticB: false,
        }
      }
      if (i === 1) {
        assert.equal(report.counts.storagePuts, 2)
        report.uploadAB.afterExplicitB = {
          puts: 2,
          attachments: await backend.db.verificationAttachment.count({
            where: { caseId },
          }),
        }
        assert.equal(report.uploadAB.afterExplicitB.attachments, 2)
      }
    }
    await representative
      .getByRole('checkbox', { name: /Declaro vigente/ })
      .check()
    await mutation(
      representative,
      '/verification-cases/' + caseId,
      () =>
        representative
          .getByRole('button', { name: 'Guardar representación' })
          .click(),
      200,
      'PATCH',
    )
    await settled(representative)
    await visual(representative, 'dossier')
    await representative
      .getByRole('button', { name: 'Presentar representación para revisión' })
      .click()
    await expect(representative.getByRole('dialog')).toBeVisible()
    assert(
      await representative
        .getByRole('dialog')
        .evaluate((e) => e.contains(document.activeElement)),
    )
    await mutation(representative, `/verification-cases/${caseId}/submit`, () =>
      representative
        .getByRole('button', { name: 'Confirmar', exact: true })
        .click(),
    )
    await settled(representative)
    await expect(
      representative.getByRole('heading', {
        name: 'Representación legal · En revisión',
        exact: true,
      }),
    ).toBeVisible()
    const row = await backend.db.verificationCase.findUniqueOrThrow({
      where: { id: caseId },
    })
    assert.equal(row.status, 'SUBMITTED')
    assert.equal(row.data.authorityPages.length, 1)
    await visual(representative, 'submitted')
    attachmentId = (
      await backend.db.verificationAttachment.findFirstOrThrow({
        where: { caseId, status: 'VALIDATED' },
      })
    ).id
  })
  await checkpoint('REVIEW', ['DOSSIER'], async () => {
    if (reviewAlreadyApplied) {
      const recovered = await admin.request.get(
        origin +
          `/api/v1/verification-command-attempts/${reviewCommand.key}?operation=DECIDE&target=${caseId}`,
        { headers: { Authorization: auth.get(admin) } },
      )
      assert.equal(recovered.status(), 200)
      const receipt = await recovered.json()
      assert.equal(receipt.state, 'APPLIED')
      assert.equal(receipt.result.status, 'APPROVED')
      await admin.goto(origin + '/verification/cases/' + caseId)
      await expect(
        admin.getByRole('heading', {
          name: 'Representación legal · Aprobado',
          exact: true,
        }),
      ).toBeVisible()
    } else {
      await admin.goto(origin + '/admin/verification-cases')
      await admin
        .getByRole('link', { name: 'Expediente · En revisión' })
        .click()
      await expect(
        admin.getByRole('heading', {
          name: 'Decisión SUPER_ADMIN',
          exact: true,
        }),
      ).toBeVisible()
      const requirementsResponse = await admin.request.get(
        origin + '/api/v1/verification-requirements',
        { headers: { Authorization: auth.get(admin) } },
      )
      assert.equal(requirementsResponse.status(), 200)
      const checks = (await requirementsResponse.json()).representative.checks
      assert(checks.length > 0)
      await expect(admin.getByRole('checkbox')).toHaveCount(checks.length)
      await expect(
        admin.getByRole('button', { name: 'Ver evidencia', exact: true }),
      ).toHaveCount(3)
      for (const button of await admin
        .getByRole('button', { name: 'Ver evidencia', exact: true })
        .all()) {
        await button.click()
        await expect(
          admin.getByAltText('Evidencia privada del expediente'),
        ).toBeVisible()
        await admin.getByRole('button', { name: 'Cerrar evidencia' }).click()
      }
      for (const box of await admin.getByRole('checkbox').all())
        await box.check()
      for (const box of await admin.getByRole('checkbox').all())
        await expect(box).toBeChecked()
      await admin
        .getByLabel('Motivo público *')
        .fill(
          'Revisión sintética: identidad y facultades individuales suficientes para el ensayo.',
        )
      await admin
        .getByRole('button', { name: 'Registrar decisión explícita' })
        .click()
      await expect(
        admin.getByRole('dialog', {
          name: 'Confirmar decisión de representación',
        }),
      ).toBeVisible()
      await mutation(
        admin,
        `/admin/verification-cases/${caseId}/decision`,
        () =>
          admin.getByRole('button', { name: 'Confirmar', exact: true }).click(),
      )
      await settled(admin)
      report.checkpoints.REVIEW.evidenceViewed = 3
      report.checkpoints.REVIEW.checksConfirmed = checks.length
    }
    await visual(admin, 'review')
    await representative.goto(origin + '/verification/cases/' + caseId)
    await expect(
      representative.getByRole('heading', {
        name: 'Representación legal · Aprobado',
        exact: true,
      }),
    ).toBeVisible()
    assert.equal(
      await backend.db.verificationAcceptance.count({
        where: { userId: person.id, scope: 'FLEET' },
      }),
      0,
    )
    report.checkpoints.REVIEW.acceptanceAutomaticallyCreated = false
    if (reviewAlreadyApplied)
      report.checkpoints.REVIEW.decisionReusedByGet = true
    assert.deepEqual(
      (
        await backend.db.verificationCase.findMany({
          where: { status: 'APPROVED' },
          select: { id: true },
        })
      ).map((c) => c.id),
      [caseId],
    )
    assert.equal(
      (
        await backend.db.verificationPolicy.findUniqueOrThrow({
          where: { id: 1 },
        })
      ).enabled,
      false,
    )
    report.checkpoints.REVIEW.otherCaseApproved = false
    report.checkpoints.REVIEW.admissionEnabled = false
    await visual(representative, 'approved')
    await representative.setViewportSize({ width: 320, height: 900 })
    const menu = representative.getByRole('button', { name: 'Abrir menú' })
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect
      .poll(() =>
        representative
          .locator('.sidebar')
          .evaluate((e) => e.contains(document.activeElement)),
      )
      .toBe(true)
    await representative.keyboard.press('Escape')
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeFocused()
    report.checkpoints.REVIEW.mobileNavigationKeyboard = true
    await representative.setViewportSize({ width: 1280, height: 900 })
  })
  await checkpoint('FLEET', ['REVIEW'], async () => {
    await representative
      .getByRole('link', { name: 'Volver al vínculo y aceptación FLEET' })
      .click()
    const panel = representative.locator('section').filter({
      has: representative.getByRole('heading', {
        name: /^Términos de la flotilla/,
      }),
    })
    await expect(
      panel.getByRole('button', { name: 'Aceptar por esta flotilla' }),
    ).toBeVisible()
    await visual(representative, 'fleet-before-acceptance')
    for (const box of await panel.getByRole('checkbox').all()) {
      await expect(box).not.toBeChecked()
      await box.check()
    }
    await mutation(representative, '/verification-terms/accept', () =>
      panel.getByRole('button', { name: 'Aceptar por esta flotilla' }).click(),
    )
    await settled(representative)
    const accepted = await backend.db.verificationAcceptance.findFirstOrThrow({
      where: { userId: person.id, scope: 'FLEET' },
    })
    assert.equal(accepted.representationCaseId, caseId)
    assert.equal(
      (
        await backend.db.verificationPolicy.findUniqueOrThrow({
          where: { id: 1 },
        })
      ).enabled,
      false,
    )
    report.checkpoints.FLEET.admissionEnabled = false
    assert.equal(
      await backend.db.verificationAcceptance.count({
        where: { scope: 'DRIVER' },
      }),
      0,
    )
    const history = await backend.db.verificationCase.findUniqueOrThrow({
      where: { id: backend.historicalCase.id },
    })
    assert.deepEqual(history, backend.historicalCase)
    assert.equal(history.environment, 'LOCAL_TEST')
    report.checkpoints.FLEET.localTestHistoryUnchanged = true
    report.checkpoints.FLEET.driverAcceptanceCreated = false
    await expect(
      representative.getByRole('link', { name: 'Consultar texto aceptado' }),
    ).toBeVisible()
    await representative
      .getByRole('link', { name: 'Consultar texto aceptado' })
      .click()
    await expect(
      representative.getByText(/histórica|histórico/).first(),
    ).toBeVisible()
    await visual(representative, 'fleet-receipt')
  })
  await checkpoint('FOREIGN_ACCESS', ['DOSSIER'], async () => {
    for (const untrusted of [coordinator, foreign]) {
      const coordinator = untrusted
      await coordinator.goto(
        origin + '/verification/representatives/' + subject,
      )
      await expect(
        coordinator.getByText(/Este vínculo no está disponible/),
      ).toBeVisible()
      await coordinator.goto(origin + '/verification/cases/' + caseId)
      await expect(
        coordinator
          .locator('[role=alert]')
          .filter({ hasText: /no está disponible|no disponible/ })
          .first(),
      ).toBeVisible()
      await expect(
        coordinator.getByAltText('Evidencia privada del expediente'),
      ).toHaveCount(0)
      const access = await coordinator.request.post(
        origin +
          `/api/v1/verification-cases/${caseId}/attachments/${attachmentId}/access`,
        { headers: { Authorization: auth.get(coordinator) } },
      )
      assert.equal(access.status(), 404)
      await expect(
        coordinator.getByText('Persona Sintética', { exact: true }),
      ).toHaveCount(0)
      await expect(coordinator.locator('input[type=file]')).toHaveCount(0)
    }
    report.checkpoints.FOREIGN_ACCESS.detail =
      'Both coordinator of same fleet and account of another fleet: Web case/link denied, no private fields, private bytes HTTP 404'
    await visual(coordinator, 'denied')
  })
  await checkpoint('RESTRICTION', ['FLEET'], async () => {
    if (restrictionAlreadyApplied) {
      await representative.goto(origin + '/verification/cases/' + caseId)
      report.checkpoints.RESTRICTION.requestReusedWithoutPost = true
    } else {
      await representative.goto(origin + '/verification/cases/' + caseId)
      await representative
        .getByRole('button', { name: 'Ver evidencia', exact: true })
        .first()
        .click()
      await expect(
        representative.getByAltText('Evidencia privada del expediente'),
      ).toBeVisible()
      await representative
        .getByRole('link', { name: 'Volver al vínculo y aceptación FLEET' })
        .click()
      await expect(
        representative.getByAltText('Evidencia privada del expediente'),
      ).toHaveCount(0)
      report.checkpoints.RESTRICTION.caseContextClearedBeforeRequest = true
      await representative
        .getByRole('link', { name: /Aprobado · revisión/ })
        .click()
      await representative
        .getByRole('button', { name: 'Ver evidencia', exact: true })
        .first()
        .click()
      await expect(
        representative.getByAltText('Evidencia privada del expediente'),
      ).toBeVisible()
      // Preparatory real API command, explicitly not claimed as the deletion UI journey.
      const deletion = await representative.request.post(
        origin + '/api/v1/privacy/deletion-requests',
        {
          headers: {
            Authorization: auth.get(representative),
            'Idempotency-Key': randomUUID(),
          },
          data: {
            scope: 'REPRESENTATIVE',
            resourceId: provider.id,
            password: backend.password,
            acknowledgment: true,
          },
        },
      )
      assert.equal(deletion.status(), 202)
    }
    await expect(
      representative.getByText(/Este alcance documental está restringido/),
    ).toBeVisible({ timeout: 15000 }) // Current case/link queries poll every 10 seconds.
    await expect(
      representative.getByAltText('Evidencia privada del expediente'),
    ).toHaveCount(0)
    await expect(
      representative.getByText('Persona Sintética', { exact: true }),
    ).toHaveCount(0)
    await expect(representative.locator('input[type=file]')).toHaveCount(0)
    const headers = {
      Authorization: auth.get(representative),
      'Idempotency-Key': randomUUID(),
    }
    const access = await representative.request.post(
      origin +
        `/api/v1/verification-cases/${caseId}/attachments/${attachmentId}/access`,
      { headers },
    )
    assert.equal(access.status(), 409)
    const accessError = await access.json()
    assert.equal(
      accessError.code || accessError.error?.code,
      'DELETION_RESTRICTED',
    )
    const upload = await representative.request.post(
      origin + `/api/v1/verification-cases/${caseId}/uploads`,
      {
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        data: { expectedVersion: 1, category: 'REPRESENTATIVE_INE_FRONT' },
      },
    )
    assert.equal(upload.status(), 409)
    const uploadError = await upload.json()
    assert.equal(
      uploadError.code || uploadError.error?.code,
      'DELETION_RESTRICTED',
    )
    const complete = await representative.request.post(
      origin +
        `/api/v1/verification-cases/${caseId}/uploads/${attachmentId}/complete`,
      {
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        data: { expectedVersion: 1 },
      },
    )
    assert.equal(complete.status(), 409)
    const completeError = await complete.json()
    assert.equal(
      completeError.code || completeError.error?.code,
      'DELETION_RESTRICTED',
    )
    report.checkpoints.RESTRICTION.detail =
      'REPRESENTATIVE restriction prepared via real authenticated API; Web hides data and API denies access/upload/complete. No cleanup campaign or total deletion claim.'
    await visual(representative, 'restricted')
    await representative.locator('.user-trigger').click()
    await representative
      .getByRole('button', { name: 'Cerrar sesión', exact: true })
      .click()
    await expect(representative.getByLabel('Correo electrónico')).toBeVisible()
    await login(representative, outsider.email)
    await expect(representative.locator('.user-trigger')).toContainText(
      outsider.email,
    )
    const deniedRead = representative.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        new URL(r.url()).pathname === '/api/v1/verification-cases/' + caseId,
    )
    void deniedRead.catch(() => {})
    await representative.goto(origin + '/verification/cases/' + caseId)
    const denied = await deniedRead
    assert.equal(denied.status(), 409)
    const deniedBody = await denied.json()
    assert.equal(
      deniedBody.code || deniedBody.error?.code,
      'DELETION_RESTRICTED',
    )
    // Backend checks the subject gate before ownership: 404 before restriction,
    // DELETION_RESTRICTED after it. Both deny private data; do not weaken to any error.
    await expect(
      representative
        .getByRole('alert')
        .filter({ hasText: 'Este alcance documental está restringido' }),
    ).toBeVisible()
    await expect(
      representative.getByAltText('Evidencia privada del expediente'),
    ).toHaveCount(0)
    await expect(
      representative.getByText('Persona Sintética', { exact: true }),
    ).toHaveCount(0)
    report.checkpoints.RESTRICTION.contextAndAccountCleared = true
  })
  await checkpoint('VISUAL', ['SETUP'], async () => {
    assert.equal(httpErrors.length, 0)
    assert.equal(report.http.filter((r) => r.status >= 500).length, 0)
    for (const name of [
      'privacy',
      'pending-recovery',
      'dossier',
      'submitted',
      'review',
      'approved',
      'fleet-before-acceptance',
      'fleet-receipt',
      'denied',
      'restricted',
    ])
      for (const width of [1280, 320])
        assert(
          report.visual.some((v) => v.name === name && v.width === width),
          name + ':' + width,
        )
    report.checkpoints.VISUAL.scope = report.visual.map(
      (x) => x.name + ':' + x.width,
    )
    report.checkpoints.VISUAL.keyboardFocusAndLongText =
      report.checkpoints.PRIVACY_RECOVERY.status === 'PASS'
  })
} catch (e) {
  failures.push('RUNNER')
  report.runnerError = scrub(e.message)
  console.log('RUNNER ' + scrub(e.message))
} finally {
  report.webAfter = await webSnapshot().catch(() => ({}))
  report.webChanged = Object.keys(report.webBefore || {}).filter(
    (k) => report.webBefore[k] !== report.webAfter[k],
  )
  if (report.webChanged.length) failures.push('WEB_CHANGED')
  report.backendAfter = await contractSnapshot().catch(() => ({}))
  report.backendChanged = Object.keys(report.backendBefore || {}).filter(
    (k) => report.backendBefore[k] !== report.backendAfter[k],
  )
  if (report.backendChanged.length) failures.push('CONTRACT_CHANGED')
  report.cleanup.browser =
    (await browser
      ?.close()
      .then(() => true)
      .catch(() => false)) ?? true
  report.cleanup.web =
    (await vite
      ?.close()
      .then(() => true)
      .catch(() => false)) ?? true
  report.cleanup.backend =
    (await backend
      ?.close()
      .then(() => true)
      .catch(() => false)) ?? true
  report.cleanup.postgresql = await stopDatabase()
  report.status = failures.length
    ? 'FAIL'
    : ids.every((id) => report.checkpoints[id].status === 'PASS')
      ? 'PASS'
      : 'PARTIAL'
  report.finishedAt = new Date().toISOString()
  report.failures = failures
  await save()
  console.log(
    JSON.stringify({
      status: report.status,
      report: work + '/report.json',
      cleanup: report.cleanup,
    }),
  )
  if (report.status !== 'PASS') process.exitCode = 1
}
