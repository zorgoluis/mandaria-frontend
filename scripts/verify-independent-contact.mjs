// Browser-only synthetic acceptance. Never starts or contacts a backend.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
const output = 'test-results/independent-contact/' + Date.now()
await mkdir(output, { recursive: true })
await writeFile(
  output + '/index.html',
  '<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/' +
    output +
    '/harness.tsx"></script></html>',
)
await writeFile(
  output + '/harness.tsx',
  `
import {createRoot} from 'react-dom/client'
import {useState} from 'react'
import {AuthContext} from '/src/auth/context'
import {DeclaredPhone} from '/src/independent-drivers/contact'
import {InfoGrid} from '/src/components/ui'
import '/src/index.css'
const user={id:'synthetic-admin',role:'SUPER_ADMIN',active:true,email:'synthetic@example.test'}
function Harness(){const [open,setOpen]=useState(true);return <AuthContext.Provider value={{user,loading:false,expired:false}}><main style={{padding:24,maxWidth:900,margin:'auto'}}><h1>Información del usuario</h1><section className="panel"><InfoGrid items={[["Nombre","Conductor sintético"],["Teléfono de contacto declarado",open?<DeclaredPhone driverId="11111111-1111-4111-8111-111111111111"/>:'Ficha cerrada']]} /></section><button onClick={()=>setOpen(!open)}>{open?'Salir de la ficha':'Volver a la ficha'}</button></main></AuthContext.Provider>}
createRoot(document.getElementById('root')!).render(<Harness/> )
`,
)
const origin = 'http://127.0.0.1:4249'
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'error',
  cacheDir: output + '/cache',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4249, strictPort: true },
})
let browser
const report = {
  kind: 'SIMULATED_HTTP_NOT_BACKEND',
  checks: [],
  screenshots: [],
}
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage()
  let state = 'AVAILABLE',
    calls = 0
  await page.route('**/api/v1/**', async (route) => {
    if (
      !route
        .request()
        .url()
        .endsWith(
          '/admin/drivers/11111111-1111-4111-8111-111111111111/independent',
        )
    )
      throw new Error('Unexpected endpoint')
    calls++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'private, no-store' },
      body: JSON.stringify({
        declaredContact: {
          availability: state,
          phone: state === 'AVAILABLE' ? '0000000000' : null,
          source: 'DRIVER_IDENTITY_DECLARATION',
        },
      }),
    })
  })
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 })
    state = 'AVAILABLE'
    await page.goto(origin + '/' + output + '/index.html')
    await expect(page.locator('[data-private-contact]')).toHaveText(
      '0000000000',
    )
    const file = output + '/' + width + '.png'
    await page.screenshot({
      path: file,
      fullPage: true,
      mask: [page.locator('[data-private-contact]')],
    })
    report.screenshots.push(file)
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error('Overflow')
  }
  for (const [availability, label] of [
    ['NOT_RECORDED', 'No registrado'],
    ['UNAVAILABLE', 'No disponible'],
  ]) {
    state = availability
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.locator('[data-private-contact]')).toHaveText(label)
  }
  await page.getByRole('button', { name: 'Salir de la ficha' }).click()
  await expect(page.locator('[data-private-contact]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Volver a la ficha' }).click()
  await expect(page.locator('[data-private-contact]')).toHaveText(
    'No disponible',
  )
  if (await page.evaluate(() => localStorage.length + sessionStorage.length))
    throw new Error('Unexpected persistence')
  report.checks = [
    'AVAILABLE desktop/mobile masked',
    'no overflow',
    'NOT_RECORDED',
    'UNAVAILABLE',
    'exit/reentry fresh read',
    'no web storage',
    'only authorized detail GET',
  ]
  report.calls = calls
  report.status = 'PASS'
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await browser?.close()
  await server.close()
}
