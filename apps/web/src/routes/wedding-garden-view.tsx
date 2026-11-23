import { type GardenCharacter, type GardenMap, gardenCharacters, gardenMaps } from '@app/api/wedding-design'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { AlbumCamera, GardenPhoto, GardenPlace, GardenStation, mountGarden } from './wedding-garden'
import { gardenCharacterNames, gardenMapNames } from './wedding-garden-options'

type Garden = ReturnType<typeof mountGarden>

export function WeddingGarden({
  places,
  onVisit,
  onExit,
  album,
  event,
  rsvp,
  rsvpSaved = false,
  gardenMap = 'twilight',
  gardenCharacter = 'lantern',
}: {
  places: GardenPlace[]
  onVisit: (id: string) => void
  onExit?: () => void
  album?: GardenPhoto[]
  event?: { date: string; venue: string }
  rsvp?: ReactNode
  rsvpSaved?: boolean
  gardenMap?: GardenMap
  gardenCharacter?: GardenCharacter
}) {
  const initialPlaces = useRef(places)
  const initialAlbum = useRef(album ?? [])
  const initialEvent = useRef(event)
  const [map, setMap] = useState(gardenMap)
  const [character, setCharacter] = useState(gardenCharacter)
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<Garden>(null)
  const audio = useRef<{ context: AudioContext; base: GainNode }>(null)
  const music = useRef<HTMLAudioElement>(null)
  const [sound, setSound] = useState(false)
  const [volume, setVolume] = useState(0.48)
  const [soundUnavailable, setSoundUnavailable] = useState(false)
  const [ready, setReady] = useState(false)
  const [station, setStation] = useState<GardenStation | null>(null)
  const albumOpen = station === 'album'
  const [camera, setCamera] = useState<AlbumCamera>({ view: 'overview', zoom: 0, angle: 0 })
  const [selected, setSelected] = useState<number | null>(null)
  const lightbox = useRef<HTMLDialogElement>(null)
  const photo = selected === null ? undefined : album?.[selected]
  const [near, setNear] = useState<GardenPlace | null>(null)
  const [lights, setLights] = useState(0)

  const chime = useCallback((frequency: number) => {
    const system = audio.current
    if (system?.context.state !== 'running') return
    const { context, base } = system
    const now = context.currentTime
    const voice = context.createOscillator()
    const level = context.createGain()
    voice.type = 'sine'
    voice.frequency.value = frequency
    level.gain.setValueAtTime(0, now)
    level.gain.linearRampToValueAtTime(0.28, now + 0.035)
    level.gain.exponentialRampToValueAtTime(0.001, now + 0.66)
    voice.connect(level).connect(base)
    voice.start()
    voice.stop(now + 0.68)
  }, [])

  async function toggleSound() {
    if (sound) {
      music.current?.pause()
      void audio.current?.context.suspend().catch(() => {})
      setSound(false)
      return
    }
    try {
      if (!music.current) {
        const track = new Audio('/wedding/selepas-senja.wav')
        track.loop = true
        track.volume = volume
        music.current = track
      }
      const playing = music.current.play()
      if (!audio.current && typeof AudioContext !== 'undefined') {
        const context = new AudioContext()
        const base = context.createGain()
        base.gain.value = volume * 0.3
        base.connect(context.destination)
        audio.current = { context, base }
      }
      void audio.current?.context.resume().catch(() => {})
      await playing
      setSound(true)
      setSoundUnavailable(false)
    } catch {
      setSoundUnavailable(true)
      setSound(false)
    }
  }

  function changeVolume(next: number) {
    setVolume(next)
    if (music.current) music.current.volume = next
    if (audio.current) audio.current.base.gain.value = next * 0.3
  }

  useEffect(() => {
    let active = true
    void import('./wedding-garden')
      .then(({ mountGarden }) => {
        if (!active || !host.current) return
        controller.current = mountGarden(
          host.current,
          initialPlaces.current,
          setNear,
          (count) => {
            setLights(count)
            chime(440 * 2 ** (count / 7))
          },
          initialAlbum.current,
          setSelected,
          { map, character, event: initialEvent.current },
        )
        setReady(true)
      })
      .catch(() => {})
    return () => {
      active = false
      controller.current?.dispose()
      controller.current = null
    }
  }, [chime, map, character])

  useEffect(
    () => () => {
      if (audio.current) void audio.current.context.close()
      audio.current = null
      music.current?.pause()
      music.current = null
    },
    [],
  )

  useEffect(() => {
    if (ready) controller.current?.setAlbumCamera(camera)
  }, [camera, ready])

  useEffect(() => {
    if (ready) controller.current?.setRsvpSaved(rsvpSaved)
  }, [rsvpSaved, ready])

  const enter = useCallback(
    (id: string) => {
      if ((id === 'album' && album?.length) || (id === 'event' && event) || (id === 'rsvp' && rsvp)) {
        setStation(id)
        controller.current?.setStation(id)
        chime(659.25)
        return
      }
      onVisit(id)
    },
    [album, event, rsvp, chime, onVisit],
  )

  function closeStation() {
    setStation(null)
    controller.current?.setStation(null)
  }

  useEffect(() => {
    const dialog = lightbox.current
    if (!dialog) return
    if (selected !== null && !dialog.open) dialog.showModal()
    if (selected === null && dialog.open) dialog.close()
  }, [selected])

  useEffect(() => {
    function interact(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.key.toLowerCase() !== 'e' ||
        !near ||
        station ||
        (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable]'))
      )
        return
      enter(near.id)
    }
    window.addEventListener('keydown', interact)
    return () => window.removeEventListener('keydown', interact)
  }, [near, enter, station])

  return (
    <section
      className="playable-garden"
      aria-label="Taman yang bisa dijelajahi"
      data-ready={ready}
      data-album-open={albumOpen}
      data-station={station ?? undefined}
      data-camera={albumOpen ? camera.view : undefined}
      data-map={map}
      data-character={character}
    >
      <div ref={host} className="garden-canvas" aria-hidden="true" />
      <div className="garden-hud">
        <h1>{gardenMapNames[map]}</h1>
        <p>
          Jalan ke lentera di bawah lengkungan buat buka sebuah tempat. Kumpulin cahaya kecil di jalan buat nerangin
          taman.
        </p>
        <p className="garden-controls-copy">WASD atau tombol panah · klik tanah untuk berjalan · E untuk masuk</p>
        <p role="status" className="garden-lights">
          {lights === 5 ? 'Taman sudah menyala' : `Cahaya ${lights}/5`}
        </p>
        <button type="button" aria-label="Suara taman" aria-pressed={sound} onClick={() => void toggleSound()}>
          {sound ? 'Jeda musik' : 'Nyalakan musik'}
        </button>
        {sound && (
          <label className="garden-volume">
            Volume musik
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => changeVolume(event.target.valueAsNumber)}
            />
          </label>
        )}
        {soundUnavailable && (
          <span className="garden-audio-error" role="status">
            Musik belum bisa diputar. Coba nyalakan lagi.
          </span>
        )}
        {!station && (
          <details className="garden-picker">
            <summary>Peta dan karakter</summary>
            <label>
              Peta
              <select
                value={map}
                onChange={(e) => {
                  const picked = gardenMaps.find((item) => item === e.target.value)
                  if (!picked || picked === map) return
                  setReady(false)
                  setNear(null)
                  setLights(0)
                  setMap(picked)
                }}
              >
                {gardenMaps.map((item) => (
                  <option key={item} value={item}>
                    {gardenMapNames[item]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Karakter
              <select
                value={character}
                onChange={(e) => {
                  const picked = gardenCharacters.find((item) => item === e.target.value)
                  if (!picked || picked === character) return
                  setReady(false)
                  setNear(null)
                  setLights(0)
                  setCharacter(picked)
                }}
              >
                {gardenCharacters.map((item) => (
                  <option key={item} value={item}>
                    {gardenCharacterNames[item]}
                  </option>
                ))}
              </select>
            </label>
          </details>
        )}
        {onExit && (
          <button type="button" onClick={onExit}>
            Kembali ke peta
          </button>
        )}
      </div>
      <div className="garden-dpad">
        {(
          [
            ['Atas', 0, -1],
            ['Kiri', -1, 0],
            ['Bawah', 0, 1],
            ['Kanan', 1, 0],
          ] as const
        ).map(([label, x, z]) => (
          <button
            key={label}
            type="button"
            aria-label={`Jalan ${label.toLowerCase()}`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              controller.current?.steer(x, z)
            }}
            onLostPointerCapture={() => controller.current?.steer(0, 0)}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') controller.current?.steer(x, z)
            }}
            onKeyUp={() => controller.current?.steer(0, 0)}
          >
            {label}
          </button>
        ))}
      </div>
      {near && !station && (
        <button type="button" className="garden-interact" onClick={() => enter(near.id)}>
          Masuk · {near.label} <kbd>E</kbd>
        </button>
      )}
      {albumOpen ? (
        <section className="garden-album-hud" aria-label="Galeri foto di taman">
          <div>
            <h2>Galeri foto</h2>
            <p>Pilih foto di bawah lampu atau dari deretan ini.</p>
          </div>
          <div className="garden-album-strip">
            {album?.map((item, index) => (
              <button
                type="button"
                key={item.src}
                aria-label={`Buka foto ${index + 1}`}
                onClick={() => setSelected(index)}
              >
                <img src={item.src} alt="" />
              </button>
            ))}
          </div>
          <section className="garden-camera" aria-label="Kamera album">
            <div>
              <button
                type="button"
                aria-pressed={camera.view === 'overview'}
                onClick={() => setCamera((old) => ({ ...old, view: 'overview' }))}
              >
                Sudut lebar
              </button>
              <button
                type="button"
                aria-pressed={camera.view === 'eye'}
                onClick={() => setCamera((old) => ({ ...old, view: 'eye' }))}
              >
                Sejajar mata
              </button>
            </div>
            <label>
              Zoom{' '}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={camera.zoom}
                onChange={(e) => setCamera((old) => ({ ...old, zoom: e.target.valueAsNumber }))}
              />
            </label>
            <label>
              Geser sudut{' '}
              <input
                type="range"
                min={-28}
                max={28}
                value={camera.angle}
                onChange={(e) => setCamera((old) => ({ ...old, angle: e.target.valueAsNumber }))}
              />
            </label>
          </section>
          <button type="button" onClick={closeStation}>
            Lanjut jalan
          </button>
        </section>
      ) : station ? (
        <section className="garden-station" aria-label={station === 'event' ? 'Paviliun acara' : 'Buku tamu'}>
          {station === 'event' && event && (
            <>
              <h2>Paviliun acara</h2>
              <p>{event.date}</p>
              <p>{event.venue}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                target="_blank"
                rel="noreferrer"
              >
                Buka di Maps
              </a>
            </>
          )}
          {station === 'rsvp' && (
            <>
              <h2>Buku tamu</h2>
              {rsvp}
            </>
          )}
          <button type="button" onClick={closeStation}>
            Lanjut jalan
          </button>
        </section>
      ) : (
        <nav className="garden-shortcuts" aria-label="Tujuan taman">
          {places.map((place) => (
            <button key={place.id} type="button" onClick={() => enter(place.id)}>
              {place.label}
            </button>
          ))}
        </nav>
      )}
      <dialog ref={lightbox} className="garden-lightbox" aria-label="Foto pasangan" onClose={() => setSelected(null)}>
        {photo && (
          <figure>
            <button type="button" onClick={() => setSelected(null)}>
              Tutup foto
            </button>
            <img src={photo.src} alt={photo.caption || 'Foto pasangan'} />
            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </figure>
        )}
      </dialog>
    </section>
  )
}
