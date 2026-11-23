import type { GardenCharacter, GardenMap } from '@app/api/wedding-design'

export const gardenMapNames: Record<GardenMap, string> = {
  twilight: 'Selepas Senja',
  ponds: 'Pulau Teratai',
  orchard: 'Kebun Bunga',
  city: 'Atap Kota',
  shore: 'Dermaga Purnama',
}

export const gardenCharacterNames: Record<GardenCharacter, string> = {
  lantern: 'Penjaga Lentera',
  hare: 'Kelinci Awan',
  cat: 'Kucing Senja',
}
