// Presentation-only browser review. Every API read is a synthetic fixture;
// all mutations and external origins are rejected. No backend or existing .env.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const output = `test-results/restriction-review-${Date.now()}`
const origin = 'http://127.0.0.1:4198'
await mkdir(output, { recursive: true })
const report = {
  kind: 'SYNTHETIC_PRESENTATION_ONLY',
  status: 'RUNNING',
  output,
  checks: [],
  screenshots: [],
  requests: [],
  unexpected: [],
  errors: [],
  mutations: 0,
  integrationReal: false,
  backendStarted: false,
}
const save = () =>
  writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n')
const files = [
  'src/deletion/operational-contract.ts',
  'src/deletion/operational-review.tsx',
  'src/deletion/operational.tsx',
  'src/deletion/pages.tsx',
  'src/deletion/review.tsx',
  'src/deletion/contract.ts',
  'src/deletion/service.ts',
  'src/deletion/hooks.ts',
  'src/deletion/pending.ts',
  'src/deletion/receipt.ts',
  'src/test/deletion-v2-fixtures.ts',
  'scripts/verify-restriction-review-web.mjs',
]
const hashes = () =>
  Promise.all(
    files.map(async (file) => ({
      file,
      sha256: createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
    })),
  )
await save()
let server, browser
try {
  report.hashes = await hashes()
  await writeFile(
    `${output}/index.html`,
    '<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./harness.tsx"></script></html>',
  )
  await writeFile(
    `${output}/harness.tsx`,
    `
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../src/services/query'
import { App } from '../../src/app/App'
import { AuthContext } from '../../src/auth/context'
import { FeedbackProvider } from '../../src/components/Feedback'
import '../../src/index.css'
const user={id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.test',role:'SUPER_ADMIN',active:true,emailVerifiedAt:'2027-02-01T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
const path=new URLSearchParams(location.search).get('path')!
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[path]}><App/></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
  )
  server = await createServer({
    configFile: false,
    envDir: false,
    plugins: [react()],
    cacheDir: output + '/vite-cache',
    logLevel: 'silent',
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
    server: { host: '127.0.0.1', port: 4198, strictPort: true },
  })
  await server.listen()
  const {
    operationalFixture,
    restrictionPresentation: task,
    restrictionReviewNow,
  } = await server.ssrLoadModule('/src/test/deletion-v2-fixtures.ts')
  const current = {
    ...operationalFixture,
    status: 'CANCELLED',
    authorizationState: 'BLOCKED',
    blockingReason: 'AUTHORIZATION_UNDER_REVIEW',
    incidentPending: true,
    lastReviewAt: null,
    nextReviewAt: null,
    surveillanceEndsAt: null,
  }
  report.fixedNow = restrictionReviewNow
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(15000)
  await page.clock.setFixedTime(new Date(restrictionReviewNow))
  page.on('pageerror', (e) => report.errors.push(e.name + ': ' + e.message))
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.origin !== origin) {
      report.unexpected.push('external origin')
      return route.abort()
    }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    const path = url.pathname.slice(7)
    report.requests.push({
      method: req.method(),
      path: path.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, ':uuid'),
    })
    if (req.method() !== 'GET') {
      report.mutations++
      return route.abort()
    }
    let body
    if (path === '/admin/privacy/deletion-requests') body = [current]
    else if (path === `/admin/privacy/deletion-requests/${current.id}/tasks`)
      body = [task]
    else if (
      path === `/admin/privacy/deletion-requests/${current.id}/work-items` ||
      path === `/admin/privacy/deletion-requests/${current.id}/replacements`
    )
      body = []
    else {
      report.unexpected.push(path)
      return route.abort()
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  await page.goto(
    `${origin}/${output}/index.html?${new URLSearchParams({ path: '/admin/privacy/deletion/' + current.id })}`,
  )
  await expect(
    page.getByRole('heading', { name: 'Solicitud de baja', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Decisión operativa V2')).toBeEnabled()
  await expect(
    page.getByText('Limpieza cancelada; autorización de limpieza bloqueada', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByText('Responsabilidad registrada', { exact: true }),
  ).toBeVisible()
  report.checks.push(
    'Rendered current blocked message and separately reported ACKNOWLEDGED task',
  )
  await save()
  const regions = task.restrictions.map((g) =>
    page.getByRole('region', { name: 'Restricción ' + g.id, exact: true }),
  )
  await expect(regions[0].getByText('Conductor', { exact: true })).toBeVisible()
  await expect(
    regions[0].getByText(
      'Restricción activa; no consta una decisión de revisión',
    ),
  ).toBeVisible()
  await expect(
    regions[1].getByText('Se mantiene esta restricción', { exact: true }),
  ).toBeVisible()
  await expect(regions[1].getByText('Próxima revisión informada')).toBeVisible()
  await expect(
    regions[2].getByText(
      'Restricción retirada. Esto no habilita automáticamente la cuenta',
    ),
  ).toBeVisible()
  await expect(
    regions[3].getByText('Revisión programada vencida'),
  ).toBeVisible()
  await expect(
    page.getByText('revisión de restricciones completada', { exact: false }),
  ).toHaveCount(0)
  const targets = [
    [
      'blocked-message',
      page.getByRole('region', {
        name: 'Situación operativa vigente',
        exact: true,
      }),
    ],
    [
      'task-state',
      page
        .getByRole('article', { name: 'Revisión ' + task.id, exact: true })
        .locator('dl')
        .first(),
    ],
    ['pending-conductor', regions[0]],
    ['keep-future', regions[1]],
    ['release', regions[2]],
    ['keep-overdue', regions[3]],
  ]
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    for (const [name, locator] of targets) {
      const file = `${output}/${name}-${width}.png`
      await locator.screenshot({ path: file })
      report.screenshots.push(file)
    }
    const select = page.getByLabel('Decisión operativa V2')
    await select.focus()
    await expect(select).toBeFocused()
    const file = `${output}/keyboard-focus-${width}.png`
    await page.screenshot({ path: file })
    report.screenshots.push(file)
    await page.keyboard.press('Tab')
    assert.equal(
      await page.evaluate(
        () =>
          document.activeElement !== document.body && !!document.activeElement,
      ),
      true,
    )
    report.checks.push(
      `${width}px: legible presentation captures, no overflow, keyboard focus and tab navigation`,
    )
  }
  assert.equal(report.mutations, 0)
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [])
  assert.deepEqual(report.unexpected, [])
  assert.deepEqual(report.errors, [])
  assert.deepEqual(await hashes(), report.hashes)
  report.checks.push(
    'No mutation, marker, receipt-recovery call, external origin or runtime error',
  )
  report.status = 'PASS'
} catch (e) {
  report.status = 'FAIL'
  report.failure = String(e)
  process.exitCode = 1
} finally {
  await browser?.close()
  await server?.close()
  report.cleanup = { browserClosed: true, serverClosed: true }
  await save()
  console.log(
    JSON.stringify({
      status: report.status,
      output,
      failure: report.failure,
      checks: report.checks.length,
      screenshots: report.screenshots.length,
    }),
  )
}
