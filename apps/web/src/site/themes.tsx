import { useEffect } from 'react'
import { SiteFooter, SiteNav } from './layout'
import { ThemeCard, ThemeFilters, useThemeFilter } from './theme-grid'

export function ThemesPage() {
  const { list, filters } = useThemeFilter()
  useEffect(() => {
    document.title = 'Tema undangan · Hari Bersama'
  }, [])
  return (
    <div className="site">
      <SiteNav />
      <main className="site-section">
        <div className="site-wrap">
          <div className="section-head">
            <h1 className="display-2">Semua tema</h1>
            <p>
              Setiap tema punya amplop, ilustrasi, bingkai foto, dan frame photobooth sendiri. Semuanya bisa kamu ubah.
            </p>
          </div>
          <ThemeFilters {...filters} />
          <div className="theme-grid">
            {list.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
          {list.length === 0 && <p className="site-muted">Tidak ada tema yang cocok.</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
