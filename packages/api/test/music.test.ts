import { afterEach, expect, test, vi } from 'vitest'
import { resolveMusic } from '../src/music.ts'

const id = '125441e3-78ab-4c5a-8d20-486039ec0769'
const track = {
  id,
  title: 'Example piano arrangement',
  creator: 'Artist',
  duration: 83_000,
  license: 'cc0',
  source: 'freesound',
  mature: false,
  url: 'https://cdn.freesound.org/previews/123/123456_125-hq.mp3',
  foreign_landing_url: 'https://freesound.org/people/Artist/sounds/123456',
}

afterEach(() => vi.unstubAllGlobals())

test.each([{ license: 'by-nc-nd' }, { mature: true }, { url: 'https://example.com/track.mp3' }, { duration: 1200 }])(
  'rejects a catalog recording outside the supported license or preview constraints',
  async (override) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ...track, ...override })),
    )
    await expect(resolveMusic({ kind: 'openverse', id })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  },
)

test('stores catalog metadata resolved by the server and allows muted and legacy invitations', async () => {
  const fetchCatalog = vi.fn(async () => Response.json(track))
  vi.stubGlobal('fetch', fetchCatalog)
  await expect(resolveMusic(undefined)).resolves.toBeUndefined()
  await expect(resolveMusic(null)).resolves.toBeNull()
  await expect(resolveMusic({ kind: 'original' })).resolves.toBeNull()
  await expect(resolveMusic({ kind: 'beranda' })).resolves.toBeNull()
  await expect(resolveMusic({ kind: 'apple', id: '918912463' })).resolves.toBeNull()
  await expect(resolveMusic({ kind: 'recording', id: 'gymnopedie' })).resolves.toEqual({
    kind: 'recording',
    id: 'gymnopedie',
  })
  expect(fetchCatalog).not.toHaveBeenCalled()
  await expect(resolveMusic({ kind: 'openverse', id })).resolves.toEqual({
    kind: 'openverse',
    id,
    title: track.title,
    artist: track.creator,
    seconds: 83,
    src: track.url,
    source: track.foreign_landing_url,
  })
  expect(fetchCatalog).toHaveBeenCalledWith(new URL(`https://api.openverse.org/v1/audio/${id}/`), expect.any(Object))
})
