import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { authed } from './context.ts'

export const catalogTrack = z.object({
  kind: z.literal('openverse'),
  id: z.uuid(),
  title: z.string().min(1).max(180),
  artist: z.string().max(140),
  seconds: z.number().int().positive(),
  src: z.url(),
  source: z.url(),
})

const retiredMusic = z.object({ kind: z.enum(['original', 'beranda']) })
const retiredAppleSelection = z.object({ kind: z.literal('apple'), id: z.string().regex(/^\d{1,14}$/) })
const retiredApple = retiredAppleSelection.extend({
  title: z.string(),
  artist: z.string(),
  albumId: z.string().regex(/^\d{1,14}$/),
})
export const recordingMusic = z.object({
  kind: z.literal('recording'),
  id: z.enum(['gymnopedie', 'thinking-of-you', 'love-away']),
})
export const invitationMusic = z
  .discriminatedUnion('kind', [retiredMusic, retiredApple, recordingMusic, catalogTrack])
  .nullable()
export const musicSelection = z
  .discriminatedUnion('kind', [
    retiredMusic,
    retiredAppleSelection,
    recordingMusic,
    z.object({ kind: z.literal('openverse'), id: z.uuid() }),
  ])
  .nullable()
export type CatalogTrack = z.infer<typeof catalogTrack>
export type InvitationMusic = z.infer<typeof invitationMusic>

const openverseTrack = z.object({
  id: z.uuid(),
  title: z.string(),
  creator: z.string().nullable(),
  duration: z.number().min(20_000).max(900_000),
  license: z.literal('cc0'),
  source: z.literal('freesound'),
  mature: z.literal(false),
  url: z.url(),
  foreign_landing_url: z.url(),
})
const openverse = 'https://api.openverse.org/v1/audio/'
const cacheMax = 80
const cacheLifetime = 10 * 60 * 1000
const tracks = new Map<string, { value: CatalogTrack; expires: number }>()

function toCatalogTrack(input: unknown): CatalogTrack | null {
  const item = openverseTrack.safeParse(input)
  if (!item.success) return null
  const { data } = item
  const file = new URL(data.url)
  const source = new URL(data.foreign_landing_url)
  if (
    file.origin !== 'https://cdn.freesound.org' ||
    !file.pathname.startsWith('/previews/') ||
    !file.pathname.endsWith('.mp3') ||
    source.origin !== 'https://freesound.org' ||
    !source.pathname.startsWith('/people/')
  ) {
    return null
  }
  const title = data.title.trim().slice(0, 180)
  if (!title) return null
  const track: CatalogTrack = {
    kind: 'openverse',
    id: data.id,
    title,
    artist: (data.creator ?? '').trim().slice(0, 140),
    seconds: Math.round(data.duration / 1000),
    src: file.href,
    source: source.href,
  }
  tracks.delete(track.id)
  if (tracks.size >= cacheMax) {
    const first = tracks.keys().next().value
    if (first !== undefined) tracks.delete(first)
  }
  tracks.set(track.id, { value: track, expires: Date.now() + cacheLifetime })
  return track
}

async function fetchCatalog(url: URL) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6500), redirect: 'error' })
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

export async function resolveMusic(choice: z.infer<typeof musicSelection> | undefined) {
  if (choice?.kind === 'apple' || choice?.kind === 'original' || choice?.kind === 'beranda') return null
  if (choice?.kind !== 'openverse') return choice
  const cached = tracks.get(choice.id)
  if (cached && cached.expires > Date.now()) return cached.value
  const track = toCatalogTrack(await fetchCatalog(new URL(`${choice.id}/`, openverse)))
  if (!track || track.id !== choice.id) {
    throw new ORPCError('BAD_REQUEST', { message: 'The selected song is unavailable' })
  }
  return track
}

export const music = {
  search: authed
    .route({ method: 'GET', path: '/music', summary: 'Search for CC0 background music' })
    .input(z.object({ q: z.string().trim().min(2).max(100) }))
    .output(z.array(catalogTrack))
    .handler(async ({ input }) => {
      const url = new URL(openverse)
      url.search = new URLSearchParams({ q: input.q, license: 'cc0', source: 'freesound', page_size: '20' }).toString()
      const result = z.object({ results: z.array(z.unknown()) }).safeParse(await fetchCatalog(url))
      if (!result.success) throw new ORPCError('SERVICE_UNAVAILABLE')
      return result.data.results
        .map(toCatalogTrack)
        .filter((track) => track !== null)
        .slice(0, 12)
    }),
}
