// Browser checks use synthetic API responses only; no Google Weather calls or accounts.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
const output = 'test-results/weather-pilot/' + Date.now()
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
import {WeatherPilotPage} from '/src/weather-pilot/weather-page'
import '/src/index.css'
import '/src/styles/redesign.css'
const stamp='2030-01-01T12:00:00Z'
const user={id:'33333333-3333-4333-8333-333333333333',role:'SUPER_ADMIN',email:'admin@example.invalid',active:true,emailVerifiedAt:stamp,createdAt:stamp,updatedAt:stamp}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={['/weather-pilot']}><Routes><Route element={<AdminLayout/>}><Route path="/weather-pilot" element={<WeatherPilotPage/>}/></Route></Routes></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
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
const stamp = '2030-01-01T12:00:00Z'
const zoneId = '11111111-1111-4111-8111-111111111111'
const initial = {
  serviceZone: {
    id: zoneId,
    name: 'Ocozocoautla de Espinosa',
    code: 'OCOZOCOAUTLA',
    status: 'ACTIVE',
  },
  configuration: {
    enabled: true,
    latitude: 16.762,
    longitude: -93.374,
    reason: 'Punto representativo',
    updatedBy: 'admin',
    updatedAt: stamp,
  },
  status: 'FRESH',
  state: 'RAIN',
  reading: {
    state: 'RAIN',
    conditionCode: 'RAIN',
    dataTime: stamp,
    fetchedAt: stamp,
    validUntil: '2030-01-01T12:15:00Z',
  },
  lastAttemptAt: stamp,
}
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  for (const width of [1440, 820, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    })
    const page = await context.newPage()
    let row = structuredClone(initial),
      globalEnabled = true,
      writes = 0
    page.on('pageerror', (error) => report.errors.push(error.message))
    await page.route('**/api/v1/**', async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname
      const json = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(data),
        })
      if (path === '/api/v1/admin/weather-pilot' && req.method() === 'GET')
        return json({
          mode: 'PILOT_NO_CHARGE',
          provider: 'GOOGLE_WEATHER',
          globalEnabled,
          serverTime: stamp,
          items: [row],
          total: 1,
          totalPages: 1,
          page: 1,
          pageSize: 20,
        })
      if (
        path === '/api/v1/admin/weather-pilot/' + zoneId &&
        req.method() === 'PUT'
      ) {
        const input = req.postDataJSON()
        assert.deepEqual(input, {
          enabled: true,
          latitude: 16.765432,
          longitude: -93.375432,
          reason: 'Ajuste del punto representativo',
        })
        row = {
          ...row,
          configuration: { ...input, updatedBy: 'admin', updatedAt: stamp },
          status: 'PENDING',
          state: 'UNKNOWN',
          reading: null,
        }
        writes++
        return json(row)
      }
      return json({ message: 'Unexpected synthetic request' }, 404)
    })
    const noOverflow = async () => {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        true,
        'Page overflow ' + width,
      )
      assert.equal(
        await page
          .locator('dialog[open]')
          .evaluateAll((ds) =>
            ds.every((d) => d.scrollWidth <= d.clientWidth + 1),
          ),
        true,
        'Dialog overflow ' + width,
      )
    }
    await page.goto(server.resolvedUrls.local[0] + output + '/index.html')
    await expect(page.getByText('Lluvia', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Source: Includes weather data from Google.'),
    ).toBeVisible()
    await expect(
      page.getByText(/Este piloto no aplica recargos automáticos/),
    ).toBeVisible()
    await noOverflow()
    await page.screenshot({
      path: output + '/list-' + width + '.png',
      fullPage: true,
    })
    report.checks.push('rain and attribution ' + width)
    await page.getByRole('button', { name: 'Configurar punto' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByLabel('Latitud', { exact: true }).fill('16.765432')
    await page.getByLabel('Longitud', { exact: true }).fill('-93.375432')
    await page
      .getByLabel('Motivo del cambio')
      .fill('Ajuste del punto representativo')
    await noOverflow()
    await page.screenshot({
      path: output + '/configure-' + width + '.png',
      fullPage: true,
    })
    report.checks.push('configuration form ' + width)
    await page.getByRole('button', { name: 'Guardar punto' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByText('Esperando consulta', { exact: true }),
    ).toBeVisible()
    assert.equal(writes, 1)
    await expect(page.getByText('Lluvia', { exact: true })).toHaveCount(0)
    report.checks.push('save and clear old reading ' + width)
    globalEnabled = false
    row = { ...row, status: 'DISABLED' }
    await page.reload()
    await expect(
      page.getByText(/El piloto está deshabilitado en el servidor/),
    ).toBeVisible()
    await expect(page.getByText('Lluvia', { exact: true })).toHaveCount(0)
    await noOverflow()
    report.checks.push('disabled pilot ' + width)
    const persisted = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    )
    assert.equal(persisted.includes('conditionCode'), false)
    await context.close()
  }
  assert.equal(report.errors.length, 0)
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.errors.push(error.message)
  process.exitCode = 1
} finally {
  await browser?.close()
  await server.close()
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ output, ...report }, null, 2))
}
