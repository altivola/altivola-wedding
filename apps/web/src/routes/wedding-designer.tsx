import type { InvitationMusic } from '@app/api/music'
import {
  customWeddingSections,
  defaultWeddingDesign,
  gardenCharacters,
  gardenMaps,
  type SectionStyle,
  type StudioSection,
  type WeddingDesign,
  type WeddingSection,
  weddingDecorations,
  weddingDividers,
  weddingFlows,
  weddingFrames,
  weddingSections,
} from '@app/api/wedding-design'
import { ArrowDown, ArrowUp, GripVertical, Move, X } from 'lucide-react'
import { type CSSProperties, lazy, type PointerEvent, type ReactNode, Suspense, useRef, useState } from 'react'
import { type CustomAudio, WeddingAudioPlayer } from './wedding-custom-audio'
import { WeddingDecoration, WeddingEventExtras, WeddingStoryExtras } from './wedding-custom-content'
import { ExperienceNav, ExperienceOpening, InvitationTown, ReplayOpening } from './wedding-experiences'
import { applyTemplate, type Theme, themes } from './wedding-gallery'
import { gardenCharacterNames, gardenMapNames } from './wedding-garden-options'
import { WeddingGarden } from './wedding-garden-view'
import { sectionTitles, studioLabels } from './wedding-inspector'
import { songDetails, useMusicPlayer } from './wedding-music'
import { WeddingSceneView } from './wedding-scene-view'
import { moveScene, sceneSurface, touchScene } from './wedding-scenography'
import { InvitationEnvelope, InvitationSchedule, KeepsakeGallery } from './wedding-template-features'

const CinemaInvitation = lazy(() =>
  import('./wedding-cinema-invitation').then(({ CinemaInvitation }) => ({ default: CinemaInvitation })),
)

function sectionLabel(design: WeddingDesign, section: StudioSection) {
  return design.sectionStyles?.[section]?.title?.trim() || studioLabels[section]
}

const placement = (number: number) => Math.min(100, Math.max(0, Math.round(number)))

type DesignProps = { design: WeddingDesign; onChange: (design: WeddingDesign) => void }

export function DesignControls({
  design,
  onChange,
  onEditSection,
}: DesignProps & { onEditSection: (section: WeddingSection) => void }) {
  const dragStart = useRef<{ source: WeddingSection; y: number } | null>(null)
  const [target, setTarget] = useState<WeddingSection | null>(null)

  const nextCustomSection = customWeddingSections.find((section) => !design.sections.includes(section))

  function addSection() {
    if (!nextCustomSection) return
    const sections = [...design.sections]
    sections.splice(sections.indexOf('rsvp'), 0, nextCustomSection)
    onChange({ ...design, sections })
    onEditSection(nextCustomSection)
  }

  function removeSection(section: WeddingSection) {
    const sectionStyles = { ...design.sectionStyles }
    delete sectionStyles[section]
    onChange({ ...design, sectionStyles, sections: design.sections.filter((item) => item !== section) })
  }

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
          Frame foto
          <select
            value={design.frame ?? 'plain'}
            onChange={(event) =>
              onChange({ ...design, frame: weddingFrames.find((value) => value === event.target.value) })
            }
          >
            <option value="plain">Tanpa frame</option>
            <option value="rounded">Sudut lengkung</option>
            <option value="double">Garis ganda</option>
          </select>
        </label>
        <label>
          Ornamen pembatas
          <select
            value={design.divider ?? 'plain'}
            onChange={(event) =>
              onChange({ ...design, divider: weddingDividers.find((value) => value === event.target.value) })
            }
          >
            <option value="plain">Tanpa ornamen</option>
            <option value="line">Garis tipis</option>
            <option value="diamond">Wajik</option>
          </select>
        </label>
        <label>
          Dekorasi bergerak
          <select
            value={design.decoration ?? 'plain'}
            onChange={(event) =>
              onChange({ ...design, decoration: weddingDecorations.find((value) => value === event.target.value) })
            }
          >
            <option value="plain">Mati</option>
            <option value="petals">Kelopak</option>
            <option value="stars">Bintang</option>
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
            onChange={(e) => {
              const flow = weddingFlows.find((value) => value === e.target.value)
              if (flow) onChange({ ...design, flow })
            }}
          >
            <option value="rooms">Jelajah ruang</option>
            <option value="chapters">Per bab</option>
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
      {(design.flow ?? 'rooms') === 'rooms' && (
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
          const label = sectionLabel(design, item)
          const custom = item.startsWith('custom-')
          return (
            <li key={item} data-wedding-section={item} data-drop-target={target === item} data-custom={custom}>
              <button
                className="design-grip"
                type="button"
                tabIndex={-1}
                aria-label={`Geser ${label}`}
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
              <button className="design-section-edit" type="button" onClick={() => onEditSection(item)}>
                {label}
              </button>
              <button
                type="button"
                disabled={!previous}
                aria-label={`Naikkan ${label}`}
                onClick={() => previous && reorder(item, previous)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                disabled={!next}
                aria-label={`Turunkan ${label}`}
                onClick={() => next && reorder(item, next)}
              >
                <ArrowDown size={16} />
              </button>
              {custom && (
                <button type="button" aria-label={`Hapus ${label}`} onClick={() => removeSection(item)}>
                  <X size={16} />
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <button type="button" className="design-add" disabled={!nextCustomSection} onClick={addSection}>
        Tambah bagian
      </button>
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
          Tampilkan {studioLabels[section].toLowerCase()}
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
      <button
        type="button"
        className="design-reset"
        onClick={() => {
          const { x, y, type, palette, cover, album, flow } = applyTemplate(
            defaultWeddingDesign,
            design.template ?? 'garden',
          )
          onChange({ ...design, x, y, type, palette, cover, album, flow })
        }}
      >
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
  music?: InvitationMusic
  customAudio?: CustomAudio & { src: string }
}

export function DesignedInvitation({
  content,
  recipient,
  editing,
  rsvp,
  rsvpSaved,
  photos = [],
  journey = false,
  muteMusic = false,
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
  photos?: { src: string; caption: string; cover: boolean; background?: boolean; profileBackground?: boolean }[]
  journey?: boolean
  muteMusic?: boolean
}) {
  const cover = useRef<HTMLDivElement>(null)
  const chapterHeading = useRef<HTMLElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const design = content.design ?? defaultWeddingDesign
  const uploadedAudio = editing || muteMusic ? undefined : content.customAudio
  const song = editing || muteMusic || uploadedAudio ? null : songDetails(content.music)
  const player = useMusicPlayer(true, song?.src)
  const soundControls = uploadedAudio ? (
    <WeddingAudioPlayer key={uploadedAudio.src} audio={uploadedAudio} src={uploadedAudio.src} />
  ) : (
    song && (
      <div className="invitation-soundtrack">
        <button type="button" aria-pressed={player.playing === song.src} onClick={() => void player.toggle(song.src)}>
          {player.playing === song.src ? 'Jeda musik' : 'Putar musik'}
        </button>
        <span>{song.title}</span>
        <a href={song.source} target="_blank" rel="noreferrer">
          {song.artist || 'Freesound'} · {song.kind === 'recording' ? song.license : 'CC0'}
        </a>
        {player.playing === song.src && (
          <label>
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={player.volume}
              onChange={(event) => player.changeVolume(event.target.valueAsNumber)}
            />
          </label>
        )}
        {player.unavailable && <span role="status">Musik belum bisa diputar.</span>}
      </div>
    )
  )
  const [exploring, setExploring] = useState(false)
  const [openingComplete, setOpeningComplete] = useState(false)
  const [room, setRoom] = useState<WeddingSection | 'cover'>('cover')
  const backgroundImage = photos.find((photo) => photo.background)?.src
  const profileBackground = photos.find((photo) => photo.profileBackground)?.src
  const albumPhotos = photos.filter((photo) => !photo.background && !photo.profileBackground)
  const coverImage =
    photos.find((photo) => photo.cover)?.src ?? backgroundImage ?? `/wedding/${themes[content.theme].image}.jpg`
  const extras = design.extras
  const hasStoryExtras = Boolean(
    extras?.quote?.trim() ||
      extras?.partners?.some(({ name, parents }) => name.trim() || parents.trim()) ||
      extras?.milestones?.some(({ title }) => title.trim()),
  )
  const available = design.sections.filter((section) => {
    if (editing) return true
    if (section === 'story') return Boolean(content.story || design.sectionStyles?.story?.lead || hasStoryExtras)
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
    if ((isChapters || isExhibit || isTown) && !editing) {
      requestAnimationFrame(() => {
        const target =
          next === 'cover' ? (isTown ? document.getElementById('wedding-town') : cover.current) : chapterHeading.current
        target?.focus()
      })
    }
  }
  const position = roomOrder.indexOf(activeRoom)
  const isJourney = journey && (editing ? (design.flow ?? 'rooms') === 'rooms' : content.design?.flow === 'rooms')
  const isChapters = journey && design.flow === 'chapters'
  const isEditorial = !isJourney && !isChapters && design.template === 'print'
  const isWeekend = !isJourney && !isChapters && design.template === 'weekend'
  const isKeepsake = !isJourney && !isChapters && design.template === 'keepsake'
  const isLetter = design.template === 'letter'
  const experience = !isJourney && !isChapters ? design.template : undefined
  const isExhibit = experience === 'exhibit'
  const isTown = experience === 'town' && !editing
  const scenicNav = experience === 'lantern' || experience === 'radio'
  const opening =
    experience === 'radio' || experience === 'darkroom' || experience === 'rain' || experience === 'puzzle'
      ? experience
      : undefined
  const paged = isJourney || isChapters || isExhibit || isTown
  const gardenPlaces = available.map((section) => ({
    id: section,
    label: sectionLabel(design, section),
    detail:
      design.sectionStyles?.[section]?.lead ||
      (section === 'story' ? content.story : section === 'note' ? design.note : undefined),
  }))
  if (isJourney && !editing && exploring)
    return (
      <WeddingGarden
        places={gardenPlaces}
        gardenMap={design.gardenMap}
        gardenCharacter={design.gardenCharacter}
        album={albumPhotos}
        event={{ date: content.date, venue: content.venue }}
        eventDetails={
          <>
            <InvitationSchedule items={design.schedule ?? []} />
            <WeddingEventExtras extras={extras} />
          </>
        }
        rsvp={rsvp}
        rsvpSaved={rsvpSaved}
        soundtrack={soundControls}
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
  function openInvitation() {
    setOpeningComplete(true)
    requestAnimationFrame(() => cover.current?.focus())
  }
  if (isLetter && !editing && !openingComplete) {
    return (
      <div className="invitation-opening">
        <InvitationEnvelope
          recipient={recipient}
          names={personalized(coverStyle?.title?.trim() || content.names)}
          onOpen={openInvitation}
        />
        {soundControls}
      </div>
    )
  }
  if (opening && !editing && !openingComplete) {
    return (
      <div className="invitation-opening">
        <ExperienceOpening
          theme={opening}
          names={personalized(coverStyle?.title?.trim() || content.names)}
          recipient={recipient}
          cover={coverImage}
          photos={albumPhotos.map(({ src }) => src)}
          onOpen={openInvitation}
          onTune={
            song
              ? () => {
                  void player.start(song.src)
                }
              : undefined
          }
        />
        {soundControls}
      </div>
    )
  }
  const label = (
    <>
      {coverStyle?.eyebrow && <p className="studio-eyebrow">{coverStyle.eyebrow}</p>}
      <p>{personalized(coverStyle?.lead?.trim() || 'Yth. {tamu}')}</p>
      <h2>{personalized(coverStyle?.title?.trim() || content.names)}</h2>
    </>
  )

  function renderSection(section: WeddingSection) {
    const style = design.sectionStyles?.[section]
    const title = style?.title?.trim() || sectionTitles[section]
    const scenery =
      experience === 'lantern' && !editing ? (albumPhotos[available.indexOf(section)]?.src ?? coverImage) : undefined
    return (
      <section
        className="designed-section studio-section"
        key={section}
        id={(isEditorial || isWeekend || isKeepsake || scenicNav) && !editing ? `bagian-${section}` : undefined}
        ref={(isChapters || isExhibit || isTown) && !editing ? chapterHeading : undefined}
        tabIndex={(isChapters || isExhibit || isTown) && !editing ? -1 : undefined}
        data-section={section}
        data-wedding-divider={design.divider}
        data-wedding-frame={design.frame}
        data-composition={style?.layout ?? 'stack'}
        data-studio-font={style?.font}
        data-inspected={editing?.section === section}
        data-scene-surface={design.template ? sceneSurface(content.theme, section) : undefined}
        data-reply={(section === 'rsvp' && rsvpSaved) || undefined}
        onPointerMove={editing ? undefined : moveScene}
        onPointerDown={editing ? undefined : touchScene}
        style={{
          ...sectionCss(style, design.sectionAlign?.[section] ?? 'center'),
          ...(scenery && !style?.surface
            ? {
                backgroundImage: `linear-gradient(#112820b3,#182720ea), url("${scenery}")`,
                color: style?.ink ?? '#fff7dd',
              }
            : {}),
        }}
        aria-label={sectionLabel(design, section)}
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
          {section === 'story' && (
            <>
              {(content.story || editing) && <p>{content.story || 'Tulis cerita pasangan di Studio.'}</p>}
              <WeddingStoryExtras extras={extras} backdrop={profileBackground} />
            </>
          )}
          {section === 'event' && (
            <>
              <p>{content.date || 'Tanggal acara'}</p>
              <p>{content.venue || 'Lokasi acara'}</p>
              {design.schedule && <InvitationSchedule items={design.schedule} />}
              <WeddingEventExtras extras={extras} />
            </>
          )}
          {section === 'album' &&
            (albumPhotos.length > 0 ? (
              <KeepsakeGallery photos={albumPhotos} layout={design.album} />
            ) : (
              editing && <p>Upload foto dari ruang Album.</p>
            ))}
          {section === 'note' && <p>{design.note}</p>}
          {section === 'rsvp' && rsvp}
        </div>
      </section>
    )
  }

  if (design.template === 'cinema' && !editing) {
    return (
      <Suspense fallback={<p role="status">Membuka bioskop…</p>}>
        <CinemaInvitation
          names={personalized(coverStyle?.title?.trim() || content.names)}
          recipient={personalized(coverStyle?.lead?.trim() || 'Untuk {tamu}')}
          frame={design.frame}
          decoration={design.decoration}
          date={content.date}
          venue={content.venue}
          eventTitle={design.sectionStyles?.event?.title?.trim() || 'Akad & Resepsi'}
          eventLead={design.sectionStyles?.event?.lead}
          rsvpTitle={design.sectionStyles?.rsvp?.title?.trim() || 'Konfirmasi hadir'}
          rsvpLead={design.sectionStyles?.rsvp?.lead}
          rsvp={rsvp}
          rsvpSaved={rsvpSaved}
          music={soundControls}
          story={content.story}
          photos={albumPhotos}
          leadPhoto={backgroundImage ?? albumPhotos.find((photo) => photo.cover)?.src ?? albumPhotos[0]?.src}
          sections={available
            .filter((section) => section !== 'rsvp')
            .map((section) => ({
              id: section,
              title: sectionLabel(design, section),
              details: renderSection(section),
              text: design.sectionStyles?.[section]?.lead || (section === 'note' ? design.note : undefined),
            }))}
        />
      </Suspense>
    )
  }

  return (
    <article
      className="wedding-card designed-invitation"
      data-theme={content.theme}
      data-template={design.template}
      data-chapters={isChapters}
      data-editorial={isEditorial}
      data-experience={experience}
      data-style={design.palette}
      data-type={design.type}
      data-accent={design.accent ?? 'gold'}
      data-journey={isJourney}
      data-scene-world={design.template && !editing ? content.theme : undefined}
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
      {soundControls}
      {opening && !editing && (
        <ReplayOpening
          onReplay={() => {
            setOpeningComplete(false)
            window.scrollTo(0, 0)
          }}
        />
      )}
      {(isExhibit || isTown) && (
        <ExperienceNav
          theme={isTown ? 'town' : 'exhibit'}
          stops={[{ id: 'cover', label: 'Pintu masuk' }, ...gardenPlaces]}
          active={activeRoom}
          onSelect={selectRoom}
        />
      )}
      {isJourney && (
        <nav className="guest-room-map" aria-label="Peta undangan">
          {!editing && (
            <button type="button" onClick={() => setExploring(true)}>
              Jelajah taman
            </button>
          )}
          {roomOrder.map((section) => (
            <button
              key={section}
              type="button"
              aria-current={section === activeRoom ? 'step' : undefined}
              onClick={() => selectRoom(section)}
            >
              {section === 'cover' ? 'Pintu masuk' : sectionLabel(design, section)}
            </button>
          ))}
        </nav>
      )}
      {isTown && <InvitationTown stops={gardenPlaces} onSelect={selectRoom} />}
      <div
        hidden={paged && activeRoom !== 'cover'}
        ref={cover}
        tabIndex={(isChapters || isLetter || isExhibit || opening) && !editing ? -1 : undefined}
        className="designed-cover"
        data-cover={design.cover}
        data-wedding-frame={design.frame}
        data-wedding-decoration={design.decoration}
        data-scene-surface={design.template ? sceneSurface(content.theme, 'cover') : undefined}
        onPointerMove={editing ? undefined : moveScene}
        onPointerDown={editing ? undefined : touchScene}
      >
        <img alt="" src={coverImage} />
        <WeddingDecoration choice={design.decoration} />
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
      {isKeepsake && !editing && albumPhotos.length > 0 && available.includes('album') && (
        <a className="keepsake-jump" href="#bagian-album">
          Buka album
        </a>
      )}
      {scenicNav && !editing && <ExperienceNav theme={experience} stops={gardenPlaces} onSelect={selectRoom} />}
      {(isEditorial || isWeekend) && !editing && (
        <nav className="invitation-contents" aria-label="Daftar isi">
          {available.map((section) => (
            <a key={section} href={`#bagian-${section}`}>
              {sectionLabel(design, section)}
            </a>
          ))}
        </nav>
      )}
      <div className="invitation-sections">
        {available.filter((section) => !paged || activeRoom === section).map(renderSection)}
      </div>
      {paged && !isExhibit && !isTown && (
        <footer className={isChapters ? 'invitation-chapter-actions' : 'guest-room-actions'}>
          {isChapters && (
            <p aria-live="polite">{position === 0 ? 'Sampul' : `Bab ${position} dari ${roomOrder.length - 1}`}</p>
          )}
          {position > 0 && (
            <button type="button" onClick={() => selectRoom(roomOrder[position - 1] ?? 'cover')}>
              Kembali
            </button>
          )}
          {position < roomOrder.length - 1 && (
            <button type="button" onClick={() => selectRoom(roomOrder[position + 1] ?? 'cover')}>
              {isChapters ? (position === 0 ? 'Buka undangan' : 'Bab berikutnya') : 'Lanjut jelajah'}
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
