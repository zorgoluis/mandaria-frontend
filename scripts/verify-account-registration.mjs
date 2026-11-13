// Synthetic UI review of the account continuation card; no backend or mutations.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
const output = 'test-results/account-registration/' + Date.now(),
  origin = 'http://127.0.0.1:4251'
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
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {ProfilePage} from '/src/users/pages'
import {AuthContext} from '/src/auth/context'
import '/src/index.css'
const user={id:'synthetic-driver',email:'driver@example.test',role:'DRIVER',active:true,emailVerifiedAt:'2026-11-06T00:00:00Z',createdAt:'2026-11-06T00:00:00Z',updatedAt:'2026-11-06T00:00:00Z'}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={{user,loading:false,expired:false}}><MemoryRouter><main style={{padding:24,maxWidth:1100,margin:'auto'}}><ProfilePage/></main></MemoryRouter></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'error',
  cacheDir: output + '/cache',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4251, strictPort: true },
})
let browser
const report = { mode: 'SIMULATED_HTTP', checks: [], screenshots: [] }
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage()
  let status = 'DRAFT'
  await page.route('**/api/v1/**', async (route) => {
    if (
      route.request().method() !== 'GET' ||
      !route.request().url().endsWith('/driver/onboarding')
    )
      throw Error('Unexpected request')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        driver: {
          id: 'driver',
          providerId: null,
          status: 'PENDING',
          independentProfile: {
            id: 'profile',
            status: 'PENDING',
            vehicles: [
              {
                id: 'vehicle',
                identifier: 'BICI-1',
                status: 'ACTIVE',
                type: 'BICYCLE',
              },
            ],
          },
        },
        subjects: [
          {
            id: 'identity',
            driverId: 'driver',
            vehicleId: null,
            cases: [
              { id: 'case1', status, revision: 1, environment: 'LOCAL_TEST' },
            ],
          },
          {
            id: 'unit',
            driverId: null,
            vehicleId: 'vehicle',
            cases: [
              { id: 'case2', status, revision: 1, environment: 'LOCAL_TEST' },
            ],
          },
        ],
        terms: {
          requiredVersion: 'v1',
          acceptance: {
            id: 'acceptance',
            version: 'v1',
            acceptedAt: '2026-11-06T00:00:00Z',
          },
        },
        environment: 'LOCAL_TEST',
      }),
    })
  })
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(origin + '/' + output + '/index.html')
    await expect(
      page.getByRole('link', { name: 'Continuar mi registro' }),
    ).toBeVisible()
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error('Overflow')
    const file = output + '/' + width + '.png'
    await page.screenshot({ path: file, fullPage: true })
    report.screenshots.push(file)
  }
  status = 'SUBMITTED'
  await page.reload()
  await expect(
    page.getByRole('link', { name: 'Ver estado de mi solicitud' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Continuar mi registro' }),
  ).toHaveCount(0)
  report.checks = [
    'Saved drafts with Continue CTA',
    'Desktop/mobile without overflow',
    'Submitted switches to status CTA',
    'GET only; no commands',
  ]
  report.status = 'PASS'
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await browser?.close()
  await server.close()
}
