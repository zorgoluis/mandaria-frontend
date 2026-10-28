import fs from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = 'test-results/google-map'
await fs.mkdir(dir, { recursive: true })
await fs.writeFile(
  dir + '/index.html',
  '<html><head><meta charset="UTF-8"><meta name="referrer" content="origin"></head><body><div id="fixture"></div><script type="module" src="/test-results/google-map/fixture.tsx"></script></body></html>',
)
await fs.writeFile(
  dir + '/fixture.tsx',
  `import React from 'react';import {createRoot} from 'react-dom/client';import {LocationCard} from '/src/location/components';import '/src/index.css';const time=Date.now();const v={publicId:'MDR-SINTETICA',progress:{publicVersion:'1',status:'ASSIGNED',trackingMode:'DETAILED',assignmentState:'ACTIVE',phase:'PICKED_UP',attentionRequired:false,terminalOutcome:null},location:{locationVersion:'1',assignmentGeneration:'1',availability:'AVAILABLE',unavailableReason:null,sample:{latitude:17.02,longitude:-93.37,accuracyMeters:12,capturedAt:new Date(time).toISOString(),receivedAt:new Date(time).toISOString(),freshUntil:new Date(time+60000).toISOString(),eraseAfter:new Date(time+600000).toISOString()}},observation:{evaluatedAt:new Date(time).toISOString(),freshness:'RECENT'}};function Fixture(){const [ended,setEnded]=React.useState(false);return <main className="shared-tracking"><h1>Prueba sintética del mapa</h1><button onClick={()=>setEnded(true)}>Retirar posición</button><LocationCard view={ended?{...v,progress:{...v.progress,attentionRequired:true}}:v} now={time}/></main>}createRoot(document.getElementById('fixture')).render(<Fixture/>);`,
)
process.env.VITE_API_URL = 'http://127.0.0.1:43182'
process.env.VITE_GOOGLE_MAPS_API_KEY = 'synthetic-key'
const server = await createServer({
  server: { host: '127.0.0.1', port: 4182, strictPort: true },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const requests = []
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('https://maps.googleapis.com/**', async (route) => {
    const req = route.request()
    requests.push({ url: req.url(), headers: req.headers() })
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.google={maps:{Map:class{constructor(el){el.style.background='#e7eeee';el.innerHTML='<p>SDK simulado: sin cartografía real</p><button aria-label="Acercar mapa">+</button>'}setCenter(){}unbindAll(){}},Circle:class{setOptions(){}setMap(){}unbindAll(){}},event:{clearInstanceListeners(){}}}};window.mandariaMapsReady();`,
    })
  })
  await page.goto('http://127.0.0.1:4182/' + dir + '/index.html')
  await page.getByRole('button', { name: 'Acercar mapa' }).waitFor()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: dir + '/desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: dir + '/mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Retirar posición' }).focus()
  await page.keyboard.press('Enter')
  assert.equal(
    await page.getByLabel('Mapa de la última posición autorizada').count(),
    0,
  )
  assert.equal(
    await page.getByText('17.02, -93.37', { exact: true }).count(),
    0,
  )
  assert.equal(requests.length, 1)
  assert.equal(requests[0].headers.authorization, undefined)
  assert.equal(requests[0].headers.cookie, undefined)
  assert.equal(requests[0].headers.referer, 'http://127.0.0.1:4182/')
  assert.equal(errors.length, 0)
  await fs.writeFile(
    dir + '/result.json',
    JSON.stringify(
      {
        sdk: 'SIMULATED, Google requests fulfilled locally',
        passed: [
          'desktop',
          'mobile',
          'keyboard withdrawal',
          'one SDK load',
          'origin-only referrer',
          'no Mandaria credentials',
        ],
        errors,
      },
      null,
      2,
    ),
  )
  console.log('PASS visual fixture, keyboard, request privacy (SDK SIMULATED)')
} finally {
  await browser?.close()
  await server.close()
  await fs.rm(dir + '/fixture.tsx', { force: true })
  await fs.rm(dir + '/index.html', { force: true })
}
