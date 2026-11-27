// Film looks for the disposable camera, done with canvas pixel work in the browser.
import { context2d, coverCrop, ensureFonts, loadPicture, makeCanvas, pad2 } from '@/booth/media'

export const filmIds = ['senja', 'pesta', 'tinta', 'kenangan', 'polos'] as const
export type FilmId = (typeof filmIds)[number]
export const isFilmId = (value: string): value is FilmId => (filmIds as readonly string[]).includes(value)

type Tone = {
  exposure: number
  contrast: number
  /** Lifts the blacks, 0 to 0.2. */
  fade: number
  /** Where white ends up, below 1 for a softer top. */
  ceiling: number
  gain: [number, number, number]
  saturation: number
  /** Added in the shadows and in the highlights, in 0 to 255 units. */
  shadowTint: [number, number, number]
  highlightTint: [number, number, number]
  mono: boolean
  grain: number
  vignette: number
  /** Chance of a warm light leak on a frame. */
  leak: number
  /** Brighter centre, like a built in flash. */
  bloom: number
}

export type Film = { id: FilmId; name: string; line: string; tone: Tone }

const base: Tone = {
  exposure: 1,
  contrast: 1,
  fade: 0,
  ceiling: 1,
  gain: [1, 1, 1],
  saturation: 1,
  shadowTint: [0, 0, 0],
  highlightTint: [0, 0, 0],
  mono: false,
  grain: 0,
  vignette: 0,
  leak: 0,
  bloom: 0,
}

export const films: Record<FilmId, Film> = {
  senja: {
    id: 'senja',
    name: 'Senja 400',
    line: 'Hangat seperti cahaya sore, grain halus.',
    tone: {
      ...base,
      exposure: 1.04,
      contrast: 1.08,
      fade: 0.035,
      ceiling: 0.98,
      gain: [1.07, 1.0, 0.86],
      saturation: 1.1,
      shadowTint: [6, 0, -4],
      highlightTint: [8, 4, -6],
      grain: 0.2,
      vignette: 0.28,
      leak: 0.25,
    },
  },
  pesta: {
    id: 'pesta',
    name: 'Pesta 800',
    line: 'Lampu kilat terang, bayangan dingin, grain kasar.',
    tone: {
      ...base,
      exposure: 1.06,
      contrast: 1.2,
      fade: 0.02,
      ceiling: 1,
      gain: [1.0, 1.0, 1.03],
      saturation: 1.12,
      shadowTint: [-10, 0, 18],
      highlightTint: [6, 3, -2],
      grain: 0.38,
      vignette: 0.42,
      bloom: 0.16,
    },
  },
  tinta: {
    id: 'tinta',
    name: 'Tinta 400',
    line: 'Hitam putih dengan kontras dalam.',
    tone: { ...base, contrast: 1.38, fade: 0.01, ceiling: 0.99, mono: true, grain: 0.28, vignette: 0.34 },
  },
  kenangan: {
    id: 'kenangan',
    name: 'Kenangan 200',
    line: 'Warna pudar dan kabut lembut seperti kartu pos lama.',
    tone: {
      ...base,
      exposure: 1.03,
      contrast: 0.9,
      fade: 0.13,
      ceiling: 0.93,
      gain: [1.04, 1.0, 0.9],
      saturation: 0.72,
      shadowTint: [10, 4, 12],
      highlightTint: [10, 6, -10],
      grain: 0.16,
      vignette: 0.22,
      leak: 0.35,
    },
  },
  polos: { id: 'polos', name: 'Polos', line: 'Tanpa efek, warna apa adanya.', tone: base },
}

export function filmOf(id: string): Film {
  return isFilmId(id) ? films[id] : films.senja
}

const clamp = (value: number) => Math.max(0, Math.min(255, value))
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function curves(tone: Tone) {
  return [0, 1, 2].map((channel) => {
    const lut = new Uint8ClampedArray(256)
    for (let v = 0; v < 256; v++) {
      let x = (v / 255) * tone.exposure
      x = 0.5 + (x - 0.5) * tone.contrast
      x = Math.min(1, Math.max(0, x))
      x = tone.fade + x * (tone.ceiling - tone.fade)
      lut[v] = clamp(x * 255 * (tone.mono ? 1 : (tone.gain[channel] as number)))
    }
    return lut
  }) as [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray]
}

/** `27 11 '26`, like the orange stamp of an old point and shoot. */
export function dateStamp(at: Date) {
  return `${pad2(at.getDate())} ${pad2(at.getMonth() + 1)} '${pad2(at.getFullYear() % 100)}`
}

/** Applies the film look in place, then adds the date stamp. */
export async function develop(canvas: HTMLCanvasElement, filmId: string, options: { at: Date; flash?: boolean }) {
  const { tone } = filmOf(filmId)
  const { width: w, height: h } = canvas
  const ctx = context2d(canvas, true)
  if (filmId !== 'polos') {
    const image = ctx.getImageData(0, 0, w, h)
    const data = image.data
    const [lr, lg, lb] = curves(tone)
    const bloom = tone.bloom + (options.flash ? 0.18 : 0)
    const vignette = tone.vignette + (options.flash ? 0.12 : 0)
    const cx = w / 2
    const cy = h / 2
    const norm = 1 / Math.sqrt(cx * cx + cy * cy)
    const xs = new Float32Array(w)
    for (let x = 0; x < w; x++) xs[x] = (x - cx) * (x - cx)
    for (let y = 0; y < h; y++) {
      const dy = (y - cy) * (y - cy)
      let index = y * w * 4
      for (let x = 0; x < w; x++, index += 4) {
        const d = Math.sqrt((xs[x] as number) + dy) * norm
        let light = 1 - vignette * smooth(0.35, 1, d)
        if (bloom) light *= 1 + bloom * (1 - smooth(0, 0.75, d))
        let r: number
        let g: number
        let b: number
        if (tone.mono) {
          const l =
            (data[index] as number) * 0.3 + (data[index + 1] as number) * 0.59 + (data[index + 2] as number) * 0.11
          r = lr[l | 0] as number
          g = r
          b = r
        } else {
          r = lr[data[index] as number] as number
          g = lg[data[index + 1] as number] as number
          b = lb[data[index + 2] as number] as number
          const l = r * 0.299 + g * 0.587 + b * 0.114
          r = l + (r - l) * tone.saturation
          g = l + (g - l) * tone.saturation
          b = l + (b - l) * tone.saturation
          const t = l / 255
          const u = 1 - t
          r += tone.shadowTint[0] * u + tone.highlightTint[0] * t
          g += tone.shadowTint[1] * u + tone.highlightTint[1] * t
          b += tone.shadowTint[2] * u + tone.highlightTint[2] * t
        }
        data[index] = clamp(r * light)
        data[index + 1] = clamp(g * light)
        data[index + 2] = clamp(b * light)
      }
    }
    ctx.putImageData(image, 0, 0)

    if (tone.grain > 0) {
      // Grain at half size, scaled up, so it clumps like film and compresses better.
      const noise = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2))
      const nctx = context2d(noise)
      const grain = nctx.createImageData(noise.width, noise.height)
      const g = grain.data
      for (let i = 0; i < g.length; i += 4) {
        const v = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 120
        g[i] = v
        g[i + 1] = v
        g[i + 2] = v
        g[i + 3] = 255
      }
      nctx.putImageData(grain, 0, 0)
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = tone.grain
      ctx.drawImage(noise, 0, 0, w, h)
      ctx.restore()
    }

    if (tone.leak > 0 && Math.random() < tone.leak) {
      const fromLeft = Math.random() < 0.5
      const x = fromLeft ? 0 : w
      const y = h * (0.2 + Math.random() * 0.6)
      const leak = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.55)
      leak.addColorStop(0, 'rgba(255,120,40,0.55)')
      leak.addColorStop(0.5, 'rgba(255,70,30,0.18)')
      leak.addColorStop(1, 'rgba(255,60,20,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = leak
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }

  await ensureFonts()
  const size = Math.round(Math.max(w, h) * 0.032)
  ctx.save()
  ctx.font = `500 ${size}px "DM Mono", ui-monospace, monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ff9a3c'
  ctx.shadowColor = 'rgba(255, 110, 30, 0.9)'
  ctx.shadowBlur = size * 0.35
  ctx.globalAlpha = 0.92
  ctx.fillText(dateStamp(options.at), w - size * 1.1, h - size * 1.1)
  ctx.restore()
  return canvas
}

/** Crops a frame to 2:3 (or 3:2 when wider than tall) with the long side at most `max`. */
export function cropFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: { mirror?: boolean; max?: number } = {},
) {
  const aspect = width >= height ? 3 / 2 : 2 / 3
  const crop = coverCrop(width, height, aspect)
  const max = options.max ?? 1600
  const scale = Math.min(1, max / Math.max(crop.sw, crop.sh))
  const canvas = makeCanvas(crop.sw * scale, crop.sh * scale)
  const ctx = context2d(canvas)
  if (options.mirror) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

const sampleCache = new Map<FilmId, Promise<string[]>>()

/** Three small frames of the sample picture developed with a film, for the film pickers. */
export function filmSamples(filmId: FilmId) {
  let found = sampleCache.get(filmId)
  if (!found) {
    found = loadPicture('/wedding/garden.jpg').then(async (image) => {
      const spots = [
        { x: 800, y: 120, w: 720, h: 480 },
        { x: 380, y: 240, w: 600, h: 400 },
        { x: 1000, y: 460, w: 600, h: 400 },
      ]
      const at = new Date()
      const urls: string[] = []
      for (const spot of spots) {
        const canvas = makeCanvas(360, 240)
        context2d(canvas).drawImage(image, spot.x, spot.y, spot.w, spot.h, 0, 0, 360, 240)
        await develop(canvas, filmId, { at })
        urls.push(canvas.toDataURL('image/jpeg', 0.85))
      }
      return urls
    })
    found.catch(() => sampleCache.delete(filmId))
    sampleCache.set(filmId, found)
  }
  return found
}
