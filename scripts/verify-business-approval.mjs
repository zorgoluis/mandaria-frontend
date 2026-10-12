import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const dir = '.tmp/business-approval',
  out = resolve('test-results/business-approval')
await mkdir(dir, { recursive: true })
await mkdir(out, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/.tmp/business-approval/main.tsx"></script></body></html>',
)
await writeFile(
  `${dir}/main.tsx`,
  `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {QueryClientProvider} from '@tanstack/react-query';import {queryClient} from '../../src/services/query';import {App} from '../../src/app/App';import {AuthContext} from '../../src/auth/context';import type {User} from '../../src/types/api';import {FeedbackProvider} from '../../src/components/Feedback';import '../../src/index.css';const params=new URLSearchParams(location.search);const example:User={id:'synthetic-actor',email:'synthetic@example.test',role:params.get('role')==='admin'?'SUPER_ADMIN':'CUSTOMER',emailVerifiedAt:'2026-10-12T12:00:00Z',active:true,createdAt:'2026-10-12T12:00:00Z',updatedAt:'2026-10-12T12:00:00Z'};function Harness(){const [user,setUser]=useState<User|null>(params.get('role')==='anonymous'?null:example);return <AuthContext.Provider value={{user,loading:false,expired:false,error:null,login:async()=>{setUser(example)},logout:async()=>{setUser(null)},restore:async()=>{}}}><App/></AuthContext.Provider>}createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><FeedbackProvider><MemoryRouter initialEntries={[params.get('path')??'/customer/business']}><Harness/></MemoryRouter></FeedbackProvider></QueryClientProvider>);`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4196, strictPort: true },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4196'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(''),
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const account = '11111111-1111-4111-8111-111111111111',
    id = '22222222-2222-4222-8222-222222222222',
    at = '2026-10-12T12:00:00Z'
  const access = {
    state: 'NONE',
    source: null,
    restrictionReason: null,
    canApply: true,
    canDowngrade: false,
    reapplicationBlocked: false,
  }
  let projection = {
    customerAccountId: account,
    businessAccess: access,
    businessApplication: null,
  }
  const app = {
    id,
    status: 'PENDING',
    revision: 1,
    submittedAt: at,
    resolvedAt: null,
    snapshot: {
      businessName: 'Panadería de prueba',
      activity: 'Venta de alimentos',
      city: 'Ciudad sintética',
      estimatedDeliveryVolume: '12 por semana',
      note: null,
    },
    publicReason: null,
  }
  let adminAccess = {
    customerAccount: {
      id: account,
      type: 'PERSONAL',
      revision: 1,
      active: true,
      verifiedEmail: 'synthetic@example.test',
      businessAccess: access,
      activeRequestCount: 0,
    },
    businessAccessAdministration: {
      activeGrant: null,
      lastAdministrativeRevocation: null,
      canRevoke: false,
      canAllowReapplication: false,
    },
  }
  const calls = []
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.hostname !== '127.0.0.1') return route.abort()
    if (!u.pathname.startsWith('/api/v1/')) return route.continue()
    const p = u.pathname.slice('/api/v1'.length)
    let body,
      status = 200
    calls.push({ path: p, method: route.request().method() })
    if (p === '/customer/profile')
      body = {
        ...projection,
        type: 'PERSONAL',
        displayName: 'Cliente sintético',
        businessName: null,
        revision: 1,
        active: true,
      }
    else if (p === '/customer/capabilities')
      body = {
        ...projection,
        type: 'PERSONAL',
        allowedShippingPayers: ['REQUESTER'],
        defaultShippingPayer: 'REQUESTER',
        capacity: {
          occupied: false,
          activeCount: 0,
          maxActiveRequests: 1,
          activeRequestPublicId: null,
        },
        canCreateRequest: true,
        canPrequote: true,
        reason: null,
      }
    else if (p === `/admin/customer-business-access/${account}`)
      body = adminAccess
    else if (p === `/admin/customer-business-applications/${id}`)
      body = {
        ...app,
        ...adminAccess,
        decisionActorId: null,
        internalNote: 'Nota sintética sólo administrativa',
      }
    else if (p === `/customer/business-applications/${id}`) body = app
    else if (
      p === '/customer/business-applications' &&
      route.request().method() === 'POST'
    ) {
      const d = route.request().postDataJSON()
      assert.equal(d.businessName, 'Panadería de prueba')
      assert(!('note' in d))
      assert.equal(d.expectedAccountRevision, 1)
      projection = {
        ...projection,
        businessAccess: { ...access, canApply: false },
        businessApplication: { id, status: 'PENDING', revision: 1 },
      }
      body = {
        key: route.request().headers()['idempotency-key'],
        operation: 'SUBMIT',
        outcome: 'APPLIED',
        code: null,
        resourceId: id,
        committedAt: at,
        result: {
          applicationStatus: 'PENDING',
          applicationRevision: 1,
          accountRevision: 1,
          accessState: 'NONE',
          accountType: 'PERSONAL',
          grantId: null,
          reapplicationBlocked: false,
        },
      }
      status = 201
    } else if (
      p === '/customer/business-applications' ||
      p === '/admin/customer-business-applications'
    )
      body = { items: [app], page: 1, pageSize: 20, total: 1 }
    else {
      errors.push('Unexpected synthetic API path: ' + p)
      status = 404
      body = { code: 'NOT_FOUND' }
    }
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  const visit = async (path, role = 'customer') =>
    page.goto(
      'http://127.0.0.1:4196/.tmp/business-approval/index.html?' +
        new URLSearchParams({ path, role }),
    )
  await visit('/customer/business')
  await page.getByLabel('Actividad *').waitFor()
  assert(
    !(
      await page
        .getByRole('link', { name: 'Mis envíos', exact: true })
        .getAttribute('class')
    )?.includes('active'),
  )
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    if (width < 600)
      await page.waitForFunction(
        () =>
          document.querySelector('.sidebar')?.getBoundingClientRect().right <=
          1,
      )
    else
      await page.waitForFunction(
        () =>
          document.querySelector('.sidebar')?.getBoundingClientRect().left ===
          0,
      )
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: resolve(out, `customer-${width}.png`),
      fullPage: true,
    })
  }
  await page.getByLabel('Nombre del negocio *').focus()
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').getAttribute('name'), 'activity')
  await page.getByLabel('Nombre del negocio *').fill('Panadería de prueba')
  await page.getByLabel('Actividad *').fill('Venta')
  await page.getByLabel('Ciudad *').fill('Ciudad')
  await page.getByLabel('Volumen estimado de envíos *').fill('12 por semana')
  await page.getByRole('button', { name: 'Revisar solicitud' }).click()
  await page.getByRole('dialog').waitFor()
  assert.equal(await page.locator(':focus').count(), 1)
  await page.screenshot({
    path: resolve(out, 'confirmation-mobile.png'),
    fullPage: true,
  })
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)
  await page.getByLabel('Ciudad *').fill('Ciudad corregida')
  await page.getByRole('button', { name: 'Revisar solicitud' }).click()
  await page.getByRole('button', { name: 'Confirmar operación' }).click()
  await page.getByText('Operación registrada correctamente.').waitFor()
  await page.getByRole('link', { name: 'Consultar detalle' }).waitFor()
  assert.equal(calls.filter((c) => c.method === 'POST').length, 1)
  await page.screenshot({
    path: resolve(out, 'customer-pending.png'),
    fullPage: true,
  })
  await visit('/admin/customer-business-applications/' + id, 'admin')
  await page.getByLabel('Decisión').waitFor()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    if (width < 600)
      await page.waitForFunction(
        () =>
          document.querySelector('.sidebar')?.getBoundingClientRect().right <=
          1,
      )
    else
      await page.waitForFunction(
        () =>
          document.querySelector('.sidebar')?.getBoundingClientRect().left ===
          0,
      )
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await page.screenshot({
      path: resolve(out, `admin-${width}.png`),
      fullPage: true,
    })
  }
  await page.getByLabel('Decisión').selectOption('REJECT')
  assert(await page.getByLabel('Motivo público *').isVisible())
  await visit('/admin/customer-business-applications/' + id)
  await page
    .getByRole('heading', { name: 'Sin permisos', exact: true })
    .waitFor()
  await visit('/customer/business', 'anonymous')
  await page
    .getByRole('heading', { name: 'Tu operación empieza aquí.' })
    .waitFor()
  await page.getByLabel('Correo electrónico').fill('synthetic@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('synthetic-only')
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await page
    .getByRole('heading', { name: 'Cuenta Negocio', exact: true })
    .waitFor()
  await visit('/customer/business')
  await page
    .getByRole('heading', { name: 'Cuenta Negocio', exact: true })
    .waitFor()
  await page.evaluate(() => {
    localStorage.setItem(
      'mandaria.business.pending.v1',
      JSON.stringify([
        {
          actor: 'synthetic-actor',
          account: '11111111-1111-4111-8111-111111111111',
          operation: 'SUBMIT',
          key: '44444444-4444-4444-8444-444444444444',
        },
      ]),
    )
  })
  await page.reload()
  await page.getByText('Pendiente de reconciliación', { exact: true }).waitFor()
  await page.screenshot({
    path: resolve(out, 'recovery-mobile.png'),
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  await writeFile(
    resolve(out, 'result.json'),
    JSON.stringify(
      {
        result: 'PASS',
        widths: [1440, 390],
        keyboard: true,
        anonymousCTA: true,
        roleGuard: true,
        form: true,
        cacheRefresh: true,
        reloadMarker: true,
        errors,
        backend:
          'intercepted synthetic API; no real backend, mail, DB or commercial operation',
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS: business customer/admin desktop/mobile, keyboard, CTA, role guard, synthetic mutation/refetch and reload marker. Fixtures only.',
  )
} finally {
  await browser?.close()
  await server.close()
  await unlink(`${dir}/main.tsx`)
  await unlink(`${dir}/index.html`)
  await rmdir(dir)
}
