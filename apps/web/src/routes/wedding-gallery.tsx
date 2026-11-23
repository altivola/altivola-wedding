import { ArrowDown, ArrowLeft, ArrowRight, Maximize2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const themes = {
  garden: {
    label: 'Taman Kertas',
    image: 'garden',
    medium: 'Ilustrasi kertas',
  },
  night: {
    label: 'Blue Hour',
    image: 'cinema',
    medium: 'Film analog',
  },
  print: {
    label: 'Ruang Cetak',
    image: 'press',
    medium: 'Sablon grafis',
  },
}

export type Theme = keyof typeof themes
const collection: Theme[] = ['garden', 'night', 'print']
const chapters = ['Sampul', 'Album', 'Acara'] as const
type Chapter = (typeof chapters)[number]

export function WeddingGallery({
  initialTheme,
  onChoose,
  onExplore,
}: {
  initialTheme: Theme
  onChoose: (theme: Theme) => void
  onExplore: (theme: Theme, chapter: Chapter) => void
}) {
  const [selected, setSelected] = useState(initialTheme)
  const [chapter, setChapter] = useState<Chapter>('Sampul')
  const dialog = useRef<HTMLDialogElement>(null)
  const artwork = useRef<HTMLImageElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const current = themes[selected]
  const selection = collection.indexOf(selected)

  useEffect(() => onExplore(selected, chapter), [selected, chapter, onExplore])

  function stepTheme(offset: number) {
    const next = collection.at((selection + offset + collection.length) % collection.length)
    if (next) setSelected(next)
    setChapter('Sampul')
  }

  function openSample(button: HTMLButtonElement) {
    if (!dialog.current || !artwork.current) return
    const from = artwork.current.getBoundingClientRect()
    opener.current = button
    dialog.current.returnValue = ''
    dialog.current.showModal()
    const panel = dialog.current.querySelector<HTMLElement>('.wedding-dialog-visual')
    if (!panel || matchMedia('(prefers-reduced-motion: reduce)').matches || !panel.animate) return
    const to = panel.getBoundingClientRect()
    if (to.width === 0 || to.height === 0) return
    panel.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          clipPath: 'inset(0 round 13px)',
        },
        { transform: 'none', clipPath: 'inset(0 round 0)' },
      ],
      { duration: 550, easing: 'cubic-bezier(.2,.8,.18,1)' },
    )
  }

  function chooseTheme() {
    if (dialog.current?.open) dialog.current.close('choose')
    onChoose(selected)
  }

  return (
    <section aria-labelledby="collection-title" className="wedding-collection" data-collection-theme={selected}>
      <div className="wedding-collection-intro">
        <p className="wedding-overline">Studio undangan pernikahan</p>
        <h1 id="collection-title">
          Hari itu,
          <br />
          <em>cara kalian.</em>
        </h1>
        <p>Pilih desain yang terasa dekat dengan kalian. Buka sampelnya, lalu isi dengan cerita kalian sendiri.</p>
        <div className="wedding-collection-actions">
          <button className="collection-primary" type="button" onClick={chooseTheme}>
            Pakai {current.label} <ArrowDown size={18} />
          </button>
          <button type="button" className="collection-outline" onClick={(event) => openSample(event.currentTarget)}>
            Buka contoh <Maximize2 size={16} />
          </button>
        </div>
      </div>
      <div className="wedding-display">
        <div className="wedding-display-window" data-chapter={chapter}>
          <img ref={artwork} className="display-art" key={current.image} src={`/wedding/${current.image}.jpg`} alt="" />
          {chapter === 'Album' && (
            <div className="wedding-photo-spread" aria-hidden="true">
              <SamplePhotos />
            </div>
          )}
          <div className="wedding-display-caption" key={`${selected}-${chapter}`}>
            <p>
              {chapter === 'Sampul'
                ? 'Yth. Keluarga Ibu Ratna'
                : chapter === 'Album'
                  ? 'Album kami'
                  : 'Hari pernikahan'}
            </p>
            <strong>
              {chapter === 'Sampul' ? 'Aruna & Dimas' : chapter === 'Album' ? 'Dari satu sore' : '14 Februari 2027'}
            </strong>
            {chapter === 'Acara' && <p>16.00 WIB · Jakarta</p>}
          </div>
        </div>
        <div className="wedding-display-controls">
          <button type="button" aria-label="Template sebelumnya" onClick={() => stepTheme(-1)}>
            <ArrowLeft size={19} />
          </button>
          <div aria-live="polite">
            <strong>{current.label}</strong>
            <small>{current.medium}</small>
          </div>
          <button type="button" aria-label="Template berikutnya" onClick={() => stepTheme(1)}>
            <ArrowRight size={19} />
          </button>
        </div>
        <fieldset className="wedding-chapters">
          <legend className="sr-only">Bagian contoh</legend>
          {chapters.map((item) => (
            <button key={item} type="button" aria-pressed={chapter === item} onClick={() => setChapter(item)}>
              {item}
            </button>
          ))}
        </fieldset>
      </div>
      <fieldset className="wedding-template-strip">
        <legend className="sr-only">Pilih template</legend>
        {collection.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={selected === item}
            onClick={() => {
              setSelected(item)
              setChapter('Sampul')
            }}
          >
            <img alt="" src={`/wedding/${themes[item].image}.jpg`} />
            <span>{themes[item].label}</span>
          </button>
        ))}
      </fieldset>
      <dialog
        ref={dialog}
        className="wedding-sample-dialog"
        aria-labelledby="wedding-sample-title"
        onClose={() => {
          if (dialog.current?.returnValue !== 'choose') opener.current?.focus()
        }}
      >
        <header>
          <h2 id="wedding-sample-title">{current.label}</h2>
          <button
            type="button"
            className="sample-close"
            aria-label="Tutup contoh"
            onClick={() => dialog.current?.close('dismiss')}
          >
            <X size={22} />
          </button>
        </header>
        <article data-collection-theme={selected}>
          <div className="wedding-dialog-visual">
            <img src={`/wedding/${current.image}.jpg`} alt="" loading="lazy" />
            <div>
              <p>Yth. Keluarga Ibu Ratna</p>
              <h3>Aruna &amp; Dimas</h3>
              <p>14 Februari 2027</p>
            </div>
          </div>
          <div className="wedding-dialog-story">
            <h3>Berawal dari satu sore</h3>
            <p>Kami kenal di toko buku kecil di Jakarta. Tujuh tahun kemudian, kami mau merayakannya bareng kalian.</p>
            <figure className="wedding-dialog-album" aria-label="Contoh album">
              <SamplePhotos />
            </figure>
            <h3>Hari pernikahan</h3>
            <p>Minggu, 14 Februari 2027 · 16.00 WIB</p>
            <p>Jakarta</p>
          </div>
        </article>
        <footer>
          <button type="button" className="sample-choose" onClick={chooseTheme}>
            Pakai template ini <ArrowRight size={18} />
          </button>
        </footer>
      </dialog>
    </section>
  )
}

function SamplePhotos() {
  return (
    <>
      <img src="/wedding/cinema.jpg" alt="Pasangan di rumah kaca" />
      <img src="/wedding/garden.jpg" alt="Ilustrasi taman acara" />
      <img src="/wedding/press.jpg" alt="Detail kartu undangan" />
    </>
  )
}
