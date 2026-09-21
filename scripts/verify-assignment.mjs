import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Mandaria V1.8 FINAL E2E — real backend and real browser, provider dispatch assignment.
// Every scenario runs against the running API; the UI ones drive Mandaria Web. The check
// refuses to run unless the backend uses the local routing provider, so it never spends on
// Google Routes. No traces, HAR, storageState or contact dumps.
const env = {
  ...(process.env.MANDARIA_BACKEND_ENV
    ? parseEnv(readFileSync(process.env.MANDARIA_BACKEND_ENV, 'utf8'))
    : {}),
  ...(existsSync('.env.e2e') ? parseEnv(readFileSync('.env.e2e', 'utf8')) : {}),
  ...process.env,
}
const web = env.E2E_WEB_URL || 'http://localhost:5173'
const base = `${env.E2E_API_URL || 'http://localhost:3000'}/api/v1`
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error(
    'This mutating validation is restricted to the local backend.',
  )
const accounts = {
  admin: {
    email: env.E2E_ADMIN_EMAIL || env.BOOTSTRAP_ADMIN_EMAIL,
    password: env.E2E_ADMIN_PASSWORD || env.BOOTSTRAP_ADMIN_PASSWORD,
  },
  providerA: {
    email: env.E2E_PROVIDER_EMAIL || 'provider-admin-a@mandaria.local',
    password: env.E2E_PROVIDER_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
  providerB: {
    email: env.E2E_PROVIDER_B_EMAIL || 'provider-admin-b@mandaria.local',
    password: env.E2E_PROVIDER_B_PASSWORD || env.LOCAL_PROVIDER_ADMIN_PASSWORD,
  },
}
if (Object.values(accounts).some((a) => !a.email || !a.password))
  throw new Error('Configure real local accounts. No credentials were printed.')
const sensitive = new Set(
  Object.entries(env)
    .filter(([k, v]) => /SECRET|PASSWORD|KEY|TOKEN/.test(k) && v.length > 8)
    .map(([, v]) => v),
)
const output = 'test-results/assignment'
mkdirSync(output, { recursive: true })
const report = { checks: [], failures: [], mutations: [], scenario: {} }
let phase = 'startup'
const begin = (name) => {
  phase = name
  console.log(`CHECK ${name}`)
}
const pass = () => {
  report.checks.push(phase)
  console.log(`PASS ${phase}`)
}

// ---------------------------------------------------------------- API layer
const tokens = {}
async function login(who) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts[who]),
  })
  assert.equal(r.status, 200, `login ${who}`)
  const t = await r.json()
  sensitive.add(t.accessToken)
  sensitive.add(t.refreshToken)
  tokens[who] = t
  return t
}
async function api(who, path, method = 'GET', body, expected) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${tokens[who].accessToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data =
    r.status === 204 ? undefined : await r.json().catch(() => undefined)
  if (expected !== undefined)
    assert.equal(
      r.status,
      expected,
      `${method} ${path.split('?')[0]} -> ${r.status} (expected ${expected}) code=${data?.code ?? '-'}`,
    )
  return { status: r.status, data }
}

// ------------------------------------------------------------ browser layer
const browser = await chromium.launch(
  env.E2E_BROWSER_CHANNEL ? { channel: env.E2E_BROWSER_CHANNEL } : {},
)
const sessions = []
async function session() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  const state = { page, console: [], refresh: null }
  sessions.push(state)
  page.on('pageerror', () => report.failures.push('Uncaught browser exception'))
  page.on('console', (m) =>
    state.console.push({ type: m.type(), text: m.text() }),
  )
  return state
}
async function uiLogin(state, who) {
  await new Promise((r) => setTimeout(r, 3000))
  await state.page.goto(`${web}/login`)
  await state.page.getByLabel('Correo electrónico').fill(accounts[who].email)
  await state.page
    .getByLabel('Contraseña', { exact: true })
    .fill(accounts[who].password)
  await state.page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await state.page.waitForURL('**/dashboard')
}
const region = (state, name) =>
  state.page.getByRole('region', { name, exact: true })
const field = (scope, label) =>
  scope.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('+ dd')
async function noHorizontalOverflow(state) {
  const overflow = await state.page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  assert.ok(overflow <= 1, `Page overflows horizontally by ${overflow}px`)
}
async function consoleAudit(state) {
  const errors = state.console.filter((c) => c.type === 'error')
  assert.ok(
    errors.every((c) =>
      /Failed to load resource.*(?:401|403|404|409)/.test(c.text),
    ),
    'Unexpected console error',
  )
  state.console = []
}

try {
  begin('Backend reachable and using the local routing provider')
  await login('admin')
  await login('providerA')
  await login('providerB')
  const quotes = (
    await api(
      'admin',
      '/admin/delivery-quotes?pageSize=1',
      'GET',
      undefined,
      200,
    )
  ).data
  assert.ok(
    quotes.items.length,
    'No quotes in the local database; run the setup first',
  )
  assert.equal(
    quotes.items[0].routingProvider,
    'local_fake',
    'Refusing to run against the paid routing provider',
  )
  pass()

  begin('Resolve the seeded V1.8 scenario')
  const A = (
    await api(
      'providerA',
      '/provider/profiles?pageSize=20',
      'GET',
      undefined,
      200,
    )
  ).data.items[0].id
  const B = (
    await api(
      'providerB',
      '/provider/profiles?pageSize=20',
      'GET',
      undefined,
      200,
    )
  ).data.items[0].id
  assert.notEqual(A, B, 'Provider A and B must differ')
  const claimed = (
    await api(
      'providerA',
      `/provider/dispatches?providerId=${A}&view=CLAIMED&pageSize=50`,
      'GET',
      undefined,
      200,
    )
  ).data.items
  // Re-runnable: several runs leave several dispatches per reference, so take the newest.
  const pick = (ref) => {
    const all = claimed
      .filter((x) => x.service?.externalReference === ref)
      .sort((x, y) => Date.parse(y.claimedAt) - Date.parse(x.claimedAt))
    assert.ok(all.length, `Missing dispatch ${ref}; run the setup first`)
    return all[0]
  }
  /** Leaves a dispatch pending so the flow always starts from the same state. */
  async function clearAssignment(dispatchId) {
    const current = (
      await api(
        'providerA',
        `/provider/dispatches/${dispatchId}/assignments?providerId=${A}`,
        'GET',
        undefined,
        200,
      )
    ).data
    if (!current.some((x) => x.status === 'ACTIVE')) return false
    await api(
      'providerA',
      `/provider/dispatches/${dispatchId}/assignment/cancel?providerId=${A}`,
      'POST',
      { reason: 'OPERATIONAL_CHANGE' },
      200,
    )
    return true
  }
  const main = pick('E2E-PREPAID')
  const advance = pick('E2E-ADVANCE')
  const busy = pick('E2E-BUSY')
  const toCancel = pick('E2E-CANCEL')
  // Reset before reading availability: earlier runs leave older dispatches still holding
  // drivers and vehicles, so every claimed dispatch of this provider is released, not just
  // the four this run will use.
  for (const d of claimed)
    if (await clearAssignment(d.id))
      report.mutations.push(`reset: cleared assignment on ${d.id}`)
  const drivers = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/available-drivers?providerId=${A}&pageSize=50`,
      'GET',
      undefined,
      200,
    )
  ).data.items
  const vehicles = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/available-vehicles?providerId=${A}&pageSize=50`,
      'GET',
      undefined,
      200,
    )
  ).data.items
  const byName = (list, key, value) => {
    const found = list.find((x) => x[key] === value)
    assert.ok(found, `Missing ${key}=${value}`)
    return found
  }
  const carlos = byName(drivers, 'name', 'Carlos')
  const pedro = byName(drivers, 'name', 'Pedro')
  const moto03 = byName(vehicles, 'identifier', 'MOTO-03')
  const moto07 = byName(vehicles, 'identifier', 'MOTO-07')
  report.scenario = {
    providerA: A,
    providerB: B,
    main: main.id,
    advance: advance.id,
    busy: busy.id,
    cancel: toCancel.id,
  }
  // V1.8 fields the OpenAPI of this branch does not document but the backend returns.
  assert.ok('assignment' in main, 'providerDispatchView must expose assignment')
  assert.ok(
    'assignmentDeadline' in main,
    'providerDispatchView must expose assignmentDeadline',
  )
  assert.ok(
    'assignmentOverdue' in main,
    'providerDispatchView must expose assignmentOverdue',
  )
  assert.equal(
    main.status,
    'CLAIMED',
    'Dispatch stays CLAIMED, there is no ASSIGNED status',
  )
  pass()

  // ---------------------------------------------------------------- UI flow
  begin('Scenario 1 — main flow: assign Carlos + MOTO-03 from Mandaria Web')
  const a = await session()
  await uiLogin(a, 'providerA')
  await a.page.goto(`${web}/services/${main.id}?providerId=${A}`)
  const panel = region(a, 'Asignación')
  await expect(panel).toBeVisible()
  await expect(
    panel.getByText(/todavía no tiene repartidor asignado/i),
  ).toBeVisible()
  await expect(
    a.page.getByRole('button', { name: 'LIBERAR SERVICIO' }),
  ).toBeEnabled()
  await panel.getByRole('button', { name: 'ASIGNAR' }).click()
  const dialog = a.page.getByRole('dialog')
  await dialog.getByRole('radio', { name: /^Carlos/ }).click()
  await dialog.getByRole('radio', { name: /^MOTO-03/ }).click()
  const [assignResponse] = await Promise.all([
    a.page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname.endsWith('/assignment'),
    ),
    dialog.getByRole('button', { name: 'CONFIRMAR ASIGNACIÓN' }).click(),
  ])
  assert.equal(assignResponse.status(), 201, 'assign must answer 201')
  report.mutations.push(`assignment created on ${main.id}`)
  await expect(field(panel, 'Repartidor')).toHaveText('Carlos')
  await expect(field(panel, 'Vehículo')).toHaveText('MOTO-03 · Motocicleta')
  await expect(field(panel, 'Estado')).toHaveText('Asignado')
  // The backend, not the browser, is the authority.
  const afterAssign = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/assignments?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  const activeNow = afterAssign.filter((x) => x.status === 'ACTIVE')
  assert.equal(activeNow.length, 1, 'exactly one ACTIVE assignment')
  assert.equal(activeNow[0].driver.name, 'Carlos')
  assert.equal(activeNow[0].vehicle.identifier, 'MOTO-03')
  assert.equal(activeNow[0].providerId, A)
  await noHorizontalOverflow(a)
  pass()

  begin('Scenario 2 — prepaid goods: no false advance')
  // Amounts come from the backend, never from the test: the tariff band decides the fee.
  const mainNow = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(mainNow.service.goods.paymentMode, 'PREPAID')
  assert.equal(mainNow.service.goods.driverAdvancesGoods, false)
  assert.equal(mainNow.service.goods.driverAdvanceAmount, null)
  const fee = Number(mainNow.service.deliveryFee.amount)
  const goodsValue = Number(mainNow.service.goods.value)
  const mxn = (n) => `$${n.toFixed(2)} MXN`
  await a.page.goto(`${web}/services/${main.id}?providerId=${A}`)
  const moneyText = await region(a, 'Cobro y mercancía').innerText()
  assert.ok(moneyText.includes(mxn(fee)), `missing delivery fee ${mxn(fee)}`)
  assert.ok(
    moneyText.includes(mxn(goodsValue)),
    `missing goods value ${mxn(goodsValue)}`,
  )
  assert.ok(moneyText.includes('Mercancía prepagada'), 'missing payment mode')
  // Separate concepts: the UI never presents an operational total.
  assert.ok(
    !moneyText.includes(mxn(fee + goodsValue)),
    'goods and fee were summed',
  )
  assert.ok(!/adelanta/i.test(moneyText), 'prepaid must not mention an advance')
  report.scenario.prepaidFee = mainNow.service.deliveryFee.amount
  pass()

  begin('Scenario 3 — courier advance: the driver must carry the cash')
  const advanceNow = (
    await api(
      'providerA',
      `/provider/dispatches/${advance.id}?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(advanceNow.service.goods.paymentMode, 'COURIER_ADVANCE')
  assert.equal(advanceNow.service.goods.driverAdvancesGoods, true)
  const advFee = Number(advanceNow.service.deliveryFee.amount)
  const advGoods = Number(advanceNow.service.goods.driverAdvanceAmount)
  const advMxn = (n) => `$${n.toFixed(2)} MXN`
  await a.page.goto(`${web}/services/${advance.id}?providerId=${A}`)
  const advancePanel = region(a, 'Asignación')
  await advancePanel.getByRole('button', { name: 'ASIGNAR' }).click()
  const advanceDialog = a.page.getByRole('dialog')
  const advanceText = await advanceDialog.innerText()
  assert.ok(
    advanceText.includes(`deberá entregar ${advMxn(advGoods)} al comercio`),
    `missing advance amount ${advMxn(advGoods)}`,
  )
  assert.ok(
    /Verifica que el repartidor cuente con el efectivo/i.test(advanceText),
    'missing cash warning',
  )
  assert.ok(
    /Mandaria no conoce el saldo/i.test(advanceText),
    'missing no-wallet disclaimer',
  )
  // Delivery fee and goods are never added into one operational total.
  assert.ok(
    !advanceText.includes(advMxn(advFee + advGoods)),
    'goods and fee were summed',
  )
  assert.ok(advanceText.includes(advMxn(advFee)), 'missing delivery fee')
  report.scenario.advanceAmount = advanceNow.service.goods.driverAdvanceAmount
  report.scenario.advanceFee = advanceNow.service.deliveryFee.amount
  await advanceDialog.getByRole('button', { name: 'Volver' }).click()
  pass()

  begin('Scenario 4 — busy driver is rejected and the UI refreshes candidates')
  const busyDriver = await api(
    'providerA',
    `/provider/dispatches/${busy.id}/assignment?providerId=${A}`,
    'POST',
    { driverId: carlos.id, vehicleId: moto07.id },
    409,
  )
  assert.equal(busyDriver.data.code, 'DRIVER_BUSY')
  const freshDrivers = (
    await api(
      'providerA',
      `/provider/dispatches/${busy.id}/available-drivers?providerId=${A}&pageSize=50`,
      'GET',
      undefined,
      200,
    )
  ).data.items
  assert.ok(
    !freshDrivers.some((d) => d.id === carlos.id),
    'Carlos must disappear from available-drivers while assigned',
  )
  pass()

  begin('Scenario 5 — busy vehicle is rejected')
  const busyVehicle = await api(
    'providerA',
    `/provider/dispatches/${busy.id}/assignment?providerId=${A}`,
    'POST',
    { driverId: pedro.id, vehicleId: moto03.id },
    409,
  )
  assert.equal(busyVehicle.data.code, 'VEHICLE_BUSY')
  const freshVehicles = (
    await api(
      'providerA',
      `/provider/dispatches/${busy.id}/available-vehicles?providerId=${A}&pageSize=50`,
      'GET',
      undefined,
      200,
    )
  ).data.items
  assert.ok(
    !freshVehicles.some((v) => v.id === moto03.id),
    'MOTO-03 must disappear from available-vehicles while assigned',
  )
  pass()

  begin('Scenario 6 — reassignment from the UI, history and single ACTIVE')
  await a.page.goto(`${web}/services/${main.id}?providerId=${A}`)
  const rePanel = region(a, 'Asignación')
  await rePanel.getByRole('button', { name: 'REASIGNAR' }).click()
  const reDialog = a.page.getByRole('dialog')
  await reDialog.getByRole('radio', { name: /^Pedro/ }).click()
  await reDialog.getByRole('radio', { name: /^MOTO-07/ }).click()
  await reDialog
    .getByRole('radio', { name: 'Problema con el vehículo' })
    .click()
  const [reassignResponse] = await Promise.all([
    a.page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname.endsWith('/assignment/reassign'),
    ),
    reDialog.getByRole('button', { name: 'Confirmar reasignación' }).click(),
  ])
  assert.equal(reassignResponse.status(), 200)
  report.mutations.push(`assignment reassigned on ${main.id}`)
  await expect(field(rePanel, 'Repartidor')).toHaveText('Pedro')
  const history = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/assignments?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(history.filter((x) => x.status === 'ACTIVE').length, 1)
  assert.equal(history[0].driver.name, 'Pedro')
  const carlosEntry = history.find((x) => x.driver.name === 'Carlos')
  assert.equal(
    carlosEntry.status,
    'REASSIGNED',
    'Carlos must become REASSIGNED',
  )
  assert.equal(carlosEntry.endReason, 'VEHICLE_ISSUE')
  // History is visible with the current one marked.
  const entries = rePanel.getByRole('listitem')
  await expect(entries.first()).toContainText('Pedro')
  await expect(entries.first()).toContainText('Asignación vigente')
  // The dispatch keeps every past attempt, so these labels repeat by design.
  await expect(rePanel.getByText('Carlos').first()).toBeVisible()
  await expect(rePanel.getByText('Reasignado').first()).toBeVisible()
  await expect(rePanel.getByText('Asignación vigente')).toHaveCount(1)
  pass()

  begin('Scenario 7 — release protection: cancel the assignment first')
  const blocked = await api(
    'providerA',
    `/provider/dispatches/${main.id}/release?providerId=${A}`,
    'POST',
    { reason: 'Prueba de protección de liberación' },
    409,
  )
  assert.equal(blocked.data.code, 'DISPATCH_HAS_ACTIVE_ASSIGNMENT')
  await a.page.reload()
  const guardPanel = region(a, 'Asignación')
  await expect(
    guardPanel.getByRole('button', { name: 'CANCELAR ASIGNACIÓN' }),
  ).toBeVisible()
  await expect(
    a.page.getByRole('button', { name: 'LIBERAR SERVICIO' }),
  ).toBeDisabled()
  await guardPanel.getByRole('button', { name: 'CANCELAR ASIGNACIÓN' }).click()
  const cancelDialog = a.page.getByRole('dialog')
  const [cancelResponse] = await Promise.all([
    a.page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname.endsWith('/assignment/cancel'),
    ),
    cancelDialog.getByRole('button', { name: 'Cancelar asignación' }).click(),
  ])
  assert.equal(cancelResponse.status(), 200)
  report.mutations.push(`assignment cancelled on ${main.id}`)
  await expect(
    a.page.getByRole('button', { name: 'LIBERAR SERVICIO' }),
  ).toBeEnabled()
  const afterCancel = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/assignments?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(afterCancel.filter((x) => x.status === 'ACTIVE').length, 0)
  // Resources are free again.
  const freed = (
    await api(
      'providerA',
      `/provider/dispatches/${busy.id}/available-drivers?providerId=${A}&pageSize=50`,
      'GET',
      undefined,
      200,
    )
  ).data.items
  assert.ok(
    freed.some((d) => d.name === 'Pedro'),
    'Pedro must be available after cancelling',
  )
  pass()

  begin('Scenario 8 — provider isolation in both directions')
  // A cannot use B's driver or vehicle.
  const bDrivers = (
    await api(
      'providerB',
      `/provider/dispatches?providerId=${B}&view=ALL&pageSize=5`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.ok(Array.isArray(bDrivers.items), 'B can read its own dispatches')
  const foreign = await api(
    'providerA',
    `/provider/dispatches/${busy.id}/assignment?providerId=${A}`,
    'POST',
    { driverId: '00000000-0000-4000-8000-000000000000', vehicleId: moto07.id },
  )
  assert.ok(
    [400, 404, 409].includes(foreign.status),
    `foreign driver -> ${foreign.status}`,
  )
  // B cannot touch A's dispatch at all.
  const bOnA = await api(
    'providerB',
    `/provider/dispatches/${main.id}?providerId=${B}`,
    'GET',
  )
  // B was offered the same dispatch, so by contract it keeps SUMMARY visibility: status and
  // times only. What matters is that no operational data crosses the provider boundary.
  if (bOnA.status === 200) {
    assert.equal(
      bOnA.data.access,
      'SUMMARY',
      'a non-owner must only get SUMMARY',
    )
    assert.equal(bOnA.data.service, null, 'SUMMARY must not expose the service')
    assert.equal(
      bOnA.data.assignment,
      null,
      'SUMMARY must not expose the assignment',
    )
    assert.equal(bOnA.data.claimedByMe, false)
    const leak = JSON.stringify(bOnA.data).match(
      /Carlos|Pedro|Luis|MOTO-|Comercio Centro|Cliente Norte|961 000/g,
    )
    assert.equal(
      leak,
      null,
      `operational data leaked to another provider: ${leak}`,
    )
  } else {
    assert.ok(
      [403, 404].includes(bOnA.status),
      `B reading A dispatch -> ${bOnA.status}`,
    )
  }
  // B can never read A's assignment history nor A's availability lists.
  const bHistory = await api(
    'providerB',
    `/provider/dispatches/${main.id}/assignments?providerId=${B}`,
    'GET',
  )
  if (bHistory.status === 200)
    assert.deepEqual(bHistory.data, [], 'B must not see the assignments of A')
  else assert.ok([403, 404, 409].includes(bHistory.status))
  for (const list of ['available-drivers', 'available-vehicles']) {
    const r = await api(
      'providerB',
      `/provider/dispatches/${main.id}/${list}?providerId=${B}`,
      'GET',
    )
    assert.ok(
      [403, 404, 409].includes(r.status),
      `B reading ${list} -> ${r.status}`,
    )
  }
  const bAssign = await api(
    'providerB',
    `/provider/dispatches/${main.id}/assignment?providerId=${B}`,
    'POST',
    { driverId: carlos.id, vehicleId: moto03.id },
  )
  assert.ok(
    [403, 404, 409].includes(bAssign.status),
    `B assigning on A -> ${bAssign.status}`,
  )
  // And A cannot borrow B's provider id.
  const aAsB = await api(
    'providerA',
    `/provider/dispatches?providerId=${B}&view=CLAIMED`,
    'GET',
  )
  assert.ok(
    [403, 404, 409].includes(aAsB.status),
    `A using B providerId -> ${aAsB.status}`,
  )
  pass()

  begin('Scenario 9 — concurrency invariants hold in the backend')
  await api(
    'providerA',
    `/provider/dispatches/${main.id}/assignment?providerId=${A}`,
    'POST',
    { driverId: carlos.id, vehicleId: moto03.id },
    201,
  )
  const results = await Promise.all([
    api(
      'providerA',
      `/provider/dispatches/${main.id}/assignment/reassign?providerId=${A}`,
      'POST',
      {
        driverId: pedro.id,
        vehicleId: moto07.id,
        reason: 'OPERATIONAL_CHANGE',
      },
    ),
    api(
      'providerA',
      `/provider/dispatches/${main.id}/assignment/reassign?providerId=${A}`,
      'POST',
      {
        driverId: carlos.id,
        vehicleId: moto03.id,
        reason: 'OPERATIONAL_CHANGE',
      },
    ),
  ])
  console.log(
    '  concurrent reassign statuses:',
    results.map((r) => r.status).join(', '),
  )
  const invariant = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/assignments?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.equal(
    invariant.filter((x) => x.status === 'ACTIVE').length,
    1,
    'exactly one ACTIVE assignment per dispatch after concurrent reassignments',
  )
  const activeDriver = invariant.find((x) => x.status === 'ACTIVE')
  const allAssignments = (
    await api(
      'admin',
      `/admin/dispatches/${main.id}/assignments`,
      'GET',
      undefined,
      200,
    )
  ).data
  const activeByDriver = allAssignments.filter(
    (x) => x.status === 'ACTIVE' && x.driver.id === activeDriver.driver.id,
  )
  assert.equal(activeByDriver.length, 1, 'one ACTIVE assignment per driver')
  pass()

  begin('Scenario 10 — official cancellation frees the resources')
  const cancelTarget = toCancel
  if (cancelTarget.status !== 'CLAIMED') {
    console.log(
      '  SKIP: the cancel target was already cancelled in a previous run',
    )
    report.scenario.cancellationSkipped = true
  } else {
    const candidates = (
      await api(
        'providerA',
        `/provider/dispatches/${cancelTarget.id}/available-drivers?providerId=${A}&pageSize=50`,
        'GET',
        undefined,
        200,
      )
    ).data.items
    const fleet = (
      await api(
        'providerA',
        `/provider/dispatches/${cancelTarget.id}/available-vehicles?providerId=${A}&pageSize=50`,
        'GET',
        undefined,
        200,
      )
    ).data.items
    // V1.4 pairing: a paired driver only drives its own vehicle and a paired vehicle only
    // carries its own driver, so the first item of each list is not always a valid pair.
    const pair =
      candidates
        .filter((d) => d.pairedVehicle)
        .map((d) => ({
          driverId: d.id,
          vehicleId: fleet.find((v) => v.id === d.pairedVehicle.id)?.id,
        }))
        .find((p) => p.vehicleId) ??
      (() => {
        const driver = candidates.find((d) => !d.pairedVehicle)
        const vehicle = fleet.find((v) => !v.pairedDriver)
        return driver && vehicle
          ? { driverId: driver.id, vehicleId: vehicle.id }
          : undefined
      })()
    assert.ok(pair, 'No compatible driver and vehicle pair is available')
    await api(
      'providerA',
      `/provider/dispatches/${cancelTarget.id}/assignment?providerId=${A}`,
      'POST',
      pair,
      201,
    )
    report.mutations.push(`assignment created on ${cancelTarget.id}`)
    const requestPublicId = cancelTarget.service.deliveryRequestPublicId
    await api(
      'admin',
      `/admin/delivery-requests/${requestPublicId}/cancel`,
      'POST',
      { reason: 'Cancelación oficial del CHECK V1.8' },
      200,
    )
    report.mutations.push(`delivery request ${requestPublicId} cancelled`)
    const afterOfficial = (
      await api(
        'admin',
        `/admin/dispatches/${cancelTarget.id}`,
        'GET',
        undefined,
        200,
      )
    ).data
    assert.equal(
      afterOfficial.status,
      'CANCELLED',
      'dispatch must follow the cancelled request',
    )
    const assignmentsAfter = (
      await api(
        'admin',
        `/admin/dispatches/${cancelTarget.id}/assignments`,
        'GET',
        undefined,
        200,
      )
    ).data
    const stillActive = assignmentsAfter.filter((x) => x.status === 'ACTIVE')
    report.scenario.cancelledDispatchActiveAssignments = stillActive.length
    assert.equal(
      stillActive.length,
      0,
      'cancelling the request must end the ACTIVE assignment',
    )
  }
  pass()

  begin('Scenario 11 — full history with exactly one ACTIVE')
  const long = (
    await api(
      'providerA',
      `/provider/dispatches/${main.id}/assignments?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.ok(
    long.length >= 3,
    `history must keep every attempt, got ${long.length}`,
  )
  assert.equal(long.filter((x) => x.status === 'ACTIVE').length, 1)
  for (let i = 1; i < long.length; i++)
    assert.ok(
      Date.parse(long[i - 1].assignedAt) >= Date.parse(long[i].assignedAt),
      'history must be newest first',
    )
  await a.page.goto(`${web}/services/${main.id}?providerId=${A}`)
  const histPanel = region(a, 'Asignación')
  await expect(histPanel.getByText('Asignación vigente')).toHaveCount(1)
  await expect(histPanel.getByRole('listitem')).toHaveCount(long.length)
  pass()

  begin('Scenario 12 — assignment deadline is not the claim window')
  const fresh = (
    await api(
      'providerA',
      `/provider/dispatches/${busy.id}?providerId=${A}`,
      'GET',
      undefined,
      200,
    )
  ).data
  assert.ok(
    fresh.assignmentDeadline,
    'a CLAIMED dispatch must carry assignmentDeadline',
  )
  assert.notEqual(
    fresh.assignmentDeadline,
    fresh.expiresAt,
    'assignmentDeadline must differ from the claim window expiresAt',
  )
  assert.equal(typeof fresh.assignmentOverdue, 'boolean')
  await a.page.goto(`${web}/services/${busy.id}?providerId=${A}`)
  const deadlinePanel = region(a, 'Asignación')
  await expect(
    deadlinePanel.getByText(/Tiempo esperado para asignar|Asignación demorada/),
  ).toBeVisible()
  pass()

  begin('Role visibility and V1.7 regression in the browser')
  const s = await session()
  await uiLogin(s, 'admin')
  await s.page.goto(`${web}/dispatches/${main.id}`)
  const audit = region(s, 'Asignaciones')
  await expect(audit).toBeVisible()
  for (const action of ['ASIGNAR', 'REASIGNAR', 'CANCELAR ASIGNACIÓN'])
    await expect(s.page.getByRole('button', { name: action })).toHaveCount(0)
  const nav = s.page.getByRole('navigation', { name: 'Navegación principal' })
  for (const [name, heading] of [
    ['Integraciones', 'Clientes B2B'],
    ['Proveedores', 'Tu red logística'],
    ['Solicitudes', 'Solicitudes de entrega'],
    ['Cotizaciones', 'Cotizaciones emitidas'],
    ['Zonas de servicio', 'Cobertura configurada'],
    ['Despachos', 'Despachos'],
  ]) {
    const link = nav.getByRole('link', { name, exact: true })
    if ((await link.count()) === 0) continue
    await link.click()
    await expect(
      s.page.getByRole('heading', { name: heading, exact: true }).first(),
    ).toBeVisible()
  }
  await consoleAudit(s)
  await consoleAudit(a)
  pass()

  begin('Responsive: the assignment panel works on a phone')
  await a.page.setViewportSize({ width: 390, height: 844 })
  await a.page.goto(`${web}/services/${busy.id}?providerId=${A}`)
  const small = region(a, 'Asignación')
  await expect(small.getByRole('button', { name: 'ASIGNAR' })).toBeVisible()
  await small.getByRole('button', { name: 'ASIGNAR' }).click()
  await expect(
    a.page.getByRole('dialog').getByRole('radio').first(),
  ).toBeVisible()
  await noHorizontalOverflow(a)
  await a.page
    .getByRole('dialog')
    .getByRole('button', { name: 'Volver' })
    .click()
  await a.page.setViewportSize({ width: 1440, height: 1000 })
  pass()

  begin('No secret ever reaches the browser storage or the URL')
  for (const state of sessions) {
    const stored = await state.page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    )
    const parsed = JSON.parse(stored)
    assert.deepEqual(parsed.local, {})
    assert.ok(
      Object.keys(parsed.session).every((k) => k === 'mandaria.refresh'),
    )
    for (const value of sensitive)
      assert.ok(
        !stored.includes(value) || value === parsed.session['mandaria.refresh'],
        'A secret leaked into storage',
      )
    assert.ok(!state.page.url().includes('token'), 'No token in the URL')
  }
  pass()

  assert.deepEqual(report.failures, [])
} catch (error) {
  report.failures.push(phase)
  console.error(
    `FAIL ${phase}: ${error instanceof Error ? error.name : 'Error'}`,
  )
  let message = error instanceof Error ? error.message : 'Unknown failure'
  for (const value of sensitive)
    message = message.replaceAll(value, '[REDACTED]')
  console.error(message.split('\n').slice(0, 6).join('\n'))
  writeFileSync(`${output}/failure.txt`, message)
  for (const [i, state] of sessions.entries())
    await state.page
      .screenshot({
        path: `${output}/failure-${i}.png`,
        fullPage: true,
        mask: [state.page.locator('input')],
      })
      .catch(() => undefined)
  process.exitCode = 1
} finally {
  for (const who of Object.keys(tokens))
    await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens[who].refreshToken }),
    }).catch(() => undefined)
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
