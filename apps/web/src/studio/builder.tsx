import {
  type FieldDef,
  type InvitationDoc,
  type InvitationEvent,
  isSectionOn,
  maxEvents,
  maxGallery,
  missingFields,
  movableSections,
  newEvent,
  recordings,
  type SectionId,
  sectionById,
  sectionOrder,
  themes,
  timezoneLabel,
  timezones,
} from '@app/api/invitation-model'
import { cn } from 'cn'
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { palettes, songs } from '@/invite/palette'
import { Invitation } from '@/invite/render'
import { SampleArt } from '@/invite/samples'
import { compressPhoto, fileToBase64, mediaUrl } from '@/lib/image'
import { client, errorMessage } from '@/lib/orpc'
import { toast } from '@/lib/toast'
import { ThemeThumb } from '@/site/theme-thumb'
import { useStudio } from './context'
import { Icon } from './icons'

type Selection = SectionId | 'general'

function setValue(doc: InvitationDoc, key: string, value: string, fallback: string): InvitationDoc {
  const values = { ...doc.values }
  if (value === fallback) delete values[key]
  else values[key] = value
  return { ...doc, values }
}

function useUpload() {
  const { invitation } = useStudio()
  const [busy, setBusy] = useState(0)
  const upload = async (file: File) => {
    setBusy((count) => count + 1)
    try {
      const data = await compressPhoto(file)
      const { mediaId } = await client.invitations.upload({ id: invitation.id, kind: 'photo', data })
      return mediaId
    } catch (error) {
      toast(errorMessage(error, 'Foto gagal diunggah'))
      return null
    } finally {
      setBusy((count) => count - 1)
    }
  }
  return { upload, busy: busy > 0 }
}

function usedPhotos(doc: InvitationDoc) {
  const ids = new Set(doc.gallery)
  for (const value of Object.values(doc.values)) if (/^[0-9a-f-]{36}$/.test(value)) ids.add(value)
  return [...ids]
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn('st-switch', on && 'is-on')}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!on)
      }}
    >
      <span />
    </button>
  )
}

function SectionList({ selected, onSelect }: { selected: Selection; onSelect: (value: Selection) => void }) {
  const { doc, update } = useStudio()
  const order = sectionOrder(doc)
  const list: SectionId[] = ['cover', ...order]
  const totalMissing = list.filter((id) => isSectionOn(doc, id) && missingFields(doc, id) > 0).length
  const [dragging, setDragging] = useState<SectionId | null>(null)

  const move = (id: SectionId, to: SectionId) => {
    if (id === to || !movableSections.includes(to)) return
    update((current) => {
      const ids = sectionOrder(current).filter((item) => movableSections.includes(item))
      const from = ids.indexOf(id)
      const target = ids.indexOf(to)
      ids.splice(from, 1)
      ids.splice(target, 0, id)
      return { ...current, order: ids }
    })
  }

  const step = (id: SectionId, delta: number) => {
    const ids = order.filter((item) => movableSections.includes(item))
    const target = ids[ids.indexOf(id) + delta]
    if (target) move(id, target)
  }

  return (
    <div className="st-sections">
      <div className="st-sections-head">
        <strong>Bagian</strong>
        <span>{totalMissing ? `${totalMissing} perlu detailmu` : 'Semua lengkap'}</span>
      </div>
      <button
        type="button"
        className={cn('st-section', selected === 'general' && 'is-on')}
        onClick={() => onSelect('general')}
      >
        <span className="st-section-name">Umum</span>
        <span className="st-section-sub">Nama, tema, bahasa, musik</span>
      </button>
      {list.map((id) => {
        const def = sectionById[id]
        const on = isSectionOn(doc, id)
        const missing = on ? missingFields(doc, id) : 0
        const movable = movableSections.includes(id)
        return (
          // biome-ignore lint/a11y/useSemanticElements: the row holds its own switch button, and buttons cannot nest
          <div
            key={id}
            data-sec={id}
            className={cn('st-section', selected === id && 'is-on', !on && 'is-off', dragging === id && 'is-dragging')}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(id)
              if (movable && event.altKey && event.key === 'ArrowUp') step(id, -1)
              if (movable && event.altKey && event.key === 'ArrowDown') step(id, 1)
            }}
          >
            {movable ? (
              <button
                type="button"
                className="st-grip"
                aria-label={`Geser ${def.label} untuk mengubah urutan`}
                title="Geser untuk mengubah urutan"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDragging(id)
                }}
                onPointerMove={(event) => {
                  if (dragging !== id) return
                  const over = document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest<HTMLElement>('[data-sec]')?.dataset.sec as SectionId | undefined
                  if (over && over !== id) move(id, over)
                }}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
              >
                <Icon name="grip" size={16} />
              </button>
            ) : (
              <span className="st-grip is-fixed" />
            )}
            <span className="st-section-text">
              <span className="st-section-name">{def.label}</span>
              {missing > 0 && (
                <span className="st-section-warn">
                  <Icon name="warn" size={13} /> {id === 'events' ? 'Wajib sebelum terbit' : 'Isi detailmu'}
                </span>
              )}
            </span>
            {def.optional && (
              <Switch
                on={on}
                label={`Tampilkan ${def.label}`}
                onChange={(value) =>
                  update((current) => ({
                    ...current,
                    off: value ? current.off.filter((item) => item !== id) : [...current.off, id],
                  }))
                }
              />
            )}
          </div>
        )
      })}
      <p className="st-tip">Geser ikon titik untuk mengubah urutan. Sampul, pembuka, dan penutup tetap di tempatnya.</p>
    </div>
  )
}

function FieldCard({
  label,
  sample,
  visible,
  onVisible,
  children,
  note,
}: {
  label: string
  sample?: boolean
  visible?: boolean
  onVisible?: (visible: boolean) => void
  children: ReactNode
  note?: string
}) {
  return (
    <div className={cn('st-field', visible === false && 'is-hidden')}>
      <div className="st-field-head">
        <span className="st-field-label">
          {label}
          {sample && <span className="st-badge">Contoh</span>}
        </span>
        {onVisible && (
          <label className="st-visible">
            <input type="checkbox" checked={visible} onChange={(event) => onVisible(event.target.checked)} />
            {visible ? 'Tampil' : 'Disembunyikan'}
          </label>
        )}
      </div>
      {children}
      {note && <p className="st-hint">{note}</p>}
    </div>
  )
}

function PhotoInput({
  value,
  onChange,
  sample,
}: {
  value: string
  onChange: (value: string) => void
  sample?: string
}) {
  const { doc } = useStudio()
  const { upload, busy } = useUpload()
  const [picking, setPicking] = useState(false)
  const palette = palettes[doc.theme]
  const library = usedPhotos(doc).filter((id) => id !== value)
  return (
    <div className="st-photo">
      <div className="st-photo-thumb">
        {value ? (
          <img src={mediaUrl(value)} alt="" />
        ) : sample ? (
          <SampleArt name={sample} palette={palette} />
        ) : (
          <Icon name="booth" size={22} />
        )}
      </div>
      <div className="st-photo-actions">
        <label className={cn('st-button is-small', busy && 'is-busy')}>
          <Icon name="upload" size={15} /> {busy ? 'Mengunggah...' : value ? 'Ganti foto' : 'Unggah foto'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              const id = await upload(file)
              if (id) onChange(id)
            }}
          />
        </label>
        {library.length > 0 && (
          <button type="button" className="st-button is-small is-ghost" onClick={() => setPicking(!picking)}>
            Pilih dari unggahan
          </button>
        )}
        {value && (
          <button type="button" className="st-icon-button" aria-label="Hapus foto" onClick={() => onChange('')}>
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>
      {picking && (
        <div className="st-photo-library">
          {library.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange(id)
                setPicking(false)
              }}
            >
              <img src={mediaUrl(id)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ section, field }: { section: SectionId; field: FieldDef }) {
  const { doc, update } = useStudio()
  const key = `${section}.${field.key}`
  const palette = palettes[doc.theme]
  const typed = doc.values[key]
  let fallback = field.default?.[doc.lang] ?? ''
  if (fallback.startsWith('theme:')) {
    const swatch = palette.swatches[Number(fallback.slice(6)) - 1]
    fallback = field.kind === 'color' ? (swatch?.hex ?? '#cccccc') : (swatch?.name ?? '')
  }
  const value = typed ?? fallback
  const visible = doc.show[key] ?? !field.off
  const isSample = Boolean(field.sample) && !typed?.trim()
  const change = (next: string) => update((current) => setValue(current, key, next, fallback))
  const onVisible = (next: boolean) =>
    update((current) => {
      const show = { ...current.show }
      if (next === !field.off) delete show[key]
      else show[key] = next
      return { ...current, show }
    })
  const placeholder = field.sample?.[doc.lang]
  const note = isSample
    ? 'Pratinjau menampilkan contoh tema. Tamu tidak melihat apa pun di sini sampai kamu mengisinya.'
    : undefined
  return (
    <FieldCard
      label={field.label}
      sample={isSample}
      visible={visible}
      onVisible={onVisible}
      note={field.kind === 'photo' ? undefined : note}
    >
      {field.kind === 'photo' ? (
        <PhotoInput value={typed ?? ''} onChange={change} sample={field.sample?.id} />
      ) : field.kind === 'long' ? (
        <textarea
          className="st-input"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(event) => change(event.target.value)}
          maxLength={2000}
        />
      ) : field.kind === 'color' ? (
        <div className="st-color">
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#cccccc'}
            onChange={(event) => change(event.target.value)}
          />
          <input className="st-input" value={value} onChange={(event) => change(event.target.value)} maxLength={7} />
        </div>
      ) : (
        <input
          className="st-input"
          type={field.kind === 'link' ? 'url' : 'text'}
          value={value}
          placeholder={placeholder}
          onChange={(event) => change(event.target.value)}
          maxLength={field.kind === 'link' ? 600 : 300}
        />
      )}
    </FieldCard>
  )
}

function EventsEditor() {
  const { doc, update } = useStudio()
  const change = (index: number, patch: Partial<InvitationEvent>) =>
    update((current) => ({
      ...current,
      events: current.events.map((event, position) => (position === index ? { ...event, ...patch } : event)),
    }))
  return (
    <div className="st-events">
      {doc.events.map((event, index) => (
        <div key={event.id} className="st-event">
          <div className="st-event-head">
            <strong>Acara {index + 1}</strong>
            <button
              type="button"
              className="st-icon-button"
              aria-label={`Hapus acara ${index + 1}`}
              onClick={() =>
                update((current) => ({
                  ...current,
                  events: current.events.filter((_, position) => position !== index),
                }))
              }
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
          <label className="st-label">
            Nama acara
            <input
              className="st-input"
              value={event.title}
              maxLength={80}
              onChange={(change_) => change(index, { title: change_.target.value })}
            />
          </label>
          <div className="st-grid-3">
            <label className="st-label">
              Tanggal
              <input
                className="st-input"
                type="date"
                value={event.date}
                onChange={(change_) => change(index, { date: change_.target.value })}
              />
            </label>
            <label className="st-label">
              Mulai
              <input
                className="st-input"
                type="time"
                value={event.start}
                onChange={(change_) => change(index, { start: change_.target.value })}
              />
            </label>
            <label className="st-label">
              Selesai
              <input
                className="st-input"
                type="time"
                value={event.end}
                disabled={event.untilDone}
                onChange={(change_) => change(index, { end: change_.target.value })}
              />
            </label>
          </div>
          <div className="st-row">
            <label className="st-check">
              <input
                type="checkbox"
                checked={event.untilDone}
                onChange={(change_) => change(index, { untilDone: change_.target.checked })}
              />
              Sampai selesai
            </label>
            <select
              className="st-input is-auto"
              value={event.tz}
              onChange={(change_) => change(index, { tz: change_.target.value as InvitationEvent['tz'] })}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {timezoneLabel[zone]}
                </option>
              ))}
            </select>
          </div>
          <label className="st-label">
            Tempat
            <input
              className="st-input"
              value={event.venue}
              maxLength={160}
              placeholder="Gedung, masjid, gereja, rumah"
              onChange={(change_) => change(index, { venue: change_.target.value })}
            />
          </label>
          <label className="st-label">
            Alamat
            <input
              className="st-input"
              value={event.address}
              maxLength={300}
              onChange={(change_) => change(index, { address: change_.target.value })}
            />
          </label>
          <label className="st-label">
            Link Google Maps
            <input
              className="st-input"
              type="url"
              value={event.maps}
              placeholder="https://maps.app.goo.gl/..."
              onChange={(change_) => change(index, { maps: change_.target.value })}
            />
          </label>
        </div>
      ))}
      {doc.events.length < maxEvents && (
        <button
          type="button"
          className="st-button is-dashed"
          onClick={() =>
            update((current) => ({ ...current, events: [...current.events, newEvent(current.events.length)] }))
          }
        >
          <Icon name="plus" size={16} /> Tambah acara
        </button>
      )}
      <p className="st-hint">
        Maksimal {maxEvents} acara. Di tab Tamu kamu bisa memilih acara mana yang dilihat tiap tamu.
      </p>
    </div>
  )
}

function GalleryEditor() {
  const { doc, update } = useStudio()
  const { upload, busy } = useUpload()
  const moveItem = (index: number, delta: number) =>
    update((current) => {
      const gallery = [...current.gallery]
      const target = index + delta
      if (target < 0 || target >= gallery.length) return current
      const [item] = gallery.splice(index, 1)
      if (item) gallery.splice(target, 0, item)
      return { ...current, gallery }
    })
  return (
    <div className="st-gallery">
      <div className="st-gallery-grid">
        {doc.gallery.map((id, index) => (
          <div key={id} className="st-gallery-item">
            <img src={mediaUrl(id)} alt="" />
            <div className="st-gallery-tools">
              <button type="button" aria-label="Geser ke kiri" onClick={() => moveItem(index, -1)}>
                <Icon name="up" size={14} />
              </button>
              <button type="button" aria-label="Geser ke kanan" onClick={() => moveItem(index, 1)}>
                <Icon name="down" size={14} />
              </button>
              <button
                type="button"
                aria-label="Hapus foto"
                onClick={() =>
                  update((current) => ({ ...current, gallery: current.gallery.filter((item) => item !== id) }))
                }
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))}
        {doc.gallery.length < maxGallery && (
          <label className={cn('st-gallery-add', busy && 'is-busy')}>
            <Icon name="plus" />
            <span>{busy ? 'Mengunggah...' : 'Tambah foto'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={async (event) => {
                const files = [...(event.target.files ?? [])].slice(0, maxGallery - doc.gallery.length)
                event.target.value = ''
                for (const file of files) {
                  const id = await upload(file)
                  if (id) update((current) => ({ ...current, gallery: [...current.gallery, id].slice(0, maxGallery) }))
                }
              }}
            />
          </label>
        )}
      </div>
      <p className="st-hint">
        {doc.gallery.length} dari {maxGallery} foto. Foto pertama tampil paling besar.
      </p>
    </div>
  )
}

let previewAudio: HTMLAudioElement | null = null

function MusicPicker() {
  const { doc, update, invitation } = useStudio()
  const [playing, setPlaying] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const palette = palettes[doc.theme]
  useEffect(() => () => previewAudio?.pause(), [])
  const play = (key: string, src: string) => {
    previewAudio?.pause()
    if (playing === key) {
      setPlaying(null)
      return
    }
    previewAudio = new Audio(src)
    void previewAudio.play()
    previewAudio.onended = () => setPlaying(null)
    setPlaying(key)
  }
  const music = doc.music
  const option = (key: string, label: string, sub: string, selected: boolean, onPick: () => void, src?: string) => (
    <div key={key} className={cn('st-music', selected && 'is-on')}>
      <button type="button" className="st-music-pick" onClick={onPick}>
        <span className="st-radio" />
        <span>
          <strong>{label}</strong>
          <small>{sub}</small>
        </span>
      </button>
      {src && (
        <button
          type="button"
          className="st-icon-button"
          aria-label={playing === key ? 'Jeda' : 'Putar'}
          onClick={() => play(key, src)}
        >
          <Icon name={playing === key ? 'pause' : 'play'} size={16} />
        </button>
      )}
    </div>
  )
  return (
    <div className="st-music-list">
      {option(
        'theme',
        'Lagu tema',
        `${songs[palette.song].title} · ${songs[palette.song].artist}`,
        music.mode === 'theme',
        () => update((current) => ({ ...current, music: { mode: 'theme' } })),
        songs[palette.song].src,
      )}
      {recordings
        .filter((id) => id !== palette.song)
        .map((id) =>
          option(
            id,
            songs[id].title,
            songs[id].artist,
            music.mode === 'recording' && music.id === id,
            () => update((current) => ({ ...current, music: { mode: 'recording', id } })),
            songs[id].src,
          ),
        )}
      <div className={cn('st-music', music.mode === 'upload' && 'is-on')}>
        <label className="st-music-pick">
          <span className="st-radio" />
          <span>
            <strong>{music.mode === 'upload' ? music.title : busy ? 'Mengunggah...' : 'Unggah lagu sendiri'}</strong>
            <small>MP3 sampai 1,4 MB</small>
          </span>
          <input
            type="file"
            accept="audio/mpeg,.mp3"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              if (file.size > 1_400_000) return toast('Lagu terlalu besar. Maksimal 1,4 MB.')
              setBusy(true)
              try {
                const { mediaId } = await client.invitations.upload({
                  id: invitation.id,
                  kind: 'audio',
                  data: await fileToBase64(file),
                })
                const title = file.name.replace(/\.mp3$/i, '').slice(0, 120)
                update((current) => ({ ...current, music: { mode: 'upload', mediaId, title, start: 0 } }))
              } catch (error) {
                toast(errorMessage(error, 'Lagu gagal diunggah'))
              } finally {
                setBusy(false)
              }
            }}
          />
        </label>
        {music.mode === 'upload' && (
          <button
            type="button"
            className="st-icon-button"
            aria-label="Putar"
            onClick={() => play('upload', mediaUrl(music.mediaId))}
          >
            <Icon name={playing === 'upload' ? 'pause' : 'play'} size={16} />
          </button>
        )}
      </div>
      {music.mode === 'upload' && (
        <div className="st-grid-2">
          <label className="st-label">
            Mulai dari detik
            <input
              className="st-input"
              type="number"
              min={0}
              max={3600}
              value={music.start}
              onChange={(event) =>
                update((current) =>
                  current.music.mode === 'upload'
                    ? { ...current, music: { ...current.music, start: Number(event.target.value) || 0 } }
                    : current,
                )
              }
            />
          </label>
          <label className="st-label">
            Ulang di detik
            <input
              className="st-input"
              type="number"
              min={0}
              max={3600}
              value={music.end ?? ''}
              placeholder="Sampai habis"
              onChange={(event) =>
                update((current) =>
                  current.music.mode === 'upload'
                    ? {
                        ...current,
                        music: { ...current.music, end: event.target.value ? Number(event.target.value) : undefined },
                      }
                    : current,
                )
              }
            />
          </label>
        </div>
      )}
      {option('off', 'Tanpa musik', 'Undangan tanpa lagu latar', music.mode === 'off', () =>
        update((current) => ({ ...current, music: { mode: 'off' } })),
      )}
    </div>
  )
}

function GeneralForm({ onSelect }: { onSelect: (value: Selection) => void }) {
  const { doc, update } = useStudio()
  const uses = (token: RegExp) => {
    let count = 0
    for (const section of Object.values(sectionById)) {
      for (const field of section.fields) {
        const text = doc.values[`${section.id}.${field.key}`] ?? field.default?.[doc.lang] ?? ''
        if (token.test(text)) count++
      }
    }
    return count
  }
  return (
    <div className="st-form-body">
      <FieldCard label="Nama panggilan" note="Tulis @wanita atau @pria di teks mana pun, nanti otomatis jadi nama ini.">
        <div className="st-grid-2">
          <label className="st-label">
            Mempelai wanita
            <input
              className="st-input"
              value={doc.names.bride}
              maxLength={40}
              onChange={(event) =>
                update((current) => ({ ...current, names: { ...current.names, bride: event.target.value } }))
              }
            />
            <small>Dipakai di {uses(/@(wanita|bride)\b/i)} teks</small>
          </label>
          <label className="st-label">
            Mempelai pria
            <input
              className="st-input"
              value={doc.names.groom}
              maxLength={40}
              onChange={(event) =>
                update((current) => ({ ...current, names: { ...current.names, groom: event.target.value } }))
              }
            />
            <small>Dipakai di {uses(/@(pria|groom)\b/i)} teks</small>
          </label>
        </div>
      </FieldCard>
      <FieldCard label="Acara">
        {doc.events.length ? (
          <ul className="st-mini-list">
            {doc.events.map((event) => (
              <li key={event.id}>
                <strong>{event.title || 'Tanpa nama'}</strong> {event.date || 'tanggal belum diisi'} {event.start}
              </li>
            ))}
          </ul>
        ) : (
          <p className="st-muted">Belum ada acara.</p>
        )}
        <button type="button" className="st-button is-small" onClick={() => onSelect('events')}>
          Atur di bagian Acara
        </button>
      </FieldCard>
      <FieldCard label="Tema">
        <div className="st-theme-pick">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={cn('st-theme', doc.theme === theme.id && 'is-on')}
              onClick={() => update((current) => ({ ...current, theme: theme.id }))}
            >
              <span className="st-theme-art">
                <ThemeThumb theme={theme.id} />
              </span>
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
        <p className="st-hint">Ganti tema kapan saja. Semua yang sudah kamu isi tetap ada.</p>
      </FieldCard>
      <FieldCard label="Bahasa">
        <div className="st-segment">
          {(
            [
              ['id', 'Bahasa Indonesia'],
              ['en', 'English'],
            ] as const
          ).map(([lang, label]) => (
            <button
              key={lang}
              type="button"
              aria-pressed={doc.lang === lang}
              onClick={() => update((current) => ({ ...current, lang }))}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="st-hint">Mengganti teks bawaan tema. Teks yang kamu ketik tidak berubah.</p>
      </FieldCard>
      <FieldCard label="Musik latar">
        <MusicPicker />
      </FieldCard>
    </div>
  )
}

function SectionForm({ section }: { section: SectionId }) {
  const { doc } = useStudio()
  const def = sectionById[section]
  const missing = missingFields(doc, section)
  const body = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => {
    const result: { group?: string; fields: FieldDef[] }[] = []
    for (const field of def.fields) {
      const last = result.at(-1)
      if (field.group && last?.group === field.group) last.fields.push(field)
      else result.push({ group: field.group, fields: [field] })
    }
    return result
  }, [def])
  return (
    <div className="st-form-body" ref={body}>
      {def.hint && <p className="st-note">{def.hint}</p>}
      {missing > 0 && (
        <button
          type="button"
          className="st-missing"
          onClick={() =>
            body.current
              ?.querySelector('.st-badge')
              ?.closest('.st-field')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        >
          <Icon name="warn" size={15} /> {missing} detail belum diisi <span>Tunjukkan</span>
        </button>
      )}
      {(section === 'booth' || section === 'camera') && (
        <div className="st-note is-box">
          Bagian ini hanya menampilkan tombol untuk tamu. Pengaturan lengkapnya ada di tab{' '}
          {section === 'booth' ? 'Booth' : 'Kamera'}.
        </div>
      )}
      {groups.map((group) =>
        group.group ? (
          <div key={group.group} className="st-group">
            {group.fields.map((field) => (
              <Field key={field.key} section={section} field={field} />
            ))}
          </div>
        ) : (
          group.fields.map((field) => <Field key={field.key} section={section} field={field} />)
        ),
      )}
      {section === 'events' && <EventsEditor />}
      {section === 'gallery' && <GalleryEditor />}
    </div>
  )
}

function Preview({ selected, onPick }: { selected: Selection; onPick: (value: Selection) => void }) {
  const { doc, invitation } = useStudio()
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone')
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const size = device === 'phone' ? { width: 390, height: 800 } : { width: 1180, height: 760 }
  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setScale(Math.min(1, width / (size.width + 24), height / (size.height + 24)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [size.width, size.height])
  const palette = palettes[doc.theme]
  const invite = (
    <Invitation
      doc={doc}
      mode="preview"
      autoplay={false}
      opened={selected !== 'cover'}
      onPick={(section) => onPick(section)}
      scrollTo={selected === 'general' ? null : selected}
      slug={invitation.slug}
    />
  )
  return (
    <div className="st-preview">
      <div className="st-preview-bar">
        <div className="st-segment is-small">
          <button
            type="button"
            aria-pressed={device === 'phone'}
            onClick={() => setDevice('phone')}
            aria-label="Ponsel"
          >
            <Icon name="phone" size={16} />
          </button>
          <button
            type="button"
            aria-pressed={device === 'desktop'}
            onClick={() => setDevice('desktop')}
            aria-label="Desktop"
          >
            <Icon name="desktop" size={16} />
          </button>
        </div>
        <a className="st-button is-small" href={`/pratinjau/${invitation.id}`} target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Buka pratinjau
        </a>
      </div>
      <div className="st-preview-box" ref={box}>
        <div
          className={cn('st-device', `is-${device}`)}
          style={{ width: size.width, height: size.height, transform: `scale(${scale})` } as CSSProperties}
        >
          {device === 'phone' ? (
            invite
          ) : (
            <div className="st-desktop" style={{ background: palette.dark ? palette.deep : palette.paper }}>
              <div className="st-desktop-column">{invite}</div>
            </div>
          )}
        </div>
      </div>
      <p className="st-tip">Ketuk bagian mana pun di pratinjau untuk langsung mengubahnya.</p>
    </div>
  )
}

export function BuilderPage() {
  const [selected, setSelected] = useState<Selection>('general')
  const [mobileView, setMobileView] = useState<'list' | 'form' | 'preview'>('list')
  const select = (value: Selection) => {
    setSelected(value)
    setMobileView('form')
  }
  const title = selected === 'general' ? 'Umum' : sectionById[selected].label
  return (
    <div className={cn('st-builder', `show-${mobileView}`)}>
      <SectionList selected={selected} onSelect={select} />
      <section className="st-form" aria-label={title}>
        <div className="st-form-head">
          <button
            type="button"
            className="st-back"
            onClick={() => setMobileView('list')}
            aria-label="Kembali ke daftar bagian"
          >
            <Icon name="back" />
          </button>
          <h2>{title}</h2>
        </div>
        {selected === 'general' ? <GeneralForm onSelect={select} /> : <SectionForm key={selected} section={selected} />}
      </section>
      <Preview
        selected={selected}
        onPick={(value) => {
          setSelected(value)
        }}
      />
      <button
        type="button"
        className="st-fab"
        onClick={() => setMobileView(mobileView === 'preview' ? 'form' : 'preview')}
      >
        <Icon name={mobileView === 'preview' ? 'close' : 'eye'} />{' '}
        {mobileView === 'preview' ? 'Tutup pratinjau' : 'Pratinjau'}
      </button>
    </div>
  )
}
