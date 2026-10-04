import { chromium, expect } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

// Static portal only: no backend, credentials, external requests or operations.
const origin = 'http://127.0.0.1:4173'
const output = 'test-results/developer-tracking'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch()
const errors = []
const forbidden = []
try {
  for (const [label, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport })
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin !== origin || url.pathname.startsWith('/api/')) {
        forbidden.push(url.origin + url.pathname)
        return route.abort()
      }
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(origin + '/developers/execution')
    await expect(
      page.getByText('Pedido recogido con seguimiento detallado', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.getByText(/pendiente de despliegue/)).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('link', { name: 'Saltar al contenido' }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#developer-content')).toBeFocused()
    await page.screenshot({ path: `${output}/${label}.png`, fullPage: true })
    await page.screenshot({ path: `${output}/${label}-top.png` })
    const summary = page.getByText(
      'Pedido recogido con seguimiento detallado',
      { exact: true },
    )
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(summary.locator('..')).toHaveAttribute('open', '')
    await expect(summary.locator('..').locator('code')).toContainText(
      '"publicVersion": "12"',
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      'no page overflow',
    )
    await page.screenshot({ path: `${output}/${label}-example.png` })
    await page
      .getByRole('link', { name: 'Referencia API', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Referencia API B2B', exact: true }),
    ).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page
      .getByRole('link', { name: 'Descargar OpenAPI B2B', exact: true })
      .click()
    const download = await downloadPromise
    const bytes = readFileSync(await download.path(), 'utf8')
    assert.deepEqual(
      JSON.parse(bytes),
      JSON.parse(
        readFileSync('public/developers/assets/openapi-b2b.json', 'utf8'),
      ),
    )
    const response = await page.request.get(
      origin + '/developers/assets/openapi-b2b.json',
    )
    assert.match(response.headers()['content-type'], /application\/json/)
    await page
      .getByRole('link', { name: 'Reglas de seguimiento y publicVersion' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Descartar respuestas atrasadas' }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByText('Pedido recogido con seguimiento detallado', {
        exact: true,
      }),
    ).toBeVisible()
    await context.close()
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(forbidden, [])
  console.log(
    'PASS: built anonymous portal, desktop/mobile, keyboard, navigation/reload, exact JSON download and MIME; no API/external requests or render errors.',
  )
} finally {
  await browser.close()
}
