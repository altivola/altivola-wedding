import {
  eventsFor,
  type FieldMode,
  type InvitationDoc,
  isSectionOn,
  type ResolvedField,
  resolveField,
  type SectionId,
  sectionOrder,
} from '@app/api/invitation-model'
import { cn } from 'cn'
import {
  type CSSProperties,
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { mediaUrl } from '@/lib/image'
import { client, errorMessage } from '@/lib/orpc'
import { copyText, toast } from '@/lib/toast'
import { calendarUrl, eventStart, formatDate, mapsUrl, timeRange, youtubeId } from './format'
import { type Palette, palettes, songs } from './palette'
import { SampleArt, sampleGallery } from './samples'
import { type ThemeArt, themeArt } from './themes'
import { ThemeScene } from './themes/scene'
import './invite.css'

export type InviteGuest = {
  code: string
  name: string
  events: string[] | null
  seats: number
  attending: boolean | null
  party: number | null
}
export type InviteWish = { id: string; name: string; message: string; createdAt: string }

type InviteValue = {
  doc: InvitationDoc
  mode: FieldMode
  palette: Palette
  art: ThemeArt
  slug: string | null
  guest: InviteGuest | null
  field: (section: SectionId, key: string) => ResolvedField
  editable: boolean
}

const InviteContext = createContext<InviteValue | null>(null)
const useInvite = () => {
  const value = useContext(InviteContext)
  if (!value) throw new Error('useInvite outside an invitation')
  return value
}

const copy = {
  id: {
    sample: 'Contoh',
    guest: 'Nama Tamu',
    anyGuest: 'Tamu Undangan',
    map: 'Buka peta',
    calendar: 'Simpan ke kalender',
    days: 'hari',
    hours: 'jam',
    minutes: 'menit',
    seconds: 'detik',
    today: 'Hari ini harinya!',
    seeAll: (count: number) => `Lihat semua ${count} foto`,
    decline: 'Maaf, tidak bisa',
    attendingAsk: (name: string) => `Bisa hadir, ${name}?`,
    people: 'Jumlah yang datang',
    send: 'Kirim',
    yourName: 'Nama kamu',
    yourWish: 'Tulis ucapan dan doa',
    wishes: (count: number) => `${count} ucapan`,
    noWishes: 'Belum ada ucapan. Jadilah yang pertama.',
    rsvpYes: (party: number) => `Kamu akan hadir bersama ${party} orang.`,
    rsvpNo: 'Kamu tidak bisa hadir. Terima kasih sudah mengabari.',
    change: 'Ubah jawaban',
    qr: 'Tunjukkan kode ini di meja tamu',
    privateLink: 'Konfirmasi kehadiran ada di link pribadi dari mempelai.',
    preview: 'Ini pratinjau. Tamu bisa membalas di undangan yang sudah terbit.',
    copy: 'Salin',
    copied: 'Disalin',
    play: 'Putar film',
    madeWith: 'dibuat dengan',
    music: 'Musik',
    closed: 'Tutup',
    prev: 'Sebelumnya',
    next: 'Berikutnya',
    tapOpen: 'Ketuk untuk buka',
  },
  en: {
    sample: 'Sample',
    guest: 'Guest Name',
    anyGuest: 'Our Guest',
    map: 'Open map',
    calendar: 'Add to calendar',
    days: 'days',
    hours: 'hours',
    minutes: 'mins',
    seconds: 'secs',
    today: 'Today is the day!',
    seeAll: (count: number) => `View all ${count} photos`,
    decline: "Can't make it",
    attendingAsk: (name: string) => `Can you come, ${name}?`,
    people: 'How many are coming',
    send: 'Send',
    yourName: 'Your name',
    yourWish: 'Write your wishes',
    wishes: (count: number) => `${count} wishes`,
    noWishes: 'No wishes yet. Be the first.',
    rsvpYes: (party: number) => `You are coming with ${party} people.`,
    rsvpNo: "You can't make it. Thank you for letting us know.",
    change: 'Change reply',
    qr: 'Show this code at the guest desk',
    privateLink: 'Replies use the personal link from the couple.',
    preview: 'This is a preview. Guests can reply on the published invitation.',
    copy: 'Copy',
    copied: 'Copied',
    play: 'Play the film',
    madeWith: 'made with',
    music: 'Music',
    closed: 'Close',
    prev: 'Previous',
    next: 'Next',
    tapOpen: 'Tap to open',
  },
}
const useCopy = () => copy[useInvite().doc.lang]

function Badge() {
  const t = useCopy()
  return <span className="inv-sample">{t.sample}</span>
}

function Text({
  s,
  k,
  as: Tag = 'p',
  className,
}: {
  s: SectionId
  k: string
  as?: 'p' | 'h2' | 'h3' | 'span' | 'div'
  className?: string
}) {
  const { field } = useInvite()
  const value = field(s, k)
  if (!value.visible || !value.value) return null
  return (
    <Tag className={className}>
      {value.value}
      {value.sample && <Badge />}
    </Tag>
  )
}

function Photo({ value, className, alt }: { value: string; className?: string; alt?: string }) {
  const { palette, art } = useInvite()
  return (
    <div className={cn('inv-photo', `frame-${art.frame}`, className)}>
      {value.startsWith('sample:') ? (
        <SampleArt name={value} palette={palette} className="inv-photo-img" />
      ) : (
        <img className="inv-photo-img" src={mediaUrl(value)} alt={alt ?? ''} loading="lazy" />
      )}
    </div>
  )
}

function PhotoField({ s, k, className }: { s: SectionId; k: string; className?: string }) {
  const { field } = useInvite()
  const value = field(s, k)
  if (!value.visible || !value.value) return null
  return (
    <div className="inv-photo-wrap">
      <Photo value={value.value} className={className} />
      {value.sample && <Badge />}
    </div>
  )
}

function Heading({ s }: { s: SectionId }) {
  const { art, palette } = useInvite()
  return (
    <header className="inv-head">
      <art.Ornament palette={palette} />
      <Text s={s} k="kicker" className="inv-kicker" />
      <Text s={s} k="title" as="h2" className="inv-title" />
    </header>
  )
}

function Section({ id, children, className }: { id: SectionId; children: ReactNode; className?: string }) {
  const { doc } = useInvite()
  if (!isSectionOn(doc, id)) return null
  return (
    <section data-section={id} className={cn('inv-sec', `inv-sec-${id}`, className)}>
      {children}
    </section>
  )
}

function Names({ value, className }: { value: string; className?: string }) {
  const parts = value.split(/\s+&\s+/)
  if (parts.length !== 2) return <h1 className={className}>{value}</h1>
  return (
    <h1 className={className}>
      <span>{parts[0]}</span>
      <span className="inv-amp">&amp;</span>
      <span>{parts[1]}</span>
    </h1>
  )
}

function useEvents() {
  const { doc, guest } = useInvite()
  return eventsFor(doc, guest?.events ?? null)
}

function Opening() {
  const { doc, field } = useInvite()
  const events = useEvents()
  const first = events.find((event) => event.date)
  const names = field('opening', 'names')
  return (
    <Section id="opening" className="inv-hero">
      <ThemeScene theme={doc.theme} />
      <div className="inv-hero-text">
        <Text s="opening" k="kicker" className="inv-kicker" />
        {names.visible && <Names value={names.value} className="inv-hero-names" />}
        {first && <p className="inv-hero-date">{formatDate(first.date, doc.lang)}</p>}
        <Text s="opening" k="place" className="inv-hero-place" />
        <Text s="opening" k="greeting" className="inv-hero-greeting" />
      </div>
    </Section>
  )
}

function Profile({ who }: { who: 'bride' | 'groom' }) {
  const { field } = useInvite()
  const ig = field('couple', `${who}.ig`)
  return (
    <div className="inv-profile">
      <PhotoField s="couple" k={`${who}.photo`} className="inv-profile-photo" />
      <Text s="couple" k={`${who}.name`} as="h3" className="inv-script inv-profile-name" />
      <Text s="couple" k={`${who}.full`} className="inv-profile-full" />
      <Text s="couple" k={`${who}.parents`} className="inv-profile-parents" />
      {ig.visible && ig.value && (
        <a
          className="inv-profile-ig"
          href={`https://instagram.com/${ig.value.replace(/^@/, '')}`}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => ig.sample && event.preventDefault()}
        >
          {ig.value}
          {ig.sample && <Badge />}
        </a>
      )}
    </div>
  )
}

function Couple() {
  return (
    <Section id="couple">
      <Text s="couple" k="greeting" className="inv-lead" />
      <blockquote className="inv-verse">
        <Text s="couple" k="verse" />
        <Text s="couple" k="verseSource" as="span" className="inv-kicker" />
      </blockquote>
      <Heading s="couple" />
      <div className="inv-profiles">
        <Profile who="bride" />
        <Profile who="groom" />
      </div>
    </Section>
  )
}

function Story() {
  const { field, mode } = useInvite()
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const t = useCopy()
  const chapters = [1, 2, 3, 4].filter((number) => {
    const parts = ['photo', 'year', 'text'].map((key) => field('story', `s${number}.${key}`))
    return parts.some((part) => part.visible && part.value) && (mode === 'preview' || parts.some((part) => part.filled))
  })
  if (!chapters.length) return null
  const go = (next: number) => {
    const target = Math.max(0, Math.min(chapters.length - 1, next))
    track.current?.children[target]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setIndex(target)
  }
  return (
    <Section id="story">
      <Heading s="story" />
      <div
        className="inv-story-track"
        ref={track}
        onScroll={(event) => {
          const element = event.currentTarget
          setIndex(Math.round(element.scrollLeft / element.clientWidth))
        }}
      >
        {chapters.map((number) => (
          <article key={number} className="inv-story-card">
            <PhotoField s="story" k={`s${number}.photo`} className="inv-story-photo" />
            <Text s="story" k={`s${number}.year`} className="inv-kicker inv-accent" />
            <Text s="story" k={`s${number}.text`} className="inv-story-text" />
          </article>
        ))}
      </div>
      {chapters.length > 1 && (
        <div className="inv-dots">
          <button
            type="button"
            className="inv-arrow"
            aria-label={t.prev}
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          {chapters.map((number, dot) => (
            <button
              key={number}
              type="button"
              aria-label={`${dot + 1}`}
              className={cn('inv-dot', dot === index && 'is-on')}
              onClick={() => go(dot)}
            />
          ))}
          <button
            type="button"
            className="inv-arrow"
            aria-label={t.next}
            disabled={index === chapters.length - 1}
            onClick={() => go(index + 1)}
          >
            ›
          </button>
        </div>
      )}
    </Section>
  )
}

function Qna() {
  const { field } = useInvite()
  const [open, setOpen] = useState<number[]>([])
  const t = useCopy()
  const cards = [1, 2, 3, 4].filter((number) => {
    const question = field('qna', `q${number}.q`)
    return question.visible && question.value
  })
  if (!cards.length) return null
  return (
    <Section id="qna">
      <Heading s="qna" />
      <div className="inv-qna">
        {cards.map((number) => (
          <button
            key={number}
            type="button"
            className={cn('inv-qna-card', open.includes(number) && 'is-open')}
            onClick={(event) => {
              event.stopPropagation()
              setOpen((current) =>
                current.includes(number) ? current.filter((item) => item !== number) : [...current, number],
              )
            }}
          >
            <span className="inv-qna-front">
              <Text s="qna" k={`q${number}.q`} as="span" className="inv-qna-q" />
              <span className="inv-qna-hint">{t.tapOpen}</span>
            </span>
            <span className="inv-qna-back">
              <Text s="qna" k={`q${number}.a`} as="span" className="inv-qna-a" />
            </span>
          </button>
        ))}
      </div>
    </Section>
  )
}

function Events() {
  const { doc, mode } = useInvite()
  const events = useEvents()
  const t = useCopy()
  const shown = events.length || mode === 'live' ? events : []
  return (
    <Section id="events">
      <Heading s="events" />
      <div className="inv-events">
        {shown.length === 0 && (
          <div className="inv-panel inv-event">
            <p className="inv-kicker inv-accent">Akad nikah</p>
            <p className="inv-event-date">{formatDate('2027-06-12', doc.lang)}</p>
            <p className="inv-event-time">08.00 - 10.00 WIB</p>
            <p className="inv-event-venue">
              Masjid Al-Ukhuwah
              <Badge />
            </p>
          </div>
        )}
        {shown.map((event) => {
          const map = mapsUrl(event)
          const calendar = calendarUrl(event, doc)
          return (
            <article key={event.id} className="inv-panel inv-event">
              <p className="inv-kicker inv-accent">{event.title}</p>
              {event.date && <p className="inv-event-date">{formatDate(event.date, doc.lang)}</p>}
              {event.start && <p className="inv-event-time">{timeRange(event, doc.lang)}</p>}
              {event.venue && <p className="inv-event-venue">{event.venue}</p>}
              {event.address && <p className="inv-event-address">{event.address}</p>}
              <div className="inv-actions">
                {map && (
                  <a className="inv-button is-small" href={map} target="_blank" rel="noreferrer">
                    {t.map}
                  </a>
                )}
                {calendar && (
                  <a className="inv-button is-small is-ghost" href={calendar} target="_blank" rel="noreferrer">
                    {t.calendar}
                  </a>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </Section>
  )
}

function Countdown() {
  const { doc, field } = useInvite()
  const events = useEvents()
  const t = useCopy()
  const target = events.map(eventStart).find((value) => value !== null) ?? null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const first = events.find((event) => eventStart(event) !== null)
  const calendar = first ? calendarUrl(first, doc) : null
  const left = Math.max(0, (target ?? now + 196 * 86_400_000) - now)
  const parts = [
    [Math.floor(left / 86_400_000), t.days],
    [Math.floor(left / 3_600_000) % 24, t.hours],
    [Math.floor(left / 60_000) % 60, t.minutes],
    [Math.floor(left / 1000) % 60, t.seconds],
  ] as const
  const button = field('countdown', 'button')
  return (
    <Section id="countdown">
      <Heading s="countdown" />
      {target !== null && left === 0 ? (
        <p className="inv-lead">{t.today}</p>
      ) : (
        <div className="inv-countdown" aria-live="off">
          {parts.map(([value, label]) => (
            <div key={label} className="inv-count">
              <span className="inv-count-value">{String(value).padStart(2, '0')}</span>
              <span className="inv-count-label">{label}</span>
            </div>
          ))}
        </div>
      )}
      {button.visible && calendar && (
        <a className="inv-button" href={calendar} target="_blank" rel="noreferrer">
          {button.value}
        </a>
      )}
    </Section>
  )
}

function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const t = useCopy()
  const photo = photos[index]
  return (
    <div className="inv-lightbox" role="dialog" aria-modal="true">
      <button type="button" className="inv-lightbox-close" onClick={onClose} aria-label={t.closed}>
        ×
      </button>
      {photo && <Photo value={photo} className="inv-lightbox-photo" />}
      <div className="inv-dots">
        <button
          type="button"
          className="inv-arrow"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          aria-label={t.prev}
        >
          ‹
        </button>
        <span className="inv-count-label">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          className="inv-arrow"
          disabled={index === photos.length - 1}
          onClick={() => setIndex(index + 1)}
          aria-label={t.next}
        >
          ›
        </button>
      </div>
    </div>
  )
}

function Gallery() {
  const { doc, mode } = useInvite()
  const t = useCopy()
  const [open, setOpen] = useState<number | null>(null)
  const sample = doc.gallery.length === 0 && mode === 'preview'
  const photos = sample ? sampleGallery : doc.gallery
  if (!photos.length) return null
  return (
    <Section id="gallery">
      <Heading s="gallery" />
      <div className="inv-gallery">
        {photos.slice(0, 9).map((photo, index) => (
          <button
            key={photo}
            type="button"
            className="inv-gallery-item"
            onClick={(event) => {
              event.stopPropagation()
              setOpen(index)
            }}
          >
            <Photo value={photo} />
          </button>
        ))}
      </div>
      {sample && <Badge />}
      {photos.length > 1 && (
        <button
          type="button"
          className="inv-button is-ghost"
          onClick={(event) => {
            event.stopPropagation()
            setOpen(0)
          }}
        >
          {t.seeAll(photos.length)}
        </button>
      )}
      {open !== null && <Lightbox photos={photos} start={open} onClose={() => setOpen(null)} />}
    </Section>
  )
}

function CheckInQr({ slug, code }: { slug: string; code: string }) {
  const [image, setImage] = useState('')
  useEffect(() => {
    let active = true
    void import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(`HB1:${slug}:${code}`, { width: 220, margin: 2 }).then((url) => {
        if (active) setImage(url)
      }),
    )
    return () => {
      active = false
    }
  }, [slug, code])
  return image ? <img className="inv-qr" src={image} alt="Kode QR check-in" width={180} height={180} /> : null
}

const sampleWishes: InviteWish[] = [
  {
    id: 's1',
    name: 'Nadia & Rizky',
    message: 'Selamat ya! Semoga jadi keluarga yang hangat dan penuh tawa.',
    createdAt: '',
  },
  { id: 's2', name: 'Om Hendra', message: 'Bahagia selalu, sampai kakek nenek.', createdAt: '' },
  { id: 's3', name: 'Tim Kantor', message: 'Selamat menempuh hidup baru. Ditunggu traktirannya!', createdAt: '' },
]

function Wishes({ wishes, untuk }: { wishes: InviteWish[]; untuk?: string }) {
  const { mode, slug, guest, field } = useInvite()
  const t = useCopy()
  const [reply, setReply] = useState(guest ? { attending: guest.attending, party: guest.party ?? 1 } : null)
  const [editing, setEditing] = useState(guest?.attending === null)
  const [party, setParty] = useState(Math.max(1, guest?.party ?? 1))
  const [list, setList] = useState(wishes.length || mode === 'live' ? wishes : sampleWishes)
  const [name, setName] = useState(guest?.name ?? untuk ?? '')
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (wishes.length) setList(wishes)
  }, [wishes])
  const button = field('wishes', 'button')
  const pageSize = 4
  const pages = Math.max(1, Math.ceil(list.length / pageSize))
  const preview = () => toast(t.preview)

  const answer = async (attending: boolean) => {
    if (mode === 'preview' || !slug || !guest) return preview()
    setBusy(true)
    try {
      const saved = await client.invitations.rsvp({ slug, code: guest.code, attending, party: attending ? party : 0 })
      setReply(saved)
      setEditing(false)
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    if (mode === 'preview' || !slug) return preview()
    setBusy(true)
    try {
      const wish = await client.invitations.wish({ slug, code: guest?.code, name, message })
      setList((current) => [wish, ...current])
      setMessage('')
      setPage(0)
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="wishes">
      <Heading s="wishes" />
      <div className="inv-panel inv-rsvp">
        {guest && reply?.attending !== null && reply && !editing ? (
          <>
            <p className="inv-lead">{reply.attending ? t.rsvpYes(reply.party) : t.rsvpNo}</p>
            {reply.attending && slug && (
              <>
                <CheckInQr slug={slug} code={guest.code} />
                <p className="inv-small">{t.qr}</p>
              </>
            )}
            <button type="button" className="inv-link" onClick={() => setEditing(true)}>
              {t.change}
            </button>
          </>
        ) : guest || mode === 'preview' ? (
          <>
            {guest && <p className="inv-lead">{t.attendingAsk(guest.name)}</p>}
            {guest && guest.seats > 1 && (
              <div className="inv-stepper">
                <span className="inv-small">{t.people}</span>
                <button type="button" onClick={() => setParty(Math.max(1, party - 1))} aria-label="-">
                  −
                </button>
                <strong>{party}</strong>
                <button type="button" onClick={() => setParty(Math.min(guest.seats, party + 1))} aria-label="+">
                  +
                </button>
              </div>
            )}
            {button.visible && (
              <button type="button" className="inv-button" disabled={busy} onClick={() => answer(true)}>
                {button.value}
              </button>
            )}
            <button type="button" className="inv-link" disabled={busy} onClick={() => answer(false)}>
              {t.decline}
            </button>
          </>
        ) : (
          <p className="inv-small">{t.privateLink}</p>
        )}
      </div>
      <form
        className="inv-panel inv-wish-form"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <input
          className="inv-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.yourName}
          readOnly={Boolean(guest)}
          required
          maxLength={80}
          aria-label={t.yourName}
        />
        <textarea
          className="inv-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t.yourWish}
          required
          minLength={2}
          maxLength={600}
          rows={3}
          aria-label={t.yourWish}
        />
        <button type="submit" className="inv-button" disabled={busy}>
          {t.send}
        </button>
      </form>
      <div className="inv-wishes">
        {list.length === 0 && <p className="inv-small">{t.noWishes}</p>}
        {list.slice(page * pageSize, page * pageSize + pageSize).map((wish) => (
          <article key={wish.id} className="inv-panel inv-wish">
            <p className="inv-wish-name">{wish.name}</p>
            <p className="inv-wish-text">{wish.message}</p>
          </article>
        ))}
      </div>
      {list.length > 0 && (
        <div className="inv-dots">
          <button
            type="button"
            className="inv-arrow"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label={t.prev}
          >
            ‹
          </button>
          <span className="inv-count-label">
            {page + 1} / {pages} · {t.wishes(list.length)}
          </span>
          <button
            type="button"
            className="inv-arrow"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            aria-label={t.next}
          >
            ›
          </button>
        </div>
      )}
      {mode === 'preview' && !wishes.length && <Badge />}
    </Section>
  )
}

function DressCode() {
  const { doc, field, palette } = useInvite()
  const swatches = [1, 2, 3, 4]
    .map((number) => {
      const hex = field('dresscode', `c${number}.hex`)
      const name = field('dresscode', `c${number}.name`)
      const fallback = palette.swatches[number - 1]
      return {
        number,
        visible: hex.visible,
        hex: hex.value.startsWith('theme:') ? (fallback?.hex ?? '#cccccc') : hex.value,
        name: name.value.startsWith('theme:') ? (fallback?.name ?? '') : name.value,
      }
    })
    .filter((swatch) => swatch.visible)
  const t = copy[doc.lang]
  return (
    <Section id="dresscode">
      <Heading s="dresscode" />
      <div className="inv-swatches">
        {swatches.map((swatch) => (
          <button
            key={swatch.number}
            type="button"
            className="inv-swatch"
            onClick={(event) => {
              event.stopPropagation()
              void copyText(swatch.hex, `${t.copied} ${swatch.hex}`)
            }}
          >
            <span className="inv-swatch-dot" style={{ background: swatch.hex }} />
            <span className="inv-small">{swatch.name}</span>
          </button>
        ))}
      </div>
      <Text s="dresscode" k="note" className="inv-lead" />
    </Section>
  )
}

function Gift() {
  const { field } = useInvite()
  const t = useCopy()
  const accounts = [1, 2].filter((number) => {
    const value = field('gift', `a${number}.number`)
    return value.visible && value.value
  })
  const address = field('gift', 'address')
  return (
    <Section id="gift">
      <Heading s="gift" />
      <Text s="gift" k="subtitle" className="inv-lead" />
      <div className="inv-gifts">
        {accounts.map((number) => {
          const account = field('gift', `a${number}.number`)
          return (
            <div key={number} className="inv-panel inv-gift">
              <div>
                <Text s="gift" k={`a${number}.bank`} className="inv-kicker inv-accent" />
                <p className="inv-gift-number">{account.value}</p>
                <Text s="gift" k={`a${number}.holder`} className="inv-small" />
              </div>
              <button
                type="button"
                className="inv-button is-small"
                onClick={(event) => {
                  event.stopPropagation()
                  void copyText(account.value.replace(/\s/g, ''), t.copied)
                }}
              >
                {t.copy}
              </button>
            </div>
          )
        })}
        {address.visible && address.value && (
          <div className="inv-panel inv-gift">
            <div>
              <Text s="gift" k="addressLabel" className="inv-kicker inv-accent" />
              <Text s="gift" k="address" className="inv-small" />
            </div>
            <button
              type="button"
              className="inv-button is-small"
              onClick={(event) => {
                event.stopPropagation()
                void copyText(address.value, t.copied)
              }}
            >
              {t.copy}
            </button>
          </div>
        )}
      </div>
    </Section>
  )
}

function Film() {
  const { field, mode } = useInvite()
  const t = useCopy()
  const link = field('film', 'youtube')
  const still = field('film', 'still')
  const [playing, setPlaying] = useState(false)
  const id = link.filled ? youtubeId(link.value) : null
  if (mode === 'live' && !id && !still.filled) return null
  return (
    <Section id="film">
      <Heading s="film" />
      <div className="inv-film">
        {playing && id ? (
          <iframe
            className="inv-film-frame"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title="Film"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="inv-film-still"
            aria-label={t.play}
            onClick={(event) => {
              event.stopPropagation()
              if (id) setPlaying(true)
              else if (mode === 'preview') toast(t.preview)
            }}
          >
            {still.visible && still.value && <Photo value={still.value} className="inv-film-photo" />}
            <span className="inv-play">▶</span>
          </button>
        )}
      </div>
      <Text s="film" k="note" className="inv-small" />
    </Section>
  )
}

function Live() {
  const { field, palette, mode } = useInvite()
  const link = field('live', 'link')
  const button = field('live', 'button')
  if (mode === 'live' && !link.filled) return null
  return (
    <Section id="live">
      <Heading s="live" />
      <svg className="inv-live-art" viewBox="0 0 120 90" aria-hidden="true">
        <rect x="14" y="22" width="92" height="58" rx="10" fill={palette.deep} />
        <rect x="22" y="30" width="76" height="42" rx="5" fill={palette.surface} />
        <path d="M54 42l16 9-16 9z" fill={palette.accent} />
        <path d="M44 22l-12-16M76 22l12-16" stroke={palette.deep} strokeWidth="3" strokeLinecap="round" />
        <circle cx="96" cy="16" r="6" fill={palette.second} className="inv-live-dot" />
      </svg>
      <Text s="live" k="subtitle" className="inv-lead" />
      {button.visible && link.value && (
        <a
          className="inv-button"
          href={link.value}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => link.sample && event.preventDefault()}
        >
          {button.value}
        </a>
      )}
    </Section>
  )
}

function useFallbackPhotos(keys: string[], section: SectionId) {
  const { field, doc, mode } = useInvite()
  return keys.map((key, index) => {
    const value = field(section, key)
    if (value.filled) return { key, photo: value.value }
    return { key, photo: doc.gallery[index] ?? (mode === 'preview' ? value.value : '') }
  })
}

function Booth() {
  const { slug, mode, field } = useInvite()
  const photos = useFallbackPhotos(['p1', 'p2', 'p3'], 'booth')
  const button = field('booth', 'button')
  return (
    <Section id="booth">
      <Heading s="booth" />
      <div className="inv-strip">
        {photos.map(({ key, photo }) => (
          <div key={key} className="inv-strip-cell">
            {photo && <Photo value={photo} className="frame-none" />}
          </div>
        ))}
      </div>
      <Text s="booth" k="subtitle" className="inv-lead" />
      {button.visible && (
        <a
          className="inv-button"
          href={slug && mode === 'live' ? `/u/${slug}/booth` : '/coba/booth'}
          target="_blank"
          rel="noreferrer"
        >
          {button.value}
        </a>
      )}
    </Section>
  )
}

function Camera() {
  const { slug, mode, field } = useInvite()
  const photos = useFallbackPhotos(['p1', 'p2', 'p3'], 'camera')
  const button = field('camera', 'button')
  return (
    <Section id="camera">
      <Heading s="camera" />
      <div className="inv-prints">
        {photos.map(({ key, photo }) => (
          <div key={key} className="inv-print">
            {photo && <Photo value={photo} className="frame-none" />}
          </div>
        ))}
      </div>
      <Text s="camera" k="subtitle" className="inv-lead" />
      {button.visible && (
        <a
          className="inv-button"
          href={slug && mode === 'live' ? `/u/${slug}/kamera` : '/coba/kamera'}
          target="_blank"
          rel="noreferrer"
        >
          {button.value}
        </a>
      )}
    </Section>
  )
}

function Notes() {
  const { field } = useInvite()
  const notes = [1, 2, 3, 4, 5, 6].filter((number) => {
    const title = field('notes', `n${number}.title`)
    return title.visible && title.value
  })
  if (!notes.length) return null
  return (
    <Section id="notes">
      <Heading s="notes" />
      <div className="inv-notes">
        {notes.map((number) => (
          <div key={number} className="inv-note">
            <Text s="notes" k={`n${number}.title`} as="h3" className="inv-note-title" />
            <Text s="notes" k={`n${number}.text`} className="inv-small" />
          </div>
        ))}
      </div>
    </Section>
  )
}

function Thanks() {
  const { art, palette, doc } = useInvite()
  const t = copy[doc.lang]
  return (
    <Section id="thanks" className="inv-thanks">
      <PhotoField s="thanks" k="photo" className="inv-thanks-photo" />
      <Text s="thanks" k="title" as="h2" className="inv-script inv-thanks-title" />
      <Text s="thanks" k="line" className="inv-lead" />
      <Text s="thanks" k="names" className="inv-kicker" />
      <art.Footer palette={palette} />
      <a className="inv-made" href="/" target="_blank" rel="noreferrer">
        {t.madeWith} <strong>hari bersama</strong>
      </a>
    </Section>
  )
}

function Cover({ guestName, onOpen, opening }: { guestName: string; onOpen: () => void; opening: boolean }) {
  const { art, palette, field } = useInvite()
  const names = field('cover', 'names')
  const button = field('cover', 'button')
  return (
    <div className={cn('inv-cover', opening && 'is-open')} data-section="cover">
      <Text s="cover" k="kicker" className="inv-kicker" />
      {names.visible && <h1 className="inv-cover-names">{names.value}</h1>}
      <button type="button" className="inv-envelope" onClick={onOpen} aria-label={button.value}>
        <art.Envelope palette={palette} />
      </button>
      <div className="inv-cover-guest">
        <Text s="cover" k="guestLabel" className="inv-small" />
        <p className="inv-cover-guest-name">{guestName}</p>
      </div>
      {button.visible && (
        <button type="button" className="inv-button" onClick={onOpen}>
          {button.value}
        </button>
      )}
    </div>
  )
}

function useMusic(doc: InvitationDoc, palette: Palette) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const source = useMemo(() => {
    const music = doc.music
    if (music.mode === 'off') return null
    if (music.mode === 'upload') return { src: mediaUrl(music.mediaId), start: music.start, end: music.end }
    const song = songs[music.mode === 'recording' ? music.id : palette.song]
    return { src: song.src, start: 0, end: undefined }
  }, [doc.music, palette.song])

  useEffect(() => {
    if (!source) return
    const element = new Audio(source.src)
    element.loop = source.end === undefined
    element.preload = 'none'
    element.currentTime = source.start
    const loop = () => {
      if (source.end !== undefined && element.currentTime >= source.end) element.currentTime = source.start
    }
    element.addEventListener('timeupdate', loop)
    element.addEventListener('ended', () => {
      element.currentTime = source.start
      void element.play()
    })
    audio.current = element
    return () => {
      element.pause()
      element.removeEventListener('timeupdate', loop)
      audio.current = null
      setPlaying(false)
    }
  }, [source])

  const play = useCallback(async () => {
    try {
      await audio.current?.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [])
  const toggle = useCallback(() => {
    if (!audio.current) return
    if (audio.current.paused) void play()
    else {
      audio.current.pause()
      setPlaying(false)
    }
  }, [play])
  return { available: Boolean(source), playing, play, toggle }
}

const views: Partial<Record<SectionId, () => JSX.Element | null>> = {
  opening: Opening,
  couple: Couple,
  story: Story,
  qna: Qna,
  events: Events,
  countdown: Countdown,
  gallery: Gallery,
  dresscode: DressCode,
  gift: Gift,
  film: Film,
  live: Live,
  booth: Booth,
  camera: Camera,
  notes: Notes,
  thanks: Thanks,
}

export type InvitationProps = {
  doc: InvitationDoc
  mode: FieldMode
  slug?: string | null
  guest?: InviteGuest | null
  /** Name from a share link, shown on the cover and in the wish form. */
  untuk?: string
  wishes?: InviteWish[]
  /** Controlled cover state for the studio preview. */
  opened?: boolean
  onOpened?: (opened: boolean) => void
  autoplay?: boolean
  className?: string
  /** Studio: clicking a section selects it in the editor. */
  onPick?: (section: SectionId) => void
  scrollTo?: SectionId | null
}

export function Invitation({
  doc,
  mode,
  slug = null,
  guest = null,
  untuk,
  wishes = [],
  opened: controlled,
  onOpened,
  autoplay = true,
  className,
  onPick,
  scrollTo,
}: InvitationProps) {
  const palette = palettes[doc.theme]
  const art = themeArt[doc.theme]
  const [localOpen, setLocalOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const opened = controlled ?? localOpen
  const music = useMusic(doc, palette)
  const scroller = useRef<HTMLDivElement>(null)
  const t = copy[doc.lang]

  const value = useMemo<InviteValue>(
    () => ({
      doc,
      mode,
      palette,
      art,
      slug,
      guest,
      editable: Boolean(onPick),
      field: (section, key) => resolveField(doc, section, key, mode),
    }),
    [doc, mode, palette, art, slug, guest, onPick],
  )

  useEffect(() => {
    if (!scrollTo || scrollTo === 'cover') return
    const target = scroller.current?.querySelector(`[data-section="${scrollTo}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [scrollTo])

  useEffect(() => {
    if (opened) setOpening(false)
  }, [opened])

  const open = () => {
    setOpening(true)
    if (autoplay) void music.play()
    window.setTimeout(() => {
      setLocalOpen(true)
      onOpened?.(true)
    }, 1100)
  }

  const style = {
    '--p-paper': palette.paper,
    '--p-surface': palette.surface,
    '--p-ink': palette.ink,
    '--p-muted': palette.muted,
    '--p-accent': palette.accent,
    '--p-on-accent': palette.onAccent,
    '--p-second': palette.second,
    '--p-deep': palette.deep,
    '--p-on-deep': palette.onDeep,
    '--p-line': palette.line,
    '--p-display': palette.display,
    '--p-body': palette.body,
    '--p-script': palette.script,
    '--p-pattern': art.pattern?.(palette) ?? 'none',
  } as CSSProperties

  return (
    <InviteContext.Provider value={value}>
      <div
        className={cn('inv', `inv-theme-${doc.theme}`, palette.dark && 'is-dark', onPick && 'is-editable', className)}
        data-panel={art.panel}
        style={style}
        lang={doc.lang}
      >
        <div
          className="inv-scroll"
          ref={scroller}
          onClickCapture={(event) => {
            if (!onPick) return
            const section = (event.target as HTMLElement).closest<HTMLElement>('[data-section]')?.dataset.section
            if (section) onPick(section as SectionId)
          }}
        >
          {sectionOrder(doc).map((id) => {
            if (id === 'wishes') return <Wishes key={id} wishes={wishes} untuk={untuk} />
            const View = views[id]
            return View ? <View key={id} /> : null
          })}
        </div>
        {!opened && (
          <Cover
            guestName={guest?.name ?? untuk ?? (mode === 'preview' ? t.guest : t.anyGuest)}
            onOpen={open}
            opening={opening}
          />
        )}
        {opened && music.available && (
          <button
            type="button"
            className={cn('inv-music', music.playing && 'is-playing')}
            onClick={music.toggle}
            aria-label={t.music}
            aria-pressed={music.playing}
          >
            <span />
            <span />
            <span />
            <span />
          </button>
        )}
      </div>
    </InviteContext.Provider>
  )
}
