// Static regression only: no nginx process or HTTP requests are involved.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const config = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')
// TLS belongs to mandaria-proxy; test the checked-in internal app server.
assert.match(config, /listen 80;/)
const appServer = config

for (const route of ['/developers', '/developers/']) {
  test(`Internal app ${route} serves the SPA without probing the physical directory`, () => {
    const marker = `location = ${route} {`
    assert.equal(
      appServer.split(marker).length - 1,
      1,
      'one exact app location required',
    )
    const body = appServer
      .slice(appServer.indexOf(marker) + marker.length)
      .split('}')[0]
    assert.match(body, /try_files\s+\/index\.html\s+=404;/)
    assert.doesNotMatch(body, /\$uri|proxy_pass|return\s+30[1278]|rewrite/)
    assert.match(body, /expires -1;/)
  })
}

test('real assets, missing JSON and deep SPA routes retain their policies', () => {
  // Includes the nested types block; stop at the next location, not its first brace.
  const asset = appServer
    .split('location ^~ /developers/assets/ {')[1]
    ?.split('location ')[0]
  assert.ok(asset)
  assert.match(asset, /application\/json json;/)
  assert.match(asset, /try_files \$uri =404;/)
  assert.doesNotMatch(asset, /\/index\.html/)
  const json = appServer
    .split('location ~ ^/developers/.*\\.json$ {')[1]
    ?.split('location ')[0]
  assert.ok(json)
  assert.match(json, /return 404/)
  assert.doesNotMatch(json, /try_files|proxy_pass/)
  assert.match(
    appServer,
    /location \/ \{\s*try_files \$uri \$uri\/ \/index\.html;/,
  )
})
