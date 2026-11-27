// Photos are resized and turned into JPEG in the browser before upload.

export async function loadImage(source: Blob | string) {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    if (typeof source !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.84) {
  return canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? ''
}

/** Fits the image inside `max` pixels on its long side and returns base64 JPEG, without the data: prefix. */
export async function compressPhoto(file: Blob, max = 1600, quality = 0.84) {
  const image = await loadImage(file)
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas tidak tersedia')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  let result = canvasToBase64(canvas, quality)
  // Keep uploads under the server limit, which is about 1.4 MB of JPEG.
  for (let q = quality - 0.1; result.length > 1_800_000 && q > 0.4; q -= 0.1) result = canvasToBase64(canvas, q)
  return result
}

export async function fileToBase64(file: Blob) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < buffer.length; index += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export const mediaUrl = (id: string) => `/api/m/${id}`
