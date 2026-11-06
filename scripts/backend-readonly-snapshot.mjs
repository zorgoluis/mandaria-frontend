// Compile a read-only backend snapshot inside the frontend disposable workspace.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  cp,
  symlink,
} from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  root,
  work,
  database,
  requireBackend,
} from './onboarding-isolated-environment.mjs'
async function treeHash(dir) {
  const hash = createHash('sha256')
  async function walk(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const p = join(path, entry.name)
      if (entry.isDirectory()) await walk(p)
      else {
        hash.update(relative(dir, p).replaceAll('\\', '/'))
        hash.update(await readFile(p))
      }
    }
  }
  await walk(dir)
  return hash.digest('hex')
}

export async function backendSnapshot() {
  const runtime = join(work, 'backend-runtime'),
    report = {}
  await mkdir(runtime, { recursive: true })
  await writeFile(
    join(runtime, 'package.json'),
    await readFile(root + '/package.json'),
  )
  await cp(root + '/src', join(runtime, 'src'), { recursive: true })
  for (const file of ['tsconfig.json', 'tsconfig.build.json'])
    await cp(root + '/' + file, join(runtime, file))
  await mkdir(join(runtime, 'prisma'), { recursive: true })
  await cp(
    root + '/prisma/schema.prisma',
    join(runtime, 'prisma/schema.prisma'),
  )
  await mkdir(join(runtime, 'node_modules'), { recursive: true })
  for (const entry of await readdir(root + '/node_modules', {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.')) continue
    const source = root + '/node_modules/' + entry.name,
      target = join(runtime, 'node_modules', entry.name)
    if (entry.name === '@prisma') await cp(source, target, { recursive: true })
    else if (entry.isDirectory()) await symlink(source, target, 'junction')
  }
  const generated = spawnSync(
    process.execPath,
    [
      requireBackend.resolve('prisma/build/index.js'),
      'generate',
      '--schema',
      join(runtime, 'prisma/schema.prisma'),
    ],
    {
      cwd: runtime,
      env: { ...process.env, DATABASE_URL: database },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 60000,
    },
  )
  await writeFile(
    join(work, 'generate.txt'),
    generated.stdout + generated.stderr,
  )
  assert.equal(generated.status, 0, 'Isolated Prisma generation failed')
  report.sourceSha256 = await treeHash(root + '/src')
  const compilation = spawnSync(
    process.execPath,
    [
      requireBackend.resolve('typescript/bin/tsc'),
      '-p',
      runtime + '/tsconfig.build.json',
      '--outDir',
      join(runtime, 'dist'),
      '--incremental',
      'false',
      '--declaration',
      'false',
      '--sourceMap',
      'false',
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 120000 },
  )
  await writeFile(
    join(work, 'compile.txt'),
    compilation.stdout + compilation.stderr,
  )
  assert.equal(
    compilation.status,
    0,
    'Temporary backend compilation failed; inspect compile.txt',
  )
  report.buildSha256 = await treeHash(join(runtime, 'dist'))
  report.backendVersion = JSON.parse(
    await readFile(root + '/package.json', 'utf8'),
  ).version
  return {
    report,
    load: (file) => import(pathToFileURL(join(runtime, 'dist', file)).href),
  }
}
