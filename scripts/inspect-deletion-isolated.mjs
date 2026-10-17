// Read-only verification of a cluster created by verify-deletion-isolated.mjs.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
const work = resolve(process.argv[2])
const base = resolve('test-results/deletion-isolated')
assert.ok(relative(base, work) && !relative(base, work).startsWith('..'))
const environment = JSON.parse(await readFile(work + '/environment.json', 'utf8'))
const cluster = resolve(work, 'pgdata')
assert.equal(resolve(environment.cluster), cluster)
assert.match(environment.database, /^deletion_final_\d+_test$/)
assert.equal(environment.port, 55444)
const pgctl = 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe'
const run = args => spawnSync(pgctl, args, { stdio: 'ignore', windowsHide: true, timeout: 30000 }).status
assert.equal(run(['status', '-D', cluster]), 3, 'Must be our stopped cluster')
assert.equal(run(['start', '-D', cluster, '-l', work + '/postgres.log', '-o', '-h 127.0.0.1 -p 55444', '-w']), 0)
const req = createRequire('C:/Users/zorgl/Documents/mandaria-backend/package.json')
const { PrismaClient } = req('@prisma/client')
const db = new PrismaClient({ datasourceUrl: 'postgresql://postgres@127.0.0.1:55444/' + environment.database })
const result = { mode: 'READ_ONLY', status: 'RUNNING' }
try {
  const [identity] = await db.$queryRawUnsafe("SELECT current_database() AS name, host(inet_server_addr()) AS host, inet_server_port() AS port, current_setting('data_directory') AS directory")
  assert.equal(resolve(identity.directory), cluster)
  assert.equal(identity.name, environment.database)
  assert.equal(identity.host, '127.0.0.1')
  assert.equal(identity.port, 55444)
  result.identityVerified = true
  result.requests = await db.documentDeletion.findMany({ select: { scope: true, status: true, closedAt: true, deadline: true, confirmedAt: true }, orderBy: { createdAt: 'asc' } })
  result.assignments = await db.deliveryAssignment.groupBy({ by: ['status'], _count: true })
  result.dispatches = await db.dispatch.groupBy({ by: ['status'], _count: true })
  result.completionEvents = await db.b2bOutboxEvent.count({ where: { type: 'DELIVERY_COMPLETED' } })
  result.awards = await db.creditLedgerEntry.count({ where: { type: 'SERVICE_AWARD' } })
  result.refunds = await db.creditLedgerEntry.count({ where: { type: 'SERVICE_REFUND' } })
  result.activeUserGates = await db.documentDeletionGate.count({ where: { kind: 'USER', active: true } })
  result.migrations = await db.$queryRawUnsafe('SELECT count(*)::int AS applied FROM _prisma_migrations WHERE finished_at IS NOT NULL')
  result.status = 'PASS'
} finally {
  await db.$disconnect()
  result.stopped = run(['stop', '-D', cluster, '-m', 'fast', '-w']) === 0
  await writeFile(work + '/readonly-check.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}
