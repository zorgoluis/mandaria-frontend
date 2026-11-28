// Real Web components in Chrome; synthetic HTTP, no operational accounts or databases.
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
const fixture = JSON.parse(
  await readFile('src/test/admin-reports.fixture.json', 'utf8'),
)
const output = 'test-results/admin-reports/' + Date.now()
await mkdir(output, { recursive: true })
await writeFile(
  output + '/index.html',
  '<html lang="es"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/' +
    output +
    '/harness.tsx"></script></html>',
)
await writeFile(
  output + '/harness.tsx',
  `
import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import {queryClient} from '/src/services/query'
import {AuthContext} from '/src/auth/context'
import {FeedbackProvider} from '/src/components/Feedback'
import {AdminLayout} from '/src/layouts/AdminLayout'
import {ReportsPage} from '/src/admin-reports/page'
import '/src/index.css'
import '/src/styles/redesign.css'
const user={id:'33333333-3333-4333-8333-333333333333',role:'SUPER_ADMIN',email:'admin@example.invalid',active:true,emailVerifiedAt:'2026-01-01T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={['/reports']}><Routes><Route element={<AdminLayout/>}><Route path="/reports" element={<ReportsPage/>}/></Route></Routes></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'error',
  cacheDir: output + '/vite-cache',
  define: { 'import.meta.env.VITE_API_URL': 'window.location.origin' },
  server: { host: '127.0.0.1', port: 0 },
})
const report = {
  kind: 'BROWSER_SYNTHETIC_HTTP',
  checks: [],
  errors: [],
  status: 'RUNNING',
}
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  for (const width of [1440, 820, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      acceptDownloads: true,
    })
    const page = await context.newPage()
    const requests = []
    let unavailable = false
    page.on('pageerror', (e) => report.errors.push(e.message))
    await page.route('**/api/v1/**', async (route) => {
      const req = route.request(),
        url = new URL(req.url())
      requests.push(url.pathname + url.search)
      const json = (body, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(body),
        })
      assert.equal(req.method(), 'GET')
      if (url.pathname.endsWith('/options'))
        return json({ zones: [], providers: [] })
      if (url.pathname.endsWith('/export'))
        return json({
          fileName: 'mandaria-test.csv',
          content: '\uFEFF"Reporte","165.00 MXN"\r\n',
        })
      if (url.pathname === '/api/v1/admin/reports')
        return unavailable
          ? json({ message: 'Reporte no disponible' }, 503)
          : json(fixture)
      return json({ message: 'Unexpected request' }, 404)
    })
    await page.goto(server.resolvedUrls.local[0] + output + '/index.html')
    await expect(
      page.getByRole('heading', { name: 'Reportes administrativos' }),
    ).toBeVisible()
    await expect(page.getByText('Ana de prueba', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('cell', { name: /8 \(parcial\)/ }),
    ).toBeVisible()
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
      'Page overflow ' + width,
    )
    await page.screenshot({
      path: output + '/reports-' + width + '.png',
      fullPage: true,
    })
    report.checks.push('render, coverage and responsive layout ' + width)
    await page.getByLabel('Desde', { exact: true }).fill('2024-01-01')
    await page.getByLabel('Hasta', { exact: true }).fill('2025-01-01')
    await page.getByRole('button', { name: 'Consultar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('máximo de un año')
    await page.getByLabel('Hasta', { exact: true }).fill('2024-12-31')
    await page.getByLabel('Actividad del conductor').selectOption('NEVER')
    await page.getByRole('button', { name: 'Consultar', exact: true }).click()
    await expect
      .poll(() =>
        requests.some(
          (s) => s.includes('from=2024-01-01') && s.includes('activity=NEVER'),
        ),
      )
      .toBe(true)
    report.checks.push('annual boundaries and filters ' + width)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descargar CSV completo' }).click()
    assert.equal((await download).suggestedFilename(), 'mandaria-test.csv')
    report.checks.push('CSV download ' + width)
    unavailable = true
    await page.getByRole('button', { name: 'Restablecer', exact: true }).click()
    // Cached initial data can be reused, so force an uncached valid range.
    await page.getByLabel('Desde', { exact: true }).fill('2025-01-01')
    await page.getByLabel('Hasta', { exact: true }).fill('2025-02-01')
    await page.getByRole('button', { name: 'Consultar', exact: true }).click()
    await expect(
      page.getByText('No se pudo cargar la información', { exact: true }),
    ).toBeVisible()
    report.checks.push('error state ' + width)
    await context.close()
  }
  assert.deepEqual(report.errors, [])
  report.status = 'PASS'
} catch (e) {
  report.status = 'FAIL'
  report.errors.push(String(e))
  throw e
} finally {
  await browser?.close()
  await server.close()
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
  console.log(output, report.status, report.checks.length + ' checks')
}
