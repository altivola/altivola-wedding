import type { JSX } from 'react'
import type { Palette } from '../palette'

export type ArtProps = { palette: Palette }

export type ThemeArt = {
  /** The envelope on the cover. Adding the `is-open` class to an ancestor plays the opening. */
  Envelope: (props: ArtProps) => JSX.Element
  /** Scenery behind the names in the opening section. */
  Hero: (props: ArtProps) => JSX.Element
  /** Small ornament between sections. */
  Ornament: (props: ArtProps) => JSX.Element
  /** Scenery at the bottom of the closing section. */
  Footer: (props: ArtProps) => JSX.Element
  /** Repeating page background, as a CSS background-image value. */
  pattern?: (palette: Palette) => string
  /** How photos are framed. */
  frame: 'arch' | 'soft' | 'stamp' | 'bulbs' | 'oval' | 'paper'
  /** How panels such as event cards are drawn. */
  panel: 'gilded' | 'paper' | 'postcard' | 'ticket' | 'leaf' | 'block'
}

export const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
