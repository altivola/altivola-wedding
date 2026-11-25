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
  weddingDecorations,
  weddingDividers,
  weddingFlows,
  weddingFrames,
  weddingSections,
  weddingTemplates,
} from './wedding-design.ts'

const webLink = z.url({ protocol: /^https?$/ }).max(600)
const optionalLink = z.union([webLink, z.literal('')]).optional()
const dateField = z.union([z.iso.date(), z.literal('')]).optional()
const timeField = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal('')]).optional()

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
        date: dateField,
        startsAt: timeField,
        endsAt: timeField,
        venue: z.string().max(200).optional(),
        maps: optionalLink,
      }),
    )
    .max(maxScheduleItems)
    .optional(),
  frame: z.enum(weddingFrames).optional(),
  divider: z.enum(weddingDividers).optional(),
  decoration: z.enum(weddingDecorations).optional(),
  extras: z
    .object({
      partners: z
        .array(z.object({ name: z.string().max(100), parents: z.string().max(180) }))
        .max(2)
        .optional(),
      milestones: z
        .array(
          z.object({
            id: z.uuid(),
            date: z.union([z.iso.date(), z.literal('')]),
            title: z.string().max(120),
            location: z.string().max(160),
            story: z.string().max(500),
          }),
        )
        .max(8)
        .optional(),
      quote: z.string().max(500).optional(),
      livestream: optionalLink,
      gifts: z
        .array(z.object({ id: z.uuid(), label: z.string().max(80), account: z.string().max(120) }))
        .max(5)
        .optional(),
    })
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
  profileBackground: z.boolean().optional(),
})
const storedPhoto = z.object({
  id: z.uuid(),
  caption: z.string(),
  cover: z.boolean(),
  background: z.boolean().optional(),
  profileBackground: z.boolean().optional(),
})

const audioInfo = z.object({
  title: z.string().max(120),
  start: z.number().finite().min(0).max(3600),
  end: z.number().finite().positive().max(3600).optional(),
})
const customAudio = audioInfo
  .extend({
    mp3: z
      .string()
      .max(1_850_000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .refine(({ start, end }) => end === undefined || end > start, 'End must follow start')
const uploadPhotos = z
  .array(uploadedPhoto)
  .max(10)
  .refine(
    (items) =>
      items.filter((item) => item.cover).length <= 1 &&
      items.filter((item) => item.background).length <= 1 &&
      items.filter((item) => item.profileBackground).length <= 1 &&
      items.filter((item) => !item.background && !item.profileBackground).length <= 8,
  )

const Content = z.object({
  names: z.string().trim().min(1).max(100),
  date: z.string().trim().min(1).max(120),
  venue: z.string().trim().min(1).max(200),
  story: z.string().trim().max(5000),
  theme: z.enum(weddingTemplates),
  design: designSchema.optional(),
  music: invitationMusic.optional(),
  photos: z.array(storedPhoto).max(10).optional(),
  audio: audioInfo.extend({ id: z.uuid() }).optional(),
})

const GuestLink = z.object({ id: z.uuid(), name: z.string() })
const guestDetails = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).default(''),
  email: z.string().trim().max(180).default(''),
})
const guestRow = GuestLink.extend({
  phone: z.string(),
  email: z.string(),
  attending: z.boolean().nullable(),
  ceremony: z.string().nullable(),
  reception: z.string().nullable(),
})
const publishContent = Content.omit({ photos: true, music: true, audio: true }).extend({
  music: musicSelection.optional(),
})
const draftData = Content.omit({ audio: true, photos: true }).extend({
  names: z.string().max(100),
  date: z.string().max(120),
  venue: z.string().max(200),
  guests: z.string().max(51_000),
  photos: uploadPhotos,
  audio: customAudio.optional(),
})
type DraftData = z.infer<typeof draftData>
type GuestDetails = z.infer<typeof guestDetails>
type PublishedContent = z.infer<typeof Content>
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

export async function saveDraft(sql: Sql, owner: string, id: string, data: DraftData) {
  const [draft] = await sql<{ id: string }[]>`
    insert into wedding_drafts (id, owner_id, data) values (${id}, ${owner}, ${sql.json(data)})
    on conflict (id) do update set data = excluded.data, updated_at = now()
    where wedding_drafts.owner_id = excluded.owner_id returning id
  `
  return draft
}

export async function readDraft(sql: Sql, owner: string, id: string) {
  const [draft] = await sql<{ data: DraftData; weddingId: string | null }[]>`
    select data, wedding_id as "weddingId" from wedding_drafts where id = ${id} and owner_id = ${owner}
  `
  return draft
}

export async function listWeddingDrafts(sql: Sql, owner: string) {
  const drafts = await sql<{ id: string; name: string; weddingId: string | null }[]>`
    select id, data->>'names' as name, wedding_id as "weddingId"
    from wedding_drafts where owner_id = ${owner} order by updated_at desc
  `
  return [...drafts]
}

export async function saveWeddingReport(sql: Sql, owner: string, page: string, message: string) {
  const [report] = await sql<{ id: string }[]>`
    insert into wedding_issue_reports (owner_id, page, message)
    values (${owner}, ${page}, ${message}) returning id
  `
  return report
}

function uniqueGuests(guests: GuestDetails[]) {
  const seen = new Set<string>()
  return guests.filter(({ name, phone, email }) => {
    const key = [name, phone, email].map((value) => value.toLowerCase()).join('\u0000')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function addWeddingGuests(sql: Sql, owner: string, id: string, guests: GuestDetails[]) {
  const incoming = uniqueGuests(guests)
  return sql.begin(async (tx) => {
    const [wedding] = await tx`select 1 from weddings where id = ${id} and owner_id = ${owner} for update`
    if (!wedding) return undefined
    const [count] = await tx<{ total: number }[]>`
      select count(*)::int as total from wedding_guests where wedding_id = ${id}
    `
    const added = await tx<{ id: string }[]>`
      insert into wedding_guests (id, wedding_id, name, phone, email)
      select gen_random_uuid(), ${id}, incoming.name, incoming.phone, incoming.email
      from jsonb_to_recordset(${tx.json(incoming)}) as incoming(name text, phone text, email text)
      where not exists (
        select 1 from wedding_guests existing where existing.wedding_id = ${id}
        and lower(existing.name) = lower(incoming.name)
        and lower(existing.phone) = lower(incoming.phone)
        and lower(existing.email) = lower(incoming.email)
      )
      limit ${Math.max(0, 500 - (count?.total ?? 0))}
      returning id
    `
    return { added: added.length }
  })
}

export async function listWeddingGuests(sql: Sql, owner: string, id: string) {
  const [wedding] = await sql<{ name: string }[]>`
    select content->>'names' as name from weddings where id = ${id} and owner_id = ${owner}
  `
  if (!wedding) return undefined
  const guests = await sql<z.infer<typeof guestRow>[]>`
    select g.id, g.name, g.phone, g.email, g.attending,
      g.ceremony_check_in::text as ceremony, g.reception_check_in::text as reception
    from wedding_guests g join weddings w on w.id = g.wedding_id
    where w.id = ${id} and w.owner_id = ${owner}
    order by lower(g.name), g.id
  `
  return { name: wedding.name, guests: [...guests] }
}

export async function checkInGuest(
  sql: Sql,
  owner: string,
  weddingId: string,
  guestId: string,
  session: 'ceremony' | 'reception',
) {
  const column = session === 'ceremony' ? sql('ceremony_check_in') : sql('reception_check_in')
  const [guest] = await sql<{ checkedAt: string }[]>`
    update wedding_guests g set ${column} = coalesce(g.${column}, now())
    from weddings w where w.id = g.wedding_id and w.owner_id = ${owner}
      and g.wedding_id = ${weddingId} and g.id = ${guestId}
    returning g.${column}::text as "checkedAt"
  `
  return guest
}

export async function publishOwnedWedding(
  sql: Sql,
  owner: string,
  id: string,
  content: PublishedContent,
  names: string[],
  draftId?: string,
) {
  return sql.begin(async (tx) => {
    const draft = draftId
      ? (
          await tx<{ weddingId: string | null }[]>`
          select wedding_id as "weddingId" from wedding_drafts
          where id = ${draftId} and owner_id = ${owner} for update
        `
        )[0]
      : undefined
    if (draftId && !draft) throw new ORPCError('NOT_FOUND')
    const weddingId = draft?.weddingId ?? id
    let previous: PublishedContent | undefined
    if (draft?.weddingId) {
      const [wedding] =
        await tx`select content from weddings where id = ${weddingId} and owner_id = ${owner} for update`
      previous = wedding?.content as PublishedContent | undefined
      const result = await tx`update weddings set content = ${tx.json(content)}
        where id = ${weddingId} and owner_id = ${owner}`
      if (!result.count) throw new ORPCError('NOT_FOUND')
    } else {
      await tx`insert into weddings (id, owner_id, content) values (${id}, ${owner}, ${tx.json(content)})`
      if (draftId) {
        await tx`update wedding_drafts set wedding_id = ${id} where id = ${draftId} and owner_id = ${owner}`
      }
      if (names.length) {
        await tx`insert into wedding_guests ${tx(
          names.map((name) => ({ id: crypto.randomUUID(), name, wedding_id: id })),
          'id',
          'name',
          'wedding_id',
        )}`
      }
    }
    const guests = await tx<z.infer<typeof GuestLink>[]>`
      select g.id, g.name from wedding_guests g join weddings w on w.id = g.wedding_id
      where w.id = ${weddingId} and w.owner_id = ${owner} order by lower(g.name), g.id
    `
    return { id: weddingId, guests: [...guests], previous }
  })
}

export const weddings = {
  drafts: authed
    .route({ method: 'GET', path: '/weddings/drafts', summary: 'List your invitation drafts' })
    .output(z.array(z.object({ id: z.uuid(), name: z.string(), weddingId: z.uuid().nullable() })))
    .handler(({ context }) => listWeddingDrafts(context.sql, context.user.id)),
  saveDraft: authed
    .route({ method: 'PUT', path: '/weddings/drafts/{id}', summary: 'Save your invitation draft' })
    .input(z.object({ id: z.uuid(), data: draftData }))
    .output(z.object({ id: z.uuid() }))
    .handler(async ({ input, context }) => {
      const draft = await saveDraft(context.sql, context.user.id, input.id, input.data)
      if (!draft) throw new ORPCError('NOT_FOUND')
      return draft
    }),
  draft: authed
    .route({ method: 'GET', path: '/weddings/drafts/{id}', summary: 'Read your invitation draft' })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ data: draftData, weddingId: z.uuid().nullable() }))
    .handler(async ({ input, context }) => {
      const draft = await readDraft(context.sql, context.user.id, input.id)
      if (!draft) throw new ORPCError('NOT_FOUND')
      return draft
    }),
  guests: authed
    .route({ method: 'GET', path: '/weddings/{id}/guests', summary: 'List guests for your invitation' })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ name: z.string(), guests: z.array(guestRow) }))
    .handler(async ({ input, context }) => {
      const result = await listWeddingGuests(context.sql, context.user.id, input.id)
      if (!result) throw new ORPCError('NOT_FOUND')
      return result
    }),
  addGuests: authed
    .route({ method: 'POST', path: '/weddings/{id}/guests', summary: 'Add guests to your invitation' })
    .input(z.object({ id: z.uuid(), guests: z.array(guestDetails).min(1).max(500) }))
    .output(z.object({ added: z.number().int() }))
    .handler(async ({ input, context }) => {
      const result = await addWeddingGuests(context.sql, context.user.id, input.id, input.guests)
      if (!result) throw new ORPCError('NOT_FOUND')
      return result
    }),
  checkIn: authed
    .route({ method: 'POST', path: '/weddings/{weddingId}/guests/{guestId}/check-in', summary: 'Check in a guest' })
    .input(Recipient.extend({ session: z.enum(['ceremony', 'reception']) }))
    .output(z.object({ checkedAt: z.string() }))
    .handler(async ({ input, context }) => {
      const result = await checkInGuest(context.sql, context.user.id, input.weddingId, input.guestId, input.session)
      if (!result) throw new ORPCError('NOT_FOUND')
      return result
    }),
  report: authed
    .route({ method: 'POST', path: '/weddings/reports', summary: 'Report an issue in the wedding studio' })
    .input(z.object({ page: z.string().trim().min(1).max(220), message: z.string().trim().min(6).max(2000) }))
    .output(z.object({ id: z.uuid() }))
    .handler(async ({ input, context }) => {
      const report = await saveWeddingReport(context.sql, context.user.id, input.page, input.message)
      if (!report) throw new ORPCError('INTERNAL_SERVER_ERROR')
      return report
    }),
  publish: authed
    .route({ method: 'POST', path: '/weddings', summary: 'Publish an invitation' })
    .input(
      z.object({
        content: publishContent,
        guests: z.array(z.string().trim().min(1).max(100)).max(500),
        draftId: z.uuid().optional(),
        photos: uploadPhotos.optional(),
        audio: customAudio.optional(),
      }),
    )
    .output(z.object({ id: z.uuid(), guests: z.array(GuestLink) }))
    .handler(async ({ input, context }) => {
      if (!input.draftId && !input.guests.length) throw new ORPCError('BAD_REQUEST')
      if (input.draftId && !(await readDraft(context.sql, context.user.id, input.draftId))) {
        throw new ORPCError('NOT_FOUND')
      }
      const { music: selection, ...details } = input.content
      const music = await resolveMusic(selection)
      const id = crypto.randomUUID()
      const media = context.media
      const photos = (input.photos ?? []).map(({ jpeg, caption, cover, background, profileBackground }) => {
        const bytes = Buffer.from(jpeg, 'base64')
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217)
          throw new ORPCError('BAD_REQUEST')
        return { photo: { id: crypto.randomUUID(), caption, cover, background, profileBackground }, bytes }
      })
      const audio = input.audio
      const audioBytes = audio && Buffer.from(audio.mp3, 'base64')
      if (
        audioBytes &&
        !(
          audioBytes.subarray(0, 3).toString() === 'ID3' ||
          (audioBytes[0] === 255 && ((audioBytes[1] ?? 0) & 0xe0) === 0xe0)
        )
      ) {
        throw new ORPCError('BAD_REQUEST', { message: 'Upload an MP3 file' })
      }
      const storedAudio = audio && { id: crypto.randomUUID(), title: audio.title, start: audio.start, end: audio.end }
      if (!media && (photos.length || storedAudio)) throw new ORPCError('SERVICE_UNAVAILABLE')
      const keys: string[] = []
      let published: Awaited<ReturnType<typeof publishOwnedWedding>>
      try {
        for (const { photo, bytes } of photos) {
          const key = `assets/${photo.id}`
          keys.push(key)
          await media?.put(key, bytes)
        }
        if (storedAudio && audioBytes) {
          const key = `audio/${storedAudio.id}`
          keys.push(key)
          await media?.put(key, audioBytes)
        }
        published = await publishOwnedWedding(
          context.sql,
          context.user.id,
          id,
          { ...details, music, photos: photos.map(({ photo }) => photo), audio: storedAudio },
          [...new Set(input.guests)],
          input.draftId,
        )
      } catch (error) {
        await Promise.allSettled(keys.map((key) => media?.remove(key)))
        throw error
      }
      const obsolete = published.previous?.photos?.flatMap(({ id }) => [`assets/${id}`, `${published.id}/${id}`]) ?? []
      if (published.previous?.audio) obsolete.push(`audio/${published.previous.audio.id}`)
      await Promise.allSettled(obsolete.map((key) => media?.remove(key)))
      return { id: published.id, guests: published.guests }
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
