// Browser acceptance with synthetic HTTP. Starts only a private Vite server;
// never starts or contacts a backend, database, deployment or real account.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const output = 'test-results/onboarding-documentary/' + Date.now()
await mkdir(output, { recursive: true })
await writeFile(
  output + '/index.html',
  `<html lang="es"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/${output}/harness.tsx"></script></html>`,
)
await writeFile(
  output + '/harness.tsx',
  `
import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {AuthContext} from '/src/auth/context'
import {FeedbackProvider} from '/src/components/Feedback'
import {AdminLayout} from '/src/layouts/AdminLayout'
import {DriverOnboarding,CaseDetail,VerificationLayout} from '/src/verification/pages'
import {AccountRegistrationProgress} from '/src/verification/account-progress'
import {onboardingQuery} from '/src/verification/onboarding-query'
import {actor} from '/src/test/verification-fixtures'
import '/src/index.css'
import '/src/styles/redesign.css'
const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
window.refetchDocumentary = () => client.invalidateQueries({queryKey:onboardingQuery(actor,'DOCUMENTARY').queryKey})
const user={id:actor,role:'DRIVER',email:'synthetic@example.invalid',active:true,emailVerifiedAt:'2026-11-16T12:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
const path=new URLSearchParams(location.search).get('path')||'/driver/onboarding'
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[path]}><Routes><Route element={<AdminLayout/>}><Route path="/profile" element={<AccountRegistrationProgress/>}/><Route element={<VerificationLayout/>}><Route path="/driver/onboarding" element={<DriverOnboarding/>}/><Route path="/verification/cases/:id" element={<CaseDetail/>}/></Route></Route></Routes></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'error',
  cacheDir: output + '/vite-cache',
  define: { 'import.meta.env.VITE_API_URL': 'window.location.origin' },
  server: { host: '127.0.0.1', port: 0 },
})
const report = {
  kind: 'BROWSER_SYNTHETIC_HTTP',
  backendStarted: false,
  status: 'RUNNING',
  checks: [],
  errors: [],
  requests: [],
}
let browser
try {
  await server.listen()
  const address = server.httpServer.address()
  const origin = `http://127.0.0.1:${address.port}`
  const f = await server.ssrLoadModule('/src/test/verification-fixtures.ts')
  const { inactiveOnboarding, unitCaseId } = await server.ssrLoadModule(
    '/src/test/onboarding-view-fixtures.ts',
  )
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const width of [1440, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.on('pageerror', (error) => report.errors.push(error.message))
    let fixture = inactiveOnboarding()
    fixture.unit.data.serialNumber = ''
    const commands = []
    let releaseRead
    let holdRead = false
    await page.route('**/*', async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      if (url.origin !== origin) {
        report.errors.push('Blocked external request: ' + url.origin)
        return route.abort()
      }
      if (!url.pathname.startsWith('/api/v1/')) return route.continue()
      const path = url.pathname.slice(7)
      report.requests.push({
        width,
        path: path + url.search,
        method: req.method(),
      })
      let body
      if (path === '/driver/onboarding' && req.method() === 'GET') {
        assert.equal(url.searchParams.get('view'), 'DOCUMENTARY')
        if (holdRead)
          await new Promise((resolveRead) => {
            releaseRead = resolveRead
          })
        body = fixture.data
      } else if (path === '/verification-requirements')
        body = {
          ...f.requirements,
          vehicle: { ...f.requirements.vehicle, OWNED: null },
        }
      else if (path === '/verification-terms') body = f.terms
      else if (path === '/driver/verification-acceptances') body = f.emptyPage
      else if (path === '/driver/verification-notifications') body = []
      else if (path === '/driver/verification-cases')
        body = {
          ...f.emptyPage,
          items: [fixture.unit],
          total: 1,
          totalPages: 1,
        }
      else if (
        path === '/verification-cases/' + f.caseId ||
        path === '/verification-cases/' + unitCaseId
      ) {
        const record = path.endsWith(f.caseId) ? fixture.identity : fixture.unit
        if (req.method() === 'PATCH') {
          const update = req.postDataJSON()
          assert.equal(update.expectedVersion, record.revision)
          record.data = update.data
          record.revision++
          commands.push({ action: 'UPDATE_CASE', id: record.id })
          body = {
            id: record.id,
            status: record.status,
            revision: record.revision,
          }
        } else {
          assert.equal(req.method(), 'GET')
          body = record
        }
      } else if (
        path === '/driver/onboarding/submit' &&
        req.method() === 'POST'
      ) {
        assert.deepEqual(req.postDataJSON(), {
          identityCaseId: f.caseId,
          identityRevision: fixture.identity.revision,
          vehicleCaseId: unitCaseId,
          vehicleRevision: fixture.unit.revision,
        })
        fixture.identity.status = fixture.unit.status = 'SUBMITTED'
        fixture.identity.revision++
        fixture.unit.revision++
        commands.push({
          action: 'SUBMIT_ONBOARDING',
          ids: [f.caseId, unitCaseId],
        })
        body = {
          id: f.resource,
          status: 'SUBMITTED',
          caseIds: [f.caseId, unitCaseId],
        }
      } else {
        report.errors.push('Unexpected request: ' + req.method() + ' ' + path)
        return route.fulfill({
          status: 500,
          json: { message: 'Unexpected synthetic request' },
        })
      }
      return route.fulfill({ status: 200, json: body })
    })
    const go = (path = '/driver/onboarding') =>
      page.goto(
        origin + '/' + output + '/index.html?path=' + encodeURIComponent(path),
      )
    const capture = async (label) => {
      await page.evaluate(() => document.fonts.ready)
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'Horizontal overflow: ' + label + ' ' + width,
      )
      await page.screenshot({
        path: resolve(output, `${width}-${label}.png`),
        fullPage: true,
      })
      report.checks.push(`${width}px: ${label}`)
    }
    await go()
    await expect(page.getByLabel(/Número de serie/)).toBeVisible()
    await capture('inactive-draft')
    await page.getByLabel(/Número de serie/).fill('SAVED-SYNTHETIC')
    await page
      .getByRole('button', { name: 'Guardar y continuar con las fotos' })
      .click()
    await expect(page.getByRole('heading', { name: 'Tus fotos' })).toBeVisible()
    assert.deepEqual(commands, [
      { action: 'UPDATE_CASE', id: f.caseId },
      { action: 'UPDATE_CASE', id: unitCaseId },
    ])
    await go('/profile')
    await expect(
      page.getByText('Borrador guardado · aún no enviado'),
    ).toHaveCount(2)
    await capture('account-saved')
    await page.getByRole('link', { name: 'Continuar mi registro' }).click()
    await expect(page.getByRole('heading', { name: 'Tus fotos' })).toBeVisible()
    assert.equal(commands.length, 2, 'Reentry must not create a resource')
    fixture.identity.attachments = f.requirements.identity.required.map(
      (category, i) => ({
        id: `${f.attachmentId}-${i}`,
        category,
        status: 'VALIDATED',
        mime: 'image/png',
        bytes: 100,
        hash: null,
        createdAt: f.caseFixture.createdAt,
      }),
    )
    fixture.identity.revision++
    await go()
    const submit = page.getByRole('button', { name: 'Enviar mi solicitud' })
    await expect(submit).toBeEnabled()
    holdRead = true
    const refetch = page.evaluate(() => window.refetchDocumentary())
    await expect(submit).toBeDisabled()
    await expect.poll(() => typeof releaseRead).toBe('function')
    holdRead = false
    releaseRead()
    await refetch
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(
      page.getByRole('heading', { name: 'Tu solicitud está en revisión' }),
    ).toBeVisible()
    assert.equal(commands.length, 3)
    await capture('submitted-review')
    for (const status of ['REJECTED', 'WITHDRAWN', 'APPROVED']) {
      fixture = inactiveOnboarding()
      fixture.identity.status = 'APPROVED'
      fixture.unit.status = status
      fixture.unit.publicReason = 'Observación sintética conservada'
      await go()
      await page
        .getByRole('link', { name: 'Ver resultado y correcciones' })
        .click()
      await page.getByRole('link', { name: 'Revisión 3' }).click()
      await expect(
        page.getByText('Motivo de decisión: Observación sintética conservada'),
      ).toBeVisible()
      await capture('history-' + status.toLowerCase())
      assert.equal(commands.length, 3, 'History must not mutate or reconnect')
    }
    await page.close()
  }
  assert.deepEqual(report.errors, [])
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.failure = String(error.stack || error)
  throw error
} finally {
  await browser?.close()
  await server.close()
  await writeFile(
    output + '/report.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks.length,
      output,
    }),
  )
}
