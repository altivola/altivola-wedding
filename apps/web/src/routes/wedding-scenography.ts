import type { StudioSection } from '@app/api/wedding-design'
import type { PointerEvent } from 'react'
import type { Theme } from './wedding-gallery'

type Surface = 'sign' | 'paper' | 'film' | 'print' | 'glass' | 'radio' | 'cabinet' | 'canvas' | 'wood'
type Scene = Partial<Record<StudioSection, Surface>> & { base: Surface }

const scenes = {
  cinema: { base: 'paper', album: 'film' },
  garden: { base: 'wood', cover: 'sign', story: 'sign', event: 'sign', album: 'canvas', rsvp: 'paper' },
  radio: { base: 'radio', story: 'radio', event: 'print', album: 'radio', rsvp: 'paper' },
  lantern: { base: 'wood', cover: 'sign', event: 'sign', story: 'sign', album: 'canvas', rsvp: 'paper' },
  town: { base: 'sign', cover: 'sign', story: 'wood', event: 'sign', album: 'canvas', rsvp: 'paper' },
  darkroom: { base: 'film', album: 'film', event: 'print', rsvp: 'paper' },
  rain: { base: 'glass', event: 'glass', album: 'glass', rsvp: 'paper' },
  puzzle: { base: 'cabinet', event: 'wood', album: 'canvas', rsvp: 'cabinet' },
  exhibit: { base: 'canvas', event: 'print', album: 'canvas', rsvp: 'print' },
  night: { base: 'film', story: 'film', event: 'film', album: 'film', rsvp: 'paper' },
  print: { base: 'print', album: 'print', rsvp: 'print' },
  letter: { base: 'paper', album: 'canvas', rsvp: 'paper' },
  weekend: { base: 'print', cover: 'sign', story: 'paper', event: 'print', album: 'canvas', rsvp: 'paper' },
  keepsake: { base: 'canvas', story: 'paper', event: 'print', album: 'canvas', rsvp: 'paper' },
} satisfies Record<Theme, Scene>

export function sceneSurface(theme: Theme, section: StudioSection) {
  const scene: Scene = scenes[theme]
  return scene[section] ?? scene.base
}

export function moveScene<E extends HTMLElement>(event: PointerEvent<E>) {
  const surface = event.currentTarget
  const rect = surface.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  surface.style.setProperty('--scene-x', `${x * 100}%`)
  surface.style.setProperty('--scene-y', `${y * 100}%`)
  surface.style.setProperty('--scene-tilt-x', `${(0.5 - y) * 5}deg`)
  surface.style.setProperty('--scene-tilt-y', `${(x - 0.5) * 6}deg`)
  surface.style.setProperty('--scene-pan-x', `${(x - 0.5) * 16}px`)
  return { x, y }
}

export function touchScene(event: PointerEvent<HTMLElement>) {
  if (!event.isPrimary || event.button !== 0) return
  const point = moveScene(event)
  if (!point || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const node = document.createElement('i')
  node.className = 'scene-impact'
  node.setAttribute('aria-hidden', 'true')
  node.style.left = `${point.x * 100}%`
  node.style.top = `${point.y * 100}%`
  event.currentTarget.append(node)
  window.setTimeout(() => node.remove(), 800)
}
