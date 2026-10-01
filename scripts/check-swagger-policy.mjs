// Static checks only: this is not an nginx parser or an HTTP/normalization test.
import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
const config = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')
const map = config.match(
  /map \$uri \$block_public_swagger\s*\{\s*default 0;\s*~\*(\S+) ([01]);\s*\}/,
)
assert.ok(map, 'Expected a single normalized-URI policy switch')
assert.equal(config.match(/map \$uri \$block_public_swagger/g)?.length, 1)
assert.equal(
  config.match(/if \(\$block_public_swagger\) \{ return 404; \}/g)?.length,
  2,
)
const pattern = new RegExp(map[1], 'i')
const blocked = [
  '/docs',
  '/docs/',
  '/docs/index.html',
  '/docs-json',
  '/docs-yaml',
  '/docs/swagger-ui-init.js',
  '/docs/swagger-ui.css',
  '/docs/swagger-ui-bundle.js',
  '/docs/swagger-ui-standalone-preset.js',
  '/docs/favicon-32x32.png',
  '/docs/LICENSE',
  '/docs/docs/swagger-ui-init.js',
  '/DOCS-JSON',
  '/api/v1/docs',
  '/api/v1/docs-json',
  '/api/v1/docs-yaml',
]
const allowed = [
  '/developers',
  '/developers/reference',
  '/developers/assets/openapi-b2b.json',
  '/developers/assets/B2B-PUBLIC-GUIDE.md',
  '/api/v1/integrations/me',
  '/health',
  '/nginx-health',
  '/assets/app.js',
  '/.well-known/acme-challenge/token',
]
for (const uri of blocked) assert.ok(pattern.test(uri), uri)
for (const uri of allowed) assert.ok(!pattern.test(uri), uri)
assert.match(config, /location \/docs \{\s*proxy_pass http:\/\/backend:3000;/)
assert.match(config, /location \/api\/ \{\s*proxy_pass http:\/\/backend:3000;/)
assert.match(config, /location \/health \{\s*proxy_pass http:\/\/backend:3000;/)
assert.match(config, /location \/ \{\s*try_files \$uri \$uri\/ \/index.html;/)
assert.match(config, /location \^~ \/developers\/assets\/ \{/)
console.log(
  `Static policy passed: ${blocked.length} Swagger paths, ${allowed.length} unaffected paths; switch=${map[2]}. nginx -t and HTTP checks remain required.`,
)
