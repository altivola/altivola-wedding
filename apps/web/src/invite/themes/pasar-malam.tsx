import type { Palette } from '../palette'
import { type ArtProps, svgUrl, type ThemeArt } from './types'

// Pasar Malam: a night market with string lights, a Ferris wheel and an admission ticket.

const bulbColors = ['#ffc94a', '#ff6f61', '#8fd3ff', '#ff8fb1', '#b4f08a']

function Lights({
  from,
  to,
  sag,
  count,
  start = 0,
}: {
  from: [number, number]
  to: [number, number]
  sag: number
  count: number
  start?: number
}) {
  const [x1, y1] = from
  const [x2, y2] = to
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2 + sag
  const point = (t: number) => [
    (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2,
    (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2,
  ]
  return (
    <g>
      <path d={`M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`} stroke="#0a0c24" strokeWidth="1.6" fill="none" />
      {Array.from({ length: count }, (_, index) => {
        const [x, y] = point((index + 0.5) / count)
        const color = bulbColors[(index + start) % bulbColors.length]
        return (
          <g key={index} className="bulb" style={{ animationDelay: `${((index + start) % 5) * 0.4}s` }}>
            <circle cx={x} cy={(y ?? 0) + 7} r="9" fill={color} opacity="0.25" />
            <path d={`M${x} ${y}v3`} stroke="#0a0c24" strokeWidth="1.5" />
            <ellipse cx={x} cy={(y ?? 0) + 8} rx="3.6" ry="5" fill={color} />
          </g>
        )
      })}
    </g>
  )
}

function Wheel({ x, y, r, p }: { x: number; y: number; r: number; p: Palette }) {
  return (
    <g>
      <path
        d={`M${x} ${y}L${x - r * 0.62} ${y + r * 1.28}M${x} ${y}L${x + r * 0.62} ${y + r * 1.28}`}
        stroke="#5a5f9e"
        strokeWidth="5"
      />
      <g className="wheel" style={{ transformOrigin: `${x}px ${y}px` }}>
        <circle cx={x} cy={y} r={r} fill="none" stroke="#7f86d1" strokeWidth="3" />
        <circle cx={x} cy={y} r={r * 0.82} fill="none" stroke="#5a5f9e" strokeWidth="1.5" />
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index / 10) * Math.PI * 2
          const cx = x + Math.cos(angle) * r
          const cy = y + Math.sin(angle) * r
          return (
            <g key={index}>
              <path d={`M${x} ${y}L${cx} ${cy}`} stroke="#5a5f9e" strokeWidth="1.5" />
              <circle cx={cx} cy={cy} r="3" fill={bulbColors[index % 5]} />
              <rect x={cx - 6} y={cy + 2} width="12" height="10" rx="3" fill={index % 2 ? p.accent : p.second} />
            </g>
          )
        })}
      </g>
      <circle cx={x} cy={y} r="6" fill={p.accent} />
    </g>
  )
}

function Tent({ x, y, w, p }: { x: number; y: number; w: number; p: Palette }) {
  const stripes = 7
  return (
    <g>
      {Array.from({ length: stripes }, (_, index) => {
        const left = x + (w / stripes) * index
        return (
          <path
            key={index}
            d={`M${x + w / 2} ${y}L${left} ${y + w * 0.42}h${w / stripes}z`}
            fill={index % 2 ? '#fff4dc' : p.second}
          />
        )
      })}
      <rect x={x + w * 0.08} y={y + w * 0.42} width={w * 0.84} height={w * 0.5} fill="#2a2f66" />
      <path
        d={`M${x + w * 0.38} ${y + w * 0.92}v-${w * 0.32}a${w * 0.12} ${w * 0.12} 0 0 1 ${w * 0.24} 0v${w * 0.32}`}
        fill={p.accent}
        opacity="0.85"
      />
      {Array.from({ length: 7 }, (_, index) => (
        <path
          key={`s${index}`}
          d={`M${x + (w / 7) * index} ${y + w * 0.42}q${w / 14} ${w * 0.08} ${w / 7} 0`}
          fill={index % 2 ? p.second : '#fff4dc'}
        />
      ))}
      <circle cx={x + w / 2} cy={y - 4} r="4" fill={p.accent} />
    </g>
  )
}

function Ticket({ p }: { p: Palette }) {
  return (
    <g>
      <path d="M20 40h280v54a14 14 0 0 0 0 28v54H20v-54a14 14 0 0 0 0-28z" fill={p.accent} />
      <path d="M86 46v124" stroke={p.onAccent} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="4 6" />
      <rect x="28" y="48" width="264" height="120" rx="4" fill="none" stroke={p.onAccent} strokeOpacity="0.4" />
      <text
        x="53"
        y="112"
        fontSize="13"
        fill={p.onAccent}
        textAnchor="middle"
        transform="rotate(-90 53 108)"
        fontFamily="DM Mono, monospace"
        letterSpacing="2"
      >
        No. 0612
      </text>
      <text
        x="190"
        y="84"
        fontSize="12"
        fill={p.onAccent}
        textAnchor="middle"
        fontFamily="DM Mono, monospace"
        letterSpacing="4"
      >
        TIKET MASUK
      </text>
      <path d="M130 96h120" stroke={p.onAccent} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map((index) => (
        <path
          key={index}
          d={`M${150 + index * 20} 128l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z`}
          fill={p.onAccent}
        />
      ))}
    </g>
  )
}

function Envelope({ palette: p }: ArtProps) {
  return (
    <svg className="env env-ticket" viewBox="0 0 320 240" aria-hidden="true">
      <g className="env-card">
        <rect x="40" y="56" width="240" height="140" rx="10" fill={p.surface} />
        <Lights from={[52, 74]} to={[268, 74]} sag={26} count={9} />
      </g>
      <g className="env-flap">
        <Ticket p={p} />
      </g>
    </svg>
  )
}

function Hero({ palette: p }: ArtProps) {
  return (
    <svg className="hero-art" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1030" />
          <stop offset="0.7" stopColor={p.paper} />
          <stop offset="1" stopColor="#2a2463" />
        </linearGradient>
      </defs>
      <rect width="400" height="640" fill="url(#pm-sky)" />
      {Array.from({ length: 40 }, (_, index) => (
        <circle
          key={index}
          className="star"
          cx={(index * 97) % 400}
          cy={(index * 53) % 380}
          r={index % 4 === 0 ? 1.8 : 1}
          fill="#fff4dc"
          style={{ animationDelay: `${(index % 7) * 0.5}s` }}
        />
      ))}
      <Lights from={[-10, 20]} to={[410, 30]} sag={70} count={16} />
      <Lights from={[-10, 120]} to={[410, 110]} sag={50} count={14} start={2} />
      <Wheel x={300} y={430} r={92} p={p} />
      <Tent x={10} y={450} w={150} p={p} />
      <rect y="590" width="400" height="50" fill="#0f1231" />
      <path d="M0 590h400" stroke={p.accent} strokeOpacity="0.4" />
    </svg>
  )
}

function Ornament({ palette: p }: ArtProps) {
  return (
    <svg className="ornament" viewBox="0 0 220 44" aria-hidden="true">
      <Lights from={[10, 8]} to={[210, 8]} sag={22} count={7} />
      <circle cx="10" cy="8" r="2" fill={p.muted} />
      <circle cx="210" cy="8" r="2" fill={p.muted} />
    </svg>
  )
}

function Footer({ palette: p }: ArtProps) {
  return (
    <svg className="footer-art" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <Wheel x={90} y={120} r={70} p={p} />
      <Tent x={230} y={90} w={140} p={p} />
      <rect y="176" width="400" height="24" fill="#0f1231" />
    </svg>
  )
}

const stars = (p: Palette) =>
  svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><g fill='${p.ink}'><circle cx='12' cy='20' r='0.9' opacity='0.5'/><circle cx='60' cy='8' r='0.7' opacity='0.4'/><circle cx='74' cy='60' r='1' opacity='0.45'/><circle cx='30' cy='72' r='0.6' opacity='0.35'/></g></svg>`,
  )

export const pasarMalam: ThemeArt = {
  Envelope,
  Hero,
  Ornament,
  Footer,
  pattern: stars,
  frame: 'bulbs',
  panel: 'ticket',
}
