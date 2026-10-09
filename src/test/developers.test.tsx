/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { RootRoutes } from '../app/Root'
import { queryClient } from '../services/query'
import { authService } from '../services/api'
const publicFile = (name: string) =>
  readFileSync(`public/developers/assets/${name}`, 'utf8')
beforeEach(() => {
  queryClient.clear()
  vi.restoreAllMocks()
})
function mount(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <RootRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
it('anonymous portal does not restore an administrative session or send tokens', async () => {
  sessionStorage.setItem('mandaria.refresh', 'synthetic-stale-session')
  const restore = vi
    .spyOn(authService, 'restore')
    .mockImplementation(() => new Promise(() => undefined))
  const fetcher = vi.spyOn(globalThis, 'fetch')
  mount('/developers')
  expect(
    screen.getByRole('heading', {
      name: 'Logística conectada, contratos claros.',
    }),
  ).toBeInTheDocument()
  expect(restore).not.toHaveBeenCalled()
  expect(fetcher).not.toHaveBeenCalled()
  expect(screen.getByText('http://localhost:3000')).toBeInTheDocument()
  expect(screen.getByText('https://mandaria.com.mx/api/v1')).toBeInTheDocument()
  expect(
    screen.getByText(/MANDARIA_API_BASE=https:\/\/mandaria.com.mx\/api\/v1/),
  ).toBeInTheDocument()
})
it.each(['authentication', 'prequotes', 'errors', 'webhooks', 'execution'])(
  'loads direct anonymous documentation route %s from reviewed local assets',
  async (route) => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async (input) =>
          new Response(
            publicFile(String(input).split('/developers/assets/')[1]),
            { status: 200 },
          ),
      )
    mount('/developers/' + route)
    expect(await screen.findByText('Descargar guía revisada')).toHaveAttribute(
      'download',
    )
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/developers/assets/B2B-'),
      { credentials: 'omit' },
    )
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes('/api/v1')),
    ).toBe(false)
  },
)
it('reference offers only the reviewed JSON and copyable synthetic examples', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(publicFile('openapi-b2b.json'), { status: 200 }),
  )
  const copy = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: copy },
  })
  mount('/developers/reference')
  expect(
    screen.getByRole('link', { name: 'Descargar OpenAPI B2B' }),
  ).toHaveAttribute('href', '/developers/assets/openapi-b2b.json')
  expect(
    await screen.findByText('/api/v1/delivery-prequotes/{publicId}/convert'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getAllByRole('button', { name: 'Copiar ejemplo' })[0])
  expect(copy).toHaveBeenCalledOnce()
  expect(screen.queryByRole('link', { name: /Swagger/ })).toBeNull()
  const spec = JSON.parse(publicFile('openapi-b2b.json')) as {
    servers: { url: string }[]
  }
  expect(
    screen.getByText(/Servidor del artefacto descargable:/),
  ).toHaveTextContent(spec.servers[0].url)
})
it('public artifact includes only reviewed B2B paths and no admin security or endpoint schema', () => {
  const spec = JSON.parse(publicFile('openapi-b2b.json')) as {
    paths: Record<string, Record<string, unknown>>
    components: {
      securitySchemes: Record<string, unknown>
      schemas: Record<string, unknown>
    }
  }
  expect(
    Object.values(spec.paths).reduce(
      (n, methods) => n + Object.keys(methods).length,
      0,
    ),
  ).toBe(20)
  expect(
    Object.keys(spec.paths).some((p) =>
      /admin|provider|driver|customer|shared|auth\//.test(p),
    ),
  ).toBe(false)
  expect(Object.keys(spec.components.securitySchemes)).toEqual([
    'integration-bearer',
  ])
  expect(spec.components.schemas).not.toHaveProperty('WebhookSecretResponse')
  expect(
    Object.keys(spec.components.schemas).some((name) =>
      /Custody|Resolution|ExecutionEvent/.test(name),
    ),
  ).toBe(false)
  const publicJson = publicFile('openapi-b2b.json')
  expect(publicJson).toContain('executionProgress')
  expect(publicJson).toContain('executionOutcome')
  const guide = publicFile('B2B-PUBLIC-GUIDE.md')
  expect(guide).toContain('delivery.completed')
  expect(guide).toContain('executionOutcome')
})

it('tracking documents QA, shared polling, custody and renders exact downloaded examples', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(
      async (input) =>
        new Response(publicFile(String(input).split('/developers/assets/')[1])),
    )
  mount('/developers/execution')
  expect(
    await screen.findByText('Pedido recogido con seguimiento detallado'),
  ).toBeInTheDocument()
  expect(screen.getByText(/pendiente de despliegue/)).toBeInTheDocument()
  for (const title of [
    'Campos y presentación',
    'Descartar respuestas atrasadas',
    'Ejecutor e incidencias',
    'Consulta compartida, frecuencia y errores',
    'delivery.completed continúa igual',
  ]) {
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  }
  const spec = JSON.parse(publicFile('openapi-b2b.json'))
  const examples = spec.paths['/api/v1/delivery-requests/{publicId}/status'].get
    .responses['200'].content['application/json'].examples as Record<
    string,
    { summary: string; value: unknown }
  >
  for (const example of Object.values(examples)) {
    const summary = screen.getByText(example.summary)
    expect(
      JSON.parse(
        summary.closest('details')!.querySelector('code')!.textContent!,
      ),
    ).toEqual(example.value)
  }
  expect(
    fetcher.mock.calls.every(([url]) =>
      String(url).startsWith('/developers/assets/'),
    ),
  ).toBe(true)
  expect(
    screen.getByRole('link', {
      name: 'Contrato, ejemplos, recuperación y límites',
    }),
  ).toHaveAttribute('href', '/developers/execution')
})

it('reviewed schema preserves exact nullable modes, assignment states and terminal outcomes', () => {
  const schemas = JSON.parse(publicFile('openapi-b2b.json')).components.schemas
  const fields = schemas.DeliveryStatusResponse.properties
  expect(fields.executionProgress.description).toContain(
    'Comparar publicVersion numéricamente por solicitud',
  )
  expect(fields.executionProgress.description).toContain(
    'revision describe únicamente la ejecución interna',
  )
  expect(
    schemas.PublicExecutionProgressResponse.properties.revision,
  ).toMatchObject({ type: 'number', minimum: 1 })
  expect(schemas.PublicExecutionProgressResponse.required).toContain('revision')
  expect(fields.publicVersion).toMatchObject({
    type: 'string',
    pattern: '^[1-9][0-9]*$',
  })
  expect(fields.trackingMode).toMatchObject({
    enum: ['LEGACY', 'DETAILED'],
    nullable: true,
  })
  expect(fields.assignmentState.enum).toEqual(['NONE', 'ACTIVE', 'ENDED'])
  expect(fields.terminalOutcome.nullable).toBe(true)
  expect(schemas.PublicTerminalOutcomeResponse.properties.type.enum).toEqual([
    'DELIVERED',
    'RETURNED_TO_ORIGIN',
    'CANCELLED',
    'EXPIRED',
  ])
  expect(
    schemas.PublicTerminalOutcomeResponse.properties.occurredAt.nullable,
  ).toBe(true)
})

it.each([
  ['9', '10', true],
  ['10', '9', false],
  ['10', '10', false],
  ['9007199254740992', '9007199254740993', true],
  ['9007199254740993', '9007199254740992', false],
  ['10', undefined, false],
  ['10', '0', false],
  ['10', '01', false],
  ['10', 11, false],
  ['10', '1e2', false],
  [undefined, '11', false],
])(
  'copyable comparison example orders %s → %s safely',
  (previous, incoming, expected) => {
    const guide = readFileSync('src/developers/tracking.md', 'utf8').replaceAll(
      '\r\n',
      '\n',
    )
    const code = guide.split('```javascript\n')[1].split('```')[0]
    expect(
      runInNewContext(code + '\nshouldReplace(previous, incoming)', {
        previous: { publicId: 'MDR-000123', publicVersion: previous },
        incoming: { publicId: 'MDR-000123', publicVersion: incoming },
      }),
    ).toBe(expected)
  },
)

it('comparison example accepts first validated snapshot but never compares different MDRs', () => {
  const code = readFileSync('src/developers/tracking.md', 'utf8')
    .replaceAll('\r\n', '\n')
    .split('```javascript\n')[1]
    .split('```')[0]
  const incoming = { publicId: 'MDR-000123', publicVersion: '18' }
  expect(
    runInNewContext(code + '\nshouldReplace(null, incoming)', { incoming }),
  ).toBe(true)
  expect(
    runInNewContext(code + '\nshouldReplace(previous, incoming)', {
      incoming,
      previous: { publicId: 'MDR-000124', publicVersion: '1' },
    }),
  ).toBe(false)
})
