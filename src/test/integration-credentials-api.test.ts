import { afterEach, expect, it, vi } from 'vitest'
import { integrations } from '../integrations/service'
import type { Scope } from '../types/api'

afterEach(() => vi.restoreAllMocks())
it.each<{ selected: Scope[] }>([
  { selected: [] },
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
