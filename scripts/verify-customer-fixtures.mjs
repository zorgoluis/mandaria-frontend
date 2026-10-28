/** Isolated browser fixtures: no real backend or external request is allowed. */
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
process.env.VITE_API_URL = 'http://127.0.0.1:43130'
const origin = 'http://127.0.0.1:4177'
const server = await createServer({
  server: { host: '127.0.0.1', port: 4177, strictPort: true },
})
await server.listen()
const browser = await chromium.launch({ headless: true })
const dir = 'test-results/v117-customer'
await fs.mkdir(dir, { recursive: true })
const results = [],
  errors = [],
  commands = []
const finalHash = 'b'.repeat(64)
let technicalClosed = false
let role = 'CUSTOMER',
  converted = false,
  accepted = false,
  loseAccept = true,
  mpq
const terms = {
  payer: 'REQUESTER',
  method: 'CASH',
  dueAt: 'PICKUP',
  component: 'DELIVERY_FEE',
  termsVersion: 1,
  termsHash: finalHash,
  policyRevision: null,
  payerContact: {
    name: 'Pagador sintético',
    phone: '0000000000',
    capacity: 'REQUESTER',
  },
}
const mdr = {
  publicId: 'MDR-000001',
  serviceType: 'LOCAL_DELIVERY',
  status: 'CREATED',
  requestedAt: '2026-10-06T12:00:00Z',
  createdAt: '2026-10-06T12:00:00Z',
  updatedAt: '2026-10-06T12:00:00Z',
  shippingTerms: terms,
  stops: [],
  packages: [],
  financialContext: {
    goodsValue: '100.00',
    goodsPaymentMode: 'PREPAID',
    currency: 'MXN',
  },
}
const status = () => ({
  publicId: mdr.publicId,
  publicVersion: '1',
  trackingMode: null,
  assignmentState: 'NONE',
  terminalOutcome: null,
  status: accepted ? 'OPEN' : 'REQUESTED',
  requestedAt: mdr.requestedAt,
  shippingPayment: {
    ...terms,
    payerContact: undefined,
    amount: accepted ? '25.10' : null,
    currency: accepted ? 'MXN' : null,
    quotePublicId: accepted ? 'MQ-000001' : null,
    instructionStatus: 'CURRENT',
    evidenceStatus: 'NOT_DECLARED',
    declaredAt: null,
    collectShipping: false,
  },
})
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  await context.route('**/*', async (route) => {
    const r = route.request(),
      url = new URL(r.url())
    if (url.origin === origin) return route.continue()
    if (url.origin !== 'http://127.0.0.1:43130')
      throw new Error('External request blocked')
    const path = url.pathname.replace('/api/v1', ''),
      method = r.method()
    const body = method === 'POST' ? r.postDataJSON() : null
    const reply = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    if (path === '/auth/login' || path === '/auth/refresh')
      return reply({
        accessToken: 'synthetic-access',
        refreshToken: 'synthetic-refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
      })
    if (path === '/auth/me')
      return reply({
        id: 'synthetic-user',
        email: 'synthetic@example.test',
        role,
        active: true,
        emailVerifiedAt: mdr.createdAt,
        createdAt: mdr.createdAt,
        updatedAt: mdr.createdAt,
      })
    if (path === '/customer/capabilities')
      return reply({
        type: 'PERSONAL',
        allowedShippingPayers: ['REQUESTER'],
        defaultShippingPayer: 'REQUESTER',
        capacity: {
          occupied: converted,
          activeCount: converted ? 1 : 0,
          maxActiveRequests: 1,
          activeRequestPublicId: converted ? mdr.publicId : null,
        },
        canPrequote: true,
        canCreateRequest: !converted,
        reason: converted ? 'CUSTOMER_ACTIVE_REQUEST_LIMIT' : null,
      })
    if (path === '/customer/profile')
      return reply({
        type: 'PERSONAL',
        displayName: 'Cliente sintético',
        businessName: null,
        revision: 1,
        active: true,
      })
    if (path === '/customer/delivery-requests')
      return reply({
        items: converted ? [mdr] : [],
        total: converted ? 1 : 0,
        page: 1,
        pageSize: 20,
        totalPages: converted ? 1 : 0,
      })
    if (path === '/customer/delivery-prequotes' && method === 'POST') {
      commands.push({ path, key: r.headers()['idempotency-key'] })
      mpq = {
        publicId: 'MPQ-000001',
        status: 'OFFERED',
        conditionsVersion: 1,
        conditions: body.conditions,
        shippingTerms: {
          ...terms,
          termsHash: 'a'.repeat(64),
          payerContact: undefined,
        },
        serviceZone: { code: 'LOCAL', name: 'Local sintética' },
        distanceMeters: 1000,
        durationSeconds: 600,
        amount: '25.10',
        currency: 'MXN',
        createdAt: mdr.createdAt,
        expiresAt: '2099-01-01T00:00:00Z',
        convertedAt: null,
        deliveryRequestPublicId: null,
        deliveryQuotePublicId: null,
        availabilityGuaranteed: false,
      }
      return reply({ prequote: mpq, replayed: false }, 201)
    }
    if (path === '/customer/delivery-prequotes/MPQ-000001' && method === 'GET')
      return reply(mpq)
    if (path.endsWith('/convert')) {
      assert.equal(body.payerContact.name, 'Pagador sintético')
      assert.equal(body.deliveryRequest.payerContact, undefined)
      converted = true
      mpq = {
        ...mpq,
        status: 'CONVERTED',
        deliveryRequestPublicId: mdr.publicId,
        deliveryQuotePublicId: 'MQ-000001',
        convertedAt: mdr.createdAt,
      }
      commands.push({ path, key: r.headers()['idempotency-key'] })
      return reply(
        {
          result: {
            deliveryRequestPublicId: mdr.publicId,
            quote: {
              publicId: 'MQ-000001',
              amount: '25.10',
              currency: 'MXN',
              expiresAt: mpq.expiresAt,
            },
          },
          replayed: false,
        },
        201,
      )
    }
    if (path === `/customer/delivery-requests/${mdr.publicId}`)
      return reply(mdr)
    if (path.endsWith('/status')) return reply(status())
    if (path.endsWith('/consent-context'))
      return reply({
        deliveryRequestPublicId: mdr.publicId,
        prequote: null,
        quote: {
          publicId: 'MQ-000001',
          amount: '25.10',
          currency: 'MXN',
          expiresAt: '2099-01-01T00:00:00Z',
          status: accepted ? 'ACCEPTED' : 'OFFERED',
          acceptedAt: accepted ? mdr.createdAt : null,
        },
        shippingTerms: terms,
        canPrepareConsent: !accepted,
        automaticAcceptance: false,
      })
    if (path === '/customer/command-attempt') {
      assert.equal(method, 'GET')
      assert.equal(url.searchParams.get('resourcePublicId'), 'MQ-000001')
      assert.equal(
        r.headers()['idempotency-key'],
        commands.find((c) => c.path.endsWith('/accept')).key,
      )
      return reply({
        operation: 'QUOTE_ACCEPT',
        resourcePublicId: 'MQ-000001',
        state: 'APPLIED',
        canPrepareNewAttempt: false,
        closureScope: 'RESOURCE_OR_POLICY_ONLY',
        routingEffects: 'NONE_STARTED',
        closedAt: null,
        result: {
          deliveryRequestPublicId: mdr.publicId,
          deliveryQuotePublicId: 'MQ-000001',
          amount: '25.10',
          currency: 'MXN',
          expiresAt: '2099-01-01T00:00:00Z',
          acceptedAt: mdr.createdAt,
          shippingTerms: terms,
        },
      })
    }
    if (path.endsWith('/accept')) {
      assert.equal(body.customerAuthorization.shippingTermsHash, finalHash)
      assert.equal(body.customerAuthorization.amount, '25.10')
      commands.push({ path, key: r.headers()['idempotency-key'] })
      accepted = true
      if (loseAccept) {
        loseAccept = false
        return route.abort('failed')
      }
      return reply({
        quote: { publicId: 'MQ-000001', status: 'ACCEPTED' },
        replayed: true,
      })
    }
    if (path === '/admin/integrations/synthetic')
      return reply({
        id: 'synthetic',
        name: 'Integración sintética',
        code: 'SYNTHETIC',
        status: 'ACTIVE',
        createdAt: mdr.createdAt,
        updatedAt: mdr.createdAt,
      })
    if (path.includes('/shipping-policy/attempt')) {
      assert.equal(
        r.headers()['idempotency-key'],
        '11111111-1111-4111-8111-111111111111',
      )
      assert.equal(url.search, '')
      assert.equal(r.postData(), null)
      if (method === 'POST') {
        technicalClosed = true
        return route.abort('failed')
      }
      return reply({
        operation: 'SHIPPING_POLICY',
        resourcePublicId: 'synthetic',
        state: technicalClosed ? 'CLOSED_NO_EFFECTS' : 'PENDING_OR_UNKNOWN',
        canPrepareNewAttempt: technicalClosed,
        closureScope: 'RESOURCE_OR_POLICY_ONLY',
        routingEffects: 'NONE_STARTED',
        closedAt: technicalClosed ? mdr.createdAt : null,
        result: null,
      })
    }
    if (path.endsWith('/shipping-policy')) {
      assert.equal(method, 'GET', 'Never change policy in browser fixture')
      return reply({ payer: 'RECIPIENT', revision: 1 })
    }
    if (path.endsWith('/credentials')) return reply([])
    if (path.endsWith('/webhook')) return reply({ message: 'Not found' }, 404)
    if (path.endsWith('/webhook/summary'))
      return reply({ events: 0, pending: 0, delivered: 0, exhausted: 0 })
    if (path === '/admin/b2b-events' || path.endsWith('/webhook/deliveries'))
      return reply({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      })
    return reply({ message: 'Fixture endpoint unavailable' }, 404)
  })
  await page.goto(origin + '/customer/register')
  await page.getByRole('heading', { name: 'Crear perfil cliente' }).waitFor()
  await page.screenshot({ path: dir + '/register-desktop.png', fullPage: true })
  await page.keyboard.press('Tab')
  assert.ok(await page.locator(':focus').count())
  results.push('Registro y foco por teclado')
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill('synthetic@example.test')
  await page.locator('input[name=password]').fill('synthetic-password-only')
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await page.getByRole('heading', { name: 'Mis envíos' }).waitFor()
  await page.getByRole('link', { name: 'Cotizar envío' }).click()
  await page.getByLabel('Latitud de origen').fill('18.42')
  await page.getByLabel('Longitud de origen').fill('-95.38')
  await page.getByLabel('Latitud de destino').fill('18.45')
  await page.getByLabel('Longitud de destino').fill('-95.35')
  assert.equal(
    await page.getByLabel('Pagador del envío').locator('option').count(),
    1,
  )
  await page.getByRole('button', { name: 'Obtener precotización' }).click()
  await page.getByRole('heading', { name: 'MPQ-000001' }).waitFor()
  for (const place of ['origen', 'destino']) {
    await page.getByLabel('Dirección de ' + place).fill('Dirección sintética')
    await page.getByLabel('Contacto de ' + place).fill('Contacto sintético')
    await page.getByLabel('Teléfono de ' + place).fill('0000000000')
  }
  await page.getByLabel('Descripción del paquete').fill('Paquete sintético')
  await page.getByLabel('Valor de mercancía en MXN').fill('100')
  await page.getByLabel('Nombre del pagador').fill('Pagador sintético')
  await page.getByLabel('Teléfono del pagador').fill('0000000000')
  await page
    .getByRole('button', { name: 'Crear solicitud y revisar términos' })
    .click()
  await page
    .getByRole('heading', { name: 'Revisar y autorizar envío' })
    .waitFor()
  // Other device equivalent: remove reference mapping, enter only MDR direct URL.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith('mandaria.customer.reference.'))
        localStorage.removeItem(k)
  })
  await page.goto(origin + '/customer/requests/MDR-000001')
  await page
    .getByRole('heading', { name: 'Revisar y autorizar envío' })
    .waitFor()
  await page.screenshot({ path: dir + '/consent-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(350)
  await page.screenshot({ path: dir + '/consent-mobile.png', fullPage: true })
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  await page
    .getByLabel('Acepto el importe, vigencia y condiciones del envío')
    .focus()
  await page.keyboard.press('Space')
  await page
    .getByRole('button', { name: 'Autorizar y solicitar servicio' })
    .click()
  await page
    .getByRole('heading', { name: 'Pendiente de reconciliación' })
    .waitFor()
  await page.reload()
  await page
    .getByRole('heading', { name: 'Pendiente de reconciliación' })
    .waitFor()
  await page.screenshot({ path: dir + '/recovery-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.waitForTimeout(350)
  await page.screenshot({ path: dir + '/recovery-desktop.png', fullPage: true })
  const storage = await page.evaluate(() => JSON.stringify(localStorage))
  assert.ok(!storage.includes('Pagador sintético'))
  assert.ok(!storage.includes('0000000000'))
  await page.getByRole('button', { name: 'Consultar resultado' }).click()
  await page
    .getByRole('heading', { name: 'Pendiente de reconciliación' })
    .waitFor({ state: 'hidden' })
  assert.equal(commands.filter((c) => c.path.endsWith('/accept')).length, 1)
  results.push(
    'PERSONAL: MPQ → conversión → consentimiento final → respuesta perdida → recarga → consulta aplicada sin repetir POST',
  )
  role = 'SUPER_ADMIN'
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(origin + '/integrations/synthetic')
  await page.getByRole('heading', { name: 'Pagador del envío' }).waitFor()
  await page
    .getByRole('heading', { name: 'Pagador del envío' })
    .scrollIntoViewIfNeeded()
  await page.screenshot({ path: dir + '/policy-desktop.png', fullPage: true })
  assert.equal(
    await page
      .getByLabel(
        'Confirmo compatibilidad del integrador y el efecto en nuevas solicitudes',
      )
      .isChecked(),
    false,
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(350)
  await page.screenshot({ path: dir + '/policy-mobile.png', fullPage: true })
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  results.push(
    'Política SUPER_ADMIN: consulta, confirmación no marcada, desktop/móvil',
  )
  // Synthetic durable marker exercises closure UI without changing any real policy.
  await page.evaluate(() =>
    localStorage.setItem(
      'mandaria.customer.pending.v1',
      JSON.stringify([
        {
          actor: 'synthetic-user',
          kind: 'policy',
          ref: 'synthetic',
          key: '11111111-1111-4111-8111-111111111111',
        },
      ]),
    ),
  )
  await page.reload()
  await page.getByRole('button', { name: 'Consultar resultado' }).click()
  const confirmation = page.getByLabel(
    'Confirmo el cierre técnico de este intento',
  )
  await confirmation.waitFor()
  assert.equal(await confirmation.isChecked(), false)
  await page.screenshot({ path: dir + '/close-mobile.png', fullPage: true })
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.waitForTimeout(350)
  await page.screenshot({ path: dir + '/close-desktop.png', fullPage: true })
  await confirmation.focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Cerrar intento técnico' }).click()
  await page.getByText(/No se confirmó el cierre/).waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Consultar resultado' }).click()
  await page.getByText(/Intento cerrado para publicación/).waitFor()
  const prepare = page.getByLabel(
    'Deseo preparar otra intención sin enviarla automáticamente',
  )
  assert.equal(await prepare.isChecked(), false)
  await page.screenshot({ path: dir + '/closed-desktop.png', fullPage: true })
  await prepare.focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Preparar otra intención' }).click()
  await page.getByLabel('Quién paga el envío').waitFor()
  results.push(
    'Cierre técnico: confirmación por teclado, respuesta perdida, recarga, CLOSED_NO_EFFECTS y preparación explícita sin POST de política',
  )
  await page.goto(origin + '/developers/prequotes')
  await page.getByText('REQUESTER', { exact: false }).first().waitFor()
  results.push('Portal anónimo: guía sincronizada')
  assert.deepEqual(errors, [])
  await fs.writeFile(
    dir + '/results.json',
    JSON.stringify(
      {
        results,
        errors,
        operationalCalls: 'Only mocked API; no real requests',
        commands: commands.length,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ results, errors }, null, 2))
} catch (error) {
  const p = browser.contexts()[0]?.pages()[0]
  if (p) {
    await fs.writeFile(
      dir + '/failure.txt',
      await p.locator('body').innerText(),
    )
    console.log(
      'Fixture failure:',
      p.url(),
      await p.locator('body').innerText(),
    )
  }
  throw error
} finally {
  await browser.close()
  await server.close()
}
