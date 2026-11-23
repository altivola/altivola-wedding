import { Buffer } from 'node:buffer'
import type { Sql } from '@app/db'
import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { authed, pub } from './context.ts'
import { invitationMusic, musicSelection, resolveMusic } from './music.ts'
import {
  gardenCharacters,
  gardenMaps,
  maxScheduleItems,
  studioSections,
  type WeddingDesign,
  weddingFlows,
  weddingSections,
  weddingTemplates,
} from './wedding-design.ts'

const sectionStyle = z.object({
  title: z.string().max(120).optional(),
  eyebrow: z.string().max(100).optional(),
  lead: z.string().max(500).optional(),
  layout: z.enum(['stack', 'editorial', 'framed']).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  mobileAlign: z.enum(['left', 'center', 'right']).optional(),
  font: z.enum(['serif', 'sans', 'italic']).optional(),
  surface: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  ink: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  spacing: z.number().int().min(8).max(88).optional(),
  titleScale: z.number().int().min(65).max(160).optional(),
})

const designSchema: z.ZodType<WeddingDesign> = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  type: z.enum(['serif', 'sans', 'italic']),
  palette: z.enum(['template', 'cream', 'ink', 'rose']),
  cover: z.enum(['poster', 'frame', 'split']),
  sections: z
    .array(z.enum(weddingSections))
    .max(weddingSections.length)
    .refine(
      (sections) =>
        new Set(sections).size === sections.length && sections.includes('event') && sections.includes('rsvp'),
      'Sections must be unique and include the event and RSVP',
    ),
  note: z.string().max(2000),
  album: z.enum(['grid', 'filmstrip', 'stack']).optional(),
  template: z.enum(weddingTemplates).optional(),
  schedule: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        time: z.string().max(60),
        title: z.string().max(120),
        detail: z.string().max(280),
      }),
    )
    .max(maxScheduleItems)
    .optional(),
  flow: z.enum(weddingFlows).optional(),
  accent: z.enum(['gold', 'lavender', 'fern']).optional(),
  gardenMap: z.enum(gardenMaps).optional(),
  gardenCharacter: z.enum(gardenCharacters).optional(),
  sectionStyles: z.partialRecord(z.enum(studioSections), sectionStyle).optional(),
  sectionAlign: z.partialRecord(z.enum(weddingSections), z.enum(['left', 'center'])).optional(),
})

const uploadedPhoto = z.object({
  jpeg: z
    .string()
    .max(600_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
    .refine((encoded) => encoded.length % 4 === 0),
  caption: z.string().max(180),
  cover: z.boolean(),
  background: z.boolean().optional(),
})
const storedPhoto = z.object({
  id: z.uuid(),
  caption: z.string(),
  cover: z.boolean(),
  background: z.boolean().optional(),
})

const Content = z.object({
  names: z.string().trim().min(1).max(100),
  date: z.string().trim().min(1).max(120),
  venue: z.string().trim().min(1).max(200),
  story: z.string().trim().max(5000),
  theme: z.enum(weddingTemplates),
  design: designSchema.optional(),
  music: invitationMusic.optional(),
  photos: z.array(storedPhoto).max(9).optional(),
})

const GuestLink = z.object({ id: z.uuid(), name: z.string() })
const Recipient = z.object({ weddingId: z.uuid(), guestId: z.uuid() })
const GuestInvitation = z.object({ content: Content, name: z.string(), attending: z.boolean().nullable() })

export async function publishWedding(
  sql: Sql,
  content: z.infer<typeof Content>,
  names: string[],
  id = crypto.randomUUID(),
) {
  const guests = names.map((name) => ({ id: crypto.randomUUID(), name }))
  await sql.begin(async (tx) => {
    await tx`insert into weddings (id, content) values (${id}, ${tx.json(content)})`
    await tx`insert into wedding_guests ${tx(
      guests.map((guest) => ({ ...guest, wedding_id: id })),
      'id',
      'name',
      'wedding_id',
    )}`
  })
  return { id, guests }
}

export async function getInvitation(sql: Sql, weddingId: string, guestId: string) {
  const [invitation] = await sql<z.infer<typeof GuestInvitation>[]>`
    select w.content, g.name, g.attending
    from weddings w
    join wedding_guests g on g.wedding_id = w.id
    where w.id = ${weddingId} and g.id = ${guestId}
  `
  return invitation
}

export async function saveRsvp(sql: Sql, weddingId: string, guestId: string, attending: boolean) {
  const result = await sql`
    update wedding_guests set attending = ${attending}
    where wedding_id = ${weddingId} and id = ${guestId}
  `
  return result.count > 0
}

export const weddings = {
  publish: authed
    .route({ method: 'POST', path: '/weddings', summary: 'Publish an invitation' })
    .input(
      z.object({
        content: Content.omit({ photos: true, music: true }).extend({ music: musicSelection.optional() }),
        guests: z.array(z.string().trim().min(1).max(100)).min(1).max(500),
        photos: z
          .array(uploadedPhoto)
          .max(9)
          .refine(
            (items) =>
              items.filter((photo) => photo.cover).length <= 1 &&
              items.filter((photo) => photo.background).length <= 1 &&
              items.filter((photo) => !photo.background).length <= 8,
          )
          .optional(),
      }),
    )
    .output(z.object({ id: z.uuid(), guests: z.array(GuestLink) }))
    .handler(async ({ input, context }) => {
      const { music: selection, ...details } = input.content
      const music = await resolveMusic(selection)
      const content = { ...details, ...(music === undefined ? {} : { music }) }
      if (!input.photos?.length) return publishWedding(context.sql, content, input.guests)
      if (!context.media) throw new ORPCError('SERVICE_UNAVAILABLE')
      const media = context.media
      const id = crypto.randomUUID()
      const photos = input.photos.map(({ jpeg, caption, cover, background }) => {
        const bytes = Buffer.from(jpeg, 'base64')
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217)
          throw new ORPCError('BAD_REQUEST')
        return { photo: { id: crypto.randomUUID(), caption, cover, ...(background ? { background } : {}) }, bytes }
      })
      const keys: string[] = []
      try {
        for (const { photo, bytes } of photos) {
          const key = `${id}/${photo.id}`
          keys.push(key)
          await media.put(key, bytes)
        }
        return await publishWedding(
          context.sql,
          { ...content, photos: photos.map(({ photo }) => photo) },
          input.guests,
          id,
        )
      } catch (error) {
        await Promise.allSettled(keys.map((key) => media.remove(key)))
        throw error
      }
    }),

  read: pub
    .route({ method: 'GET', path: '/weddings/{weddingId}/guests/{guestId}', summary: 'Read a guest invitation' })
    .input(Recipient)
    .output(GuestInvitation)
    .handler(async ({ input, context }) => {
      const invitation = await getInvitation(context.sql, input.weddingId, input.guestId)
      if (!invitation) throw new ORPCError('NOT_FOUND')
      return invitation
    }),

  rsvp: pub
    .route({ method: 'POST', path: '/weddings/{weddingId}/guests/{guestId}/rsvp', summary: 'Save a guest RSVP' })
    .input(Recipient.extend({ attending: z.boolean() }))
    .output(z.object({ attending: z.boolean() }))
    .handler(async ({ input, context }) => {
      const saved = await saveRsvp(context.sql, input.weddingId, input.guestId, input.attending)
      if (!saved) throw new ORPCError('NOT_FOUND')
      return { attending: input.attending }
    }),
}
