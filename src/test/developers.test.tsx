/// <reference types="node" />
import { readFileSync } from 'node:fs'
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
})
it.each(['authentication', 'prequotes', 'errors', 'webhooks'])(
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
  ).toBe(15)
  expect(
    Object.keys(spec.paths).some((p) => /admin|provider|driver|auth\//.test(p)),
  ).toBe(false)
  expect(Object.keys(spec.components.securitySchemes)).toEqual([
    'integration-bearer',
  ])
  expect(spec.components.schemas).not.toHaveProperty('WebhookSecretResponse')
})
