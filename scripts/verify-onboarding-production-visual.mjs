// Independent render/keyboard review with faithful synthetic HTTP fixtures.
// No backend, PostgreSQL, Docker, mail, storage or publication is started or contacted.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const output = 'test-results/onboarding-production-visual/' + Date.now(),
  origin = 'http://127.0.0.1:4238'
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
  server: { host: '127.0.0.1', port: 4238, strictPort: true },
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
  missing = false
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
        terms: missing
          ? {
              requiredVersion: null,
              acceptance: null,
              blockingReason: 'VERIFICATION_PUBLICATION_REQUIRED',
            }
          : {
              requiredVersion: terms.version,
              acceptance: null,
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
    else if (path === '/verification-cases/' + f.caseId) body = f.caseFixture
    else if (path.endsWith('/verification-notifications')) body = []
    else if (path.endsWith('/verification-cases')) body = f.emptyPage
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
  await go('/driver/onboarding')
  const region = page.getByRole('region', {
    name: 'Texto completo de los términos',
    exact: true,
  })
  await expect(region).toBeVisible()
  assert.equal((await region.innerText()).trim(), text.trim())
  await region.focus()
  await expect(region).toBeFocused()
  await page.keyboard.press('End')
  await expect
    .poll(() => region.evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0)
  assert.notEqual(
    await region.evaluate((e) => getComputedStyle(e).outlineStyle),
    'none',
  )
  await shot('policy-long-text-focus')
  const boxes = page.getByRole('checkbox')
  await expect(boxes).toHaveCount(3)
  for (const box of await boxes.all()) await expect(box).not.toBeChecked()
  await boxes.nth(0).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  await expect(boxes.nth(1)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('button', { name: 'Aceptar personalmente', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Tab')
  await expect(boxes.nth(2)).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Aceptar personalmente', exact: true }),
  ).toBeFocused()
  report.checks.push(
    'full-long-text-keyboard-scroll-visible-focus-separate-unchecked-consents',
  )
  await go('/admin/verification-publications', 'SUPER_ADMIN')
  await expect(
    page.getByRole('heading', { name: 'Nueva publicación inmutable' }),
  ).toBeVisible()
  await page.getByLabel('Ámbito de publicación').selectOption('FLEET')
  await page.getByLabel('Versión de términos').fill('SYNTHETIC-FLEET-1')
  await page
    .getByLabel('Texto completo de términos', { exact: true })
    .fill(text)
  await page.getByLabel('Versión de privacidad').fill('SYNTHETIC-PRIVACY-1')
  await page
    .getByLabel('Texto completo del aviso de privacidad', { exact: true })
    .fill('AVISO SINTÉTICO\n' + text)
  await page
    .getByLabel('Referencia no secreta de autorización')
    .fill('SYNTHETIC-ONLY-NOT-LEGAL-APPROVAL')
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('checkbox').check()
  const review = page.getByRole('button', {
    name: 'Revisar publicación',
    exact: true,
  })
  await review.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Representación de flotilla/)).toBeVisible()
  await shot('publication-preview')
  await dialog
    .getByRole('button', { name: 'Publicar versión autorizada' })
    .focus()
  await page.keyboard.press('Shift+Tab')
  assert(
    await dialog.evaluate((e) => e.contains(document.activeElement)),
    'dialog keyboard content focus',
  )
  await review.evaluate((e) => e.focus())
  await expect(review).not.toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(review).toBeFocused()
  report.checks.push(
    'super-admin-complete-preview-scope-modal-background-inert-and-escape-no-publication',
  )
  await go('/verification/cases/' + f.caseId)
  await expect(
    page.getByText(/Expediente histórico o sin procedencia/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar datos' })).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('button', { name: 'Retirar expediente', exact: true }),
  ).toBeVisible()
  await shot('historical-local-test')
  report.checks.push('authorized-local-test-history-visible-no-implicit-reuse')
  missing = true
  await go('/driver/onboarding')
  await expect(
    page.getByText(/No hay una publicación vigente/).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Preparar expediente de identidad independiente',
    }),
  ).toBeDisabled()
  await shot('missing-policy')
  report.checks.push('missing-publication-explained')
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
