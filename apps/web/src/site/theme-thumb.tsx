import type { ThemeId } from '@app/api/invitation-model'
import type { CSSProperties, ReactNode } from 'react'
import { formatDate } from '@/invite/format'
import { palettes } from '@/invite/palette'
import { themeArt } from '@/invite/themes'
import { ThemeScene } from '@/invite/themes/scene'
import './theme-thumb.css'

function MiniPhone({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`mini-phone ${className ?? ''}`} style={style}>
      <div className="mini-screen">{children}</div>
    </div>
  )
}

/** Three small phones that show a theme's cover, opening and event card without rendering a whole invitation. */
export function ThemeThumb({ theme, names = ['Sekar', 'Bima'] }: { theme: ThemeId; names?: [string, string] }) {
  const palette = palettes[theme]
  const art = themeArt[theme]
  const vars = {
    '--t-paper': palette.paper,
    '--t-surface': palette.surface,
    '--t-ink': palette.ink,
    '--t-muted': palette.muted,
    '--t-accent': palette.accent,
    '--t-deep': palette.deep,
    '--t-on-deep': palette.onDeep,
    '--t-line': palette.line,
    '--t-display': palette.display,
    '--t-script': palette.script,
    '--t-pattern': art.pattern?.(palette) ?? 'none',
  } as CSSProperties
  const coverDark = theme === 'kawung' || palette.dark
  return (
    <div className={`thumb thumb-${theme}`} style={vars}>
      <MiniPhone className="is-left">
        <div className={`thumb-cover ${coverDark ? 'is-dark' : ''}`}>
          <span className="thumb-kicker">Undangan</span>
          <span className="thumb-names">
            {names[0]} &amp; {names[1]}
          </span>
          <art.Envelope palette={palette} />
          <span className="thumb-pill">Buka</span>
        </div>
      </MiniPhone>
      <MiniPhone className="is-center">
        <div className="thumb-hero">
          <ThemeScene theme={theme} thumbnail />
          <div className="thumb-hero-text">
            <span className="thumb-names is-big">{names[0]}</span>
            <span className="thumb-amp">&amp;</span>
            <span className="thumb-names is-big">{names[1]}</span>
            <span className="thumb-date">{formatDate('2027-06-12', 'id', 'short')}</span>
          </div>
        </div>
      </MiniPhone>
      <MiniPhone className="is-right">
        <div className="thumb-panel-page">
          <art.Ornament palette={palette} />
          <span className="thumb-title">Acara</span>
          <div className={`thumb-panel panel-${art.panel}`}>
            <span className="thumb-kicker is-accent">Resepsi</span>
            <span className="thumb-event">12 Juni 2027</span>
            <span className="thumb-small">11.00 WIB</span>
          </div>
          <div className={`thumb-panel panel-${art.panel}`}>
            <span className="thumb-kicker is-accent">Akad</span>
            <span className="thumb-event">12 Juni 2027</span>
          </div>
        </div>
      </MiniPhone>
    </div>
  )
}
