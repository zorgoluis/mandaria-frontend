import { beforeEach, expect, it, vi } from 'vitest'
import {
  verification,
  putEvidence,
  validateFile,
} from '../verification/service'
import { authService } from '../services/api'
import { actor, caseId, resource, requirements } from './verification-fixtures'
const m = { actor, key: resource, operation: 'SUBMIT' as const, target: caseId }
beforeEach(() => sessionStorage.clear())
it('exact DTO and original UUID, single api prefix; lost receipt is uncertain', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('', { status: 200 }))
  await expect(
    verification.command(m, '/verification-cases/' + caseId + '/submit', {
      expectedVersion: 3,
    }),
  ).rejects.toMatchObject({ status: 0 })
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[0][0]).toBe(
    'http://localhost:3000/api/v1/verification-cases/' + caseId + '/submit',
  )
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    body: '{"expectedVersion":3}',
    headers: { 'Idempotency-Key': resource },
  })
})
it('consultation query and close body follow documentary contract', async () => {
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{"state":"ABSENT"}'))
  await verification.attempt(m)
  await verification.attempt(m, true)
  expect(String(f.mock.calls[0][0])).toContain(
    'operation=SUBMIT&target=' + caseId,
  )
  expect(f.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    body: JSON.stringify({ operation: 'SUBMIT', target: caseId }),
  })
})
it('publication returns its own receipt without a case id and recovers through documentary attempts', async () => {
  const receipt = {
    version: 'SYNTHETIC-1',
    hash: 'a'.repeat(64),
    scope: 'DRIVER',
    environment: 'PRODUCTION',
    publishedAt: '2026-10-19T00:00:00Z',
    policyRevision: 2,
    enforcementEnabled: false,
  }
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(receipt))
    .mockResolvedValue(Response.json({ state: 'ABSENT' }))
  const marker = { ...m, operation: 'PUBLISH_TERMS' as const, target: 'POLICY' }
  await expect(
    verification.command(marker, '/admin/verification-terms/publications', {}),
  ).resolves.toEqual(receipt)
  await verification.attempt(marker)
  await verification.attempt(marker, true)
  expect(String(f.mock.calls[1][0])).toContain(
    '/verification-command-attempts/' +
      resource +
      '?operation=PUBLISH_TERMS&target=POLICY',
  )
  expect(f.mock.calls[2][1]?.body).toBe(
    JSON.stringify({ operation: 'PUBLISH_TERMS', target: 'POLICY' }),
  )
  expect(JSON.stringify(f.mock.calls)).not.toContain('/privacy/')
})
it('malformed publication response is uncertain, never an ordinary case receipt', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({ id: resource, status: 'ACCEPTED' }),
  )
  await expect(
    verification.command(
      { ...m, operation: 'PUBLISH_TERMS', target: 'POLICY' },
      '/admin/verification-terms/publications',
      {},
    ),
  ).rejects.toMatchObject({ status: 0 })
})
it.each(['application/pdf', 'image/svg+xml', 'text/html'])(
  'rejects %s locally',
  (type) => {
    expect(() =>
      validateFile(new File(['synthetic'], 'file', { type }), requirements),
    ).toThrow(/JPEG/)
  },
)
it.each(['image/jpeg', 'image/png'])(
  'accepts %s for server validation',
  (type) => {
    expect(() =>
      validateFile(new File(['synthetic'], 'file', { type }), requirements),
    ).not.toThrow()
  },
)
it('rejects empty or oversized files', () => {
  expect(() =>
    validateFile(new File([], 'a', { type: 'image/png' }), requirements),
  ).toThrow()
  expect(() =>
    validateFile(new File(['1234'], 'a', { type: 'image/png' }), {
      ...requirements,
      maxBytes: 2,
    }),
  ).toThrow()
})
it('PUT never sends Mandaria auth/referrer/cookies and does not follow redirects', async () => {
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 200 }))
  const file = new File(['synthetic'], 'a', { type: 'image/png' })
  await putEvidence(
    'https://storage.example.test/upload',
    file,
    '2099-01-01T00:00:00Z',
  )
  expect(f.mock.calls[0][1]).toMatchObject({
    method: 'PUT',
    body: file,
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/octet-stream' },
  })
  expect(JSON.stringify(f.mock.calls[0][1]?.headers)).not.toMatch(
    /Bearer|Authorization/,
  )
})
it('expired URL and failed upload do not complete a case', async () => {
  const f = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('network'))
  const file = new File(['x'], 'a')
  await expect(
    putEvidence('https://storage.example.test/a', file, '2000-01-01T00:00:00Z'),
  ).rejects.toThrow(/caducó/)
  expect(f).not.toHaveBeenCalled()
  await expect(
    putEvidence('https://storage.example.test/a', file, '2099-01-01T00:00:00Z'),
  ).rejects.toThrow(/incompleto/)
})
it('private evidence uses authenticated PNG proxy and refreshes centrally', async () => {
  let access = 0
  const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (
      String(url).endsWith('/auth/login') ||
      String(url).endsWith('/auth/refresh')
    )
      return new Response(
        JSON.stringify({
          accessToken: 'synthetic-access',
          refreshToken: 'synthetic-refresh',
        }),
      )
    if (String(url).endsWith('/auth/me?projection=session'))
      return new Response(
        JSON.stringify({
          accessMode: 'STANDARD',
          identity: {
            id: actor,
            email: 'synthetic@example.test',
            role: 'DRIVER',
            active: true,
            emailVerifiedAt: null,
            createdAt: '2026-10-17T00:00:00Z',
            updatedAt: '2026-10-17T00:00:00Z',
          },
        }),
      )
    if (access++ === 0) return new Response('{}', { status: 401 })
    return new Response(new Uint8Array([1, 2]), {
      headers: { 'Content-Type': 'image/png' },
    })
  })
  await authService.login('synthetic@example.test', 'synthetic-password')
  const blob = await verification.access(caseId, resource)
  expect(blob.type).toBe('image/png')
  const calls = f.mock.calls.filter(([u]) => String(u).endsWith('/access'))
  expect(calls).toHaveLength(2)
  expect(calls[1][1]?.headers).toMatchObject({
    Authorization: 'Bearer synthetic-access',
  })
  expect(localStorage.length).toBe(0)
})

it.each([
  'VERIFICATION_REVIEW_REQUIRED',
  'VERIFICATION_REVALIDATION_REQUIRED',
  'VERIFICATION_EXPIRED',
  'VERIFICATION_TEST_RECEIPT_NOT_OPERATIONAL',
  'TERMS_ACCEPTANCE_REQUIRED',
  'VERIFICATION_VEHICLE_CLASSIFICATION_REQUIRED',
  'LICENSE_REQUIRED',
  'LICENSE_EXPIRED',
  'LICENSE_CATEGORY_MISMATCH',
])(
  'operational documentary rejection %s has a corrective human message',
  async (code) => {
    const { normalizeError } = await import('../services/errors')
    const error = normalizeError(409, { code })
    expect(error.code).toBe(code)
    expect(error.message).not.toContain(code)
    expect(error.message).not.toContain('asociaciones y el estado')
  },
)
