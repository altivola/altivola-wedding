import { maxScheduleItems, type ScheduleItem, type WeddingDesign } from '@app/api/wedding-design'
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { displayWeddingDate } from './wedding-custom-content'

export function InvitationEnvelope({
  recipient,
  names,
  onOpen,
}: {
  recipient: string
  names: string
  onOpen: () => void
}) {
  return (
    <article className="invitation-envelope">
      <div className="envelope-paper">
        <p>Untuk {recipient}</p>
        <h2>{names}</h2>
        <button type="button" className="envelope-seal" onClick={onOpen}>
          Buka segel
        </button>
      </div>
    </article>
  )
}

export function ScheduleEditor({
  items,
  onChange,
}: {
  items: ScheduleItem[]
  onChange: (items: ScheduleItem[]) => void
}) {
  function update(id: string, patch: Partial<ScheduleItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <fieldset className="schedule-editor">
      <legend>Rundown acara</legend>
      {items.map((item, index) => (
        <fieldset key={item.id}>
          <legend>Agenda {index + 1}</legend>
          <label>
            Waktu
            <input
              value={item.time}
              maxLength={60}
              placeholder="16.00 WIB"
              onChange={(e) => update(item.id, { time: e.target.value })}
            />
          </label>
          <label>
            Nama agenda
            <input
              value={item.title}
              maxLength={120}
              placeholder="Akad nikah"
              onChange={(e) => update(item.id, { title: e.target.value })}
            />
          </label>
          <label>
            Keterangan agenda
            <textarea
              value={item.detail}
              maxLength={280}
              onChange={(e) => update(item.id, { detail: e.target.value })}
            />
          </label>
          <label>
            Tanggal{' '}
            <input type="date" value={item.date ?? ''} onChange={(e) => update(item.id, { date: e.target.value })} />
          </label>
          <label>
            Mulai (WIB){' '}
            <input
              type="time"
              value={item.startsAt ?? ''}
              onChange={(e) => update(item.id, { startsAt: e.target.value })}
            />
          </label>
          <label>
            Selesai (WIB){' '}
            <input
              type="time"
              value={item.endsAt ?? ''}
              onChange={(e) => update(item.id, { endsAt: e.target.value })}
            />
          </label>
          <label>
            Lokasi{' '}
            <input
              maxLength={200}
              value={item.venue ?? ''}
              onChange={(e) => update(item.id, { venue: e.target.value })}
            />
          </label>
          <label>
            Link Maps{' '}
            <input
              type="url"
              maxLength={600}
              value={item.maps ?? ''}
              onChange={(e) => update(item.id, { maps: e.target.value })}
            />
          </label>
          <button type="button" onClick={() => onChange(items.filter(({ id }) => id !== item.id))}>
            Hapus agenda {index + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={items.length >= maxScheduleItems}
        onClick={() => onChange([...items, { id: crypto.randomUUID(), time: '', title: '', detail: '' }])}
      >
        Tambah agenda
      </button>
    </fieldset>
  )
}

export function InvitationSchedule({ items }: { items: ScheduleItem[] }) {
  const complete = items.filter(({ title }) => title.trim())
  if (!complete.length) return null

  return (
    <ol className="invitation-schedule" aria-label="Rundown acara">
      {complete.map((item) => (
        <li key={item.id}>
          {item.time && <span>{item.time}</span>}
          <div>
            <strong>{item.title}</strong>
            {item.date && (
              <p>
                <time dateTime={item.date}>{displayWeddingDate(item.date)}</time>
              </p>
            )}
            {item.startsAt && (
              <p>
                {item.startsAt}
                {item.endsAt && ` – ${item.endsAt}`} WIB
              </p>
            )}
            {item.venue && <p>{item.venue}</p>}
            {item.detail && <p>{item.detail}</p>}
            <AgendaLinks item={item} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function AgendaLinks({ item }: { item: ScheduleItem }) {
  const { date, startsAt, endsAt, title, detail, venue, maps } = item
  const validMaps = maps && /^https?:\/\//i.test(maps) ? maps : undefined
  const mapUrl = validMaps || (venue && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`)
  const calendar = new URL('https://calendar.google.com/calendar/render')
  const start = date && startsAt ? new Date(`${date}T${startsAt}:00+07:00`) : null
  const end = date && endsAt ? new Date(`${date}T${endsAt}:00+07:00`) : null
  if (start && end && end <= start) end.setUTCDate(end.getUTCDate() + 1)
  const nextDay = date ? new Date(`${date}T00:00:00Z`) : null
  nextDay?.setUTCDate(nextDay.getUTCDate() + 1)
  if (date && nextDay) {
    const stamp = (value: Date) => value.toISOString().replace(/[-:]|\.000/g, '')
    calendar.search = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: detail,
      location: venue ?? '',
      ctz: 'Asia/Jakarta',
      dates: start
        ? `${stamp(start)}/${stamp(end ?? new Date(start.getTime() + 3_600_000))}`
        : `${date.replaceAll('-', '')}/${nextDay.toISOString().slice(0, 10).replaceAll('-', '')}`,
    }).toString()
  }
  return (
    <div className="wedding-agenda-links">
      {mapUrl && (
        <a href={mapUrl} target="_blank" rel="noreferrer">
          Buka Maps
        </a>
      )}
      {date && (
        <a href={calendar.href} target="_blank" rel="noreferrer">
          Simpan ke Kalender
        </a>
      )}
    </div>
  )
}

type Photo = { src: string; caption: string }

export function KeepsakeGallery({ photos, layout }: { photos: Photo[]; layout?: WeddingDesign['album'] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, select] = useState(0)
  const photo = photos[index]
  if (!photo) return null

  function step(offset: number) {
    select((current) => (current + offset + photos.length) % photos.length)
  }

  return (
    <>
      <div className="keepsake-photos" data-layout={layout}>
        {photos.map((item, position) => (
          <button
            type="button"
            key={item.src}
            aria-label={`Perbesar foto ${position + 1}`}
            onClick={() => {
              select(position)
              dialog.current?.showModal()
            }}
          >
            <img src={item.src} alt={item.caption || 'Foto pasangan'} loading="lazy" />
            <span>{item.caption || `Foto ${position + 1}`}</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <dialog ref={dialog} className="keepsake-dialog" aria-label="Foto album">
        <button
          type="button"
          className="keepsake-close"
          aria-label="Tutup foto"
          onClick={() => dialog.current?.close()}
        >
          <X size={22} aria-hidden="true" />
        </button>
        <img src={photo.src} alt={photo.caption || 'Foto pasangan'} />
        <div>
          <button type="button" aria-label="Foto sebelumnya" onClick={() => step(-1)} disabled={photos.length < 2}>
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <p aria-live="polite">
            {photo.caption || 'Foto pasangan'} · {index + 1}/{photos.length}
          </p>
          <button type="button" aria-label="Foto berikutnya" onClick={() => step(1)} disabled={photos.length < 2}>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </dialog>
    </>
  )
}
