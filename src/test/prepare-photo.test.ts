import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  preparePhoto,
  validatePhotoSource,
} from '../verification/prepare-photo'
import { requirements } from './verification-fixtures'
import { heicTo } from 'heic-to/csp'
vi.mock('heic-to/csp', () => ({ heicTo: vi.fn() }))

const close = vi.fn()
afterEach(() => vi.unstubAllGlobals())
function file(type = 'image/jpeg', bytes = [255, 216, 255, 0]) {
  const f = new File([new Uint8Array(bytes)], 'camera', { type })
  vi.spyOn(f, 'slice').mockReturnValue({
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  } as Blob)
  return f
}
beforeEach(() => {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }),
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) =>
    cb(new Blob(['prepared'], { type: 'image/jpeg' })),
  )
})
it('keeps valid camera JPEG bytes unchanged', async () => {
  const f = file()
  expect(await preparePhoto(f, requirements)).toBe(f)
  expect(createImageBitmap).toHaveBeenCalledWith(f, {
    imageOrientation: 'from-image',
  })
  expect(close).toHaveBeenCalled()
  expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled()
})
it.each(['', 'application/octet-stream', 'image/jpg'])(
  'recognizes real JPEG with camera MIME %s',
  async (type) => {
    expect((await preparePhoto(file(type), requirements)).type).toBe(
      'image/jpeg',
    )
  },
)
it('resizes a 48MP camera image proportionally and uses high quality', async () => {
  vi.mocked(createImageBitmap).mockResolvedValue({
    width: 8000,
    height: 6000,
    close,
  } as unknown as ImageBitmap)
  const result = await preparePhoto(file(), requirements)
  expect(result.type).toBe('image/jpeg')
  const canvas = vi.mocked(HTMLCanvasElement.prototype.getContext).mock
    .instances[0] as unknown as HTMLCanvasElement
  // Memory is released after encoding; drawImage records the actual output dimensions.
  const ctx = vi.mocked(HTMLCanvasElement.prototype.getContext).mock.results[0]
    .value as CanvasRenderingContext2D
  expect(ctx.drawImage).toHaveBeenCalledWith(
    expect.anything(),
    0,
    0,
    4096,
    3072,
  )
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
    expect.any(Function),
    'image/jpeg',
    0.95,
  )
  expect(canvas.width).toBe(1)
})
it('converts HEIC using the local decoder, not MIME renaming', async () => {
  vi.mocked(heicTo).mockResolvedValue({
    width: 2000,
    height: 3000,
    close,
  } as unknown as Blob & ImageBitmap)
  const bytes = [
    0,
    0,
    0,
    24,
    ...Array.from('ftypheic').map((c) => c.charCodeAt(0)),
  ]
  const result = await preparePhoto(file('image/heic', bytes), requirements)
  expect(heicTo).toHaveBeenCalledWith({
    blob: expect.any(File),
    type: 'bitmap',
  })
  expect(result.name).toBe('documento.jpg')
  expect(result.type).toBe('image/jpeg')
})
it('rejects disguised SVG/PDF and corrupt images before upload', async () => {
  await expect(
    preparePhoto(file('image/jpeg', [60, 115, 118, 103]), requirements),
  ).rejects.toThrow(/leer la foto/)
  expect(() => validatePhotoSource(file('application/pdf'))).toThrow(/PDF/)
})
it('does not destroy legibility by repeatedly reducing quality', async () => {
  await expect(
    preparePhoto(file(), { ...requirements, maxBytes: 2 }),
  ).rejects.toThrow(/legibilidad/)
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(2)
})
it('discards a late decode after cancellation and releases memory', async () => {
  const controller = new AbortController()
  vi.mocked(createImageBitmap).mockImplementation(async () => {
    controller.abort()
    return { width: 4000, height: 3000, close } as unknown as ImageBitmap
  })
  await expect(
    preparePhoto(file(), requirements, controller.signal),
  ).rejects.toThrow()
  expect(close).toHaveBeenCalled()
  expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled()
})
