import type { ThemeId } from '@app/api/invitation-model'
import type { CSSProperties, ReactNode } from 'react'
import { palettes } from './palette'
import { themeArt } from './themes'
import './stage.css'

/** Full screen on phones. On wide screens the invitation sits in a phone-sized column. */
export function Stage({ theme, children, bar }: { theme: ThemeId; children: ReactNode; bar?: ReactNode }) {
  const palette = palettes[theme]
  const style = {
    '--stage-bg': palette.dark ? palette.deep : palette.paper,
    '--stage-pattern': themeArt[theme].pattern?.(palette) ?? 'none',
  } as CSSProperties
  return (
    <div className="stage" style={style}>
      {bar}
      <div className="stage-column">{children}</div>
    </div>
  )
}
