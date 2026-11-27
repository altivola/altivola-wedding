// Photobooth layouts and frames. Frames are painted on a canvas at print size,
// one per invitation theme plus a plain one, so no image files are needed.
import { type InvitationDoc, type ThemeId, themes } from '@app/api/invitation-model'
import { palettes } from '@/invite/palette'
import { drawCover, ensureFonts, loadPicture, makeCanvas, seeded } from './media'

export type LayoutId = 'strip' | 'grid' | 'portrait' | 'double' | 'wide'
export type FrameId = ThemeId | 'polos'
export type Rect = { x: number; y: number; w: number; h: number }

export type Layout = {
  id: LayoutId
  label: string
  shots: number
  size: string
  width: number
  height: number
  cols: number
  rows: number
  margin: number
  gap: number
  footer: number
}

export const layouts: Layout[] = [
  {
    id: 'strip',
    label: 'Strip',
    shots: 3,
    size: '2x6',
    width: 600,
    height: 1800,
    cols: 1,
    rows: 3,
    margin: 44,
    gap: 20,
    footer: 400,
  },
  {
    id: 'grid',
    label: 'Grid',
    shots: 4,
    size: '4x6',
    width: 1200,
    height: 1800,
    cols: 2,
    rows: 2,
    margin: 72,
    gap: 28,
    footer: 420,
  },
  {
    id: 'portrait',
    label: 'Potret',
    shots: 1,
    size: '4x6',
    width: 1200,
    height: 1800,
    cols: 1,
    rows: 1,
    margin: 72,
    gap: 0,
    footer: 420,
  },
  {
    id: 'double',
    label: 'Dobel',
    shots: 2,
    size: '4x6',
    width: 1200,
    height: 1800,
    cols: 1,
    rows: 2,
    margin: 72,
    gap: 28,
    footer: 420,
  },
  {
    id: 'wide',
    label: 'Lebar',
    shots: 1,
    size: '6x4',
    width: 1800,
    height: 1200,
    cols: 1,
    rows: 1,
    margin: 72,
    gap: 0,
    footer: 280,
  },
]

export function layoutById(id: LayoutId) {
  return layouts.find((layout) => layout.id === id) ?? (layouts[0] as Layout)
}

export function slotsOf(layout: Layout): Rect[] {
  const { width, height, cols, rows, margin, gap, footer } = layout
  const w = (width - margin * 2 - gap * (cols - 1)) / cols
  const h = (height - margin - footer - gap * (rows - 1)) / rows
  const slots: Rect[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) slots.push({ x: margin + col * (w + gap), y: margin + row * (h + gap), w, h })
  }
  return slots
}

export const slotAspect = (layout: Layout) => {
  const slot = slotsOf(layout)[0] as Rect
  return slot.w / slot.h
}

export type FrameDef = { id: FrameId; label: string }

export const frames: FrameDef[] = [
  ...themes.map((theme) => ({ id: theme.id as FrameId, label: theme.name as string })),
  { id: 'polos', label: 'Polos' },
]

export const isFrameId = (value: string): value is FrameId => frames.some((frame) => frame.id === value)

/** Frames a guest may pick. `undefined` from the settings means every frame. */
export function allowedFrames(setting: string[] | undefined) {
  if (!setting) return frames
  const picked = frames.filter((frame) => setting.includes(frame.id))
  return picked.length ? picked : frames
}

export function defaultFrame(theme: string, allowed: FrameDef[]): FrameId {
  return (allowed.find((frame) => frame.id === theme) ?? allowed[0] ?? { id: 'polos' }).id
}

export type FrameText = { names: string; dateLong: string; dateShort: string }

export function frameText(doc: Pick<InvitationDoc, 'names' | 'events'>): FrameText {
  const bride = doc.names.bride.trim() || 'Mempelai'
  const groom = doc.names.groom.trim() || 'Mempelai'
  const date = doc.events.find((event) => event.date)?.date
  const day = date ? new Date(`${date}T00:00:00Z`) : new Date()
  const zone = date ? 'UTC' : undefined
  return {
    names: `${bride} & ${groom}`,
    dateLong: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: zone,
    }).format(day),
    dateShort: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: zone })
      .format(day)
      .replace(/\//g, '.'),
  }
}

// Painting

type Ctx = CanvasRenderingContext2D
type Geo = {
  W: number
  H: number
  /** 1 for the 2x6 strip, 2 for 4x6 and 6x4. Keeps details the same printed size. */
  s: number
  m: number
  slots: Rect[]
  footer: Rect
  text: FrameText
}
type Painter = { base: (ctx: Ctx, g: Geo) => void; over: (ctx: Ctx, g: Geo) => void }

function fitFont(ctx: Ctx, text: string, font: (size: number) => string, size: number, maxWidth: number) {
  let current = size
  ctx.font = font(current)
  while (ctx.measureText(text).width > maxWidth && current > 8) {
    current *= 0.94
    ctx.font = font(current)
  }
  return current
}

function spaced(ctx: Ctx, value: number) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${value}px`
}

function strokeSlots(ctx: Ctx, g: Geo, color: string, width: number, outset = 0) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  for (const slot of g.slots) {
    const o = outset + width / 2
    ctx.strokeRect(slot.x - o, slot.y - o, slot.w + o * 2, slot.h + o * 2)
  }
  ctx.restore()
}

function centerText(ctx: Ctx, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y)
}

/** Baselines for a names line, an ornament row and a date line, centred between `top` and `bottom`. */
function stack(top: number, bottom: number, names: number, ornament: number, date: number, gap: number) {
  const namesCap = names * 0.72
  const dateCap = date * 0.72
  const start = top + (bottom - top - (namesCap + ornament + dateCap + gap * 2)) / 2
  return {
    names: start + namesCap,
    ornament: start + namesCap + gap + ornament / 2,
    date: start + namesCap + gap * 2 + ornament + dateCap,
  }
}

function heart(ctx: Ctx, x: number, y: number, size: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + size * 0.35)
  ctx.bezierCurveTo(x - size * 0.9, y - size * 0.25, x - size * 0.4, y - size * 0.95, x, y - size * 0.4)
  ctx.bezierCurveTo(x + size * 0.4, y - size * 0.95, x + size * 0.9, y - size * 0.25, x, y + size * 0.35)
  ctx.closePath()
  ctx.fill()
}

function kawungUnit(ctx: Ctx, cx: number, cy: number, r: number, petal: string, dot: string) {
  ctx.fillStyle = petal
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.46, r * 0.27, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = dot
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
}

/** Calls `draw` at evenly spaced points along a band `b` wide around the edge. */
function alongBorder(g: Geo, b: number, draw: (x: number, y: number) => void) {
  const across = Math.max(1, Math.round((g.W - b) / b))
  const down = Math.max(1, Math.round((g.H - b) / b))
  for (let i = 0; i <= across; i++) {
    const x = b / 2 + ((g.W - b) * i) / across
    draw(x, b / 2)
    draw(x, g.H - b / 2)
  }
  for (let i = 1; i < down; i++) {
    const y = b / 2 + ((g.H - b) * i) / down
    draw(b / 2, y)
    draw(g.W - b / 2, y)
  }
}

const kawung: Painter = {
  base(ctx, g) {
    const p = palettes.kawung
    const band = g.m * 0.62
    ctx.fillStyle = p.deep
    ctx.fillRect(0, 0, g.W, g.H)
    ctx.fillStyle = p.paper
    ctx.fillRect(band, band, g.W - band * 2, g.H - band * 2)
    alongBorder(g, band, (x, y) => kawungUnit(ctx, x, y, band * 0.44, p.onDeep, p.accent))
    ctx.strokeStyle = p.accent
    ctx.lineWidth = 2 * g.s
    const inset = band + 6 * g.s
    ctx.strokeRect(inset, inset, g.W - inset * 2, g.H - inset * 2)
  },
  over(ctx, g) {
    const p = palettes.kawung
    strokeSlots(ctx, g, p.accent, 3 * g.s)
    const f = g.footer
    const cx = g.W / 2
    const size = fitFont(
      ctx,
      g.text.names,
      (n) => `600 ${n}px "Cormorant Variable", serif`,
      Math.min(f.h * 0.27, 100 * g.s),
      g.W - g.m * 3,
    )
    // A row of three small kawung between the names and the date.
    const r = 9 * g.s
    const date = 22 * g.s
    const at = stack(f.y, g.H - g.m * 0.62 - 8 * g.s, size, r * 2, date, 14 * g.s)
    centerText(ctx, g.text.names, cx, at.names, p.deep)
    for (const dx of [-3.2, 0, 3.2]) kawungUnit(ctx, cx + dx * r, at.ornament, r, p.accent, p.deep)
    ctx.strokeStyle = p.accent
    ctx.lineWidth = 1.5 * g.s
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + side * 5.5 * r, at.ornament)
      ctx.lineTo(cx + side * Math.min(g.W * 0.36, 16 * r), at.ornament)
      ctx.stroke()
    }
    spaced(ctx, 4 * g.s)
    fitFont(ctx, g.text.dateLong.toUpperCase(), (n) => `600 ${n}px "Figtree Variable", sans-serif`, date, g.W - g.m * 3)
    centerText(ctx, g.text.dateLong.toUpperCase(), cx, at.date, p.second)
    spaced(ctx, 0)
  },
}

function wave(g: Geo, base: number, amp: number, freq: number, phase: number) {
  const points: [number, number][] = []
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const x = (g.W * i) / steps
    points.push([x, base + Math.sin((x / g.W) * Math.PI * freq + phase) * amp])
  }
  return points
}

const sawah: Painter = {
  base(ctx, g) {
    const p = palettes.sawah
    const sky = ctx.createLinearGradient(0, 0, 0, g.H)
    sky.addColorStop(0, '#d6ecf5')
    sky.addColorStop(0.55, p.paper)
    sky.addColorStop(1, p.paper)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, g.W, g.H)
    // A few soft clouds peeking from the edges.
    const rand = seeded(7)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (let i = 0; i < 6; i++) {
      const x = rand() < 0.5 ? rand() * g.m : g.W - rand() * g.m
      const y = g.m + rand() * (g.H - g.footer.h - g.m * 2)
      for (const [dx, dr] of [
        [-1, 0.7],
        [0, 1],
        [1, 0.75],
      ] as const) {
        ctx.beginPath()
        ctx.arc(x + dx * 14 * g.s, y, 14 * g.s * dr, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  },
  over(ctx, g) {
    const p = palettes.sawah
    strokeSlots(ctx, g, '#ffffff', 7 * g.s)
    const f = g.footer
    // Rising sun behind the hills.
    const sunX = g.W * 0.7
    const sunY = f.y + f.h * 0.7
    const sunR = Math.min(f.h * 0.2, g.W * 0.12)
    const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR)
    sun.addColorStop(0, p.second)
    sun.addColorStop(1, p.accent)
    ctx.fillStyle = sun
    ctx.beginPath()
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = p.accent
    ctx.lineWidth = 3 * g.s
    ctx.lineCap = 'round'
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k + 0.5) * (Math.PI / 7)
      ctx.beginPath()
      ctx.moveTo(sunX + Math.cos(a) * sunR * 1.25, sunY + Math.sin(a) * sunR * 1.25)
      ctx.lineTo(sunX + Math.cos(a) * sunR * 1.55, sunY + Math.sin(a) * sunR * 1.55)
      ctx.stroke()
    }
    // Terraced hills, back to front, with lines for the terraces.
    const hills = [
      { color: '#b9d17a', line: '#d4e39f', base: 0.66, amp: 0.07, freq: 2.2, phase: 0.4 },
      { color: '#7fa850', line: '#a3c46f', base: 0.76, amp: 0.06, freq: 1.6, phase: 2.1 },
      { color: p.deep, line: '#4f7f4a', base: 0.88, amp: 0.05, freq: 2.6, phase: 1.2 },
    ]
    for (const hill of hills) {
      const points = wave(g, f.y + f.h * hill.base, f.h * hill.amp, hill.freq, hill.phase)
      const shape = new Path2D()
      shape.moveTo(0, g.H)
      for (const [x, y] of points) shape.lineTo(x, y)
      shape.lineTo(g.W, g.H)
      shape.closePath()
      ctx.fillStyle = hill.color
      ctx.fill(shape)
      ctx.save()
      ctx.clip(shape)
      ctx.strokeStyle = hill.line
      ctx.lineWidth = 2 * g.s
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath()
        points.forEach(([x, y], index) => {
          const yy = y + k * f.h * 0.035
          if (index === 0) ctx.moveTo(x, yy)
          else ctx.lineTo(x, yy)
        })
        ctx.stroke()
      }
      ctx.restore()
    }
    // A kite in the top corner.
    const kx = g.W - g.m * 0.55
    const ky = g.m * 0.5
    const k = g.m * 0.28
    ctx.fillStyle = p.accent
    ctx.beginPath()
    ctx.moveTo(kx, ky - k)
    ctx.lineTo(kx + k * 0.7, ky)
    ctx.lineTo(kx, ky + k * 1.2)
    ctx.lineTo(kx - k * 0.7, ky)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = p.ink
    ctx.lineWidth = 1.2 * g.s
    ctx.beginPath()
    ctx.moveTo(kx, ky + k * 1.2)
    ctx.quadraticCurveTo(kx - k, ky + k * 2.2, kx - k * 0.4, ky + k * 3)
    ctx.stroke()
    // Names and date sit above the hills.
    const cx = g.W / 2
    const size = fitFont(
      ctx,
      g.text.names,
      (n) => `italic 600 ${n}px "Fraunces Variable", serif`,
      f.h * 0.2,
      g.W - g.m * 2.5,
    )
    centerText(ctx, g.text.names, cx, f.y + f.h * 0.14 + size, p.ink)
    fitFont(ctx, g.text.dateLong, (n) => `600 ${n}px "Figtree Variable", sans-serif`, 22 * g.s, g.W - g.m * 3)
    centerText(ctx, g.text.dateLong, cx, f.y + f.h * 0.14 + size + 34 * g.s, p.muted)
  },
}

const kartuPos: Painter = {
  base(ctx, g) {
    const p = palettes['kartu-pos']
    ctx.fillStyle = p.surface
    ctx.fillRect(0, 0, g.W, g.H)
    const band = g.m * 0.55
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, g.W, g.H)
    ctx.rect(band, band, g.W - band * 2, g.H - band * 2)
    ctx.clip('evenodd')
    const stripe = band * 0.95
    const colors = [p.accent, p.surface, p.second, p.surface]
    let k = 0
    for (let x = -g.H; x < g.W + g.H; x += stripe) {
      ctx.fillStyle = colors[k % 4] as string
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + stripe, 0)
      ctx.lineTo(x + stripe - g.H, g.H)
      ctx.lineTo(x - g.H, g.H)
      ctx.closePath()
      ctx.fill()
      k++
    }
    ctx.restore()
    ctx.strokeStyle = p.line
    ctx.lineWidth = 2 * g.s
    ctx.setLineDash([10 * g.s, 7 * g.s])
    const inset = band + 8 * g.s
    ctx.strokeRect(inset, inset, g.W - inset * 2, g.H - inset * 2)
    ctx.setLineDash([])
  },
  over(ctx, g) {
    const p = palettes['kartu-pos']
    strokeSlots(ctx, g, p.ink, 2 * g.s)
    const f = g.footer
    const stacked = f.w / f.h < 2
    // Stamp with a perforated edge.
    const sh = Math.min(f.h * (stacked ? 0.34 : 0.58), 120 * g.s)
    const sw = sh * 0.82
    const sx = g.W - g.m - sw
    const sy = f.y + (stacked ? f.h * 0.06 : (f.h - sh) / 2 - f.h * 0.06)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.12)'
    ctx.shadowBlur = 6 * g.s
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx, sy, sw, sh)
    ctx.restore()
    ctx.fillStyle = p.surface
    const hole = 4 * g.s
    for (let x = sx; x <= sx + sw + 0.1; x += hole * 2.6) {
      for (const y of [sy, sy + sh]) {
        ctx.beginPath()
        ctx.arc(x, y, hole, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    for (let y = sy; y <= sy + sh + 0.1; y += hole * 2.6) {
      for (const x of [sx, sx + sw]) {
        ctx.beginPath()
        ctx.arc(x, y, hole, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const inner = 9 * g.s
    ctx.fillStyle = '#f6dccd'
    ctx.fillRect(sx + inner, sy + inner, sw - inner * 2, sh - inner * 2)
    ctx.fillStyle = p.accent
    heart(ctx, sx + sw / 2, sy + sh * 0.45, sw * 0.26)
    ctx.font = `500 ${11 * g.s}px "DM Mono", monospace`
    centerText(ctx, g.text.dateShort.slice(-4), sx + sw / 2, sy + sh - inner - 7 * g.s, p.second)
    // Postmark over the stamp edge, with wavy cancel lines.
    const pr = sh * 0.36
    const px = sx - pr * 0.25
    const py = sy + sh * 0.62
    ctx.save()
    ctx.globalAlpha = 0.6
    ctx.strokeStyle = p.ink
    ctx.lineWidth = 2.5 * g.s
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 1.2 * g.s
    ctx.beginPath()
    ctx.arc(px, py, pr * 0.78, 0, Math.PI * 2)
    ctx.stroke()
    ctx.font = `500 ${Math.round(pr * 0.3)}px "DM Mono", monospace`
    centerText(ctx, g.text.dateShort.slice(0, 5), px, py + pr * 0.1, p.ink)
    ctx.lineWidth = 2 * g.s
    for (let line = -1; line <= 1; line++) {
      ctx.beginPath()
      for (let i = 0; i <= 12; i++) {
        const x = px - pr * 1.1 - i * pr * 0.12
        const y = py + line * pr * 0.32 + Math.sin(i * 0.9) * pr * 0.08
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
    // Names and date, left aligned like an address.
    const left = g.m
    const textWidth = stacked ? g.W - g.m * 2 : sx - pr * 3.1 - left
    const top = stacked ? sy + sh + f.h * 0.12 : f.y + f.h * 0.3
    ctx.textAlign = 'left'
    spaced(ctx, 3 * g.s)
    ctx.font = `700 ${13 * g.s}px "Figtree Variable", sans-serif`
    ctx.fillStyle = p.second
    ctx.fillText('DENGAN CINTA', left, top)
    spaced(ctx, 0)
    const size = fitFont(ctx, g.text.names, (n) => `600 ${n}px "Fraunces Variable", serif`, f.h * 0.2, textWidth)
    ctx.textAlign = 'left'
    ctx.fillStyle = p.ink
    ctx.fillText(g.text.names, left, top + size * 1.05)
    ctx.font = `500 ${18 * g.s}px "DM Mono", monospace`
    ctx.fillStyle = p.accent
    ctx.fillText(g.text.dateShort, left, top + size * 1.05 + 32 * g.s)
  },
}

function catenary(x0: number, x1: number, y: number, sag: number) {
  return (t: number) => {
    const x = x0 + (x1 - x0) * t
    return [x, y + 4 * sag * t * (1 - t)] as const
  }
}

function bulbs(ctx: Ctx, g: Geo, x0: number, x1: number, y: number, sag: number, gapPx: number, offset = 0) {
  const curve = catenary(x0, x1, y, sag)
  ctx.strokeStyle = '#0b0d24'
  ctx.lineWidth = 2 * g.s
  ctx.beginPath()
  for (let i = 0; i <= 30; i++) {
    const [x, yy] = curve(i / 30)
    if (i === 0) ctx.moveTo(x, yy)
    else ctx.lineTo(x, yy)
  }
  ctx.stroke()
  const colors = ['#ffc94a', '#ff6f61', '#ff8fb1', '#8fe3ff']
  const count = Math.max(2, Math.round((x1 - x0) / gapPx))
  for (let i = 1; i < count; i++) {
    const [x, yy] = curve(i / count)
    const color = colors[(i + offset) % colors.length] as string
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 14 * g.s
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, yy + 7 * g.s, 5 * g.s, 7 * g.s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#0b0d24'
    ctx.fillRect(x - 2.5 * g.s, yy, 5 * g.s, 3 * g.s)
  }
}

const pasarMalam: Painter = {
  base(ctx, g) {
    const p = palettes['pasar-malam']
    ctx.fillStyle = p.paper
    ctx.fillRect(0, 0, g.W, g.H)
    const glow = ctx.createRadialGradient(g.W / 2, g.H, 0, g.W / 2, g.H, g.H * 0.5)
    glow.addColorStop(0, 'rgba(255,111,97,0.25)')
    glow.addColorStop(1, 'rgba(255,111,97,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, g.W, g.H)
    const rand = seeded(11)
    const stars = Math.round((g.W * g.H) / (g.s * g.s * 2400))
    for (let i = 0; i < stars; i++) {
      ctx.globalAlpha = 0.25 + rand() * 0.6
      ctx.fillStyle = '#fff4dc'
      ctx.beginPath()
      ctx.arc(rand() * g.W, rand() * g.H, (0.6 + rand() * 1.6) * g.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // A Ferris wheel half hidden at the right edge of the footer.
    const f = g.footer
    const r = Math.min(f.h * 0.42, g.W * 0.28)
    const cx = g.W - r * 0.35
    const cy = f.y + f.h * 0.62
    ctx.strokeStyle = p.line
    ctx.lineWidth = 3 * g.s
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2)
    ctx.stroke()
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      ctx.stroke()
      ctx.fillStyle = k % 2 ? p.second : p.accent
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5 * g.s, 0, Math.PI * 2)
      ctx.fill()
    }
  },
  over(ctx, g) {
    const p = palettes['pasar-malam']
    strokeSlots(ctx, g, p.accent, 3 * g.s)
    const half = g.W / 2
    bulbs(ctx, g, -10 * g.s, half, g.m * 0.25, g.m * 0.45, 34 * g.s)
    bulbs(ctx, g, half, g.W + 10 * g.s, g.m * 0.25, g.m * 0.45, 34 * g.s, 2)
    const f = g.footer
    bulbs(ctx, g, -10 * g.s, g.W + 10 * g.s, f.y + f.h * 0.04, f.h * 0.12, 40 * g.s, 1)
    const left = g.m
    const maxWidth = g.W * 0.62
    const size = fitFont(
      ctx,
      g.text.names,
      (n) => `700 ${n}px "Bricolage Grotesque Variable", sans-serif`,
      f.h * 0.2,
      maxWidth,
    )
    ctx.textAlign = 'left'
    ctx.fillStyle = p.ink
    ctx.fillText(g.text.names, left, f.y + f.h * 0.45 + size * 0.3)
    spaced(ctx, 3 * g.s)
    ctx.font = `600 ${18 * g.s}px "Figtree Variable", sans-serif`
    ctx.fillStyle = p.accent
    ctx.fillText(g.text.dateLong.toUpperCase(), left, f.y + f.h * 0.45 + size * 0.3 + 36 * g.s)
    spaced(ctx, 0)
  },
}

function jasmine(ctx: Ctx, x: number, y: number, r: number, center: string) {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#b9c7ad'
  ctx.lineWidth = r * 0.18
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5 - Math.PI / 2
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.3, a, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = center
  ctx.beginPath()
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2)
  ctx.fill()
}

function bud(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#b9c7ad'
  ctx.lineWidth = r * 0.3
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function garland(ctx: Ctx, g: Geo, x0: number, x1: number, y: number, sag: number) {
  const p = palettes.melati
  const curve = catenary(x0, x1, y, sag)
  const count = Math.max(4, Math.round((x1 - x0) / (9 * g.s)))
  for (let i = 0; i <= count; i++) {
    const [x, yy] = curve(i / count)
    if (i % 5 === 2) jasmine(ctx, x, yy, 7 * g.s, p.second)
    else bud(ctx, x, yy, 3.4 * g.s)
  }
  ctx.fillStyle = '#9bb08f'
  for (const x of [x0, x1]) {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(x + side * 6 * g.s, y - 2 * g.s, 7 * g.s, 3 * g.s, side * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function strand(ctx: Ctx, g: Geo, x: number, y0: number, length: number) {
  const p = palettes.melati
  const count = Math.round(length / (10 * g.s))
  for (let i = 0; i <= count; i++) {
    const y = y0 + (length * i) / count
    const dx = Math.sin(i * 0.7) * 2 * g.s
    if (i === count) jasmine(ctx, x + dx, y + 4 * g.s, 8 * g.s, p.second)
    else bud(ctx, x + dx, y, 3.2 * g.s)
  }
}

const melati: Painter = {
  base(ctx, g) {
    const p = palettes.melati
    ctx.fillStyle = p.surface
    ctx.fillRect(0, 0, g.W, g.H)
    ctx.strokeStyle = p.line
    ctx.lineWidth = 2 * g.s
    const inset = g.m * 0.42
    ctx.strokeRect(inset, inset, g.W - inset * 2, g.H - inset * 2)
  },
  over(ctx, g) {
    const p = palettes.melati
    strokeSlots(ctx, g, p.line, 2 * g.s, 2 * g.s)
    const swags = g.W > 900 ? 4 : 3
    for (let i = 0; i < swags; i++) {
      garland(ctx, g, (g.W * i) / swags, (g.W * (i + 1)) / swags, g.m * 0.22, g.m * 0.45)
    }
    const hang = Math.min(g.H * 0.22, 220 * g.s)
    strand(ctx, g, g.m * 0.5, g.m * 0.3, hang)
    strand(ctx, g, g.W - g.m * 0.5, g.m * 0.3, hang)
    const f = g.footer
    const cx = g.W / 2
    const size = fitFont(
      ctx,
      g.text.names,
      (n) => `italic 600 ${n}px "Cormorant Variable", serif`,
      Math.min(f.h * 0.27, 100 * g.s),
      g.W - g.m * 3,
    )
    const date = 19 * g.s
    const at = stack(f.y, g.H - g.m * 0.75 - 10 * g.s, size, 18 * g.s, date, 12 * g.s)
    centerText(ctx, g.text.names, cx, at.names, p.deep)
    jasmine(ctx, cx, at.ornament, 9 * g.s, p.second)
    ctx.strokeStyle = p.accent
    ctx.lineWidth = 1.5 * g.s
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + side * 18 * g.s, at.ornament)
      ctx.lineTo(cx + side * Math.min(g.W * 0.3, 120 * g.s), at.ornament)
      ctx.stroke()
    }
    spaced(ctx, 4 * g.s)
    fitFont(ctx, g.text.dateLong.toUpperCase(), (n) => `500 ${n}px "Figtree Variable", sans-serif`, date, g.W - g.m * 3)
    centerText(ctx, g.text.dateLong.toUpperCase(), cx, at.date, p.muted)
    spaced(ctx, 0)
    garland(ctx, g, g.m, g.W - g.m, g.H - g.m * 0.75, g.m * 0.2)
  },
}

const confettiColors = ['#ff5a4e', '#2f6fde', '#ffc83d', '#1fae8b', '#ff8fb1']

function confettiPiece(ctx: Ctx, rand: () => number, x: number, y: number, s: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rand() * Math.PI * 2)
  const color = confettiColors[Math.floor(rand() * confettiColors.length)] as string
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const kind = Math.floor(rand() * 5)
  const size = (5 + rand() * 7) * s
  if (kind === 0) {
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 1) {
    ctx.fillRect(-size * 0.5, -size * 0.5, size, size)
  } else if (kind === 2) {
    ctx.beginPath()
    ctx.moveTo(0, -size * 0.7)
    ctx.lineTo(size * 0.65, size * 0.5)
    ctx.lineTo(-size * 0.65, size * 0.5)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 3) {
    ctx.lineWidth = 3 * s
    ctx.beginPath()
    for (let i = 0; i <= 4; i++) {
      const px = -size + (i * size) / 2
      const py = i % 2 ? -size * 0.4 : size * 0.4
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  } else {
    ctx.fillRect(-size * 0.9, -size * 0.2, size * 1.8, size * 0.4)
  }
  ctx.restore()
}

const kertas: Painter = {
  base(ctx, g) {
    const p = palettes.kertas
    ctx.fillStyle = p.paper
    ctx.fillRect(0, 0, g.W, g.H)
    const rand = seeded(23)
    const count = Math.round((g.W * g.H) / (g.s * g.s * 4200))
    for (let i = 0; i < count; i++) confettiPiece(ctx, rand, rand() * g.W, rand() * g.H, g.s)
  },
  over(ctx, g) {
    const p = palettes.kertas
    strokeSlots(ctx, g, '#ffffff', 9 * g.s)
    const rand = seeded(5)
    for (const slot of g.slots) {
      // Washi tape at the top of each photo.
      ctx.save()
      ctx.translate(slot.x + slot.w * (0.3 + rand() * 0.4), slot.y)
      ctx.rotate((rand() - 0.5) * 0.25)
      ctx.fillStyle = 'rgba(255, 200, 61, 0.78)'
      ctx.fillRect(-32 * g.s, -10 * g.s, 64 * g.s, 20 * g.s)
      ctx.restore()
      for (let i = 0; i < 3; i++) {
        const onLeft = rand() < 0.5
        confettiPiece(ctx, rand, onLeft ? slot.x : slot.x + slot.w, slot.y + rand() * slot.h, g.s)
      }
    }
    const f = g.footer
    const cx = g.W / 2
    const size = fitFont(
      ctx,
      g.text.names,
      (n) => `700 ${n}px "Playpen Sans Variable", sans-serif`,
      f.h * 0.2,
      g.W - g.m * 2.5,
    )
    centerText(ctx, g.text.names, cx, f.y + f.h * 0.42 + size * 0.15, p.ink)
    ctx.font = `700 ${18 * g.s}px "Figtree Variable", sans-serif`
    const label = g.text.dateLong
    const width = ctx.measureText(label).width + 36 * g.s
    const pillH = 38 * g.s
    const py = f.y + f.h * 0.58
    ctx.fillStyle = '#ffc83d'
    ctx.beginPath()
    ctx.roundRect(cx - width / 2, py, width, pillH, pillH / 2)
    ctx.fill()
    ctx.fillStyle = '#1e1d24'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, py + pillH / 2 + 1 * g.s)
    ctx.textBaseline = 'alphabetic'
  },
}

const polos: Painter = {
  base(ctx, g) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, g.W, g.H)
  },
  over(ctx, g) {
    const f = g.footer
    const cx = g.W / 2
    const size = fitFont(
      ctx,
      g.text.names,
      (n) => `600 ${n}px "Figtree Variable", sans-serif`,
      f.h * 0.16,
      g.W - g.m * 3,
    )
    centerText(ctx, g.text.names, cx, f.y + f.h * 0.4 + size * 0.2, '#1c1a16')
    ctx.fillStyle = '#e3dccd'
    ctx.fillRect(cx - 30 * g.s, f.y + f.h * 0.54, 60 * g.s, 2 * g.s)
    ctx.font = `500 ${17 * g.s}px "DM Mono", monospace`
    centerText(ctx, g.text.dateShort, cx, f.y + f.h * 0.68, '#8c867a')
  },
}

const painters: Record<FrameId, Painter> = {
  kawung,
  sawah,
  'kartu-pos': kartuPos,
  'pasar-malam': pasarMalam,
  melati,
  kertas,
  polos,
}

export type ShotSource = { source: CanvasImageSource; width: number; height: number }

/** Paints the strip at print size times `scale`. Missing shots are left as soft grey boxes. */
export async function renderStrip(
  layoutId: LayoutId,
  frameId: FrameId,
  shots: (ShotSource | undefined)[],
  text: FrameText,
  scale = 1,
) {
  await ensureFonts()
  const layout = layoutById(layoutId)
  const canvas = makeCanvas(layout.width * scale, layout.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  ctx.scale(scale, scale)
  const geo: Geo = {
    W: layout.width,
    H: layout.height,
    s: Math.min(layout.width, layout.height) / 600,
    m: layout.margin,
    slots: slotsOf(layout),
    footer: { x: 0, y: layout.height - layout.footer, w: layout.width, h: layout.footer },
    text,
  }
  const painter = painters[frameId] ?? polos
  painter.base(ctx, geo)
  geo.slots.forEach((slot, index) => {
    const shot = shots[index]
    if (shot) drawCover(ctx, shot.source, shot.width, shot.height, slot)
    else {
      ctx.fillStyle = '#e9e4da'
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h)
    }
  })
  painter.over(ctx, geo)
  return canvas
}

let samples: Promise<ShotSource[]> | undefined

/** Crops of a sample picture, used in previews before the guest takes photos. */
export function sampleShots() {
  if (!samples) {
    samples = loadPicture('/wedding/garden.jpg').then((image) => {
      const spots = [
        { x: 820, y: 140, w: 620, h: 560 },
        { x: 380, y: 260, w: 560, h: 520 },
        { x: 1080, y: 420, w: 520, h: 480 },
        { x: 0, y: 380, w: 640, h: 520 },
      ]
      return spots.map((spot) => {
        const canvas = makeCanvas(spot.w, spot.h)
        canvas.getContext('2d')?.drawImage(image, spot.x, spot.y, spot.w, spot.h, 0, 0, spot.w, spot.h)
        return { source: canvas, width: spot.w, height: spot.h }
      })
    })
    samples.catch(() => {
      samples = undefined
    })
  }
  return samples
}
