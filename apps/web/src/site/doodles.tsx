// Line drawings for the site. Ink strokes on paper with a few spots of brand colour.
const ink = '#1c1a16'
const terra = '#c8553d'
const kunyit = '#f2c14e'
const daun = '#b9d3a8'
const langit = '#3657d6'
const rose = '#f3c9c0'

const line = { stroke: ink, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function Sparkle({ x, y, s = 1, color = ink }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <path
      d={`M${x} ${y - 10 * s}q2 8 10 10q-8 2-10 10q-2-8-10-10q8-2 10-10z`}
      fill={color}
      stroke={ink}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  )
}

function Heart({ x, y, s = 1, fill = terra }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      d={`M${x} ${y + 14 * s}c-12-9-18-15-18-22a9 9 0 0 1 18-4 9 9 0 0 1 18 4c0 7-6 13-18 22z`}
      fill={fill}
      {...line}
    />
  )
}

function Confetti({
  seed,
  count,
  width,
  height,
  x = 0,
  y = 0,
}: {
  seed: number
  count: number
  width: number
  height: number
  x?: number
  y?: number
}) {
  const colors = [terra, kunyit, langit, daun, rose]
  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const px = x + ((index * 73 + seed * 31) % width)
        const py = y + ((index * 41 + seed * 17) % height)
        const kind = (index + seed) % 3
        return kind === 0 ? (
          <rect
            key={index}
            x={px}
            y={py}
            width="12"
            height="7"
            rx="1.5"
            fill={colors[index % 5]}
            stroke={ink}
            strokeWidth="2"
            transform={`rotate(${index * 37} ${px} ${py})`}
          />
        ) : kind === 1 ? (
          <circle key={index} cx={px} cy={py} r="4.5" fill={colors[(index + 2) % 5]} stroke={ink} strokeWidth="2" />
        ) : (
          <path
            key={index}
            d={`M${px} ${py}q6-8 12 0t12 0`}
            fill="none"
            stroke={ink}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )
      })}
    </g>
  )
}

export function HeroDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 560 520" role="img" aria-label="Amplop undangan terbuka dengan konfeti">
      <Confetti seed={3} count={34} width={540} height={220} x={10} y={0} />
      <g transform="rotate(-6 280 330)">
        <rect x="110" y="250" width="340" height="220" rx="14" fill="#fff" {...line} />
        <g transform="translate(0 -6)">
          <rect x="140" y="120" width="280" height="230" rx="10" fill="#fffaf0" {...line} />
          <path d="M175 160h210" {...line} strokeWidth={2} />
          <text
            x="280"
            y="215"
            textAnchor="middle"
            fontFamily="Shantell Sans Variable, sans-serif"
            fontWeight="800"
            fontSize="34"
            fill={ink}
          >
            kamu diundang!
          </text>
          <path d="M200 240q80 26 160 0" fill="none" {...line} strokeWidth={2.5} />
          <Heart x={280} y={262} s={1} fill={rose} />
          <path d="M190 312h60M310 312h60" {...line} strokeWidth={2} />
        </g>
        <path d="M110 264l170 120 170-120" fill="none" {...line} />
        <path d="M112 466l132-104M448 466l-132-104" {...line} />
        <path d="M110 264v-4a14 14 0 0 1 14-14h312a14 14 0 0 1 14 14v4" fill="none" {...line} />
        <circle cx="280" cy="386" r="26" fill={terra} {...line} />
        <path d="M268 386q12-14 24 0q-12 14-24 0z" fill="#fff" stroke={ink} strokeWidth="2" />
      </g>
      <Sparkle x={70} y={300} s={1.4} color={kunyit} />
      <Sparkle x={500} y={260} s={1.1} color={daun} />
      <Heart x={492} y={380} s={0.8} />
      <g transform="translate(40 380) rotate(-14)">
        <rect width="78" height="96" rx="6" fill="#fff" {...line} />
        <rect x="10" y="10" width="58" height="54" fill={langit} opacity="0.85" stroke={ink} strokeWidth="2" />
        <circle cx="39" cy="34" r="10" fill={kunyit} stroke={ink} strokeWidth="2" />
      </g>
    </svg>
  )
}

export function BoothDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 460" role="img" aria-label="Ponsel mencetak foto strip">
      <Confetti seed={7} count={22} width={500} height={420} x={10} y={20} />
      <g transform="rotate(-8 200 230)">
        <rect x="110" y="40" width="190" height="370" rx="30" fill="#fff" {...line} />
        <rect x="126" y="70" width="158" height="300" rx="14" fill={rose} stroke={ink} strokeWidth="2.5" />
        <path d="M180 56h50" {...line} />
        <circle cx="205" cy="170" r="42" fill="#fff" {...line} />
        <path d="M188 162h0M222 162h0" {...line} strokeWidth={6} />
        <path d="M188 186q17 14 34 0" fill="none" {...line} />
        <path d="M150 300h110" {...line} strokeWidth={2} />
        <circle cx="205" cy="336" r="16" fill={terra} {...line} />
      </g>
      <g transform="rotate(10 380 260)">
        <rect x="320" y="70" width="120" height="330" rx="6" fill="#fff" {...line} />
        {[0, 1, 2].map((index) => (
          <g key={index}>
            <rect
              x="334"
              y={86 + index * 96}
              width="92"
              height="82"
              fill={[kunyit, daun, langit][index]}
              stroke={ink}
              strokeWidth="2.5"
            />
            <circle cx="380" cy={120 + index * 96} r="14" fill="#fff" stroke={ink} strokeWidth="2.5" />
            <path d={`M362 ${160 + index * 96}q18-18 36 0`} fill="#fff" stroke={ink} strokeWidth="2.5" />
          </g>
        ))}
      </g>
      <Sparkle x={70} y={110} s={1.4} color={kunyit} />
      <Sparkle x={470} y={60} s={1} color={rose} />
    </svg>
  )
}

export function CameraDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 460" role="img" aria-label="Kamera sekali pakai dan foto cetak">
      <Confetti seed={11} count={20} width={500} height={420} x={10} y={20} />
      {[
        [300, 70, 12, kunyit],
        [350, 120, -6, daun],
        [250, 130, 4, langit],
      ].map(([x, y, angle, color]) => (
        <g key={String(x)} transform={`rotate(${angle} ${Number(x) + 70} ${Number(y) + 80})`}>
          <rect x={Number(x)} y={Number(y)} width="140" height="166" rx="4" fill="#fff" {...line} />
          <rect
            x={Number(x) + 12}
            y={Number(y) + 12}
            width="116"
            height="112"
            fill={String(color)}
            stroke={ink}
            strokeWidth="2.5"
          />
          <path
            d={`M${Number(x) + 12} ${Number(y) + 104}q30-30 58-6t58-14v40H${Number(x) + 12}z`}
            fill="#fff"
            stroke={ink}
            strokeWidth="2.5"
            opacity="0.85"
          />
        </g>
      ))}
      <g transform="rotate(-10 180 300)">
        <rect x="40" y="230" width="270" height="160" rx="22" fill={kunyit} {...line} />
        <rect x="40" y="300" width="270" height="40" fill="#fff" stroke={ink} strokeWidth="3" />
        <circle cx="200" cy="318" r="50" fill="#fff" {...line} />
        <circle cx="200" cy="318" r="30" fill="#2a2a2e" {...line} />
        <circle cx="190" cy="308" r="8" fill="#fff" />
        <rect x="62" y="250" width="58" height="34" rx="6" fill="#fff" {...line} />
        <rect x="250" y="248" width="38" height="24" rx="5" fill={ink} />
        <path d="M80 230v-16h40v16" fill="#fff" {...line} />
        <text x="96" y="372" fontFamily="DM Mono, monospace" fontSize="14" fill={ink}>
          24
        </text>
      </g>
      <Sparkle x={60} y={150} s={1.3} color={rose} />
      <Sparkle x={480} y={380} s={1.1} color={daun} />
    </svg>
  )
}

export function CheckInDoodle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 460"
      role="img"
      aria-label="Kode QR di ponsel tamu dipindai saat datang"
    >
      <Confetti seed={5} count={16} width={500} height={420} x={10} y={20} />
      <g transform="rotate(-6 180 240)">
        <rect x="80" y="40" width="200" height="380" rx="30" fill="#fff" {...line} />
        <rect x="96" y="70" width="168" height="310" rx="14" fill={daun} stroke={ink} strokeWidth="2.5" />
        <rect x="120" y="140" width="120" height="120" rx="8" fill="#fff" {...line} />
        {[0, 1, 2, 3, 4, 5].map((row) =>
          [0, 1, 2, 3, 4, 5].map((column) =>
            (row * 7 + column * 3) % 4 === 0 ||
            (row < 2 && column < 2) ||
            (row > 3 && column < 2) ||
            (row < 2 && column > 3) ? (
              <rect
                key={`${row}-${column}`}
                x={130 + column * 17}
                y={150 + row * 17}
                width="15"
                height="15"
                fill={ink}
              />
            ) : null,
          ),
        )}
        <path d="M126 300h108M146 324h68" {...line} strokeWidth={2.5} />
      </g>
      <g transform="rotate(8 380 250)">
        <rect x="300" y="150" width="170" height="210" rx="24" fill="#fff" {...line} />
        <circle cx="385" cy="235" r="52" fill={kunyit} {...line} />
        <path d="M360 236l18 18 32-36" fill="none" {...line} strokeWidth={5} />
        <path d="M340 310h90M356 334h58" {...line} strokeWidth={2.5} />
      </g>
      <Sparkle x={470} y={90} s={1.3} color={rose} />
    </svg>
  )
}

export function SquiggleUnderline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M4 14q20-12 40 0t40 0 40 0 40 0 40 0 40 0 40 0"
        fill="none"
        stroke={terra}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TileArt({ kind }: { kind: 'free' | 'camera' | 'themes' | 'booth' | 'events' }) {
  if (kind === 'free')
    return (
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <rect x="40" y="20" width="120" height="100" rx="10" fill="#fff" {...line} />
        <path d="M40 44h120" {...line} />
        <circle cx="54" cy="32" r="3" fill={ink} />
        <circle cx="66" cy="32" r="3" fill={ink} />
        <path d="M60 70h60M60 88h80M60 104h40" {...line} strokeWidth={2.5} />
        <Sparkle x={160} y={20} s={1.2} color={kunyit} />
      </svg>
    )
  if (kind === 'camera')
    return (
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <rect x="40" y="40" width="120" height="76" rx="14" fill="#fff" {...line} />
        <circle cx="100" cy="80" r="24" fill={ink} {...line} />
        <circle cx="94" cy="74" r="5" fill="#fff" />
        <rect x="52" y="50" width="26" height="16" rx="3" fill={kunyit} stroke={ink} strokeWidth="2" />
        <Sparkle x={160} y={30} s={1.1} color="#fff" />
      </svg>
    )
  if (kind === 'themes')
    return (
      <svg viewBox="0 0 200 140" aria-hidden="true">
        {[-14, 0, 14].map((angle, index) => (
          <g key={angle} transform={`rotate(${angle} 100 130)`}>
            <rect x="74" y="20" width="52" height="100" rx="10" fill={['#fff', rose, daun][index]} {...line} />
          </g>
        ))}
        <Heart x={100} y={56} s={0.8} />
      </svg>
    )
  if (kind === 'booth')
    return (
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <rect x="80" y="10" width="44" height="122" rx="3" fill="#fff" {...line} />
        {[0, 1, 2].map((index) => (
          <rect
            key={index}
            x="87"
            y={17 + index * 37}
            width="30"
            height="30"
            fill={[kunyit, rose, '#fff'][index]}
            stroke={ink}
            strokeWidth="2"
          />
        ))}
        <Sparkle x={48} y={40} s={1} color={kunyit} />
        <Sparkle x={152} y={100} s={0.9} color="#fff" />
      </svg>
    )
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <rect x="44" y="24" width="112" height="96" rx="12" fill="#fff" {...line} />
      <path d="M44 50h112M74 16v18M126 16v18" {...line} />
      <rect x="60" y="64" width="20" height="18" rx="3" fill={terra} stroke={ink} strokeWidth="2" />
      <path d="M92 73h44M64 98h70" {...line} strokeWidth={2.5} />
    </svg>
  )
}
