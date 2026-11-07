import type { Requirements } from './types'
import { validateFile } from './service'

export const PHOTO_ACCEPT =
  'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif'
const SOURCE_BYTES = 40 * 1024 * 1024
const INVALID =
  'No se pudo leer la foto. Toma otra o elige una imagen JPEG, PNG o HEIC/HEIF válida.'

/** Selection check only. Bytes and decoded dimensions are checked before creating an upload. */
export function validatePhotoSource(file: File) {
  if (!file.size) throw new Error('La foto está vacía. Toma otra foto.')
  if (file.size > SOURCE_BYTES)
    throw new Error(
      'La foto supera 40 MB. Usa la cámara en resolución estándar, conservando el documento completo.',
    )
  if (
    ![
      '',
      'application/octet-stream',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
    ].includes(file.type)
  )
    throw new Error(
      'Elige una foto JPEG, PNG o HEIC/HEIF. No se admiten PDF, SVG ni videos.',
    )
}

async function photoType(file: File) {
  const b = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v))
    return 'image/png'
  const text = new TextDecoder().decode(b)
  if (
    text.slice(4, 8) === 'ftyp' &&
    /heic|heix|hevc|hevx|mif1|msf1/.test(text.slice(8))
  )
    return 'image/heic'
  throw new Error(INVALID)
}

async function decode(blob: Blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'from-image',
      })
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      }
    } catch {
      /* Safari can decode some camera formats through an image element instead. */
    }
  }
  const url = URL.createObjectURL(blob)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error(INVALID))
      image.src = url
    })
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {
        image.src = ''
        URL.revokeObjectURL(url)
      },
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/** Local only. Keep valid JPEG/PNG bytes; resize only when a server limit requires it.
 * Never crop/upscale or repeatedly reduce quality until an unreadable document fits.
 */
export async function preparePhoto(
  file: File,
  requirements: Requirements,
  signal?: AbortSignal,
): Promise<File> {
  validatePhotoSource(file)
  signal?.throwIfAborted()
  const type = await photoType(file)
  const typed =
    file.type === type ? file : new File([file], file.name, { type })
  let decoded: Awaited<ReturnType<typeof decode>>
  try {
    if (type === 'image/heic') {
      // Bundled decoder, lazy-loaded; its worker never uploads the document elsewhere.
      const { heicTo } = await import('heic-to/csp')
      signal?.throwIfAborted()
      const bitmap = await heicTo({ blob: typed, type: 'bitmap' })
      decoded = {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      }
    } else decoded = await decode(typed)
  } catch {
    signal?.throwIfAborted()
    throw new Error(INVALID)
  }
  try {
    signal?.throwIfAborted()
    const { width, height } = decoded
    if (!width || !height || width * height > 120_000_000)
      throw new Error(INVALID)
    if (
      type !== 'image/heic' &&
      typed.size <= requirements.maxBytes &&
      width * height <= requirements.maxPixels
    ) {
      validateFile(typed, requirements)
      return typed
    }
    // A 4096px edge retains document detail and bounds mobile canvas memory.
    const scale = Math.min(
      1,
      4096 / Math.max(width, height),
      Math.sqrt(requirements.maxPixels / (width * height)),
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(width * scale))
    canvas.height = Math.max(1, Math.floor(height * scale))
    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error(INVALID)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(decoded.image, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.95, 0.92]) {
        signal?.throwIfAborted()
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error(INVALID))),
            'image/jpeg',
            quality,
          ),
        )
        signal?.throwIfAborted()
        if (blob.size && blob.size <= requirements.maxBytes) {
          const result = new File([blob], 'documento.jpg', { type: blob.type })
          validateFile(result, requirements)
          return result
        }
      }
      throw new Error(
        'La foto sigue siendo demasiado grande para conservar su legibilidad. Toma otra en resolución estándar, con buena luz y el documento completo.',
      )
    } finally {
      canvas.width = canvas.height = 1
    }
  } finally {
    decoded.close()
  }
}
