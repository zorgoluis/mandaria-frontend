// Bounded preflight; no backend, database or functional fixtures.
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
const output = resolve('test-results/deletion-browser-rerun')
await mkdir(output, { recursive: true })
const report = { status: 'RUNNING', stage: 'start', backendStarted: false }
const save = () =>
  writeFile(
    output +
      (process.argv.includes('--diagnostic')
        ? '/smoke-diagnostic.json'
        : '/smoke.json'),
    JSON.stringify(report, null, 2),
  )
await save()
let browser, vite
const deadline = setTimeout(() => {
  process.exitCode = 1
  void save().finally(() => process.exit(1))
}, 45000)
try {
  vite = await createServer({
    root: process.cwd(),
    configFile: false,
    envDir: false,
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4208'),
    },
    plugins: [react()],
    logLevel: 'silent',
    cacheDir: output + '/vite-cache',
    server: { host: '127.0.0.1', port: 4208, strictPort: true },
  })
  await vite.listen()
  report.stage = 'browser-launch'
  await save()
  browser = await chromium.launch({ timeout: 15000 })
  report.stage = 'new-page'
  await save()
  const page = await browser.newPage()
  page.setDefaultTimeout(10000)
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue()
      : route.abort(),
  )
  report.stage = 'navigation'
  await save()
  await page.goto('http://127.0.0.1:4208/login', { timeout: 15000 })
  report.stage = 'login-render'
  await save()
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .waitFor()
  await page.screenshot({ path: output + '/smoke-login.png' })
  report.status = 'PASS'
  report.stage = 'login-rendered'
  report.browser = 'Chromium'
  report.reportWritten = true
} catch (error) {
  report.status = 'BLOCKED'
  report.errorType = error.name
  report.errorCode = error.code ?? null
  if (process.argv.includes('--diagnostic'))
    report.diagnostic = String(error.message).slice(0, 2000)
  process.exitCode = 1
} finally {
  await browser?.close()
  await vite?.close()
  clearTimeout(deadline)
  await save()
  console.log(JSON.stringify(report))
}
