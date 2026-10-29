// Historical harness: new legacy fixture creation is explicitly disabled by the 2026-10-28 user instruction.
throw new Error(
  'Harness histórico deshabilitado: requiere fixture de legado entregado por backend; no fabricar registros duales.',
)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { build } from 'file:///C:/Users/zorgl/Documents/mandaria-backend/node_modules/esbuild/lib/main.js'
const root = path.resolve('test-results/category-http-' + Date.now())
const backend = 'C:/Users/zorgl/Documents/mandaria-backend'
if (fs.existsSync(root))
  throw Error('Snapshot already exists; preserve evidence')
fs.mkdirSync(root, { recursive: true })
for (const name of [
  'src',
  'prisma',
  'package.json',
  'tsconfig.json',
  'tsconfig.build.json',
])
  fs.cpSync(path.join(backend, name), path.join(root, name), {
    recursive: true,
  })
fs.symlinkSync(
  path.join(backend, 'node_modules'),
  path.join(root, 'node_modules'),
  'junction',
)
fs.mkdirSync(path.join(root, 'scripts'))
for (const name of [
  'verify-driver-category-local.mjs',
  'verify-driver-category-cases.mjs',
])
  fs.copyFileSync(
    path.join(backend, 'scripts', name),
    path.join(root, 'scripts', name),
  )
let code = fs.readFileSync(
  path.join(root, 'scripts/verify-driver-category-cases.mjs'),
  'utf8',
)
const fixtureStart = code.indexOf('    const uid = await user();')
const fixtureEnd = code.indexOf('    const dormant =', fixtureStart)
if (fixtureStart < 0 || fixtureEnd < 0)
  throw Error('Review fixture source before running')
const extra = code
  .slice(fixtureStart, fixtureEnd)
  .replace(/\buid\b/g, 'webUid')
  .replaceAll('legacy', 'webLegacy')
code =
  code.slice(0, fixtureEnd) +
  "    const webLegacy='99999999-9999-4999-8999-999999999999';\n" +
  extra +
  code.slice(fixtureEnd)
code = code.replace(
  'const api = request(app.getHttpServer());',
  `await app.listen(0,'127.0.0.1');
      const webUrl='http://127.0.0.1:'+app.getHttpServer().address().port;
      process.env.VITE_API_URL=webUrl;
      const api = request(app.getHttpServer());`,
)
code = code.replace(
  "      pass(\n        'Nest HTTP:",
  `      const {runWebCategory}=await import('../web-category-client.mjs');
      await runWebCategory({adminEmail:(await db.user.findUnique({where:{id:admin}})).email,password,fleetId:fleet.id,independentId:exiting.id,driverEmail:(await db.user.findUnique({where:{id:exiting.userId}})).email,legacyId:legacy,legacyBody:dto,newLegacyId:'99999999-9999-4999-8999-999999999999'});
      pass(
        'Nest HTTP:`,
)
fs.writeFileSync(
  path.join(root, 'scripts/verify-driver-category-cases.mjs'),
  code,
)
await build({
  stdin: {
    loader: 'ts',
    contents: fs.readFileSync('scripts/category-http-client.ts', 'utf8'),
    resolveDir: path.resolve('.'),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(root, 'web-category-client.mjs'),
  define: { 'import.meta.env': 'process.env' },
})
const r = spawnSync(
  process.execPath,
  [
    path.join(backend, 'node_modules/typescript/bin/tsc'),
    '--project',
    'tsconfig.build.json',
  ],
  { cwd: root, encoding: 'utf8', windowsHide: true },
)
fs.writeFileSync(path.join(root, 'compile.log'), r.stdout + r.stderr)
if (r.status !== 0) throw Error('Snapshot compile failed; inspect compile.log')
console.log(
  'Snapshot compiled; sources copied, backend untouched. Execute runner with --run --wsl in ' +
    root,
)
