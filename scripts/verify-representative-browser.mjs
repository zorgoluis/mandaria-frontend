import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  launchRepresentativeBrowser,
  representativeBrowserPath,
} from './representative-browser.mjs'

const directory = resolve(
  'test-results/representative-browser',
  String(Date.now()),
)
await mkdir(directory, { recursive: true })
const report = {
  status: 'RUNNING',
  executable: representativeBrowserPath,
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  cwd: process.cwd(),
  startedAt: new Date().toISOString(),
  headless: true,
  chromiumSandbox: true,
  temporaryProfile: true,
  backend: false,
  database: false,
  cleanup: {},
}
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(
    '<!doctype html><html lang="es"><title>Ensayo local</title><h1>Ensayo sintético local</h1><label>Dato sintético<input></label><button>Confirmar ensayo</button></html>',
  )
})
let browser
try {
  await new Promise((ok, fail) => {
    server.once('error', fail)
    server.listen(0, '127.0.0.1', ok)
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await launchRepresentativeBrowser(directory)
  report.browserVersion = browser.version()
  const context = await browser.newContext()
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  )
  const page = await context.newPage()
  await page.goto(origin)
  assert.equal(await page.title(), 'Ensayo local')
  await page.getByLabel('Dato sintético').fill('Sólo prueba')
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').textContent(), 'Confirmar ensayo')
  report.localPage = 'PASS'
  report.keyboard = 'PASS'
  report.status = 'PASS'
} catch (error) {
  report.status = 'FAIL'
  report.error = { name: error.name, message: error.message.split('\n')[0] }
  process.exitCode = 1
} finally {
  report.cleanup.browser = browser
    ? await browser.close().then(
        () => true,
        () => false,
      )
    : 'NOT_STARTED'
  await new Promise((ok) => server.close(ok))
  report.cleanup.localServer = true
  report.finishedAt = new Date().toISOString()
  await writeFile(
    directory + '/report.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(JSON.stringify({ ...report, report: directory + '/report.json' }))
}
