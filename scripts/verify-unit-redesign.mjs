// Independent render/keyboard review with faithful synthetic HTTP fixtures.
// No backend, PostgreSQL, Docker, mail, storage or publication is started or contacted.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const output = 'test-results/unit-redesign/' + Date.now(),
  origin = 'http://127.0.0.1:4240'
await mkdir(output, { recursive: true })
await writeFile(
  output + '/index.html',
  `<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/${output}/harness.tsx"></script></html>`,
)
await writeFile(
  output + '/harness.tsx',
  `
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {App} from '/src/app/App'
import {AuthContext} from '/src/auth/context'
import {FeedbackProvider} from '/src/components/Feedback'
import '/src/index.css'
const q=new URLSearchParams(location.search),user={id:'11111111-1111-4111-8111-111111111111',role:q.get('role')||'DRIVER',email:'synthetic@example.invalid',active:true,emailVerifiedAt:'2026-10-19T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[q.get('path')||'/driver/onboarding']}><App/></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'silent',
  cacheDir: output + '/vite-cache',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4240, strictPort: true },
})
const report = {
  status: 'RUNNING',
  kind: 'SYNTHETIC_RENDER_NOT_BACKEND_INTEGRATION',
  checks: [],
  screenshots: [],
  errors: [],
  unexpected: [],
  mutations: 0,
}
let browser,
  missing = false,
  accepted = false,
  caseStatus = 'DRAFT'
try {
  await server.listen()
  const f = await server.ssrLoadModule('/src/test/verification-fixtures.ts')
  browser = await chromium.launch({ timeout: 15000 })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', () => report.errors.push('render-error'))
  const text =
    'TEXTO SINTÉTICO SIN VALIDEZ LEGAL. Se muestra el contenido íntegro de la versión devuelta por el servidor.\n\n'.repeat(
      150,
    )
  const terms = {
    ...f.terms,
    environment: 'PRODUCTION',
    version: 'SYNTHETIC-DRIVER-1',
    text,
    privacyVersion: 'SYNTHETIC-PRIVACY-1',
    privacyText: 'AVISO SINTÉTICO.\n' + text,
    privacyHash: 'b'.repeat(64),
    publishedAt: '2026-10-19T00:00:00Z',
    specificConsents: [
      {
        id: 'synthetic-purpose',
        text: 'FINALIDAD SINTÉTICA SEPARADA. No es una autorización jurídica.',
        hash: 'c'.repeat(64),
      },
    ],
  }
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.origin !== origin) {
      report.unexpected.push('external')
      return route.abort()
    }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    if (req.method() !== 'GET') {
      report.mutations++
      return route.fulfill({
        status: 500,
        json: { code: 'UNEXPECTED_MUTATION' },
      })
    }
    const path = url.pathname.slice(7)
    let body,
      status = 200
    if (path === '/verification-requirements')
      body = {
        ...f.requirements,
        environment: 'PRODUCTION',
        policyVersion: 'DOCUMENTARY-1',
      }
    else if (path === '/verification-terms') {
      body = missing ? { code: 'VERIFICATION_PUBLICATION_REQUIRED' } : terms
      status = missing ? 409 : 200
    } else if (path === '/driver/onboarding')
      body = {
        ...f.onboarding,
        environment: 'PRODUCTION',
        driver: {
          ...f.onboarding.driver,
          status: 'ACTIVE',
          independentProfile: {
            ...f.onboarding.driver.independentProfile,
            status: 'APPROVED',
            vehicles: [
              {
                id: f.resource,
                identifier: 'MTO-SINTETICA',
                status: 'ACTIVE',
                type: 'MOTORCYCLE',
              },
            ],
          },
        },
        terms: missing
          ? {
              requiredVersion: null,
              acceptance: null,
              blockingReason: 'VERIFICATION_PUBLICATION_REQUIRED',
            }
          : {
              requiredVersion: terms.version,
              acceptance: accepted
                ? {
                    id: f.caseId,
                    version: terms.version,
                    acceptedAt: '2026-10-28T18:41:00Z',
                  }
                : null,
              blockingReason: null,
            },
      }
    else if (path === '/admin/verification-policy')
      body = {
        revision: 3,
        enabled: false,
        environment: 'LOCAL_TEST',
        driverTermsVersion: 'DRIVER-LOCAL-TEST-1',
        fleetTermsVersion: 'FLEET-LOCAL-TEST-1',
        productionDriverTermsVersion: terms.version,
        productionFleetTermsVersion: null,
      }
    else if (path === '/verification-cases/' + f.caseId)
      body = {
        ...f.caseFixture,
        subjectType: 'VEHICLE',
        data: {
          declaredOwnerName: 'Titular sintético',
          serialNumber: 'SYN123',
          ownershipEvidenceType: 'OWNED',
        },
        environment: 'PRODUCTION',
        policyVersion: 'DOCUMENTARY-1',
        status: caseStatus,
        submittedAt: caseStatus === 'SUBMITTED' ? '2026-10-30T12:00:00Z' : null,
      }
    else if (path.endsWith('/verification-acceptances'))
      body = {
        ...f.emptyPage,
        items: accepted
          ? [
              {
                id: f.caseId,
                version: terms.version,
                acceptedAt: '2026-10-28T18:41:00Z',
              },
            ]
          : [],
        total: accepted ? 1 : 0,
        totalPages: accepted ? 1 : 0,
      }
    else if (path.endsWith('/verification-notifications')) body = []
    else if (path.endsWith('/verification-cases'))
      body = {
        ...f.emptyPage,
        items: [
          {
            ...f.caseFixture,
            status: 'APPROVED',
            revision: 8,
            publicReason: 'Revisión sintética aprobada',
          },
        ],
        total: 1,
        totalPages: 1,
      }
    else {
      report.unexpected.push(path)
      return route.fulfill({ status: 404, json: {} })
    }
    return route.fulfill({ status, json: body })
  })
  const go = async (path, role = 'DRIVER') =>
    page.goto(
      origin +
        '/' +
        output +
        '/index.html?' +
        new URLSearchParams({ path, role }),
    )
  const shot = async (name) => {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 })
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        name + ' overflow ' + width,
      )
      const modal = page.getByRole('dialog'),
        modalOpen = (await modal.count()) > 0
      if (modalOpen) {
        await modal.getByRole('button', { name: 'Cerrar diálogo' }).focus()
        await modal.evaluate((e) => {
          e.scrollTop = 0
        })
      }
      const file = `${name}-${width}.png`
      await page.screenshot({
        path: output + '/' + file,
        fullPage: !modalOpen,
        animations: 'disabled',
      })
      report.screenshots.push({
        file,
        width,
        sha256: createHash('sha256')
          .update(await readFile(output + '/' + file))
          .digest('hex'),
      })
    }
    await page.setViewportSize({ width: 1280, height: 900 })
  }

  await go('/verification/cases/' + f.caseId)
  await expect(page.getByRole('heading', { name: /Unidad/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Guardar datos', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Presentar para revisión', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('radiogroup', { name: 'Categoría' }),
  ).toBeVisible()
  await shot('unit-draft')
  await page.getByRole('button', { name: /Conservación de imágenes/ }).click()
  await expect(page.getByText(/No se deducen fechas desde/)).toBeVisible()
  await page
    .getByLabel('Nombre del titular declarado')
    .fill('Otra persona sintética')
  await expect(
    page.getByRole('button', { name: 'Guardar datos', exact: true }),
  ).toBeEnabled()
  await page
    .getByLabel('Nombre del titular declarado')
    .fill('Titular sintético')
  await expect(
    page.getByRole('button', { name: 'Guardar datos', exact: true }),
  ).toBeDisabled()
  await page.locator('input[type=file]').setInputFiles({
    name: 'no-valido.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('synthetic'),
  })
  await expect(
    page.getByRole('button', { name: 'Cargar imagen', exact: true }),
  ).toBeDisabled()
  await shot('unit-invalid-file')
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'sintetica.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    })
  await expect(
    page.getByRole('button', { name: 'Cargar imagen', exact: true }),
  ).toBeEnabled()
  await shot('unit-selected')
  await page.getByRole('button', { name: 'Quitar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Cargar imagen', exact: true }),
  ).toBeDisabled()
  caseStatus = 'SUBMITTED'
  await go('/verification/cases/' + f.caseId)
  await expect(page.getByText(/Enviado para revisión el/)).toBeVisible()
  await expect(page.locator('input[type=file]')).toHaveCount(0)
  await shot('unit-submitted')
  report.checks.push(
    'draft-checklist-valid-change-invalid-file-retention-readonly-submitted',
  )
  assert.equal(report.mutations, 0)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.unexpected, [])
  report.status = 'PASS'
} catch (e) {
  report.status = 'FAIL'
  report.error = e.message
  process.exitCode = 1
  console.error(e.message)
} finally {
  await browser?.close()
  await server.close()
  await writeFile(
    output + '/report.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log('Report: ' + output + '/report.json')
}
