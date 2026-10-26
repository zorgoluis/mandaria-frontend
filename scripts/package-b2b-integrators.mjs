import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
export const stamp = '2026-10-25'
export const notice = 'Borrador para revisión — no enviado/no publicado'
export const publicFiles = [
  'openapi-b2b.json',
  'B2B-PUBLIC-GUIDE.md',
  'B2B-WEBHOOKS.md',
  'examples/b2b-flow.json',
  'examples/verify-mandaria-webhook.mjs',
]
export const editorialFiles = [
  'README.md',
  'CHANGELOG.md',
  'AVAILABILITY.md',
  'TEST-PLAN.md',
  'COMMUNICATION.md',
]
export const packageFiles = [
  ...publicFiles,
  ...editorialFiles,
  'manifest.json',
].sort()
export const output = resolve(`.tmp/b2b-integrator-package-${stamp}`)
export const sha = (b) => createHash('sha256').update(b).digest('hex')
export function crc32(bytes) {
  let crc = 0xffffffff
  for (const b of bytes) {
    crc ^= b
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
// Deterministic ZIP STORE: fixed date, sorted allowlist, no platform metadata or dependencies.
export function zip(entries) {
  const local = [],
    central = []
  let offset = 0
  for (const [name, data] of entries) {
    const n = Buffer.from(name),
      crc = crc32(data),
      h = Buffer.alloc(30),
      c = Buffer.alloc(46)
    const date = ((2026 - 1980) << 9) | (10 << 5) | 25
    h.writeUInt32LE(0x04034b50)
    h.writeUInt16LE(20, 4)
    h.writeUInt16LE(0x800, 6)
    h.writeUInt16LE(date, 12)
    h.writeUInt32LE(crc, 14)
    h.writeUInt32LE(data.length, 18)
    h.writeUInt32LE(data.length, 22)
    h.writeUInt16LE(n.length, 26)
    c.writeUInt32LE(0x02014b50)
    c.writeUInt16LE(20, 4)
    c.writeUInt16LE(20, 6)
    c.writeUInt16LE(0x800, 8)
    c.writeUInt16LE(date, 14)
    c.writeUInt32LE(crc, 16)
    c.writeUInt32LE(data.length, 20)
    c.writeUInt32LE(data.length, 24)
    c.writeUInt16LE(n.length, 28)
    c.writeUInt32LE(offset, 42)
    local.push(h, n, data)
    central.push(c, n)
    offset += h.length + n.length + data.length
  }
  const cd = Buffer.concat(central),
    end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, cd, end])
}
export function buildPackage() {
  const entries = new Map()
  for (const name of publicFiles)
    entries.set(
      name,
      Buffer.from(
        readFileSync(
          resolve('public/developers/assets', name),
          'utf8',
        ).replaceAll('\r\n', '\n'),
      ),
    )
  for (const name of editorialFiles) {
    const b = readFileSync(
      resolve('docs/b2b-integrator-package', name),
      'utf8',
    ).replaceAll('\r\n', '\n')
    if (!b.includes(notice)) throw Error('Missing draft label: ' + name)
    entries.set(name, Buffer.from(b))
  }
  const spec = JSON.parse(entries.get('openapi-b2b.json'))
  const manifest = {
    notice,
    date: stamp,
    contractVersion: spec.info.version,
    webVersion: JSON.parse(readFileSync('package.json')).version,
    functionalVersions:
      'Independent consent/terms/tracking contracts; consult public schemas',
    evidence:
      'Local contract/portal/package validation only; no remote API or integrator acceptance test',
    files: Object.fromEntries(
      [...entries]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, b]) => [name, sha(b)]),
    ),
  }
  entries.set(
    'manifest.json',
    Buffer.from(JSON.stringify(manifest, null, 2) + '\n'),
  )
  mkdirSync(output, { recursive: true })
  for (const [name, b] of entries) {
    const p = resolve(output, name)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, b)
  }
  const actual = readdirSync(output, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) =>
      relative(output, resolve(e.parentPath, e.name)).replaceAll('\\', '/'),
    )
    .sort()
  if (JSON.stringify(actual) !== JSON.stringify(packageFiles))
    throw Error(
      'Package directory contains unexpected files; preserve and inspect them before rebuilding',
    )
  const archive = zip(packageFiles.map((name) => [name, entries.get(name)]))
  writeFileSync(output + '.zip', archive)
  writeFileSync(
    output + '.zip.sha256',
    sha(archive) + '  ' + output.split(/[\\/]/).at(-1) + '.zip\n',
  )
  return {
    output,
    zip: output + '.zip',
    files: entries.size,
    sha256: sha(archive),
    contractVersion: spec.info.version,
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(buildPackage(), null, 2))
