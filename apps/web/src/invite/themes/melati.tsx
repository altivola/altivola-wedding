import type { ArtProps, ThemeArt } from './types'

// Untai Melati: ivory and sage with strands of jasmine.

function Blossom({ x, y, r, rotate = 0 }: { x: number; y: number; r: number; rotate?: number }) {
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * 360
        return (
          <ellipse
            key={index}
            cx={x}
            cy={y - r * 0.55}
            rx={r * 0.32}
            ry={r * 0.55}
            fill="#fffef8"
            stroke="#d9dccb"
            strokeWidth="0.6"
            transform={`rotate(${angle} ${x} ${y})`}
          />
        )
      })}
      <circle cx={x} cy={y} r={r * 0.16} fill="#e6d48f" />
    </g>
  )
}

function Bud({ x, y, r }: { x: number; y: number; r: number }) {
  return <ellipse cx={x} cy={y} rx={r * 0.3} ry={r * 0.6} fill="#fbfaf0" stroke="#d9dccb" strokeWidth="0.6" />
}

function Leaf({
  x,
  y,
  s = 1,
  rotate = 0,
  color,
}: {
  x: number
  y: number
  s?: number
  rotate?: number
  color: string
}) {
  return (
    <path
      d="M0 0q10-14 24-2Q12 12 0 0z"
      fill={color}
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}
    />
  )
}

function Strand({ x, top, length, sway }: { x: number; top: number; length: number; sway: number }) {
  const items = Math.floor(length / 20)
  return (
    <g className="strand" style={{ transformOrigin: `${x}px ${top}px`, animationDelay: `${(x % 5) * 0.3}s` }}>
      <path d={`M${x} ${top}q${sway} ${length / 2} 0 ${length}`} stroke="#b9c3a8" strokeWidth="1" fill="none" />
      {Array.from({ length: items }, (_, index) => {
        const t = (index + 1) / items
        const px = x + sway * 2 * t * (1 - t)
        const py = top + length * t
        return index % 3 === 2 ? (
          <Bud key={index} x={px} y={py} r={9} />
        ) : (
          <Blossom key={index} x={px} y={py} r={8 + (index % 2) * 2} rotate={index * 23} />
        )
      })}
    </g>
  )
}

function Envelope({ palette: p }: ArtProps) {
  const scallops = Array.from({ length: 15 }, (_, index) => 10 + index * 20)
  return (
    <svg className="env" viewBox="0 0 320 240" aria-hidden="true">
      <rect x="10" y="60" width="300" height="172" rx="6" fill="#a7b99a" />
      <g className="env-card">
        <rect x="34" y="36" width="252" height="170" rx="4" fill={p.surface} />
        <Blossom x={160} y={90} r={16} />
        <Leaf x={132} y={96} s={1.2} rotate={200} color={p.accent} />
        <Leaf x={188} y={84} s={1.2} rotate={-20} color={p.accent} />
      </g>
      <path d="M10 68v158a6 6 0 0 0 6 6h288a6 6 0 0 0 6-6V68L160 168z" fill="#9bb08f" />
      <g className="env-flap">
        <path d="M10 66a6 6 0 0 1 6-6h288a6 6 0 0 1 6 6L160 170z" fill="#b3c4a6" />
        <path d="M18 70L160 162 302 70" fill="none" stroke="#fffdf6" strokeWidth="1.2" strokeDasharray="2 4" />
        {scallops.map((x) => (
          <circle key={x} cx={x} cy={60} r={4} fill={p.paper} />
        ))}
      </g>
      <path d="M10 120q150 60 300 0" stroke="#e0e6d4" strokeWidth="1" fill="none" />
      {Array.from({ length: 11 }, (_, index) => {
        const t = index / 10
        const x = 10 + 300 * t
        const y = 120 + 60 * 2 * t * (1 - t)
        return index % 2 ? (
          <Bud key={index} x={x} y={y} r={8} />
        ) : (
          <Blossom key={index} x={x} y={y} r={8} rotate={index * 30} />
        )
      })}
      <g className="env-seal">
        <circle cx="160" cy="168" r="24" fill={p.surface} stroke={p.accent} strokeWidth="1.4" />
        <Blossom x={152} y={164} r={10} />
        <Blossom x={168} y={170} r={9} rotate={20} />
        <Bud x={160} y={180} r={8} />
      </g>
    </svg>
  )
}

function Hero({ palette: p }: ArtProps) {
  const strands = [
    [30, 240, 18],
    [80, 150, -14],
    [130, 96, 10],
    [270, 96, -10],
    [320, 150, 14],
    [370, 240, -18],
  ] as const
  return (
    <svg className="hero-art" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="640" fill={p.paper} />
      <path d="M-10 18q210 40 420 0" stroke={p.deep} strokeWidth="2" fill="none" />
      {Array.from({ length: 16 }, (_, index) => (
        <Leaf
          key={index}
          x={index * 27}
          y={18 + Math.sin(index) * 4 + 6 * Math.sin((index / 15) * Math.PI)}
          s={1.1}
          rotate={index % 2 ? 20 : 150}
          color={index % 3 ? p.accent : p.deep}
        />
      ))}
      {strands.map(([x, length, sway]) => (
        <Strand key={x} x={x} top={24} length={length} sway={sway} />
      ))}
      <path d="M60 600q140-40 280 0" stroke={p.line} strokeWidth="1.5" fill="none" />
      {[120, 160, 200, 240, 280].map((x, index) => (
        <Blossom key={x} x={x} y={588 - Math.sin((index / 4) * Math.PI) * 8} r={10} rotate={index * 40} />
      ))}
    </svg>
  )
}

function Ornament({ palette: p }: ArtProps) {
  return (
    <svg className="ornament" viewBox="0 0 220 44" aria-hidden="true">
      <path d="M20 22h68M132 22h68" stroke={p.line} strokeWidth="1.4" />
      <Leaf x={92} y={24} s={0.9} rotate={190} color={p.accent} />
      <Leaf x={128} y={20} s={0.9} rotate={-10} color={p.accent} />
      <Blossom x={110} y={22} r={11} />
    </svg>
  )
}

function Footer({ palette: p }: ArtProps) {
  return (
    <svg className="footer-art" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M-10 110q210-60 420 0" stroke={p.deep} strokeWidth="2" fill="none" />
      {Array.from({ length: 13 }, (_, index) => {
        const t = index / 12
        const x = -10 + 420 * t
        const y = 110 - 60 * 2 * t * (1 - t) - 4
        return index % 3 === 1 ? (
          <Bud key={index} x={x} y={y} r={9} />
        ) : (
          <Blossom key={index} x={x} y={y} r={10} rotate={index * 25} />
        )
      })}
    </svg>
  )
}

export const melati: ThemeArt = {
  Envelope,
  Hero,
  Ornament,
  Footer,
  frame: 'oval',
  panel: 'leaf',
}
