import { mkdir, readFile, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import ts from 'typescript'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const fixtureCode = ts.transpileModule(
  await readFile('src/test/fixtures/request-design.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText
const fixtures = await import(
  'data:text/javascript;base64,' + Buffer.from(fixtureCode).toString('base64')
)
const dir = '.tmp/request-design',
  out = resolve('test-results/request-design')
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/request-design/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {MemoryRouter,Routes,Route} from 'react-router-dom';import {AuthContext} from '../../src/auth/context';import {CustomerRequest} from '../../src/customer/pages';import '../../src/index.css';createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={{user:{id:'synthetic',role:'CUSTOMER'},loading:false} as never}><MemoryRouter initialEntries={['/customer/requests/MDR-000009']}><main className="customer-area"><Routes><Route path="/customer/requests/:publicId" element={<CustomerRequest/>}/></Routes></main></MemoryRouter></AuthContext.Provider></QueryClientProvider>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4190, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4190'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (dialog) => dialog.accept())
  let accepted = false,
    expired = false,
    posts = 0
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname
    if (url.hostname !== '127.0.0.1') return route.abort()
    if (!path.startsWith('/api/v1/')) return route.continue()
    if (route.request().method() === 'POST') {
      assert.equal(path, '/api/v1/customer/delivery-quotes/MQ-000009/accept')
      posts++
      accepted = true
      return route.fulfill({ json: {} })
    }
    if (path.endsWith('/consent-context'))
      return route.fulfill({
        json: {
          ...fixtures.requestContext,
          quote: {
            ...fixtures.requestContext.quote,
            ...(expired ? { expiresAt: '2020-01-01T00:00:00Z' } : {}),
            ...(accepted ? { status: 'ACCEPTED' } : {}),
          },
          canPrepareConsent: !accepted && !expired,
        },
      })
    if (path.endsWith('/status'))
      return route.fulfill({
        json: accepted
          ? {
              ...fixtures.requestStatus,
              status: 'OPEN',
              shippingPayment: {
                ...fixtures.requestStatus.shippingPayment,
                quotePublicId: 'MQ-000009',
                amount: '45.50',
                currency: 'MXN',
              },
            }
          : fixtures.requestStatus,
      })
    if (path.endsWith('/location'))
      return route.fulfill({ json: fixtures.requestLocation })
    if (path.endsWith('/tracking-link'))
      return route.fulfill({ json: fixtures.requestLink })
    if (path.endsWith('/MDR-000009'))
      return route.fulfill({ json: fixtures.requestDetail })
    throw Error('Unexpected fixture path: ' + path)
  })
  const url = 'http://127.0.0.1:4190/.tmp/request-design/index.html'
  await page.goto(url)
  await page
    .getByRole('button', { name: 'Autorizar y solicitar servicio' })
    .waitFor()
  await page.getByText('Sin enlace', { exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  assert(
    await page
      .getByRole('button', { name: 'Autorizar y solicitar servicio' })
      .isDisabled(),
  )
  assert.equal(posts, 0)
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'horizontal overflow ' + width,
    )
    if (width < 1100)
      assert(
        await page.evaluate(
          () =>
            document.querySelector('.request-sidebar').getBoundingClientRect()
              .top <
            document.querySelector('.request-main').getBoundingClientRect().top,
        ),
        'authorization first on mobile',
      )
    await page.screenshot({
      path: resolve(out, `width-${width}.png`),
      fullPage: true,
    })
  }
  const toggle = page.getByRole('button', { name: /Cancelar solicitud/ })
  await toggle.focus()
  await page.keyboard.press('Enter')
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
  await page
    .getByLabel('Motivo de cancelación *', { exact: true })
    .fill('Prueba de interfaz')
  assert(
    await page
      .getByRole('button', { name: 'Solicitar cancelación' })
      .isDisabled(),
  )
  await page.getByLabel('Confirmo que deseo cancelar', { exact: true }).focus()
  await page.keyboard.press('Space')
  assert(
    await page
      .getByRole('button', { name: 'Solicitar cancelación' })
      .isEnabled(),
  )
  await page.screenshot({
    path: resolve(out, 'mobile-cancellation.png'),
    fullPage: true,
  })
  assert.equal(posts, 0)
  await page
    .getByLabel('Acepto el importe, vigencia y condiciones del envío', {
      exact: true,
    })
    .focus()
  await page.keyboard.press('Space')
  await page
    .getByRole('button', { name: 'Autorizar y solicitar servicio' })
    .click()
  await page.getByText(/Autorización confirmada por el servidor/).waitFor()
  assert.equal(posts, 1)
  await page.screenshot({
    path: resolve(out, 'mobile-authorized.png'),
    fullPage: true,
  })
  accepted = false
  expired = true
  await page.reload()
  await page.getByText('La cotización ha vencido.').waitFor()
  assert(
    await page
      .getByRole('button', { name: 'Autorizar y solicitar servicio' })
      .isDisabled(),
  )
  await page.screenshot({
    path: resolve(out, 'mobile-expired.png'),
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        widths: [1440, 1024, 390],
        keyboard: true,
        mobileAuthorizationFirst: true,
        expired: true,
        posts: 1,
        backend: 'fixture',
        google: 'not loaded',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS request design: responsive, keyboard, explicit consent, cancellation, expiry; API fixtures only',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/main.tsx`)
  await unlink(`${dir}/index.html`)
  await rmdir(dir)
}
