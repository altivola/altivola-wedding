import type { StudioSection } from '@app/api/wedding-design'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Disc3, Droplets, Grid2X2, Radio, RotateCcw } from 'lucide-react'
import { type CSSProperties, type PointerEvent, useEffect, useState } from 'react'
import type { Theme } from './wedding-gallery'

export type Stop = { id: StudioSection; label: string }

export function RadioOpening({ onOpen, canPlay }: { onOpen: () => void; canPlay: boolean }) {
  const [dial, setDial] = useState(89)
  const tuned = Math.abs(dial - 96.7) < 0.3
  return (
    <div className="radio-console">
      <div className="radio-speaker" aria-hidden="true">
        <Radio size={32} />
        <i className="radio-knob" style={{ transform: `rotate(${(dial - 98) * 13}deg)` }} />
      </div>
      <div className="radio-receiver">
        <label htmlFor="wedding-dial">Cari siaran di 96.7 FM</label>
        <output aria-live="off">
          {dial.toFixed(1)} <small>MHz</small>
        </output>
        <input
          id="wedding-dial"
          type="range"
          min={88}
          max={108}
          step={0.1}
          value={dial}
          onChange={(event) => setDial(event.target.valueAsNumber)}
        />
        <p role="status">{tuned ? 'Siaran ditemukan' : 'Geser frekuensi untuk menemukan siaran.'}</p>
        <button type="button" disabled={!tuned} onClick={onOpen}>
          {canPlay ? 'Putar siaran dan buka' : 'Buka siaran'}
        </button>
      </div>
    </div>
  )
}

export function DarkroomOpening({ photos }: { photos: string[] }) {
  const [developed, setDeveloped] = useState(0)
  return (
    <div className="darkroom-lab">
      <div className="contact-sheet">
        {photos.map((photo, index) => (
          <figure key={photo} data-developed={index < developed}>
            <img src={photo} alt={index < developed ? `Foto yang dicetak ${index + 1}` : ''} />
          </figure>
        ))}
      </div>
      <div className="darkroom-controls">
        <Disc3 size={30} aria-hidden="true" />
        <p role="status">
          {developed} dari {photos.length} foto tercetak
        </p>
        <button type="button" disabled={developed === photos.length} onClick={() => setDeveloped(developed + 1)}>
          Cetak foto berikutnya
        </button>
      </div>
    </div>
  )
}

const droplets = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  left: ((index * 121) % 92) + 3,
  top: ((index * 37) % 88) + 4,
}))

export function RainOpening({ photo, onOpen }: { photo: string; onOpen: () => void }) {
  const [cleared, setCleared] = useState<number[]>([])
  function wipe(event: PointerEvent<HTMLDivElement>) {
    if (event.type === 'pointermove' && !event.currentTarget.hasPointerCapture(event.pointerId)) return
    if (event.type === 'pointerdown') event.currentTarget.setPointerCapture(event.pointerId)
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
    setCleared((previous) =>
      droplets
        .filter(
          ({ id, left: x, top: y }) =>
            previous.includes(id) ||
            Math.hypot(event.clientX - left - (width * x) / 100, event.clientY - top - (height * y) / 100) < 64,
        )
        .map(({ id }) => id),
    )
  }

  return (
    <div className="rain-panel">
      <div
        className="rain-window"
        style={{ '--cleared': cleared.length / droplets.length } as CSSProperties}
        onPointerDown={wipe}
        onPointerMove={wipe}
        aria-hidden="true"
      >
        <img src={photo} alt="" />
        {droplets
          .filter(({ id }) => !cleared.includes(id))
          .map(({ id, left, top }) => (
            <i key={id} style={{ left: `${left}%`, top: `${top}%` }} />
          ))}
      </div>
      <div className="rain-controls">
        <p>
          <Droplets size={18} aria-hidden="true" /> Usap tetes hujan dengan jari atau mouse.
        </p>
        <button
          type="button"
          onClick={() => {
            if (cleared.length >= 12) onOpen()
            else setCleared(droplets.map(({ id }) => id))
          }}
        >
          {cleared.length >= 12 ? 'Masuk dari teras' : 'Bersihkan jendela'}
        </button>
      </div>
    </div>
  )
}

const cabinet = [
  { id: 'a', shape: 'sun' },
  { id: 'b', shape: 'moon' },
  { id: 'c', shape: 'star' },
  { id: 'd', shape: 'moon' },
  { id: 'e', shape: 'star' },
  { id: 'f', shape: 'sun' },
] as const
const shapes = { sun: '☼', moon: '☾', star: '✦' }
const shapeNames = { sun: 'matahari', moon: 'bulan', star: 'bintang' }

export function PuzzleOpening() {
  const [matches, setMatches] = useState<string[]>([])
  const [picked, setPicked] = useState<(typeof cabinet)[number]>()
  const [missed, setMissed] = useState<string[]>([])
  const [result, setResult] = useState('Balik dua keping untuk mencari lambang yang sama.')

  function turn(tile: (typeof cabinet)[number]) {
    if (picked?.id === tile.id) return
    if (!picked) {
      setMissed([])
      setPicked(tile)
      return
    }
    if (picked.shape === tile.shape) {
      setMatches([...matches, picked.id, tile.id])
      setResult(matches.length === 4 ? 'Semua cocok. Kotak rahasia terbuka.' : 'Cocok! Cari pasangan berikutnya.')
    } else {
      setMissed([picked.id, tile.id])
      setResult('Belum cocok. Ingat lambangnya dan balik keping lain.')
    }
    setPicked(undefined)
  }

  return (
    <div className="keepsake-cabinet">
      <div className="cabinet-board">
        {cabinet.map((tile, index) => {
          const matched = matches.includes(tile.id)
          const visible = matched || picked?.id === tile.id || missed.includes(tile.id)
          return (
            <button
              type="button"
              key={tile.id}
              data-matched={matched}
              aria-label={`Keping ${index + 1}${visible ? `, ${shapeNames[tile.shape]}` : ''}`}
              aria-pressed={visible}
              disabled={matched}
              onClick={() => turn(tile)}
            >
              {visible ? shapes[tile.shape] : '✧'}
            </button>
          )
        })}
      </div>
      <p role="status">{result}</p>
    </div>
  )
}

const landmarks = [1, 3, 11, 13, 16]
const mapIcons = ['✦', '☀', '✿', '◆', '♥']
const streets = [...'xyxyxrrrrryxyxyrrrrrxyrxx'].map((terrain, index) => ({
  index,
  terrain,
  coordinates: `${index % 5},${Math.floor(index / 5)}`,
}))
const directions = {
  ArrowUp: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
} as const

export function InvitationTown({ stops, onSelect }: { stops: Stop[]; onSelect: (section: StudioSection) => void }) {
  const [position, setPosition] = useState(22)
  const buildings = [
    ...stops.filter(({ id }) => !id.startsWith('custom-')),
    ...stops.filter(({ id }) => id.startsWith('custom-')),
  ]
  const goal = buildings[landmarks.indexOf(position)]
  function walk([x, y]: readonly [number, number]) {
    setPosition(
      (point) => Math.max(0, Math.min(4, Math.floor(point / 5) + y)) * 5 + Math.max(0, Math.min(4, (point % 5) + x)),
    )
  }
  return (
    <section className="invitation-town" id="wedding-town" tabIndex={-1} aria-label="Peta Kota Undangan">
      <h3>Peta Kota Undangan</h3>
      <div className="town-board" aria-hidden="true">
        {streets.map(({ index, terrain, coordinates }) => {
          const stopIndex = landmarks.indexOf(index)
          const stop = buildings[stopIndex]
          return (
            <div key={coordinates} data-tile={terrain} data-station={Boolean(stop)}>
              {stop && <span aria-hidden="true">{mapIcons[stopIndex]}</span>}
              {position === index && <i className="town-player" />}
            </div>
          )
        })}
      </div>
      <div className="town-controls">
        <fieldset className="town-dpad">
          <legend className="sr-only">Gerakkan karakter. Gunakan tombol panah keyboard atau tombol di layar.</legend>
          {(
            [
              [ArrowUp, 'ArrowUp', 'Naik'],
              [ArrowLeft, 'ArrowLeft', 'Kiri'],
              [ArrowDown, 'ArrowDown', 'Turun'],
              [ArrowRight, 'ArrowRight', 'Kanan'],
            ] as const
          ).map(([Icon, key, label]) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              onClick={() => walk(directions[key])}
              onKeyDown={(event) => {
                const direction = directions[event.key as keyof typeof directions]
                if (direction) {
                  event.preventDefault()
                  walk(direction)
                }
              }}
            >
              <Icon size={19} />
            </button>
          ))}
        </fieldset>
        <p role="status">{goal ? `Sampai di ${goal.label}` : 'Jalan ke salah satu bangunan.'}</p>
        {goal && (
          <button className="town-enter" type="button" onClick={() => onSelect(goal.id)}>
            Masuk ke {goal.label}
          </button>
        )}
      </div>
    </section>
  )
}

export function ExperienceNav({
  theme,
  stops,
  active,
  onSelect,
}: {
  theme: Theme
  stops: Stop[]
  active?: StudioSection
  onSelect: (section: StudioSection) => void
}) {
  const [observed, setObserved] = useState<StudioSection>()
  useEffect(() => {
    if (theme !== 'lantern') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        const stop = stops.find(({ id }) => visible?.target.id === `bagian-${id}`)
        if (stop) setObserved(stop.id)
      },
      { rootMargin: '-28% 0px -39% 0px' },
    )
    for (const { id } of stops) {
      const node = document.getElementById(`bagian-${id}`)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [theme, stops])

  return (
    <nav className="experience-nav" aria-label={theme === 'exhibit' ? 'Denah ruang pamer' : 'Pintasan undangan'}>
      {stops.map(({ id, label }, index) =>
        theme === 'exhibit' || theme === 'town' ? (
          <button key={id} type="button" aria-current={id === active ? 'step' : undefined} onClick={() => onSelect(id)}>
            <Grid2X2 size={16} />
            {label}
          </button>
        ) : (
          <a key={id} aria-current={observed === id ? 'location' : undefined} href={`#bagian-${id}`}>
            {theme === 'lantern' && <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
            {label}
          </a>
        ),
      )}
    </nav>
  )
}

export function ExperienceOpening({
  theme,
  names,
  recipient,
  cover,
  photos,
  onOpen,
  onTune,
}: {
  theme: 'radio' | 'rain' | 'darkroom' | 'puzzle'
  names: string
  recipient: string
  cover: string
  photos: string[]
  onOpen: () => void
  onTune?: () => void
}) {
  const validPhotos = photos.length ? [...new Set(photos)].slice(0, 4) : [cover]
  return (
    <article className="experience-opening" data-experience={theme}>
      <header>
        <p>Untuk {recipient}</p>
        <h2>{names}</h2>
      </header>
      {theme === 'radio' && (
        <RadioOpening
          canPlay={Boolean(onTune)}
          onOpen={() => {
            onTune?.()
            onOpen()
          }}
        />
      )}
      {theme === 'darkroom' && <DarkroomOpening photos={validPhotos} />}
      {theme === 'rain' && <RainOpening photo={cover} onOpen={onOpen} />}
      {theme === 'puzzle' && <PuzzleOpening />}
      {theme !== 'radio' && (
        <button className="experience-skip" type="button" onClick={onOpen}>
          Buka detail undangan <ArrowRight size={17} />
        </button>
      )}
      {theme === 'radio' && (
        <button className="experience-skip" type="button" onClick={onOpen}>
          Langsung ke detail <ArrowRight size={17} />
        </button>
      )}
    </article>
  )
}

export function ReplayOpening({ onReplay }: { onReplay: () => void }) {
  return (
    <button className="experience-replay" type="button" onClick={onReplay}>
      <RotateCcw size={16} /> Ulangi pembuka
    </button>
  )
}
