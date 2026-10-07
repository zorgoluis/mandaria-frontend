/** Browser -> real proxy transport -> Nest -> PostgreSQL. No Playwright API interception. */
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { startRealHarness } from './customer-real-harness.mjs'
const root = process.cwd(),
  out = resolve(root, 'test-results/v117-browser-real')
await fs.mkdir(out, { recursive: true })
const results = [],
  errors = []
const resume = process.env.V117_BROWSER_RESUME === 'true'
const from = Number(process.env.V117_BROWSER_FROM ?? 1)
let h,
  browser,
  step = 'bootstrap'
const logins = []
const record = (name) => {
  results.push({ name, result: 'PASS' })
  console.log('PASS: ' + name)
}
async function login(page, email) {
  while (logins.filter((t) => Date.now() - t < 61000).length >= 3)
    await new Promise((r) => setTimeout(r, 1000))
  await page.goto(h.web + '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.locator('input[name=password]').fill(h.password)
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  assert.equal((await response).status(), 200)
  logins.push(Date.now())
  await page.locator('.user-trigger').waitFor()
}
async function logout(page) {
  await page.locator('.user-trigger').click()
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .waitFor()
}
async function register(page, email, type) {
  await page.goto(h.web + '/customer/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Tipo de cliente').selectOption(type)
  await page
    .getByLabel('Nombre', { exact: true })
    .fill('Cliente sintético ' + type)
  if (type === 'BUSINESS')
    await page
      .getByLabel('Nombre del negocio (opcional)')
      .fill('Negocio sintético')
  await page
    .getByRole('button', { name: 'Solicitar registro', exact: true })
    .click()
  await page.getByText(/Solicitud recibida/).waitFor()
  const link = await h.mail(email)
  assert.equal(new URL(link).origin, h.web)
  await page.goto(link)
  await page.getByLabel('Nueva contraseña').fill(h.password)
  assert.equal(new URL(page.url()).hash, '')
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.getByRole('heading', { name: 'Confirmación completada' }).waitFor()
  const u = await h.db.user.findUniqueOrThrow({ where: { email } })
  assert.ok(u.emailVerifiedAt)
  await login(page, email)
}
async function fillQuote(page, payer = 'REQUESTER') {
  await page.goto(h.web + '/customer/new')
  for (const [label, value] of [
    ['Latitud de origen', '17.42'],
    ['Longitud de origen', '-93.38'],
    ['Latitud de destino', '17.45'],
    ['Longitud de destino', '-93.35'],
  ])
    await page.getByLabel(label).fill(value)
  await page.getByLabel('Pagador del envío').selectOption(payer)
}
async function quote(page, payer = 'REQUESTER') {
  await fillQuote(page, payer)
  await page.getByRole('button', { name: 'Obtener precotización' }).click()
  await page.getByRole('heading', { name: /^MPQ-/ }).waitFor()
  return (await page.getByRole('heading', { name: /^MPQ-/ }).innerText()).trim()
}
async function convert(page, payer = 'REQUESTER') {
  for (const place of ['origen', 'destino']) {
    await page.getByLabel('Dirección de ' + place).fill('Dirección sintética')
    await page.getByLabel('Contacto de ' + place).fill('Contacto sintético')
    await page.getByLabel('Teléfono de ' + place).fill('0000000000')
  }
  await page.getByLabel('Descripción del paquete').fill('Paquete sintético')
  await page.getByLabel('Valor de mercancía en MXN').fill('100')
  if (payer === 'REQUESTER') {
    await page.getByLabel('Nombre del pagador').fill('Pagador sintético')
    await page.getByLabel('Teléfono del pagador').fill('0000000000')
  }
  await page
    .getByRole('button', { name: 'Crear solicitud y revisar términos' })
    .click()
  await page
    .getByRole('heading', { name: 'Revisar y autorizar envío' })
    .waitFor()
  return new URL(page.url()).pathname.split('/').pop()
}
async function cancel(page, mdr) {
  await page.goto(h.web + '/customer/requests/' + mdr)
  await page
    .getByLabel('Motivo de cancelación')
    .fill('Cancelación sintética legal')
  await page.getByLabel('Confirmo que deseo cancelar').check()
  await page.getByRole('button', { name: 'Solicitar cancelación' }).click()
  await page.getByText('Cancelada', { exact: true }).first().waitFor()
}
async function newContext() {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  const p = await c.newPage()
  p.setDefaultTimeout(30000)
  p.on('dialog', (d) => d.accept())
  p.on('pageerror', () => errors.push('Browser pageerror'))
  return { c, p }
}
try {
  h = await startRealHarness()
  browser = await chromium.launch({ headless: true })
  const { p: personal } = await newContext()
  let mdr
  if (!resume) {
    step = '1 register verify personal'
    console.log('STEP ' + step)
    await register(personal, h.emails.personal, 'PERSONAL')
    record('1 Registro, confirmación desde correo local y acceso PERSONAL')
    step = '2 personal quote convert'
    const mpq = await quote(personal)
    mdr = await convert(personal)
    assert.match(mpq, /^MPQ-/)
    assert.match(mdr, /^MDR-/)
    await personal
      .getByText(/55.00 MXN/)
      .first()
      .waitFor()
    assert.equal(
      await personal
        .getByLabel('Acepto el importe, vigencia y condiciones del envío')
        .isChecked(),
      false,
    )
    await personal.screenshot({
      path: out + '/personal-consent.png',
      fullPage: true,
    })
    step = '7 consent another browser'
    const { p: otherSession } = await newContext()
    await login(otherSession, h.emails.personal)
    await otherSession.goto(h.web + '/customer/requests/' + mdr)
    await otherSession
      .getByRole('heading', { name: 'Revisar y autorizar envío' })
      .waitFor()
    assert.equal(
      await otherSession.evaluate(() =>
        Object.keys(localStorage).some((k) =>
          k.startsWith('mandaria.customer.reference.'),
        ),
      ),
      false,
    )
    await otherSession
      .getByLabel('Acepto el importe, vigencia y condiciones del envío')
      .check()
    await otherSession
      .getByRole('button', { name: 'Autorizar y solicitar servicio' })
      .click()
    await otherSession.getByText('Buscando ejecutor', { exact: true }).waitFor()
    record('2 PERSONAL: cotización, conversión, consentimiento y consulta')
    record(
      '7 Consentimiento desde sesión limpia con MDR propia y sin vínculo MPQ local',
    )
  } else if (from <= 3) {
    await login(personal, h.emails.personal)
    mdr = h.existingPersonalMdr
  }
  if (from <= 3) {
    step = '3 personal limit and cancel'
    await personal.goto(h.web + '/customer/new')
    await personal
      .getByRole('heading', { name: 'Cupo no disponible' })
      .waitFor()
    assert.equal(
      await personal
        .getByRole('button', { name: 'Obtener precotización' })
        .count(),
      0,
    )
    await cancel(personal, mdr)
    record(
      '3 Segunda solicitud PERSONAL bloqueada; cancelación legal confirmada',
    )
  }
  if (from <= 6) {
    step = '4 business multiple payers'
    const { p: business } = await newContext()
    let b1 = h.existingBusinessMdr
    if (b1) {
      await login(business, h.emails.business)
    } else {
      await register(business, h.emails.business, 'BUSINESS')
      await quote(business, 'REQUESTER')
      b1 = await convert(business, 'REQUESTER')
    }
    await quote(business, 'RECIPIENT')
    const b2 = await convert(business, 'RECIPIENT')
    assert.notEqual(b1, b2)
    await business.goto(h.web + '/customer')
    await business.getByText(/Activas: 2/).waitFor()
    await business.screenshot({
      path: out + '/business-two-active.png',
      fullPage: true,
    })
    record(
      '4 BUSINESS: dos solicitudes simultáneas y pagadores REQUESTER/RECIPIENT',
    )
    step = '5 lost response reload'
    await fillQuote(business)
    h.arm('/api/v1/customer/delivery-prequotes', 'lose')
    await business
      .getByRole('button', { name: 'Obtener precotización' })
      .click()
    await business
      .getByRole('heading', { name: 'Pendiente de reconciliación' })
      .waitFor()
    await business.reload()
    const pending = await business.evaluate(() =>
      JSON.parse(localStorage.getItem('mandaria.customer.pending.v1')),
    )
    assert.equal(pending.length, 1)
    assert.ok(!JSON.stringify(pending).includes('Contacto'))
    await business.getByRole('button', { name: 'Consultar resultado' }).click()
    await business.getByRole('heading', { name: /^MPQ-/ }).waitFor()
    assert.equal(h.traffic.filter((x) => x.mode === 'lose').length, 1)
    record(
      '5 Respuesta MPQ aplicada perdida, recarga sin cuerpo y recuperación APPLIED',
    )
    step = '6 uncertain close timeout'
    await fillQuote(business)
    h.arm('/api/v1/customer/delivery-prequotes', 'delay-request')
    await business
      .getByRole('button', { name: 'Obtener precotización' })
      .click()
    await business
      .getByRole('heading', { name: 'Pendiente de reconciliación' })
      .waitFor()
    await business.reload()
    await business.getByRole('button', { name: 'Consultar resultado' }).click()
    await business
      .getByLabel('Confirmo el cierre técnico de este intento')
      .waitFor()
    step = '9 customer switch'
    await logout(business)
    await login(business, h.emails.personal)
    await business.goto(h.web + '/customer')
    await business.getByText(/Inicia sesión con la cuenta que inició/).waitFor()
    assert.equal(
      await business
        .getByRole('button', { name: 'Consultar resultado' })
        .count(),
      0,
    )
    await logout(business)
    await login(business, h.emails.business)
    await business.goto(h.web + '/customer/new')
    await business.getByRole('button', { name: 'Consultar resultado' }).click()
    await business
      .getByLabel('Confirmo el cierre técnico de este intento')
      .check()
    h.arm('/api/v1/customer/command-attempt/close', 'timeout')
    await business
      .getByRole('button', { name: 'Cerrar intento técnico' })
      .click()
    await business.getByText(/No se confirmó el cierre/).waitFor()
    assert.equal(
      await business.evaluate(
        () =>
          JSON.parse(localStorage.getItem('mandaria.customer.pending.v1'))
            .length,
      ),
      1,
    )
    await business.screenshot({
      path: out + '/close-timeout.png',
      fullPage: true,
    })
    await business.reload()
    await business.getByRole('button', { name: 'Consultar resultado' }).click()
    await business.getByText(/Intento cerrado para publicación/).waitFor()
    await h.release()
    assert.ok(
      h.traffic.some(
        (x) =>
          x.mode === 'delay-request' && x.code === 'COMMAND_ATTEMPT_CLOSED',
      ),
    )
    await business
      .getByLabel('Deseo preparar otra intención sin enviarla automáticamente')
      .check()
    await business
      .getByRole('button', { name: 'Preparar otra intención' })
      .click()
    await business
      .getByRole('button', { name: 'Obtener precotización' })
      .waitFor()
    record(
      '6 Cierre explícito, timeout real, bloqueo/reload y rechazo del POST original tardío',
    )
  }
  step = '8 policy receipt and current'
  const { p: a } = await newContext(),
    { p: b } = await newContext()
  await login(a, h.emails.admin)
  await login(b, h.emails.admin2)
  const url = h.web + '/integrations/' + h.integration.id,
    policy =
      '/api/v1/admin/integrations/' + h.integration.id + '/shipping-policy'
  await a.goto(url)
  await a.getByLabel('Quién paga el envío').selectOption('REQUESTER')
  await a
    .getByLabel(
      'Confirmo compatibilidad del integrador y el efecto en nuevas solicitudes',
    )
    .check()
  h.arm(policy, 'partial-response')
  await a.getByRole('button', { name: 'Guardar política' }).click()
  await a
    .getByRole('heading', { name: 'Pendiente de reconciliación' })
    .waitFor()
  await a
    .getByText(/No se pudo conectar con Mandaria/)
    .first()
    .waitFor()
  assert.equal(
    await a.evaluate(
      () =>
        JSON.parse(localStorage.getItem('mandaria.customer.pending.v1')).length,
    ),
    1,
  )
  await b.goto(url)
  await b.getByLabel('Quién paga el envío').selectOption('RECIPIENT')
  await b
    .getByLabel(
      'Confirmo compatibilidad del integrador y el efecto en nuevas solicitudes',
    )
    .check()
  await b.getByRole('button', { name: 'Guardar política' }).click()
  await b.getByText('Política guardada.', { exact: true }).waitFor()
  step = '9 admin switch'
  await logout(a)
  await login(a, h.emails.admin2)
  await a.goto(url)
  await a.getByText(/Inicia sesión con la cuenta que inició/).waitFor()
  assert.equal(
    await a.getByRole('button', { name: 'Consultar resultado' }).count(),
    0,
  )
  await logout(a)
  await login(a, h.emails.admin)
  await a.goto(url)
  await a.reload()
  await a.getByRole('button', { name: 'Consultar resultado' }).click()
  await a.getByLabel('Quién paga el envío').waitFor()
  assert.equal(
    await a.getByLabel('Quién paga el envío').inputValue(),
    'RECIPIENT',
  )
  assert.ok(
    h.traffic.some(
      (x) => x.state === 'APPLIED' && x.policy?.payer === 'REQUESTER',
    ),
  )
  await a.screenshot({
    path: out + '/policy-current-after-old-receipt.png',
    fullPage: true,
  })
  record('8 Recibo REQUESTER original separado de política RECIPIENT posterior')
  record(
    '9 Cambio de cliente/administrador conserva marcador sin acceso a intento ajeno',
  )
  const lost = h.traffic.find((x) => x.mode === 'partial-response')
  assert.ok(lost)
  assert.equal(
    h.traffic.filter((x) => x.method === 'POST' && x.keyHash === lost.keyHash)
      .length,
    1,
  )
  assert.deepEqual(errors, [])
} catch (e) {
  results.push({ name: step, result: 'FAIL', errorType: e.name })
  console.log('FAIL at ' + step + ' (' + e.name + ')')
  await fs.writeFile(
    out + '/failure-step.txt',
    String(e.message)
      .replaceAll(h?.password ?? 'UNUSED', '[redacted]')
      .replace(/#token=[^\s]+/g, '#redacted'),
  )
  // Public rendered notices only, never input values, access URL, token or response bodies.
  if (browser) {
    for (const c of browser.contexts()) {
      for (const p of c.pages()) {
        const alerts = await p
          .locator('[role=alert],.inline-error')
          .allTextContents()
          .catch(() => [])
        if (alerts.length) console.log(JSON.stringify({ alerts }))
      }
    }
  }
  process.exitCode = 1
} finally {
  await fs.writeFile(
    out + '/results.json',
    JSON.stringify(
      {
        results,
        errors,
        database: h?.identity,
        migration40: h?.migrations.some(
          (x) =>
            x.migration_name === '20261006000300_human_command_reconciliation',
        ),
        traffic: h?.traffic,
        mechanism:
          'Real HTTP transport proxy: lose drains backend response then disconnects; timeout withholds backend response for 25s (client 20s); delay-request forwards original buffered request only after explicit release. No response mocks; no browser route interception.',
      },
      null,
      2,
    ),
  )
  await browser?.close()
  await h?.close()
}
