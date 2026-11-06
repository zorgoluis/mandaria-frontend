// Synthetic browser verification: all API responses below are simulated.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
const output = 'test-results/independent-detail-design/' + Date.now()
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
import {MemoryRouter, Routes, Route} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import {queryClient} from '/src/services/query'
import {AuthContext} from '/src/auth/context'
import {IndependentDriverDetail} from '/src/independent-drivers/pages'
import '/src/index.css'
const user={id:'synthetic-admin',role:'SUPER_ADMIN',active:true,email:'admin@example.test'}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={{user,loading:false,expired:false}}><MemoryRouter initialEntries={['/independent-drivers/11111111-1111-4111-8111-111111111111']}><main style={{padding:24,background:'#f4f6f5'}}><Routes><Route path="/independent-drivers/:driverId" element={<IndependentDriverDetail/>}/></Routes></main></MemoryRouter></AuthContext.Provider></QueryClientProvider>)
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
const driverId = '11111111-1111-4111-8111-111111111111'
const stamp = '2026-11-06T12:00:00Z'
const profile = {
  id: '22222222-2222-4222-8222-222222222222',
  driverId,
  status: 'APPROVED',
  approvedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  suspendedAt: null,
  rejectedAt: null,
  reason: null,
  driver: {
    id: driverId,
    name: 'Martín de Jesús · Sintético',
    status: 'ACTIVE',
    availability: 'OFFLINE',
    providerId: null,
    user: {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'martin@example.test',
      active: true,
    },
  },
  driverCategory: {
    contractVersion: '1.0.0',
    categoryRevision: '9007199254740993',
    category: 'INDEPENDENT',
    providerId: null,
    independentMembershipState: 'CURRENT',
    independentApprovalStatus: 'APPROVED',
    resolutionRequired: false,
  },
  declaredContact: {
    availability: 'NOT_RECORDED',
    phone: null,
    source: 'DRIVER_IDENTITY_DECLARATION',
  },
}
const report = {
  kind: 'SIMULATED_HTTP_NOT_BACKEND',
  checks: [],
  screenshots: [],
  mutations: [],
}
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    let body,
      status = 200
    if (request.method() !== 'GET') {
      report.mutations.push({ path, body: request.postDataJSON() })
      status = 409
      body = {
        code: 'INDEPENDENT_DRIVER_HAS_ACTIVE_ASSIGNMENT',
        message: 'Synthetic conflict',
      }
    } else if (path.endsWith('/credits/ledger'))
      body = {
        items: [
          {
            id: 'ledger-1',
            createdAt: stamp,
            type: 'RECHARGE',
            amount: 100,
            balanceAfter: 100,
            reason: 'Obsequio sintético de bienvenida',
            rechargeMethod: 'OTHER',
            createdByUserId: 'synthetic-admin',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      }
    else if (path.endsWith('/credits'))
      body = {
        id: 'credits-1',
        ownerType: 'INDEPENDENT_DRIVER',
        balance: 100,
        updatedAt: stamp,
      }
    else if (path.endsWith('/vehicles'))
      body = [
        {
          id: 'vehicle-1',
          independentDriverProfileId: profile.id,
          identifier: 'MOTOCICLISTA',
          type: 'MOTORCYCLE',
          status: 'ACTIVE',
          brand: 'Unidad sintética',
          model: '150z',
          year: 2023,
          color: 'Amarillo con negro',
          plate: 'TEST-01',
        },
      ]
    else if (path.endsWith('/offer-zones'))
      body = { revision: '9007199254740993', zoneIds: [] }
    else if (path.endsWith('/independent')) body = profile
    else throw Error('Unexpected request ' + path)
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  await page.goto(origin + '/' + output + '/index.html')
  await expect(page.getByText('No registrado', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Suspender', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Rechazar', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Copiar ID de conductor', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Copiado' }),
  ).toBeVisible()
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== driverId)
    throw Error('Wrong clipboard identifier')
  report.checks.push(
    'Actions disabled without reason; exact driver ID copied; large revision preserved',
  )
  await expect(
    page.getByText('Independiente · Revisión 9007199254740993'),
  ).toBeVisible()
  for (const width of [1440, 1000, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error('Horizontal overflow ' + width)
    const file = output + '/detail-' + width + '.png'
    await page.screenshot({ path: file, fullPage: true })
    report.screenshots.push(file)
  }
  await page
    .getByLabel('Motivo de habilitación')
    .fill('Revisión sintética de documentación')
  await page.getByRole('button', { name: 'Suspender', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Motivo', { exact: true })).toHaveValue(
    'Revisión sintética de documentación',
  )
  await dialog.getByRole('button', { name: 'Suspender', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('servicio')
  await dialog.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Decisión sobre la habilitación' })
      .getByRole('status'),
  ).toContainText('servicio')
  if (report.mutations.length !== 1) throw Error('Unexpected mutation count')
  report.checks.push(
    'Confirmation keeps reason; single synthetic POST; 409 remains in decision card; no optimistic state change',
  )
  report.status = 'PASS'
} finally {
  await browser?.close()
  await server.close()
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
  console.log(output)
}
