import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth'
import './site.css'

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`wordmark ${light ? 'is-light' : ''}`} aria-label="Hari Bersama, beranda">
      hari bersama<span>.</span>
    </Link>
  )
}

const features = [
  { hash: 'undangan', title: 'Undangan digital', text: 'Satu link untuk RSVP, ucapan, dan daftar tamu.' },
  { hash: 'photobooth', title: 'Photobooth', text: 'Foto strip berbingkai dari HP setiap tamu.' },
  { hash: 'kamera', title: 'Kamera sekali pakai', text: '24 jepretan per tamu, album dibuka belakangan.' },
  { hash: 'check-in', title: 'Check-in QR', text: 'Tanpa buku tamu. Scan, lalu tamu masuk.' },
]

export function SiteNav() {
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`site-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="site-wrap site-nav-row">
        <Wordmark />
        <nav className="site-links" aria-label="Utama">
          <details className="site-menu">
            <summary>Fitur</summary>
            <div className="site-menu-panel">
              {features.map((feature) => (
                <Link key={feature.hash} to="/" hash={feature.hash}>
                  <strong>{feature.title}</strong>
                  <span>{feature.text}</span>
                </Link>
              ))}
            </div>
          </details>
          <Link to="/tema">Tema</Link>
          <Link to="/" hash="faq">
            FAQ
          </Link>
        </nav>
        <div className="site-nav-actions">
          {session ? (
            <Link to="/studio" className="site-button is-dark is-small">
              Studio
            </Link>
          ) : (
            <Link to="/login" className="site-button is-dark is-small">
              Masuk
            </Link>
          )}
          <button
            type="button"
            className="site-burger"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      {open && (
        <div className="site-mobile-menu">
          {features.map((feature) => (
            <Link key={feature.hash} to="/" hash={feature.hash} onClick={() => setOpen(false)}>
              {feature.title}
            </Link>
          ))}
          <Link to="/tema" onClick={() => setOpen(false)}>
            Tema
          </Link>
          <Link to="/" hash="faq" onClick={() => setOpen(false)}>
            FAQ
          </Link>
          <Link to="/buat" className="site-button is-dark" onClick={() => setOpen(false)}>
            Buat undangan
          </Link>
        </div>
      )}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-wrap site-footer-grid">
        <div className="site-footer-brand">
          <Wordmark light />
          <p>Undangan, photobooth, dan kamera sekali pakai untuk hari yang layak dikenang.</p>
        </div>
        <div>
          <h3>Jelajahi</h3>
          <Link to="/tema">Tema</Link>
          <Link to="/buat">Buat undangan</Link>
          <Link to="/" hash="faq">
            FAQ
          </Link>
        </div>
        <div>
          <h3>Coba</h3>
          <Link to="/coba/booth">Photobooth</Link>
          <Link to="/coba/kamera">Kamera sekali pakai</Link>
          <Link to="/tema/$theme" params={{ theme: 'kawung' }}>
            Contoh undangan
          </Link>
        </div>
        <div>
          <h3>Altivola</h3>
          <a href="https://www.altivola.workers.dev" target="_blank" rel="noreferrer">
            Produk lain
          </a>
          <a href="https://github.com/altivola/altivola-wedding" target="_blank" rel="noreferrer">
            Kode sumber
          </a>
        </div>
      </div>
      <div className="site-wrap site-footer-bottom">
        <span>Hari Bersama, bagian dari Altivola</span>
        <span>Dibuat di Indonesia</span>
      </div>
    </footer>
  )
}
