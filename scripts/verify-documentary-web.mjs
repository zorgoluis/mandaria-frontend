// Synthetic browser validation only: no backend, mail, storage service or real documents.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = 'test-results/documentary-web'
await mkdir(output, { recursive: true })
await writeFile(
  `${output}/index.html`,
  '<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test-results/documentary-web/harness.tsx"></script></html>',
)
await writeFile(
  `${output}/harness.tsx`,
  `
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../src/services/query'
import { App } from '../../src/app/App'
import { AuthContext } from '../../src/auth/context'
import { FeedbackProvider } from '../../src/components/Feedback'
import '../../src/index.css'
const q = new URLSearchParams(location.search)
const user = { id: '11111111-1111-4111-8111-111111111111', role: q.get('role') || 'DRIVER', name:'Persona sintética', email:'synthetic@example.test', active:true, createdAt:'', updatedAt:'' }
const auth = { user, loading:false, expired:false, error:null, login:async()=>{}, logout:async()=>{}, restore:async()=>{} }
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[q.get('path') || '/driver/onboarding']}><App /></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4198'),
  },
  server: { host: '127.0.0.1', port: 4198, strictPort: true },
})
let browser
const checks = [],
  errors = [],
  unexpected = []
try {
  await server.listen()
  const f = await server.ssrLoadModule('/src/test/verification-fixtures.ts')
  browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  page.on('pageerror', () => errors.push('browser render error'))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console error')
  })
  let record = structuredClone(f.caseFixture)
  const provider = {
    id: f.providerId,
    name: 'Flotilla sintética',
    type: 'FLEET',
    status: 'ACTIVE',
    maxDrivers: 10,
    maxVehicles: 10,
  }
  const wrap = (items) => ({
    items,
    page: 1,
    pageSize: 20,
    total: items.length,
    totalPages: items.length ? 1 : 0,
  })
  const calls = []
  let image
  await page.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.hostname !== '127.0.0.1') {
      unexpected.push('external request blocked')
      return route.abort()
    }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    const path = url.pathname.slice(7),
      method = request.method()
    calls.push({ path, method })
    let body
    if (path === '/verification-requirements') body = f.requirements
    else if (path === '/verification-terms')
      body = { ...f.terms, scope: url.searchParams.get('scope') }
    else if (path === '/driver/onboarding') body = f.onboarding
    else if (path === '/verification-cases/' + f.caseId) body = record
    else if (path.endsWith('/verification-notifications')) body = []
    else if (path.endsWith('/verification-cases')) body = wrap([record])
    else if (path === '/provider/profiles' || path === '/admin/providers')
      body = wrap([provider])
    else if (
      path === '/provider/profile' ||
      path === '/admin/providers/' + f.providerId
    )
      body = provider
    else if (path.endsWith('/drivers'))
      body = wrap([{ id: f.resource, name: 'Conductor sintético' }])
    else if (path.endsWith('/access'))
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: image,
      })
    else if (path === '/verification-terms/accept')
      body = { id: f.caseId, status: 'ACCEPTED', version: f.terms.version }
    else {
      unexpected.push(method + ' ' + path)
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{}',
      })
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  const go = async (path, role = 'DRIVER') => {
    await page.goto(
      'http://127.0.0.1:4198/' +
        output +
        '/index.html?' +
        new URLSearchParams({ path, role }),
    )
  }
  const shot = async (name) => {
    await expect(page.locator('h1').first()).toBeVisible()
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'horizontal overflow ' + name,
    )
    await page.screenshot({
      path: output + '/' + name + '.png',
      fullPage: true,
      animations: 'disabled',
    })
    checks.push(name)
  }
  await go('/driver/register')
  await expect(page.getByLabel('Correo electrónico *')).toBeVisible()
  await shot('registration-desktop')
  await go('/driver/onboarding')
  const checkbox = page.getByRole('checkbox')
  await expect(checkbox).not.toBeChecked()
  await page
    .getByRole('region', { name: 'Texto completo de los términos' })
    .focus()
  await page.keyboard.press('Tab')
  await expect(checkbox).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Aceptar personalmente (prueba)' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Comprobante de prueba recibido.')).toBeVisible()
  checks.push('terms-keyboard-explicit-only')
  await page
    .getByText('Registrar unidad independiente', { exact: true })
    .click()
  await shot('onboarding-desktop')
  await page.setViewportSize({ width: 390, height: 844 })
  await shot('onboarding-mobile')
  await go('/verification/cases/' + f.caseId)
  await page.getByRole('button', { name: 'Guardar datos' }).waitFor()
  await shot('identity-mobile')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await go('/provider/verification', 'PROVIDER_ADMIN')
  await expect(
    page.getByText('Flotilla sintética', { exact: true }).first(),
  ).toBeAttached()
  await expect(
    page.getByRole('button', { name: 'Crear borrador de flotilla' }),
  ).toBeVisible()
  await shot('fleet-desktop')
  image = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 600
      c.height = 240
      const x = c.getContext('2d')
      x.fillStyle = '#e7f2ef'
      x.fillRect(0, 0, 600, 240)
      x.fillStyle = '#156b5c'
      x.font = '24px sans-serif'
      x.fillText('EVIDENCIA SINTÉTICA — NO DOCUMENTO', 30, 120)
      return c.toDataURL('image/png').split(',')[1]
    }),
    'base64',
  )
  record = {
    ...record,
    status: 'SUBMITTED',
    verificationStatus: 'UNDER_REVIEW',
    attachments: [
      {
        id: f.attachmentId,
        category: 'FACE_PHOTO',
        status: 'VALIDATED',
        bytes: image.length,
        mime: 'image/png',
        hash: 'synthetic',
        createdAt: f.terms.createdAt,
      },
    ],
  }
  await go('/verification/cases/' + f.caseId, 'SUPER_ADMIN')
  await page.getByRole('button', { name: 'Ver evidencia' }).click()
  await expect(
    page.getByAltText('Evidencia sintética privada del expediente'),
  ).toBeVisible()
  assert(
    await page
      .getByRole('checkbox')
      .evaluateAll((xs) => xs.every((x) => !x.checked)),
  )
  await shot('review-desktop')
  await page.setViewportSize({ width: 390, height: 844 })
  await shot('review-mobile')
  await page.getByRole('button', { name: 'Cerrar evidencia' }).focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByAltText('Evidencia sintética privada del expediente'),
  ).toHaveCount(0)
  checks.push('evidence-keyboard-close')
  assert(
    !calls.some((x) => /execution|custody|tracking/.test(x.path)),
    'QA API requested',
  )
  assert.equal(errors.length, 0)
  assert.deepEqual(unexpected, [])
  await writeFile(
    output + '/report.json',
    JSON.stringify(
      { kind: 'synthetic browser only', checks, errors, unexpected },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      checks: checks.length,
      errors: errors.length,
      evidence: output,
    }),
  )
} finally {
  await browser?.close()
  await server.close()
}
