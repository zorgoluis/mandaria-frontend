// Synthetic browser fixtures only. No backend, .env, Docker, storage or mail.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = `test-results/deletion-v2-${Date.now()}`
await mkdir(output, { recursive: true })
await writeFile(
  `${output}/index.html`,
  `<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/${output}/harness.tsx"></script></html>`,
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
const q = new URLSearchParams(location.search)
const user={id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.test',role:q.get('admin')?'SUPER_ADMIN':'DRIVER',active:true,emailVerifiedAt:'2026-10-18T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[q.get('path')]}><App/></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4199'),
  },
  server: { host: '127.0.0.1', port: 4199, strictPort: true },
})
let browser,
  current,
  work,
  task,
  posts = 0,
  conflict = false
const checks = [],
  screenshots = [],
  unexpected = [],
  errors = []
const report = {
  kind: 'SYNTHETIC_BROWSER_FIXTURES',
  output,
  checks,
  screenshots,
  unexpected,
  errors,
  status: 'RUNNING',
  integrationHTTPPostgreSQL: false,
  realSpaces: false,
}
try {
  await server.listen()
  const fixtures = await server.ssrLoadModule(
    '/src/test/deletion-v2-fixtures.ts',
  )
  const {
    operationalFixture: s,
    operationalItem: i,
    restrictionTask: t,
  } = fixtures
  current = structuredClone(s)
  work = structuredClone(i)
  task = structuredClone(t)
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.hostname !== '127.0.0.1' || url.port !== '4199') {
      unexpected.push('external')
      return route.abort()
    }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    const path = url.pathname.slice(7)
    let body,
      status = 200
    if (path.endsWith('/resolve') && req.method() === 'POST') {
      posts++
      const d = req.postDataJSON()
      assert.equal(d.action, 'REVIEW_RESTRICTION')
      assert.equal(d.gateId, task.restrictions[0].id)
      assert.equal(d.gateDecision, 'RELEASE')
      assert.ok(d.reason)
      assert.ok(req.headers()['idempotency-key'])
      if (conflict) {
        conflict = false
        current.revision++
        status = 409
        body = { code: 'SCOPE_VERSION_CONFLICT' }
      } else {
        task.restrictions[0].active = false
        current.revision++
        body = current
      }
    } else if (path.endsWith('/receipt'))
      body = {
        ...current,
        evidenceLevel: 'PARTIAL_CONTROLLED_SUBSCOPES',
        fullErasureAttested: false,
        completedDocumentaryScopes: 1,
      }
    else if (path.endsWith('/work-items')) body = [work]
    else if (path.endsWith('/tasks')) body = [task]
    else if (path.endsWith('/replacements')) body = []
    else if (path === '/admin/privacy/deletion-requests') body = [current]
    else if (path === '/privacy/deletion-requests/' + current.id) body = current
    else {
      unexpected.push(`${req.method()} ${path}`)
      status = 500
      body = { code: 'UNEXPECTED_SYNTHETIC_ROUTE' }
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  async function open(admin = false) {
    await page.goto(
      `http://127.0.0.1:4199/${output}/index.html?${new URLSearchParams({ path: (admin ? '/admin' : '') + '/privacy/deletion/' + current.id, ...(admin ? { admin: '1' } : {}) })}`,
    )
    await expect(
      page.getByRole('heading', { name: 'Solicitud de baja', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'Situación operativa vigente',
        exact: true,
      }),
    ).toBeVisible()
    if (admin)
      await expect(page.getByLabel('Decisión operativa V2')).toBeVisible()
  }
  async function capture(name) {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflow ${width}`,
      )
      const path = `${output}/${name}-${width}.png`
      await page.screenshot({ path, fullPage: true })
      screenshots.push(path)
    }
    checks.push(`${name}: desktop/320 no horizontal overflow`)
  }
  await open()
  await expect(
    page.getByText(/Una fecha programada no acredita ejecución/),
  ).toBeVisible()
  await capture('tracking')
  current = {
    ...s,
    status: 'CLOSED',
    closedAt: '2027-02-02T12:00:00.000Z',
    incidentPending: true,
    completedDocumentaryScopes: 1,
  }
  await open()
  await expect(
    page.getByText(/incidencia actual que sigue en revisión/),
  ).toBeVisible()
  await capture('historical-h-incident')
  await page
    .getByRole('button', { name: 'Consultar constancia del backend' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Constancia de alcance limitado' }),
  ).toBeVisible()
  await capture('partial-receipt')
  current = {
    ...s,
    status: 'CANCELLED',
    authorizationState: 'TERMINATED',
    blockingReason: 'RESTRICTIONS_UNDER_REVIEW',
    irreversibleStarted: false,
  }
  await open(true)
  await expect(page.getByLabel('Decisión operativa V2')).toBeEnabled()
  await expect(
    page.getByText('Limpieza cancelada; restricciones en revisión', {
      exact: true,
    }),
  ).toBeVisible()
  await capture('cancelled-restrictions')
  current = {
    ...s,
    authorizationState: 'BLOCKED',
    incidentPending: true,
    blockingReason: 'AUTHORIZATION_UNDER_REVIEW',
    irreversibleStarted: false,
  }
  work = {
    ...i,
    nextReviewAt: '2020-01-01T00:00:00Z',
    incidentCode: 'RESIDUE_AWAITING_REVIEW',
    incidentAt: '2027-02-02T00:00:00Z',
  }
  await open(true)
  await expect(page.getByText(/Residuos detectados/)).toBeVisible()
  await capture('admin-reviews')
  await page
    .getByLabel('Decisión operativa V2')
    .selectOption('REVIEW_RESTRICTION')
  await page.getByLabel('Referencia UUID de evidencia V2').fill(s.id)
  await page.getByLabel('Revisión asignada').selectOption(task.id)
  await page
    .getByLabel('Restricción concreta')
    .selectOption(task.restrictions[0].id)
  await page.getByLabel('Decisión sobre esta restricción').selectOption('KEEP')
  await page
    .getByLabel('Motivo concreto')
    .fill('Revisión sintética de una restricción')
  await page.getByLabel(/Próxima revisión \(ISO/).fill('2020-01-01T00:00:00Z')
  await page.getByRole('button', { name: 'Revisar actuación V2' }).click()
  await expect(page.getByText(/Indica una revisión futura/)).toBeVisible()
  assert.equal(posts, 0)
  checks.push('KEEP date validation without mutation')
  await page
    .getByLabel('Decisión sobre esta restricción')
    .selectOption('RELEASE')
  await page.getByRole('button', { name: 'Revisar actuación V2' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', {
    name: 'Confirmar actuación operativa',
  })
  await expect(dialog).toBeVisible()
  assert.ok(await dialog.evaluate((el) => el.contains(document.activeElement)))
  await dialog.getByRole('checkbox').focus()
  await page.keyboard.press('Space')
  await dialog.getByRole('button', { name: 'Confirmar actuación V2' }).focus()
  await capture('selective-confirmation')
  conflict = true
  await page.keyboard.press('Enter')
  await expect(dialog.getByText(/La solicitud cambió. Cierra/)).toBeVisible()
  assert.equal(posts, 1)
  await capture('version-conflict')
  // Refreshed revision invalidates captured confirmation. No automatic retry.
  await expect(
    dialog.getByRole('button', { name: 'Confirmar actuación V2' }),
  ).toBeDisabled()
  await dialog.getByRole('button', { name: /Cerrar/ }).click()
  await page.getByRole('button', { name: 'Revisar actuación V2' }).click()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirmar actuación V2' }).click()
  await expect(dialog).not.toBeVisible()
  assert.equal(posts, 2)
  assert.equal(task.restrictions[0].active, false)
  assert.equal(task.restrictions[1].active, true)
  await expect(
    page
      .getByRole('region', { name: 'Restricción ' + task.restrictions[0].id })
      .getByText('Inactiva', { exact: true }),
  ).toBeVisible()
  await capture('selective-result')
  checks.push(
    'Keyboard modal focus; 409 refresh without retry; explicit new confirmation; only selected gate changed in fixture',
  )
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  report.status = 'PASS'
  report.administrativePosts = posts
} catch (e) {
  report.status = 'FAIL'
  report.failure = String(e)
  process.exitCode = 1
} finally {
  await browser?.close()
  await server.close()
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(JSON.stringify(report, null, 2))
}
