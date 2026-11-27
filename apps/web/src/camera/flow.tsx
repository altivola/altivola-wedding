// The guest disposable camera: one roll per guest, no preview, every shot goes to the album.
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, Lock, SwitchCamera, Zap, ZapOff } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { fileImage } from '@/booth/media'
import {
  BottomBar,
  CameraBlocked,
  coupleNames,
  eventDayLabel,
  focusRing,
  type GuestData,
  GuestPage,
  isOpenNow,
  NameField,
  PrimaryButton,
  useCamera,
  useGuestName,
} from '@/booth/shared'
import { client, errorMessage, orpc } from '@/lib/orpc'
import { toast } from '@/lib/toast'
import { cropFrame, type FilmId, filmIds, filmOf, filmSamples, isFilmId } from './films'
import { useShotQueue } from './queue'
import './camera.css'

type Stage = 'landing' | 'film' | 'shoot' | 'done'
type Roll = { rollId: string; film: string; left: number; name: string }

const rollKey = (slug: string) => `hb-roll:${slug}`

function readRoll(slug: string | null): Roll | null {
  if (!slug) return null
  try {
    const value = JSON.parse(localStorage.getItem(rollKey(slug)) ?? 'null') as Roll | null
    return value && typeof value.rollId === 'string' && typeof value.left === 'number' ? value : null
  } catch {
    return null
  }
}

function writeRoll(slug: string | null, roll: Roll | null) {
  if (!slug) return
  try {
    if (roll) localStorage.setItem(rollKey(slug), JSON.stringify(roll))
    else localStorage.removeItem(rollKey(slug))
  } catch {
    // Private mode: the roll still works until the page is closed.
  }
}

const demoShots = 3

export function CameraFlow({ data }: { data: GuestData }) {
  const demo = data.slug === null
  const names = coupleNames(data.doc)
  const [name, setName] = useGuestName()
  const [roll, setRollState] = useState<Roll | null>(() => readRoll(data.slug))
  const [stage, setStage] = useState<Stage>(() => {
    const saved = readRoll(data.slug)
    return saved && saved.left <= 0 ? 'done' : 'landing'
  })
  const [demoFilm, setDemoFilm] = useState<FilmId>(isFilmId(data.camera.film) ? data.camera.film : 'senja')
  const [developed, setDeveloped] = useState<string[]>([])

  useEffect(() => {
    document.title = `Kamera sekali pakai · ${names}`
  }, [names])

  useEffect(() => {
    if (stage) window.scrollTo({ top: 0 })
  }, [stage])

  const setRoll = useCallback(
    (next: Roll | null) => {
      setRollState(next)
      writeRoll(data.slug, next)
    },
    [data.slug],
  )

  const queue = useShotQueue({
    slug: data.slug,
    rollId: roll?.rollId ?? null,
    film: roll?.film ?? demoFilm,
    onLeft: (left) => setRollState((current) => updateLeft(data.slug, current, left)),
    onRejected: (status, message) => {
      if (status === 404) {
        setRoll(null)
        setStage('landing')
        toast('Rol ini sudah tidak ada. Ambil rol baru ya.', 4000)
      } else if (status === 403) {
        setRollState((current) => updateLeft(data.slug, current, 0))
        toast(message, 4000)
      } else toast(message, 4000)
    },
    onDeveloped: demo ? (url) => setDeveloped((list) => [...list, url]) : undefined,
  })

  // In demo mode the count drops right away. Live, it is the server count minus shots still on the way.
  const left = roll ? Math.max(0, demo ? roll.left : roll.left - queue.pending) : 0

  useEffect(() => {
    if (stage === 'shoot' && roll && left <= 0) {
      const timer = window.setTimeout(() => setStage('done'), 700)
      return () => window.clearTimeout(timer)
    }
  }, [stage, roll, left])

  const start = useMutation({
    mutationFn: async () => {
      if (demo) return { rollId: 'demo', film: demoFilm, left: demoShots }
      return client.invitations.cameraStart({ slug: data.slug as string, name: name.trim() })
    },
    onSuccess: (result) => {
      setDeveloped([])
      setRoll({ rollId: result.rollId, film: result.film, left: result.left, name: name.trim() })
      setStage('shoot')
    },
    onError: (error) => toast(errorMessage(error, 'Rol belum bisa diambil. Coba lagi.')),
  })

  if (stage === 'landing') {
    return (
      <Landing
        data={data}
        names={names}
        name={name}
        setName={setName}
        roll={roll}
        onNext={() => setStage(roll && roll.left > 0 ? 'shoot' : 'film')}
      />
    )
  }

  if (stage === 'film') {
    return (
      <FilmStage
        demo={demo}
        film={demo ? demoFilm : filmOf(data.camera.film).id}
        onPick={setDemoFilm}
        names={names}
        shots={demo ? demoShots : data.camera.shots}
        busy={start.isPending}
        onBack={() => setStage('landing')}
        onStart={() => start.mutate()}
      />
    )
  }

  if (stage === 'shoot' && roll) {
    return (
      <ShootStage
        roll={roll}
        left={left}
        names={names}
        pending={demo ? 0 : queue.pending}
        retrying={queue.retrying}
        onBack={() => setStage('landing')}
        onShot={(raw, flash) => {
          queue.add(raw, flash)
          if (demo) setRollState((current) => (current ? { ...current, left: current.left - 1 } : current))
        }}
      />
    )
  }

  return (
    <DoneStage
      data={data}
      names={names}
      pending={demo ? 0 : queue.pending}
      retrying={queue.retrying}
      onRetry={queue.retryNow}
      developed={developed}
      expected={demoShots}
      onAgain={() => {
        setRoll(null)
        setDeveloped([])
        setStage('film')
      }}
    />
  )
}

function updateLeft(slug: string | null, current: Roll | null, left: number) {
  if (!current) return current
  const next = { ...current, left }
  writeRoll(slug, next)
  return next
}

// Landing

function CameraArt() {
  return (
    <svg viewBox="0 0 240 150" className="mx-auto h-[150px] w-[240px]" aria-hidden="true">
      <rect x="24" y="30" width="192" height="104" rx="18" fill="#1c1a16" />
      <rect x="24" y="92" width="192" height="22" fill="var(--hb-terra)" />
      <rect x="24" y="92" width="192" height="6" fill="var(--hb-kunyit)" />
      <rect x="44" y="20" width="34" height="14" rx="5" fill="#1c1a16" />
      <rect x="168" y="42" width="34" height="22" rx="5" fill="#f4f1ea" opacity="0.9" />
      <rect x="40" y="42" width="40" height="26" rx="5" fill="#2c2a26" />
      <circle cx="120" cy="78" r="34" fill="#2c2a26" />
      <circle cx="120" cy="78" r="24" fill="#0c0c0b" />
      <circle cx="112" cy="70" r="7" fill="#fff" opacity="0.25" />
      <rect x="168" y="72" width="30" height="14" rx="4" fill="#0c0c0b" />
      <text x="183" y="83" fill="#f4f1ea" fontFamily="DM Mono, monospace" fontSize="10" textAnchor="middle">
        24
      </text>
      <path d="M196 30l6-10h12l-4 10z" fill="#1c1a16" />
      <g stroke="var(--hb-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.3" fill="none">
        <path d="M8 24l10 6M6 52h12M228 20l-8 8M232 60h-10" />
      </g>
    </svg>
  )
}

function Landing({
  data,
  names,
  name,
  setName,
  roll,
  onNext,
}: {
  data: GuestData
  names: string
  name: string
  setName: (value: string) => void
  roll: Roll | null
  onNext: () => void
}) {
  const demo = data.slug === null
  const open = demo || isOpenNow(data.camera.open, data.doc)
  const shots = demo ? demoShots : data.camera.shots
  const resume = roll && roll.left > 0
  const ready = demo || Boolean(resume) || name.trim().length > 0

  return (
    <GuestPage>
      <div className="flex flex-1 flex-col gap-6 pt-10 pb-4">
        <div className="text-center">
          <p className="font-mono text-[12px] text-terra uppercase tracking-[0.22em]">Kamera sekali pakai</p>
          <h1 className="mt-2 font-bold font-display text-[38px] text-ink leading-[1.05]">{names}</h1>
          <p className="mx-auto mt-3 max-w-[340px] text-[15px] text-soft">
            Satu rol isi {shots} jepretan. Tanpa preview, semua foto dicuci jadi album bersama.
          </p>
        </div>
        <CameraArt />
        {demo ? (
          <p className="rounded-[22px] border border-border bg-white p-4 text-[14px] text-soft">
            Ini mode coba dengan rol isi {demoShots}. Fotomu tidak diunggah ke mana pun.{' '}
            <Link to="/buat" className="font-semibold text-ink underline underline-offset-4">
              Buat undanganmu
            </Link>{' '}
            untuk membagikan kamera ini ke tamu.
          </p>
        ) : (
          <CameraAlbumCard slug={data.slug as string} />
        )}
        {!open ? (
          <div className="rounded-[24px] border border-border bg-white p-5 text-center">
            <p className="font-display font-semibold text-[20px] text-ink">Kamera belum buka</p>
            <p className="mt-1 text-[14px] text-soft">
              {data.camera.open === 'event' && eventDayLabel(data.doc)
                ? `Kamera dibuka di hari acara, ${eventDayLabel(data.doc)}. Simpan link ini dan kembali lagi nanti ya.`
                : 'Kamera sedang ditutup. Kamu masih bisa melihat album tamu.'}
            </p>
          </div>
        ) : resume ? (
          <div className="rounded-[24px] border border-border bg-white p-5">
            <p className="font-semibold text-[15px] text-ink">Rolmu masih ada sisa {roll.left} jepretan</p>
            <p className="mt-1 text-[14px] text-soft">
              Rol milik {roll.name || 'kamu'} dengan film {filmOf(roll.film).name}.
            </p>
          </div>
        ) : (
          <NameField id="camera-name" value={name} onChange={setName} />
        )}
      </div>
      {open ? (
        <BottomBar>
          <PrimaryButton disabled={!ready} onClick={onNext}>
            {resume ? 'Lanjut memotret' : 'Lanjut'}
          </PrimaryButton>
          {!ready ? <p className="mt-2 text-center text-[13px] text-soft">Isi namamu dulu ya.</p> : null}
        </BottomBar>
      ) : null}
    </GuestPage>
  )
}

function CameraAlbumCard({ slug }: { slug: string }) {
  const album = useQuery(orpc.invitations.cameraAlbum.queryOptions({ input: { slug } }))
  const label = !album.data
    ? 'Memuat album'
    : album.data.revealed
      ? `${album.data.count} foto di album`
      : `${album.data.count} foto dari ${album.data.rolls} rol`
  return (
    <Link
      to="/u/$slug/album"
      params={{ slug }}
      className={`flex items-center gap-3 rounded-[22px] border border-border bg-white p-3 pr-4 transition hover:bg-sand/60 ${focusRing}`}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-sand text-ink">
        {album.data && !album.data.revealed ? (
          <Lock className="size-5" aria-hidden="true" />
        ) : (
          <Check className="size-5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-snug">
        <span className="block font-semibold text-ink">{label}</span>
        <span className="block text-soft">
          {album.data && !album.data.revealed ? 'Album dibuka setelah acara' : 'Lihat album tamu'}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-soft" aria-hidden="true" />
    </Link>
  )
}

// Film

function DarkHeader({ title, names, onBack }: { title: string; names: string; onBack?: () => void }) {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center py-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="grid size-11 place-items-center rounded-full text-white outline-none hover:bg-white/10 focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)]"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : (
        <span />
      )}
      <div className="min-w-0 text-center leading-tight">
        <p className="font-display font-semibold text-[17px]">{title}</p>
        <p className="truncate text-[12px] text-white/60">{names}</p>
      </div>
      <span />
    </header>
  )
}

export function FilmStrip({ film, compact = false }: { film: FilmId; compact?: boolean }) {
  const [urls, setUrls] = useState<string[] | null>(null)
  useEffect(() => {
    let active = true
    setUrls(null)
    filmSamples(film)
      .then((list) => {
        if (active) setUrls(list)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [film])
  const numbers = ['11', '11A', '12']
  return (
    <div className="film-strip" style={compact ? { padding: '20px 8px' } : undefined}>
      <div className="film-frames">
        {numbers.map((number, index) => (
          <div key={number} className="film-frame">
            {urls?.[index] ? <img src={urls[index]} alt="" /> : null}
            {compact ? null : <span className="film-number">{number}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function FilmStage({
  demo,
  film,
  onPick,
  names,
  shots,
  busy,
  onBack,
  onStart,
}: {
  demo: boolean
  film: FilmId
  onPick: (film: FilmId) => void
  names: string
  shots: number
  busy: boolean
  onBack: () => void
  onStart: () => void
}) {
  const info = filmOf(film)
  return (
    <div className="cam-screen">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4">
        <DarkHeader title="Kamera sekali pakai" names={names} onBack={onBack} />
        <div className="flex flex-col gap-5 pt-4 pb-4">
          <div>
            <h1 className="font-display font-semibold text-[26px] leading-tight">
              {demo ? 'Pilih film' : 'Film untuk rolmu'}
            </h1>
            <p className="mt-1 text-[15px] text-white/65">
              {demo
                ? 'Di undangan asli, pengantin yang memilih filmnya.'
                : `Pengantin memilih film ini. Rolmu isi ${shots} jepretan.`}
            </p>
          </div>
          {demo ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Film</legend>
              {filmIds.map((id) => {
                const item = filmOf(id)
                const selected = id === film
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onPick(id)}
                    className={`flex flex-col gap-3 rounded-[22px] border p-3 text-left outline-none transition focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)] ${
                      selected
                        ? 'border-[var(--hb-kunyit)] bg-white/10'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <FilmStrip film={id} compact />
                    <span className="flex items-start justify-between gap-3 px-1">
                      <span>
                        <span className="block font-mono font-medium text-[15px]">{item.name}</span>
                        <span className="block text-[13px] text-white/65">{item.line}</span>
                      </span>
                      {selected ? (
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--hb-kunyit)] text-ink">
                          <Check className="size-4" aria-hidden="true" />
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </fieldset>
          ) : (
            <div className="flex flex-col gap-4">
              <FilmStrip film={film} />
              <div className="px-1 pt-2">
                <p className="font-mono font-medium text-[20px]">{info.name}</p>
                <p className="text-[15px] text-white/70">{info.line}</p>
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-[#0c0c0b] via-[#0c0c0b]/95 to-transparent pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={busy}
            onClick={onStart}
            className="inline-flex h-13 w-full items-center justify-center rounded-full bg-[#f4f1ea] px-6 font-semibold text-[15px] text-ink outline-none transition focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)] active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Menyiapkan rol...' : 'Mulai memotret'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Shooting

function Counter({ value }: { value: number }) {
  const digits = String(Math.max(0, value)).padStart(2, '0').split('')
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="cam-counter" aria-hidden="true">
        {digits.map((digit, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: digit positions are fixed
          <span key={`${index}-${digit}`} className="cam-digit">
            <span>{digit}</span>
          </span>
        ))}
      </div>
      <span className="font-mono text-[9px] text-white/45 uppercase tracking-[0.2em]">Sisa</span>
      <span className="sr-only" aria-live="polite">
        Sisa {value} jepretan
      </span>
    </div>
  )
}

function Pending({ count, retrying }: { count: number; retrying: boolean }) {
  if (!count) return null
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/80"
      role="status"
    >
      <span className="cam-dot" aria-hidden="true" />
      {retrying ? `Menunggu sinyal, ${count} foto` : `Mengirim ${count} foto`}
    </span>
  )
}

async function setTorch(stream: MediaStream | null, on: boolean) {
  const track = stream?.getVideoTracks()[0]
  const capabilities = track?.getCapabilities?.() as { torch?: boolean } | undefined
  if (!track || !capabilities?.torch) return false
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
    return true
  } catch {
    return false
  }
}

function ShootStage({
  roll,
  left,
  names,
  pending,
  retrying,
  onBack,
  onShot,
}: {
  roll: Roll
  left: number
  names: string
  pending: number
  retrying: boolean
  onBack: () => void
  onShot: (raw: HTMLCanvasElement, flash: boolean) => void
}) {
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const camera = useCamera(facing, true)
  const blocked = camera.status === 'blocked' || camera.status === 'unavailable'
  const live = camera.status === 'live'
  const [flash, setFlash] = useState(false)
  const [winding, setWinding] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const [aspect, setAspect] = useState(2 / 3)
  const film = filmOf(roll.film)

  const wind = () => {
    setFlashKey((value) => value + 1)
    setWinding(true)
    window.setTimeout(() => setWinding(false), 650)
  }

  const shoot = async () => {
    if (winding || left <= 0) return
    const video = camera.videoRef.current
    if (!video?.videoWidth) {
      toast('Kamera belum siap. Tunggu sebentar.')
      return
    }
    setWinding(true)
    try {
      const torch = flash && (await setTorch(camera.streamRef.current, true))
      if (torch) await new Promise((resolve) => window.setTimeout(resolve, 220))
      const raw = cropFrame(video, video.videoWidth, video.videoHeight, { mirror: facing === 'user' })
      if (torch) void setTorch(camera.streamRef.current, false)
      wind()
      onShot(raw, flash)
    } catch {
      setWinding(false)
      toast('Gagal memotret. Coba lagi.')
    }
  }

  const fromFiles = async (files: File[]) => {
    const file = files[0]
    if (!file || left <= 0) return
    try {
      const picked = await fileImage(file)
      const raw = cropFrame(picked.image, picked.width, picked.height)
      URL.revokeObjectURL(picked.url)
      wind()
      onShot(raw, flash)
    } catch {
      toast('Foto ini tidak bisa dibuka. Coba lagi.')
    }
  }

  return (
    <div className="cam-screen">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-6">
        <DarkHeader title="Kamera sekali pakai" names={names} onBack={onBack} />
        <div className="flex min-h-7 items-center justify-between gap-3 pt-1 pb-3 text-[13px] text-white/65">
          <span className="truncate">Rol milik {roll.name || 'kamu'}</span>
          <Pending count={pending} retrying={retrying} />
        </div>

        <div className="my-auto">
          <div className="cam-body">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono font-medium text-[15px] text-[#f4f1ea] tracking-[0.12em]">
                  {film.name.toUpperCase()}
                </p>
                <p className="text-[11px] text-white/45">{left > 0 ? 'Siap jepret' : 'Rol habis'}</p>
              </div>
              <Counter value={left} />
            </div>

            <div className="mt-4 mb-5">
              {blocked ? (
                <CameraBlocked
                  status={camera.status}
                  onRetry={camera.retry}
                  onFiles={(files) => void fromFiles(files)}
                  facing="environment"
                  dark
                  multiple={false}
                />
              ) : (
                <div
                  className="cam-window mx-auto w-[64%]"
                  data-mirror={facing === 'user'}
                  style={{ aspectRatio: aspect }}
                >
                  <video
                    ref={camera.videoRef}
                    playsInline
                    muted
                    autoPlay
                    aria-label="Jendela bidik"
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget
                      if (video.videoWidth) setAspect(video.videoWidth >= video.videoHeight ? 3 / 2 : 2 / 3)
                    }}
                  />
                  {!live ? (
                    <div className="absolute inset-0 grid place-items-center text-[12px] text-white/60">
                      Membuka kamera...
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="cam-band" aria-hidden="true" />

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center">
              <div className="flex justify-start">
                <button
                  type="button"
                  className="cam-round"
                  aria-pressed={flash}
                  aria-label="Lampu kilat"
                  onClick={() => setFlash((value) => !value)}
                >
                  {flash ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
                </button>
              </div>
              <button
                type="button"
                className="cam-shutter"
                aria-label={left > 0 ? `Jepret, sisa ${left}` : 'Rol habis'}
                disabled={!live || winding || left <= 0}
                onClick={() => void shoot()}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="cam-round"
                  aria-label="Ganti kamera depan atau belakang"
                  disabled={blocked}
                  onClick={() => setFacing((value) => (value === 'environment' ? 'user' : 'environment'))}
                >
                  <SwitchCamera className="size-5" />
                </button>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-[13px] text-white/55">
            Tanpa preview. Fotonya dicuci dan muncul di album setelah dibuka pengantin.
          </p>
        </div>
      </div>
      {flashKey ? <div key={flashKey} className="cam-flash" aria-hidden="true" /> : null}
    </div>
  )
}

// Done

function DoneStage({
  data,
  names,
  pending,
  retrying,
  onRetry,
  developed,
  expected,
  onAgain,
}: {
  data: GuestData
  names: string
  pending: number
  retrying: boolean
  onRetry: () => void
  developed: string[]
  expected: number
  onAgain: () => void
}) {
  const demo = data.slug === null
  const slots = useMemo(() => Array.from({ length: expected }, (_, index) => index), [expected])
  return (
    <div className="cam-screen">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-8">
        <DarkHeader title="Kamera sekali pakai" names={names} />
        <div className="flex flex-1 flex-col items-center gap-5 pt-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-white/10">
            <Check className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display font-semibold text-[26px] leading-tight">Rolmu sudah habis.</h1>
            <p className="mx-auto mt-2 max-w-[320px] text-[15px] text-white/70">
              {demo
                ? 'Di undangan asli, fotonya baru muncul di album setelah pengantin membukanya. Ini hasil cuci rol cobamu:'
                : 'Fotonya akan muncul di album setelah dibuka.'}
            </p>
          </div>
          {pending ? (
            <div className="flex flex-col items-center gap-2" role="status">
              <Pending count={pending} retrying={retrying} />
              <p className="text-[13px] text-white/55">Jangan tutup halaman ini dulu ya.</p>
              {retrying ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="font-semibold text-[13px] underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)]"
                >
                  Kirim ulang sekarang
                </button>
              ) : null}
            </div>
          ) : null}
          {demo ? (
            <div className="w-full">
              <p className="mb-3 text-left font-mono text-[12px] text-white/55 uppercase tracking-[0.2em]">
                Hasil cuci
              </p>
              <div className="grid grid-cols-3 items-start gap-2">
                {slots.map((index) => (
                  <div key={index} className="rounded-[4px] bg-[#f4f1ea] p-1.5 pb-4 shadow-lg">
                    {developed[index] ? (
                      <img
                        src={developed[index]}
                        alt={`Hasil cuci foto ${index + 1}`}
                        className="h-auto w-full rounded-[2px]"
                      />
                    ) : (
                      <div className="aspect-[2/3] w-full animate-pulse rounded-[2px] bg-[#d9d2c2]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 pt-6">
          {demo ? (
            <>
              <DarkButton onClick={onAgain}>Coba rol lagi</DarkButton>
              <Link
                to="/buat"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 font-semibold text-[14px] text-white outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)]"
              >
                Buat undanganmu
              </Link>
            </>
          ) : (
            <Link
              to="/u/$slug/album"
              params={{ slug: data.slug as string }}
              className="inline-flex h-13 items-center justify-center rounded-full bg-[#f4f1ea] font-semibold text-[15px] text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)]"
            >
              Lihat album tamu
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function DarkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-13 items-center justify-center rounded-full bg-[#f4f1ea] px-6 font-semibold text-[15px] text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--hb-kunyit)] active:scale-[0.98]"
    >
      {children}
    </button>
  )
}
