// Pieces shared by the Photobooth and Kamera tabs in the couple's studio.
import { useMutation } from '@tanstack/react-query'
import { Copy, Download, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'
import { type ReactNode, useEffect, useState } from 'react'
import { client, errorMessage } from '@/lib/orpc'
import { copyText, toast } from '@/lib/toast'
import { useStudio } from '@/studio/context'
import { context2d, downloadBlob, ensureFonts, loadPicture, makeCanvas } from './media'
import { focusRing, type OpenMode } from './shared'
import './booth.css'

export function HostPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[960px] p-6">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-[28px] text-ink leading-tight">{title}</h1>
        {intro ? <p className="mt-1 max-w-[620px] text-[15px] text-soft">{intro}</p> : null}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  )
}

export function NoticeCard({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[24px] border border-border bg-white p-6">
      <p className="font-display font-semibold text-[20px] text-ink">{title}</p>
      {text ? <p className="max-w-[560px] text-[15px] text-soft">{text}</p> : null}
      {action}
    </div>
  )
}

export function Section({
  title,
  hint,
  aside,
  children,
}: {
  title: string
  hint?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[16px] text-ink">{title}</h2>
          {hint ? <p className="mt-0.5 text-[14px] text-soft">{hint}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

export const inkButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-[14px] text-white transition active:scale-[0.98] disabled:opacity-50 ${focusRing}`
export const lineButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 font-semibold text-[14px] text-ink transition hover:bg-sand active:scale-[0.98] disabled:opacity-50 ${focusRing}`

/** Settings change, then the studio reloads the invitation. */
export function useSaveSettings() {
  const { invitation, refresh } = useStudio()
  return useMutation({
    mutationFn: (patch: { booth?: typeof invitation.booth; camera?: typeof invitation.camera }) =>
      client.invitations.settings({ id: invitation.id, ...patch }),
    onSuccess: async () => {
      await refresh()
      toast('Tersimpan')
    },
    onError: (error) => toast(errorMessage(error, 'Gagal menyimpan. Coba lagi.')),
  })
}

export function eventDate(dates: { date: string }[]) {
  const date = dates.find((event) => event.date)?.date
  if (!date) return null
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

export function OpenSchedule({
  name,
  value,
  onChange,
  disabled,
  day,
}: {
  name: string
  value: OpenMode
  onChange: (value: OpenMode) => void
  disabled?: boolean
  day: string | null
}) {
  const options: { id: OpenMode; title: string; text: string }[] = [
    {
      id: 'event',
      title: 'Buka di hari acara',
      text: day ? `Hanya bisa dipakai tanggal ${day}.` : 'Isi tanggal acara dulu supaya bisa dibuka.',
    },
    { id: 'now', title: 'Buka sekarang', text: 'Tamu bisa memakainya kapan saja.' },
    { id: 'closed', title: 'Tutup', text: 'Tamu hanya bisa melihat album.' },
  ]
  return (
    <fieldset className="grid gap-2 sm:grid-cols-3" disabled={disabled}>
      <legend className="sr-only">Jadwal buka</legend>
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-start gap-3 rounded-[18px] border-2 p-4 transition focus-within:ring-[3px] focus-within:ring-ink/30 ${
            value === option.id ? 'border-ink bg-sand/50' : 'border-border hover:border-[#cfc6b4]'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            className="mt-1 size-4 accent-[var(--hb-ink)]"
          />
          <span>
            <span className="block font-semibold text-[14px] text-ink">{option.title}</span>
            <span className="block text-[13px] text-soft">{option.text}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  text,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  text?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-[15px] text-ink">{label}</p>
        {text ? <p className="mt-0.5 text-[14px] text-soft">{text}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${checked ? 'bg-ink' : 'bg-[#d6cebd]'} ${focusRing}`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[18px] bg-sand/60 px-4 py-3">
      <p className="font-display font-semibold text-[26px] text-ink leading-none">{value}</p>
      <p className="mt-1 text-[13px] text-soft">{label}</p>
    </div>
  )
}

async function qrCard(qr: string, title: string, names: string, url: string) {
  await ensureFonts()
  const canvas = makeCanvas(1200, 1600)
  const ctx = context2d(canvas)
  ctx.fillStyle = '#fbf8f2'
  ctx.fillRect(0, 0, 1200, 1600)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#c8553d'
  ctx.font = '500 34px "DM Mono", monospace'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px'
  ctx.fillText('PINDAI UNTUK', 600, 170)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ctx.fillStyle = '#1c1a16'
  ctx.font = '700 104px "Shantell Sans Variable", sans-serif'
  ctx.fillText(title, 600, 290)
  ctx.fillStyle = '#57534a'
  ctx.font = '600 46px "Figtree Variable", sans-serif'
  ctx.fillText(names, 600, 368)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(170, 440, 860, 860, 48)
  ctx.fill()
  ctx.strokeStyle = '#e3dccd'
  ctx.lineWidth = 4
  ctx.stroke()
  const image = await loadPicture(qr)
  ctx.drawImage(image, 220, 490, 760, 760)
  ctx.fillStyle = '#57534a'
  ctx.font = '500 38px "Figtree Variable", sans-serif'
  ctx.fillText('Arahkan kamera ponselmu ke kode ini', 600, 1400)
  ctx.fillStyle = '#8c867a'
  ctx.font = '500 28px "DM Mono", monospace'
  ctx.fillText(url.replace(/^https?:\/\//, ''), 600, 1460)
  return canvas
}

export function QrPanel({
  url,
  title,
  names,
  fileName,
}: {
  url: string
  title: string
  names: string
  fileName: string
}) {
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { width: 760, margin: 1, color: { dark: '#1c1a16', light: '#ffffff' } }).then(
      (data) => {
        if (active) setQr(data)
      },
      () => {
        if (active) setQr(null)
      },
    )
    return () => {
      active = false
    }
  }, [url])

  const download = async () => {
    if (!qr) return
    try {
      const canvas = await qrCard(qr, title, names, url)
      downloadBlob(canvas.toDataURL('image/png'), fileName)
    } catch {
      downloadBlob(qr, fileName)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="grid size-[168px] shrink-0 place-items-center rounded-[20px] border border-border bg-white p-2">
        {qr ? (
          <img src={qr} alt={`Kode QR ke ${title.toLowerCase()}`} className="size-full" />
        ) : (
          <div className="hb-skeleton size-full rounded-[12px]" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-[14px] text-soft">
          Cetak dan pajang di meja tamu atau dekat pelaminan. Tamu memindai, lalu langsung memotret dari ponselnya.
        </p>
        <p className="truncate rounded-[12px] bg-sand/60 px-3 py-2 font-mono text-[13px] text-ink">{url}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={inkButton} disabled={!qr} onClick={() => void download()}>
            <Download className="size-4" aria-hidden="true" />
            Unduh QR
          </button>
          <button type="button" className={lineButton} onClick={() => void copyText(url, 'Link disalin')}>
            <Copy className="size-4" aria-hidden="true" />
            Salin link
          </button>
          <a href={url} target="_blank" rel="noreferrer" className={lineButton}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Buka
          </a>
        </div>
      </div>
    </div>
  )
}
