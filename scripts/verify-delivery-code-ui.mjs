// Synthetic UI only. All API traffic is intercepted; screenshots mask secret fields.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
const output = 'test-results/delivery-code-ui/' + Date.now()
const origin = 'http://127.0.0.1:4243'
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
import {MemoryRouter} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import {queryClient} from '/src/services/query'
import {AuthContext} from '/src/auth/context'
import {FeedbackProvider} from '/src/components/Feedback'
import {DeliveryCode} from '/src/customer/DeliveryCode'
import {DriverExecutionActions} from '/src/driver-portal/execution'
import '/src/index.css'
const driver = location.search.includes('driver'), metadata={policy:'REQUIRED',method:null}
const e={trackingMode:'DETAILED',revision:4,phase:'AT_DROPOFF',activeAssignmentId:'11111111-1111-4111-8111-111111111111',custodyStatus:'HELD',openIncidentId:null,allowedActions:['DELIVER'],lastRecordedAt:'2026-11-03T12:00:00Z',deliveryConfirmation:metadata}
const auth={user:{id:'synthetic-actor',role:driver?'DRIVER':'CUSTOMER',email:'synthetic@example.test',active:true},loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter><main style={{maxWidth:750,margin:'24px auto',padding:16}}><h1>Prueba local sintética</h1>{driver?<DriverExecutionActions dispatchId="synthetic-dispatch" e={e}/>:<DeliveryCode publicId="MDR-SYNTHETIC" metadata={metadata} terminal={false}/>}</main></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'silent',
  cacheDir: output + '/cache',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4243, strictPort: true },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  let mutations = 0
  await page.route('**/api/v1/**', async (route) => {
    if (route.request().method() !== 'GET') mutations++
    if (route.request().url().endsWith('/delivery-code'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          publicId: 'MDR-SYNTHETIC',
          deliveryCode: '0' + '83729',
        }),
      })
    return route.fulfill({ status: 404, body: '{}' })
  })
  const screenshots = []
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(origin + '/' + output + '/index.html')
    await page
      .getByRole('button', { name: 'Consultar código de entrega' })
      .click()
    const code = page.getByLabel('Código privado de entrega')
    await expect(code).toBeVisible()
    const customerFile = 'customer-' + width + '.png'
    await page.screenshot({
      path: output + '/' + customerFile,
      fullPage: true,
      mask: [code],
    })
    screenshots.push(customerFile)
    await page.getByRole('button', { name: 'Ocultar código' }).click()
    await expect(code).toHaveCount(0)
    await page.goto(origin + '/' + output + '/index.html?driver')
    await page
      .getByRole('button', { name: 'Confirmar entrega detallada' })
      .click()
    const input = page.getByLabel('Código de entrega (6 dígitos)', {
      exact: true,
    })
    await input.fill('0' + '83729')
    await expect(input).toBeFocused()
    const driverFile = 'driver-' + width + '.png'
    await page.screenshot({
      path: output + '/' + driverFile,
      fullPage: true,
      mask: [input],
    })
    screenshots.push(driverFile)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(input).toHaveCount(0)
  }
  if (mutations !== 0) throw Error('Unexpected mutation')
  await writeFile(
    output + '/report.json',
    JSON.stringify(
      {
        status: 'PASS',
        kind: 'SYNTHETIC_UI_NOT_HTTP_ACCEPTANCE',
        screenshots,
        secretsMasked: true,
        mutations,
      },
      null,
      2,
    ),
  )
  console.log(output)
} finally {
  await browser?.close()
  await server.close()
}
