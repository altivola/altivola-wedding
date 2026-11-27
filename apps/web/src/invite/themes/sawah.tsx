import type { ArtProps, ThemeArt } from './types'

// Sawah Pagi: green rice terraces at sunrise, kites and a woven bamboo envelope.

const greens = ['#a9cf6b', '#86b955', '#679f46', '#4e863c', '#3a6e33']

function Sun({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.5} fill={color} opacity="0.18" />
      <circle cx={x} cy={y} r={r} fill={color} />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2
        return (
          <path
            key={index}
            d={`M${x + Math.cos(angle) * r * 1.25} ${y + Math.sin(angle) * r * 1.25}L${x + Math.cos(angle) * r * 1.55} ${y + Math.sin(angle) * r * 1.55}`}
            stroke={color}
            strokeWidth={r * 0.12}
            strokeLinecap="round"
          />
        )
      })}
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff" opacity="0.92">
      <ellipse cx="0" cy="0" rx="34" ry="14" />
      <ellipse cx="-16" cy="-8" rx="16" ry="12" />
      <ellipse cx="12" cy="-12" rx="20" ry="16" />
    </g>
  )
}

function Kite({ x, y, s, colors }: { x: number; y: number; s: number; colors: [string, string] }) {
  return (
    <g className="kite" transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -30L22 0 0 34 -22 0z" fill={colors[0]} />
      <path d="M0 -30L22 0H-22z" fill={colors[1]} />
      <path d="M0 -30V34M-22 0H22" stroke="#5a3e2b" strokeWidth="1.5" />
      <path d="M0 34q-12 18 4 30t-6 32" stroke="#5a3e2b" strokeWidth="1.2" fill="none" />
      {[46, 62, 80].map((offset, index) => (
        <path key={offset} d={`M${index % 2 ? -2 : 2} ${offset}l-6 -4v8z`} fill={index % 2 ? colors[0] : colors[1]} />
      ))}
    </g>
  )
}

function Terraces({ width, top }: { width: number; top: number }) {
  const rows = greens.map((color, index) => {
    const y = top + index * 46
    const lift = index % 2 ? 26 : -18
    return {
      color,
      y,
      d: `M0 ${y + 30}Q${width * 0.3} ${y + lift} ${width * 0.6} ${y + 18}T${width} ${y + 6}V${top + 400}H0z`,
    }
  })
  return (
    <g>
      {rows.map((row) => (
        <g key={row.y}>
          <path d={row.d} fill={row.color} />
          <path
            d={`M0 ${row.y + 44}Q${width * 0.3} ${row.y + 18 + (row.y % 3)} ${width * 0.6} ${row.y + 34}T${width} ${row.y + 22}`}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.28"
            strokeWidth="2"
          />
        </g>
      ))}
    </g>
  )
}

function Rice({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 40Q2 10 18 -16" stroke="#6b8f3a" strokeWidth="2" fill="none" />
      {Array.from({ length: 7 }, (_, index) => (
        <ellipse
          key={index}
          cx={4 + index * 2.2}
          cy={24 - index * 5.6}
          rx="2.4"
          ry="5"
          fill={color}
          transform={`rotate(${30 + index * 4} ${4 + index * 2.2} ${24 - index * 5.6})`}
        />
      ))}
    </g>
  )
}

function Envelope({ palette: p }: ArtProps) {
  return (
    <svg className="env" viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <pattern id="sw-weave" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#d9b77e" />
          <rect width="8" height="8" fill="#e8cc98" />
          <rect x="8" y="8" width="8" height="8" fill="#e8cc98" />
          <path d="M0 4h8M8 12h8M4 8v8M12 0v8" stroke="#b8925a" strokeOpacity="0.5" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect x="10" y="60" width="300" height="172" rx="10" fill="#c9a56b" />
      <g className="env-card">
        <rect x="34" y="34" width="252" height="170" rx="8" fill={p.surface} />
        <Sun x={160} y={92} r={18} color={p.accent} />
        <path d="M60 196q50-40 100-20t100-14v38H60z" fill={greens[1]} />
      </g>
      <path d="M10 68v154a10 10 0 0 0 10 10h280a10 10 0 0 0 10-10V68L160 168z" fill="url(#sw-weave)" />
      <path
        d="M10 68v154a10 10 0 0 0 10 10h280a10 10 0 0 0 10-10V68L160 168z"
        fill="none"
        stroke="#9c7643"
        strokeWidth="2"
      />
      <g className="env-flap">
        <path d="M10 70a10 10 0 0 1 10-10h280a10 10 0 0 1 10 10L160 172z" fill="url(#sw-weave)" />
        <path d="M10 70a10 10 0 0 1 10-10h280a10 10 0 0 1 10 10L160 172z" fill="#000" opacity="0.06" />
        <path d="M14 66L160 168 306 66" fill="none" stroke="#9c7643" strokeWidth="2" />
      </g>
      <g className="env-seal">
        <path d="M120 168h80" stroke={p.deep} strokeWidth="5" strokeLinecap="round" />
        <circle cx="160" cy="168" r="22" fill={p.accent} />
        <circle cx="160" cy="168" r="22" fill="none" stroke="#fff3df" strokeWidth="2" strokeDasharray="3 4" />
        <Rice x={150} y={160} s={0.6} color="#fff3df" />
        <Rice x={162} y={160} s={0.6} color="#fff3df" />
      </g>
    </svg>
  )
}

function Hero({ palette: p }: ArtProps) {
  return (
    <svg className="hero-art" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe0ef" />
          <stop offset="0.55" stopColor="#f7ecd2" />
          <stop offset="1" stopColor={p.paper} />
        </linearGradient>
      </defs>
      <rect width="400" height="640" fill="url(#sw-sky)" />
      <Sun x={300} y={92} r={30} color={p.accent} />
      <Cloud x={80} y={70} />
      <Cloud x={250} y={170} s={0.7} />
      <Cloud x={350} y={250} s={0.55} />
      <Kite x={70} y={168} s={0.9} colors={[p.accent, '#f2c14e']} />
      <Kite x={330} y={330} s={0.6} colors={['#e55d5d', '#ffffff']} />
      <path
        d="M40 300q24-14 30-4M56 286q10-10 16-2"
        stroke="#3b4a3a"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <Terraces width={400} top={430} />
      <Rice x={24} y={560} s={1.2} color="#f2c14e" />
      <Rice x={360} y={572} s={1.1} color="#f2c14e" />
    </svg>
  )
}

function Ornament({ palette: p }: ArtProps) {
  return (
    <svg className="ornament" viewBox="0 0 220 44" aria-hidden="true">
      <path
        d="M12 26q48-16 80 0M128 26q32-16 80 0"
        stroke={p.deep}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <Rice x={96} y={10} s={0.7} color={p.second} />
      <Rice x={110} y={8} s={0.8} color={p.accent} />
    </svg>
  )
}

function Footer({ palette: p }: ArtProps) {
  return (
    <svg className="footer-art" viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g transform="translate(0 -420)">
        <Terraces width={400} top={440} />
      </g>
      <Kite x={330} y={36} s={0.5} colors={[p.accent, '#f2c14e']} />
    </svg>
  )
}

export const sawah: ThemeArt = {
  Envelope,
  Hero,
  Ornament,
  Footer,
  frame: 'soft',
  panel: 'paper',
}

export { Cloud, Kite, Sun }
