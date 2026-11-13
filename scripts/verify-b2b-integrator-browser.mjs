import { chromium, expect } from '@playwright/test'
import { preview } from 'vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { sha } from './package-b2b-integrators.mjs'
const origin = 'http://127.0.0.1:4176',
  output = 'test-results/b2b-integrator-browser'
mkdirSync(output, { recursive: true })
const server = await preview({
  configFile: false,
  envDir: false,
  preview: { host: '127.0.0.1', port: 4176, strictPort: true },
})
let browser
const report = {
  date: new Date().toISOString(),
  scope:
    'Built local portal only; external network/API blocked; no backend operations',
  checks: [],
  forbidden: [],
  errors: [],
  downloads: [],
  complete: false,
}
try {
  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  })
  for (const [label, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 320, height: 800 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      acceptDownloads: true,
    })
    await context.route('**/*', async (route) => {
      const u = new URL(route.request().url())
      if (u.origin !== origin || u.pathname.startsWith('/api/')) {
        report.forbidden.push(u.origin + u.pathname)
        return route.abort()
      }
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => report.errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') report.errors.push(m.text())
    })
    await page.goto(origin + '/developers')
    await expect(
      page.getByRole('heading', {
        name: 'Logística conectada, contratos claros.',
      }),
    ).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('link', { name: 'Saltar al contenido' }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#developer-content')).toBeFocused()
    for (const [path, title] of [
      ['authentication', 'Autenticación y scopes'],
      ['prequotes', 'Precotización y aceptación'],
      ['execution', 'Progreso y resultado'],
      ['location', 'GPS y enlaces temporales'],
      ['webhooks', 'Webhooks'],
      ['errors', 'Errores e idempotencia'],
      ['search', 'Búsqueda automática'],
      ['reference', 'Referencia API'],
    ]) {
      await page
        .getByRole('navigation', { name: 'Documentación B2B' })
        .getByRole('link', { name: title, exact: true })
        .click()
      await expect(page.locator('h1')).toBeVisible()
      if (path !== 'location')
        await expect(
          page.getByText(/Cargando documentación|Cargando referencia/),
        ).toHaveCount(0)
      if (path === 'search') {
        await expect(page.getByText(/RETRY_PENDING/)).toBeVisible()
        await page.screenshot({ path: output + '/' + label + '-search.png' })
      }
      if (path === 'reference') {
        await expect(
          page.getByText('20 operaciones públicas (método + ruta).'),
        ).toBeVisible()
        for (const name of [
          'IntegrationMeResponse',
          'DispatchSearchResponse',
          'DeliveryStatusResponse',
        ]) {
          const detail = page.locator('details').filter({
            has: page
              .locator('summary')
              .filter({ hasText: new RegExp('^' + name + '$') }),
          })
          await detail.locator('summary').click()
          assert.deepEqual(
            JSON.parse(await detail.locator('code').textContent()),
            JSON.parse(
              readFileSync('public/developers/assets/openapi-b2b.json'),
            ).components.schemas[name],
          )
        }
        await page.screenshot({ path: output + '/' + label + '-reference.png' })
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        label + ' overflow ' + path,
      )
      await expect(page.getByRole('alert')).toHaveCount(0)
      report.checks.push(label + ' navigation/render/overflow ' + path)
    }
    await page.reload()
    await expect(
      page.getByText('20 operaciones públicas (método + ruta).'),
    ).toBeVisible()
    for (const [path, name, file] of [
      ['reference', 'Descargar OpenAPI B2B', 'openapi-b2b.json'],
      ['reference', 'Ejemplos completos', 'examples/b2b-flow.json'],
      ['prequotes', 'Descargar guía revisada', 'B2B-PUBLIC-GUIDE.md'],
      ['webhooks', 'Descargar guía revisada', 'B2B-WEBHOOKS.md'],
      [
        'webhooks',
        'verify-mandaria-webhook.mjs',
        'examples/verify-mandaria-webhook.mjs',
      ],
    ]) {
      await page.goto(origin + '/developers/' + path)
      const link = page.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('download', '')
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        link.click(),
      ])
      const destination = resolve(
        output,
        label + '-' + file.replaceAll('/', '-'),
      )
      await download.saveAs(destination)
      assert.deepEqual(
        readFileSync(destination),
        readFileSync('public/developers/assets/' + file),
      )
      const res = await context.request.get(
        origin + '/developers/assets/' + file,
      )
      assert.equal(res.status(), 200)
      const type = res.headers()['content-type']
      assert.doesNotMatch(type, /text\/html/)
      assert.match(
        type,
        file.endsWith('.json')
          ? /application\/json/
          : file.endsWith('.mjs')
            ? /(java|ecma)script/
            : /text\//,
      )
      report.downloads.push({
        viewport: label,
        file,
        mime: type,
        sha256: sha(readFileSync(destination)),
      })
    }
    await context.close()
  }
  assert.deepEqual(report.forbidden, [])
  assert.deepEqual(report.errors, [])
  report.complete = true
} catch (e) {
  report.failure = e.message
  process.exitCode = 1
} finally {
  await browser?.close()
  await new Promise((r) => server.httpServer.close(r))
  writeFileSync(output + '/report.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
