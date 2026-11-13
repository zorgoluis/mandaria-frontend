// Synthetic browser evidence only. No backend, .env, external services or credentials.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = 'test-results/fleet-web'
await mkdir(output, { recursive: true })
await writeFile(
  `${output}/index.html`,
  '<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test-results/fleet-web/harness.tsx"></script></html>',
)
await writeFile(
  `${output}/harness.tsx`,
  `
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../src/services/query'
import { AuthContext } from '../../src/auth/context'
import { FeedbackProvider } from '../../src/components/Feedback'
import { FleetServicesPage } from '../../src/fleet/pages'
import { FleetSpending } from '../../src/fleet/spending'
import '../../src/index.css'
const q = new URLSearchParams(location.search)
const auth = { user: { id:'synthetic-owner', role:'PROVIDER_ADMIN', email:'synthetic@example.test', active:true, emailVerifiedAt:null, createdAt:'', updatedAt:'' }, loading:false, expired:false, error:null, login:async()=>{}, logout:async()=>{}, restore:async()=>{} }
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[q.get('path') || '/fleet-services']}><main className="page-content" style={{padding:16}}><Routes><Route path="/fleet-services" element={<FleetServicesPage />} /><Route path="/fleet-services/:id" element={<FleetServicesPage />} /><Route path="/spending" element={<FleetSpending providerId="provider" driverId="driver" />} /></Routes></main></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4226'),
  },
  server: { host: '127.0.0.1', port: 4226, strictPort: true },
})
let browser
const report = {
  synthetic: true,
  checks: [],
  unexpected: [],
  errors: [],
  complete: false,
}
try {
  await server.listen()
  const fixture = await server.ssrLoadModule('/src/test/fleet-fixture.ts')
  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => report.errors.push(e.message))
  let enabled = false,
    revision = '0'
  const commands = []
  await page.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:4226') {
      report.unexpected.push(url.origin)
      return route.abort()
    }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    const path = url.pathname.slice('/api/v1'.length)
    const profile = {
      id: 'provider',
      name: 'Flotilla sintética',
      code: 'TEST',
      type: 'FLEET',
      status: 'ACTIVE',
      membershipRole: 'OWNER',
      limits: { maxDrivers: 10, maxVehicles: 10 },
    }
    let body
    if (path === '/provider/profiles')
      body = {
        items: [profile],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      }
    else if (path === '/provider/profile') body = profile
    else if (path === '/provider/fleet-operation-context')
      body = fixture.fleetContext('DRIVER_TAKE')
    else if (path.startsWith('/provider/fleet-services'))
      body = fixture.fleetPage()
    else if (path === '/provider/drivers/driver/fleet-spending') {
      if (request.method() === 'PUT') {
        const command = request.postDataJSON()
        commands.push(command)
        enabled = command.enabled
        revision = String(Number(revision) + 1)
      }
      body = { enabled, revision }
    } else {
      report.unexpected.push(path)
      return route.fulfill({ status: 404, json: {} })
    }
    return route.fulfill({ json: body })
  })
  const open = (path) =>
    page.goto(
      `http://127.0.0.1:4226/${output}/index.html?path=${encodeURIComponent(path)}`,
    )
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await open('/fleet-services/dispatch')
    await expect(
      page.getByRole('heading', { name: 'MDQ-SYNTHETIC' }),
    ).toBeVisible()
    await expect(page.getByText('No disponible', { exact: true })).toHaveCount(
      2,
    )
    await expect(
      page.getByRole('button', { name: /TOMAR|LIBERAR|ENTREGADO|ASIGNAR/ }),
    ).toHaveCount(0)
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    )
    await page.screenshot({
      path: `${output}/detail-${width}.png`,
      fullPage: true,
    })
    report.checks.push(`private-detail-${width}`)
    await open('/spending')
    await page
      .getByRole('button', {
        name: enabled ? 'Revocar gasto' : 'Habilitar gasto',
      })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    assert(
      await page.evaluate(() => !!document.activeElement?.closest('dialog')),
      'focus outside dialog',
    )
    await page.screenshot({
      path: `${output}/spending-${width}.png`,
      fullPage: true,
    })
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar' })
      .focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    report.checks.push(`spending-confirmation-keyboard-${width}`)
  }
  assert.equal(commands.length, 2)
  assert.deepEqual(
    commands.map((c) => c.enabled),
    [true, false],
  )
  assert.notEqual(commands[0].requestId, commands[1].requestId)
  assert.equal(report.unexpected.length, 0)
  assert.equal(report.errors.length, 0)
  report.complete = true
} finally {
  await browser?.close()
  await server.close()
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(report, null, 2) + '\n',
  )
}
console.log(JSON.stringify(report))
