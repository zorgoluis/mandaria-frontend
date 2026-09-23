import { beforeEach, expect, it, vi } from 'vitest'
// Read as text so the guard checks the shipped service layer, not a mock of it.
import creditsSource from '../credits/service?raw'
import policiesSource from '../credit-policies/service?raw'
import {
  independentCreditsAdmin,
  movementKey,
  myDriverCredits,
  myProviderCredits,
  providerCreditsAdmin,
} from '../credits/service'
import { creditPolicies } from '../credit-policies/service'
import {
  creditCostLabel,
  formatCredits,
  formatDistance,
  formatLedgerType,
  formatRechargeMethod,
  signedCredits,
} from '../credits/format'
import { policySummary, rangeLabel } from '../credit-policies/format'
import { normalizeError } from '../services/errors'
import type { CreditPolicy } from '../credit-policies/types'

const PROVIDER = '11111111-1111-4111-8111-111111111111'
const DRIVER = '22222222-2222-4222-8222-222222222222'
const POLICY = '33333333-3333-4333-8333-333333333333'
const KEY = 'idempotency-key-0001'

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})
const calls = (fetcher: { mock: { calls: unknown[][] } }) =>
  fetcher.mock.calls.map(([url, init]) => {
    const u = new URL(String(url))
    const request = init as RequestInit
    return {
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      method: request.method,
      body: request.body ? JSON.parse(String(request.body)) : undefined,
      headers: (request.headers ?? {}) as Record<string, string>,
    }
  })
const ok = () =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))

it('uses the real SUPER_ADMIN provider credit endpoints with an Idempotency-Key', async () => {
  const fetcher = ok()
  await providerCreditsAdmin.account(PROVIDER)
  await providerCreditsAdmin.ledger(PROVIDER, { page: 2, pageSize: 20 })
  await providerCreditsAdmin.recharge(
    PROVIDER,
    { credits: 500, method: 'TRANSFER', externalReference: 'SPEI 0123' },
    KEY,
  )
  await providerCreditsAdmin.adjustment(
    PROVIDER,
    { amount: -20, reason: 'Corrección de una recarga duplicada' },
    KEY,
  )
  const [account, ledger, recharge, adjustment] = calls(fetcher)
  expect(account).toMatchObject({
    path: `/api/v1/admin/providers/${PROVIDER}/credits`,
    method: 'GET',
    body: undefined,
  })
  expect(ledger).toMatchObject({
    path: `/api/v1/admin/providers/${PROVIDER}/credits/ledger`,
    query: { page: '2', pageSize: '20' },
  })
  expect(recharge).toMatchObject({
    path: `/api/v1/admin/providers/${PROVIDER}/credits/recharge`,
    method: 'POST',
    body: { credits: 500, method: 'TRANSFER', externalReference: 'SPEI 0123' },
  })
  expect(adjustment).toMatchObject({
    path: `/api/v1/admin/providers/${PROVIDER}/credits/adjustment`,
    method: 'POST',
    body: { amount: -20, reason: 'Corrección de una recarga duplicada' },
  })
  // A double click or a retry must never recharge twice.
  for (const movement of [recharge, adjustment])
    expect(movement.headers['Idempotency-Key']).toBe(KEY)
  // The account, its owner and the balance are decided by the backend: they never travel in a body.
  for (const movement of [recharge, adjustment])
    for (const forbidden of [
      'creditAccountId',
      'ownerType',
      'providerId',
      'balance',
      'balanceAfter',
      'type',
    ])
      expect(Object.keys(movement.body as object)).not.toContain(forbidden)
})

it('keeps the independent driver on its own credit routes', async () => {
  const fetcher = ok()
  await independentCreditsAdmin.account(DRIVER)
  await independentCreditsAdmin.ledger(DRIVER, { page: 1, pageSize: 20 })
  await independentCreditsAdmin.recharge(
    DRIVER,
    { credits: 100, method: 'CASH' },
    KEY,
  )
  await independentCreditsAdmin.adjustment(
    DRIVER,
    { amount: 5, reason: 'Ajuste por incidencia' },
    KEY,
  )
  const paths = calls(fetcher).map((call) => call.path)
  expect(paths).toEqual([
    `/api/v1/admin/drivers/${DRIVER}/independent/credits`,
    `/api/v1/admin/drivers/${DRIVER}/independent/credits/ledger`,
    `/api/v1/admin/drivers/${DRIVER}/independent/credits/recharge`,
    `/api/v1/admin/drivers/${DRIVER}/independent/credits/adjustment`,
  ])
  // Never the provider's account: a person can be both and the money is not the same.
  expect(paths.every((path) => !path.includes('/admin/providers/'))).toBe(true)
})

it('reads the owner routes: provider scope as query, driver from the session', async () => {
  const fetcher = ok()
  await myProviderCredits.account(PROVIDER)
  await myProviderCredits.ledger(PROVIDER, { page: 3, pageSize: 20 })
  await myDriverCredits.account()
  await myDriverCredits.ledger({ page: 1, pageSize: 20 })
  const [account, ledger, driver, driverLedger] = calls(fetcher)
  expect(account).toMatchObject({
    path: '/api/v1/provider/credits',
    query: { providerId: PROVIDER },
    method: 'GET',
  })
  expect(ledger).toMatchObject({
    path: '/api/v1/provider/credits/ledger',
    query: { providerId: PROVIDER, page: '3', pageSize: '20' },
  })
  expect(driver).toMatchObject({
    path: '/api/v1/driver/credits',
    query: {},
    method: 'GET',
  })
  expect(driverLedger.path).toBe('/api/v1/driver/credits/ledger')
  // The driver's account is resolved from the JWT: no id of any kind is sent.
  expect(Object.keys(driverLedger.query)).toEqual(['page', 'pageSize'])
})

it('uses the real credit policy endpoints and never edits a published version', async () => {
  const fetcher = ok()
  await creditPolicies.list({ page: 1, pageSize: 20, status: 'ACTIVE' })
  await creditPolicies.get(POLICY)
  await creditPolicies.create({
    serviceType: 'LOCAL_DELIVERY',
    actorType: 'PROVIDER',
    calculationType: 'PER_KM',
    creditsPerKm: 2,
    minimumCredits: 5,
  })
  await creditPolicies.createVersion(POLICY, {
    calculationType: 'FLAT',
    flatCredits: 9,
    reason: 'Nueva condición comercial',
  })
  await creditPolicies.calculate({
    serviceType: 'LOCAL_DELIVERY',
    actorType: 'INDEPENDENT_DRIVER',
    distanceMeters: 4200,
  })
  const [list, detail, create, version, calculation] = calls(fetcher)
  expect(list).toMatchObject({
    path: '/api/v1/admin/credit-policies',
    query: { page: '1', pageSize: '20', status: 'ACTIVE' },
    method: 'GET',
  })
  expect(detail.path).toBe(`/api/v1/admin/credit-policies/${POLICY}`)
  expect(create).toMatchObject({
    path: '/api/v1/admin/credit-policies',
    method: 'POST',
    body: {
      serviceType: 'LOCAL_DELIVERY',
      actorType: 'PROVIDER',
      calculationType: 'PER_KM',
      creditsPerKm: 2,
      minimumCredits: 5,
    },
  })
  expect(version).toMatchObject({
    path: `/api/v1/admin/credit-policies/${POLICY}/versions`,
    method: 'POST',
    body: { calculationType: 'FLAT', flatCredits: 9 },
  })
  // version, status, effectiveFrom and the author are the server's decision.
  for (const forbidden of [
    'version',
    'status',
    'effectiveFrom',
    'createdByUserId',
  ])
    expect(Object.keys(version.body as object)).not.toContain(forbidden)
  expect(calculation).toMatchObject({
    path: '/api/v1/admin/credit-policies/calculation',
    query: {
      serviceType: 'LOCAL_DELIVERY',
      actorType: 'INDEPENDENT_DRIVER',
      distanceMeters: '4200',
    },
    method: 'GET',
  })
})

it('offers no endpoint the backend does not have', () => {
  const sources = [creditsSource, policiesSource].join('\n')
  // Refunds are a consequence of releasing or cancelling a service (V1.10-E), never a button.
  for (const forbidden of [
    '/refund',
    'credits/refund',
    'admin/refund',
    'credits/transfer',
    'credits/purchase',
    'checkout',
  ])
    expect(sources).not.toContain(forbidden)
  // A policy version is immutable and an account is never created from the web.
  expect(sources).not.toMatch(/'(PATCH|DELETE|PUT)'/)
  expect(Object.keys(creditPolicies)).toEqual([
    'list',
    'get',
    'create',
    'createVersion',
    'calculate',
  ])
  expect(Object.keys(myProviderCredits)).toEqual(['account', 'ledger'])
  expect(Object.keys(myDriverCredits)).toEqual(['account', 'ledger'])
})

it('generates a distinct idempotency key per intentional movement', () => {
  const keys = new Set(Array.from({ length: 5 }, () => movementKey()))
  expect(keys.size).toBe(5)
  for (const key of keys) expect(key.length).toBeGreaterThanOrEqual(8)
})

it.each([
  ['CREDIT_ACCOUNT_NOT_FOUND', 'No es un saldo en cero'],
  ['INSUFFICIENT_CREDITS', 'No hay créditos suficientes'],
  ['CREDIT_BALANCE_LIMIT', 'superaría el máximo'],
  [
    'CREDIT_IDEMPOTENCY_CONFLICT',
    'Ya se registró otro movimiento con esa clave',
  ],
  ['CREDIT_MOVEMENT_CONFLICT', 'cambió la cuenta al mismo tiempo'],
  ['CREDIT_POLICY_UNAVAILABLE', 'No existe una política de créditos vigente'],
  ['CREDIT_POLICY_EXISTS', 'Crea una nueva versión desde la vigente'],
  ['CREDIT_POLICY_VERSION_CONFLICT', 'ya fue reemplazada por otra'],
  ['CREDIT_COST_OUT_OF_RANGE', 'fuera del rango permitido'],
  ['CREDIT_REFUND_INTEGRITY_ERROR', 'Contacta a Mandaria'],
])('translates %s without raw backend text', async (code, text) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        code,
        message: 'Credit account has insufficient balance',
      }),
      { status: 409 },
    ),
  )
  const error = await providerCreditsAdmin
    .recharge(PROVIDER, { credits: 1, method: 'CASH' }, KEY)
    .catch((e: unknown) => e)
  expect(error).toMatchObject({ status: 409, code })
  expect((error as Error).message).toContain(text)
  expect((error as Error).message).not.toMatch(/balance|account/i)
})

it('never formats credits as money', () => {
  for (const text of [
    formatCredits(7),
    formatCredits(1),
    formatCredits(0),
    signedCredits(7),
    signedCredits(-7),
    creditCostLabel(7),
  ]) {
    expect(text).not.toMatch(/\$|MXN|peso/i)
    expect(text).toMatch(/crédito/)
  }
  expect(formatCredits(7)).toBe('7 créditos')
  expect(formatCredits(1)).toBe('1 crédito')
  expect(signedCredits(100)).toBe('+100 créditos')
  expect(signedCredits(-7)).toBe('-7 créditos')
})

it('keeps a missing credit cost apart from a zero cost', () => {
  expect(creditCostLabel(null)).toBe('Sin costo registrado')
  expect(creditCostLabel(undefined)).toBe('Sin costo registrado')
  expect(creditCostLabel(null)).not.toMatch(/0/)
  expect(creditCostLabel(0)).toBe('0 créditos')
})

it('labels every ledger movement, including one the backend may add later', () => {
  expect(formatLedgerType('RECHARGE')).toBe('Recarga')
  expect(formatLedgerType('ADMIN_ADJUSTMENT')).toBe('Ajuste administrativo')
  expect(formatLedgerType('SERVICE_AWARD')).toBe('Cargo por servicio')
  expect(formatLedgerType('SERVICE_REFUND')).toBe('Devolución de servicio')
  expect(formatLedgerType('SOMETHING_NEW')).toBe('Movimiento de créditos')
  expect(formatRechargeMethod('TRANSFER')).toBe('Transferencia')
  expect(formatRechargeMethod(null)).toBe('—')
})

it('converts distance only through the shared formatter', () => {
  expect(formatDistance(4200)).toBe('4.2 km (4,200 m)')
  expect(formatDistance(0)).toBe('0 km (0 m)')
  expect(
    rangeLabel({ minDistanceMeters: 0, maxDistanceMeters: 3000 }),
  ).toContain('3 km')
  expect(
    rangeLabel({ minDistanceMeters: 3000, maxDistanceMeters: null }),
  ).toMatch(/^Desde/)
})

it('summarises a policy from the fields of its own calculation type', () => {
  const base: CreditPolicy = {
    id: POLICY,
    serviceType: 'LOCAL_DELIVERY',
    actorType: 'PROVIDER',
    version: 1,
    status: 'ACTIVE',
    calculationType: 'FLAT',
    creditsPerKm: null,
    minimumCredits: null,
    flatCredits: 9,
    ranges: [],
    effectiveFrom: '2026-09-20T12:00:00Z',
    effectiveUntil: null,
    reason: null,
    createdByUserId: PROVIDER,
    createdAt: '2026-09-20T12:00:00Z',
  }
  expect(policySummary(base)).toBe('9 créditos por servicio')
  expect(
    policySummary({
      ...base,
      calculationType: 'PER_KM',
      flatCredits: null,
      creditsPerKm: 2,
      minimumCredits: 5,
    }),
  ).toBe('2 créditos por kilómetro · mínimo 5 créditos')
  expect(
    policySummary({
      ...base,
      calculationType: 'DISTANCE_RANGE',
      flatCredits: null,
      ranges: [
        {
          id: 'r1',
          position: 1,
          minDistanceMeters: 0,
          maxDistanceMeters: null,
          credits: 4,
        },
      ],
    }),
  ).toBe('1 rango de distancia')
})

it('keeps a 404 account answer safe and specific', () => {
  expect(
    normalizeError(404, {
      code: 'CREDIT_ACCOUNT_NOT_FOUND',
      message: 'not found',
    }).message,
  ).toContain('No es un saldo en cero')
})
