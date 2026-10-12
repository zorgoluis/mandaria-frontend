import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = '.tmp/public-tracking-design',
  out = resolve('test-results/public-tracking-design')
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="origin"></head><body><div id="root"></div><script type="module" src="/.tmp/public-tracking-design/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {PublicTrackingScreen} from '../../src/location/PublicTrackingScreen';import {ApiError} from '../../src/services/errors';import '../../src/index.css';const now=Date.now(),v={publicId:'MDR-SINTETICA',progress:{publicVersion:'1',status:'ASSIGNED',trackingMode:'DETAILED',assignmentState:'ACTIVE',phase:'TO_DROPOFF',attentionRequired:false,terminalOutcome:null},location:{locationVersion:'1',assignmentGeneration:'1',availability:'AVAILABLE',unavailableReason:null,sample:{latitude:17.02,longitude:-93.37,accuracyMeters:5,capturedAt:new Date(now).toISOString(),receivedAt:new Date(now).toISOString(),freshUntil:new Date(now+60000).toISOString(),eraseAfter:new Date(now+600000).toISOString()}},observation:{evaluatedAt:new Date(now).toISOString(),freshness:'RECENT'}};function Demo(){const[mode,setMode]=React.useState('recent');React.useEffect(()=>{const f=(e)=>setMode(e.detail);window.addEventListener('fixture-mode',f);return()=>window.removeEventListener('fixture-mode',f)},[]);const data=mode==='terminal'?{...v,progress:{...v.progress,terminalOutcome:{type:'DELIVERED',occurredAt:new Date(now).toISOString()}}}:mode==='none'?{...v,location:{...v.location,sample:null}}:v;return <PublicTrackingScreen view={data as never} now={now+(mode==='stale'?61000:0)} error={mode==='denied'?new ApiError(404,'Synthetic'):undefined}/>};createRoot(document.getElementById('root')!).render(<MemoryRouter><Demo/></MemoryRouter>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4193, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4193'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('synthetic-key'),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = []
  let loads = 0
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url())
    if (u.hostname === '127.0.0.1') return route.continue()
    if (u.hostname !== 'maps.googleapis.com') return route.abort()
    loads++
    assert.equal(route.request().headers().authorization, undefined)
    return route.fulfill({
      contentType: 'application/javascript',
      body: `window.mapConstructions=0;window.google={maps:{ControlPosition:{RIGHT_BOTTOM:9},Map:class{constructor(el){window.mapConstructions++;el.style.background='repeating-linear-gradient(25deg,transparent,transparent 75px,#d5e1db 77px,white 85px,#d5e1db 87px,transparent 90px),#e8efeb';el.innerHTML='<div style="position:absolute;left:65%;top:43%;width:80px;height:80px;border:1px solid #156b5c99;background:#156b5c2e;border-radius:50%;display:grid;place-items:center"><i style="width:16px;height:16px;background:#156b5c;border:3px solid white;border-radius:50%"></i></div><span style="position:absolute;bottom:6px;left:8px;background:white;padding:4px;font:12px sans-serif">SDK SIMULADO · sin cartografía real</span><button style="position:absolute;right:14px;bottom:40px" aria-label="Acercar mapa">+</button>'}getBounds(){return{contains:()=>true}}getZoom(){return 16}setCenter(){}unbindAll(){}},Circle:class{setOptions(){}setMap(){}unbindAll(){}},event:{clearInstanceListeners(){}}}};window.mandariaMapsReady();`,
    })
  })
  await page.goto(
    'http://127.0.0.1:4193/.tmp/public-tracking-design/index.html',
  )
  await page.getByRole('button', { name: 'Acercar mapa' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 900, 390]) {
    await page.setViewportSize({ width, height: 844 })
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
  const toggle = page.getByRole('button', { name: 'Ver detalles del envío' })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await page
    .getByText('17.02, -93.37', { exact: true })
    .waitFor({ state: 'visible' })
  await page.screenshot({
    path: resolve(out, 'mobile-expanded.png'),
    fullPage: true,
  })
  assert.equal(await page.evaluate(() => window.mapConstructions), 1)
  for (const mode of ['stale', 'terminal', 'none', 'denied']) {
    await page.evaluate(
      (mode) =>
        window.dispatchEvent(new CustomEvent('fixture-mode', { detail: mode })),
      mode,
    )
    await page
      .getByText(
        mode === 'stale'
          ? 'Señal desactualizada'
          : mode === 'terminal'
            ? 'Entregado'
            : mode === 'none'
              ? 'Aún no hay ubicación disponible'
              : 'Este enlace ya no está disponible',
        { exact: true },
      )
      .waitFor()
    if (mode !== 'stale') {
      assert.equal(
        await page.getByLabel('Mapa con la última posición del envío').count(),
        0,
      )
      assert.equal(
        await page.getByText('17.02, -93.37', { exact: true }).count(),
        0,
      )
    }
    await page.screenshot({
      path: resolve(out, `mobile-${mode}.png`),
      fullPage: true,
    })
  }
  assert.equal(loads, 1)
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        widths: [1440, 900, 390],
        keyboard: true,
        states: ['recent', 'stale', 'terminal', 'none', 'denied'],
        sdk: 'SIMULATED',
        backend: 'none; component fixtures',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS public tracking design: responsive, keyboard, state withdrawal; SDK and data synthetic',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/main.tsx`)
  await unlink(`${dir}/index.html`)
  await rmdir(dir)
}
