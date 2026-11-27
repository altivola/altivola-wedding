import type { Palette } from '../palette'
import { type ArtProps, svgUrl, type ThemeArt } from './types'

// Kawung Senja: indigo batik kawung on cream, gold lines and a jasmine wax seal.

function Rosette({
  x,
  y,
  r,
  color,
  fill = 'none',
  width = 1.6,
}: {
  x: number
  y: number
  r: number
  color: string
  fill?: string
  width?: number
}) {
  const rx = r * 0.32
  const ry = r * 0.5
  return (
    <g fill={fill} stroke={color} strokeWidth={width}>
      <ellipse cx={x} cy={y - ry} rx={rx} ry={ry} />
      <ellipse cx={x} cy={y + ry} rx={rx} ry={ry} />
      <ellipse cx={x - ry} cy={y} rx={ry} ry={rx} />
      <ellipse cx={x + ry} cy={y} rx={ry} ry={rx} />
      <circle cx={x} cy={y} r={r * 0.09} fill={color} stroke="none" />
    </g>
  )
}

function Jasmine({ x, y, r, color = '#fffdf4' }: { x: number; y: number; r: number; color?: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2 - Math.PI / 2
        return (
          <ellipse
            key={index}
            cx={x + Math.cos(angle) * r * 0.55}
            cy={y + Math.sin(angle) * r * 0.55}
            rx={r * 0.42}
            ry={r * 0.26}
            transform={`rotate(${(angle * 180) / Math.PI} ${x + Math.cos(angle) * r * 0.55} ${y + Math.sin(angle) * r * 0.55})`}
            fill={color}
          />
        )
      })}
      <circle cx={x} cy={y} r={r * 0.18} fill="#e8d28a" />
    </g>
  )
}

const tile = (color: string, opacity: number) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><g fill='none' stroke='${color}' stroke-opacity='${opacity}' stroke-width='1.1'><ellipse cx='22' cy='11' rx='5.5' ry='9'/><ellipse cx='22' cy='33' rx='5.5' ry='9'/><ellipse cx='11' cy='22' rx='9' ry='5.5'/><ellipse cx='33' cy='22' rx='9' ry='5.5'/></g><g fill='${color}' fill-opacity='${opacity}'><circle cx='22' cy='22' r='1.8'/><circle cx='0' cy='0' r='2.2'/><circle cx='44' cy='0' r='2.2'/><circle cx='0' cy='44' r='2.2'/><circle cx='44' cy='44' r='2.2'/></g></svg>`

function Envelope({ palette: p }: ArtProps) {
  return (
    <svg className="env" viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <pattern id="kw-env" width="22" height="22" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={p.accent} strokeOpacity="0.35" strokeWidth="0.8">
            <ellipse cx="11" cy="5.5" rx="2.8" ry="4.5" />
            <ellipse cx="11" cy="16.5" rx="2.8" ry="4.5" />
            <ellipse cx="5.5" cy="11" rx="4.5" ry="2.8" />
            <ellipse cx="16.5" cy="11" rx="4.5" ry="2.8" />
          </g>
        </pattern>
        <radialGradient id="kw-seal" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#e9c878" />
          <stop offset="0.6" stopColor={p.accent} />
          <stop offset="1" stopColor="#7d5a22" />
        </radialGradient>
      </defs>
      <rect x="10" y="60" width="300" height="172" rx="8" fill={p.deep} />
      <g className="env-card">
        <rect x="34" y="36" width="252" height="170" rx="4" fill={p.surface} />
        <rect x="44" y="46" width="232" height="150" rx="2" fill="none" stroke={p.accent} strokeWidth="1" />
        <Rosette x={160} y={92} r={26} color={p.accent} />
      </g>
      <path d="M10 68v156a8 8 0 0 0 8 8h284a8 8 0 0 0 8-8V68L160 168z" fill={p.deep} />
      <path d="M10 68v156a8 8 0 0 0 8 8h284a8 8 0 0 0 8-8V68L160 168z" fill="url(#kw-env)" />
      <path d="M10 224l118-82M310 224l-118-82" stroke={p.accent} strokeOpacity="0.5" strokeWidth="1.2" />
      <g className="env-flap">
        <path d="M10 68a8 8 0 0 1 8-8h284a8 8 0 0 1 8 8L160 170z" fill="#24325a" />
        <path d="M10 68a8 8 0 0 1 8-8h284a8 8 0 0 1 8 8L160 170z" fill="url(#kw-env)" />
        <path d="M14 66L160 164 306 66" fill="none" stroke={p.accent} strokeWidth="1.6" />
      </g>
      <g className="env-seal">
        <circle cx="160" cy="166" r="26" fill="url(#kw-seal)" />
        <circle cx="160" cy="166" r="20" fill="none" stroke="#f5e2a8" strokeOpacity="0.6" strokeWidth="1.2" />
        <Jasmine x={160} y={166} r={13} />
        <path d="M168 176q16 14 30 10" stroke="#5b7a4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx="190" cy="184" rx="7" ry="3" fill="#6f8f57" transform="rotate(-20 190 184)" />
      </g>
    </svg>
  )
}

function Hero({ palette: p }: ArtProps) {
  return (
    <svg className="hero-art" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="640" fill={p.paper} />
      <path d="M48 640V248A152 152 0 0 1 352 248V640" fill={p.surface} />
      <path d="M48 640V248A152 152 0 0 1 352 248V640" fill="none" stroke={p.accent} strokeWidth="2" />
      <path d="M60 640V250A140 140 0 0 1 340 250V640" fill="none" stroke={p.accent} strokeWidth="0.8" />
      <Rosette x={200} y={132} r={30} color={p.accent} />
      <path d="M150 132h-60M250 132h60" stroke={p.accent} strokeWidth="1" />
      <circle cx="84" cy="132" r="3" fill={p.accent} />
      <circle cx="316" cy="132" r="3" fill={p.accent} />
      <rect y="560" width="400" height="80" fill={p.deep} />
      <path d="M0 560h400" stroke={p.accent} strokeWidth="2" />
      <path d="M0 566h400" stroke={p.accent} strokeWidth="0.6" />
      {Array.from({ length: 9 }, (_, index) => (
        <Rosette key={index} x={20 + index * 45} y={602} r={26} color={p.accent} width={1.2} />
      ))}
      {[
        [24, 28],
        [376, 28],
      ].map(([x, y]) => (
        <g key={x}>
          <Rosette x={x ?? 0} y={y ?? 0} r={22} color={p.deep} width={1.2} />
        </g>
      ))}
      <g opacity="0.95">
        <path d="M70 520q30-40 60-30" stroke="#5b7a4a" strokeWidth="2" fill="none" />
        <Jasmine x={74} y={518} r={10} />
        <Jasmine x={96} y={500} r={8} />
        <Jasmine x={124} y={492} r={9} />
        <path d="M330 520q-30-40-60-30" stroke="#5b7a4a" strokeWidth="2" fill="none" />
        <Jasmine x={326} y={518} r={10} />
        <Jasmine x={304} y={500} r={8} />
        <Jasmine x={276} y={492} r={9} />
      </g>
    </svg>
  )
}

function Ornament({ palette: p }: ArtProps) {
  return (
    <svg className="ornament" viewBox="0 0 220 40" aria-hidden="true">
      <path d="M10 20h72M138 20h72" stroke={p.accent} strokeWidth="1" />
      <circle cx="10" cy="20" r="2.5" fill={p.accent} />
      <circle cx="210" cy="20" r="2.5" fill={p.accent} />
      <Rosette x={110} y={20} r={28} color={p.accent} width={1.4} />
    </svg>
  )
}

function Footer({ palette: p }: ArtProps) {
  return (
    <svg className="footer-art" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect y="40" width="400" height="100" fill={p.deep} />
      <path d="M0 40h400" stroke={p.accent} strokeWidth="2" />
      {Array.from({ length: 9 }, (_, index) => (
        <Rosette key={index} x={20 + index * 45} y={86} r={28} color={p.accent} width={1.2} />
      ))}
    </svg>
  )
}

export const kawung: ThemeArt = {
  Envelope,
  Hero,
  Ornament,
  Footer,
  pattern: (p: Palette) => svgUrl(tile(p.ink, 0.07)),
  frame: 'arch',
  panel: 'gilded',
}

export { Jasmine, Rosette }
