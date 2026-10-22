// Synthetic browser evidence. envDir:false; every API call intercepted; external hosts blocked.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = 'test-results/deletion-web'
await mkdir(output, { recursive: true })
await writeFile(
  `${output}/index.html`,
  '<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test-results/deletion-web/harness.tsx"></script></html>',
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
const q=new URLSearchParams(location.search)
const user={id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.test',role:q.get('role')||'DRIVER',active:true,emailVerifiedAt:'2026-10-16T00:00:00Z',createdAt:'',updatedAt:''}
const auth={user,loading:false,expired:false,error:null,login:async()=>{},logout:async()=>{},restore:async()=>{}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><FeedbackProvider><MemoryRouter initialEntries={[q.get('path')||'/privacy/deletion/new']}><App/></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4197'),
  },
  server: { host: '127.0.0.1', port: 4197, strictPort: true },
})
let browser
const checks = [],
  unexpected = [],
  errors = [],
  calls = []
try {
  await server.listen()
  const { deletionFixture, partialFixture } = await server.ssrLoadModule(
    '/src/test/deletion-fixtures.ts',
  )
  const { onboarding } = await server.ssrLoadModule(
    '/src/test/verification-fixtures.ts',
  )
  let current = structuredClone(deletionFixture),
    lost = false
  browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.hostname !== '127.0.0.1') {
      unexpected.push('external')
      return route.abort()
    }
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    const path = url.pathname.slice(7),
      method = req.method()
    calls.push({ path, method })
    let body,
      status = 200
    if (path === '/driver/onboarding') body = onboarding
    else if (path === '/privacy/deletion-requests' && method === 'POST') {
      if (lost) return route.abort('failed')
      body = current
      status = 202
    } else if (path.includes('/by-key/')) {
      if (lost) {
        body = { code: 'REQUEST_NOT_FOUND' }
        status = 404
      } else body = current
    } else if (path.endsWith('/receipt')) body = partialFixture
    else if (path === '/admin/privacy/deletion-requests') body = [current]
    else if (path.endsWith('/work-items'))
      body = [
        {
          id: current.id,
          attachmentId: null,
          caseId: null,
          classification: 'DELETE',
          status: 'MANUAL_REQUIRED',
          attempts: 8,
          retryAt: null,
          errorCode: 'WRITER_QUIESCENCE_NOT_VERIFIED',
        },
      ]
    else if (path.endsWith('/tasks'))
      body = [
        {
          id: current.id,
          kind: 'ACTIVE_SERVICE:private-third-party',
          status: 'OPEN',
          dueAt: current.deadline,
        },
      ]
    else if (path.endsWith('/replacements')) body = []
    else if (path === '/privacy/deletion-access/status') body = partialFixture
    else if (path === '/privacy/deletion-requests/' + current.id) body = current
    else {
      unexpected.push(method + ' ' + path)
      status = 404
      body = {}
    }
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  const go = async (path, role = 'DRIVER') =>
    page.goto(
      'http://127.0.0.1:4197/' +
        output +
        '/index.html?' +
        new URLSearchParams({ path, role }),
    )
  const shot = async (name) => {
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'horizontal overflow ' + name,
    )
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
    checks.push(name)
  }
  await go('/privacy/deletion/new')
  await expect(
    page.getByRole('option', {
      name: 'Dar de baja mi actividad independiente',
    }),
  ).toBeAttached()
  await page
    .getByRole('button', { name: 'Revisar y confirmar alcance' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  assert.ok(
    await page.evaluate(() => !!document.activeElement?.closest('dialog')),
  )
  await page.getByLabel('Contraseña actual').fill('synthetic-password')
  await page.getByRole('checkbox').check()
  await shot('desktop-confirmation')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Revisar y confirmar alcance' }),
  ).toBeFocused()
  checks.push('keyboard-dialog-focus-restored')
  await page.setViewportSize({ width: 320, height: 740 })
  await page
    .getByRole('button', { name: 'Revisar y confirmar alcance' })
    .click()
  await page.getByLabel('Contraseña actual').fill('synthetic-password')
  await page.getByRole('checkbox').check()
  await shot('mobile-320-confirmation')
  await page
    .getByRole('button', { name: 'Confirmar solicitud', exact: true })
    .click()
  await expect(page.getByText(/Solicitud registrada/)).toBeVisible()
  await shot('mobile-320-pending-drain')
  current = { ...current, ...partialFixture }
  await go('/privacy/deletion/' + current.id)
  await page
    .getByRole('button', { name: 'Consultar constancia del backend' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Constancia de alcance limitado' }),
  ).toBeVisible()
  await shot('mobile-320-partial-receipt')
  await page.setViewportSize({ width: 768, height: 1024 })
  await shot('tablet-partial-receipt')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await go('/admin/privacy/deletion/' + current.id, 'SUPER_ADMIN')
  await expect(page.getByText(/Intentos: 8\/8/)).toBeVisible()
  await expect(page.getByRole('option', { name: /Reanudar/ })).toHaveCount(0)
  assert.ok(
    !(await page.locator('body').innerText()).includes('private-third-party'),
  )
  await shot('desktop-admin-exhausted')
  await go('/privacy/deletion-access')
  await page
    .getByLabel('Código privado de seguimiento')
    .fill('synthetic-private-token')
  await page
    .getByRole('button', { name: 'Consultar con código privado' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Constancia de alcance limitado' }),
  ).toBeVisible()
  await expect(page.getByLabel('Código privado de seguimiento')).toHaveValue('')
  await shot('desktop-private-receipt')
  await page.evaluate(() => localStorage.clear())
  lost = true
  await go('/privacy/deletion/new')
  await page
    .getByRole('button', { name: 'Revisar y confirmar alcance' })
    .click()
  await page.getByLabel('Contraseña actual').fill('synthetic-password')
  await page.getByRole('checkbox').check()
  await page
    .getByRole('button', { name: 'Confirmar solicitud', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('No se pudo confirmar')
  await page.getByRole('button', { name: 'Cerrar diálogo' }).click()
  await page
    .getByRole('button', { name: 'Recuperar solicitud por clave' })
    .click()
  await expect(page.getByRole('alert')).toContainText('no demuestra')
  assert.equal(
    calls.filter(
      (c) => c.method === 'POST' && c.path === '/privacy/deletion-requests',
    ).length,
    2,
  )
  await shot('desktop-unknown-recovery-404')
  lost = false
  await page
    .getByRole('button', { name: 'Recuperar solicitud por clave' })
    .click()
  await expect(page.getByText(/Respuesta histórica recibida/)).toBeVisible()
  assert.equal(
    calls.filter(
      (c) => c.method === 'POST' && c.path === '/privacy/deletion-requests',
    ).length,
    2,
  )
  checks.push('recovery-without-duplicate-create')
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        synthetic: true,
        backendConnected: false,
        checks,
        calls,
        unexpected,
        errors,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ checks, unexpected, errors }))
} finally {
  await browser?.close()
  await server.close()
}
