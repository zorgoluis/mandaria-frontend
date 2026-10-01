// Static regression only: no nginx process or HTTP requests are involved.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const config = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')
const tls = config.slice(config.indexOf('listen 443 ssl;'))

for (const route of ['/developers', '/developers/']) {
  test(`HTTPS ${route} serves the SPA without probing the physical directory`, () => {
    const marker = `location = ${route} {`
    assert.equal(tls.split(marker).length - 1, 1, 'one exact HTTPS location required')
    const body = tls.slice(tls.indexOf(marker) + marker.length).split('}')[0]
    assert.match(body, /try_files\s+\/index\.html\s+=404;/)
    assert.doesNotMatch(body, /\$uri|proxy_pass|return\s+30[1278]|rewrite/)
    assert.match(body, /expires -1;/)
  })
}

test('real assets, missing JSON and deep SPA routes retain their policies', () => {
  // Includes the nested types block; stop at the next location, not its first brace.
  const asset = tls.split('location ^~ /developers/assets/ {')[1]?.split('location ')[0]
  assert.ok(asset)
  assert.match(asset, /application\/json json;/)
  assert.match(asset, /try_files \$uri =404;/)
  assert.doesNotMatch(asset, /\/index\.html/)
  const json = tls.split('location ~ ^/developers/.*\\.json$ {')[1]?.split('location ')[0]
  assert.ok(json)
  assert.match(json, /return 404/)
  assert.doesNotMatch(json, /try_files|proxy_pass/)
  assert.match(tls, /location \/ \{\s*try_files \$uri \$uri\/ \/index\.html;/)
})
