export const gardenMaps = ['twilight', 'ponds', 'orchard', 'city', 'shore'] as const
export const gardenCharacters = ['lantern', 'hare', 'cat'] as const
export type GardenMap = (typeof gardenMaps)[number]
export type GardenCharacter = (typeof gardenCharacters)[number]

export const weddingSections = ['story', 'event', 'album', 'note', 'rsvp'] as const
export type WeddingSection = (typeof weddingSections)[number]
export const studioSections = ['cover', ...weddingSections] as const
export type StudioSection = (typeof studioSections)[number]
export type SectionStyle = {
  title?: string
  eyebrow?: string
  lead?: string
  layout?: 'stack' | 'editorial' | 'framed'
  align?: 'left' | 'center' | 'right'
  mobileAlign?: 'left' | 'center' | 'right'
  font?: 'serif' | 'sans' | 'italic'
  surface?: string
  ink?: string
  spacing?: number
  titleScale?: number
}
export type WeddingDesign = {
  x: number
  y: number
  type: 'serif' | 'sans' | 'italic'
  palette: 'template' | 'cream' | 'ink' | 'rose'
  cover: 'poster' | 'frame' | 'split'
  sections: WeddingSection[]
  note: string
  album?: 'grid' | 'filmstrip' | 'stack'
  flow?: 'rooms' | 'page'
  accent?: 'gold' | 'lavender' | 'fern'
  gardenMap?: GardenMap
  gardenCharacter?: GardenCharacter
  sectionStyles?: Partial<Record<StudioSection, SectionStyle>>
  sectionAlign?: Partial<Record<WeddingSection, 'left' | 'center'>>
}

export const defaultWeddingDesign: WeddingDesign = {
  x: 50,
  y: 80,
  type: 'serif',
  palette: 'template',
  cover: 'poster',
  sections: ['story', 'event', 'rsvp'],
  note: '',
  flow: 'rooms',
}
