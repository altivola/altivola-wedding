import type { ThemeId } from '@app/api/invitation-model'
import { kartuPos } from './kartu-pos'
import { kawung } from './kawung'
import { kertas } from './kertas'
import { melati } from './melati'
import { pasarMalam } from './pasar-malam'
import { sawah } from './sawah'
import type { ThemeArt } from './types'

export const themeArt: Record<ThemeId, ThemeArt> = {
  kawung,
  sawah,
  'kartu-pos': kartuPos,
  'pasar-malam': pasarMalam,
  melati,
  kertas,
}

export type { ThemeArt } from './types'
