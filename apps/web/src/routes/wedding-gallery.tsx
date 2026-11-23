import { type WeddingDesign, type WeddingTemplate, weddingTemplates } from '@app/api/wedding-design'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

export const themes = {
  cinema: {
    label: 'Hujan di Bioskop',
    image: 'bioskop',
    medium: 'Adegan interaktif',
    preview: 'Ambil tiket',
    description: 'Masuk dari jalan yang kehujanan, bawa tiket ke lobi, lalu konfirmasi hadir di auditorium.',
  },
  radio: {
    label: 'Siaran Tengah Malam',
    image: 'cinema',
    medium: 'Musik & benda interaktif',
    preview: 'Cari frekuensinya',
    description: 'Putar kenop radio untuk menemukan siaran pernikahan dan dengarkan lagu pasangan.',
  },
  lantern: {
    label: 'Jalur Lampion',
    image: 'garden',
    medium: 'Perjalanan scroll',
    preview: 'Ikuti jalurnya',
    description: 'Ikuti jalur sepanjang undangan. Peta perjalanan menandai tempat yang sedang kamu lewati.',
  },
  town: {
    label: 'Kota Undangan',
    image: 'garden',
    medium: 'Jelajah 2D',
    preview: 'Jalan keliling kota',
    description: 'Gerakkan karakter melintasi kota. Masuk ke bangunan untuk membuka cerita, album, dan acara.',
  },
  darkroom: {
    label: 'Kamar Gelap',
    image: 'cinema',
    medium: 'Foto interaktif',
    preview: 'Cuci film',
    description: 'Cetak lembar kontak dari foto pasangan dan buka undangan dari meja kamar gelap.',
  },
  rain: {
    label: 'Hujan Pertama',
    image: 'cinema',
    medium: 'Ilustrasi interaktif',
    preview: 'Usap jendela',
    description: 'Singkirkan tetes hujan di jendela untuk melihat foto pasangan dan mengungkap undangan.',
  },
  puzzle: {
    label: 'Kotak Rahasia',
    image: 'press',
    medium: 'Mini-game',
    preview: 'Cocokkan keping',
    description: 'Buka laci undangan dengan mencocokkan keping yang tersembunyi di papan.',
  },
  exhibit: {
    label: 'Ruang Pamer',
    image: 'press',
    medium: 'Ruang berkurasi',
    preview: 'Masuk galeri',
    description: 'Pilih ruang dari denah pameran. Tiap ruang menampilkan satu bagian undangan.',
  },
  garden: {
    preview: 'Jelajah taman',
    label: 'Taman Kertas',
    image: 'garden',
    medium: 'Dunia 3D',
    description: 'Tamu berjalan di taman untuk menemukan album, lokasi acara, dan RSVP.',
  },
  night: {
    preview: 'Buka bab pertama',
    label: 'Blue Hour',
    image: 'cinema',
    medium: 'Cerita per bab',
    description: 'Sampul seperti adegan pembuka, lalu tamu membuka cerita dan album satu bab demi satu.',
  },
  print: {
    preview: '14 Februari 2027',
    label: 'Ruang Cetak',
    image: 'press',
    medium: 'Majalah digital',
    description: 'Sampul dua kolom, daftar isi, dan semua detail acara dalam satu halaman.',
  },
  letter: {
    label: 'Surat Senja',
    image: 'press',
    medium: 'Buka amplop',
    preview: 'Buka segel',
    description: 'Buka segel amplop untuk membaca surat pribadi, melihat detail acara, dan membalas undangan.',
  },
  weekend: {
    label: 'Peta Akhir Pekan',
    image: 'garden',
    medium: 'Panduan acara',
    preview: 'Lihat agenda',
    description: 'Halaman agenda dengan rundown per waktu dan pintasan langsung ke bagian yang dicari tamu.',
  },
  keepsake: {
    label: 'Meja Kenangan',
    image: 'cinema',
    medium: 'Album interaktif',
    preview: 'Lihat foto',
    description: 'Foto jadi pintu masuk. Tamu bisa membesarkan album, lalu membaca kisah dan detail di bawahnya.',
  },
} satisfies Record<
  WeddingTemplate,
  { label: string; image: string; medium: string; preview: string; description: string }
>

export type Theme = keyof typeof themes

const compositions = {
  cinema: { cover: 'poster', flow: 'page', album: 'filmstrip', type: 'serif', palette: 'ink', x: 50, y: 75 },
  radio: { cover: 'frame', flow: 'page', album: 'filmstrip', type: 'sans', palette: 'ink', x: 50, y: 84 },
  lantern: { cover: 'poster', flow: 'page', album: 'grid', type: 'serif', palette: 'cream', x: 50, y: 67 },
  town: { cover: 'split', flow: 'page', album: 'grid', type: 'sans', palette: 'cream', x: 50, y: 50 },
  darkroom: { cover: 'split', flow: 'page', album: 'filmstrip', type: 'sans', palette: 'ink', x: 50, y: 50 },
  rain: { cover: 'poster', flow: 'page', album: 'stack', type: 'italic', palette: 'ink', x: 50, y: 82 },
  puzzle: { cover: 'split', flow: 'page', album: 'grid', type: 'serif', palette: 'rose', x: 50, y: 50 },
  exhibit: { cover: 'split', flow: 'page', album: 'grid', type: 'sans', palette: 'cream', x: 50, y: 50 },
  garden: { cover: 'poster', flow: 'rooms', album: 'grid', type: 'serif', palette: 'template', x: 50, y: 80 },
  night: { cover: 'poster', flow: 'chapters', album: 'filmstrip', type: 'serif', palette: 'ink', x: 9, y: 75 },
  print: { cover: 'split', flow: 'page', album: 'grid', type: 'sans', palette: 'cream', x: 50, y: 50 },
  letter: { cover: 'frame', flow: 'page', album: 'stack', type: 'italic', palette: 'rose', x: 50, y: 55 },
  weekend: { cover: 'split', flow: 'page', album: 'filmstrip', type: 'sans', palette: 'cream', x: 50, y: 50 },
  keepsake: { cover: 'poster', flow: 'page', album: 'grid', type: 'serif', palette: 'ink', x: 50, y: 83 },
} satisfies Record<Theme, Partial<WeddingDesign>>

export function templateSearch(search: Record<string, unknown>): { template?: Theme } {
  return { template: weddingTemplates.find((template) => template === search.template) }
}

export function applyTemplate(design: WeddingDesign, theme: Theme): WeddingDesign {
  const first: WeddingDesign['sections'][number] | undefined =
    theme === 'keepsake' || theme === 'darkroom' ? 'album' : theme === 'weekend' ? 'event' : undefined
  const sections: WeddingDesign['sections'] = first
    ? [first, ...design.sections.filter((section) => section !== first)]
    : design.sections
  return { ...design, ...compositions[theme], sections, template: theme }
}

const categories = {
  Semua: ['garden', ...weddingTemplates.filter((theme) => theme !== 'garden')],
  Interaktif: ['garden', 'cinema', 'radio', 'town', 'darkroom', 'rain', 'puzzle', 'letter'],
  'Cerita & foto': ['lantern', 'night', 'keepsake', 'darkroom', 'rain', 'exhibit'],
  Editorial: ['print', 'weekend', 'exhibit'],
} satisfies Record<string, readonly Theme[]>

export function TemplateCards({ current, onChoose }: { current?: Theme; onChoose?: (theme: Theme) => void }) {
  const [category, setCategory] = useState<keyof typeof categories>('Semua')
  return (
    <>
      <fieldset className="template-filters">
        <legend className="sr-only">Jenis template</legend>
        {(Object.keys(categories) as (keyof typeof categories)[]).map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </fieldset>
      <div className="template-cards">
        {categories[category].map((theme) => {
          const item = themes[theme]
          return (
            <article className="template-card" key={theme} data-preview={theme}>
              <Link
                className="template-art"
                to="/contoh"
                search={{ template: theme }}
                target={onChoose ? '_blank' : undefined}
                rel={onChoose ? 'noopener' : undefined}
                aria-label={`Lihat contoh ${item.label}`}
              >
                {theme === 'cinema' && <i className="cinema-template-art" />}
                {theme !== 'cinema' && theme !== 'letter' && (
                  <img src={`/wedding/${item.image}.jpg`} alt="" loading="lazy" />
                )}
                <span className="template-art-caption" aria-hidden="true">
                  <strong>{theme === 'weekend' ? '16.00 · Akad' : 'Aruna & Dimas'}</strong>
                  <span>{item.preview}</span>
                </span>
              </Link>
              <div className="template-card-copy">
                <span>{item.medium}</span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <div className="template-card-actions">
                  <Link
                    to="/contoh"
                    search={{ template: theme }}
                    target={onChoose ? '_blank' : undefined}
                    rel={onChoose ? 'noopener' : undefined}
                  >
                    Buka contoh <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  {onChoose && (
                    <button type="button" disabled={theme === current} onClick={() => onChoose(theme)}>
                      {theme === current ? 'Sedang dipakai' : 'Pakai template'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export function WeddingGallery({ initialTheme, onChoose }: { initialTheme: Theme; onChoose: (theme: Theme) => void }) {
  return (
    <section className="studio-template-gallery" aria-labelledby="template-title">
      <h2 id="template-title">Pilih template</h2>
      <p>Ganti susunan dan cara tamu membuka undangan. Isi, foto, dan musik tetap tersimpan di draft ini.</p>
      <TemplateCards current={initialTheme} onChoose={onChoose} />
    </section>
  )
}
