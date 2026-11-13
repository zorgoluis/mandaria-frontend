// Actual browser UI with synthetic HTTP only; no backend, accounts or remote uploads.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const output = 'test-results/mobile-evidence/' + Date.now()
const origin = 'http://127.0.0.1:4291'
await mkdir(output, { recursive: true })
await writeFile(
  output + '/index.html',
  `<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/${output}/harness.tsx"></script></html>`,
)
await writeFile(
  output + '/harness.tsx',
  `import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {QueryClientProvider,focusManager} from '@tanstack/react-query'
import {queryClient} from '/src/services/query'
import {CaseDetail,VerificationLayout} from '/src/verification/pages'
import {AuthContext} from '/src/auth/context'
import {FeedbackProvider} from '/src/components/Feedback'
import {actor,caseId} from '/src/test/verification-fixtures'
import '/src/index.css'
window.testFocus = value => focusManager.setFocused(value)
const user={id:actor,role:'DRIVER',email:'synthetic@example.invalid',active:true,emailVerifiedAt:'2026-11-07T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={['/verification/cases/'+caseId]}><Routes><Route element={<VerificationLayout/>}><Route path="/verification/cases/:id" element={<CaseDetail/>}/></Route></Routes></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  logLevel: 'silent',
  cacheDir: output + '/vite-cache',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4291, strictPort: true },
})
const report = {
  kind: 'MOBILE_BROWSER_SYNTHETIC_HTTP',
  physicalCamera: false,
  status: 'RUNNING',
  checks: [],
  errors: [],
}
let browser
try {
  await server.listen()
  const f = await server.ssrLoadModule('/src/test/verification-fixtures.ts')
  for (const [engine, launcher, options] of [
    ['chromium', chromium, { channel: 'chrome' }],
    ['webkit', webkit, {}],
  ]) {
    browser = await launcher.launch({ ...options, headless: true })
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    page.on('pageerror', (e) => report.errors.push(e.message))
    let holdRequirements = false
    let releaseRequirements
    let attemptState = 'ABSENT'
    let dropComplete = false
    let commands = 0
    let transfers = 0
    let termsReads = 0
    const record = {
      ...structuredClone(f.caseFixture),
      environment: 'PRODUCTION',
      policyVersion: 'DOCUMENTARY-1',
      attachments: Array.from({ length: 10 }, (_, i) => ({
        id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'),
        category: 'FACE_PHOTO',
        status: 'CREATED',
        bytes: null,
        mime: null,
        hash: null,
        createdAt: f.caseFixture.createdAt,
      })),
    }
    await page.route('**/*', async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      assert.equal(url.origin, origin, 'Only local requests are allowed')
      if (url.pathname === '/synthetic-put') {
        transfers++
        return route.fulfill({ status: 200, body: '' })
      }
      if (!url.pathname.startsWith('/api/v1/')) return route.continue()
      const path = url.pathname.slice(7)
      let body
      if (path === '/verification-requirements') {
        if (holdRequirements)
          await new Promise((resolve) => {
            releaseRequirements = resolve
          })
        body = {
          ...f.requirements,
          environment: 'PRODUCTION',
          policyVersion: 'DOCUMENTARY-1',
          fileLimitMode: 'VALIDATED',
        }
      } else if (path === '/verification-terms') {
        termsReads++
        body = { ...f.terms, environment: 'PRODUCTION' }
      } else if (
        path === '/verification-cases/' + f.caseId &&
        req.method() === 'GET'
      ) {
        body = record
      } else if (path.startsWith('/verification-command-attempts/')) {
        assert.equal(req.method(), 'GET', 'No automatic closing or retry')
        body = {
          state: attemptState,
          ...(attemptState === 'APPLIED'
            ? {
                result: {
                  id: f.attachmentId,
                  status: 'VALIDATED',
                  revision: record.revision,
                },
              }
            : {}),
        }
      } else if (
        path === `/verification-cases/${f.caseId}/uploads` &&
        req.method() === 'POST'
      ) {
        commands++
        record.revision++
        record.attachments.push({
          id: f.attachmentId,
          category: 'FACE_PHOTO',
          status: 'CREATED',
          bytes: null,
          mime: null,
          hash: null,
          createdAt: record.createdAt,
        })
        body = {
          id: f.attachmentId,
          status: 'CREATED',
          revision: record.revision,
          uploadUrl: origin + '/synthetic-put',
          expiresAt: '2099-01-01T00:00:00Z',
        }
      } else if (
        path ===
          `/verification-cases/${f.caseId}/uploads/${f.attachmentId}/complete` &&
        req.method() === 'POST'
      ) {
        commands++
        record.revision++
        record.attachments.find((a) => a.id === f.attachmentId).status =
          'VALIDATED'
        if (dropComplete) return route.abort('failed')
        body = {
          id: f.attachmentId,
          status: 'VALIDATED',
          revision: record.revision,
        }
      } else
        throw new Error(
          'Unexpected synthetic request: ' + req.method() + ' ' + path,
        )
      return route.fulfill({ json: body })
    })
    await page.goto(origin + '/' + output + '/index.html')
    const upload = page.getByRole('button', {
      name: 'Cargar imagen',
      exact: true,
    })
    await expect(upload).toBeDisabled()
    const file = {
      name: 'foto-sintetica.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/bXcAAAAASUVORK5CYII=',
        'base64',
      ),
    }
    const input = page.locator('input[type=file]')
    const preview = page.getByAltText('Vista previa de la imagen seleccionada')
    await input.setInputFiles(file)
    await expect(preview).toBeVisible()
    await expect(upload).toBeEnabled()
    report.checks.push(
      engine +
        ': ten failed attempts do not block a new selection with preview',
    )

    holdRequirements = true
    await page.evaluate(() => {
      window.testFocus(false)
      window.testFocus(true)
    })
    await expect(upload).toBeDisabled()
    await expect(preview).toBeVisible()
    await expect.poll(() => !!releaseRequirements).toBe(true)
    holdRequirements = false
    releaseRequirements()
    await expect(upload).toBeEnabled()
    assert(termsReads >= 2)
    assert.equal(await input.evaluate((e) => e.files[0].name), file.name)
    assert.equal(commands, 0)
    report.checks.push(
      engine +
        ': return from picker/refetch preserves selection and re-enables',
    )

    const marker = {
      actor: f.actor,
      key: '66666666-6666-4666-8666-666666666666',
      operation: 'CREATE_UPLOAD',
      target: f.caseId,
    }
    await page.evaluate(
      ({ marker, origin }) => {
        localStorage.setItem(
          'mandaria.verification.pending:' + origin,
          JSON.stringify([marker]),
        )
        window.dispatchEvent(new Event('verification-pending-change'))
      },
      { marker, origin },
    )
    await expect(upload).toBeDisabled()
    await expect(preview).toBeVisible()
    const recover = page.getByRole('button', {
      name: 'Consultar intento',
      exact: true,
    })
    await expect(recover).toBeVisible()
    await page
      .getByRole('link', {
        name: 'revisa el aviso de recuperación al inicio de esta página',
      })
      .tap()
    await expect(recover).toBeInViewport()
    await page.screenshot({
      path: output + '/' + engine + '-pending.png',
      fullPage: true,
    })
    await recover.tap()
    await expect(page.getByText(/ABSENT no demuestra fracaso/)).toBeVisible()
    await expect(upload).toBeDisabled()
    assert.equal(commands, 0)
    attemptState = 'CLOSED_NO_EFFECTS'
    await recover.tap()
    await expect(upload).toBeEnabled()
    assert.equal(await input.evaluate((e) => e.files[0].name), file.name)
    report.checks.push(
      engine +
        ': visible recovery; ABSENT stays blocked; confirmed closure preserves selection',
    )

    dropComplete = true
    await upload.tap()
    await expect(recover).toBeVisible()
    await expect(page.getByRole('alert')).toBeVisible()
    assert.equal(commands, 2)
    assert.equal(transfers, 1)
    await expect(upload).toBeDisabled()
    attemptState = 'APPLIED'
    await recover.tap()
    await expect(upload).toBeEnabled()
    await expect(
      page.getByText(
        /Comprobante histórico recuperado; estado vigente consultado/,
      ),
    ).toBeVisible()
    assert.equal(commands, 2, 'Recovery must not repeat upload commands')
    assert.equal(transfers, 1)
    await page.screenshot({
      path: output + '/' + engine + '-recovered.png',
      fullPage: true,
    })
    report.checks.push(
      engine + ': lost completion recovered without repeating upload',
    )
    await browser.close()
    browser = undefined
  }
  assert.deepEqual(report.errors, [])
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.failure = String(error)
  throw error
} finally {
  await browser?.close()
  await server.close()
  await writeFile(
    output + '/report.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(JSON.stringify({ output, ...report }, null, 2))
}
