import { createSql, type Sql } from '@app/db'
import { applyMigrations } from '@app/db/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { defaultWeddingDesign } from '../src/wedding-design.ts'
import {
  addWeddingGuests,
  checkInGuest,
  getInvitation,
  listWeddingDrafts,
  listWeddingGuests,
  publishOwnedWedding,
  publishWedding,
  readDraft,
  saveDraft,
  saveRsvp,
  saveWeddingReport,
} from '../src/weddings.ts'

let container: StartedPostgreSqlContainer
let sql: Sql

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18-alpine').start()
  sql = createSql(container.getConnectionUri())
  await applyMigrations(sql)
}, 120_000)

afterAll(async () => {
  await sql?.end()
  await container?.stop()
})

it('publishes different links for recipients and scopes RSVP to a single invitation', async () => {
  const content = {
    names: 'Aruna & Dimas',
    date: '14 Februari 2027',
    venue: 'Jakarta',
    story: 'Kami bertemu di toko buku.',
    theme: 'garden' as const,
  }
  const published = await publishWedding(sql, content, ['Nadia & Rizky', 'Ibu Ratna'])
  const other = await publishWedding(sql, content, ['Rani'])
  const [nadia, ratna] = published.guests
  if (!nadia || !ratna) throw new Error('Expected two guests')
  expect(nadia.id).not.toBe(ratna.id)
  expect(await getInvitation(sql, published.id, nadia.id)).toEqual({
    content,
    name: 'Nadia & Rizky',
    attending: null,
  })
  expect(await saveRsvp(sql, other.id, nadia.id, true)).toBe(false)
  expect(await saveRsvp(sql, published.id, nadia.id, true)).toBe(true)
  expect((await getInvitation(sql, published.id, nadia.id))?.attending).toBe(true)
  expect((await getInvitation(sql, published.id, ratna.id))?.attending).toBeNull()
})

it('preserves composition, coordinates, and section order in published content', async () => {
  const design = {
    ...defaultWeddingDesign,
    x: 26,
    y: 40,
    palette: 'rose' as const,
    cover: 'split' as const,
    sections: ['rsvp', 'note', 'event'] as const,
    note: 'Sampai ketemu!',
  }
  const content = {
    names: 'Rani & Rama',
    date: '21 Desember 2026',
    venue: 'Bogor',
    story: '',
    theme: 'night' as const,
    design: { ...design, sections: [...design.sections] },
  }
  const published = await publishWedding(sql, content, ['Keluarga Ratna'])
  const guest = published.guests[0]
  if (!guest) throw new Error('Expected a guest')
  expect((await getInvitation(sql, published.id, guest.id))?.content).toEqual(content)
})

it('keeps drafts owner-scoped and preserves guest links and RSVPs when republishing', async () => {
  const owner = crypto.randomUUID()
  const otherOwner = crypto.randomUUID()
  await sql`insert into "user" (id, name, email, "emailVerified") values
    (${owner}, 'Owner', ${`${owner}@example.test`}, true),
    (${otherOwner}, 'Other', ${`${otherOwner}@example.test`}, true)`

  const draftId = crypto.randomUUID()
  const content = {
    names: 'Aruna & Dimas',
    date: '14 Februari 2027',
    venue: 'Jakarta',
    story: '',
    theme: 'garden' as const,
    design: {
      ...defaultWeddingDesign,
      frame: 'double' as const,
      schedule: [
        { id: 'akad', time: '', title: 'Akad', detail: '', date: '2027-02-14', startsAt: '09:00', venue: 'Bogor' },
      ],
    },
  }
  const draft = { ...content, guests: 'Nadia', photos: [] }
  expect(await saveDraft(sql, owner, draftId, draft)).toEqual({ id: draftId })
  expect(await readDraft(sql, otherOwner, draftId)).toBeUndefined()
  expect(await saveDraft(sql, otherOwner, draftId, { ...draft, names: 'Changed' })).toBeUndefined()
  expect(await readDraft(sql, owner, draftId)).toEqual({ data: draft, weddingId: null })
  expect(await listWeddingDrafts(sql, owner)).toEqual([{ id: draftId, name: content.names, weddingId: null }])
  expect(await listWeddingDrafts(sql, otherOwner)).toEqual([])
  const report = await saveWeddingReport(sql, owner, '/studio/overview', 'The sample image did not load.')
  expect(await sql`select owner_id, page from wedding_issue_reports where id = ${report?.id ?? null}`).toEqual([
    { owner_id: owner, page: '/studio/overview' },
  ])

  const published = await publishOwnedWedding(sql, owner, crypto.randomUUID(), content, ['Nadia'], draftId)
  const guestId = published.guests[0]?.id
  if (!guestId) throw new Error('Expected the published guest')
  expect(await saveRsvp(sql, published.id, guestId, true)).toBe(true)
  expect(await listWeddingGuests(sql, otherOwner, published.id)).toBeUndefined()
  expect(await addWeddingGuests(sql, otherOwner, published.id, [{ name: 'A', phone: '', email: '' }])).toBeUndefined()
  expect(await checkInGuest(sql, otherOwner, published.id, guestId, 'ceremony')).toBeUndefined()

  const contacts = [
    { name: 'nadia', phone: '', email: '' },
    { name: 'Rani', phone: '08123456', email: 'rani@example.test' },
    { name: 'Rani', phone: '08123456', email: 'rani@example.test' },
  ]
  expect(await addWeddingGuests(sql, owner, published.id, contacts)).toEqual({ added: 1 })
  expect(await addWeddingGuests(sql, owner, published.id, contacts)).toEqual({ added: 0 })

  const ceremony = await checkInGuest(sql, owner, published.id, guestId, 'ceremony')
  expect(ceremony?.checkedAt).toBeTruthy()
  expect(await checkInGuest(sql, owner, published.id, guestId, 'ceremony')).toEqual(ceremony)
  const reception = await checkInGuest(sql, owner, published.id, guestId, 'reception')
  expect(reception?.checkedAt).toBeTruthy()
  expect((await listWeddingGuests(sql, owner, published.id))?.guests).toEqual([
    expect.objectContaining({
      id: guestId,
      attending: true,
      ceremony: ceremony?.checkedAt,
      reception: reception?.checkedAt,
    }),
    expect.objectContaining({ name: 'Rani', phone: '08123456', attending: null, ceremony: null, reception: null }),
  ])

  const updated = await publishOwnedWedding(
    sql,
    owner,
    crypto.randomUUID(),
    { ...content, venue: 'Bandung' },
    [],
    draftId,
  )
  expect(updated.id).toBe(published.id)
  expect((await readDraft(sql, owner, draftId))?.weddingId).toBe(published.id)
  expect(await getInvitation(sql, updated.id, guestId)).toEqual({
    content: { ...content, venue: 'Bandung' },
    name: 'Nadia',
    attending: true,
  })
  expect(updated.guests).toHaveLength(2)
})
