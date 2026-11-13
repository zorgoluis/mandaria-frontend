import { build, preview } from 'vite'
import react from '@vitejs/plugin-react'
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  openSync,
  closeSync,
} from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, 'test-results/provider-interactive-local')
const stateFile = join(output, 'session.private.json')
const command = process.argv[2] || 'status'
const read = () => JSON.parse(readFileSync(stateFile, 'utf8'))
const clean = Object.fromEntries(
  Object.entries(process.env).filter(([k]) =>
    [
      'path',
      'systemroot',
      'windir',
      'temp',
      'tmp',
      'comspec',
      'pathext',
      'userprofile',
      'appdata',
      'localappdata',
    ].includes(k.toLowerCase()),
  ),
)
async function control(path) {
  const s = read()
  const r = await fetch(`http://127.0.0.1:${s.controlPort}${path}`, {
    method: 'POST',
    headers: { authorization: s.key, connection: 'close' },
    signal: AbortSignal.timeout(3000),
  })
  if (!r.ok) throw Error('Control rejected')
  return r.json()
}
const files = (p) =>
  readdirSync(p, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? files(join(p, e.name)) : [join(p, e.name)],
    )
    .sort()
if (command === 'build') {
  mkdirSync(output, { recursive: true })
  for (const k of Object.keys(process.env))
    if (k.startsWith('VITE_')) delete process.env[k]
  process.env.VITE_API_URL = 'http://127.0.0.1:56597'
  await build({
    root,
    configFile: false,
    envDir: false,
    plugins: [
      react(),
      {
        name: 'local-http-evidence',
        transformIndexHtml() {
          return [
            {
              tag: 'script',
              injectTo: 'head-prepend',
              children: `const originalFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const request=args[0];const url=new URL(typeof request==='string'?request:request.url,location.href);const method=args[1]?.method||request.method||'GET';try{const response=await originalFetch(...args);if(url.pathname.startsWith('/api/v1/'))console.info('LOCAL_HTTP '+JSON.stringify({method,url:url.origin+url.pathname,status:response.status}));return response}catch(error){console.info('LOCAL_HTTP '+JSON.stringify({method,url:url.origin+url.pathname,status:'NETWORK_ERROR'}));throw error}};`,
            },
          ]
        },
      },
    ],
    build: { outDir: join(output, 'dist'), emptyOutDir: true },
  })
  const manifest = files(join(output, 'dist')).map((p) => ({
    path: p.slice(output.length + 1),
    sha256: createHash('sha256').update(readFileSync(p)).digest('hex'),
  }))
  writeFileSync(
    join(output, 'build-manifest.json'),
    JSON.stringify(
      {
        api: 'http://127.0.0.1:56597',
        sha256: createHash('sha256')
          .update(JSON.stringify(manifest))
          .digest('hex'),
        files: manifest,
      },
      null,
      2,
    ),
  )
} else if (command === 'serve') {
  const server = await preview({
    root,
    configFile: false,
    envDir: false,
    build: { outDir: join(output, 'dist') },
    preview: { host: 'localhost', port: 5173, strictPort: true },
  })
  const key = randomBytes(32).toString('hex')
  const ctl = createServer((req, res) => {
    const supplied = Buffer.from(req.headers.authorization || '')
    const expected = Buffer.from(key)
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      res.writeHead(403).end()
      return
    }
    if (req.method !== 'POST') {
      res.writeHead(405).end()
      return
    }
    if (req.url === '/status') {
      res.end(
        JSON.stringify({
          state: 'ready',
          pid: process.pid,
          web: 'http://localhost:5173',
          api: 'http://127.0.0.1:56597/api/v1',
        }),
      )
    } else if (req.url === '/stop') {
      res.writeHead(200, { connection: 'close' }).end('{}')
      ctl.close()
      ctl.closeAllConnections()
      server.httpServer.close()
      server.httpServer.closeAllConnections()
    } else res.writeHead(404).end()
  })
  await new Promise((r) => ctl.listen(0, '127.0.0.1', r))
  writeFileSync(
    stateFile,
    JSON.stringify(
      { pid: process.pid, controlPort: ctl.address().port, key },
      null,
      2,
    ),
  )
} else if (command === 'start') {
  if (existsSync(stateFile)) {
    try {
      console.log(JSON.stringify(await control('/status')))
      process.exit(0)
    } catch {}
  }
  if (!existsSync(join(output, 'dist/index.html')))
    throw Error('Run build first')
  mkdirSync(output, { recursive: true })
  const who = spawnSync('whoami.exe', [], {
    encoding: 'utf8',
    windowsHide: true,
  }).stdout.trim()
  const acl = spawnSync(
    'icacls.exe',
    [
      output,
      '/inheritance:r',
      '/grant:r',
      `${who}:(OI)(CI)F`,
      '*S-1-5-18:(OI)(CI)F',
    ],
    { windowsHide: true, encoding: 'utf8' },
  )
  if (acl.status !== 0) throw Error('Private ACL failed')
  const fd = openSync(join(output, `server-${Date.now()}.log`), 'a')
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), 'serve'],
    {
      cwd: root,
      env: clean,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', fd, fd],
    },
  )
  child.unref()
  closeSync(fd)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200))
    try {
      console.log(JSON.stringify(await control('/status')))
      process.exit(0)
    } catch {}
  }
  throw Error('Start failed; inspect owned logs; never stop another listener')
} else if (command === 'stop') {
  console.log(JSON.stringify(await control('/stop')))
} else if (command === 'status') {
  try {
    console.log(JSON.stringify(await control('/status')))
  } catch {
    console.log(JSON.stringify({ state: 'offline' }))
    process.exitCode = 1
  }
} else throw Error('Use build/start/status/stop')
