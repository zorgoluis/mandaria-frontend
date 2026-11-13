import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { authService } from './src/services/api'
import { independentDrivers } from './src/independent-drivers/service'
import { driverPortal } from './src/driver-portal/service'
import { categories } from './src/driver-category/service'
import { categoryBlock, canApprove } from './src/driver-category/contract'
export async function runWebCategory(f: {
  adminEmail: string
  password: string
  fleetId: string
  independentId: string
  driverEmail: string
  newLegacyId: string
  legacyId: string
  legacyBody: { requestId: string; expectedRevision: string; reason: string }
}) {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
    configurable: true,
  })
  const checks: string[] = []
  const login = async (email: string) => {
    try {
      await authService.login(email, f.password)
    } catch (e) {
      if (!(e instanceof Error) || !('status' in e) || e.status !== 429) throw e
      const delay = Number(
        (e as unknown as { retryAfterMs: number }).retryAfterMs,
      )
      if (!Number.isFinite(delay) || delay > 120000) throw e
      console.log('Respecting HTTP Retry-After before Web login')
      await new Promise((resolve) => setTimeout(resolve, delay + 100))
      await authService.login(email, f.password)
    }
  }
  await login(f.adminEmail)
  const p = await independentDrivers.get(f.independentId)
  assert.equal(p.driverCategory?.category, 'INDEPENDENT')
  assert.equal(canApprove(p.driverCategory), true)
  checks.push('Web auth and canonical independent profile via real Nest HTTP')
  await assert.rejects(
    () =>
      independentDrivers.enable(f.fleetId, 'Synthetic incompatible approval'),
    { status: 409, code: 'DRIVER_CATEGORY_CONFLICT' },
  )
  checks.push('Web approval rejects current fleet with public conflict')
  await independentDrivers.suspend(f.independentId, 'Synthetic suspension')
  const suspended = await independentDrivers.get(f.independentId)
  assert.equal(suspended.driverCategory?.category, 'INDEPENDENT')
  assert.ok(categoryBlock(suspended.driverCategory))
  checks.push(
    'Suspension preserves membership and blocks Web taking eligibility',
  )
  await independentDrivers.enable(
    f.independentId,
    'Synthetic explicit rehabilitation',
  )
  const unresolved = await independentDrivers.get(f.newLegacyId)
  assert.equal(unresolved.driverCategory?.category, 'REVIEW_REQUIRED')
  const freshBody = {
    requestId: crypto.randomUUID(),
    expectedRevision: unresolved.driverCategory!.categoryRevision,
    reason: 'Web synthetic explicit reconciliation',
  }
  await assert.rejects(
    () =>
      categories.reconcile(f.newLegacyId, {
        ...freshBody,
        expectedRevision: '999999999999999999',
      }),
    { status: 409, code: 'REVISION_CONFLICT' },
  )
  const applied = await categories.reconcile(f.newLegacyId, freshBody)
  assert.equal(applied.category, 'FLEET')
  assert.equal(
    (await independentDrivers.get(f.newLegacyId)).driverCategory
      ?.independentMembershipState,
    'HISTORICAL',
  )
  assert.deepEqual(
    await categories.reconcile(f.newLegacyId, freshBody),
    applied,
  )
  checks.push(
    'Web applies fresh reconciliation, rejects stale revision and recovers exact receipt',
  )
  const replay = await categories.reconcile(f.legacyId, f.legacyBody)
  assert.equal(replay.category, 'FLEET')
  assert.equal(replay.independentMembershipState, 'HISTORICAL')
  assert.deepEqual(await categories.reconcile(f.legacyId, f.legacyBody), replay)
  await assert.rejects(
    () =>
      categories.reconcile(f.legacyId, {
        ...f.legacyBody,
        reason: 'Other intention',
      }),
    { status: 409, code: 'IDEMPOTENCY_KEY_REUSED' },
  )
  checks.push('Web reconciliation receipt replay exact and reused key conflict')
  await authService.logout()
  await login(f.driverEmail)
  const me = await driverPortal.me()
  assert.equal(me.driverCategory?.category, 'INDEPENDENT')
  await assert.rejects(() => independentDrivers.get(f.independentId), {
    status: 403,
  })
  await assert.rejects(() => categories.reconcile(f.legacyId, f.legacyBody), {
    status: 403,
  })
  checks.push(
    'DRIVER self category; admin profile and reconciliation forbidden after account switch',
  )
  await authService.logout()
  writeFileSync(
    'web-category-http.json',
    JSON.stringify(
      {
        scope:
          'Actual Web service modules -> fetch -> Nest -> isolated PostgreSQL; no browser or Android UI claim',
        checks,
        passed: checks.length,
        failed: 0,
        synthetic: true,
      },
      null,
      2,
    ),
  )
  console.log('Web HTTP groups PASS ' + checks.length)
}
