import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { useMemo, useState } from 'react'
import { client, errorMessage, orpc } from '@/lib/orpc'
import { copyText, toast } from '@/lib/toast'
import { liveUrl, useStudio } from './context'
import { Gate } from './gate'
import { Icon } from './icons'
import { Modal } from './modal'

type Guest = Awaited<ReturnType<typeof client.invitations.guests>>[number]
type Filter = 'all' | 'yes' | 'no' | 'none'

const templateKey = 'hb-wa-template'
const defaultTemplate =
  'Halo {nama}!\n\nDengan penuh syukur, kami mengundangmu ke pernikahan {mempelai}.\n\nBuka undangannya di sini:\n{link}\n\nSampai jumpa di hari bahagia kami.'

function readTemplate() {
  try {
    return localStorage.getItem(templateKey) ?? defaultTemplate
  } catch {
    return defaultTemplate
  }
}

/** One guest per line: name, phone, email, label. Commas, tabs and semicolons all work, so a spreadsheet paste does too. */
export function parseGuests(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) => cell.trim().replace(/^"|"$/g, '')))
  const header = rows[0]?.map((cell) => cell.toLowerCase())
  const hasHeader = header?.some((cell) => ['nama', 'name'].includes(cell))
  const index = (names: string[], fallback: number) => {
    const found = header?.findIndex((cell) => names.includes(cell)) ?? -1
    return hasHeader ? found : fallback
  }
  const name = index(['nama', 'name'], 0)
  const phone = index(['hp', 'telepon', 'phone', 'no hp', 'whatsapp', 'wa'], 1)
  const email = index(['email', 'e-mail'], 2)
  const label = index(['label', 'grup', 'group', 'kelompok'], 3)
  const seats = index(['kursi', 'seats', 'jumlah'], 4)
  return (hasHeader ? rows.slice(1) : rows)
    .map((cells) => ({
      name: (cells[name] ?? '').slice(0, 100),
      phone: phone >= 0 ? (cells[phone] ?? '').slice(0, 40) : '',
      email: email >= 0 ? (cells[email] ?? '').slice(0, 180) : '',
      label: label >= 0 ? (cells[label] ?? '').slice(0, 60) : '',
      seats: seats >= 0 && Number(cells[seats]) > 0 ? Math.min(20, Number(cells[seats])) : undefined,
    }))
    .filter((guest) => guest.name)
}

function whatsappUrl(phone: string, text: string) {
  let number = phone.replace(/[^\d+]/g, '')
  if (number.startsWith('0')) number = `62${number.slice(1)}`
  number = number.replace(/^\+/, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

function csv(guests: Guest[], events: Record<string, string>) {
  const quote = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const head = ['nama', 'hp', 'email', 'label', 'kursi', 'acara', 'balasan', 'jumlah datang', 'check-in', 'kode']
  const rows = guests.map((guest) =>
    [
      guest.name,
      guest.phone,
      guest.email,
      guest.label,
      guest.seats,
      guest.events ? guest.events.map((id) => events[id] ?? id).join(' + ') : 'Semua',
      guest.attending === null ? 'Belum' : guest.attending ? 'Hadir' : 'Tidak hadir',
      guest.party,
      guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleString('id-ID') : '',
      guest.code,
    ]
      .map(quote)
      .join(','),
  )
  return [head.join(','), ...rows].join('\n')
}

function EventPicker({ value, onChange }: { value: string[] | null; onChange: (value: string[] | null) => void }) {
  const { doc } = useStudio()
  if (doc.events.length < 2) return null
  return (
    <div className="st-row">
      <label className="st-check">
        <input
          type="checkbox"
          checked={value === null}
          onChange={() => onChange(value === null ? doc.events.map((event) => event.id) : null)}
        />
        Semua acara
      </label>
      {value !== null &&
        doc.events.map((event) => (
          <label key={event.id} className="st-check">
            <input
              type="checkbox"
              checked={value.includes(event.id)}
              onChange={(change) =>
                onChange(change.target.checked ? [...value, event.id] : value.filter((item) => item !== event.id))
              }
            />
            {event.title || 'Acara'}
          </label>
        ))}
    </div>
  )
}

function AddGuests({ onAdded }: { onAdded: () => void }) {
  const { invitation } = useStudio()
  const [text, setText] = useState('')
  const [seats, setSeats] = useState(2)
  const [events, setEvents] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const parsed = parseGuests(text)
  const add = async () => {
    setBusy(true)
    try {
      const result = await client.invitations.addGuests({
        id: invitation.id,
        guests: parsed.map((guest) => ({
          ...guest,
          seats: guest.seats ?? seats,
          events: events?.length ? events : null,
        })),
      })
      toast(`${result.added} tamu ditambahkan${result.skipped ? `, ${result.skipped} dilewati karena sudah ada` : ''}`)
      setText('')
      onAdded()
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="st-card">
      <h2>Tambah tamu</h2>
      <p className="st-muted">
        Satu tamu per baris: <code>nama, nomor HP, email, label</code>. Bisa juga tempel langsung dari spreadsheet atau
        unggah CSV.
      </p>
      <textarea
        className="st-input"
        rows={5}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'Tante Rina, 0812 3456 7890\nDika, , dika@email.com, Kantor\nKeluarga Pak Hartono'}
        style={{ marginTop: 12 }}
      />
      <div className="st-row" style={{ marginTop: 12 }}>
        <label className="st-check">
          Kursi per tamu
          <select className="st-input is-auto" value={seats} onChange={(event) => setSeats(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="st-button is-small">
          <Icon name="upload" size={15} /> Unggah CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) setText(await file.text())
            }}
          />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <EventPicker value={events} onChange={setEvents} />
      </div>
      <div className="st-row is-between" style={{ marginTop: 14 }}>
        <span className="st-muted">
          {parsed.length ? `${parsed.length} tamu siap ditambahkan` : 'Belum ada tamu di kotak'}
        </span>
        <button type="button" className="st-button is-dark" disabled={!parsed.length || busy} onClick={add}>
          {busy ? 'Menambahkan...' : 'Tambahkan'}
        </button>
      </div>
    </div>
  )
}

function ShareLink() {
  const { invitation } = useStudio()
  const [name, setName] = useState('')
  const slug = invitation.slug
  if (!slug) return null
  const link = `${liveUrl(slug)}${name.trim() ? `?untuk=${encodeURIComponent(name.trim())}` : ''}`
  return (
    <div className="st-card">
      <h2>Link bagikan</h2>
      <p className="st-muted">
        Untuk grup chat. Ketik nama (boleh kosong) lalu salin. Siapa pun yang membuka bisa menulis ucapan, tapi tidak
        bisa konfirmasi hadir.
      </p>
      <div className="st-row" style={{ marginTop: 12 }}>
        <input
          className="st-input"
          style={{ flex: 1, minWidth: 200 }}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Contoh: Teman SMA"
        />
        <button type="button" className="st-button is-dark" onClick={() => void copyText(link, 'Link disalin')}>
          <Icon name="copy" size={15} /> Salin link
        </button>
      </div>
    </div>
  )
}

function GuestEditor({ guest, onClose, onSaved }: { guest: Guest; onClose: () => void; onSaved: () => void }) {
  const { invitation } = useStudio()
  const [draft, setDraft] = useState({ ...guest })
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await client.invitations.updateGuest({
        id: invitation.id,
        guestId: guest.id,
        guest: {
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          label: draft.label,
          events: draft.events,
          seats: draft.seats,
        },
      })
      onSaved()
      onClose()
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal label="Ubah tamu" onClose={onClose}>
      <h2>Ubah tamu</h2>
      <label className="st-label">
        Nama
        <input
          className="st-input"
          value={draft.name}
          maxLength={100}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <div className="st-grid-2">
        <label className="st-label">
          Nomor HP
          <input
            className="st-input"
            value={draft.phone}
            maxLength={40}
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
        </label>
        <label className="st-label">
          Email
          <input
            className="st-input"
            value={draft.email}
            maxLength={180}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          />
        </label>
        <label className="st-label">
          Label
          <input
            className="st-input"
            value={draft.label}
            maxLength={60}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
        </label>
        <label className="st-label">
          Kursi
          <input
            className="st-input"
            type="number"
            min={1}
            max={20}
            value={draft.seats}
            onChange={(event) =>
              setDraft({ ...draft, seats: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })
            }
          />
        </label>
      </div>
      <EventPicker value={draft.events} onChange={(events) => setDraft({ ...draft, events })} />
      <div className="st-row is-end">
        <button type="button" className="st-button" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="st-button is-dark" disabled={busy || !draft.name.trim()} onClick={save}>
          Simpan
        </button>
      </div>
    </Modal>
  )
}

function GuestList() {
  const { invitation, doc } = useStudio()
  const queryClient = useQueryClient()
  const guests = useQuery(orpc.invitations.guests.queryOptions({ input: { id: invitation.id } }))
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Guest | null>(null)
  const [template, setTemplate] = useState(readTemplate)
  const [showTemplate, setShowTemplate] = useState(false)
  const reload = () =>
    queryClient.invalidateQueries({ queryKey: orpc.invitations.guests.key({ input: { id: invitation.id } }) })
  const eventNames = Object.fromEntries(doc.events.map((event) => [event.id, event.title || 'Acara']))
  const list = (guests.data ?? []).filter((guest) => !guest.walkIn)
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return list.filter(
      (guest) =>
        (filter === 'all' ||
          (filter === 'yes' && guest.attending === true) ||
          (filter === 'no' && guest.attending === false) ||
          (filter === 'none' && guest.attending === null)) &&
        (!needle || `${guest.name} ${guest.label} ${guest.phone}`.toLowerCase().includes(needle)),
    )
  }, [list, filter, search])
  const stats = {
    total: list.length,
    yes: list.filter((guest) => guest.attending).length,
    people: list.reduce((sum, guest) => sum + (guest.attending ? (guest.party ?? 0) : 0), 0),
    no: list.filter((guest) => guest.attending === false).length,
    none: list.filter((guest) => guest.attending === null).length,
  }
  const linkFor = (guest: Guest) => (invitation.slug ? `${liveUrl(invitation.slug)}?tamu=${guest.code}` : '')
  const message = (guest: Guest) =>
    template
      .replaceAll('{nama}', guest.name)
      .replaceAll('{mempelai}', `${doc.names.bride} & ${doc.names.groom}`)
      .replaceAll('{link}', linkFor(guest))
  const bulk = async (action: 'remove' | 'events', events?: string[] | null) => {
    try {
      if (action === 'remove') {
        if (!window.confirm(`Hapus ${selected.length} tamu? Balasan mereka ikut terhapus.`)) return
        await client.invitations.removeGuests({ id: invitation.id, guestIds: selected })
      } else {
        await client.invitations.guestEvents({ id: invitation.id, guestIds: selected, events: events ?? null })
      }
      setSelected([])
      await reload()
    } catch (error) {
      toast(errorMessage(error))
    }
  }
  return (
    <>
      <div className="st-stats">
        <div className="st-stat">
          <b>{stats.total}</b>
          <span>tamu</span>
        </div>
        <div className="st-stat">
          <b>{stats.yes}</b>
          <span>hadir ({stats.people} orang)</span>
        </div>
        <div className="st-stat">
          <b>{stats.no}</b>
          <span>tidak hadir</span>
        </div>
        <div className="st-stat">
          <b>{stats.none}</b>
          <span>belum membalas</span>
        </div>
      </div>
      <AddGuests onAdded={reload} />
      <ShareLink />
      <div className="st-card">
        <div className="st-row is-between">
          <h2>Daftar tamu</h2>
          <div className="st-row">
            <button type="button" className="st-button is-small" onClick={() => setShowTemplate(!showTemplate)}>
              Pesan WhatsApp
            </button>
            <button
              type="button"
              className="st-button is-small"
              disabled={!list.length}
              onClick={() => {
                const blob = new Blob([csv(list, eventNames)], { type: 'text/csv' })
                const anchor = document.createElement('a')
                anchor.href = URL.createObjectURL(blob)
                anchor.download = `tamu-${invitation.slug ?? 'undangan'}.csv`
                anchor.click()
              }}
            >
              <Icon name="download" size={15} /> Ekspor CSV
            </button>
          </div>
        </div>
        {showTemplate && (
          <div className="st-field" style={{ marginTop: 12 }}>
            <span className="st-field-label">Template pesan</span>
            <textarea
              className="st-input"
              rows={6}
              value={template}
              onChange={(event) => {
                setTemplate(event.target.value)
                try {
                  localStorage.setItem(templateKey, event.target.value)
                } catch {
                  // The template still works for this session.
                }
              }}
            />
            <p className="st-hint">
              Pakai {'{nama}'}, {'{mempelai}'}, dan {'{link}'}. Template disimpan di browser ini.
            </p>
          </div>
        )}
        {!invitation.slug && (
          <p className="st-note is-box" style={{ marginTop: 12 }}>
            Link tamu muncul setelah undangan diterbitkan.
          </p>
        )}
        <div className="st-toolbar" style={{ marginTop: 14 }}>
          <label className="st-search">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, label, nomor"
            />
          </label>
          <div className="st-segment is-small">
            {(
              [
                ['all', 'Semua'],
                ['yes', 'Hadir'],
                ['no', 'Tidak'],
                ['none', 'Belum'],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {selected.length > 0 && (
          <div className="st-note is-box st-row" style={{ marginTop: 12 }}>
            <strong>{selected.length} dipilih</strong>
            {doc.events.length > 1 && (
              <>
                <button type="button" className="st-button is-small" onClick={() => bulk('events', null)}>
                  Semua acara
                </button>
                {doc.events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="st-button is-small"
                    onClick={() => bulk('events', [event.id])}
                  >
                    Hanya {event.title || 'acara'}
                  </button>
                ))}
              </>
            )}
            <button type="button" className="st-button is-small" onClick={() => bulk('remove')}>
              <Icon name="trash" size={15} /> Hapus
            </button>
          </div>
        )}
        <div className="st-list" style={{ marginTop: 8 }}>
          {guests.isPending && <p className="st-muted">Memuat tamu...</p>}
          {guests.isSuccess && shown.length === 0 && (
            <p className="st-muted" style={{ padding: 12 }}>
              Belum ada tamu di sini.
            </p>
          )}
          {shown.map((guest) => (
            <div key={guest.id} className="st-list-row">
              <input
                type="checkbox"
                aria-label={`Pilih ${guest.name}`}
                checked={selected.includes(guest.id)}
                onChange={(event) =>
                  setSelected(event.target.checked ? [...selected, guest.id] : selected.filter((id) => id !== guest.id))
                }
              />
              <div className="st-list-main">
                <strong>{guest.name}</strong>
                <span>
                  {[
                    guest.label,
                    guest.phone,
                    `${guest.seats} kursi`,
                    guest.events ? guest.events.map((id) => eventNames[id] ?? id).join(' + ') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <span
                className={cn('st-chip', guest.attending === true && 'is-green', guest.attending === false && 'is-red')}
              >
                {guest.attending === null ? 'Belum' : guest.attending ? `Hadir ${guest.party ?? ''}` : 'Tidak hadir'}
              </span>
              {guest.checkedInAt && <span className="st-chip is-green">Sudah datang</span>}
              <div className="st-row">
                {invitation.slug && (
                  <>
                    <button
                      type="button"
                      className="st-icon-button"
                      aria-label={`Salin link ${guest.name}`}
                      onClick={() => void copyText(linkFor(guest), 'Link tamu disalin')}
                    >
                      <Icon name="copy" size={15} />
                    </button>
                    <a
                      className="st-button is-small"
                      href={
                        guest.phone
                          ? whatsappUrl(guest.phone, message(guest))
                          : `https://wa.me/?text=${encodeURIComponent(message(guest))}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </>
                )}
                <button type="button" className="st-button is-small is-ghost" onClick={() => setEditing(guest)}>
                  Ubah
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editing && <GuestEditor guest={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </>
  )
}

export function GuestsPage() {
  return (
    <div className="st-page">
      <Gate what="daftar tamu">
        <GuestList />
      </Gate>
    </div>
  )
}
