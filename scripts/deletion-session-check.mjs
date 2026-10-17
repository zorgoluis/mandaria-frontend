import assert from 'node:assert/strict'

// Harness-only session decision. Never treat generic errors as authorization.
export async function requireRestrictedSession(response, reauthenticate) {
  if (response.status() === 401) {
    await reauthenticate()
    return 'REAUTHENTICATED'
  }
  assert.equal(response.status(), 200)
  const identity = await response.json()
  assert.equal(identity.accessMode, 'DELETION_RESTRICTED')
  assert.equal(identity.capabilities.activeDeliveryResolution, true)
  return 'CONTINUED_RESTRICTED'
}
