// Runs only in WSL. Own disposable cluster; backend sources/dist are read-only.
import assert from 'node:assert/strict'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  chmodSync,
  readdirSync,
} from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { Socket } from 'node:net'
import { createHash } from 'node:crypto'
const backend = '/home/mandaria/backend-offers-20261023'
const bin = '/usr/lib/postgresql/18/bin'
const port = 55484,
  apiPort = 4237
const scratch = mkdtempSync('/tmp/mandaria-fleet-exit-web-')
chmodSync(scratch, 0o755)
const data = join(scratch, 'pgdata'),
  database = 'mandaria_fleet_exit_web_test'
const sourceFiles = [
  'src/fleet-exit/exit.service.ts',
  'src/fleet-exit/exit.schemas.ts',
  'src/fleet-exit/exit.dto.ts',
  'src/fleet-exit/exit.controller.ts',
  'prisma/migrations/20261024000100_fleet_exit/migration.sql',
  'src/assistance/assistance.controller.ts',
  'src/assistance/assistance.dto.ts',
  'src/assistance/assistance.service.ts',
  'src/assistance/assistance.persistence.ts',
  'src/assistance/assistance.records.ts',
  'src/assistance/assistance.resolutions.ts',
  'dist/assistance/assistance.service.js',
  'prisma/migrations/20261023000300_fleet_assistance/migration.sql',
  'src/fleet-offers/fleet.controller.ts',
  'src/fleet-offers/fleet.dto.ts',
  'src/fleet-offers/fleet.service.ts',
  'src/fleet-offers/fleet-legacy.guard.ts',
  'dist/fleet-offers/fleet.controller.js',
  'dist/fleet-offers/fleet.dto.js',
  'dist/fleet-offers/fleet.service.js',
  'dist/fleet-offers/fleet-legacy.guard.js',
  'prisma/schema.prisma',
  'prisma/migrations/20261023000200_fleet_direct_take/migration.sql',
]
const hashes = () =>
  Object.fromEntries(
    sourceFiles.map((path) => [
      path,
      createHash('sha256')
        .update(readFileSync(join(backend, path)))
        .digest('hex'),
    ]),
  )
const initialHashes = hashes()
const windowsBackend = '/mnt/c/Users/zorgl/Documents/mandaria-backend'
const sourceManifest = {}
function compareSources(relative) {
  for (const entry of readdirSync(join(backend, relative), {
    withFileTypes: true,
  })) {
    const path = relative + '/' + entry.name
    if (entry.isDirectory()) compareSources(path)
    else {
      const current = readFileSync(join(backend, path))
      assert(
        current.equals(readFileSync(join(windowsBackend, path))),
        'Backend source mismatch: ' + path,
      )
      sourceManifest[path] = createHash('sha256').update(current).digest('hex')
    }
  }
}
compareSources('src')
compareSources('prisma/migrations')
for (const path of [
  'prisma/schema.prisma',
  'tsconfig.json',
  'tsconfig.build.json',
  'package.json',
  'test/fleet-direct-take.e2e-spec.ts',
]) {
  const current = readFileSync(join(backend, path))
  assert(
    current.equals(readFileSync(join(windowsBackend, path))),
    'Backend source mismatch: ' + path,
  )
  sourceManifest[path] = createHash('sha256').update(current).digest('hex')
}
let started = false,
  fixture
const send = (value) =>
  process.stdout.write(
    JSON.stringify(value, (_key, v) =>
      typeof v === 'bigint' ? String(v) : v,
    ) + '\n',
  )
function run(command, args, env = process.env) {
  const r = spawnSync(command, args, {
    cwd: scratch,
    env,
    encoding: 'utf8',
    timeout: 120000,
  })
  if (r.status !== 0)
    throw Error(
      `Local step failed: ${command.split('/').at(-1)} ${args[0]}: ${(r.stderr || r.stdout || '').slice(-1600)}`,
    )
  return r.stdout
}
const pg = (program, args) =>
  run('runuser', ['-u', 'postgres', '--', join(bin, program), ...args])
async function close() {
  await fixture?.app?.close()
  await fixture?.prisma?.$disconnect()
  if (started) {
    pg('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'])
    started = false
  }
}
try {
  for (const key of Object.keys(process.env))
    if (!['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'TMPDIR'].includes(key))
      delete process.env[key]
  Object.assign(process.env, {
    NODE_ENV: 'test',
    FLEET_EXIT_REQUESTS_ENABLED: 'true',
    ASSISTANCE_COMMANDS_ENABLED: 'true',
    ASSISTANCE_STORAGE_MODE: 'LOCAL_PRIVATE',
    ROUTING_PROVIDER: 'local_fake',
    CORS_ORIGINS: 'http://127.0.0.1:4228',
    B2B_WEBHOOK_POLL_SECONDS: '0',
    DISPATCH_SEARCH_POLL_SECONDS: '0',
    MAIL_PROVIDER: 'local_outbox',
    LOCAL_MAIL_OUTBOX_DIR: join(scratch, 'mail'),
    MANDARIA_WEB_URL: 'http://127.0.0.1:4228',
    FLEET_OFFERS_SOCKET_ENABLED: 'false',
    FLEET_OFFERS_FCM_ENABLED: 'false',
    INDEPENDENT_OFFERS_ENABLED: 'false',
  })
  process.env.PATH =
    '/opt/mandaria-node/node-v24.15.0-linux-x64/bin:' + process.env.PATH
  mkdirSync(data)
  run('chown', ['postgres:postgres', data])
  pg('initdb', [
    '-D',
    data,
    '-U',
    'fleet_web_test',
    '-A',
    'trust',
    '--no-locale',
    '-E',
    'UTF8',
  ])
  pg('pg_ctl', [
    '-D',
    data,
    '-l',
    join(data, 'server.log'),
    '-o',
    `-h 127.0.0.1 -p ${port}`,
    '-w',
    'start',
  ])
  started = true
  const sql = (statement) =>
    run(join(bin, 'psql'), [
      '-X',
      '-w',
      '-h',
      '127.0.0.1',
      '-p',
      String(port),
      '-U',
      'fleet_web_test',
      '-d',
      'postgres',
      '-At',
      '-c',
      statement,
    ]).trim()
  assert.equal(sql('show data_directory'), data)
  assert.equal(sql('select inet_server_port()'), String(port))
  run(join(bin, 'createdb'), [
    '-h',
    '127.0.0.1',
    '-p',
    String(port),
    '-U',
    'fleet_web_test',
    database,
  ])
  const databaseUrl = `postgresql://fleet_web_test@127.0.0.1:${port}/${database}`
  process.env.DATABASE_URL = databaseUrl
  process.env.TEST_DATABASE_URL = databaseUrl
  writeFileSync(
    join(scratch, 'prisma.config.ts'),
    `export default {schema:${JSON.stringify(backend + '/prisma/schema.prisma')},migrations:{path:${JSON.stringify(backend + '/prisma/migrations')}}};`,
  )
  run(process.execPath, [
    backend + '/node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--config',
    join(scratch, 'prisma.config.ts'),
  ])
  send({ stage: 'isolated-database-ready', database, port, data })
  symlinkSync(backend + '/node_modules', join(scratch, 'node_modules'), 'dir')
  // Compile current read-only sources into the isolated directory, never reuse old dist.
  run(process.execPath, [
    backend + '/node_modules/typescript/bin/tsc',
    '--project',
    backend + '/tsconfig.build.json',
    '--outDir',
    join(scratch, 'dist'),
    '--incremental',
    'false',
  ])
  const req = createRequire(backend + '/package.json')
  req('reflect-metadata')
  const { ConfigModule } = req('@nestjs/config')
  const originalForRoot = ConfigModule.forRoot
  ConfigModule.forRoot = function (options) {
    return originalForRoot.call(this, { ...options, ignoreEnvFile: true })
  }
  const originalConnect = Socket.prototype.connect
  Socket.prototype.connect = function (...args) {
    const first = Array.isArray(args[0]) ? args[0][0] : args[0]
    const host =
      typeof first === 'object'
        ? first.host
        : typeof args[1] === 'string'
          ? args[1]
          : 'localhost'
    assert(
      ['127.0.0.1', 'localhost', '::1', undefined].includes(host),
      'External network forbidden',
    )
    return Reflect.apply(originalConnect, this, args)
  }
  mkdirSync(join(scratch, 'support'))
  for (const name of ['database-clock', 'credit-policies', 'credits']) {
    const source = readFileSync(
      `${backend}/test/support/${name}.ts`,
      'utf8',
    ).replaceAll('./credit-policies.js', './credit-policies.mjs')
    writeFileSync(
      join(scratch, 'support', name + '.mjs'),
      stripTypeScriptTypes(source),
    )
  }
  // Throttle budget raised only in this disposable fixture, as in backend assistance E2E.
  // Reuse the vetted synthetic fixture setup, not its suites or build command.
  let source = readFileSync(
    backend + '/test/fleet-direct-take.e2e-spec.ts',
    'utf8',
  ).split('afterAll(async () =>')[0]
  source = source
    .replace(
      /import \{ afterAll, beforeAll, describe, expect, it \} from 'vitest';/,
      '',
    )
    .replaceAll('./support/database-clock.js', './support/database-clock.mjs')
    .replaceAll('./support/credit-policies.js', './support/credit-policies.mjs')
    .replaceAll('./support/credits.js', './support/credits.mjs')
    .replaceAll(
      "'../dist/",
      "'" + pathToFileURL(join(scratch, 'dist') + '/').href,
    )
    .replace('beforeAll(async () => {', 'async function seed() {')
    .replace('}, 180000);', '}')
  source =
    "import { getOptionsToken } from '@nestjs/throttler';\n" +
    source.replace(
      '.overrideProvider(ROUTING_PROVIDER)',
      '.overrideProvider(getOptionsToken()).useValue([{ttl:60000,limit:10000}]).overrideProvider(ROUTING_PROVIDER)',
    )
  source +=
    '\nexport { seed, prisma, providers, drivers, vehicles, app, api, t, mail, password, openDispatch, zoneId };\n'
  writeFileSync(join(scratch, 'fixture.mjs'), stripTypeScriptTypes(source))
  process.chdir(scratch)
  fixture = await import(pathToFileURL(join(scratch, 'fixture.mjs')).href)
  await fixture.seed()
  const { prisma, providers, drivers, vehicles, api, t } = fixture
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: fixture.mail('adminA') },
  })
  await prisma.providerMembership.create({
    data: { userId: owner.id, providerId: providers.B, role: 'OWNER' },
  })
  const dispatch = await fixture.openDispatch()
  const detail = (
    await api()
      .get('/api/v1/driver/fleet-dispatches/' + dispatch.id)
      .auth(t.carlos, { type: 'bearer' })
      .expect(200)
  ).body
  await api()
    .post('/api/v1/driver/dispatches/' + dispatch.id + '/fleet-take')
    .auth(t.carlos, { type: 'bearer' })
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      expectedContextRevision: detail.contextRevision,
      expectedProviderModeRevision: detail.providerModeRevision,
      pairingId: detail.pairing.id,
      expectedPairingRevision: detail.pairing.revision,
      vehicleId: detail.pairing.vehicleId,
      expectedOfferRevision: detail.offerRevision,
      economicConfirmation: detail.economicConfirmation,
    })
    .expect(200)
  await api()
    .post('/api/v1/admin/providers/' + providers.B + '/service-coverages')
    .auth(t.sa, { type: 'bearer' })
    .send({ serviceZoneId: fixture.zoneId, serviceType: 'LOCAL_DELIVERY' })
    .expect(201)
  const historicalDispatch = await fixture.openDispatch()
  await api()
    .post(
      '/api/v1/provider/dispatches/' +
        historicalDispatch.id +
        '/claim?providerId=' +
        providers.B,
    )
    .auth(t.A, { type: 'bearer' })
    .expect(200)
  const vehicleB = await prisma.vehicle.create({
    data: {
      providerId: providers.B,
      identifier: 'HISTORICAL-SYNTHETIC',
      type: 'MOTORCYCLE',
      status: 'ACTIVE',
    },
  })
  const sa = await prisma.user.findUniqueOrThrow({
    where: { email: fixture.mail('sa') },
  })
  await prisma.user.create({
    data: {
      email: fixture.mail('sa2'),
      passwordHash: sa.passwordHash,
      role: 'SUPER_ADMIN',
      active: true,
      emailVerifiedAt: new Date(),
    },
  })
  // Explicit synthetic historical segments, not claimed as real completed deliveries.
  for (let i = 0; i < 27; i++) {
    const row = await prisma.deliveryAssignment.create({
      data: {
        dispatchId: historicalDispatch.id,
        mode: 'FLEET',
        providerId: providers.B,
        driverId: drivers.bruno,
        vehicleId: vehicleB.id,
        status: 'ACTIVE',
        assignedAt: new Date(Date.now() - (i + 1) * 60000),
        assignedByUserId: sa.id,
      },
    })
    await prisma.deliveryAssignment.update({
      where: { id: row.id },
      data: {
        status: 'CANCELLED',
        endedAt: new Date(),
        endedByUserId: sa.id,
        endReason: 'OPERATIONAL_CHANGE',
        endReasonDetail: 'Synthetic history fixture',
      },
    })
  }
  // Real synthetic take/release creates the historic participation before exit.
  const exitedDispatch = await fixture.openDispatch()
  const pedroTerms = (
    await api()
      .get('/api/v1/driver/fleet-dispatches/' + exitedDispatch.id)
      .auth(t.pedro, { type: 'bearer' })
      .expect(200)
  ).body
  await api()
    .post('/api/v1/driver/dispatches/' + exitedDispatch.id + '/fleet-take')
    .auth(t.pedro, { type: 'bearer' })
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      expectedContextRevision: pedroTerms.contextRevision,
      expectedProviderModeRevision: pedroTerms.providerModeRevision,
      pairingId: pedroTerms.pairing.id,
      expectedPairingRevision: pedroTerms.pairing.revision,
      vehicleId: pedroTerms.pairing.vehicleId,
      expectedOfferRevision: pedroTerms.offerRevision,
      economicConfirmation: pedroTerms.economicConfirmation,
    })
    .expect(200)
  const priorExecution = await prisma.deliveryExecution.findUniqueOrThrow({
    where: { dispatchId: exitedDispatch.id },
  })
  const exitedHistory = { id: priorExecution.assignmentId }
  await api()
    .post('/api/v1/driver/dispatches/' + exitedDispatch.id + '/fleet-release')
    .auth(t.pedro, { type: 'bearer' })
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      assignmentId: priorExecution.assignmentId,
      expectedExecutionRevision: String(priorExecution.revision),
      reason: 'OPERATIONAL_CHANGE',
    })
    .expect(200)
  await fixture.app.listen(apiPort, '127.0.0.1')
  const owner2 = await prisma.user.create({
    data: {
      email: fixture.mail('owner2'),
      passwordHash: owner.passwordHash,
      role: 'PROVIDER_ADMIN',
      active: true,
    },
  })
  await prisma.providerMembership.create({
    data: { userId: owner2.id, providerId: providers.A, role: 'OWNER' },
  })
  const migrations = await prisma.$queryRawUnsafe(
    'SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
  )
  send({
    stage: 'ready',
    apiPort,
    database,
    data,
    migrations: migrations[0].count,
    credentials: {
      email: fixture.mail('adminA'),
      password: fixture.password,
      otherEmail: fixture.mail('adminB'),
      adminEmail: fixture.mail('sa'),
      admin2Email: fixture.mail('sa2'),
      owner2Email: fixture.mail('owner2'),
    },
    ids: {
      providers,
      drivers,
      vehicles,
      dispatch: dispatch.id,
      historicalDispatch: historicalDispatch.id,
    },
  })
  const input = createInterface({ input: process.stdin })
  for await (const line of input) {
    const command = JSON.parse(line)
    try {
      let result
      if (command.action === 'stop') {
        await close()
        assert.deepEqual(hashes(), initialHashes)
        send({
          id: command.id,
          result: {
            stopped: true,
            data,
            backendUnchanged: true,
            backendHashes: initialHashes,
            currentSourceManifest: sourceManifest,
            runtimeBuiltFromCurrentSources: true,
          },
        })
        break
      }
      if (command.action === 'exitFlag') {
        const { ConfigService } = req('@nestjs/config')
        fixture.app
          .get(ConfigService)
          .set('FLEET_EXIT_REQUESTS_ENABLED', command.enabled)
        result = { enabled: command.enabled }
      } else if (command.action === 'exitMetrics') {
        const d = await prisma.driver.findUniqueOrThrow({
          where: { id: command.driverId },
        })
        result = {
          driverId: d.id,
          userId: d.userId,
          providerId: d.providerId,
          availability: d.availability,
          userActive: (
            await prisma.user.findUniqueOrThrow({ where: { id: d.userId } })
          ).active,
          exits: await prisma.fleetExitRequest.count({
            where: { driverId: d.id },
          }),
          independentProfiles: await prisma.independentDriverProfile.count({
            where: { driverId: d.id },
          }),
          activeAssignments: await prisma.deliveryAssignment.count({
            where: { driverId: d.id, status: 'ACTIVE' },
          }),
          ledger: await prisma.creditLedgerEntry.count(),
          mode: await prisma.driverOfferMode
            .findUnique({ where: { userId: d.userId } })
            .then((r) => r?.mode ?? null),
          activePairings: await prisma.driverVehicleAssignment.count({
            where: { driverId: d.id, unassignedAt: null },
          }),
        }
      } else if (command.action === 'historicalExitedCase') {
        const row = exitedHistory
        const caseId = crypto.randomUUID()
        await api()
          .post(
            '/api/v1/provider/fleet-assistance-cases?providerId=' + providers.A,
          )
          .auth(t.A, { type: 'bearer' })
          .set('Idempotency-Key', crypto.randomUUID())
          .send({
            caseId,
            assignmentId: row.id,
            reason: 'CASH_DISPUTE',
            description: 'Synthetic historical economics after exit',
          })
          .expect(201)
        result = { caseId }
      } else if (command.action === 'ownerRole') {
        await prisma.providerMembership.updateMany({
          where: { userId: owner.id, providerId: providers.A },
          data: { role: command.role },
        })
        result = { changed: true }
      } else if (command.action === 'seedProviderMovements') {
        const c = await prisma.assistanceCase.findUniqueOrThrow({
          where: { id: command.caseId },
        })
        assert.equal(c.providerId, providers.A)
        const participant =
          await prisma.assistanceParticipation.findFirstOrThrow({
            where: { caseId: c.id },
          })
        const from = await prisma.assistanceParty.findFirstOrThrow({
          where: { caseId: c.id, kind: 'PROVIDER' },
        })
        const to = await prisma.assistanceParty.findFirstOrThrow({
          where: { caseId: c.id, kind: 'DRIVER' },
        })
        await prisma.cashObligation.create({
          data: {
            id: crypto.randomUUID(),
            caseId: c.id,
            participationId: participant.id,
            concept: 'REFUND',
            debtorPartyId: from.id,
            creditorPartyId: to.id,
            beneficiaryPartyId: to.id,
            knowledge: 'KNOWN',
            expectedAmount: '350.00',
            currency: 'MXN',
            termsRef: 'synthetic-provider-refund',
            ordinal: 0,
            occurredAt: new Date(),
            createdByUserId: sa.id,
          },
        })
        for (let i = 0; i < 26; i++)
          await prisma.cashMovement.create({
            data: {
              id: crypto.randomUUID(),
              caseId: c.id,
              physicalMovementId: crypto.randomUUID(),
              sourceKind: 'DECLARATION',
              fromPartyId: from.id,
              toPartyId: to.id,
              beneficiaryPartyId: to.id,
              declaredConcepts: ['REFUND'],
              amount: '1.00',
              currency: 'MXN',
              occurredAt: new Date(),
              createdByUserId: owner.id,
            },
          })
        await prisma.assistanceCase.update({
          where: { id: c.id },
          data: {
            revision: { increment: 1 },
            materialRevision: { increment: 1 },
            economicState: 'PENDIENTE',
          },
        })
        result = { seeded: true }
      } else if (command.action === 'providerMovementMetrics') {
        const c = await prisma.assistanceCase.findUniqueOrThrow({
          where: { id: command.caseId },
        })
        const movements = await prisma.cashMovement.findMany({
          where: { caseId: c.id, amount: '25.10' },
          select: { id: true, physicalMovementId: true, status: true },
        })
        result = {
          movements,
          allocations: await prisma.cashAllocation.count({
            where: { caseId: c.id },
          }),
          disputes: await prisma.cashDispute.count({ where: { caseId: c.id } }),
          ledgerEntries: await prisma.creditLedgerEntry.count(),
          operationalState: c.operationalState,
          assignmentStatus: (
            await prisma.deliveryAssignment.findUniqueOrThrow({
              where: { id: c.anchorAssignmentId },
            })
          ).status,
        }
      } else if (command.action === 'assistanceMetrics')
        result = await prisma.$queryRawUnsafe(
          'SELECT operation,status,count(*)::int AS count FROM "AssistanceCommand" GROUP BY operation,status',
        )
      else if (command.action === 'assistanceDisabled') {
        fixture.app
          .get(req('@nestjs/config').ConfigService)
          .set('ASSISTANCE_COMMANDS_ENABLED', !command.disabled)
        result = { disabled: command.disabled }
      } else if (command.action === 'metrics')
        result = {
          spending: await prisma.fleetSpending.findUnique({
            where: { driverId: drivers.carlos },
          }),
          commands: await prisma.fleetCommand.count({
            where: { operation: 'SPENDING' },
          }),
          active: await prisma.deliveryAssignment.count({
            where: { providerId: providers.A, status: 'ACTIVE' },
          }),
          ledger: await prisma.creditLedgerEntry.count({
            where: { referenceId: dispatch.id },
          }),
        }
      else if (command.action === 'mode') {
        const providerId = providers[command.provider]
        assert(providerId)
        const context = (
          await api()
            .get(
              '/api/v1/provider/fleet-operation-context?providerId=' +
                providerId,
            )
            .auth(t.A, { type: 'bearer' })
            .expect(200)
        ).body
        const response = await api()
          .put(
            '/api/v1/admin/providers/' + providerId + '/fleet-operation-mode',
          )
          .auth(t.sa, { type: 'bearer' })
          .send({
            requestId: crypto.randomUUID(),
            expectedRevision: context.revision,
            mode: command.mode,
          })
        result = { status: response.status, body: response.body }
      } else if (command.action === 'spending') {
        const route =
          '/api/v1/provider/drivers/' +
          drivers.carlos +
          '/fleet-spending?providerId=' +
          providers.A
        const current = (
          await api().get(route).auth(t.A, { type: 'bearer' }).expect(200)
        ).body
        const response = await api()
          .put(route)
          .auth(t.A, { type: 'bearer' })
          .send({
            requestId: crypto.randomUUID(),
            expectedRevision: current.revision,
            enabled: command.enabled,
          })
        result = { status: response.status, body: response.body }
      } else if (command.action === 'revokeMembership') {
        await prisma.providerMembership.deleteMany({
          where: { userId: owner.id, providerId: providers.A },
        })
        result = { revoked: true }
      } else throw Error('Unknown fixture command')
      send({ id: command.id, result })
    } catch (error) {
      send({ id: command.id, error: error.message })
    }
  }
} catch (error) {
  send({ stage: 'failed', message: error.message })
  process.exitCode = 1
} finally {
  await close()
}
// Some imported workers retain timers after Nest closes. Exit only after confirmed DB/app cleanup.
process.stdout.write(JSON.stringify({ stage: 'closed' }) + '\n', () =>
  process.exit(process.exitCode ?? 0),
)
