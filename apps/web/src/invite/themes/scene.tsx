import type { ThemeId } from '@app/api/invitation-model'
import { palettes } from '../palette'
import { themeArt } from './index'
import './scene.css'

export function ThemeScene({ theme, thumbnail = false }: { theme: ThemeId; thumbnail?: boolean }) {
  const { Hero } = themeArt[theme]
  const size = thumbnail ? 'thumb' : 'full'

  return (
    <>
      <Hero palette={palettes[theme]} />
      <img
        key={theme}
        className="hero-art theme-painting"
        src={`/wedding/themes/${theme}-${size}.webp`}
        alt=""
        loading={thumbnail ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={(event) => {
          event.currentTarget.dataset.ready = 'true'
        }}
      />
    </>
  )
}
