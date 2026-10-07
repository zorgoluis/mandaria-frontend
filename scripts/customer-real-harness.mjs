/** Real local Nest + PostgreSQL harness. Never use deployed databases. No HTTP response fixtures. */
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes, createHash } from 'node:crypto'
import http from 'node:http'
export async function startRealHarness() {
  const frontend = process.cwd()
  const backend = 'C:/Users/zorgl/Documents/mandaria-backend'
  const database = 'mandaria_v117_browser_20261006_test'
  const requireBackend = createRequire(join(backend, 'package.json'))
  const work = await fs.mkdtemp(join(tmpdir(), 'mandaria-browser-v117-'))
  const web = 'http://127.0.0.1:4178',
    upstream = 'http://127.0.0.1:43171',
    api = 'http://127.0.0.1:43172'
  const mailDir = join(work, 'mail')
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: `postgresql://postgres@127.0.0.1:65063/${database}`,
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
    INTEGRATION_JWT_SECRET: randomBytes(48).toString('hex'),
    JWT_ACCESS_EXPIRES_IN: '3600',
    CUSTOMER_ADMISSION_ENABLED: 'true',
    DETAILED_EXECUTION_ENABLED: 'true',
    PREQUOTE_ENABLED: 'true',
    PREQUOTE_CONVERSION_ENABLED: 'true',
    PREQUOTE_AUTHORIZED_ACCEPT_ENABLED: 'true',
    PREQUOTE_PER_MINUTE: '1000',
    PREQUOTE_PER_DAY: '100000',
    PREQUOTE_GLOBAL_DAILY_ROUTING_UNITS: '100000',
    ROUTING_PROVIDER: 'local_fake',
    MAIL_PROVIDER: 'local_outbox',
    LOCAL_MAIL_OUTBOX_DIR: mailDir,
    MANDARIA_WEB_URL: web,
    CORS_ORIGINS: web,
    B2B_WEBHOOK_POLL_SECONDS: '0',
    DISPATCH_TTL_MINUTES: '60',
    PREQUOTE_VALIDITY_MS: '3600000',
    VITE_API_URL: api,
  })
  // ConfigModule's default .env is resolved only in a new empty temporary directory.
  process.chdir(work)
  requireBackend('reflect-metadata')
  const { PrismaClient } = requireBackend('@prisma/client')
  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  const identity = await db.$queryRawUnsafe(
    'SELECT current_database() AS db, version() AS version',
  )
  if (identity[0].db !== database) throw Error('Database isolation mismatch')
  const migrations = await db.$queryRawUnsafe(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
  )
  if (
    !migrations.some(
      (x) => x.migration_name === '20261006000300_human_command_reconciliation',
    )
  )
    throw Error('Migration40 missing')
  const { NestFactory } = requireBackend('@nestjs/core')
  const { AppModule } = await import(
    pathToFileURL(join(backend, 'dist/app.module.js'))
  )
  const { setup } = await import(pathToFileURL(join(backend, 'dist/setup.js')))
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
  })
  setup(app)
  await app.listen(43171, '127.0.0.1')
  const password = randomBytes(24).toString('base64url'),
    run = Date.now().toString(36)
  const argon = requireBackend('argon2'),
    passwordHash = await argon.hash(password)
  const emails = {
    admin: `admin-${run}@browser.test`,
    admin2: `admin2-${run}@browser.test`,
    personal: `personal-${run}@browser.test`,
    business: `business-${run}@browser.test`,
  }
  let integration, existingPersonalMdr, existingBusinessMdr
  const resume = process.env.V117_BROWSER_RESUME === 'true'
  if (!resume) {
    const admins = []
    for (const email of [emails.admin, emails.admin2])
      admins.push(
        await db.user.create({
          data: {
            email,
            passwordHash,
            role: 'SUPER_ADMIN',
            emailVerifiedAt: new Date(),
          },
        }),
      )
    for (const actorType of ['PROVIDER', 'INDEPENDENT_DRIVER'])
      await db.creditPolicy.create({
        data: {
          serviceType: 'LOCAL_DELIVERY',
          actorType,
          version: 1,
          calculationType: 'PER_KM',
          creditsPerKm: 1,
          minimumCredits: 3,
          effectiveFrom: new Date(),
          reason: 'Isolated browser synthetic baseline',
          createdByUserId: admins[0].id,
        },
      })
    let adminToken
    async function seed(path, body, method = 'POST') {
      const r = await fetch(upstream + '/api/v1' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: 'Bearer ' + adminToken } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const data = await r.json()
      if (!r.ok) throw Error(`Seed HTTP ${r.status} ${path} ${data.code ?? ''}`)
      return data
    }
    adminToken = (await seed('/auth/login', { email: emails.admin, password }))
      .accessToken
    const zone = await seed('/admin/service-zones', {
      code: 'BROWSER_' + run.toUpperCase(),
      name: 'Zona sintética navegador',
      currency: 'MXN',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-93.4, 17.4],
            [-93.3, 17.4],
            [-93.3, 17.5],
            [-93.4, 17.5],
            [-93.4, 17.4],
          ],
        ],
      },
    })
    await seed(`/admin/service-zones/${zone.id}/activate`, {})
    const rate = await seed('/admin/rate-plans', {
      serviceZoneId: zone.id,
      serviceType: 'LOCAL_DELIVERY',
      quoteValidityMinutes: 60,
      bands: [
        { minDistanceMeters: 0, maxDistanceMeters: 100000, amount: '55' },
      ],
    })
    await seed(`/admin/rate-plans/${rate.id}/activate`, {})
    const provider = await seed('/admin/providers', {
      name: 'Proveedor sintético navegador',
      code: 'BROWSER_' + run.toUpperCase(),
      type: 'FLEET',
    })
    await seed(`/admin/providers/${provider.id}/activate`, {})
    await seed(`/admin/providers/${provider.id}/service-coverages`, {
      serviceZoneId: zone.id,
      serviceType: 'LOCAL_DELIVERY',
    })
    integration = await seed('/admin/integrations', {
      name: 'Integración sintética navegador',
      code: 'BROWSER_' + run.toUpperCase(),
    })
    adminToken = undefined
  } else {
    const users = await db.user.findMany({
      where: { email: { endsWith: '@browser.test' } },
      orderBy: { createdAt: 'asc' },
    })
    for (const key of ['admin', 'admin2', 'personal']) {
      const u = users.find((u) => u.email.startsWith(key + '-'))
      if (!u) throw Error('Resume synthetic account missing')
      emails[key] = u.email
      await db.user.update({ where: { id: u.id }, data: { passwordHash } })
    }
    const businessUser = users
      .filter((u) => u.email.startsWith('business-'))
      .at(-1)
    if (businessUser) {
      emails.business = businessUser.email
      await db.user.update({
        where: { id: businessUser.id },
        data: { passwordHash },
      })
      const account = await db.customerAccount.findUniqueOrThrow({
        where: { userId: businessUser.id },
      })
      existingBusinessMdr = (
        await db.deliveryRequest.findFirst({
          where: { customerAccountId: account.id },
          orderBy: { createdAt: 'asc' },
        })
      )?.publicId
    }
    integration = await db.integrationClient.findFirstOrThrow({
      where: { name: 'Integración sintética navegador' },
    })
    const account = await db.customerAccount.findFirstOrThrow({
      where: { user: { email: emails.personal } },
    })
    existingPersonalMdr = (
      await db.deliveryRequest.findFirstOrThrow({
        where: { customerAccountId: account.id },
        orderBy: { createdAt: 'desc' },
      })
    ).publicId
  }
  const traffic = [],
    held = [],
    rules = []
  function arm(path, mode) {
    rules.push({ path, mode })
  }
  const proxy = http.createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = Buffer.concat(chunks),
      path = new URL(req.url, api).pathname
    const ruleIndex = rules.findIndex(
        (r) => r.path === path && req.method === 'POST',
      ),
      rule = ruleIndex < 0 ? undefined : rules.splice(ruleIndex, 1)[0]
    const forward = () =>
      new Promise((done) => {
        const r = http.request(
          upstream + req.url,
          {
            method: req.method,
            headers: { ...req.headers, host: '127.0.0.1:43171' },
          },
          (u) => {
            const parts = []
            u.on('data', (x) => parts.push(x))
            u.on('end', () => {
              const data = Buffer.concat(parts)
              let parsed
              try {
                parsed = JSON.parse(data)
              } catch {
                /* Not a JSON response. */
              }
              traffic.push({
                method: req.method,
                path,
                status: u.statusCode,
                code: parsed?.code,
                state: parsed?.state,
                policy:
                  parsed?.operation === 'SHIPPING_POLICY'
                    ? parsed.result
                    : undefined,
                mode: rule?.mode,
                keyHash: req.headers['idempotency-key']
                  ? createHash('sha256')
                      .update(req.headers['idempotency-key'])
                      .digest('hex')
                  : undefined,
              })
              if (rule?.mode === 'partial-response') {
                res.writeHead(u.statusCode, u.headers)
                res.write(data.subarray(0, 1))
                setTimeout(() => res.destroy(), 25000).unref()
                done()
                return
              }
              if (rule?.mode === 'lose') {
                res.destroy()
                done()
                return
              }
              if (rule?.mode === 'timeout') {
                setTimeout(() => res.destroy(), 25000).unref()
                done()
                return
              }
              if (!res.destroyed) {
                res.writeHead(u.statusCode, u.headers)
                res.end(data)
              }
              done()
            })
          },
        )
        r.on('error', () => {
          res.destroy()
          done()
        })
        r.end(body)
      })
    if (rule?.mode === 'delay-request') {
      held.push(forward)
      return
    }
    await forward()
  })
  await new Promise((r) => proxy.listen(43172, '127.0.0.1', r))
  const { createServer } = await import('vite')
  const vite = await createServer({
    root: frontend,
    configFile: resolve(frontend, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 4178, strictPort: true },
  })
  await vite.listen()
  async function mail(email) {
    for (let i = 0; i < 40; i++) {
      for (const f of await fs.readdir(mailDir).catch(() => [])) {
        const v = JSON.parse(await fs.readFile(join(mailDir, f), 'utf8'))
        if (v.to === email && v.purpose === 'REGISTER') return v.actionUrl
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    throw Error('Local registration mail missing')
  }
  return {
    web,
    api,
    frontend,
    db,
    password,
    emails,
    integration,
    traffic,
    arm,
    mail,
    identity,
    migrations,
    work,
    existingPersonalMdr,
    existingBusinessMdr,
    release: async () => {
      for (const f of held.splice(0)) await f()
    },
    close: async () => {
      await vite.close()
      proxy.closeAllConnections()
      await new Promise((r) => proxy.close(r))
      await app.close()
      await db.$disconnect()
      process.chdir(frontend)
    },
  }
}
