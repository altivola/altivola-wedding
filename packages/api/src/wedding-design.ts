export const gardenMaps = ['twilight', 'ponds', 'orchard', 'city', 'shore'] as const
export const gardenCharacters = ['lantern', 'hare', 'cat'] as const
export type GardenMap = (typeof gardenMaps)[number]
export type GardenCharacter = (typeof gardenCharacters)[number]

export const customWeddingSections = ['custom-1', 'custom-2', 'custom-3', 'custom-4', 'custom-5', 'custom-6'] as const
export const weddingSections = ['story', 'event', 'album', 'note', 'rsvp', ...customWeddingSections] as const
export const weddingTemplates = [
  'cinema',
  'radio',
  'lantern',
  'town',
  'darkroom',
  'rain',
  'puzzle',
  'exhibit',
  'garden',
  'night',
  'print',
  'letter',
  'weekend',
  'keepsake',
] as const
export const weddingFlows = ['rooms', 'chapters', 'page'] as const
export type WeddingTemplate = (typeof weddingTemplates)[number]
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
export type ScheduleItem = { id: string; time: string; title: string; detail: string }
export const maxScheduleItems = 8

export type WeddingDesign = {
  x: number
  y: number
  type: 'serif' | 'sans' | 'italic'
  palette: 'template' | 'cream' | 'ink' | 'rose'
  cover: 'poster' | 'frame' | 'split'
  sections: WeddingSection[]
  note: string
  album?: 'grid' | 'filmstrip' | 'stack'
  template?: WeddingTemplate
  schedule?: ScheduleItem[]
  flow?: (typeof weddingFlows)[number]
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
