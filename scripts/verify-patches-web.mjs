import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const root = process.cwd(),
  backend =
    'C:/Users/zorgl/.codex/worktrees/mandaria-web-contract/mandaria-backend',
  out = resolve('test-results/patches-web'),
  work = await fs.mkdtemp(join(tmpdir(), 'patches-web-'))
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const frontend = {
  commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
}
await fs.mkdir(out, { recursive: true })
const req = createRequire(join(backend, 'package.json'))
const ts = req('typescript')
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL:
    'postgresql://postgres@127.0.0.1:56862/contract_web_visual_test',
  TEST_DATABASE_URL:
    'postgresql://postgres@127.0.0.1:56862/contract_web_visual_test',
  JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  INTEGRATION_JWT_SECRET: randomBytes(48).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: '3600',
  INTEGRATION_ACCESS_TOKEN_EXPIRES_IN: '3600',
  DISPATCH_TTL_MINUTES: '60',
  LOCAL_DELIVERY_ASSIGNMENT_TTL_MINUTES: '30',
  INDEPENDENT_DRIVER_MAX_VEHICLES: '2',
  MAIL_PROVIDER: 'local_outbox',
  LOCAL_MAIL_OUTBOX_DIR: join(work, 'mail'),
  ROUTING_PROVIDER: 'local_fake',
  B2B_WEBHOOK_POLL_SECONDS: '0',
  VITE_API_URL: 'http://127.0.0.1:4185',
  VITE_GOOGLE_MAPS_API_KEY: '',
})
delete process.env.JWT_ACCESS_EXPIRES_IN
delete process.env.INTEGRATION_ACCESS_TOKEN_EXPIRES_IN
const transpile = (s) =>
  ts.transpileModule(s, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText
for (const f of ['credit-policies', 'credits'])
  await fs.writeFile(
    join(work, f + '.mjs'),
    transpile(
      (
        await fs.readFile(join(backend, 'test/support/' + f + '.ts'), 'utf8')
      ).replaceAll('./credit-policies.js', './credit-policies.mjs'),
    ),
  )
let source = (
  await fs.readFile(
    join(backend, 'test/delivery-completion.e2e-spec.ts'),
    'utf8',
  )
).replace(/\r\n/g, '\n')
let constants = source.slice(
  source.indexOf('const prisma ='),
  source.indexOf('async function bootstrap()'),
)
let open = source.slice(
  source.indexOf('async function openDispatch()'),
  source.indexOf('const claim ='),
)
open = open.replaceAll(
  '.expect(201)',
  '.expect(res=>{if(res.status>=400) console.log(JSON.stringify({status:res.status,code:res.body.code,message:res.body.message}))}).expect(201)',
)
let seed = source.slice(
  source.indexOf('beforeAll(async () => {\n  // Leftovers'),
)
if (!seed)
  seed = source.slice(
    source.indexOf('beforeAll(async () => {\r\n  // Leftovers'),
  )
seed = seed
  .slice(seed.indexOf('{') + 1, seed.indexOf('}, 180000);'))
  .replace('await removeFixtures();', '')
const header = `import {createRequire} from 'node:module';import {randomBytes,randomUUID} from 'node:crypto';const require=createRequire(${JSON.stringify(join(backend, 'package.json'))});require('reflect-metadata');const {PrismaClient}=require('@prisma/client'),argon2=require('argon2'),request=require('supertest');import {ensureTestCreditPolicies} from './credit-policies.mjs';import {fundForAward} from './credits.mjs';const databaseUrl=process.env.DATABASE_URL;`
const bootstrap = `async function bootstrap(){const {NestFactory}=require('@nestjs/core');const {AppModule}=await import(${JSON.stringify(pathToFileURL(join(backend, 'dist/app.module.js')).href)});const {setup}=await import(${JSON.stringify(pathToFileURL(join(backend, 'dist/setup.js')).href)});const instance=await NestFactory.create(AppModule,{logger:false,bodyParser:false});setup(instance);await instance.init();return instance}`
await fs.writeFile(
  join(work, 'seed.mjs'),
  transpile(
    header +
      constants +
      bootstrap +
      open +
      `export async function prepare(){const migrations=await prisma.$queryRawUnsafe('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL');if(migrations.length!==32)throw Error('Wrong migration set');${seed};app=await bootstrap();await app.listen(43185,'127.0.0.1');return{app,prisma,openDispatch,password,mail,drivers,vehicles,providers,t,migrations}}`,
  ),
)
process.chdir(work)
let setup, vite, browser
const results = [],
  errors = []
let step = 'prepare'
try {
  setup = await import(pathToFileURL(join(work, 'seed.mjs'))).then((m) =>
    m.prepare(),
  )
  const {
    app,
    prisma,
    openDispatch,
    password,
    mail,
    drivers,
    vehicles,
    providers,
    t,
  } = setup
  await fs.writeFile(
    join(out, 'identity.json'),
    JSON.stringify(
      {
        frontend,
        backend: 'patches 30f625b',
        database: 'contract_web_visual_test',
        migrations: setup.migrations,
      },
      null,
      2,
    ),
  )
  vite = await createServer({
    root,
    configFile: join(root, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port: 4185,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:43185', changeOrigin: true },
      },
    },
  })
  await vite.listen()
  browser = await chromium.launch({ headless: true })
  const call = async (path, token) => {
    const r = await fetch('http://127.0.0.1:43185/api/v1' + path, {
      headers: { Authorization: 'Bearer ' + token },
    })
    assert.equal(r.status, 200)
    return r.json()
  }
  async function login(name) {
    const p = await browser.newPage({ viewport: { width: 1366, height: 900 } })
    p.setDefaultTimeout(12000)
    p.on('pageerror', () => errors.push('render error'))
    await p.goto('http://127.0.0.1:4185/login')
    await p.getByLabel('Correo electrónico').fill(mail(name))
    await p.locator('input[name=password]').fill(password)
    await p.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await p.locator('.user-trigger').waitFor()
    return p
  }
  const first = await openDispatch()
  step = 'provider null'
  const page = await login('adminA')
  await page.goto('http://127.0.0.1:4185/services/' + first.id)
  assert.equal(
    (
      await call(
        '/provider/dispatches/' + first.id + '?providerId=' + providers.A,
        t.A,
      )
    ).trackingMode,
    null,
  )
  await page.getByRole('button', { name: /^Tomar servicio$/i }).click()
  await page
    .getByRole('button', { name: 'Confirmar y tomar', exact: true })
    .click()
  await page.getByRole('button', { name: 'ASIGNAR', exact: true }).waitFor()
  results.push('Provider null: claim allowed and no unknown-mode block')
  await page.getByRole('button', { name: 'ASIGNAR', exact: true }).click()
  await page
    .locator('input[name=driverId][value="' + drivers.ana + '"]')
    .check()
  await page
    .locator('input[name=vehicleId][value="' + vehicles.fleet1 + '"]')
    .check()
  await page
    .getByRole('button', { name: 'CONFIRMAR ASIGNACIÓN', exact: true })
    .click()
  await page.getByRole('button', { name: /^Marcar como entregado$/i }).waitFor()
  assert.equal(
    (
      await call(
        '/provider/dispatches/' + first.id + '?providerId=' + providers.A,
        t.A,
      )
    ).trackingMode,
    'LEGACY',
  )
  await page
    .locator('main')
    .screenshot({ path: join(out, 'provider-assigned.png') })
  results.push('Provider assignment LEGACY visible')
  await page.getByRole('button', { name: /^Marcar como entregado$/i }).click()
  await page
    .getByRole('button', { name: 'Confirmar entrega', exact: true })
    .click()
  await page.getByText(/Servicio entregado. La entrega es definitiva/).waitFor()
  assert.equal(
    (
      await call(
        '/provider/dispatches/' + first.id + '?providerId=' + providers.A,
        t.A,
      )
    ).status,
    'DELIVERED',
  )
  results.push('Provider delivery and refreshed detail')
  const second = await openDispatch()
  step = 'independent'
  const indy = await login('indy')
  await indy.goto('http://127.0.0.1:4185/driver/services/' + second.id)
  await indy.getByRole('button', { name: /^Tomar servicio$/i }).click()
  const select = indy.getByRole('dialog').getByRole('combobox')
  await select.selectOption(vehicles.indy)
  await indy.getByRole('button', { name: 'CONFIRMAR', exact: true }).click()
  await indy.getByRole('button', { name: /^Marcar como entregado$/i }).waitFor()
  assert.equal(
    (await call('/driver/me', t.indy)).activeDeliveryAssignment.trackingMode,
    'LEGACY',
  )
  await indy
    .locator('main')
    .screenshot({ path: join(out, 'independent-assigned.png') })
  results.push('Independent TAKE and driver/me coherent LEGACY')
  await indy.getByRole('button', { name: /^Marcar como entregado$/i }).click()
  await indy
    .getByRole('button', { name: 'Confirmar entrega', exact: true })
    .click()
  await indy.waitForTimeout(1000)
  assert.equal(
    (await call('/driver/dispatches/' + second.id, t.indy)).status,
    'DELIVERED',
  )
  assert.equal(
    (await call('/driver/me', t.indy)).activeDeliveryAssignment,
    null,
  )
  results.push('Independent delivery and driver/me cleared')
  step = 'missing-field defensive simulation'
  const third = await openDispatch()
  await page.route(
    '**/provider/dispatches/' + third.id + '?*',
    async (route) => {
      const response = await route.fetch()
      const body = await response.json()
      delete body.trackingMode
      await route.fulfill({ response, json: body })
    },
  )
  await page.goto('http://127.0.0.1:4185/services/' + third.id)
  await page.getByText(/No se confirmó el modo de seguimiento/).waitFor()
  assert.equal(
    await page.getByRole('button', { name: /^Tomar servicio$/i }).isDisabled(),
    true,
  )
  await page
    .locator('main')
    .screenshot({ path: join(out, 'missing-field.png') })
  results.push(
    'Missing field negative fixture: warning and disabled claim (simulated response only)',
  )
  await fs.writeFile(
    join(out, 'fixtures.json'),
    JSON.stringify({
      providerDispatch: first.id,
      independentDispatch: second.id,
    }),
  )
  assert.equal(
    git('rev-parse', 'HEAD'),
    frontend.commit,
    'Checkout changed during verification',
  )
  console.log(JSON.stringify({ results, errors }))
} catch (e) {
  errors.push({
    step,
    name: e.name,
    message: String(e.message)
      .replace(/Bearer\s+\S+/g, '[redacted]')
      .slice(0, 350),
  })
  console.log(JSON.stringify({ results, errors }))
  process.exitCode = 1
} finally {
  await fs.writeFile(
    join(out, 'results.json'),
    JSON.stringify({ results, errors }, null, 2),
  )
  await browser?.close()
  await vite?.close()
  await setup?.app.close()
  await setup?.prisma.$disconnect()
  process.chdir(root)
}
