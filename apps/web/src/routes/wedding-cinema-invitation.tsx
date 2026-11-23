import type { WeddingSection } from '@app/api/wedding-design'
import { ArrowRight, Bell, Film, MapPin, ScanLine, Ticket, Volume2, VolumeX } from 'lucide-react'
import { type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createCinemaAmbience } from './wedding-cinema-ambience'
import { buildCinemaFrame, type CinemaFrame } from './wedding-cinema-film'
import { type CinemaRoom, mountCinema } from './wedding-cinema-renderer'
import { createGardenAudio } from './wedding-garden-audio'
import './wedding-cinema.css'

const rooms = {
  street: 'Jalan',
  lobby: 'Lobi',
  auditorium: 'Auditorium',
} satisfies Record<CinemaRoom, string>

type CinemaProps = {
  names: string
  recipient: string
  date: string
  venue: string
  eventTitle: string
  eventLead?: string
  rsvpTitle: string
  rsvpLead?: string
  rsvp: ReactNode
  rsvpSaved?: boolean
  music: ReactNode
  story: string
  photos: { src: string; caption: string }[]
  leadPhoto?: string
  sections: { id: WeddingSection; title: string; details: ReactNode; text?: string }[]
}

export function CinemaInvitation({
  names,
  recipient,
  date,
  venue,
  eventTitle,
  eventLead,
  rsvpTitle,
  rsvpLead,
  rsvp,
  rsvpSaved,
  music,
  story,
  photos,
  leadPhoto,
  sections,
}: CinemaProps) {
  const [room, setRoom] = useState<CinemaRoom>('street')
  const [webgl, setWebgl] = useState(false)
  const [effects, setEffects] = useState(false)
  const [reel, setReel] = useState(0)
  const [replyOpen, setReplyOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<WeddingSection>()
  const viewport = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const art = useRef<ReturnType<typeof mountCinema>>(null)
  const sound = useRef<ReturnType<typeof createGardenAudio>>(null)
  const audioEnabled = useRef(false)
  const ambience = useRef<ReturnType<typeof createCinemaAmbience>>(null)
  const touched = useRef<{ x: number; y: number; last: number }>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const surface = canvas.current
    if (!surface) return
    const scene = mountCinema(
      surface,
      () => setWebgl(true),
      (x, y) => {
        const style = viewport.current?.style
        style?.setProperty('--cinema-sign-x', `${(x * 100).toFixed(2)}%`)
        style?.setProperty('--cinema-sign-y', `${(y * 100).toFixed(2)}%`)
      },
      (rectangle) => {
        const style = viewport.current?.style
        if (!style) return
        style.setProperty('--surface-left', `${(rectangle.x * 100).toFixed(2)}%`)
        style.setProperty('--surface-top', `${(rectangle.y * 100).toFixed(2)}%`)
        style.setProperty('--surface-width', `${(rectangle.width * 100).toFixed(2)}%`)
        style.setProperty('--surface-height', `${(rectangle.height * 100).toFixed(2)}%`)
      },
    )
    art.current = scene
    const lost = (event: Event) => {
      event.preventDefault()
      scene?.dispose()
      art.current = null
      setWebgl(false)
    }
    surface.addEventListener('webglcontextlost', lost)
    return () => {
      surface.removeEventListener('webglcontextlost', lost)
      if (art.current) scene?.dispose()
      art.current = null
      const audio = sound.current
      audioEnabled.current = false
      ambience.current = null
      sound.current = null
      if (audio) void audio.context.close().catch(() => {})
    }
  }, [])

  const frames = useMemo<[CinemaFrame, ...CinemaFrame[]]>(() => {
    const opening: CinemaFrame = { title: names, lines: [date, venue], photo: leadPhoto }
    const material = sections.flatMap((section): CinemaFrame[] => {
      if (section.id === 'story' && story) return [{ title: section.title, lines: [story] }]
      if (section.id === 'album')
        return photos
          .filter(({ src }) => src !== leadPhoto)
          .map(({ src, caption }) => ({
            title: caption || section.title,
            lines: [],
            photo: src,
          }))
      if (section.id === 'event') return [{ title: eventTitle, lines: [date, venue] }]
      return section.text ? [{ title: section.title, lines: [section.text] }] : []
    })
    if (rsvpSaved) material.push({ title: 'Terima kasih', lines: ['Jawabanmu sudah tercatat.'] })
    return [opening, ...material]
  }, [date, eventTitle, leadPhoto, names, photos, rsvpSaved, sections, story, venue])
  const projected = frames[reel % frames.length] ?? frames[0]
  const lobbyPoster = useMemo<CinemaFrame>(
    () => ({ title: names, lines: [eventTitle, date, venue] }),
    [date, eventTitle, names, venue],
  )

  useEffect(() => {
    if (room === 'street' || !art.current) return
    return buildCinemaFrame(room === 'lobby' ? lobbyPoster : projected, room === 'lobby', (frame, firstDraw) => {
      art.current?.project(frame, firstDraw && room === 'auditorium')
    })
  }, [lobbyPoster, projected, room])

  function changeReel() {
    setReel((current) => (current + 1) % frames.length)
  }

  function ringBell() {
    setReplyOpen(true)
    requestAnimationFrame(() => title.current?.focus({ preventScroll: true }))
  }

  function openProgram(id: WeddingSection) {
    setActiveSection(id)
    dialog.current?.showModal()
  }

  function point(event: PointerEvent<HTMLDivElement>) {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - left) / width)),
      y: Math.max(0, Math.min(1, (event.clientY - top) / height)),
    }
  }

  function look(x: number, y: number) {
    art.current?.look(x, y)
    const styles = viewport.current?.style
    styles?.setProperty('--look-x', `${x * 100}%`)
    styles?.setProperty('--look-y', `${y * 100}%`)
    styles?.setProperty('--pan-x', `${(0.5 - x) * 25}px`)
    styles?.setProperty('--pan-y', `${(0.5 - y) * 17}px`)
  }

  function impact(x: number, y: number) {
    const response = art.current?.tap(x, y) ?? (room === 'street' && y > 0.66 ? 'water' : 'light')
    const root = viewport.current
    if (!root) return
    const ripple = document.createElement('i')
    ripple.setAttribute('aria-hidden', 'true')
    ripple.className = `cinema-impact cinema-impact--${response}`
    ripple.style.left = `${x * 100}%`
    ripple.style.top = `${y * 100}%`
    root.append(ripple)
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    if (audioEnabled.current && response === 'water') sound.current?.play('splash')
  }

  function visit(next: CinemaRoom) {
    if (room === next) return
    setRoom(next)
    art.current?.visit(next)
    ambience.current?.(next)
    if (next === 'auditorium') setReplyOpen(false)
    viewport.current?.querySelectorAll('.cinema-impact').forEach((item) => {
      item.remove()
    })
    requestAnimationFrame(() => title.current?.focus({ preventScroll: true }))
  }

  async function toggleEffects() {
    if (typeof AudioContext === 'undefined') return
    try {
      const audio = sound.current ?? createGardenAudio()
      sound.current = audio
      const enabled = !audioEnabled.current
      audioEnabled.current = enabled
      if (enabled) await audio.context.resume()
      else await audio.context.suspend()
      if (sound.current === audio) {
        setEffects(enabled)
        if (enabled) {
          ambience.current ??= createCinemaAmbience(audio.context)
          ambience.current(room)
        }
      }
    } catch {
      audioEnabled.current = false
      setEffects(false)
    }
  }

  const selected = sections.find(({ id }) => id === activeSection)

  return (
    <article ref={viewport} className="cinema-invitation" data-room={room} data-renderer={webgl ? 'webgl' : 'fallback'}>
      <div className="cinema-plate" aria-hidden="true" />
      <canvas ref={canvas} className="cinema-canvas" />
      <div className="cinema-shade" aria-hidden="true" />
      <div
        className="cinema-hand"
        aria-hidden="true"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          const { x, y } = point(event)
          look(x, y)
          impact(x, y)
          const hotspot = art.current?.hotspot(x, y)
          if (hotspot === 'bell') ringBell()
          if (hotspot === 'booth') visit('lobby')
          touched.current = { x, y, last: performance.now() }
        }}
        onPointerMove={(event) => {
          if (!event.isPrimary) return
          const { x, y } = point(event)
          look(x, y)
          event.currentTarget.style.cursor = art.current?.hotspot(x, y) ? 'pointer' : ''
          const previous = touched.current
          const now = performance.now()
          if (previous && now - previous.last > 115 && Math.hypot(x - previous.x, y - previous.y) > 0.034) {
            impact(x, y)
            touched.current = { x, y, last: now }
          }
        }}
        onLostPointerCapture={() => {
          touched.current = null
        }}
      />
      <div className="cinema-hud">
        <nav className="cinema-places" aria-label="Ruang bioskop">
          {(Object.keys(rooms) as CinemaRoom[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-current={room === item ? 'location' : undefined}
              onClick={() => visit(item)}
            >
              {rooms[item]}
            </button>
          ))}
        </nav>
        <button
          className="cinema-audio"
          type="button"
          aria-label="Efek suara bioskop"
          aria-pressed={effects}
          onClick={() => void toggleEffects()}
        >
          {effects ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
        </button>
      </div>
      {room === 'street' && (
        <h2 className="cinema-marquee" ref={title} tabIndex={-1} data-long-name={names.length > 30 || undefined}>
          {names}
        </h2>
      )}
      {room !== 'street' && (
        <button
          type="button"
          className="cinema-surface"
          onClick={() => (room === 'auditorium' ? changeReel() : openProgram('event'))}
          aria-label={
            room === 'auditorium' ? `Layar bioskop: ${projected.title}. Ganti gulungan` : 'Baca jadwal di papan lobi'
          }
        >
          {!webgl && (
            <span className="cinema-surface-fallback">
              {room === 'auditorium' && projected.photo && <img src={projected.photo} alt="" />}
              <strong>{room === 'auditorium' ? projected.title : names}</strong>
              {room === 'lobby' && <span>{date}</span>}
            </span>
          )}
          <span className="cinema-surface-caption">
            <Film size={15} aria-hidden="true" />
            {room === 'auditorium'
              ? `Ganti gulungan · ${(reel % frames.length) + 1}/${frames.length}`
              : 'Baca papan jadwal'}
          </span>
        </button>
      )}
      <div className="cinema-action" key={room}>
        {room === 'street' && (
          <div className="cinema-welcome">
            <p>{recipient}</p>
            <button type="button" className="cinema-primary" onClick={() => visit('lobby')}>
              <Ticket size={19} aria-hidden="true" /> Ambil tiket <ArrowRight size={18} aria-hidden="true" />
            </button>
            <p className="cinema-tip">Geser layar. Sentuh genangannya.</p>
          </div>
        )}
        {room === 'lobby' && (
          <div className="cinema-ticket">
            <div className="cinema-ticket-edge">
              <Ticket size={32} aria-hidden="true" />
            </div>
            <div className="cinema-ticket-main">
              <p className="cinema-ticket-name">{names}</p>
              <h2 ref={title} tabIndex={-1}>
                {eventTitle}
              </h2>
              <p>{date}</p>
              <p>{venue}</p>
              {eventLead && <p>{eventLead}</p>}
              <div className="cinema-ticket-actions">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={15} aria-hidden="true" /> Lihat lokasi
                </a>
                <button type="button" className="cinema-primary" onClick={() => visit('auditorium')}>
                  Masuk auditorium <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
        {room === 'auditorium' && !replyOpen && (
          <button type="button" className="cinema-primary cinema-ring" onClick={ringBell}>
            <Bell size={19} aria-hidden="true" /> Serahkan tiket
          </button>
        )}
        {room === 'auditorium' && replyOpen && (
          <div className="cinema-ticket cinema-ticket--reply" data-confirmed={rsvpSaved || undefined}>
            <div className="cinema-ticket-edge">
              <ScanLine size={32} aria-hidden="true" />
            </div>
            <div className="cinema-ticket-main">
              <p className="cinema-ticket-name">{recipient}</p>
              <h2 ref={title} tabIndex={-1}>
                {rsvpTitle}
              </h2>
              {rsvpLead && <p>{rsvpLead}</p>}
              <div className="cinema-ticket-actions">{rsvp}</div>
            </div>
          </div>
        )}
      </div>
      <div className="cinema-footer">
        {music && (
          <details className="cinema-music">
            <summary>Musik</summary>
            {music}
          </details>
        )}
        {room !== 'street' && sections.length > 0 && (
          <details className="cinema-program">
            <summary>Program acara</summary>
            <div>
              {sections.map(({ id, title: label }) => (
                <button type="button" key={id} onClick={() => openProgram(id)}>
                  {label}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
      <dialog className="cinema-program-dialog" ref={dialog} aria-label={selected?.title ?? 'Program acara'}>
        <button type="button" className="cinema-close" onClick={() => dialog.current?.close()}>
          Tutup program
        </button>
        {selected?.details}
      </dialog>
    </article>
  )
}
