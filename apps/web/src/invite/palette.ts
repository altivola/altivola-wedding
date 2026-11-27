import type { ThemeId } from '@app/api/invitation-model'

export type Palette = {
  /** Page background. */
  paper: string
  /** Cards and panels. */
  surface: string
  ink: string
  muted: string
  accent: string
  /** Text on `accent`. */
  onAccent: string
  /** A second colour for art and badges. */
  second: string
  /** Strong panels such as the events card. */
  deep: string
  onDeep: string
  line: string
  display: string
  body: string
  script: string
  /** Dress code colours used until the creator picks their own. */
  swatches: { hex: string; name: string }[]
  song: 'gymnopedie' | 'thinking-of-you' | 'love-away' | 'selepas-senja'
  dark?: boolean
}

const serif = "'Cormorant Variable', 'Cormorant', Georgia, serif"
const fraunces = "'Fraunces Variable', 'Fraunces', Georgia, serif"
const body = "'Figtree Variable', 'Figtree', system-ui, sans-serif"
const script = "'Dancing Script Variable', 'Dancing Script', cursive"
const hand = "'Caveat Variable', 'Caveat', cursive"
const playful = "'Playpen Sans Variable', 'Playpen Sans', 'Figtree Variable', sans-serif"
const grotesk = "'Bricolage Grotesque Variable', 'Bricolage Grotesque', 'Figtree Variable', sans-serif"

export const palettes: Record<ThemeId, Palette> = {
  kawung: {
    paper: '#f3ead8',
    surface: '#fbf6ec',
    ink: '#1f2a44',
    muted: '#5c6478',
    accent: '#b8893b',
    onAccent: '#fffaf0',
    second: '#8a5a3b',
    deep: '#1f2a44',
    onDeep: '#f6ecd6',
    line: '#d8c6a0',
    display: serif,
    body,
    script,
    swatches: [
      { hex: '#2b3a67', name: 'Nila' },
      { hex: '#efe4cc', name: 'Gading' },
      { hex: '#c49a45', name: 'Emas' },
      { hex: '#8a5a3b', name: 'Sogan' },
    ],
    song: 'gymnopedie',
  },
  sawah: {
    paper: '#eef4e1',
    surface: '#fffdf2',
    ink: '#23361f',
    muted: '#5b6e53',
    accent: '#e0793e',
    onAccent: '#fffdf2',
    second: '#f2c14e',
    deep: '#2f5d34',
    onDeep: '#f4f8e6',
    line: '#cbdab0',
    display: fraunces,
    body,
    script: hand,
    swatches: [
      { hex: '#a7c269', name: 'Padi' },
      { hex: '#9b6b43', name: 'Tanah' },
      { hex: '#9cc6e4', name: 'Langit' },
      { hex: '#f0a35e', name: 'Fajar' },
    ],
    song: 'thinking-of-you',
  },
  'kartu-pos': {
    paper: '#f5eee0',
    surface: '#fffaf0',
    ink: '#22303f',
    muted: '#66707c',
    accent: '#c8392f',
    onAccent: '#fffaf0',
    second: '#2a4f9c',
    deep: '#2a4f9c',
    onDeep: '#f5eee0',
    line: '#e2d3b8',
    display: fraunces,
    body,
    script: hand,
    swatches: [
      { hex: '#c8392f', name: 'Merah pos' },
      { hex: '#2a4f9c', name: 'Biru pos' },
      { hex: '#efe3cb', name: 'Kertas' },
      { hex: '#22303f', name: 'Tinta' },
    ],
    song: 'love-away',
  },
  'pasar-malam': {
    paper: '#171b3d',
    surface: '#242a5c',
    ink: '#fff4dc',
    muted: '#c7c2e8',
    accent: '#ffc94a',
    onAccent: '#1a1d40',
    second: '#ff6f61',
    deep: '#0f1231',
    onDeep: '#fff4dc',
    line: '#3b4282',
    display: grotesk,
    body,
    script: hand,
    swatches: [
      { hex: '#1d2250', name: 'Malam' },
      { hex: '#ffc94a', name: 'Lampu' },
      { hex: '#ff8fb1', name: 'Gulali' },
      { hex: '#ff6f61', name: 'Kembang api' },
    ],
    song: 'love-away',
    dark: true,
  },
  melati: {
    paper: '#f6f3ea',
    surface: '#fffdf6',
    ink: '#2e3a2f',
    muted: '#6c776a',
    accent: '#6f8d68',
    onAccent: '#fffdf6',
    second: '#c9b37e',
    deep: '#4a6146',
    onDeep: '#f6f3ea',
    line: '#dde2d0',
    display: serif,
    body,
    script,
    swatches: [
      { hex: '#9bb08f', name: 'Sage' },
      { hex: '#f2ecdc', name: 'Gading' },
      { hex: '#4a6146', name: 'Daun' },
      { hex: '#c9b37e', name: 'Kunyit' },
    ],
    song: 'selepas-senja',
  },
  kertas: {
    paper: '#fff7e9',
    surface: '#ffffff',
    ink: '#1e1d24',
    muted: '#5d5c68',
    accent: '#ff5a4e',
    onAccent: '#ffffff',
    second: '#2f6fde',
    deep: '#2f6fde',
    onDeep: '#ffffff',
    line: '#f0dfc2',
    display: playful,
    body,
    script: hand,
    swatches: [
      { hex: '#ff5a4e', name: 'Semangka' },
      { hex: '#2f6fde', name: 'Biru' },
      { hex: '#ffc83d', name: 'Pisang' },
      { hex: '#1fae8b', name: 'Pandan' },
    ],
    song: 'thinking-of-you',
  },
}

export const songs = {
  gymnopedie: { src: '/wedding/gymnopedie.mp3', title: 'Gymnopédie No. 1', artist: 'Erik Satie' },
  'thinking-of-you': { src: '/wedding/thinking-of-you.mp3', title: 'Thinking of You', artist: 'Kevin MacLeod' },
  'love-away': { src: '/wedding/love-away.mp3', title: "Can't Take Our Love Away", artist: 'Josh Woodward' },
  'selepas-senja': { src: '/wedding/selepas-senja.wav', title: 'Selepas Senja', artist: 'Hari Bersama' },
} as const
