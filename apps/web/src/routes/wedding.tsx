import type { InvitationMusic } from '@app/api/music'
import { defaultWeddingDesign, type StudioSection, type WeddingDesign } from '@app/api/wedding-design'
import { useQuery } from '@tanstack/react-query'
import { createRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { type ComponentProps, useCallback, useEffect, useReducer, useState } from 'react'
import { authClient } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'
import { rootRoute } from './root'
import { compress, type DraftPhoto, imageSource, WeddingAlbum } from './wedding-album'
import { type DraftAudio, WeddingAudioEditor, weddingAudioSource } from './wedding-custom-audio'
import { WeddingContentEditor } from './wedding-custom-content'
import { DesignControls, DesignedInvitation } from './wedding-designer'
import { applyTemplate, TemplateCards, type Theme, templateSearch, themes, WeddingGallery } from './wedding-gallery'
import { SectionInspector, studioLabels } from './wedding-inspector'
import { WeddingGuestManager, WeddingIssueReport, WeddingOverview } from './wedding-manage'
import { defaultWeddingMusic, WeddingMusicPicker } from './wedding-music'
import { GuestQr } from './wedding-qr'
import { ScheduleEditor } from './wedding-template-features'
import './wedding.css'
import './wedding-journey.css'
import './wedding-studio.css'
import './wedding-templates.css'
import './wedding-scenography.css'
import './wedding-template-features.css'
import './wedding-experiences.css'
import './wedding-manage.css'

type Published = Awaited<ReturnType<typeof client.weddings.publish>>

export const weddingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WeddingLanding,
})

export const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/studio',
  validateSearch: templateSearch,
  beforeLoad: async ({ search }) => {
    const { data } = await authClient.getSession()
    if (!data) throw redirect({ to: '/login', search })
  },
  component: WeddingStudio,
})

export const guestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$weddingId/$guestId',
  component: GuestPage,
})

export const exampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contoh',
  validateSearch: templateSearch,
  component: ExamplePage,
})

function WeddingLanding() {
  return (
    <main className="wedding-landing">
      <header className="landing-header">
        <Link className="wedding-brand" to="/">
          hari bersama<span>.</span>
        </Link>
        <Link to="/studio">Masuk</Link>
      </header>
      <div className="landing-hero">
        <div className="landing-copy">
          <h1>
            Satu hari.
            <br />
            <em>Banyak cerita.</em>
          </h1>
          <p>Bikin undangan pernikahan dengan cerita, foto, musik, dan link RSVP pribadi untuk setiap tamu.</p>
          <div className="landing-actions">
            <Link className="landing-create" to="/studio">
              Buat undangan
            </Link>
            <a href="#contoh">Lihat contoh</a>
          </div>
        </div>
        <figure>
          <img
            src="/wedding/garden.jpg"
            alt="Ilustrasi taman pernikahan dari template Taman Kertas"
            fetchPriority="high"
          />
        </figure>
      </div>
      <section id="contoh" className="landing-examples">
        <h2>Contoh undangan</h2>
        <TemplateCards />
      </section>
    </main>
  )
}

const workshopRooms = {
  studio: 'Studio',
  overview: 'Ringkasan',
  gallery: 'Template',
  album: 'Foto',
  music: 'Musik',
  send: 'Bagikan',
  guests: 'Tamu',
  checkIn: 'Absensi',
} as const
type WorkshopRoom = keyof typeof workshopRooms
type DesignHistory = { past: WeddingDesign[]; present: WeddingDesign; future: WeddingDesign[] }
type HistoryEdit =
  | { type: 'reset'; design: WeddingDesign }
  | { type: 'update'; design: WeddingDesign }
  | { type: 'undo' }
  | { type: 'redo' }
function changeDesign(history: DesignHistory, edit: HistoryEdit): DesignHistory {
  if (edit.type === 'reset') return { past: [], present: edit.design, future: [] }
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
  const [room, setRoom] = useState<WorkshopRoom>('studio')
  const [showGuestPreview, setShowGuestPreview] = useState(false)
  const preferredTemplate = studioRoute.useSearch().template ?? 'garden'
  const [history, dispatchDesign] = useReducer(changeDesign, {
    past: [],
    present: applyTemplate(defaultWeddingDesign, preferredTemplate),
    future: [],
  })
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
  const theme = design.template ?? 'garden'
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  function chooseTemplate(next: Theme) {
    if (next !== theme) setDesign(applyTemplate(design, next))
  }
  const [names, setNames] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [story, setStory] = useState('')
  const [guests, setGuests] = useState('')
  const [music, setMusic] = useState<InvitationMusic>(defaultWeddingMusic)
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [background, setBackground] = useState<DraftPhoto>()
  const [profileBackground, setProfileBackground] = useState<DraftPhoto>()
  const [audio, setAudio] = useState<DraftAudio>()
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID())
  const [weddingId, setWeddingId] = useState<string>()
  const [snapshot, setSnapshot] = useState<string>()
  const [saveMessage, setSaveMessage] = useState('')
  const [backgroundError, setBackgroundError] = useState('')
  const [photosBusy, setPhotosBusy] = useState(false)
  const [published, setPublished] = useState<Published>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const guestNames = guests
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
  const preview = {
    names: names || 'Aruna & Dimas',
    date,
    venue,
    story,
    theme,
    design,
    music,
    customAudio: audio && { ...audio, src: weddingAudioSource(audio) },
  }
  const media = [...photos, ...(background ? [background] : []), ...(profileBackground ? [profileBackground] : [])]
  const previewPhotos = media.map((photo) => ({
    src: imageSource(photo.jpeg),
    caption: photo.caption,
    cover: photo.cover,
    background: photo.background,
    profileBackground: photo.profileBackground,
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

  function draftData() {
    return {
      names,
      date,
      venue,
      story,
      theme,
      design,
      music,
      guests,
      photos: media.map(({ id: _id, ...photo }) => photo),
      audio,
    }
  }

  function canSwitchDraft() {
    const hasChanges = snapshot
      ? JSON.stringify(draftData()) !== snapshot
      : Boolean(names || date || venue || story || guests || media.length || audio || history.past.length)
    return !hasChanges || window.confirm('Ada perubahan yang belum disimpan. Pindah undangan?')
  }

  async function persistDraft() {
    const data = draftData()
    await client.weddings.saveDraft({ id: draftId, data })
    setSnapshot(JSON.stringify(data))
    return data
  }

  async function saveCurrentDraft() {
    setPending(true)
    setSaveMessage('')
    try {
      await persistDraft()
      setSaveMessage('Draft disimpan.')
    } catch {
      setSaveMessage('Draft belum tersimpan. Cek link, potongan musik, dan koneksi.')
    } finally {
      setPending(false)
    }
  }

  function loadDraft(data: Awaited<ReturnType<typeof client.weddings.draft>>['data']) {
    setNames(data.names)
    setDate(data.date)
    setVenue(data.venue)
    setStory(data.story)
    setGuests(data.guests)
    const loadedMusic = data.music === undefined ? defaultWeddingMusic : data.music
    setMusic(loadedMusic)
    setAudio(data.audio)
    const loaded = data.photos.map((photo) => ({ ...photo, id: crypto.randomUUID() }))
    setPhotos(loaded.filter((photo) => !photo.background && !photo.profileBackground))
    setBackground(loaded.find((photo) => photo.background))
    setProfileBackground(loaded.find((photo) => photo.profileBackground))
    const loadedDesign = data.design ?? applyTemplate(defaultWeddingDesign, data.theme)
    dispatchDesign({ type: 'reset', design: loadedDesign })
    setSnapshot(
      JSON.stringify({
        names: data.names,
        date: data.date,
        venue: data.venue,
        story: data.story,
        theme: loadedDesign.template ?? 'garden',
        design: loadedDesign,
        music: loadedMusic,
        guests: data.guests,
        photos: data.photos,
        audio: data.audio,
      }),
    )
    setPublished(undefined)
    setError('')
    setStudioSection('cover')
  }

  async function openDraft(id: string) {
    if (!canSwitchDraft()) return
    setPending(true)
    setSaveMessage('')
    try {
      const result = await client.weddings.draft({ id })
      loadDraft(result.data)
      setDraftId(id)
      setWeddingId(result.weddingId ?? undefined)
      setSaveMessage('Undangan dibuka.')
    } catch {
      setSaveMessage('Undangan belum bisa dibuka.')
    } finally {
      setPending(false)
    }
  }

  function createDraft() {
    if (!canSwitchDraft()) return
    loadDraft({ names: '', date: '', venue: '', story: '', theme: preferredTemplate, guests: '', photos: [] })
    setDraftId(crypto.randomUUID())
    setWeddingId(undefined)
    setSnapshot(undefined)
    setSaveMessage('')
    setRoom('studio')
  }

  async function publish() {
    if (!names.trim() || !date.trim() || !venue.trim()) {
      setError('Isi nama pasangan, tanggal, dan lokasi di Studio dulu.')
      return
    }
    if (guestNames.length > 500 || guestNames.some((name) => name.length > 100)) {
      setError('Maksimal 500 tamu, dengan 100 karakter per nama.')
      return
    }
    setPending(true)
    setError('')
    try {
      const data = await persistDraft()
      const result = await client.weddings.publish({
        draftId,
        content: {
          names,
          date,
          venue,
          story,
          theme,
          design,
          music: audio ? null : music?.kind === 'openverse' ? { kind: music.kind, id: music.id } : music,
        },
        guests: guestNames,
        photos: data.photos,
        audio,
      })
      setPublished(result)
      setWeddingId(result.id)
      setSaveMessage('Undangan diterbitkan.')
    } catch (error) {
      setError(
        error instanceof Error && error.message === 'The selected song is unavailable'
          ? 'Lagu yang dipilih sudah tidak tersedia. Pilih lagu lain di tab Musik.'
          : 'Undangan gagal diterbitkan. Cek isi formulir, link, dan koneksi.',
      )
    } finally {
      setPending(false)
    }
  }

  if (showGuestPreview) {
    return (
      <WeddingResultPreview
        content={preview}
        recipient={guestNames[0] || 'Tamu undangan'}
        photos={previewPhotos}
        muteMusic
        onBack={() => {
          setShowGuestPreview(false)
        }}
      />
    )
  }

  return (
    <main className="wedding-studio wedding-workshop" data-workshop-room={room} data-workshop-theme={theme}>
      <div
        className="workshop-backdrop"
        style={{ backgroundImage: `url("/wedding/${themes[theme].image}.jpg")` }}
        aria-hidden="true"
      />
      <header className="workshop-header">
        <button type="button" className="wedding-brand" onClick={() => visit('studio')}>
          hari bersama<span>.</span>
        </button>
        <nav className="workshop-map" aria-label="Navigasi studio">
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
          <Link className="workshop-link" to="/contoh" search={{ template: theme }} target="_blank" rel="noopener">
            Contoh undangan
          </Link>
          {session && (
            <button
              type="button"
              title={session.user.name || session.user.email}
              disabled={photosBusy || pending}
              onClick={async () => {
                const { error } = await authClient.signOut()
                if (!error) await navigate({ to: '/' })
              }}
            >
              Keluar
            </button>
          )}
        </nav>
      </header>
      <div className="workshop-room" id="workshop-room" tabIndex={-1} key={room}>
        {room === 'overview' && (
          <WeddingOverview
            currentId={draftId}
            weddingId={weddingId}
            onOpen={openDraft}
            onCreate={createDraft}
            onSave={saveCurrentDraft}
            onPreview={() => setShowGuestPreview(true)}
            pending={pending || photosBusy}
            saveMessage={saveMessage}
            preview={
              <DesignedInvitation
                key={draftId}
                content={preview}
                photos={previewPhotos}
                recipient="Tamu undangan"
                rsvp={null}
                journey
                muteMusic
              />
            }
          />
        )}
        {(room === 'guests' || room === 'checkIn') &&
          (weddingId ? (
            <WeddingGuestManager key={weddingId} id={weddingId} checkIn={room === 'checkIn'} />
          ) : (
            <section className="journey-panel wedding-manage">
              <h2>{room === 'guests' ? 'Daftar tamu' : 'Absensi tamu'}</h2>
              <p>Terbitkan undangan untuk mulai kelola tamu.</p>
              <button type="button" onClick={() => visit('send')}>
                Buka Bagikan
              </button>
            </section>
          ))}
        {room === 'gallery' && (
          <WeddingGallery
            initialTheme={theme}
            onChoose={(selected) => {
              chooseTemplate(selected)
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
                <div className="workshop-studio-title">
                  <h2>Studio</h2>
                  <button type="button" onClick={() => setShowGuestPreview(true)}>
                    Lihat sebagai tamu
                  </button>
                </div>
                <label>
                  Template
                  <select
                    value={theme}
                    onChange={(event) => {
                      const { template } = templateSearch({ template: event.currentTarget.value })
                      if (template) chooseTemplate(template)
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
                <ScheduleEditor
                  items={design.schedule ?? []}
                  onChange={(schedule) => setDesign({ ...design, schedule })}
                />
                <WeddingContentEditor
                  value={design.extras}
                  onChange={(extras) =>
                    setDesign({
                      ...design,
                      extras,
                      sections: design.sections.includes('story') ? design.sections : ['story', ...design.sections],
                    })
                  }
                />
                <button type="button" disabled={pending || photosBusy} onClick={() => void saveCurrentDraft()}>
                  Simpan draft
                </button>
                {saveMessage && <p role="status">{saveMessage}</p>}
                <div className="workshop-doors">
                  <button type="button" onClick={() => visit('album')}>
                    Atur foto
                  </button>
                  <button type="button" onClick={() => visit('send')}>
                    Lanjut ke Bagikan
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
                            {design.sectionStyles?.[item]?.title?.trim() || studioLabels[item]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={() => setInspectorTab('theme')}>
                      Atur urutan & tambah bagian
                    </button>
                    <SectionInspector section={selectedSection} design={design} onChange={setDesign} />
                  </>
                ) : (
                  <DesignControls design={design} onChange={setDesign} onEditSection={inspectSection} />
                )}
              </aside>
            </div>
          </section>
        )}
        {room === 'album' && (
          <div className="workshop-album-grid wedding-workspace">
            <div>
              <BackgroundPicker
                title="Background sampul"
                photo={background}
                busy={photosBusy}
                onBusy={setPhotosBusy}
                onError={setBackgroundError}
                onChange={setBackground}
              />
              <BackgroundPicker
                title="Background profil"
                photo={profileBackground}
                busy={photosBusy}
                onBusy={setPhotosBusy}
                onError={setBackgroundError}
                onChange={(photo) =>
                  setProfileBackground(photo && { ...photo, background: undefined, profileBackground: true })
                }
              />
              {backgroundError && <p role="alert">{backgroundError}</p>}
              <WeddingAlbum photos={photos} onChange={updatePhotos} onBusy={setPhotosBusy} />
            </div>
            <DesignedInvitation
              content={preview}
              recipient={guestNames[0] || 'Tamu undangan'}
              photos={previewPhotos}
              rsvp={<p>Hadir · Berhalangan</p>}
              muteMusic
            />
          </div>
        )}
        {room === 'music' && (
          <div className="wedding-manage wedding-music-workspace">
            <WeddingAudioEditor audio={audio} onChange={setAudio} onBusy={setPhotosBusy} />
            <WeddingMusicPicker
              theme={theme}
              value={music}
              onChange={(choice) => {
                setMusic(choice)
                setAudio(undefined)
              }}
            />
          </div>
        )}
        {room === 'send' && (
          <section className="wedding-links journey-panel">
            <h2>Bagikan undangan</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void publish()
              }}
            >
              {!weddingId && (
                <label>
                  Daftar tamu, satu nama per baris
                  <textarea maxLength={51000} value={guests} onChange={(event) => setGuests(event.target.value)} />
                </label>
              )}
              <button type="submit" disabled={pending || photosBusy}>
                {pending ? 'Menerbitkan…' : weddingId ? 'Terbitkan perubahan' : 'Terbitkan undangan'}
              </button>
              {error && <p role="alert">{error}</p>}
            </form>
            {weddingId && (
              <button type="button" disabled={pending} onClick={() => visit('guests')}>
                Kelola tamu dan link
              </button>
            )}
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
      <WeddingIssueReport page={`/studio/${room}`} />
    </main>
  )
}

const sampleInvite = {
  names: 'Aruna & Dimas',
  date: 'Minggu, 14 Februari 2027 · 16.00 WIB',
  venue: 'Jakarta',
  story:
    'Kami berkenalan saat sama-sama berteduh dari hujan. Dari obrolan sore itu, kami mulai berbagi banyak hari bersama.',
  design: {
    ...defaultWeddingDesign,
    sections: ['story', 'event', 'album', 'rsvp'],
    gardenMap: 'twilight',
  } satisfies WeddingDesign,
}

function BackgroundPicker({
  title,
  photo,
  busy,
  onBusy,
  onError,
  onChange,
}: {
  title: string
  photo?: DraftPhoto
  busy: boolean
  onBusy: (busy: boolean) => void
  onError: (message: string) => void
  onChange: (photo?: DraftPhoto) => void
}) {
  return (
    <section className="journey-panel background-picker">
      <h3>{title}</h3>
      <label>
        Upload {title.toLowerCase()}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            onBusy(true)
            onError('')
            try {
              onChange({
                id: crypto.randomUUID(),
                jpeg: await compress(file),
                caption: '',
                cover: false,
                background: true,
              })
            } catch {
              onError('Background belum bisa dibuka. Coba file gambar di bawah 25 MB.')
            } finally {
              onBusy(false)
            }
          }}
        />
      </label>
      {photo && (
        <>
          <img src={imageSource(photo.jpeg)} alt={title} />
          <button disabled={busy} type="button" onClick={() => onChange()}>
            Hapus background
          </button>
        </>
      )}
    </section>
  )
}

function ExamplePage() {
  const theme = exampleRoute.useSearch().template ?? 'garden'
  const design = applyTemplate(sampleInvite.design, theme)
  if (theme === 'weekend' || theme === 'lantern') {
    design.schedule = [
      { id: 'akad', time: '16.00', title: 'Akad nikah', detail: 'Pendopo utama. Pintu dibuka pukul 15.30.' },
      { id: 'reception', time: '18.00', title: 'Resepsi di taman', detail: 'Makan malam dan foto bersama.' },
      { id: 'music', time: '20.00', title: 'Musik dan dansa', detail: 'Panggung di sisi timur taman.' },
    ]
  }
  return (
    <WeddingResultPreview
      key={theme}
      content={{
        ...sampleInvite,
        ...(theme === 'cinema' ? { names: 'Nara & Bima', venue: 'Bandung' } : {}),
        theme,
        design,
        music: defaultWeddingMusic,
      }}
      recipient="Keluarga Ibu Ratna"
      photos={
        theme === 'cinema'
          ? [{ src: '/wedding/bioskop-film.jpg', caption: 'Sepulang dari bioskop', cover: true }]
          : [
              { src: '/wedding/garden.jpg', caption: 'Ilustrasi taman', cover: false },
              { src: '/wedding/cinema.jpg', caption: 'Ilustrasi suasana malam', cover: false },
              ...(theme === 'darkroom'
                ? [{ src: '/wedding/press.jpg', caption: 'Detail undangan', cover: false }]
                : []),
            ]
      }
    />
  )
}

type PreviewProps = Pick<ComponentProps<typeof DesignedInvitation>, 'content' | 'recipient' | 'photos'> & {
  onBack?: () => void
  muteMusic?: boolean
}

function WeddingResultPreview({ content, recipient, photos, onBack, muteMusic }: PreviewProps) {
  const [answer, setAnswer] = useState<string>()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="wedding-guest" data-cinema-preview={content.theme === 'cinema' || undefined}>
      <header className="wedding-result-header">
        <strong>{onBack ? 'Tampilan tamu' : 'Contoh undangan'}</strong>
        {onBack ? (
          <button type="button" onClick={onBack}>
            Kembali ke Studio
          </button>
        ) : (
          <nav className="example-actions" aria-label="Pilihan contoh">
            <Link to="/" hash="contoh">
              Semua contoh
            </Link>
            <Link to="/studio" search={{ template: content.theme }}>
              Pakai template ini
            </Link>
          </nav>
        )}
      </header>
      <DesignedInvitation
        content={content}
        muteMusic={muteMusic}
        recipient={recipient}
        photos={photos}
        journey
        rsvpSaved={answer !== undefined}
        rsvp={
          <>
            <button type="button" onClick={() => setAnswer('Hadir')}>
              Hadir
            </button>
            <button type="button" onClick={() => setAnswer('Berhalangan')}>
              Berhalangan
            </button>
            {answer && <p role="status">RSVP simulasi: {answer}.</p>}
          </>
        }
      />
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
        content={{
          ...invitation.data.content,
          customAudio: invitation.data.content.audio && {
            ...invitation.data.content.audio,
            src: `/api/wedding-audio/${params.weddingId}/${invitation.data.content.audio.id}`,
          },
        }}
        recipient={invitation.data.name}
        rsvpSaved={attending !== null}
        journey
        photos={
          invitation.data.content.photos?.map((photo) => ({
            src: `/api/wedding-media/${params.weddingId}/${photo.id}`,
            caption: photo.caption,
            cover: photo.cover,
            background: photo.background,
            profileBackground: photo.profileBackground,
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
            <details>
              <summary>Kode QR absensi</summary>
              <GuestQr weddingId={params.weddingId} guestId={params.guestId} />
            </details>
          </>
        }
      />
    </main>
  )
}
