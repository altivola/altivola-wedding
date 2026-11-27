import type { JSX } from 'react'
import type { Palette } from './palette'

// Illustrated stand-ins for photos. Previews show them until the couple uploads their own,
// so every theme looks finished without borrowing anyone's pictures.

const skin = '#e3b391'
const skinDeep = '#c98e6c'
const hair = '#2f2420'

type Art = (p: Palette) => JSX.Element

const sky = (p: Palette, id: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={p.dark ? p.deep : '#ffffff'} stopOpacity={p.dark ? 1 : 0.7} />
      <stop offset="1" stopColor={p.dark ? p.surface : p.paper} />
    </linearGradient>
  </defs>
)

const portrait =
  (kind: 'bride' | 'groom'): Art =>
  (p) => (
    <>
      {sky(p, `g-${kind}`)}
      <rect width="300" height="360" fill={`url(#g-${kind})`} />
      <circle cx="150" cy="150" r="118" fill={kind === 'bride' ? p.second : p.accent} opacity="0.18" />
      <path
        d={
          kind === 'bride'
            ? 'M40 360c6-70 40-108 110-112 70 4 104 42 110 112z'
            : 'M34 360c8-74 44-110 116-114 72 4 108 40 116 114z'
        }
        fill={kind === 'bride' ? p.accent : p.deep}
      />
      {kind === 'bride' ? (
        <path d="M118 252l32 46 32-46" fill="none" stroke={p.surface} strokeWidth="6" strokeLinecap="round" />
      ) : (
        <>
          <path d="M126 248l24 30 24-30" fill={p.surface} />
          <path d="M150 278v82" stroke={p.accent} strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" />
        </>
      )}
      <rect x="136" y="200" width="28" height="44" rx="12" fill={skinDeep} />
      <ellipse cx="150" cy="168" rx="44" ry="52" fill={skin} />
      {kind === 'bride' ? (
        <>
          <path d="M104 170c-6-50 20-78 46-78s52 28 46 78c-8-26-24-40-46-42-22 2-38 16-46 42z" fill={hair} />
          <circle cx="150" cy="96" r="24" fill={hair} />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <circle key={index} cx={190 + index * 3} cy={112 + index * 16} r="6" fill="#fffdf6" stroke={p.line} />
          ))}
        </>
      ) : (
        <>
          <path d="M108 160c0-36 18-56 42-56s42 20 42 56c-10-18-24-26-42-26s-32 8-42 26z" fill={hair} />
          <path d="M108 118c2-22 18-34 42-34s40 12 42 34z" fill="#1c1b1f" />
          <rect x="106" y="112" width="88" height="10" rx="4" fill="#1c1b1f" />
        </>
      )}
      <path d="M134 190q16 10 32 0" fill="none" stroke={skinDeep} strokeWidth="3" strokeLinecap="round" />
    </>
  )

const couple: Art = (p) => (
  <>
    {sky(p, 'g-couple')}
    <rect width="300" height="360" fill="url(#g-couple)" />
    <circle cx="210" cy="96" r="34" fill={p.second} opacity="0.75" />
    <path d="M0 290c60-40 120-46 170-20s90 30 130 6v84H0z" fill={p.accent} opacity="0.35" />
    <path d="M0 316c70-24 140-26 200-8s80 14 100 8v44H0z" fill={p.accent} opacity="0.6" />
    <g>
      <path d="M96 360c2-60 16-96 44-100 26 4 38 40 40 100z" fill={p.deep} />
      <circle cx="138" cy="226" r="24" fill={skin} />
      <path d="M114 222c0-20 10-30 24-30s24 10 24 30c-6-10-14-14-24-14s-18 4-24 14z" fill={hair} />
      <path d="M148 360c2-54 14-86 38-90 26 4 38 36 40 90z" fill={p.accent} />
      <circle cx="186" cy="240" r="22" fill={skin} />
      <path d="M162 244c-2-30 10-44 24-44s28 14 24 44c-4-14-12-22-24-22s-20 8-24 22z" fill={hair} />
      <circle cx="186" cy="198" r="12" fill={hair} />
      <path d="M150 300q14 10 26 0" stroke={skinDeep} strokeWidth="8" strokeLinecap="round" fill="none" />
    </g>
  </>
)

const umbrella: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? p.deep : '#dfe6ea'} />
    {Array.from({ length: 34 }, (_, index) => (
      <path
        key={index}
        d={`M${(index * 47) % 300} ${(index * 83) % 360}l-8 22`}
        stroke={p.dark ? p.muted : '#9fb0bb'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    ))}
    <path d="M60 170a90 80 0 0 1 180 0q-22-14-45 0-22-14-45 0-22-14-45 0-22-14-45 0z" fill={p.accent} />
    <path d="M150 170v120q0 14-12 14" stroke={p.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M100 360c0-50 10-84 26-88 16 4 22 38 22 88z" fill={p.deep} />
    <circle cx="124" cy="244" r="16" fill={skin} />
    <path d="M160 360c0-46 8-78 24-82 16 4 24 36 24 82z" fill={p.second} />
    <circle cx="184" cy="250" r="15" fill={skin} />
    <path d="M168 248c0-16 8-22 16-22s16 6 16 22c-4-8-10-10-16-10s-12 2-16 10z" fill={hair} />
    <ellipse cx="150" cy="352" rx="110" ry="8" fill={p.ink} opacity="0.12" />
  </>
)

const distance: Art = (p) => (
  <>
    <rect width="150" height="360" fill={p.dark ? p.surface : '#f7e3c4'} />
    <rect x="150" width="150" height="360" fill={p.dark ? '#0b0d25' : p.deep} />
    <circle cx="75" cy="130" r="38" fill={p.second} />
    {Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2
      return (
        <path
          key={index}
          d={`M${75 + Math.cos(angle) * 48} ${130 + Math.sin(angle) * 48}L${75 + Math.cos(angle) * 60} ${130 + Math.sin(angle) * 60}`}
          stroke={p.second}
          strokeWidth="5"
          strokeLinecap="round"
        />
      )
    })}
    <path d="M250 96a40 40 0 1 0 0 70 32 32 0 1 1 0-70z" fill="#f5edd6" />
    {[
      [190, 70],
      [270, 230],
      [200, 260],
      [280, 60],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#f5edd6" />
    ))}
    <path
      d="M75 220q75 70 150 0"
      stroke={p.accent}
      strokeWidth="4"
      strokeDasharray="4 10"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M150 272c-14-12-24-20-24-30a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 10-10 18-24 30z" fill={p.accent} />
  </>
)

const ring: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? p.surface : '#efe2cf'} />
    <rect y="240" width="300" height="120" fill={p.dark ? p.deep : '#c99c6e'} />
    <path d="M70 250l10-90h70l10 90z" fill="#f8f3ea" stroke={p.line} strokeWidth="3" />
    <path d="M82 176h66" stroke={p.second} strokeWidth="12" />
    <path d="M160 190q30 0 30 24t-30 24" fill="none" stroke="#f8f3ea" strokeWidth="9" />
    <rect x="186" y="214" width="64" height="40" rx="6" fill={p.accent} />
    <path d="M186 214l32-26 32 26z" fill={p.deep} />
    <circle cx="218" cy="210" r="13" fill="none" stroke="#f2c14e" strokeWidth="5" />
    <path d="M218 192l5-9M226 197l9-4M209 197l-8-5" stroke="#f2c14e" strokeWidth="3" strokeLinecap="round" />
  </>
)

const chairs: Art = (p) => (
  <>
    {sky(p, 'g-chairs')}
    <rect width="300" height="360" fill="url(#g-chairs)" />
    <circle cx="150" cy="200" r="70" fill={p.second} opacity="0.85" />
    <path d="M0 220c70-30 150-30 300 0v140H0z" fill={p.accent} opacity="0.5" />
    <path d="M0 260c80-20 180-20 300 0v100H0z" fill={p.deep} />
    {[96, 172].map((x) => (
      <g key={x} fill="none" stroke={p.dark ? p.ink : '#3a2a1c'} strokeWidth="6" strokeLinecap="round">
        <path d={`M${x} 250v-60h34v60M${x} 220h34M${x + 34} 250l8 26M${x} 250l-8 26`} />
      </g>
    ))}
  </>
)

const face =
  (prop: 'glasses' | 'hat' | 'mustache'): Art =>
  (p) => (
    <>
      <rect
        width="300"
        height="360"
        fill={prop === 'glasses' ? p.second : prop === 'hat' ? p.accent : p.deep}
        opacity="0.9"
      />
      {Array.from({ length: 14 }, (_, index) => (
        <rect
          key={index}
          x={(index * 61) % 290}
          y={(index * 97) % 340}
          width="10"
          height="5"
          rx="2"
          fill={index % 2 ? p.surface : p.ink}
          opacity="0.5"
          transform={`rotate(${index * 37} ${(index * 61) % 290} ${(index * 97) % 340})`}
        />
      ))}
      <path d="M60 360c4-60 36-92 90-96 54 4 86 36 90 96z" fill={p.surface} />
      <ellipse cx="150" cy="190" rx="62" ry="72" fill={skin} />
      <path d="M90 176c0-56 26-84 60-84s60 28 60 84c-12-26-32-40-60-40s-48 14-60 40z" fill={hair} />
      {prop === 'glasses' && (
        <g fill="#1d1d22">
          <path d="M100 186h40v20q-20 14-40 0zM160 186h40v20q-20 14-40 0z" />
          <path d="M138 190h24" stroke="#1d1d22" strokeWidth="5" />
        </g>
      )}
      {prop === 'hat' && <path d="M112 118l38-84 38 84z" fill={p.second} stroke={p.surface} strokeWidth="4" />}
      {prop === 'mustache' && <path d="M116 230q16-14 34-2 18-12 34 2-18 8-34 0-16 8-34 0z" fill="#1d1d22" />}
      <path d="M130 236q20 16 40 0" fill="none" stroke={skinDeep} strokeWidth="5" strokeLinecap="round" />
    </>
  )

const beach: Art = () => (
  <>
    <rect width="300" height="360" fill="#bfe0ea" />
    <circle cx="220" cy="100" r="36" fill="#f6c86a" />
    <rect y="220" width="300" height="60" fill="#5fa6c0" />
    <path d="M0 270q150-30 300 0v90H0z" fill="#efdcb4" />
    <path d="M86 300q-6-90 16-150" stroke="#7a5236" strokeWidth="10" fill="none" strokeLinecap="round" />
    <path
      d="M102 150q-40-20-70 6M102 150q30-34 70-18M102 150q-16-40-50-46M102 150q36 0 54 30"
      stroke="#3e7a4a"
      strokeWidth="14"
      fill="none"
      strokeLinecap="round"
    />
  </>
)

const candle: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? '#0b0d25' : '#3c2f2b'} />
    <circle cx="150" cy="150" r="90" fill="#f6c86a" opacity="0.18" />
    <rect y="250" width="300" height="110" fill={p.dark ? p.surface : '#6f5240'} />
    <rect x="132" y="170" width="36" height="84" rx="4" fill="#f8f1e2" />
    <path d="M150 168c-12-16-4-30 0-40 4 10 12 24 0 40z" fill="#f6c86a" />
    <path d="M196 250c0-30 8-56 30-62 22 6 30 32 30 62z" fill={p.accent} opacity="0.9" />
    {[0, 1, 2, 3, 4].map((index) => (
      <circle
        key={index}
        cx={206 + index * 10}
        cy={176 - (index % 2) * 12}
        r="9"
        fill={index % 2 ? '#f3c9c0' : '#fffdf6'}
      />
    ))}
  </>
)

const confetti: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? p.deep : '#fdf1dc'} />
    {Array.from({ length: 40 }, (_, index) => (
      <rect
        key={index}
        x={(index * 53) % 300}
        y={(index * 89) % 360}
        width="12"
        height="6"
        rx="2"
        fill={[p.accent, p.second, p.deep, '#7cc4a4'][index % 4]}
        transform={`rotate(${index * 41} ${(index * 53) % 300} ${(index * 89) % 360})`}
      />
    ))}
    <path d="M110 360c0-50 14-80 34-84 20 4 30 34 30 84z" fill={p.accent} />
    <circle cx="144" cy="252" r="20" fill={skin} />
    <path d="M124 270l-30-60M164 270l34-58" stroke={skin} strokeWidth="12" strokeLinecap="round" />
  </>
)

const filmCamera: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? p.surface : '#e7dccb'} />
    <circle cx="150" cy="170" r="110" fill={p.accent} opacity="0.16" />
    <rect x="70" y="130" width="160" height="104" rx="12" fill="#2a2a2e" />
    <rect x="86" y="112" width="44" height="22" rx="4" fill="#2a2a2e" />
    <circle cx="150" cy="182" r="38" fill="#4b4b52" stroke="#9a9aa3" strokeWidth="6" />
    <circle cx="150" cy="182" r="18" fill="#141418" />
    <circle cx="142" cy="174" r="6" fill="#ffffff" opacity="0.5" />
    <path d="M150 234v70M150 304l-40 46M150 304l40 46" stroke="#2a2a2e" strokeWidth="6" strokeLinecap="round" />
  </>
)

const flowers: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? p.surface : '#f6ede0'} />
    <path d="M150 360l-20-150M150 360l24-140M150 360l-56-120M150 360l60-126" stroke="#5c7d4f" strokeWidth="6" />
    {[
      [130, 200, p.accent],
      [176, 214, p.second],
      [94, 236, '#f3c9c0'],
      [212, 230, '#fffdf6'],
      [150, 172, '#f3c9c0'],
    ].map(([x, y, color]) => (
      <g key={`${x}`}>
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = (index / 5) * Math.PI * 2
          return (
            <circle
              key={index}
              cx={Number(x) + Math.cos(angle) * 14}
              cy={Number(y) + Math.sin(angle) * 14}
              r="13"
              fill={String(color)}
            />
          )
        })}
        <circle cx={Number(x)} cy={Number(y)} r="8" fill="#f2c14e" />
      </g>
    ))}
    <path d="M110 300h80l-12 60h-56z" fill={p.deep} opacity="0.85" />
  </>
)

const cake: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? p.deep : '#f3e7df'} />
    <rect y="300" width="300" height="60" fill={p.dark ? p.surface : '#d9c3ad'} />
    <rect x="70" y="230" width="160" height="70" rx="8" fill="#fffaf2" stroke={p.line} strokeWidth="3" />
    <rect x="92" y="170" width="116" height="60" rx="8" fill="#fffaf2" stroke={p.line} strokeWidth="3" />
    <rect x="114" y="120" width="72" height="50" rx="8" fill="#fffaf2" stroke={p.line} strokeWidth="3" />
    <path
      d="M70 250q20 14 40 0t40 0 40 0 40 0M92 188q19 12 38 0t39 0 39 0M114 136q18 10 36 0t36 0"
      fill="none"
      stroke={p.accent}
      strokeWidth="4"
    />
    <circle cx="150" cy="108" r="12" fill={p.second} />
  </>
)

const bicycle: Art = (p) => (
  <>
    {sky(p, 'g-bike')}
    <rect width="300" height="360" fill="url(#g-bike)" />
    <rect y="270" width="300" height="90" fill={p.accent} opacity="0.3" />
    <g fill="none" stroke={p.ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="90" cy="250" r="42" />
      <circle cx="214" cy="250" r="42" />
      <path d="M90 250l40-72h64l20 72M130 178l26 72 58-72M120 168h26M194 178l-8-24h22" />
    </g>
    <path d="M190 150q16-22 36-6-6 18-22 20" fill={p.second} />
  </>
)

const sunset: Art = (p) => (
  <>
    <rect width="300" height="360" fill={p.dark ? '#2b1f4a' : '#f8d9b4'} />
    <circle cx="150" cy="200" r="64" fill={p.accent} />
    <path d="M0 210q70-40 150-10t150-20v180H0z" fill={p.deep} opacity="0.7" />
    <path d="M0 260q80-30 160-4t140-14v118H0z" fill={p.deep} />
    {[0, 1, 2].map((index) => (
      <path
        key={index}
        d={`M${60 + index * 70} ${90 + (index % 2) * 20}q8-8 16 0q8-8 16 0`}
        stroke={p.ink}
        strokeWidth="3"
        fill="none"
      />
    ))}
  </>
)

const arts: Record<string, Art> = {
  bride: portrait('bride'),
  groom: portrait('groom'),
  thanks: couple,
  'story-1': umbrella,
  'story-2': distance,
  'story-3': ring,
  'story-4': chairs,
  'booth-1': face('glasses'),
  'booth-2': face('hat'),
  'booth-3': face('mustache'),
  'print-1': beach,
  'print-2': candle,
  'print-3': confetti,
  film: filmCamera,
  g1: couple,
  g2: flowers,
  g3: cake,
  g4: ring,
  g5: bicycle,
  g6: sunset,
}

export const sampleGallery = ['sample:g1', 'sample:g2', 'sample:g3', 'sample:g4', 'sample:g5', 'sample:g6']

export function SampleArt({ name, palette, className }: { name: string; palette: Palette; className?: string }) {
  const draw = arts[name.replace(/^sample:/, '')] ?? couple
  return (
    <svg
      className={className}
      viewBox="0 0 300 360"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Contoh foto"
    >
      {draw(palette)}
    </svg>
  )
}
