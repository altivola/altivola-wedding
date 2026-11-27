import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { client, errorMessage, orpc } from '@/lib/orpc'
import { toast } from '@/lib/toast'
import { useStudio } from './context'
import { Gate } from './gate'
import { Icon } from './icons'
import { Modal } from './modal'

type Guest = Awaited<ReturnType<typeof client.invitations.guests>>[number]
type Queued = { code: string; party: number; name: string; at: string }

async function scan(video: HTMLVideoElement, signal: AbortSignal) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  const stop = () => {
    for (const track of stream.getTracks()) track.stop()
  }
  try {
    signal.addEventListener('abort', stop, { once: true })
    video.srcObject = stream
    await video.play()
    const { default: decode } = await import('jsqr')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Kamera tidak tersedia')
    while (!signal.aborted) {
      await new Promise((resolve) => window.setTimeout(resolve, 160))
      if (!video.videoWidth || signal.aborted) continue
      canvas.width = Math.min(video.videoWidth, 640)
      canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      const result = decode(frame.data, frame.width, frame.height)
      if (result) return result.data
    }
    return null
  } finally {
    stop()
    video.srcObject = null
  }
}

/** Accepts the invitation QR (HB1:slug:code) and personal links (?tamu=code). */
export function readCode(text: string, slug: string | null) {
  const qr = /^HB1:([a-z0-9-]+):([a-z0-9]{6})$/.exec(text.trim())
  if (qr) return qr[1] === slug ? qr[2] : null
  try {
    const url = new URL(text)
    const code = url.searchParams.get('tamu')
    if (code && /^[a-z0-9]{6}$/.test(code) && url.pathname === `/u/${slug}`) return code
  } catch {
    // Not a link.
  }
  return null
}

function queueKey(id: string) {
  return `hb-checkin-queue-${id}`
}
function readQueue(id: string): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(id)) ?? '[]') as Queued[]
  } catch {
    return []
  }
}
function writeQueue(id: string, queue: Queued[]) {
  try {
    localStorage.setItem(queueKey(id), JSON.stringify(queue))
  } catch {
    // Without storage the queue lives only in memory.
  }
}

function CheckInBoard() {
  const { invitation } = useStudio()
  const queryClient = useQueryClient()
  const guests = useQuery({
    ...orpc.invitations.guests.queryOptions({ input: { id: invitation.id } }),
    refetchInterval: 15_000,
  })
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<Guest | null>(null)
  const [party, setParty] = useState(1)
  const [search, setSearch] = useState('')
  const [walkIn, setWalkIn] = useState({ name: '', party: 1 })
  const [queue, setQueue] = useState<Queued[]>(() => readQueue(invitation.id))
  const video = useRef<HTMLVideoElement>(null)
  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: orpc.invitations.guests.key({ input: { id: invitation.id } }) }),
    [queryClient, invitation.id],
  )

  const flushQueue = useCallback(async () => {
    const pending = readQueue(invitation.id)
    if (!pending.length || !navigator.onLine) return
    const left: Queued[] = []
    for (const item of pending) {
      try {
        await client.invitations.checkIn({ id: invitation.id, code: item.code, party: item.party })
      } catch (error) {
        if (error instanceof TypeError) left.push(item)
      }
    }
    writeQueue(invitation.id, left)
    setQueue(left)
    await reload()
  }, [invitation.id, reload])

  useEffect(() => {
    void flushQueue()
    window.addEventListener('online', flushQueue)
    const timer = window.setInterval(() => void flushQueue(), 20_000)
    return () => {
      window.removeEventListener('online', flushQueue)
      window.clearInterval(timer)
    }
  }, [flushQueue])

  useEffect(() => {
    if (!scanning || !video.current) return
    const controller = new AbortController()
    scan(video.current, controller.signal)
      .then((text) => {
        if (!text) return
        setScanning(false)
        const code = readCode(text, invitation.slug)
        const guest = guests.data?.find((item) => item.code === code)
        if (!guest) {
          toast('Kode ini bukan untuk undangan ini')
          return
        }
        setFound(guest)
        setParty(guest.party || guest.seats)
      })
      .catch(() => {
        setScanning(false)
        toast('Kamera tidak bisa dibuka. Izinkan kamera atau cari nama tamu.')
      })
    return () => controller.abort()
  }, [scanning, guests.data, invitation.slug])

  const confirm = async (guest: Guest, count: number) => {
    try {
      await client.invitations.checkIn({ id: invitation.id, code: guest.code, party: count })
      toast(`${guest.name} tercatat hadir`)
      await reload()
    } catch (error) {
      if (error instanceof TypeError) {
        const next = [
          ...readQueue(invitation.id),
          { code: guest.code, party: count, name: guest.name, at: new Date().toISOString() },
        ]
        writeQueue(invitation.id, next)
        setQueue(next)
        toast(`Sinyal lemah. ${guest.name} disimpan dan dikirim saat online.`)
      } else {
        toast(errorMessage(error))
      }
    } finally {
      setFound(null)
    }
  }

  const undo = async (guest: Guest) => {
    try {
      await client.invitations.checkIn({ id: invitation.id, code: guest.code, party: 1, undo: true })
      await reload()
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  const list = guests.data ?? []
  const listed = list.filter((guest) => !guest.walkIn)
  const arrived = list.filter((guest) => guest.checkedInAt)
  const people = arrived.reduce((sum, guest) => sum + (guest.checkedInParty ?? 0), 0)
  const expected = listed.reduce((sum, guest) => sum + (guest.attending ? (guest.party ?? 0) : 0), 0)
  const needle = search.trim().toLowerCase()
  const matches = needle ? listed.filter((guest) => guest.name.toLowerCase().includes(needle)).slice(0, 12) : []

  return (
    <>
      <div className="st-stats">
        <div className="st-stat">
          <b>
            {people} / {expected}
          </b>
          <span>orang datang dari yang konfirmasi</span>
        </div>
        <div className="st-stat">
          <b>{arrived.filter((guest) => !guest.walkIn).length}</b>
          <span>tamu undangan</span>
        </div>
        <div className="st-stat">
          <b>{arrived.filter((guest) => guest.walkIn).length}</b>
          <span>tamu tanpa undangan</span>
        </div>
        {queue.length > 0 && (
          <div className="st-stat">
            <b>{queue.length}</b>
            <span>menunggu sinyal</span>
          </div>
        )}
      </div>
      <div className="st-card">
        <h2>Scan QR tamu</h2>
        <p className="st-muted">Tamu yang konfirmasi hadir punya QR di undangannya. Arahkan kamera ke kode itu.</p>
        {scanning ? (
          <div className="ci-scan">
            <video ref={video} playsInline muted />
            <button type="button" className="st-button" onClick={() => setScanning(false)}>
              Berhenti
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="st-button is-dark is-large"
            style={{ marginTop: 12 }}
            onClick={() => setScanning(true)}
          >
            <Icon name="scan" /> Mulai scan
          </button>
        )}
      </div>
      {found && (
        <Modal label="Check-in" onClose={() => setFound(null)}>
          <h2>{found.name}</h2>
          <p className="st-muted">
            {found.attending ? `Konfirmasi hadir ${found.party ?? found.seats} orang` : 'Belum konfirmasi'} ·{' '}
            {found.seats} kursi
            {found.checkedInAt ? ' · sudah check-in sebelumnya' : ''}
          </p>
          <div className="ci-stepper">
            <span>Jumlah yang datang</span>
            <button
              type="button"
              className="st-icon-button"
              aria-label="Kurangi"
              onClick={() => setParty(Math.max(1, party - 1))}
            >
              −
            </button>
            <strong>{party}</strong>
            <button
              type="button"
              className="st-icon-button"
              aria-label="Tambah"
              onClick={() => setParty(Math.min(20, party + 1))}
            >
              +
            </button>
          </div>
          {party > found.seats && <p className="st-hint is-bad">Lebih banyak dari undangan. Tetap bisa dicatat.</p>}
          <div className="st-row is-end">
            <button type="button" className="st-button" onClick={() => setFound(null)}>
              Batal
            </button>
            <button type="button" className="st-button is-dark" onClick={() => confirm(found, party)}>
              <Icon name="check" /> Catat hadir
            </button>
          </div>
        </Modal>
      )}
      <div className="st-card">
        <h2>Cari nama</h2>
        <p className="st-muted">Untuk tamu yang lupa QR-nya.</p>
        <label className="st-search" style={{ marginTop: 12 }}>
          <Icon name="search" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ketik nama tamu" />
        </label>
        <div className="st-list" style={{ marginTop: 6 }}>
          {matches.map((guest) => (
            <div key={guest.id} className="st-list-row">
              <div className="st-list-main">
                <strong>{guest.name}</strong>
                <span>
                  {guest.label || 'Tamu'} · {guest.seats} kursi{guest.checkedInAt ? ' · sudah datang' : ''}
                </span>
              </div>
              <button
                type="button"
                className="st-button is-small is-dark"
                onClick={() => {
                  setFound(guest)
                  setParty(guest.party || guest.seats)
                }}
              >
                Check-in
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="st-card">
        <h2>Tamu tanpa undangan</h2>
        <form
          className="st-row"
          style={{ marginTop: 12 }}
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await client.invitations.walkIn({ id: invitation.id, name: walkIn.name.trim(), party: walkIn.party })
              toast(`${walkIn.name} dicatat`)
              setWalkIn({ name: '', party: 1 })
              await reload()
            } catch (error) {
              toast(errorMessage(error))
            }
          }}
        >
          <input
            className="st-input"
            style={{ flex: 1, minWidth: 180 }}
            value={walkIn.name}
            onChange={(event) => setWalkIn({ ...walkIn, name: event.target.value })}
            placeholder="Nama"
            required
            maxLength={100}
          />
          <input
            className="st-input is-auto"
            type="number"
            min={1}
            max={20}
            value={walkIn.party}
            aria-label="Jumlah orang"
            onChange={(event) =>
              setWalkIn({ ...walkIn, party: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })
            }
            style={{ width: 80 }}
          />
          <button type="submit" className="st-button is-dark">
            Catat
          </button>
        </form>
      </div>
      <div className="st-card">
        <h2>Baru datang</h2>
        <div className="st-list" style={{ marginTop: 6 }}>
          {arrived.length === 0 && <p className="st-muted">Belum ada yang check-in.</p>}
          {[...arrived]
            .sort((a, b) => (b.checkedInAt ?? '').localeCompare(a.checkedInAt ?? ''))
            .slice(0, 30)
            .map((guest) => (
              <div key={guest.id} className="st-list-row">
                <div className="st-list-main">
                  <strong>{guest.name}</strong>
                  <span>
                    {guest.checkedInParty} orang ·{' '}
                    {guest.checkedInAt
                      ? new Date(guest.checkedInAt).toLocaleTimeString('id-ID', { timeStyle: 'short' })
                      : ''}
                    {guest.walkIn ? ' · tanpa undangan' : ''}
                  </span>
                </div>
                {!guest.walkIn && (
                  <button type="button" className="st-button is-small is-ghost" onClick={() => undo(guest)}>
                    Batalkan
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    </>
  )
}

export function CheckInPage() {
  return (
    <div className="st-page">
      <Gate what="check-in" needsPublish>
        <CheckInBoard />
      </Gate>
    </div>
  )
}
