// W-01 only: controlled local HTTP fixtures, no backend or real storage.
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = 'test-results/documentary-upload'
await mkdir(output, { recursive: true })
await writeFile(
  `${output}/index.html`,
  '<html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test-results/documentary-upload/harness.tsx"></script></html>',
)
await writeFile(
  `${output}/harness.tsx`,
  `
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { AuthContext } from '../../src/auth/context'
import { FeedbackProvider } from '../../src/components/Feedback'
import { Evidence } from '../../src/verification/evidence'
import { verification } from '../../src/verification/service'
import { actor, caseId, requirements } from '../../src/test/verification-fixtures'
import '../../src/index.css'
import '../../src/verification/verification.css'
const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
const auth = {user:{id:actor,role:'DRIVER',email:'synthetic@example.test',active:true},loading:false}
function Demo(){const q=useQuery({queryKey:['verification',actor,caseId],queryFn:()=>verification.get(caseId)});return <main style={{maxWidth:900,margin:'20px auto',padding:16}}><h1>Prueba sintética W-01</h1>{q.data&&<Evidence record={q.data} requirements={requirements} canWrite />}</main>}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><AuthContext.Provider value={auth}><FeedbackProvider><Demo/></FeedbackProvider></AuthContext.Provider></QueryClientProvider>)
`,
)
const server = await createServer({
  configFile: false,
  envDir: false,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4199'),
  },
  server: { host: '127.0.0.1', port: 4199, strictPort: true },
})
let browser
try {
  await server.listen()
  const f = await server.ssrLoadModule('/src/test/verification-fixtures.ts')
  const record = structuredClone(f.caseFixture)
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } })
  const errors = [],
    puts = [],
    commands = []
  page.on('pageerror', () => errors.push('render error'))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console error')
  })
  let finishA, reachedA
  const gate = new Promise((r) => {
      finishA = r
    }),
    reached = new Promise((r) => {
      reachedA = r
    })
  const images = {}
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname
    if (url.hostname !== '127.0.0.1')
      throw new Error('External traffic prohibited')
    if (path.startsWith('/synthetic-put/')) {
      puts.push(req.postDataBuffer())
      return route.fulfill({ status: 200, body: '' })
    }
    if (!path.startsWith('/api/v1/')) return route.continue()
    let body
    if (
      req.method() === 'GET' &&
      path === `/api/v1/verification-cases/${f.caseId}`
    )
      body = record
    else if (path.endsWith('/uploads')) {
      commands.push('CREATE_UPLOAD')
      const id =
        commands.length === 1
          ? f.attachmentId
          : '66666666-6666-4666-8666-666666666666'
      record.revision++
      body = {
        id,
        status: 'CREATED',
        revision: record.revision,
        uploadUrl: `http://127.0.0.1:4199/synthetic-put/${id}`,
        expiresAt: '2099-01-01T00:00:00Z',
      }
    } else if (path.endsWith('/complete')) {
      commands.push('COMPLETE_UPLOAD')
      if (commands.length === 2) {
        reachedA()
        await gate
      }
      const id = path.split('/').at(-2)
      record.revision++
      record.attachments.push({
        id,
        category: 'FACE_PHOTO',
        status: 'VALIDATED',
        bytes: puts.at(-1).length,
        mime: 'image/png',
        hash: 'synthetic',
        createdAt: record.createdAt,
      })
      body = { id, status: 'VALIDATED', revision: record.revision }
    } else if (path.endsWith('/access'))
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: images.A,
      })
    else throw new Error('Unexpected local API request: ' + path)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
  await page.goto('http://127.0.0.1:4199/' + output + '/index.html')
  for (const name of ['A', 'B']) {
    const data = await page.evaluate((n) => {
      const c = document.createElement('canvas')
      c.width = 480
      c.height = 180
      const x = c.getContext('2d')
      x.fillStyle = n === 'A' ? '#d9f2df' : '#dceafe'
      x.fillRect(0, 0, 480, 180)
      x.fillStyle = '#173c33'
      x.font = '24px sans-serif'
      x.fillText('IMAGEN ' + n + ' — SINTETICA', 25, 85)
      return c.toDataURL('image/png').split(',')[1]
    }, name)
    images[name] = Buffer.from(data, 'base64')
  }
  const file = page.getByLabel('Imagen sintética *'),
    button = page.getByRole('button', {
      name: 'Cargar imagen sintética',
      exact: true,
    })
  await file.setInputFiles({
    name: 'A-sintetica.png',
    mimeType: 'image/png',
    buffer: images.A,
  })
  await button.click()
  await reached
  await file.setInputFiles({
    name: 'B-sintetica.png',
    mimeType: 'image/png',
    buffer: images.B,
  })
  await expect(file).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Procesando…' })).toBeDisabled()
  await page.screenshot({
    path: output + '/A-pending-B-selected.png',
    fullPage: true,
  })
  finishA()
  await expect(button).toBeEnabled()
  assert.equal(await file.evaluate((e) => e.files[0]?.name), 'B-sintetica.png')
  await expect(
    page.getByRole('status').filter({ hasText: 'Carga confirmada:' }),
  ).toContainText('A-sintetica.png')
  assert.deepEqual(commands, ['CREATE_UPLOAD', 'COMPLETE_UPLOAD'])
  assert(puts[0].equals(images.A))
  await page.getByRole('button', { name: 'Ver evidencia', exact: true }).click()
  await expect(page.getByRole('img')).toBeVisible()
  await page.screenshot({
    path: output + '/A-confirmed-B-pending-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: output + '/A-confirmed-B-pending-mobile.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Cerrar evidencia' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('img')).toHaveCount(0)
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(file).toHaveValue('')
  assert.equal(puts.length, 2)
  assert(puts[1].equals(images.B))
  assert.deepEqual(commands, [
    'CREATE_UPLOAD',
    'COMPLETE_UPLOAD',
    'CREATE_UPLOAD',
    'COMPLETE_UPLOAD',
  ])
  assert.deepEqual(errors, [])
  await page.screenshot({
    path: output + '/B-confirmed-mobile.png',
    fullPage: true,
  })
  const result = {
    kind: 'browser with synthetic HTTP fixtures only',
    checks: [
      'A pending with B selectable',
      'A confirmed preserves B without sending',
      'preview displays stored A independently of pending B',
      'explicit B sends actual B bytes once',
      'mobile and keyboard close/submit',
    ],
    errors,
  }
  await writeFile(output + '/report.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  await browser?.close()
  await server.close()
}
