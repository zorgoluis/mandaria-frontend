import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'

export const root = 'C:/Users/zorgl/Documents/mandaria-backend'
export const web = resolve('.')
export const resumeRun = process.env.REPRESENTATIVE_RESUME_RUN || ''
export const resumeFrom = process.env.REPRESENTATIVE_RESUME_FROM || ''
assert(
  !resumeFrom || (resumeRun && /^resume-\d{13}$/.test(resumeFrom)),
  'Invalid owned attempt identifier',
)
assert(!resumeRun || /^\d{13}$/.test(resumeRun), 'Invalid owned run identifier')
const runId = resumeRun || String(Date.now())
export const resourceRoot = join(
  web,
  'test-results/representative-isolated',
  runId,
)
export const work = resumeRun
  ? join(resourceRoot, 'resume-' + Date.now())
  : resourceRoot
export const pgPort = 55469
export const apiPort = 4237
export const webPort = 4238
export const requireBackend = createRequire(root + '/package.json')
export const loadSource = (p) => import(pathToFileURL(root + '/' + p).href)
const bin = 'C:/Program Files/PostgreSQL/18/bin/'
const cluster = resourceRoot + '/pgdata'
const priorEnvironment = resumeRun
  ? JSON.parse(await readFile(resourceRoot + '/environment.json', 'utf8'))
  : null
const name =
  priorEnvironment?.database || 'representative_web_' + runId + '_test'
if (priorEnvironment) {
  assert.equal(priorEnvironment.status, 'PASS')
  assert.equal(
    resolve(priorEnvironment.cluster).toLowerCase(),
    resolve(cluster).toLowerCase(),
  )
  assert.equal(priorEnvironment.port, pgPort)
  assert.equal(name, 'representative_web_' + runId + '_test')
}
export const database = `postgresql://postgres@127.0.0.1:${pgPort}/${name}`
// Never inherit libpq routing/service configuration from the operator.
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([k]) =>
      !k.startsWith('PG') &&
      !['DATABASE_URL', 'DIRECT_URL', 'TEST_DATABASE_URL'].includes(k),
  ),
)
let started = false
export async function stopDatabase() {
  if (!started) return true
  const result = spawnSync(
    bin + 'pg_ctl.exe',
    ['stop', '-D', cluster, '-m', 'fast', '-w'],
    { stdio: 'ignore', windowsHide: true, timeout: 30000 },
  )
  started = result.status !== 0
  return !started
}
export async function prepareDatabase() {
  await mkdir(work, { recursive: true })
  const report = { status: 'RUNNING', cluster, database: name, port: pgPort }
  const save = () =>
    writeFile(work + '/environment.json', JSON.stringify(report, null, 2))
  await save()
  try {
    for (const port of [pgPort, apiPort, webPort]) {
      await new Promise((resolveFree, reject) => {
        const server = createServer()
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => server.close(resolveFree))
      })
    }
    const run = (file, args, env = cleanEnv) => {
      const r = spawnSync(file, args, {
        cwd: work,
        env,
        stdio: 'ignore',
        timeout: 60000,
        windowsHide: true,
      })
      assert.equal(
        r.status,
        0,
        'Isolated preparation: ' + file.split('/').at(-1),
      )
    }
    if (!resumeRun)
      run(bin + 'initdb.exe', [
        '-D',
        cluster,
        '-U',
        'postgres',
        '-A',
        'trust',
        '--encoding=UTF8',
        '--locale=C',
      ])
    run(bin + 'pg_ctl.exe', [
      'start',
      '-D',
      cluster,
      '-l',
      work + '/postgres.log',
      '-o',
      `-h 127.0.0.1 -p ${pgPort}`,
      '-w',
    ])
    started = true
    const query = spawnSync(
      bin + 'psql.exe',
      [
        '-h',
        '127.0.0.1',
        '-p',
        String(pgPort),
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-At',
        '-c',
        "SELECT json_build_object('database',current_database(),'host',host(inet_server_addr()),'port',inet_server_port(),'directory',current_setting('data_directory'))",
      ],
      { env: cleanEnv, encoding: 'utf8', windowsHide: true, timeout: 10000 },
    )
    assert.equal(
      query.status,
      0,
      'Database identity query failed: ' + query.stderr,
    )
    const identity = JSON.parse(query.stdout.trim())
    assert.equal(
      resolve(identity.directory).toLowerCase(),
      resolve(cluster).toLowerCase(),
    )
    assert.equal(identity.host, '127.0.0.1')
    assert.equal(identity.port, pgPort)
    assert.equal(identity.database, 'postgres')
    report.identityBeforeMigration = identity
    await save()
    if (!resumeRun)
      run(bin + 'createdb.exe', [
        '-h',
        '127.0.0.1',
        '-p',
        String(pgPort),
        '-U',
        'postgres',
        name,
      ])
    const targetQuery = spawnSync(
      bin + 'psql.exe',
      [
        '-h',
        '127.0.0.1',
        '-p',
        String(pgPort),
        '-U',
        'postgres',
        '-d',
        name,
        '-At',
        '-c',
        "SELECT json_build_object('database',current_database(),'host',host(inet_server_addr()),'port',inet_server_port(),'directory',current_setting('data_directory'))",
      ],
      { env: cleanEnv, encoding: 'utf8', windowsHide: true, timeout: 10000 },
    )
    assert.equal(
      targetQuery.status,
      0,
      'Target identity query failed: ' + targetQuery.stderr,
    )
    const target = JSON.parse(targetQuery.stdout.trim())
    assert.equal(target.database, name)
    assert.equal(target.host, '127.0.0.1')
    assert.equal(target.port, pgPort)
    assert.equal(
      resolve(target.directory).toLowerCase(),
      resolve(cluster).toLowerCase(),
    )
    report.targetIdentityBeforeMigration = target
    await save()
    if (resumeRun) {
      report.resumedOwnedDatabase = true
      report.migrationRepeated = false
      report.status = 'PASS'
      await save()
      return report
    }
    const config = `import {defineConfig} from ${JSON.stringify(pathToFileURL(requireBackend.resolve('prisma/config')).href)}; export default defineConfig({schema:${JSON.stringify(root + '/prisma/schema.prisma')},migrations:{path:${JSON.stringify(root + '/prisma/migrations')}}});`
    await writeFile(work + '/prisma.config.mjs', config)
    run(
      process.execPath,
      [
        requireBackend.resolve('prisma/build/index.js'),
        'migrate',
        'deploy',
        '--config',
        work + '/prisma.config.mjs',
      ],
      { ...cleanEnv, DATABASE_URL: database },
    )
    report.status = 'PASS'
    await save()
    return report
  } catch (error) {
    report.status = 'BLOCKED'
    report.error = error.name
    report.stopped = await stopDatabase()
    await save()
    throw error
  }
}
