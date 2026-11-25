import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { client, orpc } from '@/lib/orpc'
import { GuestQr, scanGuestCode } from './wedding-qr'

type Guest = Awaited<ReturnType<typeof client.weddings.guests>>['guests'][number]
type Status = 'all' | 'yes' | 'no' | 'waiting'
type Session = 'ceremony' | 'reception'
type Contact = { name: string; phone: string; email: string }

export function parseGuestContacts(source: string): Contact[] {
  const text = source.replace(/^\uFEFF/, '').trim()
  const first = (text.split(/\r?\n/, 1)[0] ?? '').replace(/"(?:""|[^"])*"/g, '')
  const separator = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"'
        i++
      } else quoted = !quoted
    } else if (!quoted && char === separator) {
      row.push(value.trim())
      value = ''
    } else if (!quoted && (char === '\r' || char === '\n')) {
      row.push(value.trim())
      rows.push(row)
      row = []
      value = ''
      if (char === '\r' && text[i + 1] === '\n') i++
    } else value += char
  }
  if (quoted) throw new Error('Ada tanda kutip yang belum ditutup.')
  rows.push([...row, value.trim()])
  const headers = rows[0]?.map((column) => column.toLowerCase()) ?? []
  const nameIndex = headers.findIndex((value) => value === 'nama' || value === 'name' || value === 'full name')
  const phoneIndex = headers.findIndex((value) => ['telepon', 'phone', 'phone 1 - value'].includes(value))
  const emailIndex = headers.findIndex((value) => ['email', 'e-mail', 'e-mail 1 - value'].includes(value))
  return (nameIndex < 0 ? rows : rows.slice(1))
    .map((columns) => ({
      name: columns[Math.max(nameIndex, 0)] ?? '',
      phone: columns[nameIndex < 0 ? 1 : phoneIndex] ?? '',
      email: columns[nameIndex < 0 ? 2 : emailIndex] ?? '',
    }))
    .filter((guest) => guest.name)
}

function invitationUrl(weddingId: string, guestId: string) {
  return new URL(`/u/${weddingId}/${guestId}`, window.location.origin).href
}

function matches(guest: Guest, term: string) {
  return [guest.name, guest.email, guest.phone, guest.id].some((value) => value.toLowerCase().includes(term))
}

function replyLabel(guest: Guest) {
  return guest.attending === null ? 'Belum jawab' : guest.attending ? 'Hadir' : 'Berhalangan'
}

function exportGuests(guests: Guest[]) {
  const rows = [
    ['Nama', 'Telepon', 'Email', 'RSVP', 'Check-in Akad', 'Check-in Resepsi'],
    ...guests.map((g) => [g.name, g.phone, g.email, replyLabel(g), g.ceremony ?? '', g.reception ?? '']),
  ]
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const safe = /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value
          return `"${safe.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'hari-bersama-tamu.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function WeddingOverview({
  currentId,
  weddingId,
  onOpen,
  onCreate,
  onSave,
  onPreview,
  preview,
  pending,
  saveMessage,
}: {
  currentId: string
  weddingId?: string
  onOpen: (id: string) => Promise<void>
  onCreate: () => void
  onSave: () => Promise<void>
  onPreview: () => void
  preview: ReactNode
  pending: boolean
  saveMessage: string
}) {
  const drafts = useQuery(orpc.weddings.drafts.queryOptions())
  const guests = useQuery(
    orpc.weddings.guests.queryOptions({ input: { id: weddingId ?? currentId }, enabled: !!weddingId }),
  )
  const total = guests.data?.guests ?? []
  const first = total[0]
  const [clipboard, setClipboard] = useState('')
  return (
    <section className="wedding-manage wedding-overview">
      <div className="journey-panel">
        <h2>Ringkasan undangan</h2>
        <p>
          {weddingId
            ? 'Sudah terbit. Simpan draft untuk melanjutkan edit, lalu terbitkan perubahan dari Bagikan.'
            : 'Draft pribadi. Terbitkan dari ruang Bagikan saat sudah siap.'}
        </p>
        {weddingId && guests.isError && <p role="alert">Ringkasan tamu belum bisa dimuat.</p>}
        {weddingId && guests.data && (
          <dl className="wedding-stats">
            <div>
              <dt>Tamu</dt>
              <dd>{total.length}</dd>
            </div>
            <div>
              <dt>Hadir</dt>
              <dd>{total.filter((g) => g.attending === true).length}</dd>
            </div>
            <div>
              <dt>Berhalangan</dt>
              <dd>{total.filter((g) => g.attending === false).length}</dd>
            </div>
            <div>
              <dt>Belum jawab</dt>
              <dd>{total.filter((g) => g.attending === null).length}</dd>
            </div>
          </dl>
        )}
        {weddingId && first && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(invitationUrl(weddingId, first.id))
                setClipboard(`Link untuk ${first.name} disalin.`)
              } catch {
                setClipboard('Link belum bisa disalin.')
              }
            }}
          >
            Salin link untuk {first.name}
          </button>
        )}
        <p role="status">{clipboard}</p>
        <div className="wedding-manage-actions">
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              await onSave()
              await drafts.refetch()
            }}
          >
            Simpan draft
          </button>
          <button type="button" disabled={pending} onClick={onCreate}>
            Undangan baru
          </button>
        </div>
        {saveMessage && <p role="status">{saveMessage}</p>}
        <h3>Undangan tersimpan</h3>
        {drafts.isPending && <p>Memuat draft…</p>}
        {drafts.isError && <p role="alert">Daftar draft belum bisa dimuat.</p>}
        {drafts.data?.length === 0 && <p>Belum ada draft tersimpan.</p>}
        <ul>
          {drafts.data?.map((draft) => (
            <li key={draft.id}>
              <button type="button" disabled={pending || draft.id === currentId} onClick={() => void onOpen(draft.id)}>
                {draft.name || 'Undangan tanpa nama'} · {draft.weddingId ? 'Terbit' : 'Draft'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="journey-panel">
        <h3>Pratinjau HP</h3>
        <button type="button" disabled={pending} onClick={onPreview}>
          Buka pratinjau penuh
        </button>
        <div className="studio-canvas" data-device="phone">
          {preview}
        </div>
      </div>
    </section>
  )
}

export function WeddingGuestManager({ id, checkIn = false }: { id: string; checkIn?: boolean }) {
  const query = useQuery(orpc.weddings.guests.queryOptions({ input: { id } }))
  const [search, setSearch] = useState('')
  const [rsvp, setRsvp] = useState<Status>('all')
  const [source, setSource] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<Guest>()
  const [session, setSession] = useState<Session>('ceremony')
  const [camera, setCamera] = useState(false)
  const cameraVideo = useRef<HTMLVideoElement>(null)
  const cameraAbort = useRef<AbortController>(null)
  useEffect(() => () => cameraAbort.current?.abort(), [])

  if (query.isPending) return <p role="status">Memuat daftar tamu…</p>
  if (query.isError) return <p role="alert">Daftar tamu belum bisa dimuat.</p>
  const guests = query.data.guests
  const visible = guests.filter((guest) => {
    const status = guest.attending === null ? 'waiting' : guest.attending ? 'yes' : 'no'
    return (checkIn || rsvp === 'all' || rsvp === status) && matches(guest, search.trim().toLowerCase())
  })

  async function importContacts() {
    setBusy(true)
    setMessage('')
    try {
      const contacts = parseGuestContacts(source)
      if (!contacts.length || contacts.length > 500) throw new Error('Masukkan 1 sampai 500 tamu.')
      if (contacts.some((guest) => guest.name.length > 100 || guest.phone.length > 40 || guest.email.length > 180)) {
        throw new Error('Data terlalu panjang. Periksa kolom nama, telepon, dan email.')
      }
      const result = await client.weddings.addGuests({ id, guests: contacts })
      setSource('')
      setMessage(
        `${result.added} tamu ditambahkan. ${contacts.length - result.added} dilewati karena duplikat atau batas 500 tamu.`,
      )
      await query.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tamu belum bisa ditambahkan.')
    } finally {
      setBusy(false)
    }
  }

  async function record(guestId: string) {
    setBusy(true)
    setMessage('')
    try {
      const guest = guests.find((value) => value.id === guestId)
      if (!guest) throw new Error('Kode QR ini bukan untuk undangan ini.')
      await client.weddings.checkIn({ weddingId: id, guestId, session })
      setMessage(`${guest.name} sudah tercatat untuk ${session === 'ceremony' ? 'akad' : 'resepsi'}.`)
      await query.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Check-in belum tersimpan.')
    } finally {
      setBusy(false)
    }
  }

  async function openCamera() {
    const controller = new AbortController()
    cameraAbort.current = controller
    setCamera(true)
    setMessage('')
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (!cameraVideo.current || controller.signal.aborted) return
      const code = await scanGuestCode(cameraVideo.current, controller.signal)
      if (!code || controller.signal.aborted) return
      const [prefix, weddingId, guestId] = code.split(':')
      if (prefix !== 'hari-bersama' || weddingId !== id || !guestId)
        throw new Error('Kode QR ini bukan untuk undangan ini.')
      await record(guestId)
    } catch {
      if (!controller.signal.aborted) setMessage('QR belum bisa dibaca. Pastikan kamera diizinkan atau cari nama tamu.')
    } finally {
      if (!controller.signal.aborted) setCamera(false)
    }
  }

  return (
    <section className="journey-panel wedding-manage">
      <h2>{checkIn ? 'Absensi tamu' : 'Daftar tamu'}</h2>
      <p>
        {checkIn
          ? `Akad ${guests.filter((g) => g.ceremony).length} · Resepsi ${guests.filter((g) => g.reception).length}`
          : `${guests.length} tamu · ${guests.filter((g) => g.attending).length} hadir`}
      </p>
      {checkIn ? (
        <div className="wedding-manage-actions">
          <label>
            Sesi
            <select
              disabled={busy || camera}
              value={session}
              onChange={(event) => setSession(event.target.value === 'reception' ? 'reception' : 'ceremony')}
            >
              <option value="ceremony">Akad</option>
              <option value="reception">Resepsi</option>
            </select>
          </label>
          {camera ? (
            <>
              <button
                type="button"
                onClick={() => {
                  cameraAbort.current?.abort()
                  setCamera(false)
                }}
              >
                Tutup kamera
              </button>
              <video ref={cameraVideo} muted playsInline aria-label="Kamera pemindai QR">
                <track kind="captions" />
              </video>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => void openCamera()}>
              Pindai QR
            </button>
          )}
        </div>
      ) : (
        <>
          <details>
            <summary>Tambah tamu atau impor CSV</summary>
            <label>
              Nama, telepon, email
              <textarea
                placeholder="Nama,Telepon,Email"
                maxLength={160000}
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </label>
            <label>
              Pilih file CSV
              <input
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0]
                  if (!file) return
                  if (file.size > 160000) {
                    setMessage('File CSV terlalu besar.')
                    return
                  }
                  try {
                    setSource(await file.text())
                  } catch {
                    setMessage('File CSV belum bisa dibaca.')
                  }
                }}
              />
            </label>
            <button type="button" disabled={busy || !source.trim()} onClick={() => void importContacts()}>
              Tambah ke daftar tamu
            </button>
          </details>
          <button type="button" disabled={!guests.length} onClick={() => exportGuests(guests)}>
            Ekspor CSV
          </button>
          <label>
            Filter RSVP
            <select value={rsvp} onChange={(event) => setRsvp(event.target.value as Status)}>
              <option value="all">Semua</option>
              <option value="yes">Hadir</option>
              <option value="no">Berhalangan</option>
              <option value="waiting">Belum jawab</option>
            </select>
          </label>
        </>
      )}
      <label>
        Cari tamu
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <p role="status">{message}</p>
      {qr && (
        <div className="wedding-guest-qr-panel">
          <h3>{qr.name}</h3>
          <GuestQr weddingId={id} guestId={qr.id} />
          <button type="button" onClick={() => setQr(undefined)}>
            Tutup QR
          </button>
        </div>
      )}
      <ul className="wedding-guest-list">
        {visible.map((guest) => (
          <li key={guest.id}>
            <div>
              <strong>{guest.name}</strong>
              <span>{checkIn ? (guest[session] ? 'Sudah check-in' : 'Belum check-in') : replyLabel(guest)}</span>
            </div>
            {checkIn ? (
              <button type="button" disabled={busy || camera || !!guest[session]} onClick={() => void record(guest.id)}>
                Check-in
              </button>
            ) : (
              <div className="wedding-manage-actions">
                <a href={invitationUrl(id, guest.id)} target="_blank" rel="noreferrer">
                  Buka link
                </a>
                <a
                  href={`https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${guest.name}, kami mengundang kamu ke pernikahan kami. ${invitationUrl(id, guest.id)}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
                <button type="button" onClick={() => setQr(guest)}>
                  QR tamu
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!visible.length && <p>Belum ada tamu yang cocok.</p>}
    </section>
  )
}

export function WeddingIssueReport({ page }: { page: string }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  return (
    <details className="journey-panel wedding-issue-report">
      <summary>Laporkan masalah</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          setStatus('')
          try {
            await client.weddings.report({ page, message })
            setMessage('')
            setStatus('Laporan tersimpan.')
          } catch {
            setStatus('Laporan belum tersimpan. Coba lagi.')
          } finally {
            setPending(false)
          }
        }}
      >
        <label>
          Apa yang terjadi?
          <textarea
            minLength={6}
            maxLength={2000}
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button type="submit" disabled={pending || message.trim().length < 6}>
          Kirim laporan
        </button>
        <p role="status">{status}</p>
      </form>
    </details>
  )
}
