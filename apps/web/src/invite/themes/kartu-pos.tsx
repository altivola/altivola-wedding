import type { ReactNode } from 'react'
import type { Palette } from '../palette'
import { type ArtProps, svgUrl, type ThemeArt } from './types'

// Kartu Pos: an airmail envelope, stamps and postmarks.

function Stripes({ id, p }: { id: string; p: Palette }) {
  return (
    <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="24" height="24" fill={p.surface} />
      <rect width="8" height="24" fill={p.accent} />
      <rect x="12" width="8" height="24" fill={p.second} />
    </pattern>
  )
}

function Stamp({
  x,
  y,
  w,
  h,
  p,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  p: Palette
  children?: ReactNode
}) {
  const holes = []
  for (let px = x + 5; px < x + w; px += 9) holes.push([px, y], [px, y + h])
  for (let py = y + 5; py < y + h; py += 9) holes.push([x, py], [x + w, py])
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fffdf6" />
      {holes.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={p.paper} />
      ))}
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} fill={p.second} opacity="0.12" />
      {children}
    </g>
  )
}

function Postmark({ x, y, r, color, label }: { x: number; y: number; r: number; color: string; label: string }) {
  const id = `pm-${x}-${y}`
  return (
    <g opacity="0.75" fill="none" stroke={color}>
      <circle cx={x} cy={y} r={r} strokeWidth="2" />
      <circle cx={x} cy={y} r={r - 9} strokeWidth="1" />
      <defs>
        <path id={id} d={`M${x - r + 5} ${y}a${r - 5} ${r - 5} 0 1 1 ${2 * (r - 5)} 0`} />
      </defs>
      <text fontSize="8" fill={color} stroke="none" letterSpacing="2" fontFamily="DM Mono, monospace">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
      {[0, 1, 2].map((index) => (
        <path key={index} d={`M${x + r + 4} ${y - 10 + index * 10}q10 -6 20 0t20 0 20 0 20 0`} strokeWidth="2" />
      ))}
    </g>
  )
}

function Plane({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-12)`} fill={color}>
      <path d="M-20 0l40-3 6 3-6 3z" />
      <path d="M-2 -1l-10-16h6l14 15zM-2 1l-10 16h6l14-15zM-18 -1l-6-8h4l6 8zM-18 1l-6 8h4l6-8z" />
    </g>
  )
}

function Envelope({ palette: p }: ArtProps) {
  return (
    <svg className="env" viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <Stripes id="kp-air" p={p} />
      </defs>
      <rect x="10" y="60" width="300" height="172" rx="6" fill="url(#kp-air)" />
      <g className="env-card">
        <rect x="32" y="34" width="256" height="170" rx="4" fill="#fffdf6" />
        <path d="M160 50v130" stroke={p.line} strokeWidth="1.5" />
        {[0, 1, 2].map((index) => (
          <path key={index} d={`M178 ${120 + index * 22}h90`} stroke={p.line} strokeWidth="1.5" />
        ))}
        <Stamp x={228} y={48} w={44} h={52} p={p} />
      </g>
      <rect x="20" y="70" width="280" height="152" rx="2" fill={p.surface} />
      <g className="env-flap">
        <path d="M10 66a6 6 0 0 1 6-6h288a6 6 0 0 1 6 6L160 166z" fill="url(#kp-air)" />
        <path d="M24 70L160 154 296 70z" fill={p.surface} />
      </g>
      <rect x="36" y="186" width="72" height="22" rx="3" fill={p.second} />
      <text
        x="72"
        y="201"
        fontSize="10"
        fill="#fff"
        textAnchor="middle"
        fontFamily="DM Mono, monospace"
        letterSpacing="1.5"
      >
        POS UDARA
      </text>
      <Stamp x={240} y={170} w={48} h={56} p={p}>
        <circle cx="264" cy="190" r="9" fill={p.accent} />
        <path d="M248 216q16-20 32 0z" fill={p.second} />
      </Stamp>
      <Postmark x={214} y={194} r={24} color={p.ink} label="HARI BERSAMA" />
      <g className="env-seal">
        <circle cx="160" cy="164" r="17" fill={p.accent} />
        <path d="M160 174c-8-6-13-10-13-15a6 6 0 0 1 13-2 6 6 0 0 1 13 2c0 5-5 9-13 15z" fill="#fffdf6" />
      </g>
    </svg>
  )
}

function Hero({ palette: p }: ArtProps) {
  return (
    <svg className="hero-art" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <Stripes id="kp-hero" p={p} />
      </defs>
      <rect width="400" height="640" fill={p.paper} />
      <path d="M30 120q120-80 200 0t150 -20" stroke={p.second} strokeWidth="2" strokeDasharray="6 8" fill="none" />
      <Plane x={360} y={92} s={1.2} color={p.second} />
      <g transform="rotate(-3 200 330)">
        <rect x="26" y="170" width="348" height="330" rx="6" fill="#000" opacity="0.08" transform="translate(6 8)" />
        <rect x="26" y="170" width="348" height="330" rx="6" fill="url(#kp-hero)" />
        <rect x="36" y="180" width="328" height="310" rx="2" fill="#fffdf6" />
        <Stamp x={292} y={196} w={56} h={66} p={p}>
          <circle cx="320" cy="218" r="10" fill={p.accent} />
          <path d="M300 252q20-24 40 0z" fill={p.second} />
        </Stamp>
        <Postmark x={270} y={250} r={26} color={p.ink} label="HARI BERSAMA" />
      </g>
      <Stamp x={30} y={540} w={60} h={70} p={p}>
        <path d="M40 596q20-30 40 0z" fill="#7aa36a" />
        <circle cx="60" cy="566" r="8" fill="#f2c14e" />
      </Stamp>
      <g transform="rotate(8 330 570)">
        <Stamp x={300} y={530} w={64} h={74} p={p}>
          <path
            d="M318 590c-10-8-16-13-16-19a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 6-6 11-16 19z"
            fill={p.accent}
            transform="translate(14 -6)"
          />
        </Stamp>
      </g>
    </svg>
  )
}

function Ornament({ palette: p }: ArtProps) {
  return (
    <svg className="ornament" viewBox="0 0 220 44" aria-hidden="true">
      <path d="M14 30q40-30 80-6t60-4" stroke={p.second} strokeWidth="1.6" strokeDasharray="4 6" fill="none" />
      <Plane x={176} y={18} s={0.8} color={p.second} />
    </svg>
  )
}

function Footer({ palette: p }: ArtProps) {
  return (
    <svg className="footer-art" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <Stripes id="kp-foot" p={p} />
      </defs>
      <rect y="96" width="400" height="24" fill="url(#kp-foot)" />
      <Postmark x={110} y={50} r={26} color={p.ink} label="TERIMA KASIH" />
      <Plane x={320} y={40} s={1} color={p.second} />
    </svg>
  )
}

const lines = (p: Palette) =>
  svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><path d='M0 119.5h120' stroke='${p.line}' stroke-opacity='0.55'/></svg>`,
  )

export const kartuPos: ThemeArt = {
  Envelope,
  Hero,
  Ornament,
  Footer,
  pattern: lines,
  frame: 'stamp',
  panel: 'postcard',
}
