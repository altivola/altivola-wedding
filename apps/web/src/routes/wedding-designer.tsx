import {
  defaultWeddingDesign,
  gardenCharacters,
  gardenMaps,
  type SectionStyle,
  type StudioSection,
  type WeddingDesign,
  type WeddingSection,
  weddingSections,
} from '@app/api/wedding-design'
import { ArrowDown, ArrowUp, GripVertical, Move } from 'lucide-react'
import { type CSSProperties, type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { type Theme, themes } from './wedding-gallery'
import { gardenCharacterNames, gardenMapNames } from './wedding-garden-options'
import { WeddingGarden } from './wedding-garden-view'
import { sectionTitles, studioLabels } from './wedding-inspector'
import { WeddingSceneView } from './wedding-scene-view'

const sectionLabels: Record<WeddingSection, string> = {
  story: 'Cerita pasangan',
  event: 'Jadwal dan lokasi',
  album: 'Album foto',
  note: 'Pesan tambahan',
  rsvp: 'RSVP',
}
const placement = (number: number) => Math.min(100, Math.max(0, Math.round(number)))

type DesignProps = { design: WeddingDesign; onChange: (design: WeddingDesign) => void }

export function DesignControls({ design, onChange }: DesignProps) {
  const dragStart = useRef<{ source: WeddingSection; y: number } | null>(null)
  const [target, setTarget] = useState<WeddingSection | null>(null)

  function reorder(source: WeddingSection, destination: WeddingSection) {
    if (source === destination) return
    const order = design.sections.filter((item) => item !== source)
    const index = design.sections.indexOf(destination)
    if (index < 0) return
    order.splice(index, 0, source)
    onChange({ ...design, sections: order })
  }

  function dropTarget(event: PointerEvent<HTMLButtonElement>) {
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-wedding-section]')
    return weddingSections.find((section) => section === row?.dataset.weddingSection)
  }

  return (
    <div className="design-controls">
      <h3>Komposisi</h3>
      <div className="design-layouts">
        {(
          [
            ['poster', 'Poster'],
            ['frame', 'Bingkai'],
            ['split', 'Terpisah'],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            data-layout={id}
            aria-pressed={design.cover === id}
            onClick={() => onChange({ ...design, cover: id })}
          >
            <span aria-hidden="true">
              <i />
              <b />
            </span>
            {label}
          </button>
        ))}
      </div>
      <div className="design-options">
        <label>
          Tipografi
          <select
            value={design.type}
            onChange={(e) => {
              const type = e.target.value
              if (type === 'serif' || type === 'sans' || type === 'italic') onChange({ ...design, type })
            }}
          >
            <option value="serif">Serif</option>
            <option value="sans">Sans</option>
            <option value="italic">Serif miring</option>
          </select>
        </label>
        <label>
          Palet
          <select
            value={design.palette}
            onChange={(e) => {
              const palette = e.target.value
              if (palette === 'template' || palette === 'cream' || palette === 'ink' || palette === 'rose') {
                onChange({ ...design, palette })
              }
            }}
          >
            <option value="template">Bawaan template</option>
            <option value="cream">Krem</option>
            <option value="ink">Biru malam</option>
            <option value="rose">Mawar</option>
          </select>
        </label>
        <label>
          Posisi horizontal
          <input type="range" value={design.x} onChange={(e) => onChange({ ...design, x: e.target.valueAsNumber })} />
        </label>
        <label>
          Posisi vertikal
          <input type="range" value={design.y} onChange={(e) => onChange({ ...design, y: e.target.valueAsNumber })} />
        </label>
      </div>
      <div className="design-options">
        <label>
          Alur tamu
          <select
            value={design.flow ?? 'rooms'}
            onChange={(e) => onChange({ ...design, flow: e.target.value === 'page' ? 'page' : 'rooms' })}
          >
            <option value="rooms">Jelajah ruang</option>
            <option value="page">Satu halaman</option>
          </select>
        </label>
        <label>
          Susunan album
          <select
            value={design.album ?? 'grid'}
            onChange={(e) => {
              const album = e.target.value
              if (album === 'grid' || album === 'filmstrip' || album === 'stack') onChange({ ...design, album })
            }}
          >
            <option value="grid">Kolase</option>
            <option value="filmstrip">Filmstrip</option>
            <option value="stack">Tumpukan</option>
          </select>
        </label>
        <label>
          Aksen ruang
          <select
            value={design.accent ?? 'gold'}
            onChange={(e) => {
              const accent = e.target.value
              if (accent === 'gold' || accent === 'lavender' || accent === 'fern') onChange({ ...design, accent })
            }}
          >
            <option value="gold">Emas</option>
            <option value="lavender">Lavender</option>
            <option value="fern">Pakis</option>
          </select>
        </label>
      </div>
      {design.flow !== 'page' && (
        <div className="design-options">
          <label>
            Peta taman
            <select
              value={design.gardenMap ?? 'twilight'}
              onChange={(event) => {
                const picked = gardenMaps.find((item) => item === event.target.value)
                if (picked) onChange({ ...design, gardenMap: picked })
              }}
            >
              {gardenMaps.map((item) => (
                <option key={item} value={item}>
                  {gardenMapNames[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Karakter awal
            <select
              value={design.gardenCharacter ?? 'lantern'}
              onChange={(event) => {
                const picked = gardenCharacters.find((item) => item === event.target.value)
                if (picked) onChange({ ...design, gardenCharacter: picked })
              }}
            >
              {gardenCharacters.map((item) => (
                <option key={item} value={item}>
                  {gardenCharacterNames[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <h3>Urutan undangan</h3>
      <p>Tarik bagian untuk pindah urutan, atau gunakan tombol naik dan turun.</p>
      <ol className="design-order">
        {design.sections.map((item, index) => {
          const previous = design.sections[index - 1]
          const next = design.sections[index + 1]
          return (
            <li key={item} data-wedding-section={item} data-drop-target={target === item}>
              <button
                className="design-grip"
                type="button"
                tabIndex={-1}
                aria-label={`Geser ${sectionLabels[item]}`}
                onPointerDown={(event) => {
                  if (!event.isPrimary || event.button !== 0) return
                  dragStart.current = { source: item, y: event.clientY }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (dragStart.current && Math.abs(event.clientY - dragStart.current.y) > 7) {
                    setTarget(dropTarget(event) ?? null)
                  }
                }}
                onPointerUp={(event) => {
                  const drag = dragStart.current
                  const destination = dropTarget(event)
                  dragStart.current = null
                  setTarget(null)
                  if (drag && destination && Math.abs(event.clientY - drag.y) > 7) reorder(drag.source, destination)
                }}
                onPointerCancel={() => {
                  dragStart.current = null
                  setTarget(null)
                }}
              >
                <GripVertical size={18} />
              </button>
              <span>{sectionLabels[item]}</span>
              <button
                type="button"
                disabled={!previous}
                aria-label={`Naikkan ${sectionLabels[item]}`}
                onClick={() => previous && reorder(item, previous)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                disabled={!next}
                aria-label={`Turunkan ${sectionLabels[item]}`}
                onClick={() => next && reorder(item, next)}
              >
                <ArrowDown size={16} />
              </button>
            </li>
          )
        })}
      </ol>
      {(['story', 'album', 'note'] as const).map((section) => (
        <label className="design-toggle" key={section}>
          <input
            type="checkbox"
            checked={design.sections.includes(section)}
            onChange={(e) => {
              const sections = e.target.checked
                ? [...design.sections, section]
                : design.sections.filter((item) => item !== section)
              onChange({ ...design, sections })
            }}
          />
          Tampilkan {sectionLabels[section].toLowerCase()}
        </label>
      ))}
      {design.sections.includes('note') && (
        <label>
          Pesan tambahan
          <textarea
            maxLength={2000}
            value={design.note}
            onChange={(e) => onChange({ ...design, note: e.target.value })}
          />
        </label>
      )}
      <button type="button" className="design-reset" onClick={() => onChange(defaultWeddingDesign)}>
        Reset komposisi
      </button>
    </div>
  )
}

type DesignedContent = {
  theme: Theme
  names: string
  date: string
  venue: string
  story: string
  design?: WeddingDesign
}

export function DesignedInvitation({
  content,
  recipient,
  editing,
  rsvp,
  rsvpSaved,
  photos = [],
  journey = false,
}: {
  content: DesignedContent
  recipient: string
  editing?: DesignProps & {
    section?: StudioSection
    onSelect?: (next: StudioSection) => void
    onInspect?: (next: StudioSection) => void
  }
  rsvp: ReactNode
  rsvpSaved?: boolean
  photos?: { src: string; caption: string; cover: boolean; background?: boolean }[]
  journey?: boolean
}) {
  const cover = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const design = content.design ?? defaultWeddingDesign
  const [exploring, setExploring] = useState(false)
  const [room, setRoom] = useState<WeddingSection | 'cover'>('cover')
  const backgroundImage = photos.find((photo) => photo.background)?.src
  const albumPhotos = photos.filter((photo) => !photo.background)
  const coverImage =
    photos.find((photo) => photo.cover)?.src ?? backgroundImage ?? `/wedding/${themes[content.theme].image}.jpg`
  const available = design.sections.filter((section) => {
    if (editing) return true
    if (section === 'story') return Boolean(content.story || design.sectionStyles?.story?.lead)
    if (section === 'note') return Boolean(design.note.trim() || design.sectionStyles?.note?.lead)
    if (section === 'album') return albumPhotos.length > 0
    return true
  })
  const roomOrder = ['cover', ...available] as const
  const currentRoom = editing?.section ?? room
  const activeRoom = roomOrder.includes(currentRoom) ? currentRoom : 'cover'
  function selectRoom(next: StudioSection) {
    setRoom(next)
    editing?.onSelect?.(next)
  }
  const position = roomOrder.indexOf(activeRoom)
  const isJourney = journey && (editing ? design.flow !== 'page' : content.design?.flow === 'rooms')
  const gardenPlaces = available.map((section) => ({
    id: section,
    label: design.sectionStyles?.[section]?.title?.trim() || sectionLabels[section],
  }))
  if (isJourney && exploring)
    return (
      <WeddingGarden
        places={gardenPlaces}
        gardenMap={design.gardenMap}
        gardenCharacter={design.gardenCharacter}
        album={albumPhotos}
        event={{ date: content.date, venue: content.venue }}
        rsvp={rsvp}
        rsvpSaved={rsvpSaved}
        onExit={() => setExploring(false)}
        onVisit={(id) => {
          const room = available.find((section) => section === id)
          if (room) {
            setRoom(room)
            setExploring(false)
          }
        }}
      />
    )
  const coverStyle = design.sectionStyles?.cover
  const personalized = (value: string) => value.replaceAll('{tamu}', recipient)
  const label = (
    <>
      {coverStyle?.eyebrow && <p className="studio-eyebrow">{coverStyle.eyebrow}</p>}
      <p>{personalized(coverStyle?.lead?.trim() || 'Yth. {tamu}')}</p>
      <h2>{personalized(coverStyle?.title?.trim() || content.names)}</h2>
    </>
  )

  return (
    <article
      className="wedding-card designed-invitation"
      data-theme={content.theme}
      data-style={design.palette}
      data-type={design.type}
      data-accent={design.accent ?? 'gold'}
      data-journey={isJourney}
      data-custom-background={Boolean(backgroundImage)}
      style={
        backgroundImage
          ? {
              backgroundImage: `linear-gradient(#17182d36,#17182d36), url("${backgroundImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {isJourney && !editing && (
        <WeddingSceneView
          image={coverImage}
          theme={content.theme}
          room={
            activeRoom === 'album'
              ? 'album'
              : activeRoom === 'rsvp'
                ? 'send'
                : activeRoom === 'story'
                  ? 'studio'
                  : 'gallery'
          }
          chapter={
            activeRoom === 'cover' ? 'Sampul' : activeRoom === 'album' || activeRoom === 'story' ? 'Album' : 'Acara'
          }
        />
      )}
      {isJourney && (
        <nav className="guest-room-map" aria-label="Peta undangan">
          <button type="button" onClick={() => setExploring(true)}>
            Jelajah taman
          </button>
          {roomOrder.map((section) => (
            <button
              key={section}
              type="button"
              aria-current={section === activeRoom ? 'step' : undefined}
              onClick={() => selectRoom(section)}
            >
              {section === 'cover' ? 'Pintu masuk' : sectionLabels[section]}
            </button>
          ))}
        </nav>
      )}
      <div
        hidden={isJourney && activeRoom !== 'cover'}
        ref={cover}
        className="designed-cover"
        data-cover={design.cover}
      >
        <img alt="" src={coverImage} />
        <div className="design-plane">
          <div
            className="designed-label"
            data-studio-font={coverStyle?.font}
            style={{
              ...sectionCss(coverStyle, 'center'),
              left: `${design.x}%`,
              top: `${design.y}%`,
              transform: `translate(-${design.x}%, -${design.y}%)`,
            }}
          >
            {editing && (
              <button
                type="button"
                className="design-move"
                aria-label="Geser posisi teks sampul"
                onPointerDown={(event) => {
                  if (!event.isPrimary || event.button !== 0) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  drag.current = { x: design.x, y: design.y, left: event.clientX, top: event.clientY }
                }}
                onPointerMove={(event) => {
                  const bounds = cover.current?.querySelector('.design-plane')?.getBoundingClientRect()
                  if (!drag.current || !bounds) return
                  editing.onChange({
                    ...design,
                    x: placement(drag.current.x + ((event.clientX - drag.current.left) * 100) / bounds.width),
                    y: placement(drag.current.y + ((event.clientY - drag.current.top) * 100) / bounds.height),
                  })
                }}
                onLostPointerCapture={() => {
                  drag.current = null
                }}
                onKeyDown={(event) => {
                  const shifts: Record<string, [number, number]> = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  }
                  const shift = shifts[event.key]
                  if (!shift) return
                  event.preventDefault()
                  const step = event.shiftKey ? 10 : 2
                  editing.onChange({
                    ...design,
                    x: placement(design.x + shift[0] * step),
                    y: placement(design.y + shift[1] * step),
                  })
                }}
              >
                <Move size={17} />
              </button>
            )}
            {editing?.onInspect && (
              <button className="studio-select-overlay" type="button" onClick={() => editing.onInspect?.('cover')}>
                Edit sampul
              </button>
            )}
            {label}
          </div>
        </div>
      </div>
      {available.map((section) => {
        if (isJourney && activeRoom !== section) return null
        const style = design.sectionStyles?.[section]
        const title = style?.title?.trim() || sectionTitles[section]
        return (
          <section
            className="designed-section studio-section"
            key={section}
            data-section={section}
            data-composition={style?.layout ?? 'stack'}
            data-studio-font={style?.font}
            data-inspected={editing?.section === section}
            style={sectionCss(style, design.sectionAlign?.[section] ?? 'center')}
            aria-label={sectionLabels[section]}
          >
            {editing?.onInspect && (
              <button className="studio-select-overlay" type="button" onClick={() => editing.onInspect?.(section)}>
                Edit {studioLabels[section].toLowerCase()}
              </button>
            )}
            {(style?.eyebrow || title || style?.lead) && (
              <div className="studio-section-heading">
                {style?.eyebrow && <p className="studio-eyebrow">{style.eyebrow}</p>}
                {title && <h3>{title}</h3>}
                {style?.lead && <p>{style.lead}</p>}
              </div>
            )}
            <div className="studio-section-body">
              {section === 'story' && <p>{content.story || (editing ? 'Tulis cerita pasangan di Studio.' : '')}</p>}
              {section === 'event' && (
                <>
                  <p>{content.date || 'Tanggal acara'}</p>
                  <p>{content.venue || 'Lokasi acara'}</p>
                </>
              )}
              {section === 'album' && (
                <div className="guest-photo-gallery" data-layout={design.album ?? 'grid'}>
                  {albumPhotos.map((photo) => (
                    <figure key={photo.src}>
                      <img src={photo.src} alt={photo.caption || 'Foto pasangan'} loading="lazy" />
                      {photo.caption && <figcaption>{photo.caption}</figcaption>}
                    </figure>
                  ))}
                  {editing && !albumPhotos.length && <p>Upload foto dari ruang Album.</p>}
                </div>
              )}
              {section === 'note' && <p>{design.note}</p>}
              {section === 'rsvp' && rsvp}
            </div>
          </section>
        )
      })}
      {isJourney && (
        <footer className="guest-room-actions">
          {position > 0 && (
            <button type="button" onClick={() => selectRoom(roomOrder[position - 1] ?? 'cover')}>
              Kembali
            </button>
          )}
          {position < roomOrder.length - 1 && (
            <button type="button" onClick={() => selectRoom(roomOrder[position + 1] ?? 'cover')}>
              Lanjut jelajah
            </button>
          )}
        </footer>
      )}
    </article>
  )
}

function sectionCss(style: SectionStyle | undefined, fallback: 'center' | 'left') {
  return {
    '--section-align': style?.align ?? fallback,
    '--section-mobile-align': style?.mobileAlign ?? style?.align ?? fallback,
    backgroundColor: style?.surface,
    color: style?.ink,
    padding: style?.spacing,
    '--section-scale': (style?.titleScale ?? 100) / 100,
  } as CSSProperties
}
