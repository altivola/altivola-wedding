// The guest album: photobooth strips, and disposable camera shots once the couple opens them.
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Camera, Images, Lock } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useState } from 'react'
import { filmOf } from '@/camera/films'
import { mediaUrl } from '@/lib/image'
import { orpc } from '@/lib/orpc'
import { coupleNames, focusRing, type GuestData, GuestPage, Lightbox, type LightboxItem, timeLabel } from './shared'

type Tab = 'booth' | 'camera'

export function AlbumPage({ data }: { data: GuestData }) {
  const slug = data.slug as string
  const names = coupleNames(data.doc)
  const [tab, setTab] = useState<Tab>('booth')
  const [item, setItem] = useState<LightboxItem | null>(null)
  const close = useCallback(() => setItem(null), [])

  useEffect(() => {
    document.title = `Album tamu · ${names}`
  }, [names])

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const next = tab === 'booth' ? 'camera' : 'booth'
      setTab(next)
      document.getElementById(`album-tab-${next}`)?.focus()
    }
  }

  return (
    <GuestPage>
      <div className="flex flex-col gap-5 pt-10 pb-10">
        <div className="text-center">
          <p className="font-mono text-[12px] text-terra uppercase tracking-[0.22em]">Album tamu</p>
          <h1 className="mt-2 font-bold font-display text-[34px] text-ink leading-[1.05]">{names}</h1>
          <p className="mt-2 text-[15px] text-soft">Momen dari kamera para tamu.</p>
        </div>

        <div
          role="tablist"
          aria-label="Album"
          className="grid grid-cols-2 gap-1 rounded-full border border-border bg-white p-1"
          onKeyDown={onKey}
        >
          {(
            [
              ['booth', 'Photobooth'],
              ['camera', 'Kamera'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              id={`album-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`album-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={`h-10 rounded-full font-semibold text-[14px] transition ${
                tab === id ? 'bg-ink text-white' : 'text-soft hover:text-ink'
              } ${focusRing}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div id={`album-panel-${tab}`} role="tabpanel" aria-labelledby={`album-tab-${tab}`}>
          {tab === 'booth' ? <BoothPanel slug={slug} onOpen={setItem} /> : <CameraPanel slug={slug} onOpen={setItem} />}
        </div>
      </div>
      <Lightbox item={item} onClose={close} />
    </GuestPage>
  )
}

function GridSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="status" aria-label="Memuat foto">
      {['a', 'b', 'c', 'd'].map((key) => (
        <div key={key} className={`hb-skeleton rounded-[14px] ${tall ? 'h-[260px]' : 'h-[180px]'}`} />
      ))}
    </div>
  )
}

function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode
  title: string
  text: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[24px] border border-border bg-white px-5 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-sand text-ink">{icon}</span>
      <p className="mt-1 font-display font-semibold text-[20px] text-ink">{title}</p>
      <p className="max-w-[300px] text-[14px] text-soft">{text}</p>
      {children}
    </div>
  )
}

const pill = `mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-[14px] text-white ${focusRing}`

function BoothPanel({ slug, onOpen }: { slug: string; onOpen: (item: LightboxItem) => void }) {
  const album = useQuery(orpc.invitations.boothAlbum.queryOptions({ input: { slug } }))
  if (album.isPending) return <GridSkeleton tall />
  if (album.isError)
    return (
      <Empty
        icon={<Images className="size-6" />}
        title="Album belum bisa dibuka"
        text="Periksa koneksimu, lalu muat ulang halaman ini."
      />
    )
  if (!album.data.length) {
    return (
      <Empty
        icon={<Images className="size-6" />}
        title="Belum ada foto"
        text="Jadi tamu pertama yang menitipkan foto strip di sini."
      >
        <Link to="/u/$slug/booth" params={{ slug }} className={pill}>
          Buka photobooth
        </Link>
      </Empty>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-soft">{album.data.length} foto strip dari tamu</p>
      <div className="hb-masonry">
        {album.data.map((strip) => (
          <button
            key={strip.id}
            type="button"
            onClick={() =>
              onOpen({
                src: mediaUrl(strip.mediaId),
                alt: `Foto strip dari ${strip.guestName}`,
                title: strip.guestName,
                meta: timeLabel(strip.createdAt),
                fileName: `photobooth-${strip.id.slice(0, 8)}.jpg`,
              })
            }
            className={`block w-full rounded-[10px] text-left ${focusRing}`}
          >
            <img
              src={mediaUrl(strip.mediaId)}
              alt={`Foto strip dari ${strip.guestName}`}
              loading="lazy"
              className="hb-print w-full rounded-[4px] bg-white"
            />
            <span className="mt-2 block truncate px-0.5 font-semibold text-[13px] text-ink">{strip.guestName}</span>
          </button>
        ))}
      </div>
      <Link to="/u/$slug/booth" params={{ slug }} className={`${pill} self-center`}>
        Ambil foto strip juga
      </Link>
    </div>
  )
}

function CameraPanel({ slug, onOpen }: { slug: string; onOpen: (item: LightboxItem) => void }) {
  const album = useQuery(orpc.invitations.cameraAlbum.queryOptions({ input: { slug } }))
  if (album.isPending) return <GridSkeleton />
  if (album.isError)
    return (
      <Empty
        icon={<Camera className="size-6" />}
        title="Album belum bisa dibuka"
        text="Periksa koneksimu, lalu muat ulang halaman ini."
      />
    )
  const { revealed, rolls, count, shots } = album.data
  if (!revealed) {
    return (
      <Empty
        icon={<Lock className="size-6" />}
        title="Album dibuka setelah acara"
        text={
          count
            ? `${count} foto dari ${rolls} rol sedang menunggu dicuci. Pengantin akan membukanya setelah acara.`
            : 'Belum ada foto dari kamera tamu. Pengantin akan membuka albumnya setelah acara.'
        }
      >
        <Link to="/u/$slug/kamera" params={{ slug }} className={pill}>
          <Camera className="size-4" aria-hidden="true" />
          Ambil rol film
        </Link>
      </Empty>
    )
  }
  if (!shots.length) {
    return (
      <Empty
        icon={<Camera className="size-6" />}
        title="Belum ada foto"
        text="Belum ada tamu yang memotret dengan kamera sekali pakai."
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-soft">
        {count} foto dari {rolls} rol
      </p>
      <div className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-3">
        {shots.map((shot) => {
          const film = filmOf(shot.film).name
          return (
            <button
              key={shot.id}
              type="button"
              onClick={() =>
                onOpen({
                  src: mediaUrl(shot.mediaId),
                  alt: `Foto dari ${shot.guestName}`,
                  title: shot.guestName,
                  meta: `${film} · ${timeLabel(shot.createdAt)}`,
                  fileName: `kamera-${shot.id.slice(0, 8)}.jpg`,
                })
              }
              className={`flex flex-col gap-1.5 rounded-[6px] bg-white p-1.5 pb-2 text-left shadow-[0_6px_18px_rgb(28_26_22/0.12)] ${focusRing}`}
            >
              <img
                src={mediaUrl(shot.mediaId)}
                alt={`Foto dari ${shot.guestName}`}
                loading="lazy"
                className="aspect-[2/3] w-full rounded-[2px] bg-sand object-cover"
              />
              <span className="truncate px-0.5 font-semibold text-[13px] text-ink">{shot.guestName}</span>
              <span className="-mt-1 truncate px-0.5 font-mono text-[11px] text-soft">{film}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
