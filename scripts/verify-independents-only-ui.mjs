import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const out = 'docs/evidence/independents-only-20261028',
  origin = 'http://127.0.0.1:4270'
mkdirSync(out, { recursive: true })
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  at = '2026-10-28T23:00:00Z'
let role = 'DRIVER',
  cat = 'INDEPENDENT',
  active = false,
  released = false,
  state = 'READY',
  revision = 1,
  phase = null,
  execRevision = 1,
  takeKey,
  releaseKey
let collected = false
const records = [],
  checks = [],
  errors = []
const user = () => ({
  id: id(role === 'DRIVER' ? 1 : 9),
  email: 'synthetic@example.test',
  role,
  active: true,
  emailVerifiedAt: at,
  createdAt: at,
  updatedAt: at,
})
const category = () => ({
  contractVersion: '1.0.0',
  categoryRevision: '9007199254740993',
  category: cat,
  providerId: cat === 'FLEET' ? id(8) : null,
  independentMembershipState: cat === 'INDEPENDENT' ? 'CURRENT' : null,
  independentApprovalStatus: cat === 'INDEPENDENT' ? 'APPROVED' : null,
  resolutionRequired: cat === 'REVIEW_REQUIRED',
})
const exec = () => ({
  trackingMode: 'DETAILED',
  revision: execRevision,
  phase,
  activeAssignmentId: id(4),
  custodyStatus: ['PICKED_UP', 'TO_DROPOFF', 'AT_DROPOFF'].includes(phase)
    ? 'HELD'
    : 'NOT_COLLECTED',
  openIncidentId: null,
  allowedActions: [
    ...(phase === 'AT_PICKUP' && !collected ? ['COLLECT_SHIPPING'] : []),
    'ADVANCE',
    ...(phase === 'AT_DROPOFF' ? ['DELIVER'] : []),
    'ORDINARY_ASSIGNMENT_OPERATIONS',
  ],
  lastRecordedAt: at,
})
const reception = () => ({
  schemaVersion: 1,
  revision: String(revision),
  serverTime: at,
  allowedZones: [{ id: id(6), name: 'Zona propia sintética' }],
  selectedZoneId: id(6),
  shift: { id: id(7), startsAt: at, expiresAt: '2099-01-01T00:00:00Z' },
  state,
  reason: state === 'READY' ? 'ELIGIBLE' : 'ARRIVED_PREVIEW',
  canAttemptTake: state === 'READY',
  limits: { defaultMinutes: 480, minMinutes: 60, maxMinutes: 720 },
})
const vehicle = {
  id: id(5),
  identifier: 'MOTO-SYNTH',
  type: 'MOTORCYCLE',
  status: 'ACTIVE',
  brand: null,
  model: null,
  year: null,
  color: null,
  plate: null,
}
const dispatch = () => ({
  id: id(3),
  trackingMode: 'DETAILED',
  status: active ? 'CLAIMED' : 'OPEN',
  access: active ? 'OWNER' : 'OFFER',
  serviceType: 'LOCAL_DELIVERY',
  serviceZone: { code: 'SYNTH', name: 'Zona propia sintética' },
  expiresAt: '2099-01-01T00:00:00Z',
  openedAt: at,
  claimedAt: active ? at : null,
  takenByMe: active,
  assignment: active
    ? { id: id(4), mode: 'INDEPENDENT', assignedAt: at, vehicle }
    : null,
  execution: active ? exec() : undefined,
  noProviderAvailable: true,
  shippingPayment: active
    ? {
        payer: 'REQUESTER',
        method: 'CASH',
        component: 'DELIVERY_FEE',
        termsVersion: 1,
        dueAt: 'PICKUP',
        instructionStatus: 'CURRENT',
        evidenceStatus: collected ? 'DECLARED' : 'NOT_DECLARED',
        collectShipping: phase === 'AT_PICKUP' && !collected,
        amount: '55.00',
        currency: 'MXN',
        quotePublicId: 'MQ-999999',
        termsHash: 'a'.repeat(64),
      }
    : undefined,
  service: {
    route: { distanceMeters: 1000, durationSeconds: 600 },
    pickup: { address: 'Origen sintético' },
    dropoff: { address: 'Destino sintético' },
    packages: [
      { category: 'FOOD', quantity: 1, weightKg: null, isFragile: false },
    ],
  },
  paymentContext: {
    deliveryFee: { amount: '55.00', currency: 'MXN' },
    goodsValue: null,
    goodsPaymentMode: 'PREPAID',
    driverAdvancesGoods: false,
    driverAdvanceAmount: null,
  },
  creditCost: 4,
})
const receipt = (op) => ({
  operation: op,
  dispatchId: id(3),
  assignmentId: id(4),
  dispatchStatus: op === 'TAKE' ? 'CLAIMED' : 'OPEN',
  assignmentStatus: op === 'TAKE' ? 'ACTIVE' : 'CANCELLED',
  credits: {
    awardEntryId: id(20),
    refundEntryId: op === 'RELEASE' ? id(21) : null,
    amount: op === 'TAKE' ? -4 : 4,
  },
})
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
  server: { host: '127.0.0.1', port: 4270, strictPort: true },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', async (route) => {
    const r = route.request(),
      u = new URL(r.url())
    if (u.origin !== origin) return route.abort()
    if (!u.pathname.startsWith('/api/v1/')) return route.continue()
    const p = u.pathname.slice(7),
      method = r.method()
    records.push({ path: p, method })
    const reply = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (['/auth/login', '/auth/refresh'].includes(p))
      return reply({
        accessToken: 'synthetic-only',
        refreshToken: 'synthetic-only-refresh',
      })
    if (p === '/auth/me')
      return reply({ accessMode: 'STANDARD', identity: user() })
    if (p === '/driver/me')
      return reply({
        id: id(2),
        name: 'Independiente sintético',
        status: 'ACTIVE',
        availability: 'AVAILABLE',
        provider: null,
        currentAssignment: null,
        activeDeliveryAssignment: active
          ? {
              id: id(4),
              mode: 'INDEPENDENT',
              dispatchId: id(3),
              trackingMode: 'DETAILED',
              execution: exec(),
            }
          : null,
        independent: {
          id: id(10),
          status: 'APPROVED',
          canTakeServices: !active,
        },
        driverCategory: category(),
      })
    if (p === '/driver/vehicles') return reply([vehicle])
    if (p.includes('/credits'))
      return reply({ balance: 100, items: [], total: 0, totalPages: 1 })
    if (p === '/driver/offer-reception') {
      if (method === 'PUT') {
        const b = r.postDataJSON()
        assert.equal(b.expectedRevision, String(revision))
        revision++
        return reply({ ...reception(), requestId: b.requestId })
      }
      return reply(reception())
    }
    if (p === '/driver/availability')
      return reply({ availability: r.postDataJSON().availability })
    if (p === '/driver/offer-feed')
      return reply({
        schemaVersion: 1,
        receptionRevision: String(revision),
        snapshotId: id(11),
        snapshotExpiresAt: '2099-01-01T00:00:00Z',
        eventCursor: 'synthetic',
        nextPageToken: null,
        items: [
          {
            dispatchId: id(3),
            offerRevision: '1',
            expiresAt: '2099-01-01T00:00:00Z',
          },
        ],
      })
    if (p === '/driver/dispatches/available')
      return reply({
        items: [dispatch()],
        total: 1,
        totalPages: 1,
        page: 1,
        pageSize: 20,
      })
    if (p === `/driver/dispatches/${id(3)}`)
      return released ? reply({}, 404) : reply(dispatch())
    if (p.endsWith('/take')) {
      assert.deepEqual(r.postDataJSON(), { vehicleId: id(5) })
      assert.ok(r.headers()['idempotency-key'])
      takeKey = r.headers()['idempotency-key']
      active = true
      return route.abort('failed')
    }
    if (p.endsWith('/release')) {
      releaseKey = r.headers()['idempotency-key']
      assert.ok(releaseKey)
      active = false
      released = true
      return route.abort('failed')
    }
    if (p.endsWith('/independent-attempt')) {
      const op = u.searchParams.get('operation')
      assert.equal(
        r.headers()['idempotency-key'],
        op === 'TAKE' ? takeKey : releaseKey,
      )
      return reply({
        operation: op,
        dispatchId: id(3),
        state: 'APPLIED',
        result: receipt(op),
        canPrepareNewAttempt: false,
      })
    }
    if (p.endsWith('/execution'))
      return reply({
        execution: exec(),
        events: { items: [], total: 0, totalPages: 1, page: 1, pageSize: 20 },
      })
    if (p.endsWith('/shipping-collection')) {
      const b = r.postDataJSON()
      assert.equal(b.amount, '55.00')
      assert.equal(b.termsHash, 'a'.repeat(64))
      assert.equal(b.assignmentId, id(4))
      assert.equal(b.expectedRevision, execRevision)
      collected = true
      execRevision++
      return reply({})
    }
    if (p.endsWith('/execution-completion')) {
      assert.equal(r.postDataJSON().assignmentId, id(4))
      assert.equal(r.postDataJSON().expectedRevision, execRevision)
      active = false
      return reply({
        dispatchId: id(3),
        assignmentId: id(4),
        status: 'DELIVERED',
      })
    }
    if (p.endsWith('/execution-events')) {
      const b = r.postDataJSON()
      assert.equal(b.assignmentId, id(4))
      assert.equal(b.expectedRevision, execRevision)
      phase = b.phase
      execRevision++
      return reply(exec())
    }
    if (p.includes('/assignments/') && p.endsWith('/attempt'))
      return reply({
        assignmentId: id(4),
        operation: u.searchParams.get('operation'),
        state: 'APPLIED',
        canStartNewAttempt: false,
      })
    if (p.endsWith('/category')) return reply(category())
    if (p.endsWith('/independent')) return reply({}, 404)
    return reply({ code: 'MOCK_ROUTE_NOT_DEFINED' }, 404)
  })
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill(user().email)
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill('Synthetic-only-123')
  await page.getByRole('button', { name: /Iniciar sesión|Entrar/ }).click()
  await page.goto(origin + '/driver/reception')
  await expect(page.getByText(/Recepción: READY/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mi afiliación' })).toHaveCount(0)
  await page.screenshot({
    path: out + '/01-reception-mock.png',
    fullPage: true,
  })
  checks.push('Own zone and READY, no fleet navigation')
  await page.getByRole('button', { name: 'Renovar turno' }).click()
  await expect(
    page.getByRole('button', { name: 'Reconocer resultado y revisar' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Reconocer resultado y revisar' })
    .click()
  checks.push('Explicit reception mutation with requestId and revision')
  await page.goto(origin + `/driver/services/${id(3)}`)
  await page.getByRole('button', { name: 'TOMAR SERVICIO' }).click()
  await page.getByLabel('Vehículo', { exact: true }).selectOption(id(5))
  await page.getByRole('button', { name: 'CONFIRMAR', exact: true }).click()
  await expect
    .poll(() => records.filter((r) => r.path.endsWith('/take')).length)
    .toBe(1)
  await page.reload()
  await page
    .getByRole('button', { name: 'Consultar intento independiente' })
    .click()
  await expect(page.getByText(/Operación confirmada/)).toBeVisible()
  await page.screenshot({
    path: out + '/02-take-recovered-mock.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Reconocer recibo' }).click()
  await expect(
    page.getByRole('region', { name: 'Recuperación independiente' }),
  ).toHaveCount(0)
  checks.push(
    'TAKE no fleet candidates; own vehicle; lost response, reload, original receipt, single POST',
  )
  await page.goto(origin + '/driver/my-service')
  await page
    .getByRole('button', { name: 'LIBERAR SERVICIO', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Liberar servicio', exact: true })
    .click()
  await expect
    .poll(() => records.filter((r) => r.path.endsWith('/release')).length)
    .toBe(1)
  await page.reload()
  await page
    .getByRole('button', { name: 'Consultar intento independiente' })
    .click()
  await expect(page.getByText(/Operación confirmada/)).toBeVisible()
  await page.screenshot({
    path: out + '/03-release-receipt-mock.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Reconocer recibo' }).click()
  await expect(
    page.getByRole('region', { name: 'Recuperación independiente' }),
  ).toHaveCount(0)
  checks.push(
    'RELEASE lost response, receipt after current detail becomes forbidden',
  )

  // New isolated fixture state, not another operational service or an HTTP claim.
  active = true
  released = false
  phase = null
  execRevision = 1
  state = 'READY'
  await page.goto(origin + '/driver/my-service')
  for (const label of [
    'En camino al origen',
    'En el origen',
    'Mercancía recogida',
    'En camino al destino',
    'En el destino',
  ]) {
    await page
      .getByRole('button', { name: 'Confirmar ' + label, exact: true })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Consultar ejecución original' })
      .click()
    await page.getByRole('button', { name: 'Reconocer ejecución' }).click()
    await expect(
      page.getByRole('button', { name: 'Consultar ejecución original' }),
    ).toHaveCount(0)
    if (label === 'En el origen') {
      await page
        .getByRole('button', {
          name: 'Declarar efectivo recibido del solicitante',
          exact: true,
        })
        .click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirmar', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Consultar ejecución original' })
        .click()
      await page.getByRole('button', { name: 'Reconocer ejecución' }).click()
      await expect(
        page.getByRole('button', { name: 'Consultar ejecución original' }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: 'LIBERAR SERVICIO', exact: true }),
      ).toHaveCount(0)
      await page.screenshot({
        path: out + '/07-collected-blocks-release-mock.png',
        fullPage: true,
      })
      checks.push(
        'Explicit shipping cash declaration with quote/hash/revision; RELEASE blocked afterwards',
      )
    }
  }
  await expect(
    page.getByRole('button', { name: 'LIBERAR SERVICIO', exact: true }),
  ).toHaveCount(0)
  await page.screenshot({
    path: out + '/06-detailed-at-dropoff-mock.png',
    fullPage: true,
  })
  await page
    .getByRole('button', { name: 'Confirmar entrega detallada', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Consultar ejecución original' })
    .click()
  await page.getByRole('button', { name: 'Reconocer ejecución' }).click()
  checks.push(
    'Five detailed phases and execution-completion; custody prevents RELEASE; original execution recovery',
  )

  state = 'PREVIEW'
  await page.goto(origin + '/driver/reception')
  await expect(page.getByText(/Recepción: PREVIEW/)).toBeVisible()
  await page.screenshot({ path: out + '/04-preview-mock.png', fullPage: true })
  checks.push('PREVIEW read-only offers')
  await page.evaluate(() => sessionStorage.clear())
  role = 'SUPER_ADMIN'
  cat = 'NONE'
  await page.goto(origin + '/login')
  await page.getByLabel('Correo electrónico').fill(user().email)
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill('Synthetic-only-123')
  await page.getByRole('button', { name: /Iniciar sesión|Entrar/ }).click()
  await page.goto(origin + `/independent-drivers/${id(2)}`)
  await expect(
    page.getByRole('button', { name: 'Habilitar independiente', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: out + '/05-none-without-profile-mock.png',
    fullPage: true,
  })
  checks.push(
    'SUPER_ADMIN category NONE despite profile404, no category inferred',
  )
  assert.deepEqual(errors, [])
  writeFileSync(
    out + '/browser.json',
    JSON.stringify(
      {
        scope: 'MOCKED HTTP ONLY; no real backend',
        checks,
        passed: checks.length,
        errors,
        records,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await browser?.close()
  await server.close()
}
