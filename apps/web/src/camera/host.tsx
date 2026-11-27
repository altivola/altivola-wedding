// Studio tab for the disposable camera: film, roll size, schedule, album reveal, QR and every shot.
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import {
  eventDate,
  HostPage,
  inkButton,
  NoticeCard,
  OpenSchedule,
  QrPanel,
  Section,
  Stat,
  Switch,
  useSaveSettings,
} from '@/booth/host-ui'
import { coupleNames, focusRing, Lightbox, type LightboxItem, timeLabel } from '@/booth/shared'
import { mediaUrl } from '@/lib/image'
import { orpc } from '@/lib/orpc'
import { type Editable, useStudio } from '@/studio/context'
import { type FilmId, filmIds, filmOf, filmSamples } from './films'

const intro = 'Setiap tamu dapat satu rol film. Tanpa preview, semua jepretan masuk album yang kamu buka setelah acara.'
const rollSizes = [12, 24, 36] as const

export function CameraTab(): ReactElement {
  const { invitation, owned, requireAccount } = useStudio()
  if (!owned) {
    return (
      <HostPage title="Kamera sekali pakai" intro={intro}>
        <NoticeCard
          title="Masuk dulu untuk mengatur kamera"
          text="Film, jumlah jepretan, dan album kamera disimpan di akunmu."
          action={
            <button type="button" className={inkButton} onClick={() => requireAccount('Masuk untuk mengatur kamera')}>
              Masuk
            </button>
          }
        />
      </HostPage>
    )
  }
  if (!invitation.slug) {
    return (
      <HostPage title="Kamera sekali pakai" intro={intro}>
        <NoticeCard title="Terbitkan undangan dulu untuk membuka kamera" />
      </HostPage>
    )
  }
  return <CameraSettings invitation={invitation} slug={invitation.slug} />
}

function CameraSettings({ invitation, slug }: { invitation: Editable; slug: string }) {
  const doc = invitation.published ?? invitation.draft
  const save = useSaveSettings()
  const camera = (save.isPending ? save.variables?.camera : undefined) ?? invitation.camera
  const change = (patch: Partial<typeof camera>) => save.mutate({ camera: { ...camera, ...patch } })
  const url = `${window.location.origin}/u/${slug}/kamera`

  return (
    <HostPage title="Kamera sekali pakai" intro={intro}>
      <Section
        title="Film"
        hint="Semua tamu memakai film yang sama. Rol yang sudah diambil tetap memakai film lamanya."
      >
        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" disabled={save.isPending}>
          <legend className="sr-only">Film</legend>
          {filmIds.map((id) => (
            <FilmOption key={id} id={id} checked={camera.film === id} onPick={() => change({ film: id })} />
          ))}
        </fieldset>
      </Section>

      <Section title="Isi satu rol" hint="Jumlah jepretan untuk setiap tamu.">
        <fieldset className="inline-flex rounded-full border border-border bg-white p-1" disabled={save.isPending}>
          <legend className="sr-only">Jepretan per rol</legend>
          {rollSizes.map((size) => (
            <label
              key={size}
              className={`cursor-pointer rounded-full px-5 py-2 font-semibold text-[14px] transition focus-within:ring-[3px] focus-within:ring-ink/30 ${
                camera.shots === size ? 'bg-ink text-white' : 'text-soft hover:text-ink'
              }`}
            >
              <input
                type="radio"
                name="camera-shots"
                className="sr-only"
                checked={camera.shots === size}
                onChange={() => change({ shots: size })}
              />
              {size} jepretan
            </label>
          ))}
        </fieldset>
      </Section>

      <Section title="Jadwal buka">
        <OpenSchedule
          name="camera-open"
          value={camera.open}
          day={eventDate(doc.events)}
          disabled={save.isPending}
          onChange={(open) => change({ open })}
        />
      </Section>

      <Section title="Album">
        <Switch
          label="Buka album untuk tamu"
          text={
            camera.revealed
              ? 'Tamu bisa melihat semua jepretan di halaman album.'
              : 'Tamu baru melihat jumlah foto. Kamu tetap bisa melihat semuanya di bawah.'
          }
          checked={camera.revealed}
          disabled={save.isPending}
          onChange={(revealed) => change({ revealed })}
        />
      </Section>

      <Section title="QR untuk venue" hint="Link kamera untuk tamu.">
        <QrPanel url={url} title="Kamera" names={coupleNames(doc)} fileName={`qr-kamera-${slug}.png`} />
      </Section>

      <CameraAlbum id={invitation.id} />
    </HostPage>
  )
}

function FilmOption({ id, checked, onPick }: { id: FilmId; checked: boolean; onPick: () => void }) {
  const film = filmOf(id)
  const [sample, setSample] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    filmSamples(id)
      .then((urls) => {
        if (active) setSample(urls[0] ?? null)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [id])
  return (
    <label
      className={`flex cursor-pointer flex-col gap-2 rounded-[18px] border-2 p-2 transition focus-within:ring-[3px] focus-within:ring-ink/30 ${
        checked ? 'border-ink' : 'border-border hover:border-[#cfc6b4]'
      }`}
    >
      <input type="radio" name="camera-film" checked={checked} onChange={onPick} className="sr-only" />
      <span className="relative block aspect-[3/2] w-full overflow-hidden rounded-[10px] bg-[#1b130c]">
        {sample ? (
          <img src={sample} alt="" className="size-full object-cover" />
        ) : (
          <span className="hb-skeleton block size-full" />
        )}
        {checked ? (
          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink text-white">
            <Check className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </span>
      <span className="px-1 pb-1">
        <span className="block font-medium font-mono text-[14px] text-ink">{film.name}</span>
        <span className="block text-[12px] text-soft leading-snug">{film.line}</span>
      </span>
    </label>
  )
}

function CameraAlbum({ id }: { id: string }) {
  const albums = useQuery(orpc.invitations.hostAlbums.queryOptions({ input: { id } }))
  const [item, setItem] = useState<LightboxItem | null>(null)
  const close = useCallback(() => setItem(null), [])
  const shots = albums.data?.shots ?? []
  return (
    <Section title="Semua jepretan" hint="Hanya kamu yang bisa melihat ini sebelum album dibuka.">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-[360px]">
        <Stat label="Rol diambil" value={albums.isPending ? '...' : (albums.data?.rolls ?? 0)} />
        <Stat label="Foto" value={albums.isPending ? '...' : shots.length} />
      </div>
      {albums.isError ? (
        <p className="text-[14px] text-soft">Album belum bisa dimuat. Muat ulang halaman ini.</p>
      ) : albums.isPending ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
            <div key={key} className="hb-skeleton aspect-[2/3] rounded-[8px]" />
          ))}
        </div>
      ) : shots.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {shots.map((shot) => {
            const film = filmOf(shot.film).name
            return (
              <button
                key={shot.id}
                type="button"
                onClick={() =>
                  setItem({
                    src: mediaUrl(shot.mediaId),
                    alt: `Foto dari ${shot.guestName}`,
                    title: shot.guestName,
                    meta: `${film} · ${timeLabel(shot.createdAt)}`,
                    fileName: `kamera-${shot.id.slice(0, 8)}.jpg`,
                  })
                }
                className={`flex flex-col gap-1 rounded-[8px] text-left ${focusRing}`}
              >
                <img
                  src={mediaUrl(shot.mediaId)}
                  alt={`Foto dari ${shot.guestName}`}
                  loading="lazy"
                  className="aspect-[2/3] w-full rounded-[6px] bg-sand object-cover"
                />
                <span className="truncate font-semibold text-[12px] text-ink">{shot.guestName}</span>
                <span className="-mt-1 truncate font-mono text-[10px] text-soft">{film}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="rounded-[16px] bg-sand/50 px-4 py-6 text-center text-[14px] text-soft">
          Belum ada jepretan. Bagikan QR atau link kamera ke tamu di hari acara.
        </p>
      )}
      <Lightbox item={item} onClose={close} />
    </Section>
  )
}
