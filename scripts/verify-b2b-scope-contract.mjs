import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes, randomUUID } from 'node:crypto'

// OFFLINE verification only: actual compiled backend classes, in-memory storage.
// Never instantiate Prisma, load .env, call HTTP, or print test secrets/tokens.
const backend = resolve(
  process.env.MANDARIA_BACKEND_DIR || '../mandaria-backend',
)
const requireBackend = createRequire(resolve(backend, 'package.json'))
requireBackend('reflect-metadata')
const { Logger } = requireBackend('@nestjs/common')
const { Reflector } = requireBackend('@nestjs/core')
const { ConfigService } = requireBackend('@nestjs/config')
const { JwtService } = requireBackend('@nestjs/jwt')
const { validate } = requireBackend('class-validator')
Logger.overrideLogger(false)
const load = (path) =>
  import(pathToFileURL(resolve(backend, 'dist', path)).href)

async function verify() {
  const { INTEGRATION_SCOPES, IntegrationScopesGuard } = await load(
    'integrations/integration-scopes.js',
  )
  const { CreateCredentialDto } = await load('integrations/integrations.dto.js')
  const { IntegrationsService } = await load(
    'integrations/integrations.service.js',
  )
  const { IntegrationAuthService } = await load(
    'integrations/integration-auth.service.js',
  )
  const { DeliveryQuotesController } = await load(
    'delivery-quotes/delivery-quotes.controller.js',
  )
  const document = JSON.parse(
    readFileSync(resolve(backend, 'docs/openapi.json'), 'utf8'),
  )
  const catalog =
    document.components.schemas.CreateCredentialDto.properties.scopes.items.enum
  const extractCatalog = (file, name) => {
    const text = readFileSync(file, 'utf8')
    const block = text.match(
      new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`),
    )?.[1]
    assert.ok(block, 'Scope catalog must exist')
    return Array.from(block.matchAll(/'([^']+)'/g), (m) => m[1])
  }
  assert.deepEqual(INTEGRATION_SCOPES, catalog)
  assert.deepEqual(
    extractCatalog(
      resolve(backend, 'src/integrations/integration-scopes.ts'),
      'INTEGRATION_SCOPES',
    ),
    catalog,
  )
  assert.deepEqual(
    extractCatalog(resolve('src/types/api.ts'), 'scopes'),
    catalog,
  )
  const reflector = new Reflector()
  const accept = DeliveryQuotesController.prototype.accept
  assert.deepEqual(reflector.get('integration:scopes', accept), [
    'quotes:accept',
  ])
  const readHandlers = Object.getOwnPropertyNames(
    DeliveryQuotesController.prototype,
  ).filter((name) =>
    reflector
      .get('integration:scopes', DeliveryQuotesController.prototype[name])
      ?.includes('quotes:read'),
  )
  assert.equal(readHandlers.length, 2)
  const guard = new IntegrationScopesGuard(reflector)
  const context = (principal, handler) => ({
    getHandler: () => handler,
    getClass: () => DeliveryQuotesController,
    switchToHttp: () => ({ getRequest: () => ({ integration: principal }) }),
  })
  let count = 0
  for (const selected of [
    [],
    ['quotes:read'],
    ['quotes:accept'],
    ['quotes:read', 'quotes:accept'],
    [...catalog],
  ]) {
    const dto = Object.assign(new CreateCredentialDto(), { scopes: selected })
    assert.equal((await validate(dto)).length, 0)
    const integration = {
      id: randomUUID(),
      status: 'ACTIVE',
      name: 'In-memory fixture',
      code: 'TEST',
    }
    const records = new Map()
    const memory = {
      $queryRaw: async () => [],
      integrationClient: { findUnique: async () => integration },
      integrationCredential: {
        create: async ({ data }) => {
          records.set(data.id, {
            ...structuredClone(data),
            status: 'ACTIVE',
            revokedAt: null,
            client: integration,
          })
          return {}
        },
        findUnique: async ({ where }) => records.get(where.id),
        update: async () => ({}),
      },
      $transaction: async (fn) => fn(memory),
    }
    const service = new IntegrationsService(memory)
    const issued = await service.createCredential(
      integration.id,
      dto,
      randomUUID(),
    )
    assert.equal(issued.integrationId, integration.id)
    assert.deepEqual(records.get(issued.clientId).scopes, selected)
    const jwt = new JwtService()
    const auth = new IntegrationAuthService(
      memory,
      jwt,
      new ConfigService({
        INTEGRATION_JWT_SECRET: randomBytes(48).toString('hex'),
        INTEGRATION_ACCESS_TOKEN_EXPIRES_IN: 60,
      }),
    )
    const token = await auth.token(issued.clientId, issued.clientSecret)
    assert.deepEqual(jwt.decode(token.accessToken).scopes, selected)
    const principal = await auth.authenticate(token.accessToken)
    assert.deepEqual(principal.scopes, selected)
    for (const [scope, handler] of [
      ['quotes:accept', accept],
      ...readHandlers.map((name) => [
        'quotes:read',
        DeliveryQuotesController.prototype[name],
      ]),
    ]) {
      if (selected.includes(scope))
        assert.equal(guard.canActivate(context(principal, handler)), true)
      else
        assert.throws(
          () => guard.canActivate(context(principal, handler)),
          (error) => error.getStatus() === 403,
        )
    }
    // Increasing current database permissions cannot broaden an already issued token.
    records.get(issued.clientId).scopes = [...catalog]
    assert.deepEqual(
      (await auth.authenticate(token.accessToken)).scopes,
      selected,
    )
    records.get(issued.clientId).scopes = []
    assert.deepEqual((await auth.authenticate(token.accessToken)).scopes, [])
    count++
  }
  assert.ok(
    (
      await validate(
        Object.assign(new CreateCredentialDto(), {
          scopes: ['quotes:unknown'],
        }),
      )
    ).length > 0,
  )
  console.log(
    `PASS: local source/OpenAPI/compiled backend/Web catalogs match (${catalog.length} scopes).`,
  )
  console.log(
    `PASS: ${count} in-memory cases: DTO, exact persistence payload, JWT issuance/authentication, real quote route guards, no implicit grants.`,
  )
  console.log(
    'No database, network, real credential or environment secrets used. QA deployment not verified.',
  )
}
verify().catch(() => {
  console.error(
    'FAIL: offline scope contract verification. Check the adjacent backend build and OpenAPI; no sensitive diagnostics printed.',
  )
  process.exitCode = 1
})
