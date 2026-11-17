// UI acceptance with synthetic HTTP only. No real account or backend is contacted.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const output = 'test-results/unused-driver-accounts/' + Date.now()
await mkdir(output, { recursive: true })
await writeFile(
  output + '/index.html',
  `<html lang="es"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/${output}/harness.tsx"></script></html>`,
)
await writeFile(
  output + '/harness.tsx',
  `
import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {AuthContext} from '/src/auth/context'
import {FeedbackProvider} from '/src/components/Feedback'
import {AdminLayout} from '/src/layouts/AdminLayout'
import {IndependentDriversPage} from '/src/independent-drivers/pages'
import '/src/index.css'
import '/src/styles/redesign.css'
const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
const user={id:'33333333-3333-4333-8333-333333333333',role:'SUPER_ADMIN',email:'admin@example.invalid',active:true,emailVerifiedAt:'2026-11-17T12:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={['/independent-drivers?view=unused']}><Routes><Route element={<AdminLayout/>}><Route path="/independent-drivers" element={<IndependentDriversPage/>}/></Route></Routes></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
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
const base = '/api/v1/admin/independent-drivers/unused-accounts'
const report = {
  kind: 'BROWSER_SYNTHETIC_HTTP',
  backendStarted: false,
  status: 'RUNNING',
  checks: [],
  errors: [],
  requests: [],
}
const stamp = '2026-11-10T12:00:00.000Z'
const changed = '2026-11-17T12:00:00.000Z'
const fixture = () => [
  {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'ana.prueba@example.invalid',
    name: 'Ana López · Cuenta de prueba',
    driverId: '44444444-4444-4444-8444-444444444444',
    createdAt: stamp,
    updatedAt: stamp,
    active: true,
    driverStatus: 'PENDING',
    independentProfileId: '55555555-5555-4555-8555-555555555555',
    independentProfileStatus: 'PENDING',
    category: 'INDEPENDENT',
    hasServiceActivity: false,
    canDeactivate: true,
    blockReason: null,
    deactivatedAt: null,
  },
  {
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'registro.incompleto@example.invalid',
    name: null,
    driverId: null,
    createdAt: stamp,
    updatedAt: stamp,
    active: true,
    driverStatus: null,
    independentProfileId: null,
    independentProfileStatus: null,
    category: 'NONE',
    hasServiceActivity: false,
    canDeactivate: true,
    blockReason: null,
    deactivatedAt: null,
  },
]
let browser
try {
  await server.listen()
  const address = server.httpServer.address()
  const origin = `http://127.0.0.1:${address.port}`
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const width of [1440, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    page.on('pageerror', (error) => report.errors.push(error.message))
    const accounts = fixture()
    const commands = []
    let loseResponse = false
    await page.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin !== origin) {
        report.errors.push('Blocked external request: ' + url.origin)
        return route.abort()
      }
      if (!url.pathname.startsWith('/api/v1/')) return route.continue()
      report.requests.push({
        width,
        path: url.pathname,
        method: request.method(),
      })
      let body
      if (url.pathname === base && request.method() === 'GET') {
        const status = url.searchParams.get('accountStatus') || 'ACTIVE'
        const search = (url.searchParams.get('search') || '').toLowerCase()
        const items = accounts.filter(
          (account) =>
            (status === 'ALL' || account.active === (status === 'ACTIVE')) &&
            (account.email + ' ' + (account.name || ''))
              .toLowerCase()
              .includes(search),
        )
        body = {
          items,
          page: 1,
          pageSize: 20,
          total: items.length,
          totalPages: items.length ? 1 : 0,
        }
      } else if (url.pathname.startsWith(base + '/')) {
        const parts = url.pathname.slice(base.length + 1).split('/')
        const account = accounts.find((item) => item.userId === parts[0])
        assert(account, 'Unknown synthetic account')
        if (parts.length === 1 && request.method() === 'GET') body = account
        else {
          assert.equal(parts[1], 'deactivate')
          assert.equal(request.method(), 'POST')
          const input = request.postDataJSON()
          assert.equal(input.expectedUpdatedAt, account.updatedAt)
          assert(input.reason.trim().length >= 3)
          assert.match(input.requestId, /^[0-9a-f-]{36}$/i)
          assert(
            account.active &&
              account.canDeactivate &&
              !account.hasServiceActivity,
          )
          commands.push({ userId: account.userId, requestId: input.requestId })
          account.active = false
          account.canDeactivate = false
          account.blockReason = 'ACCOUNT_ALREADY_DISABLED'
          account.updatedAt = changed
          account.deactivatedAt = changed
          if (loseResponse) {
            loseResponse = false
            return route.abort('failed')
          }
          body = {
            userId: account.userId,
            requestId: input.requestId,
            active: false,
            deactivatedAt: changed,
          }
        }
      } else {
        report.errors.push(
          'Unexpected API request: ' + request.method() + ' ' + url.pathname,
        )
        return route.fulfill({
          status: 404,
          json: { message: 'Unexpected synthetic request' },
        })
      }
      return route.fulfill({ status: 200, json: body })
    })
    const capture = async (label) => {
      await page.evaluate(() => document.fonts.ready)
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'Horizontal overflow: ' + width + ' ' + label,
      )
      await page.screenshot({
        path: resolve(output, `${width}-${label}.png`),
        fullPage: true,
      })
      report.checks.push(`${width}px: ${label}`)
    }
    const row = (email) => page.getByRole('row').filter({ hasText: email })
    const open = async (email) => {
      await row(email)
        .getByRole('button', { name: /Dar de baja/ })
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await dialog
        .getByLabel(/Motivo/)
        .fill('Cuenta sintética sin servicios; prueba local')
      return dialog
    }
    const confirm = (dialog) =>
      dialog.getByRole('button', { name: /Confirmar baja|Dar de baja/ }).click()
    await page.goto(origin + '/' + output + '/index.html')
    await expect(row(accounts[0].email)).toBeVisible()
    await expect(row(accounts[1].email)).toBeVisible()
    await capture('list')
    let dialog = await open(accounts[0].email)
    await capture('confirm')
    await confirm(dialog)
    await expect(row(accounts[0].email)).toHaveCount(0)
    assert.equal(commands.length, 1)
    await capture('deactivated')
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    dialog = await open(accounts[1].email)
    loseResponse = true
    await confirm(dialog)
    const consult = page.getByRole('button', { name: /Consultar estado/ })
    await expect(consult).toBeVisible()
    assert.equal(commands.length, 2)
    await capture('uncertain')
    await consult.click()
    await expect(row(accounts[1].email)).toHaveCount(0)
    assert.equal(commands.length, 2, 'Readback must not replay the command')
    await capture('confirmed-readback')
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await page.getByLabel('Filtrar cuentas por acceso').selectOption('DISABLED')
    await expect(row(accounts[0].email)).toBeVisible()
    await expect(row(accounts[1].email)).toBeVisible()
    await expect(page.getByRole('button', { name: /Dar de baja/ })).toHaveCount(
      0,
    )
    await capture('disabled-accounts')
    await page.close()
  }
  assert.deepEqual(report.errors, [])
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.failure = String(error.stack || error)
  throw error
} finally {
  await browser?.close()
  await server.close()
  await writeFile(
    output + '/report.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks.length,
      output,
    }),
  )
}
