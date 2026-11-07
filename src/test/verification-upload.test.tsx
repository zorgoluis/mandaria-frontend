import { preparePhoto } from '../verification/prepare-photo'
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { FeedbackProvider } from '../components/Feedback'
import { Evidence } from '../verification/evidence'
import { ApiError } from '../services/errors'
import { verification, putEvidence } from '../verification/service'
import {
  actor,
  caseFixture,
  caseId,
  attachmentId,
  requirements,
} from './verification-fixtures'
import type { Role } from '../types/api'
import { repRequirements, repCase } from './representative-fixtures'
vi.mock('../verification/service', async (original) => ({
  ...(await original<typeof import('../verification/service')>()),
  putEvidence: vi.fn(),
  verification: { command: vi.fn(), get: vi.fn(), access: vi.fn() },
}))
function mount(child: ReactNode, role: Role = 'DRIVER', path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const auth = {
    user: {
      id: actor,
      email: 'synthetic@example.test',
      role,
      active: true,
      emailVerifiedAt: '2026-10-13T00:00:00Z',
      createdAt: '',
      updatedAt: '',
    },
    loading: false,
    expired: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn(),
  }
  return {
    ...render(
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <FeedbackProvider>
            <MemoryRouter initialEntries={[path]}>{child}</MemoryRouter>
          </FeedbackProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
    client,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
it('does not offer ownership proof or complete legacy uploads, retaining historical evidence', async () => {
  const record = {
    ...caseFixture,
    subjectType: 'VEHICLE' as const,
    data: { ownershipEvidenceType: 'OWNED' as const },
    attachments: ['CREATED', 'VALIDATED'].map((status, i) => ({
      id: attachmentId + i,
      category: 'OWNERSHIP_PROOF',
      status: status as 'CREATED' | 'VALIDATED',
      bytes: 100,
      mime: 'image/png',
      hash: null,
      createdAt: caseFixture.createdAt,
    })),
  }
  mount(<Evidence record={record} requirements={requirements} canWrite />)
  expect(
    screen.queryByRole('option', { name: /histórico|propiedad/i }),
  ).toBeNull()
  expect(
    screen.getByRole('option', { name: 'Tarjeta de circulación' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Consultar y completar carga' }),
  ).toBeNull()
  expect(
    screen.getAllByText('Adjunto histórico (ya no solicitado)'),
  ).toHaveLength(2)
  expect(
    screen.getByRole('button', { name: 'Ver evidencia' }),
  ).toBeInTheDocument()
  expect(verification.command).not.toHaveBeenCalled()
})

it('does not show an empty upload form for OWNED bicycle with explicit null', () => {
  mount(
    <Evidence
      record={{
        ...caseFixture,
        subjectType: 'VEHICLE',
        registrationCardRequired: false,
        data: { ownershipEvidenceType: 'OWNED' },
      }}
      requirements={{
        ...requirements,
        vehicle: { ...requirements.vehicle, OWNED: null },
      }}
      canWrite
    />,
  )
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.queryByRole('button', { name: /Cargar imagen/ })).toBeNull()
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verification.get).mockResolvedValue({ ...caseFixture, revision: 4 })
  vi.mocked(verification.command).mockImplementation(async (marker) => ({
    id: attachmentId,
    status: marker.operation === 'CREATE_UPLOAD' ? 'CREATED' : 'VALIDATED',
    revision: 4,
    expiresAt: '2099-01-01T00:00:00Z',
    uploadUrl: 'https://storage.example.test/synthetic',
  }))
  vi.mocked(putEvidence).mockResolvedValue(undefined)
  // jsdom does not include userEvent's FileList in FormData. Capture the actual
  // selected File object, rather than substituting a fixture for the submission.
  const NativeFormData = globalThis.FormData
  vi.spyOn(globalThis, 'FormData').mockImplementation(function (
    form?: HTMLFormElement,
  ) {
    const data = new NativeFormData(form)
    const file =
      form?.querySelector<HTMLInputElement>('input[type=file]')?.files?.[0]
    if (file) data.set('file', file)
    return data
  })
})
it.each([
  'FACE_PHOTO',
  'LICENSE',
  'REGISTRATION_CARD',
  'REPRESENTATIVE_INE_FRONT',
  'REPRESENTATIVE_INE_BACK',
  'REPRESENTATION_AUTHORITY_PAGE',
])(
  '%s: A completes once, preserves B and uploads B only on explicit submit',
  async (category) => {
    const user = userEvent.setup()
    const completion =
      deferred<Awaited<ReturnType<typeof verification.command>>>()
    const normal = vi.mocked(verification.command).getMockImplementation()!
    vi.mocked(verification.command).mockImplementation((...args) =>
      args[0].operation === 'COMPLETE_UPLOAD' &&
      vi.mocked(verification.command).mock.calls.length === 2
        ? completion.promise
        : normal(...args),
    )
    const record = category.startsWith('REPRESENT')
      ? { ...repCase, environment: 'LOCAL_TEST' as const }
      : category === 'REGISTRATION_CARD'
        ? {
            ...caseFixture,
            subjectType: 'VEHICLE' as const,
            data: { ownershipEvidenceType: 'OWNED' as const },
          }
        : {
            ...caseFixture,
            data: {
              ...caseFixture.data,
              license: {
                issuer: 'synthetic',
                category: 'A',
                expiresAt: '2099-01-01',
                vehicleTypes: ['MOTORCYCLE' as const],
              },
            },
          }
    const view = mount(
      <Evidence
        record={record}
        requirements={
          category.startsWith('REPRESENT') ? repRequirements : requirements
        }
        canWrite
      />,
    )
    const input = screen.getByLabelText(
      'Imagen sintética *',
    ) as HTMLInputElement
    const a = new File(['AAA'], 'same.png', {
      type: 'image/png',
      lastModified: 1,
    })
    const b = new File(['BBB'], 'same.png', {
      type: 'image/png',
      lastModified: 1,
    })
    await user.selectOptions(screen.getByRole('combobox'), category)
    await user.upload(input, a)
    fireEvent.submit(input.form!)
    await waitFor(() => expect(verification.command).toHaveBeenCalledTimes(2))
    await user.upload(input, b)
    fireEvent.submit(input.form!) // duplicate submit must not start B
    expect(putEvidence).toHaveBeenCalledTimes(1)
    expect(vi.mocked(putEvidence).mock.calls[0][1]).toBe(a)
    await act(async () =>
      completion.resolve({
        id: attachmentId,
        status: 'VALIDATED',
        revision: 5,
      }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Cargar imagen sintética' }),
      ).toBeEnabled(),
    )
    expect(input.files?.[0]).toBe(b)
    expect(verification.command).toHaveBeenCalledTimes(2)
    expect(vi.mocked(verification.command).mock.calls[0][0].target).toBe(caseId)
    expect(vi.mocked(verification.command).mock.calls[0][2]).toEqual({
      expectedVersion: 3,
      category,
    })
    expect(vi.mocked(verification.command).mock.calls[1][1]).toBe(
      `/verification-cases/${caseId}/uploads/${attachmentId}/complete`,
    )
    fireEvent.submit(input.form!)
    await waitFor(() => expect(verification.command).toHaveBeenCalledTimes(4))
    await waitFor(() => expect(input.files).toHaveLength(0))
    expect(putEvidence).toHaveBeenCalledTimes(2)
    expect(vi.mocked(putEvidence).mock.calls[1][1]).toBe(b)
    view.unmount()
  },
)
it.each(['retired', 'receipt'] as const)(
  '%s never transfers bytes or issues another upload command',
  async (mode) => {
    if (mode === 'retired')
      vi.mocked(verification.command).mockRejectedValue(
        new ApiError(409, 'private', 'VERIFICATION_CATEGORY_RETIRED'),
      )
    else
      vi.mocked(verification.command).mockResolvedValue({
        id: attachmentId,
        status: 'CREATED',
        revision: 4,
      })
    const user = userEvent.setup()
    mount(
      <Evidence record={caseFixture} requirements={requirements} canWrite />,
    )
    const input = screen.getByLabelText(
      'Imagen sintética *',
    ) as HTMLInputElement
    await user.upload(input, new File(['A'], 'A.png', { type: 'image/png' }))
    fireEvent.submit(input.form!)
    expect(
      (
        await screen.findAllByText(
          mode === 'retired'
            ? /Ese documento ya no se solicita/
            : /Operación registrada sin URL/,
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(verification.command).toHaveBeenCalledOnce()
    expect(putEvidence).not.toHaveBeenCalled()
  },
)

it('failure of A leaves B selected and names A in the error', async () => {
  const user = userEvent.setup(),
    transfer = deferred<void>()
  vi.mocked(putEvidence).mockReturnValueOnce(transfer.promise)
  mount(<Evidence record={caseFixture} requirements={requirements} canWrite />)
  const input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  await user.upload(input, new File(['A'], 'A.png', { type: 'image/png' }))
  fireEvent.submit(input.form!)
  await waitFor(() => expect(putEvidence).toHaveBeenCalledOnce())
  const b = new File(['B'], 'B.jpg', { type: 'image/jpeg' })
  await user.upload(input, b)
  await act(async () =>
    transfer.reject(new Error('Transferencia no confirmada')),
  )
  expect(input.files?.[0]).toBe(b)
  expect(screen.getByRole('alert')).toHaveTextContent('A.png')
  expect(screen.getByRole('alert')).not.toHaveTextContent('B.jpg')
  expect(verification.command).toHaveBeenCalledOnce()
})
it('successful A without a newer selection clears the field', async () => {
  const user = userEvent.setup()
  mount(<Evidence record={caseFixture} requirements={requirements} canWrite />)
  const input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  await user.upload(input, new File(['A'], 'A.png', { type: 'image/png' }))
  fireEvent.submit(input.form!)
  await waitFor(() => expect(input.files).toHaveLength(0))
  expect(verification.command).toHaveBeenCalledTimes(2)
})

it('late A after switching case cannot clear B or complete A in the new case', async () => {
  const user = userEvent.setup(),
    a = deferred<void>(),
    b = deferred<void>()
  vi.mocked(putEvidence)
    .mockReturnValueOnce(a.promise)
    .mockReturnValueOnce(b.promise)
  const nextId = '66666666-6666-4666-8666-666666666666'
  function Cases() {
    const [id, setId] = useState(caseId)
    return (
      <>
        <button onClick={() => setId(nextId)}>Next case</button>
        <Evidence
          record={{ ...caseFixture, id }}
          requirements={requirements}
          canWrite
        />
      </>
    )
  }
  mount(<Cases />)
  let input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  await user.upload(input, new File(['A'], 'A.png', { type: 'image/png' }))
  fireEvent.submit(input.form!)
  await waitFor(() => expect(putEvidence).toHaveBeenCalledTimes(1))
  await user.click(screen.getByText('Next case'))
  expect(vi.mocked(putEvidence).mock.calls[0][3]?.aborted).toBe(true)
  input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  const fileB = new File(['B'], 'B.png', { type: 'image/png' })
  await user.upload(input, fileB)
  fireEvent.submit(input.form!)
  await waitFor(() => expect(putEvidence).toHaveBeenCalledTimes(2))
  await act(async () => a.resolve())
  expect(input.files?.[0]).toBe(fileB)
  expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled()
  expect(screen.queryByText(/Carga confirmada: A/)).not.toBeInTheDocument()
  expect(verification.command).toHaveBeenCalledTimes(2)
  await act(async () => b.resolve())
  await waitFor(() => expect(input.files).toHaveLength(0))
  const complete = vi
    .mocked(verification.command)
    .mock.calls.filter((c) => c[0].operation === 'COMPLETE_UPLOAD')
  expect(complete).toHaveLength(1)
  expect(complete[0][0].target).toBe(nextId)
})
it('a stale preview cannot replace or revoke the current image; cleanup revokes it', async () => {
  const user = userEvent.setup(),
    first = deferred<Blob>(),
    second = deferred<Blob>()
  vi.mocked(verification.access)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const create = vi.fn(() => 'blob:current-synthetic'),
    revoke = vi.fn()
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
  )
  const attachment = {
    id: attachmentId,
    category: 'FACE_PHOTO',
    status: 'VALIDATED' as const,
    bytes: 1,
    mime: 'image/png',
    hash: 'synthetic',
    createdAt: '2026-10-13T00:00:00Z',
  }
  const view = mount(
    <Evidence
      record={{ ...caseFixture, attachments: [attachment] }}
      requirements={requirements}
      canWrite
    />,
  )
  await user.click(screen.getByText('Ver evidencia'))
  await user.click(screen.getByText('Ver evidencia'))
  await act(async () => second.resolve(new Blob(['B'], { type: 'image/png' })))
  await act(async () => first.resolve(new Blob(['A'], { type: 'image/png' })))
  expect(create).toHaveBeenCalledTimes(1)
  expect(revoke).not.toHaveBeenCalled()
  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    'blob:current-synthetic',
  )
  view.unmount()
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:current-synthetic')
})

it('cancelled A does not announce success or clear the pending B selection', async () => {
  const user = userEvent.setup(),
    transfer = deferred<void>()
  vi.mocked(putEvidence).mockReturnValueOnce(transfer.promise)
  mount(<Evidence record={caseFixture} requirements={requirements} canWrite />)
  const input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  await user.upload(input, new File(['A'], 'A.png', { type: 'image/png' }))
  fireEvent.submit(input.form!)
  await waitFor(() => expect(putEvidence).toHaveBeenCalledOnce())
  const b = new File(['B'], 'B.png', { type: 'image/png' })
  await user.upload(input, b)
  await user.click(screen.getByText('Cancelar transferencia de archivo'))
  await act(async () => transfer.resolve())
  expect(input.files?.[0]).toBe(b)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Carga de A.png: Carga interrumpida',
  )
  expect(screen.queryByText(/Carga confirmada/)).not.toBeInTheDocument()
  expect(verification.command).toHaveBeenCalledOnce()
})

// These lifecycle tests use synthetic non-image bytes. Codec behavior is exercised separately.
vi.mock('../verification/prepare-photo', async (original) => ({
  ...(await original<typeof import('../verification/prepare-photo')>()),
  preparePhoto: vi.fn(
    async (
      file: File,
      requirements: import('../verification/types').Requirements,
    ) => {
      const { validateFile } = await import('../verification/service')
      validateFile(file, requirements)
      return file
    },
  ),
}))

it('uploads the prepared bytes instead of the original HEIC', async () => {
  const prepared = new File(['prepared'], 'documento.jpg', {
    type: 'image/jpeg',
  })
  vi.mocked(preparePhoto).mockResolvedValueOnce(prepared)
  mount(<Evidence record={caseFixture} requirements={requirements} canWrite />)
  const input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  await userEvent.upload(
    input,
    new File(['heic'], 'camera.heic', { type: 'image/heic' }),
  )
  fireEvent.submit(input.form!)
  await waitFor(() => expect(putEvidence).toHaveBeenCalledOnce())
  expect(vi.mocked(putEvidence).mock.calls[0][1]).toBe(prepared)
})
it('does not create an upload if preparation finishes after leaving the case', async () => {
  let finish!: (file: File) => void
  vi.mocked(preparePhoto).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = mount(
    <Evidence record={caseFixture} requirements={requirements} canWrite />,
  )
  const input = screen.getByLabelText('Imagen sintética *') as HTMLInputElement
  await userEvent.upload(
    input,
    new File(['heic'], 'camera.heic', { type: 'image/heic' }),
  )
  fireEvent.submit(input.form!)
  await waitFor(() => expect(preparePhoto).toHaveBeenCalledOnce())
  view.unmount()
  await act(async () =>
    finish(new File(['prepared'], 'documento.jpg', { type: 'image/jpeg' })),
  )
  expect(verification.command).not.toHaveBeenCalled()
  expect(putEvidence).not.toHaveBeenCalled()
})
