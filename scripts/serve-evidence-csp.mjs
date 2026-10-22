// Local browser harness: real Evidence component, synthetic image transport, nginx CSP.
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, extname } from 'node:path'
if (!process.argv[2])
  throw new Error(
    'Usage: node scripts/serve-evidence-csp.mjs <synthetic-png-path>',
  )
const dir = 'test-results/evidence-csp'
await mkdir(dir, { recursive: true })
await writeFile(
  `${dir}/index.html`,
  '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./harness.tsx"></script></html>',
)
await writeFile(
  `${dir}/harness.tsx`,
  `
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {MemoryRouter} from 'react-router-dom'
import {AuthContext} from '../../src/auth/context'
import {FeedbackProvider} from '../../src/components/Feedback'
import {Evidence} from '../../src/verification/evidence'
import {verification} from '../../src/verification/service'
import {actor,caseFixture,requirements,attachmentId,terms} from '../../src/test/verification-fixtures'
import '../../src/index.css'
import '../../src/verification/verification.css'
const role=new URLSearchParams(location.search).get('role')==='SUPER_ADMIN'?'SUPER_ADMIN':'DRIVER'
verification.access=async()=>{const r=await fetch('/synthetic.png');return r.blob()}
const record={...caseFixture,status:'SUBMITTED',attachments:[{id:attachmentId,category:'FACE_PHOTO',status:'VALIDATED',mime:'image/png',bytes:100,hash:'synthetic',createdAt:terms.createdAt}]}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><AuthContext.Provider value={{user:{id:actor,role,email:'synthetic@example.test',active:true},loading:false}}><MemoryRouter><FeedbackProvider><main><h1>Visor sintetico - {role}</h1><Evidence record={record} requirements={requirements} canWrite={false}/></main></FeedbackProvider></MemoryRouter></AuthContext.Provider></QueryClientProvider>)
`,
)
await build({
  configFile: false,
  envDir: false,
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4207'),
  },
  plugins: [react()],
  build: {
    outDir: `${dir}/dist`,
    emptyOutDir: true,
    rollupOptions: { input: `${dir}/index.html` },
  },
})
const conf = await readFile('nginx.conf', 'utf8')
const csp = conf.match(/Content-Security-Policy "([^"]+)"/)[1]
const png = await readFile(process.argv[2])
const root = resolve(`${dir}/dist`)
const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1:4207')
  res.setHeader(
    'Content-Security-Policy',
    u.searchParams.has('old') ? csp.replace(' data: blob:', ' data:') : csp,
  )
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (u.pathname === '/synthetic.png') {
      res.setHeader('Content-Type', 'image/png')
      return res.end(png)
    }
    const path = u.pathname.startsWith('/assets/')
      ? resolve(root, '.' + u.pathname)
      : resolve(root, `${dir}/index.html`)
    if (!path.startsWith(root)) {
      res.statusCode = 403
      return res.end()
    }
    res.setHeader(
      'Content-Type',
      { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[
        extname(path)
      ] || 'application/octet-stream',
    )
    res.end(await readFile(path))
  } catch {
    res.statusCode = 404
    res.end()
  }
})
server.listen(4207, '127.0.0.1', () =>
  console.log(
    'Synthetic viewer http://127.0.0.1:4207 - old=1 reproduces old CSP',
  ),
)
