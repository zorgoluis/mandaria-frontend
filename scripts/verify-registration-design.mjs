import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = '.tmp/registration-design',
  out = resolve('test-results/registration-design')
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/registration-design/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {RegistrationPage} from '../../src/customer/RegistrationPage';import '../../src/index.css';createRoot(document.getElementById('root')!).render(<MemoryRouter><RegistrationPage/></MemoryRouter>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4194, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4194'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage(),
    errors = [],
    calls = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.hostname !== '127.0.0.1') return route.abort()
    if (!u.pathname.startsWith('/api/v1/')) return route.continue()
    calls.push({ path: u.pathname, body: route.request().postDataJSON() })
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ACCEPTED' }),
    })
  })
  await page.goto('http://127.0.0.1:4194/.tmp/registration-design/index.html')
  await page.getByRole('heading', { name: 'Crear perfil cliente' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 1000, 390]) {
    await page.setViewportSize({ width, height: 900 })
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: resolve(out, `width-${width}.png`),
      fullPage: true,
    })
  }
  await page.getByRole('radio', { name: 'Personal' }).focus()
  await page.keyboard.press('ArrowRight')
  assert(await page.getByRole('radio', { name: 'Negocio' }).isChecked())
  await page.getByLabel('Correo electrónico').fill('incorrecto')
  await page.getByLabel(/^Nombre\s*\*?$/).focus()
  await page.getByText('Introduce un correo electrónico válido.').waitFor()
  await page.screenshot({
    path: resolve(out, 'mobile-validation.png'),
    fullPage: true,
  })
  await page.getByLabel('Correo electrónico').fill('synthetic@example.test')
  await page.getByLabel(/^Nombre\s*\*?$/).fill('Cliente Sintético')
  await page.getByLabel('Nombre del negocio').fill('Negocio Sintético')
  await page.getByRole('button', { name: 'Solicitar registro' }).click()
  await page.getByRole('heading', { name: 'Solicitud enviada' }).waitFor()
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].body, {
    type: 'BUSINESS',
    email: 'synthetic@example.test',
    displayName: 'Cliente Sintético',
    businessName: 'Negocio Sintético',
  })
  await page.screenshot({
    path: resolve(out, 'mobile-success.png'),
    fullPage: true,
  })
  await page
    .getByRole('button', { name: 'Reenviar solicitud con este perfil' })
    .click()
  await page.waitForFunction(
    () =>
      document.querySelector('.registration-resend')?.textContent ===
      'Reenviar solicitud con este perfil',
  )
  assert.equal(calls.length, 2)
  assert(calls[1].path.endsWith('/customer-registration/resend'))
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        widths: [1440, 1000, 390],
        keyboard: true,
        validation: true,
        registration: true,
        explicitResend: true,
        backend: 'synthetic intercepted API; no real registration or email',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS registration design: responsive, keyboard, validation, exact DTO, explicit resend; synthetic API only',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/main.tsx`)
  await unlink(`${dir}/index.html`)
  await rmdir(dir)
}
