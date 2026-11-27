import { Link } from '@tanstack/react-router'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { palettes } from '@/invite/palette'
import { themeArt } from '@/invite/themes'
import { BoothDoodle, CameraDoodle, CheckInDoodle, HeroDoodle, SquiggleUnderline, TileArt } from './doodles'
import { SiteFooter, SiteNav } from './layout'
import { ThemeCard, ThemeFilters, useThemeFilter } from './theme-grid'
import { ThemeThumb } from './theme-thumb'

const tiles = [
  { kind: 'free', title: 'Coba gratis, tanpa daftar', color: 'var(--hb-ink)', ink: '#fff', href: '/buat' },
  { kind: 'camera', title: 'Kamera sekali pakai di HP tamu', color: 'var(--hb-terra)', ink: '#fff', href: '#kamera' },
  { kind: 'themes', title: 'Tema secantik harimu', color: 'var(--hb-kunyit)', ink: 'var(--hb-ink)', href: '/tema' },
  { kind: 'booth', title: 'Photobooth di setiap HP', color: 'var(--hb-langit)', ink: '#fff', href: '#photobooth' },
  {
    kind: 'events',
    title: 'Tamu hanya lihat acaranya',
    color: 'var(--hb-daun)',
    ink: 'var(--hb-ink)',
    href: '#check-in',
  },
] as const

const steps = [
  {
    title: 'Coba builder, tanpa bayar dan tanpa daftar',
    text: 'Pilih tema, isi nama, dan undanganmu langsung jadi. Daftar hanya saat kamu mau menyimpan dan mengirimnya.',
    url: 'studio',
    left: 'Gratis dicoba',
    right: 'Tanpa daftar',
  },
  {
    title: 'RSVP, QR, dan check-in dalam satu alur',
    text: 'Tamu membalas dari undangan dan langsung dapat QR pribadi. Di pintu masuk, QR itu dipindai dan tamu tercatat hadir.',
    url: 'check-in',
    left: '128 RSVP',
    right: '96 hadir',
  },
  {
    title: 'Photobooth di dalam undangan',
    text: 'Tamu pilih frame, berpose tiga kali, dan foto strip-nya jadi. Semua dari HP masing-masing.',
    url: 'booth',
    left: '214 foto',
    right: '56 strip',
  },
  {
    title: 'Kamera sekali pakai untuk setiap tamu',
    text: 'Setiap tamu dapat satu rol. Fotonya baru muncul setelah acara, seperti film sungguhan.',
    url: 'kamera',
    left: '3 rol',
    right: '72 jepretan',
  },
]

const qrCells = Array.from({ length: 49 }, (_, cell) => cell)

const faqs = [
  {
    q: 'Apa itu Hari Bersama?',
    a: 'Undangan digital untuk pernikahanmu. Satu link berisi undangan, konfirmasi hadir, ucapan, photobooth, dan kamera sekali pakai untuk tamu.',
  },
  {
    q: 'Boleh coba dulu sebelum daftar?',
    a: 'Boleh. Pilih tema, isi nama, dan lihat undanganmu jadi tanpa akun. Draf tanpa akun disimpan 3 hari di browser ini. Daftar kapan saja untuk menyimpannya lebih lama.',
  },
  {
    q: 'Apakah tamu perlu aplikasi atau akun?',
    a: 'Tidak. Undangan, photobooth, dan kamera terbuka langsung di browser HP tamu.',
  },
  {
    q: 'Bisakah setiap tamu melihat namanya sendiri?',
    a: 'Bisa. Tambahkan tamu di tab Tamu, lalu kirim link pribadi masing-masing lewat WhatsApp. Nama mereka muncul di sampul, dan mereka bisa konfirmasi hadir.',
  },
  {
    q: 'Bisa mengundang tamu ke acara yang berbeda?',
    a: 'Bisa. Satu undangan bisa berisi sampai tiga acara, dan kamu pilih acara mana yang dilihat tiap tamu. Keluarga bisa melihat akad dan resepsi, teman kantor cukup resepsi.',
  },
  {
    q: 'Kalau ada yang berubah setelah undangan dikirim?',
    a: 'Ubah di studio lalu terbitkan lagi. Link yang sudah dikirim tetap sama dan langsung menampilkan versi terbaru.',
  },
  {
    q: 'Bagaimana photobooth dan kamera sekali pakai bekerja?',
    a: 'Tamu membuka photobooth atau kamera dari undangan atau dari QR di lokasi. Strip photobooth masuk ke album tamu. Foto kamera baru terlihat setelah kamu membuka albumnya.',
  },
  {
    q: 'Berapa biayanya?',
    a: 'Paket berlangganan sedang disiapkan. Untuk sekarang, kamu bisa membuat dan menerbitkan undangan tanpa biaya.',
  },
]

function Browser({ url, children, left, right }: { url: string; children: ReactNode; left: string; right: string }) {
  return (
    <div className="browser">
      <div className="browser-bar">
        <span className="browser-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="browser-url">
          haribersama / <strong>{url}</strong>
        </span>
      </div>
      <div className="browser-body">
        <span className="browser-side is-left">{left}</span>
        <div className="browser-stage">{children}</div>
        <span className="browser-side is-right">{right}</span>
      </div>
    </div>
  )
}

function PhoneMock({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`phone-mock ${dark ? 'is-dark' : ''}`}>
      <div className="phone-mock-screen">{children}</div>
    </div>
  )
}

function StepVisual({ index }: { index: number }) {
  const kawung = palettes.kawung
  const sawah = palettes.sawah
  if (index === 0)
    return (
      <div className="mock-studio">
        <div className="mock-studio-list">
          {['Umum', 'Sampul', 'Pembuka', 'Mempelai', 'Cerita Kami', 'Acara', 'Galeri'].map((label, item) => (
            <span key={label} className={item === 3 ? 'is-on' : ''}>
              {label}
              {item > 2 && item !== 5 && <i className="mock-toggle" />}
            </span>
          ))}
        </div>
        <div className="mock-studio-form">
          <span className="mock-label">Nama panggilan</span>
          <span className="mock-input">Sekar</span>
          <span className="mock-label">Nama lengkap</span>
          <span className="mock-input">Sekar Ayu Larasati</span>
          <span className="mock-label">Orang tua</span>
          <span className="mock-input is-faint">Putri dari Bapak...</span>
        </div>
        <PhoneMock>
          <div className="mock-hero">
            <themeArt.kawung.Hero palette={kawung} />
            <span className="mock-hero-names">
              Sekar
              <br />
              <em>&amp;</em>
              <br />
              Bima
            </span>
          </div>
        </PhoneMock>
      </div>
    )
  if (index === 1)
    return (
      <PhoneMock>
        <div className="mock-rsvp" style={{ background: sawah.paper }}>
          <span className="mock-kicker">Mohon konfirmasi</span>
          <strong>Kamu akan hadir bersama 2 orang.</strong>
          <span className="mock-qr" aria-hidden="true">
            {qrCells.map((cell) => (
              <i key={cell} className={(cell * 7) % 3 === 0 || cell % 8 === 0 ? 'is-on' : ''} />
            ))}
          </span>
          <span className="mock-small">Tunjukkan kode ini di meja tamu</span>
        </div>
      </PhoneMock>
    )
  if (index === 2)
    return (
      <PhoneMock dark>
        <div className="mock-booth">
          <span className="mock-kicker">Photobooth</span>
          <div className="mock-strip">
            <i style={{ background: '#f2c14e' }} />
            <i style={{ background: '#f3c9c0' }} />
            <i style={{ background: '#b9d3a8' }} />
          </div>
          <span className="mock-pill">Masukkan ke album</span>
        </div>
      </PhoneMock>
    )
  return (
    <PhoneMock dark>
      <div className="mock-camera">
        <span className="mock-counter">
          <b>2</b>
          <b>1</b>
        </span>
        <span className="mock-lens" />
        <span className="mock-shutter" />
        <span className="mock-small">Senja 400</span>
      </div>
    </PhoneMock>
  )
}

function HowItWorks() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const element of refs.current) if (element) observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <section className="site-section" id="undangan">
      <div className="site-wrap">
        <div className="section-head is-center">
          <h2 className="display-2">Semua untuk hari H, dalam satu undangan</h2>
          <p>Coba builder-nya gratis, lalu kelola RSVP, check-in, dan foto tamu dari link yang sama.</p>
        </div>
        <div className="how">
          <ol className="how-steps">
            {steps.map((step, index) => (
              <li key={step.title} className={index === active ? 'is-active' : ''}>
                <span className="how-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="how-visuals">
            {steps.map((step, index) => (
              <div
                key={step.url}
                className="how-visual"
                data-step={index}
                ref={(element) => {
                  refs.current[index] = element
                }}
              >
                <div className="how-mobile-text">
                  <span className="how-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <Browser url={step.url} left={step.left} right={step.right}>
                  <StepVisual index={index} />
                </Browser>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Themes() {
  const { list, filters } = useThemeFilter()
  return (
    <section className="site-section is-sand" id="tema">
      <div className="site-wrap">
        <div className="section-head is-split">
          <h2 className="display-2">Tema untuk setiap gaya perayaan.</h2>
          <div>
            <p>Pilih titik awalnya, lalu atur setiap warna, foto, dan kata sampai terasa seperti kalian.</p>
            <Link to="/tema" className="site-button is-dark">
              Lihat semua tema
            </Link>
          </div>
        </div>
        <ThemeFilters {...filters} />
        <div className="theme-row">
          {list.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} />
          ))}
          {list.length === 0 && <p className="site-muted">Tidak ada tema yang cocok.</p>}
        </div>
      </div>
    </section>
  )
}

function Feature({
  id,
  title,
  text,
  points,
  cta,
  art,
  flip = false,
  tone,
}: {
  id: string
  title: string
  text: string
  points: string[]
  cta: { label: string; to: string }
  art: ReactNode
  flip?: boolean
  tone?: string
}) {
  return (
    <section className={`site-section ${tone ?? ''}`} id={id}>
      <div className={`site-wrap feature ${flip ? 'is-flip' : ''}`}>
        <div className="feature-text">
          <h2 className="display-2">{title}</h2>
          <p className="feature-lead">{text}</p>
          <ol className="feature-points">
            {points.map((point, index) => (
              <li key={point}>
                <span>{index + 1}</span>
                {point}
              </li>
            ))}
          </ol>
          <Link to={cta.to} className="site-button is-dark">
            {cta.label}
          </Link>
        </div>
        <div className="feature-art">{art}</div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="site-section" id="faq">
      <div className="site-wrap faq">
        <div>
          <h2 className="display-2">Yang sering ditanyakan</h2>
          <p className="site-muted">Pertanyaan yang paling sering muncul sebelum memilih tema.</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={faq.q} className={`faq-item ${open === index ? 'is-open' : ''}`}>
              <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
                <span>{faq.q}</span>
                <i aria-hidden="true">{open === index ? '×' : '+'}</i>
              </button>
              {open === index && <p>{faq.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  useEffect(() => {
    document.title = 'Hari Bersama · Undangan, photobooth, dan kamera untuk tamu'
  }, [])
  return (
    <div className="site">
      <SiteNav />
      <main>
        <section className="hero">
          <div className="site-wrap hero-grid">
            <div className="hero-text">
              <h1 className="display-1">
                Biar mereka ikut merasakan harimu,{' '}
                <span className="hero-mark">
                  sebelum dimulai.
                  <SquiggleUnderline className="hero-squiggle" />
                </span>
              </h1>
              <p className="hero-lead">Undangan, RSVP, photobooth, dan kamera sekali pakai. Semua dalam satu link.</p>
              <div className="hero-actions">
                <Link to="/buat" className="site-button is-dark is-large">
                  Buat undangan
                </Link>
                <Link to="/tema" className="site-text-link">
                  Lihat tema
                </Link>
              </div>
            </div>
            <div className="hero-illustration">
              <HeroDoodle className="hero-doodle" />
              <div className="hero-thumb">
                <ThemeThumb theme="kawung" />
              </div>
            </div>
          </div>
          <div className="tiles">
            {tiles.map((tile, index) => (
              <a
                key={tile.kind}
                href={tile.href}
                className="tile"
                style={{ background: tile.color, color: tile.ink, rotate: `${[-3, 2, -1, 3, -2][index]}deg` }}
              >
                <span className="tile-title">{tile.title}</span>
                <TileArt kind={tile.kind} />
              </a>
            ))}
          </div>
        </section>
        <HowItWorks />
        <Themes />
        <Feature
          id="photobooth"
          title="Photobooth di saku setiap tamu."
          text="Tamu scan satu kode di lokasi, lalu ambil foto strip berbingkai dari HP sendiri."
          points={[
            'Tanpa aplikasi, tanpa sewa booth',
            'Frame senada dengan tema undangan',
            'Album tamu yang bisa kamu simpan',
          ]}
          cta={{ label: 'Coba photobooth', to: '/coba/booth' }}
          art={<BoothDoodle className="feature-doodle" />}
        />
        <Feature
          id="kamera"
          title="Kamera sekali pakai untuk setiap tamu."
          text="Bagikan satu rol isi 24 jepretan. Tamu memotret dari HP sendiri, dan kamu yang memutuskan kapan albumnya dibuka."
          points={['24 jepretan, tanpa preview', 'Lima pilihan film', 'Album dibuka saat kamu siap']}
          cta={{ label: 'Coba kameranya', to: '/coba/kamera' }}
          art={<CameraDoodle className="feature-doodle" />}
          flip
          tone="is-rose"
        />
        <Feature
          id="check-in"
          title="Tanpa buku tamu. Cukup scan."
          text="Tamu yang konfirmasi hadir dapat QR di undangannya. Scan di pintu, dan kamu tahu siapa yang sudah datang."
          points={[
            'Cari nama kalau tamu lupa QR-nya',
            'Catat tamu yang datang tanpa undangan',
            'Tiap tamu hanya melihat acara yang mereka diundang',
          ]}
          cta={{ label: 'Mulai sekarang', to: '/buat' }}
          art={<CheckInDoodle className="feature-doodle" />}
        />
        <section className="site-section">
          <div className="site-wrap">
            <div className="cta-band">
              <div>
                <h2 className="display-2">Coba dulu. Gratis, tanpa daftar.</h2>
                <p>Isi nama kalian, pilih tema, dan lihat undanganmu jadi dalam semenit.</p>
              </div>
              <Link to="/buat" className="site-button is-light is-large">
                Buat undangan
              </Link>
            </div>
          </div>
        </section>
        <Faq />
      </main>
      <SiteFooter />
    </div>
  )
}
