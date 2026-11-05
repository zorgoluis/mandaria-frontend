import { afterEach, expect, it, vi } from 'vitest'
import { integrations } from '../integrations/service'
import type { Scope } from '../types/api'

afterEach(() => vi.restoreAllMocks())
it('preserves expiry and sends no scope body on rotation', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 201 }))
  await integrations.createCredential('integration-id', {
    scopes: ['deliveries:pickup-reference:write'],
    expiresAt: '2099-01-01T00:00:00.000Z',
  })
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
    scopes: ['deliveries:pickup-reference:write'],
    expiresAt: '2099-01-01T00:00:00.000Z',
  })
  await integrations.rotate('integration-id', 'credential-id')
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(String(fetcher.mock.calls[1][0])).toBe(
    'http://localhost:3000/api/v1/admin/integrations/integration-id/credentials/credential-id/rotate',
  )
  expect(fetcher.mock.calls[1][1]?.method).toBe('POST')
  expect(fetcher.mock.calls[1][1]?.body).toBeUndefined()
})
it.each<{ selected: Scope[] }>([
  { selected: [] },
  { selected: ['deliveries:read'] },
  { selected: ['deliveries:read', 'deliveries:confirmation-code:read'] },
  { selected: ['deliveries:pickup-reference:write'] },
  {
    selected: [
      'quotes:create',
      'quotes:read',
      'quotes:accept',
      'deliveries:create',
      'deliveries:read',
      'deliveries:pickup-reference:write',
    ],
  },
  {
    selected: [
      'prequotes:convert',
      'prequotes:create',
      'prequotes:read',
      'quotes:create',
      'quotes:read',
      'quotes:accept',
      'deliveries:create',
      'deliveries:read',
      'deliveries:confirmation-code:read',
      'deliveries:pickup-reference:write',
      'deliveries:location:read',
      'deliveries:tracking-links:manage',
      'deliveries:cancel',
    ],
  },
  { selected: ['prequotes:create'] },
  { selected: ['prequotes:read'] },
  { selected: ['prequotes:convert'] },
  { selected: ['prequotes:convert', 'prequotes:create', 'prequotes:read'] },
  { selected: ['quotes:read'] },
  { selected: ['quotes:accept'] },
  { selected: ['quotes:read', 'quotes:accept'] },
  {
    selected: [
      'quotes:create',
      'quotes:read',
      'quotes:accept',
      'deliveries:create',
      'deliveries:read',
      'deliveries:pickup-reference:write',
      'deliveries:location:read',
      'deliveries:tracking-links:manage',
      'deliveries:cancel',
    ],
  },
])(
  'POST preserves exactly the selected scopes: $selected',
  async ({ selected }) => {
    // Stub transport only; exercise the actual feature service and HTTP client.
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }))
    await integrations.createCredential('existing-integration', {
      scopes: selected,
    })
    expect(fetcher).toHaveBeenCalledOnce()
    const [url, options] = fetcher.mock.calls[0]
    expect(String(url)).toBe(
      'http://localhost:3000/api/v1/admin/integrations/existing-integration/credentials',
    )
    expect(options?.method).toBe('POST')
    expect(JSON.parse(String(options?.body))).toEqual({ scopes: selected })
  },
)
