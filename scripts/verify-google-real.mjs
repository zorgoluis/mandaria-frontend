import fs from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
const shared = process.env.GOOGLE_REAL_SHARED === 'true'
const token = 'a'.repeat(22) + '.' + 'b'.repeat(43)
const dir = shared
  ? 'test-results/google-real-shared'
  : 'test-results/google-real'
const origin = 'http://localhost:5173'
await fs.mkdir(dir, { recursive: true })
const fixture = dir + '/fixture.tsx',
  html = dir + '/index.html'
await fs.writeFile(
  html,
  '<html><head><meta charset="UTF-8"><meta name="referrer" content="origin"></head><body><div id="fixture"></div><script type="module" src="/' +
    fixture +
    '"></script></body></html>',
)
await fs.writeFile(
  fixture,
  `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {LocationCard,SharedTracking} from '/src/location/components';import {captureTrackingFragment} from '/src/location/fragment';import '/src/index.css';captureTrackingFragment();const time=Date.now();const v={publicId:'MDR-SYNTHETIC-PRIVATE',progress:{publicVersion:'1',status:'ASSIGNED',trackingMode:'DETAILED',assignmentState:'ACTIVE',phase:'PICKED_UP',attentionRequired:false,terminalOutcome:null},location:{locationVersion:'1',assignmentGeneration:'1',availability:'AVAILABLE',unavailableReason:null,sample:{latitude:17.02,longitude:-93.37,accuracyMeters:40,capturedAt:new Date(time).toISOString(),receivedAt:new Date(time).toISOString(),freshUntil:new Date(time+60000).toISOString(),eraseAfter:new Date(time+600000).toISOString()}},observation:{evaluatedAt:new Date(time).toISOString(),freshness:'RECENT'}};function Fixture(){const [x,setX]=React.useState(0);return <main className="shared-tracking"><button onClick={()=>setX(1)}>Actualizar muestra</button><button onClick={()=>setX(2)}>Retirar muestra</button><LocationCard view={{...v,location:{...v.location,sample:{...v.location.sample,latitude:x===1?17.021:17.02}},progress:{...v.progress,attentionRequired:x===2}}} now={time}/></main>}createRoot(document.getElementById('fixture')).render(<MemoryRouter>{location.pathname==='/track'?<SharedTracking/>:<Fixture/>}</MemoryRouter>);`,
)
const nginx = await fs.readFile('nginx.conf', 'utf8'),
  csp = nginx.match(/Content-Security-Policy "([^"]+)"/)[1]
if (shared) process.env.VITE_API_URL = origin // synthetic same-origin API fixture only
const server = await createServer({
  configFile: false,
  plugins: [
    {
      name: 'local-tracking-fixture',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.split('?')[0] === '/track') req.url = '/' + html
          next()
        })
      },
    },
  ],
  oxc: { jsx: { runtime: 'automatic' } },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    headers: { 'Content-Security-Policy': csp, 'Referrer-Policy': 'origin' },
  },
})
const report = {
  sdk: 'REAL Google Maps; synthetic LocationCard fixture, no real backend',
  csp: 'nginx policy supplied by Vite headers, NOT nginx server verification',
  googleRequests: 0,
  leaks: 0,
  additionalServices: 0,
  consoleCodes: [],
  violations: [],
  checks: [],
}
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    window.__mapCount = 0
    window.__circles = []
    window.__violations = []
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__violations.push(e.violatedDirective),
    )
    let callback
    Object.defineProperty(window, 'mandariaMapsReady', {
      configurable: true,
      get() {
        return callback
      },
      set(fn) {
        window.__hashAtSDK = location.hash
        callback = () => {
          const m = window.google.maps
          const Original = m.Map
          m.Map = new Proxy(Original, {
            construct(t, args) {
              window.__mapCount++
              return Reflect.construct(t, args)
            },
          })
          const Circle = m.Circle
          m.Circle = new Proxy(Circle, {
            construct(t, args) {
              const c = Reflect.construct(t, args)
              window.__circles.push(c)
              return c
            },
          })
          fn()
        }
      },
    })
  })
  page.on('pageerror', (e) => {
    report.consoleCodes.push(
      /React is not defined/.test(e.message)
        ? 'REACT_UNDEFINED'
        : 'PAGE_ERROR_REDACTED',
    )
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const codes = msg
        .text()
        .match(/(?:[A-Za-z]+MapError|[A-Za-z]+KeyMapError)/g)
      if (codes) report.consoleCodes.push(...codes)
      else report.consoleCodes.push('OTHER_ERROR_REDACTED')
    }
  })
  const stamp = Date.now()
  const synthetic = {
    publicId: 'MDR-SYNTHETIC-PRIVATE',
    progress: {
      publicVersion: '1',
      status: 'ASSIGNED',
      trackingMode: 'DETAILED',
      assignmentState: 'ACTIVE',
      phase: 'PICKED_UP',
      attentionRequired: false,
      terminalOutcome: null,
    },
    location: {
      locationVersion: '1',
      assignmentGeneration: '1',
      availability: 'AVAILABLE',
      unavailableReason: null,
      sample: {
        latitude: 17.02,
        longitude: -93.37,
        accuracyMeters: 40,
        capturedAt: new Date(stamp - 570000).toISOString(),
        receivedAt: new Date(stamp - 570000).toISOString(),
        freshUntil: new Date(stamp - 510000).toISOString(),
        eraseAfter: new Date(stamp + 30000).toISOString(),
      },
    },
    observation: {
      evaluatedAt: new Date(stamp).toISOString(),
      freshness: 'STALE',
    },
  }
  await page.route('**/*', async (route) => {
    const r = route.request(),
      u = new URL(r.url())
    if (u.pathname.endsWith('/shared/delivery-tracking')) {
      await route.fulfill({ json: synthetic })
      return
    }
    if (/google|gstatic|ggpht/.test(u.hostname)) {
      report.googleRequests++
      const all =
        r.url() + ' ' + JSON.stringify(r.headers()) + ' ' + (r.postData() ?? '')
      if (
        /MDR-SYNTHETIC-PRIVATE|Tracking |Bearer |synthetic-contact/.test(all) ||
        all.includes(token) ||
        all.includes(encodeURIComponent(token))
      ) {
        report.leaks++
        await route.abort()
        return
      }
      if (
        /\/directions|\/geocode|\/places|routes\.googleapis|places\.googleapis/i.test(
          u.href,
        )
      )
        report.additionalServices++
    }
    await route.continue()
  })
  await page.goto(shared ? origin + '/track#t=' + token : origin + '/' + html)
  await page.waitForTimeout(15000)
  const state = await page.evaluate(() => ({
    fixtureRendered: document.body.innerText.includes('Actualizar muestra'),
    mapUnavailable: document.body.innerText.includes('Mapa no disponible'),
    loading: document.body.innerText.includes('Cargando mapa'),
    scriptCount: document.scripts.length,
    maps: window.__mapCount,
    circles: window.__circles.length,
    tiles: [...document.images].filter(
      (i) => /google|gstatic/.test(i.src) && i.naturalWidth > 0,
    ).length,
    attribution: document.body.innerText.includes('Google'),
    violations: window.__violations,
  }))
  report.initial = state
  report.violations = state.violations
  if (!state.maps || report.consoleCodes.some((c) => c.includes('MapError'))) {
    report.blocked = 'Google map did not load or reported authorization error'
    console.log('Google validation blocked; sanitized report only')
  } else if (shared) {
    report.hashRemoved = await page.evaluate(
      () => window.__hashAtSDK === '' && location.hash === '',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: dir + '/mobile.png', fullPage: true })
    await page.waitForTimeout(17000)
    report.expired = await page.evaluate(
      () =>
        window.__circles.every((c) => c.getMap() === null) &&
        !document.body.innerText.includes('17.02, -93.37'),
    )
    report.checks.push(
      'SharedTracking with REAL SDK and synthetic API',
      'fragment removed before SDK',
      'local eraseAfter timer',
    )
  } else {
    await page.getByRole('button', { name: 'Actualizar muestra' }).click()
    report.updated = await page.evaluate(() => ({
      maps: window.__mapCount,
      latitude: window.__circles.at(-1).getCenter().lat(),
    }))
    await page.screenshot({ path: dir + '/desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: dir + '/mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Retirar muestra' }).focus()
    await page.keyboard.press('Enter')
    report.withdrawn = await page.evaluate(() =>
      window.__circles.every((c) => c.getMap() === null),
    )
    report.checks.push(
      'real SDK owner component',
      'mobile desktop',
      'keyboard withdrawal',
    )
  }
  console.log(JSON.stringify(report))
} catch {
  report.blocked =
    'Local harness failed (details omitted to protect credentials)'
  console.log(report.blocked)
} finally {
  await fs.writeFile(dir + '/result.json', JSON.stringify(report, null, 2))
  await browser?.close()
  await server.close()
  await fs.rm(fixture, { force: true })
  await fs.rm(html, { force: true })
}
