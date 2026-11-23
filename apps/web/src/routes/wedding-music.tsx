import type { CatalogTrack, InvitationMusic } from '@app/api/music'
import { useQuery } from '@tanstack/react-query'
import { Music2, Pause, Play, Search, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { orpc } from '@/lib/orpc'
import type { Theme } from './wedding-gallery'
import './wedding-music.css'

type RecordingId = Extract<InvitationMusic, { kind: 'recording' }>['id']
type Recording = {
  kind: 'recording'
  id: RecordingId
  title: string
  artist: string
  seconds: number
  src: string
  source: string
  license: string
}
type Song = Recording | CatalogTrack

export const defaultWeddingMusic = { kind: 'recording', id: 'love-away' } as const satisfies InvitationMusic

const recordings = {
  'love-away': {
    ...defaultWeddingMusic,
    title: 'Can’t Take Our Love Away',
    artist: 'Josh Woodward',
    seconds: 226,
    src: '/wedding/love-away.mp3',
    source:
      'https://freemusicarchive.org/music/Josh_Woodward/Crawford_Street/JoshWoodward-CrawfordStreet-03-CantTakeOurLoveAway/',
    license: 'CC BY 4.0',
  },
  gymnopedie: {
    kind: 'recording',
    id: 'gymnopedie',
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie · recording by Teknopazzo',
    seconds: 205,
    src: '/wedding/gymnopedie.mp3',
    source: 'https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1..ogg',
    license: 'CC0',
  },
  'thinking-of-you': {
    kind: 'recording',
    id: 'thinking-of-you',
    title: 'Thinking of You',
    artist: 'Kevin MacLeod',
    seconds: 110,
    src: '/wedding/thinking-of-you.mp3',
    source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100637',
    license: 'CC BY 4.0',
  },
} satisfies Record<RecordingId, Recording>

const piano = {
  kind: 'openverse',
  id: '683d0846-1063-444a-8f74-95ce04bb99ef',
  title: 'Chonology of love',
  artist: 'EKVelika',
  seconds: 83,
  src: 'https://cdn.freesound.org/previews/553/553821_1137749-hq.mp3',
  source: 'https://freesound.org/people/EKVelika/sounds/553821',
} as const satisfies CatalogTrack
const acoustic = {
  kind: 'openverse',
  id: '2e6bad26-3477-4a33-94cf-1615196a4740',
  title: 'Folk Guitar Music Track',
  artist: 'Dvideoguy',
  seconds: 33,
  src: 'https://cdn.freesound.org/previews/246/246315_2046066-hq.mp3',
  source: 'https://freesound.org/people/Dvideoguy/sounds/246315',
} as const satisfies CatalogTrack

export function songDetails(choice: InvitationMusic | undefined): Song | null {
  if (choice?.kind === 'recording') return recordings[choice.id]
  return choice?.kind === 'openverse' ? choice : null
}

function searchKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function useMusicPlayer(loop: boolean, autoSource?: string) {
  const player = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [volume, setVolume] = useState(0.48)
  const volumeRef = useRef(volume)

  const stop = useCallback(() => {
    const audio = player.current
    player.current = null
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setPlaying(null)
  }, [])

  useEffect(() => stop, [stop])

  const play = useCallback(
    async (src: string) => {
      setUnavailable(false)
      if (player.current?.getAttribute('src') !== src) {
        stop()
        const audio = new Audio(src)
        audio.loop = loop
        audio.volume = volumeRef.current
        audio.onpause = audio.onended = () => {
          if (player.current === audio && audio.paused) setPlaying(null)
        }
        audio.onerror = () => {
          if (player.current === audio) {
            setUnavailable(true)
            setPlaying(null)
          }
        }
        player.current = audio
      }

      const audio = player.current
      if (!audio) return false
      try {
        await audio.play()
        if (player.current !== audio || audio.paused) return false
        setPlaying(src)
        return true
      } catch (error) {
        const policyBlocked = error instanceof DOMException && error.name === 'NotAllowedError'
        if (
          player.current === audio &&
          !policyBlocked &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          setUnavailable(true)
        }
        return false
      }
    },
    [loop, stop],
  )

  useEffect(() => {
    if (!autoSource) return
    const source = autoSource
    function detach() {
      window.removeEventListener('click', activate, true)
      window.removeEventListener('keydown', activate, true)
      window.removeEventListener('pointerup', activate, true)
    }
    function activate(event: Event) {
      if (!event.isTrusted || (event instanceof KeyboardEvent && (event.repeat || event.key === 'Escape'))) return
      if (event.target instanceof Element && event.target.closest('.invitation-soundtrack')) {
        if (event.type === 'click' && event.target.closest('button')) detach()
        return
      }
      void play(source).then((started) => {
        if (started) detach()
      })
    }
    window.addEventListener('click', activate, true)
    window.addEventListener('keydown', activate, true)
    window.addEventListener('pointerup', activate, true)
    void play(source).then((started) => {
      if (started) detach()
    })
    return () => {
      detach()
      stop()
    }
  }, [autoSource, play, stop])

  async function toggle(src: string) {
    const audio = player.current
    if (audio?.getAttribute('src') === src && !audio.paused) {
      audio.pause()
      return
    }
    await play(src)
  }

  function changeVolume(next: number) {
    volumeRef.current = next
    setVolume(next)
    if (player.current) player.current.volume = next
  }

  return { playing, unavailable, volume, changeVolume, toggle, stop, start: play }
}

function songKey(song: Song) {
  return `${song.kind}:${song.id}`
}

export function WeddingMusicPicker({
  theme,
  value,
  onChange,
}: {
  theme: Theme
  value: InvitationMusic
  onChange: (next: InvitationMusic) => void
}) {
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const player = useMusicPlayer(false)
  const current = songDetails(value)
  const results = useQuery({
    ...orpc.music.search.queryOptions({ input: { q: term } }),
    enabled: term.length >= 2,
    staleTime: 600_000,
    retry: false,
  })

  function search(next: string) {
    const query = next.trim()
    if (query.length === 1) return
    setInput(query)
    if (term === query && query) {
      void results.refetch()
    } else {
      setTerm(query)
    }
  }

  const suggestions = [
    recordings['love-away'],
    recordings.gymnopedie,
    recordings['thinking-of-you'],
    theme === 'garden' ? acoustic : piano,
    theme === 'garden' ? piano : acoustic,
  ]
  const localMatches = suggestions.filter((song) => searchKey(`${song.title} ${song.artist}`).includes(searchKey(term)))
  const songs = term
    ? [...new Map([...localMatches, ...(results.data ?? [])].map((song) => [songKey(song), song])).values()]
    : suggestions

  const vocalRecommendations = [
    { title: 'Teman Hidup', artist: 'TULUS', language: 'Indonesia', video: 'dt4Ueda_h6Y' },
    { title: 'Kita Lewati Berdua', artist: 'Overnight', language: 'Indonesia', video: 'SeSAwqq_Kpo' },
    { title: 'Valentine', artist: 'Laufey', language: 'English', video: 'tyKu0uZS86Q' },
  ].filter(({ title, artist, language }) => searchKey(`${title} ${artist} ${language}`).includes(searchKey(term)))

  return (
    <section className="journey-panel wedding-music" aria-labelledby="wedding-music-heading">
      <header className="wedding-music-header">
        <div>
          <h2 id="wedding-music-heading">Musik undangan</h2>
          <p>{current ? `Dipilih: ${current.title}` : 'Tanpa musik'}</p>
        </div>
        <button
          type="button"
          className="music-clear"
          onClick={() => {
            player.stop()
            onChange(null)
          }}
        >
          <VolumeX size={16} aria-hidden="true" /> Tanpa musik
        </button>
      </header>
      <form
        className="wedding-music-search"
        onSubmit={(event) => {
          event.preventDefault()
          search(input)
        }}
      >
        <label htmlFor="music-query" className="sr-only">
          Cari lagu
        </label>
        <input
          id="music-query"
          type="search"
          value={input}
          maxLength={100}
          onChange={(event) => {
            const next = event.target.value
            setInput(next)
            if (!next.trim()) setTerm('')
          }}
          placeholder="Cari judul lagu, artis, atau suasana"
        />
        <button type="submit" disabled={input.trim().length < 2}>
          <Search size={16} aria-hidden="true" /> Cari
        </button>
      </form>
      <div className="wedding-music-suggestions">
        {[
          ['Piano', 'romantic piano'],
          ['Akustik', 'acoustic guitar music'],
          ['Ambient', 'warm ambient music'],
        ].map(([label, query]) => (
          <button type="button" key={query} aria-pressed={query === term} onClick={() => search(query ?? '')}>
            {label}
          </button>
        ))}
      </div>
      <h3>{term ? 'Hasil pencarian' : 'Rekomendasi untuk temamu'}</h3>
      {term && results.isPending && <p role="status">Mencari lagu…</p>}
      {term && results.isError && !songs.length && !vocalRecommendations.length && (
        <p role="alert">Katalog musik lagi tidak bisa dibuka. Coba lagi atau hapus pencarian untuk buka rekomendasi.</p>
      )}
      {term && results.isSuccess && !songs.length && !vocalRecommendations.length && (
        <p role="status">Belum ada lagu yang cocok. Coba kata kunci lain.</p>
      )}
      {player.unavailable && <p role="alert">Lagu ini belum bisa diputar. Coba lagu lain.</p>}
      <ul className="wedding-song-list">
        {songs.map((song) => {
          const selected = current !== null && songKey(song) === songKey(current)
          const active = player.playing === song.src
          return (
            <li key={songKey(song)} data-selected={selected}>
              <button
                type="button"
                className="wedding-song-play"
                aria-label={`${active ? 'Jeda' : 'Dengar'} ${song.title}`}
                onClick={() => void player.toggle(song.src)}
              >
                {active ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              </button>
              <div className="wedding-song-info">
                <strong>{song.title}</strong>
                <small>{song.artist}</small>
                <a href={song.source} target="_blank" rel="noreferrer">
                  {song.kind === 'recording' ? song.license : 'CC0'} · {Math.floor(song.seconds / 60)}:
                  {String(song.seconds % 60).padStart(2, '0')}
                </a>
              </div>
              <button
                type="button"
                className="wedding-song-select"
                aria-label={`${selected ? 'Dipilih' : 'Pakai'} ${song.title}`}
                aria-pressed={selected}
                onClick={() => onChange(song.kind === 'openverse' ? song : { kind: song.kind, id: song.id })}
              >
                {selected ? 'Dipilih' : 'Pakai'}
              </button>
            </li>
          )
        })}
      </ul>
      {vocalRecommendations.length > 0 && (
        <>
          <h3>Inspirasi lagu vokal</h3>
          <p>Lagu ini bisa didengar lewat video resmi. Untuk backsound, pilih lagu dari daftar di atas.</p>
          <ul className="wedding-song-list">
            {vocalRecommendations.map(({ title, artist, language, video }) => (
              <li key={video}>
                <div className="wedding-song-info">
                  <strong>{title}</strong>
                  <small>
                    {artist} · {language}
                  </small>
                </div>
                <a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer">
                  Dengar versi resmi
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="wedding-music-source">
        <Music2 size={14} aria-hidden="true" /> Preview langsung. Tamu bisa putar lagu tanpa akun musik.
      </p>
    </section>
  )
}
