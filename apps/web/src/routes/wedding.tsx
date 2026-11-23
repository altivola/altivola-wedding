import { defaultWeddingDesign, type StudioSection, type WeddingDesign } from '@app/api/wedding-design'
import { useQuery } from '@tanstack/react-query'
import { createRoute, Link } from '@tanstack/react-router'
import { useCallback, useReducer, useState } from 'react'
import { authClient } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'
import { rootRoute } from './root'
import { compress, type DraftPhoto, imageSource, WeddingAlbum } from './wedding-album'
import { DesignControls, DesignedInvitation } from './wedding-designer'
import { type Theme, themes, WeddingGallery } from './wedding-gallery'
import { WeddingGarden } from './wedding-garden-view'
import { SectionInspector, studioLabels } from './wedding-inspector'
import { WeddingSceneView } from './wedding-scene-view'
import './wedding.css'
import './wedding-journey.css'
import './wedding-studio.css'

type Published = Awaited<ReturnType<typeof client.weddings.publish>>

export const weddingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WeddingStudio,
})

export const guestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$weddingId/$guestId',
  component: GuestPage,
})

const workshopRooms = {
  entry: 'Pintu masuk',
  gallery: 'Galeri',
  studio: 'Studio',
  album: 'Album',
  send: 'Ruang kirim',
} as const
type WorkshopRoom = keyof typeof workshopRooms
const gardenPlaces = [
  { id: 'gallery', label: 'Galeri' },
  { id: 'album', label: 'Album' },
  { id: 'studio', label: 'Studio' },
  { id: 'send', label: 'Ruang kirim' },
]
const roomCamera: Record<WorkshopRoom, string> = {
  entry: 'Sampul',
  gallery: 'Album',
  studio: 'Acara',
  album: 'Album',
  send: 'Sampul',
}

type DesignHistory = { past: WeddingDesign[]; present: WeddingDesign; future: WeddingDesign[] }
type HistoryEdit = { type: 'update'; design: WeddingDesign } | { type: 'undo' } | { type: 'redo' }
function changeDesign(history: DesignHistory, edit: HistoryEdit): DesignHistory {
  const { past, present, future } = history
  if (edit.type === 'update') {
    if (edit.design === present) return history
    return { past: [...past.slice(-39), present], present: edit.design, future: [] }
  }
  if (edit.type === 'undo') {
    const prior = past.at(-1)
    return prior ? { past: past.slice(0, -1), present: prior, future: [present, ...future] } : history
  }
  const next = future[0]
  return next ? { past: [...past, present], present: next, future: future.slice(1) } : history
}

function WeddingStudio() {
  const [room, setRoom] = useState<WorkshopRoom>('entry')
  const [history, dispatchDesign] = useReducer(changeDesign, { past: [], present: defaultWeddingDesign, future: [] })
  const design = history.present
  const setDesign = useCallback((value: WeddingDesign) => dispatchDesign({ type: 'update', design: value }), [])
  const [mobilePane, setMobilePane] = useState<'content' | 'preview' | 'design'>('content')
  const [studioSection, setStudioSection] = useState<StudioSection>('cover')
  const [device, setDevice] = useState<'wide' | 'phone'>('wide')
  const [inspectorTab, setInspectorTab] = useState<'section' | 'theme'>('section')
  const selectedSection = studioSection === 'cover' || design.sections.includes(studioSection) ? studioSection : 'cover'
  function inspectSection(next: StudioSection) {
    setStudioSection(next)
    setInspectorTab('section')
  }
  const [theme, setTheme] = useState<Theme>('garden')
  const [galleryChapter, setGalleryChapter] = useState('Sampul')
  const explore = useCallback((selected: Theme, chapter: string) => {
    setTheme(selected)
    setGalleryChapter(chapter)
  }, [])
  const { data: session } = authClient.useSession()
  const providers = useQuery(orpc.authProviders.queryOptions())
  const [names, setNames] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [story, setStory] = useState('')
  const [guests, setGuests] = useState('')
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [background, setBackground] = useState<DraftPhoto>()
  const [backgroundError, setBackgroundError] = useState('')
  const [photosBusy, setPhotosBusy] = useState(false)
  const [published, setPublished] = useState<Published>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const hasDraft = Boolean(
    names || date || venue || story || guests || photos.length || background || history.past.length,
  )
  const canSignIn = !session && !hasDraft && !photosBusy && !pending && (providers.data?.includes('altivola') ?? false)
  const guestNames = guests
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
  const preview = { names: names || 'Aruna & Dimas', date, venue, story, theme, design }
  const media = background ? [...photos, background] : photos
  const previewPhotos = media.map((photo) => ({
    src: imageSource(photo.jpeg),
    caption: photo.caption,
    cover: photo.cover,
    background: photo.background,
  }))

  function visit(next: WorkshopRoom) {
    if (photosBusy || pending) return
    setRoom(next)
    requestAnimationFrame(() => {
      document.getElementById('workshop-room')?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    })
  }

  function updatePhotos(next: DraftPhoto[]) {
    if (!photos.length && next.length && !design.sections.includes('album')) {
      const sections = [...design.sections]
      sections.splice(sections.indexOf('rsvp'), 0, 'album')
      setDesign({ ...design, sections })
    }
    setPhotos(next)
  }

  async function publish() {
    if (!names.trim() || !date.trim() || !venue.trim()) {
      setError('Isi nama pasangan, tanggal, dan lokasi di Studio dulu.')
      return
    }
    setPending(true)
    setError('')
    try {
      setPublished(
        await client.weddings.publish({
          content: { names, date, venue, story, theme, design },
          guests: guestNames,
          photos: media.map(({ jpeg, caption, cover, background }) => ({ jpeg, caption, cover, background })),
        }),
      )
    } catch {
      setError('Undangan gagal diterbitkan. Cek koneksi dan isi formulir, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  const accountAction = canSignIn ? (
    <Link className="workshop-sign-in" to="/login">
      Masuk
    </Link>
  ) : session ? (
    <button type="button" title={session.user.name || session.user.email} onClick={() => void authClient.signOut()}>
      Keluar
    </button>
  ) : null

  return (
    <main className="wedding-studio wedding-workshop" data-workshop-room={room} data-workshop-theme={theme}>
      {room !== 'entry' && (
        <WeddingSceneView
          image={`/wedding/${themes[theme].image}.jpg`}
          theme={theme}
          room={room}
          chapter={room === 'gallery' ? galleryChapter : roomCamera[room]}
        />
      )}
      {room !== 'entry' && (
        <header className="workshop-header">
          <button type="button" className="wedding-brand" onClick={() => visit('entry')}>
            hari bersama<span>.</span>
          </button>
          <nav className="workshop-map" aria-label="Peta studio">
            {(Object.keys(workshopRooms) as WorkshopRoom[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-current={room === item ? 'step' : undefined}
                disabled={photosBusy || pending}
                onClick={() => visit(item)}
              >
                {workshopRooms[item]}
              </button>
            ))}
            {accountAction}
          </nav>
        </header>
      )}
      <div className="workshop-room" id="workshop-room" tabIndex={-1} key={room}>
        {room === 'entry' && (
          <WeddingGarden
            places={gardenPlaces}
            accountAction={accountAction}
            onVisit={(id) => {
              if (id === 'gallery' || id === 'studio' || id === 'album' || id === 'send') visit(id)
            }}
          />
        )}
        {room === 'gallery' && (
          <WeddingGallery
            initialTheme={theme}
            onExplore={explore}
            onChoose={(selected) => {
              setTheme(selected)
              visit('studio')
            }}
          />
        )}
        {room === 'studio' && (
          <section className="wedding-workspace journey-workspace">
            <nav className="studio-mobile-nav" aria-label="Panel Studio di HP">
              {(
                [
                  ['content', 'Isi'],
                  ['preview', 'Preview'],
                  ['design', 'Desain'],
                ] as const
              ).map(([id, label]) => (
                <button type="button" key={id} aria-pressed={mobilePane === id} onClick={() => setMobilePane(id)}>
                  {label}
                </button>
              ))}
            </nav>
            <div className="workshop-editor-grid" data-mobile-pane={mobilePane}>
              <div className="wedding-details journey-panel">
                <h2>Studio</h2>
                <label>
                  Template
                  <select
                    value={theme}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      if (value === 'garden' || value === 'night' || value === 'print') setTheme(value)
                    }}
                  >
                    {Object.entries(themes).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nama pasangan
                  <input maxLength={100} value={names} onChange={(e) => setNames(e.target.value)} />
                </label>
                <label>
                  Tanggal dan jam
                  <input maxLength={120} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label>
                  Lokasi
                  <input maxLength={200} value={venue} onChange={(e) => setVenue(e.target.value)} />
                </label>
                <label>
                  Cerita pasangan
                  <textarea maxLength={5000} value={story} onChange={(e) => setStory(e.target.value)} />
                </label>
                <div className="workshop-doors">
                  <button type="button" onClick={() => visit('album')}>
                    Atur foto
                  </button>
                  <button type="button" onClick={() => visit('send')}>
                    Ke ruang kirim
                  </button>
                </div>
              </div>
              <div className="wedding-live">
                <div className="studio-canvas-toolbar">
                  <strong>Preview undangan</strong>
                  <div>
                    <button type="button" aria-pressed={device === 'wide'} onClick={() => setDevice('wide')}>
                      Lebar
                    </button>
                    <button type="button" aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}>
                      HP
                    </button>
                    <button
                      type="button"
                      disabled={!history.past.length}
                      onClick={() => dispatchDesign({ type: 'undo' })}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      disabled={!history.future.length}
                      onClick={() => dispatchDesign({ type: 'redo' })}
                    >
                      Redo
                    </button>
                  </div>
                </div>
                <div className="studio-canvas" data-device={device}>
                  <DesignedInvitation
                    content={preview}
                    recipient={guestNames[0] || 'Tamu undangan'}
                    photos={previewPhotos}
                    editing={{
                      design,
                      onChange: setDesign,
                      section: selectedSection,
                      onSelect: inspectSection,
                      onInspect: (section) => {
                        inspectSection(section)
                        setMobilePane('design')
                      },
                    }}
                    journey
                    rsvp={<p>Hadir · Berhalangan</p>}
                  />
                </div>
              </div>
              <aside className="studio-side journey-panel">
                <nav aria-label="Panel editor">
                  <button
                    type="button"
                    aria-pressed={inspectorTab === 'section'}
                    onClick={() => setInspectorTab('section')}
                  >
                    Bagian
                  </button>
                  <button
                    type="button"
                    aria-pressed={inspectorTab === 'theme'}
                    onClick={() => setInspectorTab('theme')}
                  >
                    Tema & alur
                  </button>
                </nav>
                {inspectorTab === 'section' ? (
                  <>
                    <label>
                      Pilih bagian
                      <select
                        value={selectedSection}
                        onChange={(event) => {
                          const next = (['cover', ...design.sections] as const).find(
                            (item) => item === event.target.value,
                          )
                          if (next) inspectSection(next)
                        }}
                      >
                        {(['cover', ...design.sections] as const).map((item) => (
                          <option key={item} value={item}>
                            {studioLabels[item]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SectionInspector section={selectedSection} design={design} onChange={setDesign} />
                  </>
                ) : (
                  <DesignControls design={design} onChange={setDesign} />
                )}
              </aside>
            </div>
          </section>
        )}
        {room === 'album' && (
          <div className="workshop-album-grid wedding-workspace">
            <div>
              <section className="journey-panel background-picker">
                <h3>Background undangan</h3>
                <label>
                  Upload background
                  <input
                    type="file"
                    accept="image/*"
                    disabled={photosBusy}
                    onChange={async (event) => {
                      const file = event.currentTarget.files?.[0]
                      event.currentTarget.value = ''
                      if (!file) return
                      setPhotosBusy(true)
                      setBackgroundError('')
                      try {
                        setBackground({
                          id: crypto.randomUUID(),
                          jpeg: await compress(file),
                          caption: '',
                          cover: false,
                          background: true,
                        })
                      } catch {
                        setBackgroundError('Background belum bisa dibuka. Coba file gambar di bawah 25 MB.')
                      } finally {
                        setPhotosBusy(false)
                      }
                    }}
                  />
                </label>
                {background && (
                  <>
                    <img src={imageSource(background.jpeg)} alt="Background terpilih" />
                    <button disabled={photosBusy} type="button" onClick={() => setBackground(undefined)}>
                      Hapus background
                    </button>
                  </>
                )}
                {backgroundError && <p role="alert">{backgroundError}</p>}
              </section>
              <WeddingAlbum photos={photos} onChange={updatePhotos} onBusy={setPhotosBusy} />
            </div>
            <DesignedInvitation
              content={preview}
              recipient={guestNames[0] || 'Tamu undangan'}
              photos={previewPhotos}
              rsvp={<p>Hadir · Berhalangan</p>}
            />
          </div>
        )}
        {room === 'send' && (
          <section className="wedding-links journey-panel">
            <h2>Ruang kirim</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void publish()
              }}
            >
              <label>
                Daftar tamu, satu nama per baris
                <textarea required value={guests} onChange={(event) => setGuests(event.target.value)} />
              </label>
              <button type="submit" disabled={pending || guestNames.length === 0}>
                {pending ? 'Menerbitkan…' : 'Terbitkan undangan'}
              </button>
              {error && <p role="alert">{error}</p>}
            </form>
            {published && (
              <>
                <h3>Link tamu</h3>
                <ul>
                  {published.guests.map((guest) => {
                    const href = new URL(`/u/${published.id}/${guest.id}`, window.location.origin)
                    const message = `Halo ${guest.name}, kami mengundang kamu ke pernikahan kami. ${href}`
                    return (
                      <li key={guest.id}>
                        <Link to="/u/$weddingId/$guestId" params={{ weddingId: published.id, guestId: guest.id }}>
                          {guest.name}
                        </Link>
                        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                          Bagikan lewat WhatsApp
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function GuestPage() {
  const params = guestRoute.useParams()
  const invitation = useQuery(orpc.weddings.read.queryOptions({ input: params, retry: false }))
  const [reply, setReply] = useState<boolean>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (invitation.isPending) return <main className="wedding-guest">Membuka undangan…</main>
  if (invitation.isError)
    return <main className="wedding-guest">Undangan belum bisa dibuka. Cek link yang dikirim ke kamu.</main>
  const attending = reply ?? invitation.data.attending
  async function respond(value: boolean) {
    setPending(true)
    setError('')
    try {
      const updated = await client.weddings.rsvp({ ...params, attending: value })
      setReply(updated.attending)
    } catch {
      setError('Jawaban belum tersimpan. Coba lagi.')
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="wedding-guest">
      <DesignedInvitation
        content={invitation.data.content}
        recipient={invitation.data.name}
        rsvpSaved={attending !== null}
        journey
        photos={
          invitation.data.content.photos?.map((photo) => ({
            src: `/api/wedding-media/${params.weddingId}/${photo.id}`,
            caption: photo.caption,
            cover: photo.cover,
            background: photo.background,
          })) ?? []
        }
        rsvp={
          <>
            <button type="button" disabled={pending} onClick={() => void respond(true)}>
              Hadir
            </button>
            <button type="button" disabled={pending} onClick={() => void respond(false)}>
              Berhalangan
            </button>
            {attending !== null && <p role="status">Jawaban tersimpan: {attending ? 'Hadir' : 'Berhalangan'}.</p>}
            {error && <p role="alert">{error}</p>}
          </>
        }
      />
    </main>
  )
}
