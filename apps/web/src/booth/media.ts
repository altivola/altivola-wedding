// Browser helpers shared by the photobooth and the disposable camera:
// canvas cropping, JPEG export, download and share.

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export type Crop = { sx: number; sy: number; sw: number; sh: number }

/** The centred part of a `width` x `height` source that fills a box with the given aspect (w / h). */
export function coverCrop(width: number, height: number, aspect: number): Crop {
  if (width / height > aspect) {
    const sw = height * aspect
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height }
  }
  const sh = width / aspect
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh }
}

export function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  box: { x: number; y: number; w: number; h: number },
) {
  const crop = coverCrop(sourceWidth, sourceHeight, box.w / box.h)
  context.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, box.x, box.y, box.w, box.h)
}

export function context2d(canvas: HTMLCanvasElement, readback = false) {
  const context = canvas.getContext('2d', readback ? { willReadFrequently: true } : undefined)
  if (!context) throw new Error('Canvas tidak tersedia')
  return context
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function canvasBlob(canvas: HTMLCanvasElement, quality = 0.9, type = 'image/jpeg') {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar'))), type, quality),
  )
}

/** Base64 JPEG (no data: prefix) that stays under `maxChars`, lowering quality step by step. */
export function jpegUnder(canvas: HTMLCanvasElement, maxChars: number, quality = 0.9) {
  let q = quality
  let data = canvas.toDataURL('image/jpeg', q).split(',')[1] ?? ''
  while (data.length > maxChars && q > 0.45) {
    q -= 0.08
    data = canvas.toDataURL('image/jpeg', q).split(',')[1] ?? ''
  }
  if (data.length <= maxChars) return data
  // Still too big: shrink the picture itself.
  const smaller = makeCanvas(canvas.width * 0.8, canvas.height * 0.8)
  context2d(smaller).drawImage(canvas, 0, 0, smaller.width, smaller.height)
  return jpegUnder(smaller, maxChars, 0.8)
}

export function downloadBlob(blob: Blob | string, fileName: string) {
  const url = typeof blob === 'string' ? blob : URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  if (typeof blob !== 'string') window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Shares the image with the system sheet. Returns false when the browser cannot share files. */
export async function shareImage(blob: Blob, fileName: string, title: string) {
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], title })
  } catch (error) {
    if ((error as { name?: string })?.name !== 'AbortError') throw error
  }
  return true
}

/** Small deterministic random numbers, so a frame looks the same in the preview and the print. */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const canvasFonts = [
  '600 40px "Fraunces Variable"',
  'italic 600 40px "Fraunces Variable"',
  '600 40px "Cormorant Variable"',
  'italic 600 40px "Cormorant Variable"',
  '700 40px "Bricolage Grotesque Variable"',
  '700 40px "Playpen Sans Variable"',
  '600 40px "Figtree Variable"',
  '700 40px "Shantell Sans Variable"',
  '500 40px "DM Mono"',
  '600 40px "Dancing Script Variable"',
]
let fontsReady: Promise<void> | undefined

/** Fonts are loaded with CSS, but a canvas only sees them after they are fetched. */
export function ensureFonts() {
  if (!fontsReady) {
    const load = Promise.all(canvasFonts.map((font) => document.fonts.load(font).catch(() => []))).then(() => undefined)
    fontsReady = Promise.race([load, wait(4000)])
  }
  return fontsReady
}

const images = new Map<string, Promise<HTMLImageElement>>()

export function loadPicture(src: string) {
  let found = images.get(src)
  if (!found) {
    found = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Gambar gagal dimuat'))
      image.src = src
    })
    images.set(src, found)
    found.catch(() => images.delete(src))
  }
  return found
}

/** Opens a picked file as an image and keeps an object URL for thumbnails. */
export async function fileImage(file: Blob) {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  return { image, url, width: image.naturalWidth, height: image.naturalHeight }
}

export function pad2(value: number) {
  return String(value).padStart(2, '0')
}
