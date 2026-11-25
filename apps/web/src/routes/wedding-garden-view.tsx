import { type GardenCharacter, type GardenMap, gardenCharacters, gardenMaps } from '@app/api/wedding-design'
import { type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { AlbumCamera, GardenPhoto, GardenPlace, GardenStation, mountGarden } from './wedding-garden'
import { createGardenAudio } from './wedding-garden-audio'
import { gardenCharacterNames, gardenMapNames } from './wedding-garden-options'

type Garden = ReturnType<typeof mountGarden>

export function WeddingGarden({
  places,
  onVisit,
  onExit,
  album,
  event,
  eventDetails,
  rsvp,
  rsvpSaved = false,
  soundtrack,
  gardenMap = 'twilight',
  gardenCharacter = 'lantern',
}: {
  places: GardenPlace[]
  onVisit: (id: string) => void
  onExit?: () => void
  album?: GardenPhoto[]
  event?: { date: string; venue: string }
  eventDetails?: ReactNode
  rsvp?: ReactNode
  rsvpSaved?: boolean
  soundtrack?: ReactNode
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
  const audio = useRef<ReturnType<typeof createGardenAudio>>(null)
  const [effects, setEffects] = useState(false)
  const [ready, setReady] = useState(false)
  const [station, setStation] = useState<GardenStation | null>(null)
  const albumOpen = station === 'album'
  const [camera, setCamera] = useState<AlbumCamera>({ view: 'overview', zoom: 0, angle: 0 })
  const [selected, setSelected] = useState<number | null>(null)
  const lightbox = useRef<HTMLDialogElement>(null)
  const photo = selected === null ? undefined : album?.[selected]
  const [near, setNear] = useState<GardenPlace | null>(null)
  const [lights, setLights] = useState(0)
  const [swimming, setSwimming] = useState(false)
  const [stick, setStick] = useState({ x: 0, z: 0 })
  const joystickPointer = useRef<number | null>(null)

  function steer(event: PointerEvent<HTMLButtonElement>) {
    if (joystickPointer.current !== event.pointerId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - bounds.left - bounds.width / 2
    const z = event.clientY - bounds.top - bounds.height / 2
    const distance = Math.hypot(x, z)
    const force = Math.min(1, Math.max(0, (distance - 5) / (bounds.width / 2 - 5)))
    const scale = distance ? force / distance : 0
    const direction = { x: x * scale, z: z * scale }
    setStick(direction)
    controller.current?.steer(direction.x, direction.z)
  }

  const resetJoystick = useCallback(() => {
    joystickPointer.current = null
    setStick({ x: 0, z: 0 })
    controller.current?.steer(0, 0)
  }, [])

  function releaseJoystick(event: PointerEvent<HTMLButtonElement>) {
    if (joystickPointer.current === event.pointerId) resetJoystick()
  }

  async function toggleEffects() {
    if (typeof AudioContext === 'undefined') return
    try {
      const system = audio.current ?? createGardenAudio()
      audio.current = system
      if (effects) {
        await system.context.suspend()
      } else {
        await system.context.resume()
      }
      setEffects(system.context.state === 'running')
    } catch {
      setEffects(false)
    }
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
          setLights,
          initialAlbum.current,
          setSelected,
          {
            map,
            character,
            event: initialEvent.current,
            onSwim: setSwimming,
            onSound: (sound) => audio.current?.play(sound),
          },
        )
        setReady(true)
      })
      .catch(() => {})
    return () => {
      active = false
      controller.current?.dispose()
      controller.current = null
    }
  }, [map, character])

  useEffect(
    () => () => {
      if (audio.current) void audio.current.context.close()
      audio.current = null
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
        resetJoystick()
        setStation(id)
        controller.current?.setStation(id)
        return
      }
      onVisit(id)
    },
    [album, event, rsvp, onVisit, resetJoystick],
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
        {swimming && (
          <p className="garden-water-status" role="status">
            Berenang
          </p>
        )}
        {soundtrack}
        <button className="garden-effects" type="button" aria-pressed={effects} onClick={() => void toggleEffects()}>
          {effects ? 'Matikan efek suara' : 'Nyalakan efek suara'}
        </button>
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
                  resetJoystick()
                  setReady(false)
                  setNear(null)
                  setLights(0)
                  setSwimming(false)
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
                  resetJoystick()
                  setReady(false)
                  setNear(null)
                  setLights(0)
                  setSwimming(false)
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
      {ready && !station && (
        <button
          className="garden-joystick"
          type="button"
          aria-label="Joystick arah, geser untuk bergerak"
          onPointerDown={(event) => {
            if (event.button !== 0 || joystickPointer.current !== null) return
            joystickPointer.current = event.pointerId
            event.currentTarget.setPointerCapture(event.pointerId)
            steer(event)
          }}
          onPointerMove={steer}
          onPointerUp={releaseJoystick}
          onPointerCancel={releaseJoystick}
          onLostPointerCapture={releaseJoystick}
        >
          <span
            aria-hidden="true"
            className="garden-joystick-thumb"
            style={{ transform: `translate(${stick.x * 27}px, ${stick.z * 27}px)` }}
          />
        </button>
      )}
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
              {eventDetails}
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
