import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checking = process.argv.includes('--check')
const sourceArg = process.argv.indexOf('--backend')
const backend = resolve(
  sourceArg >= 0
    ? process.argv[sourceArg + 1]
    : resolve(root, '../mandaria-backend'),
)
// Only artifacts explicitly approved by B2B-FRONTEND-HANDOFF.md, never docs/openapi.json.
const files = [
  'openapi-b2b.json',
  'B2B-PUBLIC-GUIDE.md',
  'B2B-WEBHOOKS.md',
  'examples/b2b-flow.json',
  'examples/verify-mandaria-webhook.mjs',
]
const target = resolve(root, 'public/developers/assets')
const hash = (text) => createHash('sha256').update(text).digest('hex')
const manifest = {
  source: 'Mandaria Backend / B2B-FRONTEND-HANDOFF.md',
  files: {},
}
const docs = new Map(
  files.map((name) => [
    name,
    readFileSync(resolve(backend, 'docs', name), 'utf8').replaceAll(
      '\r\n',
      '\n',
    ),
  ]),
)
const spec = JSON.parse(docs.get('openapi-b2b.json'))
if (
  Object.keys(spec.components.securitySchemes).join() !== 'integration-bearer'
)
  throw new Error('Unexpected public security schemes')
// Expanding publication requires reviewing and updating this explicit operation list.
const approved = new Set([
  'post /api/v1/integrations/token',
  'get /api/v1/integrations/me',
  'get /api/v1/integrations/scope-check',
  'post /api/v1/delivery-requests',
  'get /api/v1/delivery-requests',
  'get /api/v1/delivery-requests/{publicId}',
  'get /api/v1/delivery-requests/{publicId}/status',
  'post /api/v1/delivery-requests/{publicId}/cancel',
  'post /api/v1/delivery-requests/{publicId}/quotes',
  'get /api/v1/delivery-requests/{publicId}/quotes',
  'get /api/v1/delivery-quotes/{publicId}',
  'post /api/v1/delivery-quotes/{publicId}/accept',
  'post /api/v1/delivery-prequotes',
  'get /api/v1/delivery-prequotes/{publicId}',
  'post /api/v1/delivery-prequotes/{publicId}/convert',
])
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!approved.delete(`${method} ${path}`))
      throw new Error('Unexpected public operation')
    if (method === 'post' && path === '/api/v1/integrations/token') continue
    if (
      JSON.stringify(operation.security) !==
      JSON.stringify([{ 'integration-bearer': [] }])
    )
      throw new Error('Unexpected public operation security')
  }
}
if (approved.size) throw new Error('Missing reviewed public operations')
for (const [name, text] of docs) {
  manifest.files[name] = hash(text)
  const output = resolve(target, name)
  if (checking) {
    if (readFileSync(output, 'utf8').replaceAll('\r\n', '\n') !== text)
      throw new Error(`Outdated public artifact: ${name}`)
  } else {
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, text)
  }
}
const metadata = JSON.stringify(manifest, null, 2) + '\n'
if (checking) {
  if (
    readFileSync(resolve(target, 'manifest.json'), 'utf8').replaceAll(
      '\r\n',
      '\n',
    ) !== metadata
  )
    throw new Error('Outdated manifest')
} else writeFileSync(resolve(target, 'manifest.json'), metadata)
console.log(
  checking
    ? 'Reviewed public artifacts match backend handoff.'
    : 'Copied only the five public handoff artifacts and their hashes.',
)
