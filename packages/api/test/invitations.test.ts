import { createSql, type Sql } from '@app/db'
import { applyMigrations } from '@app/db/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { newInvitation, sampleInvitation } from '../src/invitation-model.ts'
import {
  addGuests,
  addMedia,
  addShot,
  addStrip,
  addWalkIn,
  addWish,
  cameraStats,
  checkIn,
  claimInvitation,
  createInvitation,
  findEditable,
  listGuests,
  listInvitations,
  listShots,
  listStrips,
  listWishes,
  pruneMedia,
  publishInvitation,
  readMedia,
  readPublic,
  removeExpiredDrafts,
  removeGuests,
  saveInvitationDraft,
  saveRsvp,
  setGuestEvents,
  slugAvailable,
  startRoll,
  undoCheckIn,
  updateGuest,
} from '../src/invitations.ts'
import type { WeddingMedia } from '../src/wedding-media.ts'

let container: StartedPostgreSqlContainer
let sql: Sql
const files = new Map<string, Uint8Array>()
const media: WeddingMedia = {
  async put(key, bytes) {
    files.set(key, bytes)
  },
  async get(key) {
    return (files.get(key) as Uint8Array<ArrayBuffer> | undefined) ?? null
  },
  async remove(key) {
    files.delete(key)
  },
}
const jpeg = Buffer.from([255, 216, 1, 2, 3, 255, 217]).toString('base64')

async function user(id: string) {
  await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (${id}, ${id}, ${`${id}@example.com`}, true, now(), now())`
  return id
}

async function sha(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Buffer.from(digest).toString('hex')
}

async function publishedSample(owner: string, slug: string) {
  const { id } = await createInvitation(sql, sampleInvitation('kawung'), owner)
  await publishInvitation(sql, id, owner, slug)
  return id
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18-alpine').start()
  sql = createSql(container.getConnectionUri())
  await applyMigrations(sql)
}, 120_000)

afterAll(async () => {
  await sql?.end()
  await container?.stop()
})

it('lets an anonymous draft be edited with its token and kept after sign in', async () => {
  const doc = newInvitation({ theme: 'sawah', lang: 'id', bride: 'Sekar', groom: 'Bima' })
  const { id, token } = await createInvitation(sql, doc, null)
  if (!token) throw new Error('Expected a draft token')
  const tokenHash = await sha(token)
  expect(await findEditable(sql, id, { userId: null, tokenHash: 'wrong' })).toBeUndefined()
  const row = await findEditable(sql, id, { userId: null, tokenHash })
  expect(row?.draft.names).toEqual({ bride: 'Sekar', groom: 'Bima' })
  expect(row?.ownerId).toBeNull()

  const changed = { ...doc, values: { 'opening.place': 'Ubud, Bali' } }
  expect(await saveInvitationDraft(sql, id, { userId: null, tokenHash }, changed)).toBe(true)

  const owner = await user('claimer')
  expect(await claimInvitation(sql, id, 'wrong', owner)).toBe(false)
  expect(await claimInvitation(sql, id, tokenHash, owner)).toBe(true)
  expect(await findEditable(sql, id, { userId: null, tokenHash })).toBeUndefined()
  const claimed = await findEditable(sql, id, { userId: owner, tokenHash: null })
  expect(claimed?.draft.values['opening.place']).toBe('Ubud, Bali')
  expect(await findEditable(sql, id, { userId: await user('stranger'), tokenHash: null })).toBeUndefined()
  const [summary] = await listInvitations(sql, owner)
  expect(summary).toMatchObject({ id, bride: 'Sekar', groom: 'Bima', theme: 'sawah', slug: null, guests: 0 })
})

it('removes unclaimed drafts after three days with their media', async () => {
  const { id } = await createInvitation(sql, sampleInvitation('kertas'), null)
  const mediaId = await addMedia(sql, media, id, 'photo', jpeg)
  expect(files.has(`m/${mediaId}`)).toBe(true)
  expect(await removeExpiredDrafts(sql, media)).toBe(0)
  await sql`update invitations set created_at = now() - interval '4 days' where id = ${id}`
  expect(await removeExpiredDrafts(sql, media)).toBe(1)
  expect(files.has(`m/${mediaId}`)).toBe(false)
  expect(await readMedia(sql, mediaId)).toBeUndefined()
})

it('publishes under a unique address and refuses incomplete invitations', async () => {
  const owner = await user('publisher')
  const empty = await createInvitation(
    sql,
    newInvitation({ theme: 'kawung', lang: 'id', bride: 'A', groom: 'B' }),
    owner,
  )
  await expect(publishInvitation(sql, empty.id, owner, 'tanpa-acara')).rejects.toThrow(/acara/)

  const id = await publishedSample(owner, 'sekar-bima')
  expect(await slugAvailable(sql, 'sekar-bima')).toBe(false)
  expect(await slugAvailable(sql, 'sekar-bima', id)).toBe(true)
  expect(await slugAvailable(sql, 'studio')).toBe(false)
  const other = await createInvitation(sql, sampleInvitation('melati'), owner)
  await expect(publishInvitation(sql, other.id, owner, 'sekar-bima')).rejects.toThrow(/sudah dipakai/)

  const live = await readPublic(sql, 'sekar-bima')
  expect(live?.doc.theme).toBe('kawung')
  expect(live?.guest).toBeNull()
  expect(live?.booth.open).toBe('now')
  expect(live?.camera).toEqual({ open: 'now', film: 'senja', shots: 24, revealed: false })
})

it('keeps guests unique, scopes their events and records replies and check-ins', async () => {
  const owner = await user('host')
  const id = await publishedSample(owner, 'tamu-test')
  const result = await addGuests(sql, id, [
    { name: 'Tante Rina', phone: '0812', email: '', label: 'Keluarga', events: null, seats: 4 },
    { name: 'Dika', phone: '', email: 'dika@example.com', label: 'Kantor', events: ['resepsi'], seats: 1 },
    { name: 'tante rina', phone: '0812', email: '', label: '', events: null, seats: 2 },
  ])
  expect(result).toEqual({ added: 2, skipped: 1 })
  const guests = await listGuests(sql, id)
  expect(guests.map((guest) => guest.name)).toEqual(['Dika', 'Tante Rina'])
  const [dika, rina] = guests
  if (!dika || !rina) throw new Error('Expected two guests')
  expect(dika.events).toEqual(['resepsi'])
  expect(dika.code).toMatch(/^[a-z0-9]{6}$/)

  const view = await readPublic(sql, 'tamu-test', dika.code)
  expect(view?.guest).toEqual({
    code: dika.code,
    name: 'Dika',
    events: ['resepsi'],
    seats: 1,
    attending: null,
    party: null,
  })
  expect(await saveRsvp(sql, 'tamu-test', dika.code, true, 3)).toBeUndefined()
  expect(await saveRsvp(sql, 'tamu-test', dika.code, true, 1)).toEqual({ attending: true, party: 1 })
  expect(await saveRsvp(sql, 'other-slug', rina.code, true, 1)).toBeUndefined()

  expect(await setGuestEvents(sql, id, [dika.id, rina.id], ['akad'])).toBe(2)
  const updated = await updateGuest(sql, id, rina.id, { ...rina, name: 'Tante Rina Wati', events: null })
  expect(updated).toMatchObject({ name: 'Tante Rina Wati', events: null, seats: 4 })

  const checked = await checkIn(sql, id, rina.code, 3)
  expect(checked?.checkedInParty).toBe(3)
  expect(checked?.checkedInAt).not.toBeNull()
  expect(await checkIn(sql, crypto.randomUUID(), rina.code, 1)).toBeUndefined()
  expect((await undoCheckIn(sql, id, rina.code))?.checkedInAt).toBeNull()
  const walkIn = await addWalkIn(sql, id, 'Pak RT', 2)
  expect(walkIn).toMatchObject({ name: 'Pak RT', walkIn: true, checkedInParty: 2 })

  const [summary] = (await listInvitations(sql, owner)).filter((item) => item.id === id)
  expect(summary).toMatchObject({ guests: 2, attending: 1, slug: 'tamu-test' })
  expect(await removeGuests(sql, id, [dika.id])).toBe(1)
  expect((await listGuests(sql, id)).map((guest) => guest.name)).toEqual(['Tante Rina Wati', 'Pak RT'])
})

it('stores wishes under the guest name for personal links', async () => {
  const owner = await user('wisher')
  const id = await publishedSample(owner, 'ucapan-test')
  await addGuests(sql, id, [{ name: 'Om Hendra', phone: '', email: '', label: '', events: null, seats: 2 }])
  const [guest] = await listGuests(sql, id)
  const personal = await addWish(sql, 'ucapan-test', { code: guest?.code, name: 'Someone else', message: 'Selamat!' })
  const open = await addWish(sql, 'ucapan-test', { name: 'Grup kantor', message: 'Bahagia selalu' })
  expect(personal?.name).toBe('Om Hendra')
  expect(open?.name).toBe('Grup kantor')
  await sql`update invitation_wishes set hidden = true where id = ${open?.id ?? ''}`
  expect((await listWishes(sql, id, false)).map((wish) => wish.name)).toEqual(['Om Hendra'])
  expect(await listWishes(sql, id, true)).toHaveLength(2)
  await expect(addWish(sql, 'missing-slug', { name: 'X', message: 'Hai' })).rejects.toThrow()
})

it('fills the booth album and keeps camera rolls to their shot count', async () => {
  const owner = await user('booth-host')
  const id = await publishedSample(owner, 'booth-test')
  const strip = await addStrip(sql, media, 'booth-test', { name: 'Nadia', layout: 'strip', frame: 'kawung', jpeg })
  expect(strip?.guestName).toBe('Nadia')
  expect((await listStrips(sql, id)).map((item) => item.id)).toEqual([strip?.id])

  await sql`update invitations set camera = ${sql.json({ shots: 3 })} where id = ${id}`
  const roll = await startRoll(sql, 'booth-test', 'Rizky')
  expect(roll).toMatchObject({ film: 'senja', left: 3 })
  expect(await addShot(sql, media, 'booth-test', roll.rollId, jpeg)).toEqual({ left: 2 })
  await addShot(sql, media, 'booth-test', roll.rollId, jpeg)
  await addShot(sql, media, 'booth-test', roll.rollId, jpeg)
  await expect(addShot(sql, media, 'booth-test', roll.rollId, jpeg)).rejects.toThrow(/habis/)
  expect(await cameraStats(sql, id)).toEqual({ rolls: 1, shots: 3 })
  const shots = await listShots(sql, id)
  expect(shots).toHaveLength(3)
  expect(shots[0]).toMatchObject({ guestName: 'Rizky', film: 'senja' })

  await sql`update invitations set booth = ${sql.json({ open: 'closed' })} where id = ${id}`
  await expect(addStrip(sql, media, 'booth-test', { name: 'X', layout: 'strip', frame: 'a', jpeg })).rejects.toThrow(
    /belum buka/,
  )
})

it('prunes uploads that no version of the invitation uses', async () => {
  const owner = await user('pruner')
  const { id } = await createInvitation(sql, sampleInvitation('pasar-malam'), owner)
  const used = await addMedia(sql, media, id, 'photo', jpeg)
  const unused = await addMedia(sql, media, id, 'photo', jpeg)
  const row = await findEditable(sql, id, { userId: owner, tokenHash: null })
  if (!row) throw new Error('Expected the invitation')
  await saveInvitationDraft(sql, id, { userId: owner, tokenHash: null }, { ...row.draft, gallery: [used] })
  await sql`update invitation_media set created_at = now() - interval '2 hours' where invitation_id = ${id}`
  expect(await pruneMedia(sql, media, id)).toBe(1)
  expect(await readMedia(sql, used)).toEqual({ contentType: 'image/jpeg' })
  expect(await readMedia(sql, unused)).toBeUndefined()
  expect(files.has(`m/${unused}`)).toBe(false)
})
