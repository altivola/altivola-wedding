import { createSql, type Sql } from '@app/db'
import { applyMigrations } from '@app/db/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { defaultWeddingDesign } from '../src/wedding-design.ts'
import { getInvitation, publishWedding, saveRsvp } from '../src/weddings.ts'

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
