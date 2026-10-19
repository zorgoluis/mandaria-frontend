// Synthetic HTTP rendering only. No backend, publication or external transport.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const output = 'test-results/documentary-availability-visual/' + Date.now()
const origin = 'http://127.0.0.1:4239'
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
const user={id:'11111111-1111-4111-8111-111111111111',role:'DRIVER',email:'synthetic@example.invalid',active:true,emailVerifiedAt:'2026-10-19T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={['/driver/onboarding']}><App/></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'silent',
  cacheDir: output + '/vite-cache',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4239, strictPort: true },
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
  scenario = 'production'
const persist = () =>
  writeFile(output + '/report.json', JSON.stringify(report, null, 2) + '\n')
try {
  await server.listen()
  const f = await server.ssrLoadModule('/src/test/verification-fixtures.ts')
  const { availabilityText } = await server.ssrLoadModule(
    '/src/verification/availability.ts',
  )
  const text =
    'TEXTO SINTÉTICO SIN VALIDEZ LEGAL. Contenido íntegro recibido del servidor para comprobar lectura y foco.\n\n'.repeat(
      100,
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
        text: 'FINALIDAD SINTÉTICA SEPARADA.',
        hash: 'c'.repeat(64),
      },
    ],
  }
  browser = await chromium.launch({ timeout: 15000 })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', () => report.errors.push('render-error'))
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
    if (path === '/verification-requirements') {
      if (scenario === 'network') return route.abort('connectionrefused')
      if (scenario === 'disabled' || scenario === 'forbidden') {
        status = scenario === 'disabled' ? 503 : 403
        body = {
          code:
            scenario === 'disabled'
              ? 'VERIFICATION_LOCAL_DISABLED'
              : 'FORBIDDEN',
          message: 'internal configuration must not be displayed',
        }
      } else
        body = {
          ...f.requirements,
          environment: scenario === 'local' ? 'LOCAL_TEST' : 'PRODUCTION',
          policyVersion:
            scenario === 'local' ? 'LOCAL-TEST-1' : 'DOCUMENTARY-1',
          productionReady: false,
        }
    } else if (path === '/verification-terms') {
      status = scenario === 'missing' ? 503 : 200
      body =
        scenario === 'missing'
          ? { code: 'VERIFICATION_PUBLICATION_REQUIRED' }
          : scenario === 'local'
            ? f.terms
            : terms
    } else if (path === '/driver/onboarding')
      body = {
        ...f.onboarding,
        environment: scenario === 'local' ? 'LOCAL_TEST' : 'PRODUCTION',
        terms:
          scenario === 'missing'
            ? {
                requiredVersion: null,
                acceptance: null,
                blockingReason: 'VERIFICATION_PUBLICATION_REQUIRED',
              }
            : {
                requiredVersion:
                  scenario === 'local' ? f.terms.version : terms.version,
                acceptance: null,
                blockingReason: null,
              },
      }
    else if (path.endsWith('/verification-notifications')) body = []
    else if (path.endsWith('/verification-cases')) body = f.emptyPage
    else {
      report.unexpected.push(path)
      return route.fulfill({ status: 404, json: {} })
    }
    return route.fulfill({ status, json: body })
  })
  for (const current of [
    'local',
    'disabled',
    'missing',
    'production',
    'forbidden',
    'network',
  ]) {
    scenario = current
    await page.goto(origin + '/' + output + '/index.html?scenario=' + current)
    const notice = page.getByLabel('Aviso de verificación documental')
    if (current === 'local')
      await expect(notice).toContainText(availabilityText.local)
    else {
      const expected = {
        disabled: availabilityText.disabled,
        missing: availabilityText.missing,
        forbidden: 'No tienes permiso para esta consulta.',
        network:
          'No se pudo conectar para consultar los requisitos. Vuelve a intentarlo.',
      }[current]
      if (expected)
        await expect(
          page.getByText(expected, { exact: true }).first(),
        ).toBeVisible()
      else
        await expect(
          page.getByRole('region', {
            name: 'Texto completo de los términos',
            exact: true,
          }),
        ).toBeVisible()
      await expect(notice).not.toContainText(availabilityText.local)
    }
    await expect(
      page
        .locator('#main-content')
        .getByRole('link', { name: 'Mi servicio', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Expedientes e historial' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Preparar expediente de identidad independiente',
      }),
    ).toBeDisabled()
    assert(
      !(await page.locator('body').innerText()).includes(
        'internal configuration',
      ),
    )
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 })
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        current + ' overflow ' + width,
      )
      if (current === 'production') {
        const region = page.getByRole('region', {
          name: 'Texto completo de los términos',
          exact: true,
        })
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
      }
      const file = `${current}-${width}.png`
      await page.screenshot({
        path: output + '/' + file,
        fullPage: true,
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
    if (current === 'production') {
      const boxes = page.getByRole('checkbox')
      await expect(boxes).toHaveCount(3)
      for (const box of await boxes.all()) await expect(box).not.toBeChecked()
      await boxes.nth(0).focus()
      await page.keyboard.press('Space')
      await page.keyboard.press('Tab')
      await expect(boxes.nth(1)).toBeFocused()
      await page.keyboard.press('Space')
      const accept = page.getByRole('button', {
        name: 'Aceptar personalmente',
        exact: true,
      })
      await expect(accept).toBeDisabled()
      await page.keyboard.press('Tab')
      await expect(boxes.nth(2)).toBeFocused()
      await page.keyboard.press('Space')
      await page.keyboard.press('Tab')
      await expect(accept).toBeFocused()
      await expect(accept).toBeEnabled()
      // Deliberately no Enter/click: no acceptance or publication is performed.
      report.checks.push(
        'full-long-text-keyboard-scroll-visible-focus-separate-consents-no-mutation',
      )
    } else if (
      ['disabled', 'missing', 'forbidden', 'network'].includes(current)
    ) {
      const retry = page.getByRole('button', {
        name:
          current === 'missing'
            ? 'Consultar términos'
            : 'Consultar disponibilidad',
        exact: true,
      })
      await retry.focus()
      await expect(retry).toBeFocused()
      assert.notEqual(
        await retry.evaluate((e) => getComputedStyle(e).outlineStyle),
        'none',
      )
    }
    report.checks.push(
      current + '-desktop-320-no-overflow-correct-notice-and-prerequisites',
    )
    await persist()
    await page.setViewportSize({ width: 1280, height: 900 })
  }
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
  await persist()
  console.log('Report: ' + output + '/report.json')
}
