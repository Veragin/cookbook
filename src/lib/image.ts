/**
 * Image preparation for storage. Photos go into IndexedDB as Blobs, so the only thing
 * worth doing up front is capping the resolution and re-encoding.
 */

const DEFAULT_MAX_PX = 1600
const OUTPUT_TYPE = 'image/jpeg'
const OUTPUT_QUALITY = 0.82

type Decoded = {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      /* fall through to the <img> path */
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read that image file.'))
      el.src = url
    })
    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('Canvas export is not supported in this browser.'))
      return
    }
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode that image.'))),
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    )
  })
}

/**
 * Downscales `file` to fit `maxPx` on its long edge and re-encodes it as JPEG.
 * Returns the original file untouched if anything about the pipeline is unavailable.
 */
export async function downscaleImage(file: File, maxPx: number = DEFAULT_MAX_PX): Promise<Blob> {
  let decoded: Decoded
  try {
    decoded = await decode(file)
  } catch {
    // Non-decodable (or a headless environment) — store what we were given.
    return file
  }

  try {
    const { width, height } = decoded
    if (!width || !height) return file

    const scale = Math.min(1, maxPx / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight)
    return await toBlob(canvas)
  } catch {
    return file
  } finally {
    decoded.release()
  }
}
