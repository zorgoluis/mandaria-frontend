import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = '.tmp/shipments-design',
  out = resolve('test-results/shipments-design')
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/shipments-design/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';import {MyShipments} from '../../src/customer/MyShipments';import {requestDetail} from '../../src/test/fixtures/request-design';import '../../src/index.css';function Demo(){const [page,setPage]=useState(1);const empty=location.search.includes('empty'),loading=location.search.includes('loading');const cap={type:'PERSONAL',allowedShippingPayers:['REQUESTER'],defaultShippingPayer:'REQUESTER',capacity:{occupied:!empty,activeCount:empty?0:1,maxActiveRequests:1,activeRequestPublicId:empty?null:'MDR-000009'},canPrequote:empty,canCreateRequest:empty,reason:null};return <MyShipments capabilities={cap as never} activeRequest={requestDetail} items={{items:empty?[]:page===1?[requestDetail,{...requestDetail,publicId:'MDR-000008',status:'CANCELLED'}]:[{...requestDetail,publicId:'MDR-000007'}],page,pageSize:2,total:empty?0:3,totalPages:empty?0:2}} loading={loading} blocked={false} onPage={setPage}/>};createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/customer']}><main className="customer-area"><Routes><Route path="/customer" element={<Demo/>}/><Route path="/customer/requests/:id" element={<h1>Detalle sintético</h1>}/></Routes></main></MemoryRouter>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4191, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4191'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue()
      : route.abort(),
  )
  const url = 'http://127.0.0.1:4191/.tmp/shipments-design/index.html'
  await page.goto(url)
  await page.getByRole('table').waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 900, 390]) {
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
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page
    .getByRole('link', { name: 'Ver solicitud MDR-000007, estado Creada' })
    .waitFor()
  assert(await page.getByRole('button', { name: 'Siguiente' }).isDisabled())
  await page
    .getByRole('link', { name: 'Ver solicitud MDR-000007, estado Creada' })
    .focus()
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { name: 'Detalle sintético' }).waitFor()
  await page.goto(url)
  await page.getByRole('table').waitFor()
  const stateCell = page.getByRole('cell').filter({ hasText: 'Cancelada' })
  await stateCell.scrollIntoViewIfNeeded()
  const box = await stateCell.boundingBox()
  assert(box)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.getByRole('heading', { name: 'Detalle sintético' }).waitFor()
  await page.goto(url + '?empty')
  await page.getByText('Aún no tienes envíos').waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Cotizar envío' }).count(),
    1,
  )
  await page.screenshot({
    path: resolve(out, 'mobile-empty.png'),
    fullPage: true,
  })
  await page.goto(url + '?loading')
  await page.getByRole('status', { name: 'Cargando envíos' }).waitFor()
  assert.equal(await page.locator('.shipments-skeleton').count(), 3)
  await page.screenshot({
    path: resolve(out, 'mobile-loading.png'),
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        widths: [1440, 900, 390],
        keyboard: true,
        wholeRow: true,
        pagination: true,
        empty: true,
        skeleton: true,
        backend: 'none; component fixtures',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS shipments design: responsive, keyboard, full row navigation, pagination, empty, skeleton; fixtures only',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/main.tsx`)
  await unlink(`${dir}/index.html`)
  await rmdir(dir)
}
