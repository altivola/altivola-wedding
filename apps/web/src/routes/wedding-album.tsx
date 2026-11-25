import { useState } from 'react'

export type DraftPhoto = {
  id: string
  jpeg: string
  caption: string
  cover: boolean
  background?: boolean
  profileBackground?: boolean
}
const imageSource = (jpeg: string) => `data:image/jpeg;base64,${jpeg}`

export { imageSource }

export async function compress(file: File) {
  if (!file.type.startsWith('image/') || file.size > 25_000_000) throw new Error('Unsupported photo')
  const bitmap = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.86, 0.73, 0.56, 0.38, 0.2]) {
      const jpeg = canvas.toDataURL('image/jpeg', quality).split(',')[1]
      if (jpeg && jpeg.length <= 600_000) return jpeg
    }
    throw new Error('Photo too large')
  } finally {
    bitmap.close()
  }
}

export function WeddingAlbum({
  photos,
  onChange,
  onBusy,
}: {
  photos: DraftPhoto[]
  onChange: (photos: DraftPhoto[]) => void
  onBusy: (busy: boolean) => void
}) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  function move(index: number, offset: number) {
    const next = [...photos]
    const item = next[index]
    const destination = next[index + offset]
    if (!item || !destination) return
    next[index] = destination
    next[index + offset] = item
    onChange(next)
  }

  return (
    <section className="journey-panel wedding-album-editor" aria-label="Album foto">
      <h3>Album foto</h3>
      <label>
        Pilih sampai 8 foto
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={pending || photos.length >= 8}
          onChange={async (event) => {
            const files = Array.from(event.currentTarget.files ?? [])
            event.currentTarget.value = ''
            if (!files.length) return
            setPending(true)
            onBusy(true)
            const additions: DraftPhoto[] = []
            const available = files.slice(0, 8 - photos.length)
            let failed = 0
            try {
              for (const file of available) {
                try {
                  additions.push({
                    id: crypto.randomUUID(),
                    jpeg: await compress(file),
                    caption: '',
                    cover: photos.length === 0 && additions.length === 0,
                  })
                } catch {
                  failed += 1
                }
              }
              onChange([...photos, ...additions])
              setMessage(
                failed || available.length < files.length
                  ? 'Sebagian foto dilewati. Cek format foto, ukuran 25 MB per file, dan batas 8 foto.'
                  : '',
              )
            } finally {
              setPending(false)
              onBusy(false)
            }
          }}
        />
      </label>
      {pending && <p role="status">Menyiapkan foto…</p>}
      {message && <p role="status">{message}</p>}
      <ol>
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <img src={imageSource(photo.jpeg)} alt={`Foto ${index + 1}`} />
            <div>
              <label>
                Caption foto {index + 1}
                <input
                  maxLength={180}
                  value={photo.caption}
                  disabled={pending}
                  onChange={(e) => {
                    onChange(photos.map((item) => (item.id === photo.id ? { ...item, caption: e.target.value } : item)))
                  }}
                />
              </label>
              <div className="album-actions">
                <button type="button" disabled={pending || index === 0} onClick={() => move(index, -1)}>
                  Naik
                </button>
                <button type="button" disabled={pending || index === photos.length - 1} onClick={() => move(index, 1)}>
                  Turun
                </button>
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={photo.cover}
                  onClick={() => {
                    onChange(photos.map((item) => ({ ...item, cover: item.id === photo.id })))
                  }}
                >
                  {photo.cover ? 'Foto sampul' : 'Jadikan sampul'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const remaining = photos.filter((item) => item.id !== photo.id)
                    onChange(photo.cover ? remaining.map((item, i) => ({ ...item, cover: i === 0 })) : remaining)
                  }}
                >
                  Hapus
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
