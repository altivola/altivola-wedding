// Studio tab for the photobooth: open schedule, venue QR, allowed frames and the strip album.
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { type ReactElement, useCallback, useMemo, useState } from 'react'
import { mediaUrl } from '@/lib/image'
import { orpc } from '@/lib/orpc'
import { toast } from '@/lib/toast'
import { type Editable, useStudio } from '@/studio/context'
import { type FrameDef, type FrameText, frames, frameText } from './frames'
import {
  eventDate,
  HostPage,
  inkButton,
  NoticeCard,
  OpenSchedule,
  QrPanel,
  Section,
  Stat,
  useSaveSettings,
} from './host-ui'
import { useStripPreview } from './preview'
import { coupleNames, focusRing, Lightbox, type LightboxItem, timeLabel } from './shared'

const intro = 'Tamu memotret dari ponselnya sendiri dengan frame undanganmu, lalu menitipkan fotonya di album.'

export function BoothTab(): ReactElement {
  const { invitation, owned, requireAccount } = useStudio()
  if (!owned) {
    return (
      <HostPage title="Photobooth" intro={intro}>
        <NoticeCard
          title="Masuk dulu untuk mengatur photobooth"
          text="Jadwal buka, pilihan frame, dan album photobooth disimpan di akunmu."
          action={
            <button
              type="button"
              className={inkButton}
              onClick={() => requireAccount('Masuk untuk mengatur photobooth')}
            >
              Masuk
            </button>
          }
        />
      </HostPage>
    )
  }
  if (!invitation.slug) {
    return (
      <HostPage title="Photobooth" intro={intro}>
        <NoticeCard title="Terbitkan undangan dulu untuk membuka photobooth" />
      </HostPage>
    )
  }
  return <BoothSettings invitation={invitation} slug={invitation.slug} />
}

function BoothSettings({ invitation, slug }: { invitation: Editable; slug: string }) {
  const doc = invitation.published ?? invitation.draft
  const names = coupleNames(doc)
  const text = useMemo(() => frameText(doc), [doc])
  const save = useSaveSettings()
  const pending = save.isPending ? save.variables?.booth : undefined
  const booth = pending ?? invitation.booth
  const chosen = booth.frames ?? frames.map((frame) => frame.id)
  const url = `${window.location.origin}/u/${slug}/booth`

  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((value) => value !== id) : [...chosen, id]
    if (!next.length) {
      toast('Sisakan minimal satu frame')
      return
    }
    const all = frames.every((frame) => next.includes(frame.id))
    save.mutate({
      booth: { ...booth, frames: all ? undefined : frames.map((f) => f.id).filter((f) => next.includes(f)) },
    })
  }

  return (
    <HostPage title="Photobooth" intro={intro}>
      <Section title="Jadwal buka" hint="Album tetap bisa dilihat tamu kapan saja.">
        <OpenSchedule
          name="booth-open"
          value={booth.open}
          day={eventDate(doc.events)}
          disabled={save.isPending}
          onChange={(open) => save.mutate({ booth: { ...booth, open } })}
        />
      </Section>

      <Section title="QR untuk venue" hint="Link photobooth untuk tamu.">
        <QrPanel url={url} title="Photobooth" names={names} fileName={`qr-photobooth-${slug}.png`} />
      </Section>

      <Section
        title="Frame"
        hint={`Tamu bisa memilih dari ${chosen.length} frame. Frame tema undanganmu dipilih lebih dulu.`}
      >
        <fieldset className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7" disabled={save.isPending}>
          <legend className="sr-only">Frame yang bisa dipilih tamu</legend>
          {frames.map((frame) => (
            <FrameCheck
              key={frame.id}
              frame={frame}
              text={text}
              checked={chosen.includes(frame.id)}
              theme={frame.id === doc.theme}
              onToggle={() => toggle(frame.id)}
            />
          ))}
        </fieldset>
      </Section>

      <BoothAlbum id={invitation.id} />
    </HostPage>
  )
}

function FrameCheck({
  frame,
  text,
  checked,
  theme,
  onToggle,
}: {
  frame: FrameDef
  text: FrameText
  checked: boolean
  theme: boolean
  onToggle: () => void
}) {
  const url = useStripPreview('grid', frame.id, text, undefined, 0.16)
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-2 rounded-[16px] border-2 p-2 transition focus-within:ring-[3px] focus-within:ring-ink/30 ${
        checked ? 'border-ink' : 'border-border opacity-60 hover:opacity-100'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-[4px] bg-sand">
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="hb-skeleton block size-full" />
        )}
        <span
          className={`absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border-2 ${
            checked ? 'border-ink bg-ink text-white' : 'border-white bg-white/80'
          }`}
          aria-hidden="true"
        >
          {checked ? <Check className="size-3.5" /> : null}
        </span>
      </span>
      <span className="truncate font-semibold text-[12px] text-ink">{frame.label}</span>
      {theme ? <span className="-mt-2 text-[11px] text-soft">Tema undangan</span> : null}
    </label>
  )
}

function BoothAlbum({ id }: { id: string }) {
  const albums = useQuery(orpc.invitations.hostAlbums.queryOptions({ input: { id } }))
  const [item, setItem] = useState<LightboxItem | null>(null)
  const close = useCallback(() => setItem(null), [])
  const strips = albums.data?.strips ?? []
  const guests = new Set(strips.map((strip) => strip.guestName.trim().toLowerCase())).size
  return (
    <Section title="Album photobooth" hint="Foto strip yang dititipkan tamu.">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-[360px]">
        <Stat label="Foto strip" value={albums.isPending ? '...' : strips.length} />
        <Stat label="Tamu" value={albums.isPending ? '...' : guests} />
      </div>
      {albums.isError ? (
        <p className="text-[14px] text-soft">Album belum bisa dimuat. Muat ulang halaman ini.</p>
      ) : albums.isPending ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {['a', 'b', 'c', 'd', 'e'].map((key) => (
            <div key={key} className="hb-skeleton h-[200px] rounded-[10px]" />
          ))}
        </div>
      ) : strips.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {strips.map((strip) => (
            <button
              key={strip.id}
              type="button"
              onClick={() =>
                setItem({
                  src: mediaUrl(strip.mediaId),
                  alt: `Foto strip dari ${strip.guestName}`,
                  title: strip.guestName,
                  meta: timeLabel(strip.createdAt),
                  fileName: `photobooth-${strip.id.slice(0, 8)}.jpg`,
                })
              }
              className={`flex flex-col gap-1.5 rounded-[10px] text-left ${focusRing}`}
            >
              <span className="grid aspect-[2/3] w-full place-items-center overflow-hidden rounded-[8px] bg-sand/70 p-1.5">
                <img
                  src={mediaUrl(strip.mediaId)}
                  alt={`Foto strip dari ${strip.guestName}`}
                  loading="lazy"
                  className="max-h-full max-w-full rounded-[2px] shadow-md"
                />
              </span>
              <span className="truncate font-semibold text-[12px] text-ink">{strip.guestName}</span>
              <span className="-mt-1.5 truncate text-[11px] text-soft">{timeLabel(strip.createdAt)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-[16px] bg-sand/50 px-4 py-6 text-center text-[14px] text-soft">
          Belum ada foto. Bagikan QR atau link photobooth ke tamu di hari acara.
        </p>
      )}
      <Lightbox item={item} onClose={close} />
    </Section>
  )
}
