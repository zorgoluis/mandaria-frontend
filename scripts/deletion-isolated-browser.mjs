import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import assert from 'node:assert/strict'
import { requireRestrictedSession } from './deletion-session-check.mjs'
import { web, work, apiPort, webPort } from './deletion-isolated-environment.mjs'

const waitResponse = (page, predicate) => { const pending = page.waitForResponse(predicate); pending.catch(() => {}); return pending }
export async function startBrowser(report, output = work) {
  const origin = `http://127.0.0.1:${webPort}`
  const markerKey = 'mandaria.deletion.references.v1:' + origin
  const vite = await createServer({ root: web, configFile: false, envDir: false, plugins: [react()], logLevel: 'silent', cacheDir: output + '/vite-cache', define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) }, server: { host: '127.0.0.1', port: webPort, strictPort: true, proxy: { '/api/v1': { target: `http://127.0.0.1:${apiPort}` } } } })
  await vite.listen()
  let browser
  try { browser = await chromium.launch({ timeout: 15000 }) } catch (e) { await vite.close(); throw e }
  report.browserRequests = []
  report.screenshots = []
  const context = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    ctx.setDefaultTimeout(15000)
    await ctx.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const page = await ctx.newPage()
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.pathname.startsWith('/api/')) report.browserRequests.push({ method: response.request().method(), path: (url.pathname + url.search).replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, ':uuid'), status: response.status() })
    })
    return page
  }
  const login = async (page, email, password) => {
    await page.goto(origin + '/login')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await expect(page.getByLabel('Correo electrónico')).toHaveCount(0)
  }
  const capture = async (page, name) => {
    await page.screenshot({ path: output + '/' + name + '.png', fullPage: true, mask: [page.locator('input[type=password]'), page.getByText(/@example\.test/)] })
    report.screenshots.push(name + '.png')
  }
  const viewports = async (page, name) => {
    await capture(page, name + '-desktop')
    await page.setViewportSize({ width: 390, height: 844 })
    await capture(page, name + '-mobile')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, name + ' mobile overflow')
    await page.setViewportSize({ width: 1280, height: 800 })
  }
  const smoke = await context()
  await smoke.goto(origin + '/login')
  await expect(smoke.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  const health = await smoke.request.get('http://127.0.0.1:' + apiPort + '/health')
  if (health.status() !== 200) { await browser.close(); await vite.close(); throw new Error('Backend health did not return 200') }
  report.browserSmoke = { status: 'PASS', login: true, backendHealth: 200 }
  await smoke.context().close()
  return {
    origin, context, login, capture, viewports,
    close: async () => { await browser.close(); await vite.close() },
    markers: page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), markerKey),
    async adminDecision(page, id, email, password) {
      await login(page, email, password)
      await page.goto(origin + '/admin/privacy/deletion/' + id)
      await page.getByLabel('Acción administrativa').selectOption('IDENTITY_AND_AUTHORITY_VERIFIED')
      await page.getByLabel('Referencia UUID de evidencia custodiada').fill(crypto.randomUUID())
      await page.getByRole('button', { name: 'Revisar decisión', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('dialog').getByRole('checkbox').check()
      const button = page.getByRole('button', { name: 'Confirmar decisión', exact: true })
      await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter')
      await expect(page.getByRole('alert').last()).toBeVisible()
      await capture(page, 'admin-response-lost')
    },
    async purged(page) {
      await page.goto(origin + '/privacy/deletion')
      await page.reload()
      const response = waitResponse(page, r => r.url().includes('/commands/by-key/'))
      const button = page.getByRole('button', { name: 'Consultar recibo administrativo' })
      await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter')
      const r = await response
      assert.equal(r.status(), 404)
      assert.equal((await r.json()).code, 'COMMAND_RECEIPT_UNAVAILABLE')
      await expect(page.getByRole('alert').last()).toContainText('resultado sigue siendo desconocido')
      await expect(page.getByRole('heading', { name: 'Comando aplicado: recibo histórico' })).toHaveCount(0)
      await expect(page.getByLabel('Correo electrónico')).toHaveCount(0)
      await viewports(page, 'purged-receipt')
      return page.getByRole('alert').last().innerText()
    },
    async accountClosure(page, dispatchId, email, password) {
      await login(page, email, password)
      await page.goto(origin + '/driver/services/' + dispatchId)
      await expect(page.getByText('Synthetic stop 0', { exact: false }).first()).toBeVisible()
      await capture(page, 'committed-before-closure')
      await page.goto(origin + '/privacy/deletion/new')
      await page.getByLabel('Alcance', { exact: true }).selectOption('ACCOUNT')
      await page.getByRole('button', { name: 'Revisar y confirmar alcance' }).click()
      await page.getByLabel('Contraseña actual').fill(password)
      await page.getByRole('dialog').getByRole('checkbox').check()
      const response = waitResponse(page, r => r.request().method() === 'POST' && r.url().endsWith('/privacy/deletion-requests'))
      const session = waitResponse(page, r => r.url().includes('/auth/me?projection=session'))
      await page.getByRole('button', { name: 'Confirmar solicitud', exact: true }).click()
      const r = await response
      assert.equal(r.status(), 202)
      const closure = await r.json()
      // A valid restricted projection continues directly. Only a real 401
      // requires fresh authentication; refresh does not replace reauthentication.
      const sessionResponse = await session
      await requireRestrictedSession(sessionResponse, async () => {
        await expect(page.getByLabel('Correo electrónico')).toBeVisible()
        await login(page, email, password)
      })
      const projection = waitResponse(page, r => r.url().includes('/auth/me?projection=session'))
      await page.reload()
      const identity = await (await projection).json()
      assert.equal(identity.accessMode, 'DELETION_RESTRICTED')
      assert.equal(identity.capabilities.activeDeliveryResolution, true)
      await page.goto(origin + '/privacy/active-service')
      await expect(page.getByRole('button', { name: 'Revisar entrega', exact: true })).toBeVisible()
      await viewports(page, 'restricted-service')
      return closure
    },
    async deliver(page, dispatchId) {
      await page.getByRole('button', { name: 'Revisar entrega', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('dialog').getByRole('checkbox').check()
      const response = waitResponse(page, r => r.request().method() === 'POST' && r.url().endsWith('/dispatches/' + dispatchId + '/deliver'))
      const button = page.getByRole('button', { name: 'Confirmar resolución' })
      await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter')
      const delivered = await response
      assert.equal(delivered.status(), 200)
      assert.equal((await delivered.json()).status, 'DELIVERED')
      report.deliverResponse = { status: 200, dispatch: 'DELIVERED' }
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.reload()
      await expect(page.getByText('No hay resolución activa informada.', { exact: false })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Revisar entrega', exact: true })).toHaveCount(0)
      await viewports(page, 'service-after-reload')
      return page.locator('main').innerText()
    },
  }
}
