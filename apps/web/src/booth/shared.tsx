// Pieces shared by the guest pages of the photobooth, the album and the disposable camera.
import { type InvitationDoc, sampleInvitation } from '@app/api/invitation-model'
import { useQuery } from '@tanstack/react-query'
import { CameraOff, ChevronLeft, Download, ImagePlus, Link2, RefreshCw, Smartphone, X } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { orpc } from '@/lib/orpc'
import { copyText } from '@/lib/toast'
import './booth.css'

export type OpenMode = 'event' | 'now' | 'closed'
export type GuestData = {
  /** `null` in demo mode. */
  slug: string | null
  doc: InvitationDoc
  booth: { open: OpenMode; frames?: string[] }
  camera: { open: OpenMode; film: string; shots: number; revealed: boolean }
}

export const demoData: GuestData = {
  slug: null,
  doc: sampleInvitation('kawung'),
  booth: { open: 'now' },
  camera: { open: 'now', film: 'senja', shots: 3, revealed: false },
}

export function useGuestData(slug: string | undefined) {
  return useQuery({
    ...orpc.invitations.view.queryOptions({ input: { slug: slug ?? '' } }),
    enabled: Boolean(slug),
    staleTime: 30_000,
    retry: 1,
    select: (data): GuestData => ({ slug: data.slug, doc: data.doc, booth: data.booth, camera: data.camera }),
  })
}

export function coupleNames(doc: Pick<InvitationDoc, 'names'>) {
  return `${doc.names.bride.trim() || 'Mempelai'} & ${doc.names.groom.trim() || 'Mempelai'}`
}

/** Same rule as the API: `event` opens only on the date of an event, in the event's time zone. */
export function isOpenNow(open: OpenMode, doc: InvitationDoc, now = new Date()) {
  if (open === 'now') return true
  if (open === 'closed') return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: doc.events[0]?.tz ?? 'Asia/Jakarta' }).format(now)
  return doc.events.some((event) => event.date === today)
}

export function eventDayLabel(doc: InvitationDoc) {
  const date = doc.events.find((event) => event.date)?.date
  if (!date) return null
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

const nameKey = 'hb-guest-name'

/** The guest's name, remembered in this browser for the booth and the camera. */
export function useGuestName() {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(nameKey) ?? ''
    } catch {
      return ''
    }
  })
  const save = useCallback((value: string) => {
    setName(value)
    try {
      localStorage.setItem(nameKey, value.trim())
    } catch {
      // Private mode: the name still works for this visit.
    }
  }, [])
  return [name, save] as const
}

export const focusRing =
  'outline-none focus-visible:ring-[3px] focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

export function PrimaryButton({
  children,
  className = '',
  ...props
}: React.ComponentProps<'button'> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-[15px] text-white transition active:scale-[0.98] disabled:opacity-45 ${focusRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SoftButton({
  children,
  className = '',
  ...props
}: React.ComponentProps<'button'> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-white px-5 font-semibold text-[14px] text-ink transition hover:bg-sand active:scale-[0.98] disabled:opacity-45 ${focusRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/** Playful line doodles behind the guest pages: confetti, little cameras, hearts and stars. */
export function Doodles() {
  return (
    <svg className="hb-doodles" viewBox="0 0 430 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <g stroke="var(--hb-ink)" opacity="0.16">
          <rect x="22" y="70" width="44" height="32" rx="7" />
          <circle cx="44" cy="86" r="9" />
          <path d="M32 70v-5h12v5" />
          <rect x="350" y="520" width="50" height="36" rx="8" transform="rotate(12 375 538)" />
          <circle cx="375" cy="538" r="10" transform="rotate(12 375 538)" />
          <path d="M380 140c-8-12-26-4-18 10l18 16 18-16c8-14-10-22-18-10z" />
          <path d="M52 640c-6-9-20-3-14 8l14 12 14-12c6-11-8-17-14-8z" />
          <path d="M300 820c-6-9-20-3-14 8l14 12 14-12c6-11-8-17-14-8z" />
          <path d="M90 300l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" />
          <path d="M330 300c10 0 10 14 20 14s10-14 20-14 10 14 20 14" />
          <path d="M30 470c8-8 16 8 24 0s16 8 24 0" />
          <path d="M150 860c10 0 10 14 20 14s10-14 20-14" />
        </g>
        <g strokeWidth="2.4">
          <path d="M140 40l10 6" stroke="var(--hb-terra)" />
          <path d="M290 60l-6 10" stroke="var(--hb-langit)" />
          <circle cx="240" cy="30" r="4" stroke="var(--hb-kunyit)" />
          <path d="M400 380l8 8m0-8l-8 8" stroke="var(--hb-terra)" />
          <circle cx="24" cy="380" r="5" stroke="var(--hb-langit)" />
          <path d="M60 760l10-4" stroke="var(--hb-kunyit)" />
          <path d="M400 700l-4 10" stroke="var(--hb-langit)" />
          <circle cx="250" cy="880" r="4" stroke="var(--hb-terra)" />
          <path d="M395 230l6 4-6 4" stroke="var(--hb-kunyit)" />
          <path d="M18 560l5 9" stroke="var(--hb-terra)" />
        </g>
      </g>
    </svg>
  )
}

/** Full height page with the doodles and a centred column, mobile first. */
export function GuestPage({ children, doodles = true }: { children: ReactNode; doodles?: boolean }) {
  return (
    <div className="hb-guest">
      {doodles ? <Doodles /> : null}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4">{children}</div>
    </div>
  )
}

export function TopBar({
  title,
  names,
  onBack,
  step,
}: {
  title: string
  names: string
  onBack?: () => void
  step?: string
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 grid grid-cols-[44px_1fr_44px] items-center bg-paper/90 px-2 py-2 backdrop-blur">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className={`grid size-11 place-items-center rounded-full text-ink hover:bg-sand ${focusRing}`}
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : (
        <span />
      )}
      <div className="min-w-0 text-center leading-tight">
        <p className="font-display font-semibold text-[17px] text-ink">{title}</p>
        <p className="truncate text-[12px] text-soft">{names}</p>
      </div>
      <span className="text-center font-mono text-[13px] text-soft">
        {step ? <span className="sr-only">Langkah </span> : null}
        {step}
      </span>
    </header>
  )
}

/** Keeps the main action at the bottom of the screen on phones. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-gradient-to-t from-paper via-paper/95 to-paper/0 px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

export function NameField({ value, onChange, id }: { value: string; onChange: (value: string) => void; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-[14px] text-ink">
        Nama kamu
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={80}
        autoComplete="name"
        placeholder="Misalnya Rina dan keluarga"
        className="h-12 rounded-2xl border border-[#d6cebd] bg-white px-4 text-[16px] text-ink outline-none placeholder:text-[var(--hb-faint)] focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/15"
      />
    </div>
  )
}

export function StatusScreen({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <GuestPage>
      <div className="my-auto flex flex-col items-center gap-3 py-16 text-center">
        <h1 className="font-display font-semibold text-[26px] text-ink">{title}</h1>
        <p className="max-w-[320px] text-[15px] text-soft">{text}</p>
        {action}
      </div>
    </GuestPage>
  )
}

export function LoadingScreen() {
  return (
    <GuestPage>
      <div className="my-auto flex flex-col items-center gap-3 py-16" role="status">
        <span className="hb-spinner" aria-hidden="true" />
        <span className="text-[14px] text-soft">Sebentar ya...</span>
      </div>
    </GuestPage>
  )
}

// Camera

export type CameraStatus = 'idle' | 'starting' | 'live' | 'blocked' | 'unavailable'

/** Opens the camera while `active`, stops every track when done. */
export function useCamera(facing: 'user' | 'environment', active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    void attempt
    if (!active) {
      setStatus('idle')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    let cancelled = false
    setStatus('starting')
    const stop = (stream: MediaStream | null) => {
      for (const track of stream?.getTracks() ?? []) track.stop()
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stop(stream)
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }
        if (!cancelled) setStatus('live')
      })
      .catch((error: { name?: string }) => {
        if (cancelled) return
        setStatus(error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'blocked' : 'unavailable')
      })
    return () => {
      cancelled = true
      stop(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [facing, active, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { videoRef, streamRef, status, retry }
}

/** Hidden file input wrapped in a label, so it works with taps, keyboards and test tools. */
export function FileButton({
  children,
  onFiles,
  capture,
  multiple = false,
  variant = 'soft',
  className = '',
}: {
  children: ReactNode
  onFiles: (files: File[]) => void
  capture?: 'user' | 'environment'
  multiple?: boolean
  variant?: 'soft' | 'primary' | 'dark' | 'ghost'
  className?: string
}) {
  const look =
    variant === 'primary'
      ? 'bg-ink text-white'
      : variant === 'dark'
        ? 'bg-white/10 text-white border border-white/15'
        : variant === 'ghost'
          ? 'text-soft hover:bg-sand hover:text-ink'
          : 'border border-border bg-white text-ink hover:bg-sand'
  return (
    <label
      className={`relative inline-flex h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 font-semibold text-[14px] transition focus-within:ring-[3px] focus-within:ring-ink/40 active:scale-[0.98] ${look} ${className}`}
    >
      <input
        type="file"
        accept="image/*"
        capture={capture}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
      {children}
    </label>
  )
}

export function CameraBlocked({
  status,
  onRetry,
  onFiles,
  facing,
  dark = false,
  multiple = true,
}: {
  status: CameraStatus
  onRetry: () => void
  onFiles: (files: File[]) => void
  facing: 'user' | 'environment'
  dark?: boolean
  multiple?: boolean
}) {
  const card = dark ? 'border-white/10 bg-white/5 text-white' : 'border-border bg-white text-ink'
  const soft = dark ? 'text-white/70' : 'text-soft'
  return (
    <div className={`flex flex-col gap-3 rounded-[24px] border p-5 ${card}`} role="alert">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${dark ? 'bg-white/10' : 'bg-sand'}`}>
          <CameraOff className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-[15px]">
            {status === 'blocked' ? 'Kamera diblokir.' : 'Kamera tidak bisa dibuka di sini.'}
          </p>
          <p className={`text-[14px] ${soft}`}>
            Kamu tetap bisa ambil atau pilih foto. Kalau kamu membuka link ini dari WhatsApp atau Instagram, coba buka
            di Chrome atau Safari.
          </p>
        </div>
      </div>
      <div className={`grid grid-cols-1 gap-2 ${multiple ? 'min-[380px]:grid-cols-2' : ''}`}>
        <FileButton capture={facing} onFiles={onFiles} variant={dark ? 'dark' : 'primary'}>
          <Smartphone className="size-4" aria-hidden="true" />
          Pakai kamera HP
        </FileButton>
        {multiple ? (
          <FileButton multiple onFiles={onFiles} variant={dark ? 'dark' : 'soft'}>
            <ImagePlus className="size-4" aria-hidden="true" />
            Pilih dari galeri
          </FileButton>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={() => void copyText(window.location.href, 'Link disalin. Tempel di Chrome atau Safari.')}
          className={`inline-flex items-center gap-1.5 py-1 font-semibold text-[13px] underline-offset-4 hover:underline ${focusRing}`}
        >
          <Link2 className="size-4" aria-hidden="true" />
          Salin link untuk dibuka di browser
        </button>
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex items-center gap-1.5 py-1 font-semibold text-[13px] underline-offset-4 hover:underline ${focusRing}`}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Coba kamera lagi
        </button>
      </div>
    </div>
  )
}

/** A white flash over the given area. Change `flashKey` to fire it again. */
export function Flash({ flashKey }: { flashKey: number }) {
  if (!flashKey) return null
  return <div key={flashKey} className="hb-flash" aria-hidden="true" />
}

// Lightbox

export type LightboxItem = { src: string; alt: string; title: string; meta?: string; fileName: string }

export function Lightbox({ item, onClose }: { item: LightboxItem | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!item) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [item, onClose])
  if (!item) return null
  return (
    <div className="hb-lightbox" role="dialog" aria-modal="true" aria-label={item.title}>
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="relative z-10 flex max-h-full w-full max-w-[560px] flex-col items-center gap-3">
        <img src={item.src} alt={item.alt} className="max-h-[72dvh] w-auto max-w-full rounded-[12px] shadow-2xl" />
        <div className="flex w-full items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[15px]">{item.title}</p>
            {item.meta ? <p className="truncate text-[13px] text-white/70">{item.meta}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href={item.src}
              download={item.fileName}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold text-[14px] text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              <Download className="size-4" aria-hidden="true" />
              Unduh
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid size-11 place-items-center rounded-full bg-white/15 text-white outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function timeLabel(createdAt: string) {
  const date = new Date(createdAt.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'))
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
