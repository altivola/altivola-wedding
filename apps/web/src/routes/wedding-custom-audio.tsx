import { useState } from 'react'

export type CustomAudio = { title: string; start: number; end?: number }
export type DraftAudio = CustomAudio & { mp3: string }

export function WeddingAudioPlayer({ audio, src }: { audio: CustomAudio; src: string }) {
  function seekToStart(element: HTMLAudioElement) {
    if (!Number.isFinite(element.duration) || element.duration <= 0) return
    element.currentTime = audio.start < element.duration ? audio.start : 0
  }
  return (
    <div className="invitation-soundtrack wedding-custom-audio">
      <span>{audio.title || 'Musik undangan'}</span>
      <audio
        controls
        preload="none"
        src={src}
        aria-label="Musik undangan"
        onPlay={(event) => {
          const player = event.currentTarget
          if (player.currentTime < audio.start || (audio.end !== undefined && player.currentTime >= audio.end)) {
            seekToStart(player)
          }
        }}
        onLoadedMetadata={(event) => seekToStart(event.currentTarget)}
        onTimeUpdate={(event) => {
          const player = event.currentTarget
          if (audio.end !== undefined && player.currentTime >= audio.end) seekToStart(player)
        }}
        onEnded={(event) => {
          const player = event.currentTarget
          seekToStart(player)
          void player.play().catch(() => {})
        }}
      >
        <track kind="captions" />
      </audio>
    </div>
  )
}

export function weddingAudioSource(audio: DraftAudio) {
  return `data:audio/mpeg;base64,${audio.mp3}`
}

export function WeddingAudioEditor({
  audio,
  onChange,
  onBusy,
}: {
  audio?: DraftAudio
  onChange: (audio?: DraftAudio) => void
  onBusy: (busy: boolean) => void
}) {
  const [error, setError] = useState('')
  return (
    <section className="journey-panel wedding-custom-editor">
      <h3>Lagu sendiri</h3>
      <p>Unggah MP3 hingga 1,3 MB. Lagu ini menggantikan pilihan katalog.</p>
      <label>
        Pilih MP3
        <input
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            setError('')
            if (!/\.mp3$/i.test(file.name) || file.size > 1_300_000 || file.size < 3) {
              setError('Pilih MP3 yang ukurannya maksimal 1,3 MB.')
              return
            }
            onBusy(true)
            try {
              const bytes = new Uint8Array(await file.arrayBuffer())
              const id3 = bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51
              if (!id3 && !(bytes[0] === 255 && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) throw new Error('MP3 invalid')
              const encoded = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onerror = reject
                reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
                reader.readAsDataURL(file)
              })
              onChange({ title: file.name.slice(0, 120), mp3: encoded, start: 0 })
            } catch {
              setError('File MP3 belum bisa dibaca.')
            } finally {
              onBusy(false)
            }
          }}
        />
      </label>
      {audio && (
        <>
          <label>
            Mulai (detik)
            <input
              type="number"
              min={0}
              max={3600}
              step={0.1}
              value={audio.start}
              onChange={(e) => onChange({ ...audio, start: Math.min(3600, Math.max(0, Number(e.target.value))) })}
            />
          </label>
          <label>
            Selesai (detik, opsional)
            <input
              type="number"
              min={0.1}
              max={3600}
              step={0.1}
              value={audio.end ?? ''}
              onChange={(e) =>
                onChange({
                  ...audio,
                  end: e.target.value ? Math.min(3600, Math.max(0.1, Number(e.target.value))) : undefined,
                })
              }
            />
          </label>
          {audio.end !== undefined && audio.end <= audio.start ? (
            <p role="alert">Akhir lagu harus setelah waktu mulai.</p>
          ) : (
            <WeddingAudioPlayer audio={audio} src={weddingAudioSource(audio)} />
          )}
          <button
            type="button"
            onClick={() => {
              onChange()
              setError('')
            }}
          >
            Hapus lagu unggahan
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
