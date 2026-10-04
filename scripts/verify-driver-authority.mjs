import { chromium, expect } from '@playwright/test'
import fs from 'node:fs'
const origin = 'http://127.0.0.1:5173'
const stamp = '2026-10-04T12:00:00Z'
const execution = {
  trackingMode: 'DETAILED',
  revision: 4,
  phase: 'PICKED_UP',
  activeAssignmentId: 'assignment',
  custodyStatus: 'HELD',
  openIncidentId: null,
  allowedActions: ['ADVANCE', 'DELIVER', 'REPORT_INCIDENT'],
  lastRecordedAt: stamp,
}
const pageOf = (items) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  totalPages: 1,
})
const profile = {
  id: 'provider',
  name: 'Proveedor sintético',
  code: 'SYNTHETIC',
  type: 'FLEET',
  status: 'ACTIVE',
  membershipRole: 'OWNER',
  limits: { maxDrivers: 5, maxVehicles: 5 },
}
const assignment = {
  id: 'assignment',
  dispatchId: 'dispatch',
  providerId: 'provider',
  status: 'ACTIVE',
  driver: { id: 'driver', name: 'Repartidor sintético' },
  vehicle: {
    id: 'vehicle',
    identifier: 'MOTO-TEST',
    type: 'MOTORCYCLE',
    plate: null,
  },
  assignedAt: stamp,
  assignedByUserId: 'actor',
  endedAt: null,
  endedByUserId: null,
  endReason: null,
  endReasonDetail: null,
}
const service = {
  deliveryRequestPublicId: 'MDR-SYNTHETIC',
  deliveryFee: { amount: '55.00', currency: 'MXN' },
  route: { distanceMeters: 4000, durationSeconds: 600 },
  pickup: { address: 'Origen sintético', latitude: 18, longitude: -95 },
  dropoff: { address: 'Destino sintético', latitude: 18.1, longitude: -95 },
  packages: [],
  goods: {
    paymentMode: 'PREPAID',
    value: '100.00',
    currency: 'MXN',
    driverAdvancesGoods: false,
    driverAdvanceAmount: null,
  },
}
const base = {
  id: 'dispatch',
  status: 'CLAIMED',
  access: 'OWNER',
  serviceType: 'LOCAL_DELIVERY',
  serviceZone: { code: 'TEST', name: 'Zona sintética' },
  openedAt: stamp,
  expiresAt: stamp,
  claimedByMe: true,
  takenByMe: true,
  claimedAt: stamp,
  cancelledAt: null,
  deliveredAt: null,
  myCandidate: null,
  service,
  assignment: { ...assignment, mode: 'INDEPENDENT' },
  assignmentDeadline: null,
  assignmentOverdue: false,
  creditCost: 7,
  paymentContext: {
    deliveryFee: service.deliveryFee,
    goodsValue: { amount: '100.00', currency: 'MXN' },
    goodsPaymentMode: 'PREPAID',
    driverAdvancesGoods: false,
    driverAdvanceAmount: null,
  },
}
const browser = await chromium.launch({ headless: true })
const results = []
fs.mkdirSync('test-results/driver-authority', { recursive: true })
try {
  for (const [name, role, legacy] of [
    ['provider-detailed', 'PROVIDER_ADMIN', false],
    ['provider-legacy', 'PROVIDER_ADMIN', true],
    ['driver-detailed', 'DRIVER', false],
    ['provider-historical', 'PROVIDER_ADMIN', false],
    ['provider-unassigned', 'PROVIDER_ADMIN', false],
    ['provider-unknown', 'PROVIDER_ADMIN', false],
  ]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const incomplete =
      name === 'provider-unassigned' || name === 'provider-unknown'
    if (name === 'provider-historical')
      await context.addInitScript(() =>
        localStorage.setItem(
          'mandaria.provider-advance-pending.v1:http://127.0.0.1:43130',
          JSON.stringify([
            {
              actor: 'actor',
              dispatchId: 'dispatch',
              providerId: 'provider',
              key: '10000000-0000-4000-8000-000000000001',
            },
          ]),
        ),
      )
    const errors = []
    const writes = []
    page.on('pageerror', (e) => errors.push(e.message))
    await context.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === origin && !url.pathname.startsWith('/api/'))
        return route.continue()
      if (!url.pathname.startsWith('/api/v1/')) return route.abort()
      const path = url.pathname.slice(7)
      let body
      if (path === '/auth/login' || path === '/auth/refresh')
        body = {
          accessToken: 'synthetic-access',
          refreshToken: 'synthetic-refresh',
        }
      else if (request.method() !== 'GET') {
        writes.push(path)
        return route.abort()
      } else if (path === '/auth/me')
        body = {
          id: 'actor',
          role,
          email: 'synthetic@example.test',
          active: true,
          createdAt: stamp,
          updatedAt: stamp,
          emailVerifiedAt: stamp,
        }
      else if (path === '/provider/profiles') body = pageOf([profile])
      else if (path === '/provider/profile') body = profile
      else if (path.endsWith('/assignments')) body = [assignment]
      else if (path.endsWith('/execution'))
        body = {
          execution,
          events: pageOf([
            {
              kind: 'ADVANCED',
              phase: 3,
              revision: 4,
              assignmentId: 'assignment',
              actorUserId: 'historical-actor',
              actorRole: 'PROVIDER_ADMIN',
              source: 'PHONE_REPORT',
              recordedAt: stamp,
            },
          ]),
        }
      else if (path === '/driver/me')
        body = {
          id: 'driver',
          name: 'Repartidor sintético',
          status: 'ACTIVE',
          availability: 'BUSY',
          provider: profile,
          currentAssignment: null,
          independent: {
            id: 'independent',
            status: 'APPROVED',
            canTakeServices: false,
          },
          activeDeliveryAssignment: {
            id: 'assignment',
            mode: 'INDEPENDENT',
            dispatchId: 'dispatch',
            trackingMode: 'DETAILED',
            execution,
          },
        }
      else if (path.endsWith('/dispatches/dispatch'))
        body = incomplete
          ? {
              ...base,
              trackingMode: name === 'provider-unassigned' ? null : undefined,
              assignment: null,
            }
          : legacy
            ? { ...base, trackingMode: 'LEGACY' }
            : {
                ...base,
                trackingMode: 'DETAILED',
                execution,
                collectionActionAllowed: false,
                advanceToOriginAllowed: false,
              }
      else body = pageOf([])
      return route.fulfill({ json: body })
    })
    await page.goto(origin + '/login')
    await page.locator('input[type=email]').fill('synthetic@example.test')
    await page.locator('input[type=password]').fill('synthetic-only')
    await page
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await page.waitForURL('**/dashboard')
    await page.goto(
      origin +
        (role === 'DRIVER'
          ? '/driver/my-service'
          : '/services/dispatch?providerId=provider'),
    )
    if (legacy)
      await expect(
        page.getByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
      ).toBeVisible()
    else if (!incomplete) {
      await expect(
        page.getByText('En la web, el progreso es de consulta.', {
          exact: false,
        }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /Registrar:|MARCAR COMO ENTREGADO/ }),
      ).toHaveCount(0)
    }
    if (incomplete)
      await expect(
        page.getByRole('heading', { name: 'MDR-SYNTHETIC', exact: true }),
      ).toBeVisible()
    if (name === 'provider-unknown')
      await expect(
        page.getByText('No se confirmó el modo de seguimiento.', {
          exact: false,
        }),
      ).toBeVisible()
    for (const [size, width, height] of [
      ['desktop', 1440, 1000],
      ['mobile', 390, 844],
    ]) {
      await page.setViewportSize({ width, height })
      await page.waitForTimeout(350)
      await page.screenshot({
        path: `test-results/driver-authority/${name}-${size}.png`,
        fullPage: true,
      })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
      await page.keyboard.press('Tab')
      const focus = await page.evaluate(() => document.activeElement?.tagName)
      if (incomplete) {
        await expect(
          page.getByRole('button', { name: 'MARCAR COMO ENTREGADO' }),
        ).toHaveCount(0)
        results.push({
          name,
          size,
          overflow,
          errors: [...errors],
          writes: [...writes],
        })
        continue
      }
      const target =
        name === 'provider-historical'
          ? 'Cerrar intento histórico'
          : legacy
            ? 'MARCAR COMO ENTREGADO'
            : role === 'DRIVER'
              ? 'Actualizar ejecución'
              : 'Reportar incidencia'
      let reached = false
      for (let n = 0; n < 45; n++) {
        if (
          (await page.evaluate(() =>
            document.activeElement?.textContent?.trim(),
          )) === target
        ) {
          reached = true
          break
        }
        await page.keyboard.press('Tab')
      }
      expect(reached).toBe(true)
      await page.keyboard.press('Enter')
      if (role !== 'DRIVER') {
        await expect(page.getByRole('dialog')).toBeVisible()
        if (name === 'provider-historical')
          await page.screenshot({
            path: `test-results/driver-authority/historical-confirm-${size}.png`,
            fullPage: true,
          })
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }
      results.push({
        name,
        size,
        overflow,
        focus,
        errors: [...errors],
        writes: [...writes],
      })
    }
    await context.close()
  }
  console.log(JSON.stringify(results, null, 2))
  fs.writeFileSync(
    'test-results/driver-authority/results.json',
    JSON.stringify(results, null, 2),
  )
} finally {
  await browser.close()
}
