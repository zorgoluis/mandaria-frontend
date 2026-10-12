import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const directory = '.tmp/conversion-design'
const out = resolve('test-results/conversion-design')
await mkdir(directory, { recursive: true })
await mkdir(out, { recursive: true })
const quote = {
  publicId: 'MPQ-000009',
  status: 'OFFERED',
  conditionsVersion: 1,
  conditions: {
    conditionsVersion: 1,
    serviceType: 'LOCAL_DELIVERY',
    stops: [
      { type: 'PICKUP', sequence: 1, latitude: 17.5, longitude: -93.1 },
      { type: 'DROPOFF', sequence: 2, latitude: 17.6, longitude: -93.2 },
    ],
    packages: [{ category: 'FOOD', quantity: 2, isFragile: true }],
  },
  shippingTerms: {
    payer: 'REQUESTER',
    method: 'CASH',
    dueAt: 'PICKUP',
    component: 'DELIVERY_FEE',
    termsVersion: 1,
    termsHash: 'synthetic',
  },
  serviceZone: { code: 'TEST', name: 'Sintética' },
  distanceMeters: 100,
  durationSeconds: 100,
  amount: '35.25',
  currency: 'MXN',
  createdAt: '2026-10-12T00:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z',
  convertedAt: null,
  deliveryRequestPublicId: null,
  deliveryQuotePublicId: null,
  availabilityGuaranteed: false,
}
await writeFile(
  `${directory}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/conversion-design/main.tsx"></script></body></html>',
)
await writeFile(
  `${directory}/main.tsx`,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {AuthContext} from '../../src/auth/context';import {ConversionForm} from '../../src/customer/ConversionForm';import '../../src/index.css';const quote=${JSON.stringify(quote)};if(location.search)quote.expiresAt='2020-01-01T00:00:00Z';createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={{user:{id:'synthetic'},loading:false} as never}><main><ConversionForm quote={quote as never} onBack={()=>{}} onSubmit={async()=>{document.getElementById('result')!.textContent='Solicitud simulada'}}/><output id="result"/></main></AuthContext.Provider></QueryClientProvider>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4189, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4189'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('synthetic-key'),
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
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/customer/profile')
      return route.fulfill({
        json: {
          active: true,
          displayName: 'Ana Prueba',
          type: 'PERSONAL',
          revision: 1,
          businessName: null,
        },
      })
    if (url.hostname === '127.0.0.1') return route.continue()
    if (
      url.hostname === 'maps.googleapis.com' &&
      url.pathname === '/maps/api/js'
    )
      return route.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        body: `window.google={maps:{Map:class{},Circle:class{},importLibrary:async()=>({Geocoder:class{async geocode({location}){return {results:[{formatted_address:location.lat===17.5?'Avenida Central 120, Centro, Ciudad de prueba':'Calle Jardines 45, Colonia Norte, Ciudad de prueba'}]}}}})}};window.mandariaMapsReady();`,
      })
    return route.abort()
  })
  const url = 'http://127.0.0.1:4189/.tmp/conversion-design/index.html'
  await page.goto(url)
  await page
    .getByLabel('Contacto de origen')
    .filter({ visible: true })
    .waitFor()
  await page.waitForFunction(
    () => document.querySelector('[name=name0]').value === 'Ana Prueba',
  )
  await page.waitForFunction(() =>
    document.querySelector('[name=address1]').value.includes('Jardines'),
  )
  await page.evaluate(() => document.fonts.ready)
  const submit = page.getByRole('button', {
    name: 'Crear solicitud y revisar términos',
  })
  assert(await submit.isDisabled())
  await page.screenshot({
    path: resolve(out, 'desktop-empty.png'),
    fullPage: true,
  })
  for (const [label, value] of [
    ['Teléfono de origen', '9615550011'],
    ['Contacto de destino', 'Persona de prueba'],
    ['Teléfono de destino', '9615550012'],
    ['Descripción del paquete', 'Caja con dos pasteles'],
    ['Nombre del pagador', 'Ana Prueba'],
    ['Teléfono del pagador', '9615550011'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value)
  assert(await submit.isEnabled())
  await page.getByRole('radio', { name: 'Adelanto por repartidor' }).focus()
  await page.keyboard.press('Space')
  assert(await submit.isDisabled())
  await page.getByLabel('Valor de mercancía en MXN', { exact: true }).fill('0')
  await page.keyboard.press('Tab')
  await page
    .getByText('Escribe un importe mayor a cero, con hasta dos decimales.')
    .waitFor()
  await page.screenshot({
    path: resolve(out, 'desktop-error.png'),
    fullPage: true,
  })
  await page
    .getByLabel('Valor de mercancía en MXN', { exact: true })
    .fill('125.50')
  assert(await submit.isEnabled())
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => window.scrollTo(0, 0))
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
  await submit.click()
  await page.getByText('Solicitud simulada', { exact: true }).waitFor()
  await page.goto(url + '?expired')
  await page.getByText('La precotización ha vencido.').waitFor()
  assert(await submit.isDisabled())
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
        validation: true,
        expiry: true,
        profile: 'fixture',
        google: 'fixture',
        submission: 'simulated',
        backend: 'none',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS conversion visual: 1440 / 1024 / 390, keyboard, validation, expiry; fixtures only',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${directory}/main.tsx`)
  await unlink(`${directory}/index.html`)
  await rmdir(directory)
}
