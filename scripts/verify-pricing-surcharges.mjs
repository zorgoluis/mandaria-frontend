// Synthetic UI verification only: no account, operational API or weather provider.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const output = 'test-results/pricing-surcharges/' + Date.now()
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
import {PricingSurchargesPage} from '/src/pricing/surcharges'
import '/src/index.css'
import '/src/styles/redesign.css'
const stamp='2026-11-24T12:00:00Z'
const user={id:'33333333-3333-4333-8333-333333333333',role:'SUPER_ADMIN',email:'admin@example.invalid',active:true,emailVerifiedAt:stamp,createdAt:stamp,updatedAt:stamp}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={['/pricing-surcharges']}><Routes><Route element={<AdminLayout/>}><Route path="/pricing-surcharges" element={<PricingSurchargesPage/>}/></Route></Routes></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
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
const stamp = '2026-11-24T12:00:00Z'
const zoneId = '11111111-1111-4111-8111-111111111111'
const baseRow = {
  id: '22222222-2222-4222-8222-222222222222',
  serviceZoneId: zoneId,
  serviceType: 'LOCAL_DELIVERY',
  kind: 'SCHEDULE',
  amount: '5.00',
  currency: 'MXN',
  reason: 'Horario nocturno',
  timeZone: 'America/Mexico_City',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startMinute: 1320,
  endMinute: 360,
  expiresAt: null,
  disabledAt: null,
  createdAt: stamp,
  createdBy: 'admin',
  disabledBy: null,
  disableReason: null,
}
const pageOf = (items) => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: items.length ? 1 : 0,
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  for (const width of [1440, 820, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    let rows = [
      { ...baseRow },
      {
        ...baseRow,
        id: '44444444-4444-4444-8444-444444444444',
        kind: 'MANUAL_RAIN',
        reason: 'Lluvia finalizada',
        weekdays: [],
        startMinute: null,
        endMinute: null,
        timeZone: null,
        expiresAt: '2020-01-01T00:00:00Z',
      },
    ]
    let created = 0
    page.on('pageerror', (error) => report.errors.push(error.message))
    await page.route('**/api/v1/**', async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname
      const json = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(data),
        })
      if (path === '/api/v1/admin/service-zones')
        return json(
          pageOf([
            {
              id: zoneId,
              name: 'Ocozocoautla de Espinosa',
              code: 'OCOZOCOAUTLA',
              currency: 'MXN',
              status: 'ACTIVE',
            },
          ]),
        )
      if (path === '/api/v1/admin/pricing-surcharges' && req.method() === 'GET')
        return json(pageOf(rows))
      if (
        path === '/api/v1/admin/pricing-surcharges' &&
        req.method() === 'POST'
      ) {
        const data = req.postDataJSON()
        assert.ok(['MANUAL_RAIN', 'AUTOMATIC_RAIN'].includes(data.kind))
        assert.equal(data.amount, '5.00')
        if (data.kind === 'MANUAL_RAIN')
          assert.ok(Date.parse(data.expiresAt) > Date.now())
        else assert.equal(data.expiresAt, undefined)
        assert.equal(data.weekdays, undefined)
        const row = {
          ...baseRow,
          ...data,
          id:
            data.kind === 'AUTOMATIC_RAIN'
              ? '66666666-6666-4666-8666-666666666666'
              : '55555555-5555-4555-8555-555555555555',
          timeZone: null,
          weekdays: [],
          startMinute: null,
          endMinute: null,
        }
        rows = [row, ...rows]
        created++
        return json(row, 201)
      }
      if (
        path ===
        '/api/v1/admin/pricing-surcharges/55555555-5555-4555-8555-555555555555/deactivate'
      ) {
        const data = req.postDataJSON()
        assert.equal(data.reason, 'La lluvia terminó')
        rows = rows.map((row) =>
          row.id === '55555555-5555-4555-8555-555555555555'
            ? {
                ...row,
                disabledAt: stamp,
                disabledBy: 'admin',
                disableReason: data.reason,
              }
            : row,
        )
        return json(rows[0])
      }
      return json({ message: 'Unexpected synthetic API' }, 404)
    })
    await page.goto(server.resolvedUrls.local[0] + output + '/index.html')
    await expect(page.getByText('Programado', { exact: true })).toBeVisible()
    const noOverflow = async () => {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        true,
        'Horizontal overflow at ' + width,
      )
      assert.equal(
        await page
          .locator('dialog[open]')
          .evaluateAll((ds) =>
            ds.every((d) => d.scrollWidth <= d.clientWidth + 1),
          ),
        true,
        'Dialog overflow at ' + width,
      )
    }
    await noOverflow()
    await page.screenshot({
      path: output + '/list-' + width + '.png',
      fullPage: true,
    })
    report.checks.push('list ' + width)
    await page.getByRole('button', { name: 'Nuevo recargo' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await noOverflow()
    await page.screenshot({
      path: output + '/schedule-' + width + '.png',
      fullPage: true,
    })
    report.checks.push('schedule form ' + width)
    await page.getByLabel('Tipo de recargo').selectOption('MANUAL_RAIN')
    await page.getByLabel('Vence el').fill('2099-01-01T20:00')
    await page
      .getByLabel('Motivo', { exact: true })
      .fill('Lluvia confirmada por administración')
    await noOverflow()
    await page.screenshot({
      path: output + '/rain-' + width + '.png',
      fullPage: true,
    })
    await page
      .getByRole('button', { name: 'Crear recargo', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Vigente', { exact: true })).toBeVisible()
    assert.equal(created, 1)
    report.checks.push('manual rain creation ' + width)
    const rainRow = page
      .getByRole('row')
      .filter({ hasText: 'Lluvia confirmada por administración' })
    await rainRow.getByRole('button', { name: 'Desactivar' }).click()
    await page.getByLabel('Motivo de desactivación').fill('La lluvia terminó')
    await page.getByRole('button', { name: 'Confirmar desactivación' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Desactivado', { exact: true })).toBeVisible()
    report.checks.push('deactivation ' + width)
    await page.getByRole('button', { name: 'Nuevo recargo' }).click()
    await page.getByLabel('Tipo de recargo').selectOption('AUTOMATIC_RAIN')
    await expect(page.getByLabel('Vence el')).toHaveCount(0)
    await page
      .getByLabel('Motivo', { exact: true })
      .fill('Lluvia automática de la zona')
    await noOverflow()
    await page.screenshot({
      path: output + '/automatic-' + width + '.png',
      fullPage: true,
    })
    await page
      .getByRole('button', { name: 'Crear recargo', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByText('Condicionado a lluvia', { exact: true }),
    ).toBeVisible()
    assert.equal(created, 2)
    await noOverflow()
    report.checks.push('automatic rain configuration ' + width)
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
