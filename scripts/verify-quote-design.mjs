import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const out = resolve('test-results/quote-design')
await mkdir(out, { recursive: true })
await mkdir('.tmp/quote-design', { recursive: true })
await writeFile(
  '.tmp/quote-design/index.html',
  '<html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/quote-design/main.tsx"></script></body></html>',
)
await writeFile(
  '.tmp/quote-design/main.tsx',
  `import React from 'react'; import { createRoot } from 'react-dom/client'; import { MemoryRouter } from 'react-router-dom'; import { QuoteForm } from '../../src/customer/QuoteForm'; import '../../src/index.css'; createRoot(document.getElementById('root')!).render(<MemoryRouter><main><QuoteForm capabilities={{type:'BUSINESS', allowedShippingPayers:['REQUESTER','RECIPIENT'], defaultShippingPayer:'REQUESTER', capacity:{occupied:false,activeCount:0,maxActiveRequests:null,activeRequestPublicId:null},canPrequote:true,canCreateRequest:true,reason:null}} onSubmit={async()=>{document.getElementById('result')!.textContent='Precotización simulada enviada'}}/><output id="result"/></main></MemoryRouter>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4188, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4188'),
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
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (
      url.hostname === 'maps.googleapis.com' &&
      url.pathname === '/maps/api/js'
    )
      return route.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        body: `window.google={maps:{Map:class{},Circle:class{},importLibrary:async()=>({AutocompleteSessionToken:class{},AutocompleteSuggestion:{fetchAutocompleteSuggestions:async({input})=>({suggestions:[{placePrediction:{text:{toString:()=>input+', Ciudad sintética'},toPlace:()=>({formattedAddress:input+', Ciudad sintética',location:{lat:()=>17.5,lng:()=>-93.1},fetchFields:async()=>({})})}}]})}})}};window.mandariaMapsReady();`,
      })
    return route.abort()
  })
  await page.goto('http://127.0.0.1:4188/.tmp/quote-design/index.html')
  await page.getByRole('heading', { name: 'Cotizar envío' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: resolve(out, 'desktop-empty.png'),
    fullPage: true,
  })
  assert(
    await page
      .getByRole('button', { name: 'Obtener precotización' })
      .isDisabled(),
  )
  for (const label of ['origen', 'destino']) {
    const input = page.getByRole('combobox', {
      name: 'Buscar dirección de ' + label,
    })
    await input.fill(
      label === 'origen' ? 'Avenida Central 120' : 'Calle Jardines 45',
    )
    await page.getByRole('option').waitFor()
    await input.press('ArrowDown')
    await input.press('Enter')
    await page
      .getByText(
        label === 'origen' ? 'Origen seleccionado' : 'Destino seleccionado',
        { exact: true },
      )
      .waitFor()
  }
  await page.getByRole('radio', { name: 'Documento', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Aumentar cantidad' }).click()
  await page.getByRole('switch', { name: 'Frágil' }).focus()
  await page.keyboard.press('Space')
  assert.equal(
    await page
      .getByRole('switch', { name: 'Frágil' })
      .getAttribute('aria-checked'),
    'true',
  )
  await page
    .getByRole('radio', { name: 'Destinatario', exact: true })
    .check({ force: true })
  assert(
    await page
      .getByRole('button', { name: 'Obtener precotización' })
      .isEnabled(),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: resolve(out, 'desktop-ready.png'),
    fullPage: true,
  })
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const fit = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    )
    assert(fit, 'No horizontal overflow at ' + width)
    await page.screenshot({
      path: resolve(out, `width-${width}.png`),
      fullPage: true,
    })
  }
  await page.getByRole('button', { name: 'Obtener precotización' }).click()
  await page.getByText('Precotización simulada enviada').waitFor()
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        screens: [1440, 1024, 390],
        keyboard: true,
        submit: 'simulated',
        google: 'simulated',
        backend: 'none',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS: desktop/tablet/mobile, keyboard, simulated Places and submit; no external requests.',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink('.tmp/quote-design/index.html')
  await unlink('.tmp/quote-design/main.tsx')
  await rmdir('.tmp/quote-design')
}
