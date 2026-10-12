import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = '.tmp/profile-design',
  out = resolve('test-results/profile-design')
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/profile-design/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {CustomerProfilePage} from '../../src/customer/ProfilePage';import {AuthContext} from '../../src/auth/context';import {FeedbackProvider} from '../../src/components/Feedback';import '../../src/index.css';const auth={user:{id:'synthetic',email:'laura@example.test',role:'CUSTOMER',emailVerifiedAt:null},loading:false};createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={auth as never}><FeedbackProvider><MemoryRouter><main className="customer-area"><CustomerProfilePage/></main></MemoryRouter></FeedbackProvider></AuthContext.Provider></QueryClientProvider>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4192, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4192'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let profile = {
    displayName: 'Laura Sintética',
    businessName: null,
    type: 'PERSONAL',
    revision: 1,
    active: true,
  }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== '127.0.0.1') return route.abort()
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    let body
    if (url.pathname.endsWith('/capabilities'))
      body = {
        type: profile.type,
        capacity: { activeCount: 1, maxActiveRequests: 1, occupied: true },
        canPrequote: false,
      }
    else if (url.pathname.endsWith('/contact-verification'))
      body = { status: 'ACCEPTED' }
    else {
      if (route.request().method() === 'PATCH')
        profile = { ...profile, ...route.request().postDataJSON(), revision: 2 }
      body = profile
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  await page.goto('http://127.0.0.1:4192/.tmp/profile-design/index.html')
  await page.getByRole('heading', { name: 'Laura Sintética' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 1000, 390]) {
    await page.setViewportSize({ width, height: 900 })
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: resolve(out, `width-${width}.png`),
      fullPage: true,
    })
  }
  await page.getByRole('radio', { name: 'Negocio' }).focus()
  await page.keyboard.press('Space')
  assert(await page.getByRole('button', { name: 'Cambiar tipo' }).isDisabled())
  await page.getByLabel('Nombre *', { exact: true }).fill('Laura Actualizada')
  await page.getByRole('button', { name: 'Guardar perfil' }).click()
  await page.getByRole('heading', { name: 'Laura Actualizada' }).waitFor()
  await page.getByRole('button', { name: 'Consultar perfil actual' }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page
    .getByRole('button', { name: 'Solicitar verificación de mi correo' })
    .click()
  assert(
    await page
      .getByRole('button', { name: 'Verificación solicitada' })
      .isDisabled(),
  )
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        widths: [1440, 1000, 390],
        keyboard: true,
        save: true,
        dirtyRefresh: true,
        capacityBlock: true,
        verification: true,
        backend: 'mocked synthetic API',
        errors,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS profile: responsive, keyboard, save, dirty refresh, capacity block, verification; synthetic APIs only',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/main.tsx`)
  await unlink(`${dir}/index.html`)
  await rmdir(dir)
}
