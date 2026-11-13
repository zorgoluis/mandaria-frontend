// Real browser codecs + actual backend validator; no accounts, database or remote uploads.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomBytes, createHash } from 'node:crypto'
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'vite'

const backend = resolve('../mandaria-backend')
const requireBackend = createRequire(backend + '/package.json')
const sharp = requireBackend('sharp')
const { validateImage } = await import(
  pathToFileURL(backend + '/dist/verification/verification-storage.js').href
)
const output = resolve('test-results/camera-photos')
await mkdir(output, { recursive: true })
// Public, non-document HEIC from libheif's own examples, downloaded explicitly before this test.
const heic = await readFile(output + '/example.heic')
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="6000"><rect width="100%" height="100%" fill="white"/><rect x="200" y="200" width="7600" height="5600" fill="none" stroke="black" stroke-width="8"/><rect x="240" y="240" width="250" height="250" fill="red"/><text x="600" y="400" font-size="96">DOCUMENTO SINTETICO — NO VALIDO</text>${Array.from({ length: 48 }, (_, i) => `<text x="500" y="${650 + i * 100}" font-size="52" font-family="sans-serif">${i + 1}. Nombre de prueba — ABCD 0123456789 — Texto fino y completo</text>`).join('')}<rect x="7500" y="5500" width="250" height="250" fill="blue"/></svg>`,
)
const large = await sharp(svg).jpeg({ quality: 95 }).toBuffer()
const rotated = await sharp(svg)
  .resize(4000, 3000)
  .jpeg()
  .withMetadata({ orientation: 6 })
  .toBuffer()
const noisy = await sharp(randomBytes(4000 * 3000 * 3), {
  raw: { width: 4000, height: 3000, channels: 3 },
})
  .jpeg({ quality: 85 })
  .toBuffer()
const png = await sharp(svg).resize(2000, 1500).png().toBuffer()
const cases = [
  {
    name: 'camera-48MP',
    type: 'image/jpeg',
    bytes: large,
    width: 4096,
    height: 3072,
  },
  {
    name: 'camera-EXIF6',
    type: 'image/jpeg',
    bytes: rotated,
    width: 3000,
    height: 4000,
  },
  {
    name: 'camera-no-MIME',
    type: '',
    bytes: rotated,
    width: 3000,
    height: 4000,
  },
  {
    name: 'camera-12MP-noisy',
    type: 'image/jpeg',
    bytes: noisy,
    width: 4000,
    height: 3000,
  },
  {
    name: 'PNG-document',
    type: 'image/png',
    bytes: png,
    width: 2000,
    height: 1500,
  },
  { name: 'iPhone-HEIC', type: 'image/heic', bytes: heic },
]
const nginx = await readFile('nginx.conf', 'utf8')
const csp = nginx.match(/Content-Security-Policy "([^"]+)"/)?.[1]
assert(csp?.includes("worker-src 'self' blob:"))
const report = {
  csp,
  checks: [],
  heicSource:
    'https://github.com/strukturag/libheif/blob/master/examples/example.heic',
  heicSha256: createHash('sha256').update(heic).digest('hex'),
}
const server = await createServer({
  server: { host: '127.0.0.1', port: 4289, strictPort: true },
  plugins: [
    {
      name: 'camera-test-page',
      configureServer(s) {
        s.middlewares.use('/__camera-test', (_req, res) => {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Content-Security-Policy', csp)
          res.end(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Documento sintético preparado</h1></body></html>',
          )
        })
      },
    },
  ],
})
let browser
try {
  await server.listen()
  for (const [engine, launcher, options] of [
    ['chromium', chromium, { channel: 'chrome' }],
    ['webkit', webkit, {}],
  ]) {
    browser = await launcher.launch({ ...options, headless: true })
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
    })
    await page.route('**/*', (route) =>
      route.request().url().startsWith('http://127.0.0.1:4289/') ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    )
    await page.goto('http://127.0.0.1:4289/__camera-test')
    for (const fixture of cases) {
      const result = await page.evaluate(
        async ({ encoded, type }) => {
          const { preparePhoto } =
            await import('/src/verification/prepare-photo.ts')
          const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
          const prepared = await preparePhoto(
            new File([bytes], 'camera', { type }),
            {
              formats: ['image/jpeg', 'image/png'],
              maxBytes: 10485760,
              maxPixels: 20000000,
            },
          )
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(prepared)
          })
          return { dataUrl, size: prepared.size, type: prepared.type }
        },
        { encoded: fixture.bytes.toString('base64'), type: fixture.type },
      )
      assert(result.size <= 10485760)
      const uploaded = Buffer.from(result.dataUrl.split(',')[1], 'base64')
      const normalized = await validateImage(uploaded)
      const metadata = await sharp(normalized.body).metadata()
      assert.equal(metadata.format, 'png')
      assert.equal(metadata.exif, undefined)
      if (fixture.width)
        assert.deepEqual(
          [metadata.width, metadata.height],
          [fixture.width, fixture.height],
        )
      if (fixture.name === 'camera-12MP-noisy') {
        assert(
          uploaded.equals(fixture.bytes),
          'in-limit camera bytes must not be recompressed',
        )
        assert(normalized.bytes > 10485760, 'exercise expanded PNG')
      }
      if (fixture.name === 'camera-48MP') {
        await writeFile(
          output + '/' + engine + '-document.png',
          normalized.body,
        )
        await page.evaluate((data) => {
          const img = document.createElement('img')
          img.src = data
          img.style.width = '100%'
          document.body.append(img)
        }, result.dataUrl)
        await page.screenshot({
          path: output + '/' + engine + '-mobile.png',
          fullPage: true,
        })
      }
      report.checks.push({
        engine,
        name: fixture.name,
        inputBytes: fixture.bytes.length,
        uploadedBytes: uploaded.length,
        normalizedBytes: normalized.bytes,
        width: metadata.width,
        height: metadata.height,
        status: 'PASS',
      })
      console.log(engine + ': ' + fixture.name + ' PASS')
    }
    await browser.close()
    browser = undefined
  }
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
