import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'

export const root = 'C:/Users/zorgl/Documents/mandaria-backend'
export const web = resolve('.')
export const work = join(web, 'test-results/deletion-isolated', String(Date.now()))
export const pgPort = 55444
export const apiPort = 4217
export const webPort = 4218
export const requireBackend = createRequire(root + '/package.json')
export const loadSource = p => import(pathToFileURL(root + '/' + p).href)
const bin = 'C:/Program Files/PostgreSQL/18/bin/'
const cluster = work + '/pgdata'
const name = 'deletion_final_' + Date.now() + '_test'
export const database = `postgresql://postgres@127.0.0.1:${pgPort}/${name}`
let started = false
export async function stopDatabase() {
  if (!started) return true
  const result = spawnSync(bin + 'pg_ctl.exe', ['stop', '-D', cluster, '-m', 'fast', '-w'], { stdio: 'ignore', windowsHide: true, timeout: 30000 })
  started = result.status !== 0
  return !started
}
export async function prepareDatabase() {
  await mkdir(work, { recursive: true })
  const report = { status: 'RUNNING', cluster, database: name, port: pgPort }
  const save = () => writeFile(work + '/environment.json', JSON.stringify(report, null, 2))
  await save()
  try {
    for (const port of [pgPort, apiPort, webPort]) {
      await new Promise((resolveFree, reject) => {
        const server = createServer()
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => server.close(resolveFree))
      })
    }
    const run = (file, args, env = process.env) => {
      const r = spawnSync(file, args, { cwd: work, env, stdio: 'ignore', timeout: 60000, windowsHide: true })
      assert.equal(r.status, 0, 'Isolated preparation: ' + file.split('/').at(-1))
    }
    run(bin + 'initdb.exe', ['-D', cluster, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8', '--locale=C'])
    run(bin + 'pg_ctl.exe', ['start', '-D', cluster, '-l', work + '/postgres.log', '-o', `-h 127.0.0.1 -p ${pgPort}`, '-w'])
    started = true
    const query = spawnSync(bin + 'psql.exe', ['-h', '127.0.0.1', '-p', String(pgPort), '-U', 'postgres', '-d', 'postgres', '-At', '-c', "SELECT json_build_object('database',current_database(),'host',host(inet_server_addr()),'port',inet_server_port(),'directory',current_setting('data_directory'))"], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    assert.equal(query.status, 0)
    const identity = JSON.parse(query.stdout.trim())
    assert.equal(resolve(identity.directory).toLowerCase(), resolve(cluster).toLowerCase())
    assert.equal(identity.host, '127.0.0.1')
    assert.equal(identity.port, pgPort)
    assert.equal(identity.database, 'postgres')
    report.identityBeforeMigration = identity
    await save()
    run(bin + 'createdb.exe', ['-h', '127.0.0.1', '-p', String(pgPort), '-U', 'postgres', name])
    const targetQuery = spawnSync(bin + 'psql.exe', ['-h', '127.0.0.1', '-p', String(pgPort), '-U', 'postgres', '-d', name, '-At', '-c', "SELECT json_build_object('database',current_database(),'host',host(inet_server_addr()),'port',inet_server_port(),'directory',current_setting('data_directory'))"], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    assert.equal(targetQuery.status, 0)
    const target = JSON.parse(targetQuery.stdout.trim())
    assert.equal(target.database, name)
    assert.equal(target.host, '127.0.0.1')
    assert.equal(target.port, pgPort)
    assert.equal(resolve(target.directory).toLowerCase(), resolve(cluster).toLowerCase())
    report.targetIdentityBeforeMigration = target
    await save()
    const config = `import {defineConfig} from ${JSON.stringify(pathToFileURL(requireBackend.resolve('prisma/config')).href)}; export default defineConfig({schema:${JSON.stringify(root + '/prisma/schema.prisma')},migrations:{path:${JSON.stringify(root + '/prisma/migrations')}}});`
    await writeFile(work + '/prisma.config.mjs', config)
    run(process.execPath, [requireBackend.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--config', work + '/prisma.config.mjs'], { ...process.env, DATABASE_URL: database })
    report.status = 'PASS'
    await save()
    return report
  } catch (error) {
    report.status = 'BLOCKED'; report.error = error.name
    report.stopped = await stopDatabase(); await save(); throw error
  }
}
