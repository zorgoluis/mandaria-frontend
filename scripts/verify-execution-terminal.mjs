import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = '.tmp/execution-terminal',
  out = 'test-results/execution-terminal'
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/execution-terminal/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {ExecutionProgress} from '../../src/execution/components';import {executionFixture} from '../../src/test/execution-fixture';import '../../src/index.css';createRoot(document.getElementById('root')!).render(<main style={{padding:16}}><h1>Progreso: ejemplos sintéticos</h1>{(['DELIVERED','HELD','RETURNED'] as const).map(custodyStatus=><div key={custodyStatus} data-state={custodyStatus}><ExecutionProgress execution={{...executionFixture,phase:'AT_DROPOFF',custodyStatus,activeAssignmentId:null,allowedActions:[]}}/></div>)}</main>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4197, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4197'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1'
      ? r.continue()
      : r.abort(),
  )
  await page.goto('http://127.0.0.1:4197/.tmp/execution-terminal/index.html')
  await page.locator('.execution-phases').first().waitFor()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const [state, label] of [
      ['DELIVERED', 'Entrega confirmada'],
      ['HELD', 'Fase actual'],
      ['RETURNED', 'Devuelto al origen'],
    ]) {
      const current = page.locator(
        `[data-state="${state}"] [aria-current="step"]`,
      )
      assert.equal(await current.count(), 1)
      assert.ok((await current.textContent()).includes(label))
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({ path: `${out}/${width}.png`, fullPage: true })
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS: desktop/mobile viewport, final aria-current, preserved phases, no overflow/page errors. Synthetic component only.',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/index.html`)
  await unlink(`${dir}/main.tsx`)
  await rmdir(dir)
}
