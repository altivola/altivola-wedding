import type { Palette } from '../palette'
import { type ArtProps, svgUrl, type ThemeArt } from './types'

// Kertas Warna: cut paper in bright colours, confetti and an origami envelope.

const colors = (p: Palette) => [p.accent, p.second, '#ffc83d', '#1fae8b']

function Confetti({ width, height, count, p }: { width: number; height: number; count: number; p: Palette }) {
  const palette = colors(p)
  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const x = (index * 71) % width
        const y = (index * 113) % height
        const color = palette[index % 4]
        return index % 3 === 0 ? (
          <circle key={index} cx={x} cy={y} r="4" fill={color} />
        ) : index % 3 === 1 ? (
          <rect
            key={index}
            x={x}
            y={y}
            width="12"
            height="6"
            rx="1.5"
            fill={color}
            transform={`rotate(${index * 29} ${x} ${y})`}
          />
        ) : (
          <path key={index} d={`M${x} ${y}l6 10h-12z`} fill={color} transform={`rotate(${index * 17} ${x} ${y})`} />
        )
      })}
    </g>
  )
}

function Envelope({ palette: p }: ArtProps) {
  const [red, blue, yellow, green] = colors(p)
  return (
    <svg className="env" viewBox="0 0 320 240" aria-hidden="true">
      <rect x="14" y="66" width="300" height="172" rx="6" fill={p.ink} />
      <rect x="10" y="60" width="300" height="172" rx="6" fill={blue} />
      <g className="env-card">
        <rect x="34" y="36" width="252" height="170" rx="6" fill="#ffffff" stroke={p.ink} strokeWidth="2.5" />
        <Confetti width={240} height={60} count={14} p={p} />
      </g>
      <path d="M10 66v160a6 6 0 0 0 6 6h140L10 130z" fill={red} />
      <path d="M310 66v160a6 6 0 0 1-6 6H164l146-102z" fill={green} />
      <path d="M16 232l144-96 144 96z" fill={yellow} />
      <path d="M16 232l144-96 144 96" fill="none" stroke={p.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <g className="env-flap">
        <path d="M10 66a6 6 0 0 1 6-6h288a6 6 0 0 1 6 6L160 172z" fill={red} />
        <path
          d="M10 66a6 6 0 0 1 6-6h288a6 6 0 0 1 6 6L160 172z"
          fill="none"
          stroke={p.ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M160 172L160 60" stroke={p.ink} strokeOpacity="0.15" strokeWidth="2" />
      </g>
      <rect x="10" y="60" width="300" height="172" rx="6" fill="none" stroke={p.ink} strokeWidth="2.5" />
      <g className="env-seal">
        <circle cx="163" cy="173" r="20" fill={p.ink} />
        <circle cx="160" cy="170" r="20" fill="#ffffff" stroke={p.ink} strokeWidth="2.5" />
        <path d="M160 180c-8-6-12-10-12-14a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 4-4 8-12 14z" fill={red} />
      </g>
    </svg>
  )
}

function Blob({ d, color, ink }: { d: string; color: string; ink: string }) {
  return (
    <g>
      <path d={d} fill={ink} transform="translate(6 7)" />
      <path d={d} fill={color} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  )
}

function Hero({ palette: p }: ArtProps) {
  const [red, blue, yellow, green] = colors(p)
  return (
    <svg className="hero-art" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="640" fill={p.paper} />
      <Blob d="M-30 40a110 110 0 0 1 200 40c-10 60-80 80-140 70s-90-60-60-110z" color={red ?? p.accent} ink={p.ink} />
      <Blob d="M300 -10h120v170c-50 10-110-10-120-70s0-100 0-100z" color={yellow ?? p.second} ink={p.ink} />
      <Blob d="M-20 520q100-60 210-10t230-10v160H-20z" color={blue ?? p.second} ink={p.ink} />
      <Blob d="M260 470a60 60 0 1 1 120 0 60 60 0 1 1-120 0z" color={green ?? p.accent} ink={p.ink} />
      <Confetti width={400} height={460} count={34} p={p} />
      <path
        d="M40 600l20-20 20 20 20-20 20 20 20-20 20 20"
        stroke={p.paper}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Ornament({ palette: p }: ArtProps) {
  const palette = colors(p)
  return (
    <svg className="ornament" viewBox="0 0 220 44" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => (
        <path
          key={index}
          d={`M${20 + index * 18} 28l9-12 9 12`}
          stroke={palette[index % 4]}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

function Footer({ palette: p }: ArtProps) {
  const [red, blue, yellow] = colors(p)
  return (
    <svg className="footer-art" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <Blob d="M-20 80q100-50 210-6t230-14v90H-20z" color={blue ?? p.second} ink={p.ink} />
      <Blob d="M300 60a40 40 0 1 1 80 0 40 40 0 1 1-80 0z" color={yellow ?? p.second} ink={p.ink} />
      <Blob d="M30 50l30-34 30 34z" color={red ?? p.accent} ink={p.ink} />
    </svg>
  )
}

const dots = (p: Palette) =>
  svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><g opacity='0.5'><circle cx='14' cy='22' r='2.4' fill='${p.accent}'/><rect x='70' y='18' width='9' height='4' rx='1' fill='${p.second}' transform='rotate(30 74 20)'/><circle cx='96' cy='84' r='2' fill='#ffc83d'/><rect x='30' y='86' width='9' height='4' rx='1' fill='#1fae8b' transform='rotate(-25 34 88)'/></g></svg>`,
  )

export const kertas: ThemeArt = {
  Envelope,
  Hero,
  Ornament,
  Footer,
  pattern: dots,
  frame: 'paper',
  panel: 'block',
}
