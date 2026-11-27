// The guest photobooth: pick a layout and a frame, take the photos, then save, share or add to the album.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, ChevronRight, Download, ImagePlus, Images, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mediaUrl } from '@/lib/image'
import { client, errorMessage, orpc } from '@/lib/orpc'
import { toast } from '@/lib/toast'
import {
  allowedFrames,
  defaultFrame,
  type FrameDef,
  type FrameId,
  type FrameText,
  frameText,
  type Layout,
  type LayoutId,
  layoutById,
  layouts,
  renderStrip,
  type ShotSource,
  slotAspect,
  slotsOf,
} from './frames'
import {
  canvasBlob,
  context2d,
  coverCrop,
  downloadBlob,
  fileImage,
  jpegUnder,
  makeCanvas,
  shareImage,
  wait,
} from './media'
import { useStripPreview } from './preview'
import {
  BottomBar,
  CameraBlocked,
  coupleNames,
  eventDayLabel,
  FileButton,
  Flash,
  focusRing,
  type GuestData,
  GuestPage,
  isOpenNow,
  NameField,
  PrimaryButton,
  SoftButton,
  TopBar,
  useCamera,
  useGuestName,
} from './shared'

type Step = 'landing' | 'layout' | 'frame' | 'capture' | 'result'
type Shot = ShotSource & { url: string }

export function BoothFlow({ data }: { data: GuestData }) {
  const names = coupleNames(data.doc)
  const text = useMemo(() => frameText(data.doc), [data.doc])
  const allowed = useMemo(() => allowedFrames(data.booth.frames), [data.booth.frames])
  const [step, setStep] = useState<Step>('landing')
  const [name, setName] = useGuestName()
  const [layoutId, setLayoutId] = useState<LayoutId>('strip')
  const [frameId, setFrameId] = useState<FrameId>(() => defaultFrame(data.doc.theme, allowed))
  const [shots, setShots] = useState<(Shot | undefined)[]>([])
  const [fromResult, setFromResult] = useState(false)
  const shotsRef = useRef(shots)
  const layout = layoutById(layoutId)
  const complete = shots.filter(Boolean).length === layout.shots

  useEffect(() => {
    document.title = `Photobooth · ${names}`
  }, [names])

  useEffect(() => {
    if (step) window.scrollTo({ top: 0 })
  }, [step])

  useEffect(
    () => () => {
      for (const shot of shotsRef.current) if (shot) URL.revokeObjectURL(shot.url)
    },
    [],
  )

  // Keep the chosen frame valid when the couple changes the allowed frames.
  useEffect(() => {
    if (!allowed.some((frame) => frame.id === frameId)) setFrameId(defaultFrame(data.doc.theme, allowed))
  }, [allowed, frameId, data.doc.theme])

  const setShot = useCallback((index: number, shot: Shot) => {
    const next = [...shotsRef.current]
    const old = next[index]
    if (old) URL.revokeObjectURL(old.url)
    next[index] = shot
    shotsRef.current = next
    setShots(next)
  }, [])

  const clearShots = useCallback(() => {
    for (const shot of shotsRef.current) if (shot) URL.revokeObjectURL(shot.url)
    shotsRef.current = []
    setShots([])
  }, [])

  if (step === 'landing') {
    return <Landing data={data} names={names} name={name} setName={setName} onStart={() => setStep('layout')} />
  }

  if (step === 'layout') {
    return (
      <GuestPage>
        <TopBar title="Photobooth" names={names} onBack={() => setStep('landing')} step="1/4" />
        <StepTitle title="Pilih layout" text="Mau berapa foto dalam satu cetakan?" />
        <fieldset className="grid grid-cols-2 gap-3 pb-4">
          <legend className="sr-only">Layout</legend>
          {layouts.map((item) => (
            <LayoutCard
              key={item.id}
              layout={item}
              selected={item.id === layoutId}
              onSelect={() => {
                if (item.id !== layoutId) {
                  clearShots()
                  setLayoutId(item.id)
                }
              }}
            />
          ))}
        </fieldset>
        <BottomBar>
          <PrimaryButton
            onClick={() => {
              setFromResult(false)
              setStep('frame')
            }}
          >
            Lanjut
          </PrimaryButton>
        </BottomBar>
      </GuestPage>
    )
  }

  if (step === 'frame') {
    return (
      <GuestPage>
        <TopBar title="Photobooth" names={names} onBack={() => setStep(fromResult ? 'result' : 'layout')} step="2/4" />
        <StepTitle title="Pilih frame" text="Frame masih bisa diganti setelah berfoto." />
        <FramePicker
          frames={allowed}
          layoutId={layoutId}
          frameId={frameId}
          text={text}
          shots={complete ? (shots as Shot[]) : undefined}
          onSelect={setFrameId}
        />
        <BottomBar>
          <PrimaryButton onClick={() => setStep(complete ? 'result' : 'capture')}>
            {complete ? 'Pakai frame ini' : 'Lanjut'}
          </PrimaryButton>
        </BottomBar>
      </GuestPage>
    )
  }

  if (step === 'capture') {
    return (
      <CaptureStep
        layout={layout}
        names={names}
        shots={shots}
        setShot={setShot}
        onBack={() => setStep('frame')}
        onDone={() => setStep('result')}
      />
    )
  }

  return (
    <ResultStep
      data={data}
      names={names}
      name={name}
      layout={layout}
      frameId={frameId}
      text={text}
      shots={shots as Shot[]}
      onBack={() => setStep('capture')}
      onChangeFrame={() => {
        setFromResult(true)
        setStep('frame')
      }}
      onAgain={() => {
        clearShots()
        setStep('capture')
      }}
    />
  )
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="pt-4 pb-5">
      <h1 className="font-display font-semibold text-[26px] text-ink leading-tight">{title}</h1>
      <p className="mt-1 text-[15px] text-soft">{text}</p>
    </div>
  )
}

// Landing

function Landing({
  data,
  names,
  name,
  setName,
  onStart,
}: {
  data: GuestData
  names: string
  name: string
  setName: (value: string) => void
  onStart: () => void
}) {
  const demo = data.slug === null
  const open = demo || isOpenNow(data.booth.open, data.doc)
  const text = useMemo(() => frameText(data.doc), [data.doc])
  const theme = defaultFrame(data.doc.theme, allowedFrames(data.booth.frames))
  const strip = useStripPreview('strip', theme, text, undefined, 0.3)
  const square = useStripPreview('grid', theme, text, undefined, 0.18)
  const ready = demo || name.trim().length > 0

  return (
    <GuestPage>
      <div className="flex flex-1 flex-col gap-6 pt-10 pb-4">
        <div className="text-center">
          <p className="font-mono text-[12px] text-terra uppercase tracking-[0.22em]">Photobooth</p>
          <h1 className="mt-2 font-bold font-display text-[38px] text-ink leading-[1.05]">{names}</h1>
          <p className="mx-auto mt-3 max-w-[340px] text-[15px] text-soft">
            Ambil foto strip pakai ponselmu, pilih frame, lalu titipkan di album tamu.
          </p>
        </div>

        <div className="relative mx-auto h-[250px] w-[260px]" aria-hidden="true">
          {square ? (
            <img
              src={square}
              alt=""
              className="hb-print absolute top-5 left-2 w-[140px] -rotate-6 rounded-[3px] bg-white"
            />
          ) : null}
          {strip ? (
            <img src={strip} alt="" className="hb-print absolute top-0 right-6 w-[78px] rotate-[5deg] rounded-[3px]" />
          ) : (
            <div className="hb-skeleton absolute top-0 right-6 h-[234px] w-[78px] rounded-[3px]" />
          )}
        </div>

        {demo ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-border bg-white p-4">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-terra" aria-hidden="true" />
            <p className="text-[14px] text-soft">
              Ini mode coba. Fotomu tidak disimpan ke album mana pun.{' '}
              <Link to="/buat" className="font-semibold text-ink underline underline-offset-4">
                Buat undanganmu
              </Link>{' '}
              untuk membuka photobooth di hari kalian.
            </p>
          </div>
        ) : (
          <AlbumCard slug={data.slug as string} />
        )}

        {open ? <NameField id="booth-name" value={name} onChange={setName} /> : <ClosedCard doc={data} />}
      </div>
      {open ? (
        <BottomBar>
          <PrimaryButton disabled={!ready} onClick={onStart}>
            Mulai
          </PrimaryButton>
          {!ready ? <p className="mt-2 text-center text-[13px] text-soft">Isi namamu dulu ya.</p> : null}
        </BottomBar>
      ) : null}
    </GuestPage>
  )
}

function ClosedCard({ doc }: { doc: GuestData }) {
  const day = eventDayLabel(doc.doc)
  return (
    <div className="rounded-[24px] border border-border bg-white p-5 text-center">
      <p className="font-display font-semibold text-[20px] text-ink">Photobooth belum buka</p>
      <p className="mt-1 text-[14px] text-soft">
        {doc.booth.open === 'event' && day
          ? `Photobooth dibuka di hari acara, ${day}. Simpan link ini dan kembali lagi nanti ya.`
          : 'Photobooth sedang ditutup. Kamu masih bisa melihat album tamu.'}
      </p>
    </div>
  )
}

function AlbumCard({ slug }: { slug: string }) {
  const album = useQuery(orpc.invitations.boothAlbum.queryOptions({ input: { slug } }))
  const strips = album.data ?? []
  return (
    <Link
      to="/u/$slug/album"
      params={{ slug }}
      className={`flex items-center gap-3 rounded-[22px] border border-border bg-white p-3 pr-4 transition hover:bg-sand/60 ${focusRing}`}
    >
      <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-sand">
        {strips[0] ? (
          <img src={mediaUrl(strips[0].mediaId)} alt="" className="size-full object-cover" />
        ) : (
          <Images className="size-6 text-soft" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-snug">
        <span className="font-semibold text-ink">
          {album.isPending ? 'Memuat album' : `${strips.length} foto di album tamu`}
        </span>
        <span className="text-soft"> · </span>
        <span className="font-semibold text-terra">Lihat semua</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-soft" aria-hidden="true" />
    </Link>
  )
}

// Layout and frame pickers

function LayoutCard({ layout, selected, onSelect }: { layout: Layout; selected: boolean; onSelect: () => void }) {
  const box = 96
  const scale = Math.min(box / layout.width, box / layout.height)
  const width = layout.width * scale
  const height = layout.height * scale
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex flex-col items-center gap-3 rounded-[22px] border-2 bg-white px-3 pt-5 pb-4 text-center transition ${
        selected ? 'border-ink' : 'border-border hover:border-[#cfc6b4]'
      } ${focusRing}`}
    >
      <span className="grid h-[100px] place-items-center">
        <span className="hb-layout-preview block" style={{ width, height }}>
          {slotsOf(layout).map((slot) => (
            <span
              key={`${slot.x}-${slot.y}`}
              style={{
                left: `${(slot.x / layout.width) * 100}%`,
                top: `${(slot.y / layout.height) * 100}%`,
                width: `${(slot.w / layout.width) * 100}%`,
                height: `${(slot.h / layout.height) * 100}%`,
              }}
            />
          ))}
          <span
            style={{
              left: '30%',
              width: '40%',
              top: `${((layout.height - layout.footer * 0.55) / layout.height) * 100}%`,
              height: 3,
              background: 'var(--hb-ink)',
              opacity: 0.35,
              boxShadow: 'none',
            }}
          />
        </span>
      </span>
      <span>
        <span className="flex items-center justify-center gap-1.5 font-semibold text-[15px] text-ink">
          {layout.label}
          {selected ? <Check className="size-4" aria-hidden="true" /> : null}
        </span>
        <span className="block text-[13px] text-soft">
          {layout.shots} foto · {layout.size}
        </span>
      </span>
    </button>
  )
}

export function FramePicker({
  frames,
  layoutId,
  frameId,
  text,
  shots,
  onSelect,
}: {
  frames: FrameDef[]
  layoutId: LayoutId
  frameId: FrameId
  text: FrameText
  shots: ShotSource[] | undefined
  onSelect: (id: FrameId) => void
}) {
  const cols = layoutId === 'strip' ? 'grid-cols-4' : layoutId === 'wide' ? 'grid-cols-2' : 'grid-cols-3'
  return (
    <fieldset className={`grid gap-3 pb-4 ${cols}`}>
      <legend className="sr-only">Frame</legend>
      {frames.map((frame) => (
        <FrameCard
          key={frame.id}
          frame={frame}
          layoutId={layoutId}
          text={text}
          shots={shots}
          selected={frame.id === frameId}
          onSelect={() => onSelect(frame.id)}
        />
      ))}
    </fieldset>
  )
}

function FrameCard({
  frame,
  layoutId,
  text,
  shots,
  selected,
  onSelect,
}: {
  frame: FrameDef
  layoutId: LayoutId
  text: FrameText
  shots: ShotSource[] | undefined
  selected: boolean
  onSelect: () => void
}) {
  const layout = layoutById(layoutId)
  const url = useStripPreview(layoutId, frame.id, text, shots, layoutId === 'strip' ? 0.32 : 0.2)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-[16px] p-1.5 text-left transition ${
        selected ? 'bg-ink/5 ring-2 ring-ink' : 'hover:bg-sand'
      } ${focusRing}`}
    >
      <span
        className="relative block w-full overflow-hidden rounded-[4px] shadow-[0_4px_14px_rgb(28_26_22/0.14)]"
        style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="hb-skeleton block size-full" />
        )}
        {selected ? (
          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink text-white">
            <Check className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </span>
      <span className="truncate px-0.5 font-semibold text-[12px] text-ink">{frame.label}</span>
    </button>
  )
}

// Capture

function CaptureStep({
  layout,
  names,
  shots,
  setShot,
  onBack,
  onDone,
}: {
  layout: Layout
  names: string
  shots: (Shot | undefined)[]
  setShot: (index: number, shot: Shot) => void
  onBack: () => void
  onDone: () => void
}) {
  const camera = useCamera('user', true)
  const blocked = camera.status === 'blocked' || camera.status === 'unavailable'
  const live = camera.status === 'live'
  const [count, setCount] = useState<number | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const runRef = useRef(0)
  const aspect = slotAspect(layout)
  const slots = Array.from({ length: layout.shots }, (_, index) => index)
  const empties = slots.filter((index) => !shots[index])
  const complete = empties.length === 0

  useEffect(
    () => () => {
      runRef.current++
    },
    [],
  )

  const grab = async (index: number) => {
    const video = camera.videoRef.current
    if (!video?.videoWidth) return false
    const crop = coverCrop(video.videoWidth, video.videoHeight, aspect)
    const width = Math.min(crop.sw, 1400)
    const canvas = makeCanvas(width, width / aspect)
    const context = context2d(canvas)
    // Mirrored, the way guests saw themselves on screen.
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height)
    const blob = await canvasBlob(canvas, 0.85)
    setShot(index, { source: canvas, width: canvas.width, height: canvas.height, url: URL.createObjectURL(blob) })
    return true
  }

  const take = async (indices: number[]) => {
    if (!indices.length || busy) return
    const run = ++runRef.current
    setBusy(true)
    try {
      for (const index of indices) {
        setActive(index)
        for (let n = 3; n >= 1; n--) {
          if (runRef.current !== run) return
          setCount(n)
          await wait(900)
        }
        if (runRef.current !== run) return
        setCount(null)
        setFlashKey((value) => value + 1)
        const ok = await grab(index)
        if (!ok) {
          toast('Kamera belum siap. Coba lagi.')
          return
        }
        await wait(650)
      }
    } finally {
      if (runRef.current === run) {
        setBusy(false)
        setActive(null)
        setCount(null)
      }
    }
  }

  const addFiles = async (files: File[]) => {
    const order = target !== null ? [target] : empties.length ? empties : slots
    setTarget(null)
    for (const [position, file] of files.slice(0, order.length).entries()) {
      try {
        const picked = await fileImage(file)
        setShot(order[position] as number, {
          source: picked.image,
          width: picked.width,
          height: picked.height,
          url: picked.url,
        })
      } catch {
        toast('Foto ini tidak bisa dibuka. Coba foto lain.')
      }
    }
  }

  const onSlot = (index: number) => {
    if (busy) return
    if (live) void take([index])
    else setTarget((current) => (current === index ? null : index))
  }

  const status = busy
    ? `Foto ${(active ?? 0) + 1} dari ${layout.shots}. Senyum!`
    : complete
      ? 'Semua foto siap. Ketuk foto kecil untuk mengulang.'
      : target !== null
        ? `Pilih foto pengganti untuk foto ${target + 1}.`
        : `${layout.shots} foto, hitungan mundur 3 detik tiap foto.`

  return (
    <GuestPage doodles={false}>
      <TopBar title="Photobooth" names={names} onBack={onBack} step="3/4" />
      <div className="flex flex-col gap-4 pt-2 pb-2">
        <p className="text-center text-[14px] text-soft" aria-live="polite">
          {status}
        </p>
        {blocked ? (
          <CameraBlocked status={camera.status} onRetry={camera.retry} onFiles={addFiles} facing="user" />
        ) : (
          <div
            className="hb-viewfinder relative mx-auto w-full overflow-hidden rounded-[28px] bg-ink"
            style={{ aspectRatio: aspect, maxWidth: `calc(58dvh * ${aspect})` }}
          >
            <video ref={camera.videoRef} playsInline muted autoPlay aria-label="Kamera depan" />
            {!live ? (
              <div className="absolute inset-0 grid place-items-center text-[14px] text-white/80">
                <span className="flex flex-col items-center gap-3">
                  <span className="hb-spinner" aria-hidden="true" />
                  Membuka kamera...
                </span>
              </div>
            ) : null}
            {count !== null ? (
              <div className="absolute inset-0 grid place-items-center bg-black/10">
                <span key={`${active}-${count}`} className="hb-count" aria-hidden="true">
                  {count}
                </span>
              </div>
            ) : null}
            <Flash flashKey={flashKey} />
          </div>
        )}
        <p className="sr-only" aria-live="assertive">
          {count ?? ''}
        </p>

        <fieldset className="flex justify-center gap-2">
          <legend className="sr-only">Foto yang sudah diambil</legend>
          {slots.map((index) => {
            const shot = shots[index]
            const highlighted = active === index || target === index
            return (
              <button
                type="button"
                key={index}
                disabled={busy}
                onClick={() => onSlot(index)}
                aria-label={shot ? `Ulangi foto ${index + 1}` : `Foto ${index + 1}, belum diambil`}
                className={`relative grid h-[76px] place-items-center overflow-hidden rounded-[12px] border-2 bg-white transition disabled:cursor-default ${
                  highlighted ? 'border-terra' : shot ? 'border-transparent' : 'border-[#d6cebd] border-dashed'
                } ${focusRing}`}
                style={{ aspectRatio: aspect }}
              >
                {shot ? (
                  <>
                    <img src={shot.url} alt="" className="size-full object-cover" />
                    <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-ink/75 text-white">
                      <RotateCcw className="size-3" aria-hidden="true" />
                    </span>
                  </>
                ) : (
                  <span className="font-mono text-[15px] text-soft">{index + 1}</span>
                )}
              </button>
            )
          })}
        </fieldset>
      </div>
      <BottomBar>
        {complete ? (
          <PrimaryButton disabled={busy} onClick={onDone}>
            Lihat hasil
          </PrimaryButton>
        ) : live ? (
          <PrimaryButton disabled={busy} onClick={() => void take(empties)}>
            {busy ? 'Siap-siap...' : empties.length === layout.shots ? 'Mulai foto' : 'Ambil sisa foto'}
          </PrimaryButton>
        ) : null}
        {!blocked ? (
          <div className="mt-2 flex justify-center">
            <FileButton multiple onFiles={addFiles} variant="ghost" className="h-10">
              <ImagePlus className="size-4" aria-hidden="true" />
              Pilih dari galeri
            </FileButton>
          </div>
        ) : null}
      </BottomBar>
    </GuestPage>
  )
}

// Result

type Result = { canvas: HTMLCanvasElement; blob: Blob; url: string }

function ResultStep({
  data,
  names,
  name,
  layout,
  frameId,
  text,
  shots,
  onBack,
  onChangeFrame,
  onAgain,
}: {
  data: GuestData
  names: string
  name: string
  layout: Layout
  frameId: FrameId
  text: FrameText
  shots: Shot[]
  onBack: () => void
  onChangeFrame: () => void
  onAgain: () => void
}) {
  const demo = data.slug === null
  const queryClient = useQueryClient()
  const [result, setResult] = useState<Result | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const fileName = `photobooth-${data.slug ?? 'coba'}-${Date.now().toString(36)}.jpg`

  useEffect(() => {
    let active = true
    let url = ''
    setUploaded(false)
    ;(async () => {
      const canvas = await renderStrip(layout.id, frameId, shots, text)
      const blob = await canvasBlob(canvas, 0.92)
      url = URL.createObjectURL(blob)
      if (active) setResult({ canvas, blob, url })
      else URL.revokeObjectURL(url)
    })().catch(() => toast('Gagal menyusun foto. Coba lagi.'))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [layout.id, frameId, shots, text])

  const upload = useMutation({
    mutationFn: async () => {
      if (!result || !data.slug) throw new Error('Foto belum siap')
      const jpeg = jpegUnder(result.canvas, 1_850_000, 0.92)
      return client.invitations.boothUpload({
        slug: data.slug,
        name: name.trim() || 'Tamu',
        layout: layout.id,
        frame: frameId,
        jpeg,
      })
    },
    onSuccess: async () => {
      setUploaded(true)
      toast('Fotomu sudah masuk album')
      await queryClient.invalidateQueries({ queryKey: orpc.invitations.boothAlbum.key() })
    },
    onError: (error) => toast(errorMessage(error, 'Gagal mengunggah. Coba lagi.')),
  })

  const share = async () => {
    if (!result) return
    try {
      const shared = await shareImage(result.blob, fileName, `Photobooth ${names}`)
      if (!shared) {
        downloadBlob(result.blob, fileName)
        toast('Browser ini belum bisa berbagi foto. Fotonya disimpan, bagikan dari galeri ya.', 4000)
      }
    } catch {
      toast('Gagal membagikan. Coba simpan dulu.')
    }
  }

  return (
    <GuestPage>
      <TopBar title="Photobooth" names={names} onBack={onBack} step="4/4" />
      <div className="flex flex-col gap-5 pt-3 pb-2">
        <div className="grid min-h-[300px] place-items-center">
          {result ? (
            <img
              src={result.url}
              alt={`Foto ${layout.label.toLowerCase()} dengan frame untuk ${names}`}
              className="hb-print h-auto max-h-[60dvh] w-auto max-w-full rounded-[3px]"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-[14px] text-soft" role="status">
              <span className="hb-spinner" aria-hidden="true" />
              Menyusun fotomu...
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SoftButton disabled={!result} onClick={() => result && downloadBlob(result.blob, fileName)}>
            <Download className="size-4" aria-hidden="true" />
            Simpan
          </SoftButton>
          <SoftButton disabled={!result} onClick={() => void share()}>
            <Share2 className="size-4" aria-hidden="true" />
            Bagikan
          </SoftButton>
        </div>
        <div className="flex justify-center gap-6">
          <button
            type="button"
            onClick={onChangeFrame}
            className={`py-1 font-semibold text-[14px] text-ink underline underline-offset-4 ${focusRing}`}
          >
            Ganti frame
          </button>
          <button
            type="button"
            onClick={onAgain}
            className={`py-1 font-semibold text-[14px] text-ink underline underline-offset-4 ${focusRing}`}
          >
            Foto lagi
          </button>
        </div>
      </div>
      <BottomBar>
        {demo ? (
          <p className="rounded-[18px] bg-sand px-4 py-3 text-center text-[14px] text-soft">
            Mode coba: foto tidak dimasukkan ke album. Di undangan asli, tamu bisa menitipkan fotonya di album.
          </p>
        ) : uploaded ? (
          <div className="flex flex-col items-center gap-2">
            <PrimaryButton disabled className="disabled:opacity-100">
              <Check className="size-5" aria-hidden="true" />
              Sudah masuk album
            </PrimaryButton>
            <Link
              to="/u/$slug/album"
              params={{ slug: data.slug as string }}
              className={`py-1 font-semibold text-[14px] text-terra underline underline-offset-4 ${focusRing}`}
            >
              Lihat album tamu
            </Link>
          </div>
        ) : (
          <PrimaryButton disabled={!result || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Mengunggah...' : 'Masukkan ke album'}
          </PrimaryButton>
        )}
      </BottomBar>
    </GuestPage>
  )
}
