import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  buildPackage,
  output,
  packageFiles,
  publicFiles,
  sha,
  notice,
} from './package-b2b-integrators.mjs'
import { verifyMandariaWebhook } from '../public/developers/assets/examples/verify-mandaria-webhook.mjs'
const read = (p) => readFileSync(p, 'utf8').replaceAll('\r\n', '\n')
const root = 'public/developers/assets/'
const backend = resolve('../mandaria-backend')
const spec = JSON.parse(read(root + 'openapi-b2b.json'))
const boundary = JSON.parse(read('scripts/b2b-public-boundary.json'))
const methods = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
])
const ops = (s) =>
  Object.entries(s.paths)
    .flatMap(([p, m]) =>
      Object.keys(m)
        .filter((k) => methods.has(k))
        .map((k) => k + ' ' + p),
    )
    .sort()
const manifest = JSON.parse(read(root + 'manifest.json'))
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
    .replace(/ /g, '-')
test('backend, public asset and package contract are semantically identical and versions coherent', () => {
  assert.deepEqual(
    spec,
    JSON.parse(read(resolve(backend, 'docs/openapi-b2b.json'))),
  )
  assert.equal(manifest.contractVersion, spec.info.version)
  for (const name of publicFiles) {
    let source = read(resolve(backend, 'docs', name))
    assert.equal(sha(source), manifest.sourceHashes[name])
    if (name.endsWith('.md'))
      for (const [from, to] of Object.entries(manifest.linkReplacements))
        source = source.replaceAll(`](${from})`, `](${to})`)
    assert.equal(read(root + name), source, name)
    assert.equal(sha(source), manifest.files[name])
  }
})
test('exact independently reviewed method/path and schema allowlists; no human operations', async () => {
  const { APPROVED_OPERATIONS } = await import(
    pathToFileURL(resolve(backend, 'scripts/export-public-b2b.mjs'))
  )
  assert.deepEqual(
    ops(spec),
    APPROVED_OPERATIONS.map(([m, p]) => m + ' ' + p).sort(),
  )
  assert.deepEqual(ops(spec), boundary.operations)
  assert.equal(ops(spec).length, 20)
  assert.deepEqual(
    Object.keys(spec.components.schemas).sort(),
    boundary.schemas,
  )
  assert.deepEqual(Object.keys(spec.components.securitySchemes), [
    'integration-bearer',
  ])
  for (const p of Object.keys(spec.paths))
    assert.doesNotMatch(
      p,
      /\/(admin|provider|driver|customer|shared|auth|users)(\/|$)/,
    )
  for (const name of boundary.schemas)
    assert.doesNotMatch(
      name,
      /Custody|FleetExit|Assistance|WebhookSecret|DriverAttempt/,
    )
})
test('every internal reference resolves, with no external reference or duplicate API prefix', () => {
  function visit(v) {
    if (!v || typeof v !== 'object') return
    for (const [k, x] of Object.entries(v)) {
      if (k === '$ref') {
        assert.ok(x.startsWith('#/'))
        let target = spec
        for (const part of x.slice(2).split('/'))
          target = target?.[part.replaceAll('~1', '/').replaceAll('~0', '~')]
        assert.ok(target, x)
      } else visit(x)
    }
  }
  visit(spec)
  assert.equal(spec.servers[0].url, 'https://mandaria.com.mx')
  for (const p of Object.keys(spec.paths)) {
    const url = spec.servers[0].url + p
    assert.equal(url.split('/api/v1').length, 2)
    assert.ok(p.startsWith('/api/v1/'))
  }
})
test('optional search schemas and legacy semantics are represented without new webhook events', () => {
  const s = spec.components.schemas
  assert.equal(
    s.IntegrationMeResponse.properties.automaticDispatchSearch.type,
    'boolean',
  )
  assert.ok(
    JSON.stringify(s.DeliveryStatusResponse.properties.search).includes(
      '#/components/schemas/DispatchSearchResponse',
    ),
  )
  assert.ok(!s.DeliveryStatusResponse.required.includes('search'))
  assert.equal(s.DispatchSearchResponse.properties.attempt.maximum, 5)
  for (const word of ['SEARCHING', 'RETRY_PENDING', 'EXHAUSTED'])
    assert.ok(s.DispatchSearchResponse.properties.state.enum.includes(word))
  const text =
    read(root + 'B2B-PUBLIC-GUIDE.md') +
    read('docs/b2b-integrator-package/CHANGELOG.md')
  for (const word of [
    'automaticDispatchSearch',
    'SEARCHING/RETRY_PENDING',
    'OPEN',
    'legacy',
    'consentimiento',
    'timeout',
    '1.13.0',
    '1.13.1',
  ])
    assert.ok(text.includes(word), word)
  assert.ok(
    read('docs/b2b-integrator-package/AVAILABILITY.md').includes(
      'Por confirmar',
    ),
  )
})
test('public Markdown relative links resolve to packaged files and real headings', () => {
  const names = [
    ...publicFiles.filter((f) => f.endsWith('.md')),
    ...packageFiles.filter(
      (f) => f.endsWith('.md') && !publicFiles.includes(f),
    ),
  ]
  for (const name of names) {
    const text = read(
      publicFiles.includes(name)
        ? root + name
        : 'docs/b2b-integrator-package/' + name,
    )
    for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
      const href = m[1]
      assert.doesNotMatch(href, /^(file:|[A-Za-z]:|\\)/)
      if (/^https?:/.test(href)) continue
      const [file, fragment] = href.split('#')
      const target = file || name
      assert.ok(
        packageFiles.includes(target),
        'Unapproved/missing link ' + href,
      )
      if (fragment) {
        const body = read(
          publicFiles.includes(target)
            ? root + target
            : 'docs/b2b-integrator-package/' + target,
        )
        assert.ok(
          [...body.matchAll(/^#{1,6} (.+)$/gm)]
            .map((x) => slug(x[1]))
            .includes(decodeURIComponent(fragment)),
          href,
        )
      }
    }
  }
  JSON.parse(read(root + 'examples/b2b-flow.json'))
  for (const file of ['B2B-PUBLIC-GUIDE.md', 'B2B-WEBHOOKS.md'])
    for (const match of read(root + file).matchAll(/```json\n([\s\S]*?)```/g))
      JSON.parse(match[1])
})
test('signature helper unchanged and verifies original bytes, tamper and duplicate headers safely', () => {
  const b = Buffer.from('{"eventId":"synthetic","name":"Envío"}'),
    timestamp = '1792922400',
    secret = 'synthetic-in-memory-only'
  const signature =
    'v1=' +
    createHmac('sha256', secret)
      .update(timestamp + '.')
      .update(b)
      .digest('hex')
  const valid = {
    rawBody: b,
    timestamp,
    secret,
    signature,
    nowSeconds: Number(timestamp),
  }
  assert.equal(verifyMandariaWebhook(valid), true)
  for (const patch of [
    { rawBody: Buffer.from('{ "eventId":"synthetic","name":"Envío"}') },
    { secret: 'wrong' },
    { signature: [signature, signature] },
    { timestamp: [timestamp, timestamp] },
    { nowSeconds: Number(timestamp) + 301 },
    { signature: 'v1=ab' },
  ])
    assert.equal(verifyMandariaWebhook({ ...valid, ...patch }), false)
  const guide = read(root + 'B2B-WEBHOOKS.md')
  for (const word of [
    'bytes exactos',
    'durable',
    '2xx',
    '409',
    '5 intentos',
    'no garantizan',
    'deduplicación',
  ])
    assert.ok(guide.includes(word), word)
})
test('actual ZIP extracts through Windows ZIP implementation; exact allowlist, hashes and reproducible bytes', () => {
  const first = buildPackage()
  assert.equal(buildPackage().sha256, first.sha256)
  const target = mkdtempSync(resolve('.tmp/b2b-extracted-'))
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Expand-Archive -LiteralPath $env:B2B_REVIEW_ARCHIVE -DestinationPath $env:B2B_REVIEW_DESTINATION -ErrorAction Stop',
    ],
    {
      windowsHide: true,
      env: {
        ...process.env,
        B2B_REVIEW_ARCHIVE: output + '.zip',
        B2B_REVIEW_DESTINATION: target,
      },
    },
  )
  const actual = readdirSync(target, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) =>
      relative(target, resolve(e.parentPath, e.name)).replaceAll('\\', '/'),
    )
    .sort()
  assert.deepEqual(actual, packageFiles)
  const m = JSON.parse(read(resolve(target, 'manifest.json')))
  assert.equal(m.notice, notice)
  assert.equal(m.contractVersion, spec.info.version)
  for (const [name, hash] of Object.entries(m.files)) {
    const bytes = readFileSync(resolve(target, name))
    assert.equal(sha(bytes), hash)
    assert.doesNotMatch(
      bytes.toString(),
      /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|-----BEGIN .*PRIVATE KEY|file:\/\/|C:\\\\Users\\\\|postgresql:\/\//,
    )
  }
  assert.deepEqual(JSON.parse(read(resolve(target, 'openapi-b2b.json'))), spec)
  assert.equal(Object.keys(m.files).length, packageFiles.length - 1)
  assert.ok(
    !readFileSync('src/developers/pages.tsx', 'utf8').includes(
      'b2b-integrator-package',
    ),
  )
})
