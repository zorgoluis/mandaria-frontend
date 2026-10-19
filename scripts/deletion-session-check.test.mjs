import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireRestrictedSession } from './deletion-session-check.mjs'
const response = (status, body) => ({ status: () => status, json: async () => body })
test('200 restricted continues without demanding another login', async () => {
  let logins = 0
  assert.equal(await requireRestrictedSession(response(200, { accessMode: 'DELETION_RESTRICTED', capabilities: { activeDeliveryResolution: true } }), async () => { logins++ }), 'CONTINUED_RESTRICTED')
  assert.equal(logins, 0)
})
test('401 requests fresh authentication once', async () => {
  let logins = 0
  assert.equal(await requireRestrictedSession(response(401), async () => { logins++ }), 'REAUTHENTICATED')
  assert.equal(logins, 1)
})
test('403 does not invent permission or force login', async () => {
  let logins = 0
  await assert.rejects(requireRestrictedSession(response(403), async () => { logins++ }))
  assert.equal(logins, 0)
})
test('standard projection cannot pass as restricted', async () => {
  await assert.rejects(requireRestrictedSession(response(200, { accessMode: 'STANDARD' }), async () => {}))
})
