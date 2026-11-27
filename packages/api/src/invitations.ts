import { Buffer } from 'node:buffer'
import type { Sql } from '@app/db'
import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { authed, pub } from './context.ts'
import {
  type InvitationDoc,
  invitationDoc,
  isThemeId,
  langs,
  newInvitation,
  publishProblems,
  themeIds,
} from './invitation-model.ts'
import type { WeddingMedia } from './wedding-media.ts'

export const draftLifetimeDays = 3
export const films = ['senja', 'pesta', 'tinta', 'kenangan', 'polos'] as const
export const boothLayouts = ['strip', 'grid', 'portrait', 'double', 'wide'] as const
export type Film = (typeof films)[number]

export const boothSettings = z.object({
  open: z.enum(['event', 'now', 'closed']).default('now'),
  frames: z.array(z.string().max(40)).max(30).optional(),
})
export const cameraSettings = z.object({
  open: z.enum(['event', 'now', 'closed']).default('now'),
  film: z.enum(films).default('senja'),
  revealed: z.boolean().default(false),
  shots: z.number().int().min(3).max(36).default(24),
})
export type BoothSettings = z.infer<typeof boothSettings>
export type CameraSettings = z.infer<typeof cameraSettings>

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](-?[a-z0-9])*$/, 'Pakai huruf kecil, angka, dan tanda hubung')
const codeSchema = z.string().regex(/^[a-z0-9]{6}$/)
const base64 = (max: number) =>
  z
    .string()
    .max(max)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
const reservedSlugs = new Set(['admin', 'api', 'rpc', 'studio', 'tema', 'buat', 'login', 'coba', 'demo', 'u'])

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Buffer.from(digest).toString('hex')
}

function randomToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')
}

const codeAlphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) => codeAlphabet[byte % codeAlphabet.length]).join('')
}

function decodeMedia(kind: 'photo' | 'audio' | 'strip' | 'shot', data: string) {
  const bytes = Buffer.from(data, 'base64')
  if (kind === 'audio') {
    const mp3 = bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
    if (!mp3) throw new ORPCError('BAD_REQUEST', { message: 'Unggah file MP3' })
    return { bytes, contentType: 'audio/mpeg' }
  }
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217
  if (!jpeg) throw new ORPCError('BAD_REQUEST', { message: 'Unggah foto JPEG' })
  return { bytes, contentType: 'image/jpeg' }
}

export type Access = { userId: string | null; tokenHash: string | null }

type InvitationRow = {
  id: string
  ownerId: string | null
  slug: string | null
  draft: InvitationDoc
  published: InvitationDoc | null
  publishedAt: string | null
  booth: BoothSettings
  camera: CameraSettings
  createdAt: string
  updatedAt: string
}

const rowColumns = (sql: Sql) => sql`
  id, owner_id as "ownerId", slug, draft, published, published_at::text as "publishedAt",
  booth, camera, created_at::text as "createdAt", updated_at::text as "updatedAt"
`

export async function createInvitation(sql: Sql, doc: InvitationDoc, ownerId: string | null) {
  const id = crypto.randomUUID()
  const token = ownerId ? null : randomToken()
  const tokenHash = token ? await sha256(token) : null
  await sql`
    insert into invitations (id, owner_id, draft_token_hash, theme, draft)
    values (${id}, ${ownerId}, ${tokenHash}, ${doc.theme}, ${sql.json(doc)})
  `
  return { id, token }
}

/** Drafts that nobody signed up for are removed after three days, with their media. */
export async function removeExpiredDrafts(sql: Sql, media?: WeddingMedia, limit = 20) {
  const removed = await sql<{ mediaId: string | null }[]>`
    with expired as (
      select id from invitations
      where owner_id is null and created_at < now() - make_interval(days => ${draftLifetimeDays})
      order by created_at limit ${limit}
    ), files as (
      select m.id as "mediaId" from invitation_media m join expired e on e.id = m.invitation_id
    ), gone as (
      delete from invitations where id in (select id from expired) returning id
    )
    select "mediaId" from files
  `
  await Promise.allSettled(removed.flatMap(({ mediaId }) => (mediaId ? [media?.remove(`m/${mediaId}`)] : [])))
  return removed.length
}

export async function findEditable(sql: Sql, id: string, access: Access) {
  const [row] = await sql<InvitationRow[]>`
    select ${rowColumns(sql)} from invitations
    where id = ${id} and (
      (owner_id is not null and owner_id = ${access.userId})
      or (owner_id is null and draft_token_hash = ${access.tokenHash})
    )
  `
  return row
}

async function requireEditable(sql: Sql, id: string, access: Access) {
  const row = await findEditable(sql, id, access)
  if (!row) throw new ORPCError('NOT_FOUND')
  return row
}

async function requireOwned(sql: Sql, id: string, userId: string) {
  const row = await findEditable(sql, id, { userId, tokenHash: null })
  if (!row) throw new ORPCError('NOT_FOUND')
  return row
}

export async function saveInvitationDraft(sql: Sql, id: string, access: Access, doc: InvitationDoc) {
  const result = await sql`
    update invitations set draft = ${sql.json(doc)}, theme = ${doc.theme}, updated_at = now()
    where id = ${id} and (
      (owner_id is not null and owner_id = ${access.userId})
      or (owner_id is null and draft_token_hash = ${access.tokenHash})
    )
  `
  return result.count > 0
}

export async function claimInvitation(sql: Sql, id: string, tokenHash: string, userId: string) {
  const result = await sql`
    update invitations set owner_id = ${userId}, draft_token_hash = null, updated_at = now()
    where id = ${id} and owner_id is null and draft_token_hash = ${tokenHash}
  `
  return result.count > 0
}

export type InvitationSummary = {
  id: string
  slug: string | null
  theme: string
  bride: string
  groom: string
  publishedAt: string | null
  updatedAt: string
  guests: number
  attending: number
  wishes: number
}

export async function listInvitations(sql: Sql, userId: string) {
  const rows = await sql<InvitationSummary[]>`
    select i.id, i.slug, i.theme, i.draft->'names'->>'bride' as bride, i.draft->'names'->>'groom' as groom,
      i.published_at::text as "publishedAt", i.updated_at::text as "updatedAt",
      (select count(*)::int from invitation_guests g where g.invitation_id = i.id and not g.walk_in) as guests,
      (select count(*)::int from invitation_guests g where g.invitation_id = i.id and g.attending) as attending,
      (select count(*)::int from invitation_wishes w where w.invitation_id = i.id) as wishes
    from invitations i where i.owner_id = ${userId}
    order by i.updated_at desc
  `
  return [...rows]
}

export async function addMedia(
  sql: Sql,
  media: WeddingMedia,
  invitationId: string,
  kind: 'photo' | 'audio' | 'strip' | 'shot',
  data: string,
) {
  const { bytes, contentType } = decodeMedia(kind, data)
  const id = crypto.randomUUID()
  await media.put(`m/${id}`, bytes)
  try {
    await sql`
      insert into invitation_media (id, invitation_id, kind, content_type, size)
      values (${id}, ${invitationId}, ${kind}, ${contentType}, ${bytes.length})
    `
  } catch (error) {
    await media.remove(`m/${id}`)
    throw error
  }
  return id
}

export async function readMedia(sql: Sql, id: string) {
  const [row] = await sql<{ contentType: string }[]>`
    select content_type as "contentType" from invitation_media where id = ${id}
  `
  return row
}

function referencedMedia(doc: InvitationDoc | null) {
  if (!doc) return []
  const ids = [...doc.gallery]
  for (const value of Object.values(doc.values)) {
    if (/^[0-9a-f-]{36}$/.test(value)) ids.push(value)
  }
  if (doc.music.mode === 'upload') ids.push(doc.music.mediaId)
  return ids
}

/** Removes uploaded photos and songs that neither the draft nor the live invitation still uses. */
export async function pruneMedia(sql: Sql, media: WeddingMedia | undefined, invitationId: string) {
  const [row] = await sql<{ draft: InvitationDoc; published: InvitationDoc | null }[]>`
    select draft, published from invitations where id = ${invitationId}
  `
  if (!row) return 0
  const keep = [...new Set([...referencedMedia(row.draft), ...referencedMedia(row.published)])]
  const removed = await sql<{ id: string }[]>`
    delete from invitation_media
    where invitation_id = ${invitationId} and kind in ('photo', 'audio') and not (id = any(${keep}::uuid[]))
      and created_at < now() - interval '1 hour'
    returning id
  `
  await Promise.allSettled(removed.map(({ id }) => media?.remove(`m/${id}`)))
  return removed.length
}

export async function publishInvitation(sql: Sql, id: string, userId: string, slug: string) {
  const row = await requireOwned(sql, id, userId)
  const problems = publishProblems(row.draft)
  if (problems.length) throw new ORPCError('BAD_REQUEST', { message: problems.join(' ') })
  try {
    const [published] = await sql<{ slug: string; publishedAt: string }[]>`
      update invitations set published = draft, slug = ${slug}, published_at = now(), updated_at = now()
      where id = ${id} and owner_id = ${userId}
      returning slug, published_at::text as "publishedAt"
    `
    return published
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new ORPCError('CONFLICT', { message: 'Alamat ini sudah dipakai. Coba yang lain.' })
    }
    throw error
  }
}

export async function slugAvailable(sql: Sql, slug: string, id?: string) {
  if (reservedSlugs.has(slug)) return false
  const [row] = await sql`select 1 from invitations where slug = ${slug} and id is distinct from ${id ?? null}`
  return !row
}

export type GuestView = {
  code: string
  name: string
  events: string[] | null
  seats: number
  attending: boolean | null
  party: number | null
}

export type PublicInvitation = {
  id: string
  slug: string
  doc: InvitationDoc
  guest: GuestView | null
  booth: BoothSettings
  camera: { open: CameraSettings['open']; film: Film; shots: number; revealed: boolean }
}

export async function readPublic(sql: Sql, slug: string, code?: string) {
  const [row] = await sql<
    { id: string; slug: string; doc: InvitationDoc; booth: BoothSettings; camera: CameraSettings }[]
  >`
    select id, slug, published as doc, booth, camera from invitations where slug = ${slug} and published is not null
  `
  if (!row) return undefined
  let guest: GuestView | null = null
  if (code) {
    const [found] = await sql<GuestView[]>`
      select code, name, events, seats, attending, party from invitation_guests
      where invitation_id = ${row.id} and code = ${code}
    `
    guest = found ?? null
  }
  const camera = cameraSettings.parse(row.camera)
  const invitation: PublicInvitation = {
    id: row.id,
    slug: row.slug,
    doc: row.doc,
    guest,
    booth: boothSettings.parse(row.booth),
    camera: { open: camera.open, film: camera.film, shots: camera.shots, revealed: camera.revealed },
  }
  return invitation
}

async function publishedId(sql: Sql, slug: string) {
  const [row] = await sql<{ id: string }[]>`select id from invitations where slug = ${slug} and published is not null`
  if (!row) throw new ORPCError('NOT_FOUND')
  return row.id
}

export async function saveRsvp(sql: Sql, slug: string, code: string, attending: boolean, party: number) {
  const [guest] = await sql<{ attending: boolean; party: number }[]>`
    update invitation_guests g
    set attending = ${attending}, party = ${attending ? party : 0}, responded_at = now()
    from invitations i
    where i.id = g.invitation_id and i.slug = ${slug} and i.published is not null and g.code = ${code}
      and ${party} <= g.seats
    returning g.attending, g.party
  `
  return guest
}

export type Wish = { id: string; name: string; message: string; createdAt: string; hidden: boolean }

export async function addWish(sql: Sql, slug: string, input: { code?: string; name: string; message: string }) {
  const invitationId = await publishedId(sql, slug)
  let name = input.name
  let guestId: string | null = null
  if (input.code) {
    const [guest] = await sql<{ id: string; name: string }[]>`
      select id, name from invitation_guests where invitation_id = ${invitationId} and code = ${input.code}
    `
    if (guest) {
      guestId = guest.id
      name = guest.name
    }
  }
  const [count] = await sql<{ total: number }[]>`
    select count(*)::int as total from invitation_wishes where invitation_id = ${invitationId}
  `
  if ((count?.total ?? 0) >= 5000) throw new ORPCError('TOO_MANY_REQUESTS')
  const [wish] = await sql<Wish[]>`
    insert into invitation_wishes (id, invitation_id, guest_id, name, message)
    values (${crypto.randomUUID()}, ${invitationId}, ${guestId}, ${name}, ${input.message})
    returning id, name, message, created_at::text as "createdAt", hidden
  `
  return wish
}

export async function listWishes(sql: Sql, invitationId: string, includeHidden: boolean, limit = 200) {
  const rows = await sql<Wish[]>`
    select id, name, message, created_at::text as "createdAt", hidden from invitation_wishes
    where invitation_id = ${invitationId} and (${includeHidden} or not hidden)
    order by created_at desc limit ${limit}
  `
  return [...rows]
}

export type GuestRow = {
  id: string
  code: string
  name: string
  phone: string
  email: string
  label: string
  events: string[] | null
  seats: number
  walkIn: boolean
  attending: boolean | null
  party: number | null
  respondedAt: string | null
  checkedInAt: string | null
  checkedInParty: number | null
}

const guestColumns = (sql: Sql) => sql`
  id, code, name, phone, email, label, events, seats, walk_in as "walkIn", attending, party,
  responded_at::text as "respondedAt", checked_in_at::text as "checkedInAt", checked_in_party as "checkedInParty"
`

export async function listGuests(sql: Sql, invitationId: string) {
  const rows = await sql<GuestRow[]>`
    select ${guestColumns(sql)} from invitation_guests where invitation_id = ${invitationId}
    order by walk_in, lower(name), id
  `
  return [...rows]
}

export type GuestInput = {
  name: string
  phone: string
  email: string
  label: string
  events: string[] | null
  seats: number
}

/** Adds guests and skips anyone already on the list with the same name, phone and email. */
export async function addGuests(sql: Sql, invitationId: string, guests: GuestInput[], limit = 2000) {
  return sql.begin(async (tx) => {
    await tx`select 1 from invitations where id = ${invitationId} for update`
    const existing = await tx<{ name: string; phone: string; email: string; code: string }[]>`
      select name, phone, email, code from invitation_guests where invitation_id = ${invitationId}
    `
    const keyOf = (guest: { name: string; phone: string; email: string }) =>
      [guest.name, guest.phone, guest.email].map((value) => value.trim().toLowerCase()).join('\u0000')
    const seen = new Set(existing.map(keyOf))
    const codes = new Set(existing.map((row) => row.code))
    const rows = []
    for (const guest of guests) {
      const key = keyOf(guest)
      if (seen.has(key)) continue
      seen.add(key)
      let code = randomCode()
      while (codes.has(code)) code = randomCode()
      codes.add(code)
      rows.push({ id: crypto.randomUUID(), invitation_id: invitationId, code, ...guest })
    }
    const room = Math.max(0, limit - existing.length)
    const added = rows.slice(0, room)
    for (const row of added) {
      await tx`
        insert into invitation_guests (id, invitation_id, code, name, phone, email, label, events, seats)
        values (${row.id}, ${row.invitation_id}, ${row.code}, ${row.name}, ${row.phone}, ${row.email},
          ${row.label}, ${row.events}, ${row.seats})
      `
    }
    return { added: added.length, skipped: guests.length - added.length }
  })
}

export async function updateGuest(sql: Sql, invitationId: string, guestId: string, guest: GuestInput) {
  const [row] = await sql<GuestRow[]>`
    update invitation_guests set name = ${guest.name}, phone = ${guest.phone}, email = ${guest.email},
      label = ${guest.label}, events = ${guest.events}, seats = ${guest.seats}
    where invitation_id = ${invitationId} and id = ${guestId}
    returning ${guestColumns(sql)}
  `
  return row
}

export async function setGuestEvents(sql: Sql, invitationId: string, guestIds: string[], events: string[] | null) {
  const result = await sql`
    update invitation_guests set events = ${events}
    where invitation_id = ${invitationId} and id = any(${guestIds}::uuid[])
  `
  return result.count
}

export async function removeGuests(sql: Sql, invitationId: string, guestIds: string[]) {
  const result = await sql`
    delete from invitation_guests where invitation_id = ${invitationId} and id = any(${guestIds}::uuid[])
  `
  return result.count
}

export async function checkIn(sql: Sql, invitationId: string, code: string, party: number) {
  const [row] = await sql<GuestRow[]>`
    update invitation_guests set checked_in_at = coalesce(checked_in_at, now()), checked_in_party = ${party}
    where invitation_id = ${invitationId} and code = ${code}
    returning ${guestColumns(sql)}
  `
  return row
}

export async function undoCheckIn(sql: Sql, invitationId: string, code: string) {
  const [row] = await sql<GuestRow[]>`
    update invitation_guests set checked_in_at = null, checked_in_party = null
    where invitation_id = ${invitationId} and code = ${code}
    returning ${guestColumns(sql)}
  `
  return row
}

export async function addWalkIn(sql: Sql, invitationId: string, name: string, party: number) {
  const [row] = await sql<GuestRow[]>`
    insert into invitation_guests (id, invitation_id, code, name, seats, walk_in, checked_in_at, checked_in_party)
    values (${crypto.randomUUID()}, ${invitationId}, ${randomCode()}, ${name}, ${Math.max(1, party)}, true, now(), ${party})
    returning ${guestColumns(sql)}
  `
  return row
}

function isOpen(open: 'event' | 'now' | 'closed', doc: InvitationDoc, now = new Date()) {
  if (open === 'now') return true
  if (open === 'closed') return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: doc.events[0]?.tz ?? 'Asia/Jakarta' }).format(now)
  return doc.events.some((event) => event.date === today)
}

export type BoothStrip = { id: string; mediaId: string; guestName: string; createdAt: string }

export async function addStrip(
  sql: Sql,
  media: WeddingMedia,
  slug: string,
  input: { name: string; layout: string; frame: string; jpeg: string },
) {
  const invitation = await readPublic(sql, slug)
  if (!invitation) throw new ORPCError('NOT_FOUND')
  if (!isOpen(invitation.booth.open, invitation.doc))
    throw new ORPCError('FORBIDDEN', { message: 'Photobooth belum buka' })
  const [count] = await sql<{ total: number }[]>`
    select count(*)::int as total from booth_strips where invitation_id = ${invitation.id}
  `
  if ((count?.total ?? 0) >= 2000) throw new ORPCError('FORBIDDEN', { message: 'Album photobooth sudah penuh' })
  const mediaId = await addMedia(sql, media, invitation.id, 'strip', input.jpeg)
  const [strip] = await sql<BoothStrip[]>`
    insert into booth_strips (id, invitation_id, media_id, guest_name, layout, frame)
    values (${crypto.randomUUID()}, ${invitation.id}, ${mediaId}, ${input.name}, ${input.layout}, ${input.frame})
    returning id, media_id as "mediaId", guest_name as "guestName", created_at::text as "createdAt"
  `
  return strip
}

export async function listStrips(sql: Sql, invitationId: string, limit = 300) {
  const rows = await sql<BoothStrip[]>`
    select id, media_id as "mediaId", guest_name as "guestName", created_at::text as "createdAt"
    from booth_strips where invitation_id = ${invitationId} order by created_at desc limit ${limit}
  `
  return [...rows]
}

export async function startRoll(sql: Sql, slug: string, name: string) {
  const invitation = await readPublic(sql, slug)
  if (!invitation) throw new ORPCError('NOT_FOUND')
  if (!isOpen(invitation.camera.open, invitation.doc))
    throw new ORPCError('FORBIDDEN', { message: 'Kamera belum buka' })
  const [count] = await sql<{ total: number }[]>`
    select count(*)::int as total from camera_rolls where invitation_id = ${invitation.id}
  `
  if ((count?.total ?? 0) >= 500) throw new ORPCError('FORBIDDEN', { message: 'Rol film sudah habis' })
  const id = crypto.randomUUID()
  await sql`
    insert into camera_rolls (id, invitation_id, guest_name, film)
    values (${id}, ${invitation.id}, ${name}, ${invitation.camera.film})
  `
  return { rollId: id, film: invitation.camera.film, left: invitation.camera.shots }
}

export async function addShot(sql: Sql, media: WeddingMedia, slug: string, rollId: string, jpeg: string) {
  const invitation = await readPublic(sql, slug)
  if (!invitation) throw new ORPCError('NOT_FOUND')
  return sql.begin(async (tx) => {
    const [roll] = await tx<{ id: string; taken: number }[]>`
      select r.id, (select count(*)::int from camera_shots s where s.roll_id = r.id) as taken
      from camera_rolls r where r.id = ${rollId} and r.invitation_id = ${invitation.id} for update
    `
    if (!roll) throw new ORPCError('NOT_FOUND')
    if (roll.taken >= invitation.camera.shots) throw new ORPCError('FORBIDDEN', { message: 'Rol ini sudah habis' })
    const mediaId = await addMedia(tx as unknown as Sql, media, invitation.id, 'shot', jpeg)
    await tx`insert into camera_shots (id, roll_id, media_id) values (${crypto.randomUUID()}, ${rollId}, ${mediaId})`
    return { left: invitation.camera.shots - roll.taken - 1 }
  })
}

export type CameraShot = { id: string; mediaId: string; guestName: string; film: string; createdAt: string }

export async function listShots(sql: Sql, invitationId: string, limit = 600) {
  const rows = await sql<CameraShot[]>`
    select s.id, s.media_id as "mediaId", r.guest_name as "guestName", r.film, s.created_at::text as "createdAt"
    from camera_shots s join camera_rolls r on r.id = s.roll_id
    where r.invitation_id = ${invitationId} order by s.created_at desc limit ${limit}
  `
  return [...rows]
}

export async function cameraStats(sql: Sql, invitationId: string) {
  const [row] = await sql<{ rolls: number; shots: number }[]>`
    select (select count(*)::int from camera_rolls where invitation_id = ${invitationId}) as rolls,
      (select count(*)::int from camera_shots s join camera_rolls r on r.id = s.roll_id
        where r.invitation_id = ${invitationId}) as shots
  `
  return row ?? { rolls: 0, shots: 0 }
}

// Procedures

const editor = pub.use(async ({ context, next }) => {
  const session = await context.auth.api.getSession({ headers: context.headers })
  const token = context.headers.get('x-draft-token')
  const access: Access = { userId: session?.user.id ?? null, tokenHash: token ? await sha256(token) : null }
  return next({ context: { access } })
})

function requireMedia(media: WeddingMedia | undefined) {
  if (!media) throw new ORPCError('SERVICE_UNAVAILABLE')
  return media
}

const editableOutput = z.object({
  id: z.uuid(),
  owned: z.boolean(),
  slug: z.string().nullable(),
  draft: invitationDoc,
  published: invitationDoc.nullable(),
  publishedAt: z.string().nullable(),
  booth: boothSettings,
  camera: cameraSettings,
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable(),
})

function toEditable(row: InvitationRow) {
  const expires = row.ownerId ? null : new Date(new Date(row.createdAt).getTime() + draftLifetimeDays * 86_400_000)
  return {
    id: row.id,
    owned: row.ownerId !== null,
    slug: row.slug,
    draft: row.draft,
    published: row.published,
    publishedAt: row.publishedAt,
    booth: boothSettings.parse(row.booth),
    camera: cameraSettings.parse(row.camera),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: expires?.toISOString() ?? null,
  }
}

const guestInput = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).default(''),
  email: z.string().trim().max(180).default(''),
  label: z.string().trim().max(60).default(''),
  events: z.array(z.string().max(40)).max(3).nullable().default(null),
  seats: z.number().int().min(1).max(20).default(2),
})

const guestRow = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  label: z.string(),
  events: z.array(z.string()).nullable(),
  seats: z.number(),
  walkIn: z.boolean(),
  attending: z.boolean().nullable(),
  party: z.number().nullable(),
  respondedAt: z.string().nullable(),
  checkedInAt: z.string().nullable(),
  checkedInParty: z.number().nullable(),
})
const wishRow = z.object({
  id: z.uuid(),
  name: z.string(),
  message: z.string(),
  createdAt: z.string(),
  hidden: z.boolean(),
})
const publicWish = wishRow.omit({ hidden: true })
const stripRow = z.object({ id: z.uuid(), mediaId: z.uuid(), guestName: z.string(), createdAt: z.string() })
const shotRow = stripRow.extend({ film: z.string() })

const owned = (id: string, userId: string, sql: Sql) => requireOwned(sql, id, userId)

export const invitations = {
  create: editor
    .route({ method: 'POST', path: '/invitations', summary: 'Start an invitation, with or without an account' })
    .input(
      z.object({
        theme: z.enum(themeIds),
        lang: z.enum(langs),
        bride: z.string().trim().min(1).max(40),
        groom: z.string().trim().min(1).max(40),
      }),
    )
    .output(z.object({ id: z.uuid(), token: z.string().nullable() }))
    .handler(async ({ input, context }) => {
      await removeExpiredDrafts(context.sql, context.media)
      if (!isThemeId(input.theme)) throw new ORPCError('BAD_REQUEST')
      return createInvitation(context.sql, newInvitation(input), context.access.userId)
    }),

  get: editor
    .route({ method: 'GET', path: '/invitations/{id}', summary: 'Read an invitation you can edit' })
    .input(z.object({ id: z.uuid() }))
    .output(editableOutput)
    .handler(async ({ input, context }) => toEditable(await requireEditable(context.sql, input.id, context.access))),

  save: editor
    .route({ method: 'PUT', path: '/invitations/{id}', summary: 'Save the draft of an invitation' })
    .input(z.object({ id: z.uuid(), draft: invitationDoc }))
    .output(z.object({ ok: z.boolean() }))
    .handler(async ({ input, context }) => {
      const saved = await saveInvitationDraft(context.sql, input.id, context.access, input.draft)
      if (!saved) throw new ORPCError('NOT_FOUND')
      return { ok: true }
    }),

  claim: authed
    .route({ method: 'POST', path: '/invitations/{id}/claim', summary: 'Keep a draft you started before signing in' })
    .input(z.object({ id: z.uuid(), token: z.string().min(10).max(100) }))
    .output(z.object({ ok: z.boolean() }))
    .handler(async ({ input, context }) => ({
      ok: await claimInvitation(context.sql, input.id, await sha256(input.token), context.user.id),
    })),

  mine: authed
    .route({ method: 'GET', path: '/invitations', summary: 'List your invitations' })
    .output(
      z.array(
        z.object({
          id: z.uuid(),
          slug: z.string().nullable(),
          theme: z.string(),
          bride: z.string(),
          groom: z.string(),
          publishedAt: z.string().nullable(),
          updatedAt: z.string(),
          guests: z.number(),
          attending: z.number(),
          wishes: z.number(),
        }),
      ),
    )
    .handler(({ context }) => listInvitations(context.sql, context.user.id)),

  remove: authed
    .route({ method: 'DELETE', path: '/invitations/{id}', summary: 'Delete an invitation and everything in it' })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ ok: z.boolean() }))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      const files = await context.sql<
        { id: string }[]
      >`select id from invitation_media where invitation_id = ${input.id}`
      await context.sql`delete from invitations where id = ${input.id} and owner_id = ${context.user.id}`
      await Promise.allSettled(files.map(({ id }) => context.media?.remove(`m/${id}`)))
      return { ok: true }
    }),

  upload: editor
    .route({ method: 'POST', path: '/invitations/{id}/media', summary: 'Upload a photo or song for an invitation' })
    .input(z.object({ id: z.uuid(), kind: z.enum(['photo', 'audio']), data: base64(1_900_000) }))
    .output(z.object({ mediaId: z.uuid() }))
    .handler(async ({ input, context }) => {
      const row = await requireEditable(context.sql, input.id, context.access)
      const [count] = await context.sql<{ total: number }[]>`
        select count(*)::int as total from invitation_media where invitation_id = ${row.id} and kind in ('photo', 'audio')
      `
      if ((count?.total ?? 0) >= 80) {
        await pruneMedia(context.sql, context.media, row.id)
        throw new ORPCError('FORBIDDEN', { message: 'Batas unggahan tercapai. Hapus foto yang tidak dipakai.' })
      }
      const mediaId = await addMedia(context.sql, requireMedia(context.media), row.id, input.kind, input.data)
      return { mediaId }
    }),

  slugAvailable: pub
    .route({ method: 'GET', path: '/invitations/slugs/{slug}', summary: 'Check if an invitation address is free' })
    .input(z.object({ slug: slugSchema, id: z.uuid().optional() }))
    .output(z.object({ available: z.boolean() }))
    .handler(async ({ input, context }) => ({ available: await slugAvailable(context.sql, input.slug, input.id) })),

  publish: authed
    .route({ method: 'POST', path: '/invitations/{id}/publish', summary: 'Publish or update the live invitation' })
    .input(z.object({ id: z.uuid(), slug: slugSchema }))
    .output(z.object({ slug: z.string(), publishedAt: z.string() }))
    .handler(async ({ input, context }) => {
      if (!(await slugAvailable(context.sql, input.slug, input.id))) {
        throw new ORPCError('CONFLICT', { message: 'Alamat ini sudah dipakai. Coba yang lain.' })
      }
      const result = await publishInvitation(context.sql, input.id, context.user.id, input.slug)
      if (!result) throw new ORPCError('NOT_FOUND')
      await pruneMedia(context.sql, context.media, input.id)
      return result
    }),

  settings: authed
    .route({ method: 'PUT', path: '/invitations/{id}/settings', summary: 'Change photobooth and camera settings' })
    .input(z.object({ id: z.uuid(), booth: boothSettings.optional(), camera: cameraSettings.optional() }))
    .output(z.object({ booth: boothSettings, camera: cameraSettings }))
    .handler(async ({ input, context }) => {
      const row = await owned(input.id, context.user.id, context.sql)
      const booth = input.booth ?? boothSettings.parse(row.booth)
      const camera = input.camera ?? cameraSettings.parse(row.camera)
      await context.sql`
        update invitations set booth = ${context.sql.json(booth)}, camera = ${context.sql.json(camera)}
        where id = ${row.id}
      `
      return { booth, camera }
    }),

  view: pub
    .route({ method: 'GET', path: '/u/{slug}', summary: 'Read a live invitation, optionally for one guest' })
    .input(z.object({ slug: slugSchema, code: codeSchema.optional() }))
    .output(
      z.object({
        id: z.uuid(),
        slug: z.string(),
        doc: invitationDoc,
        guest: z
          .object({
            code: z.string(),
            name: z.string(),
            events: z.array(z.string()).nullable(),
            seats: z.number(),
            attending: z.boolean().nullable(),
            party: z.number().nullable(),
          })
          .nullable(),
        booth: boothSettings,
        camera: z.object({
          open: z.enum(['event', 'now', 'closed']),
          film: z.enum(films),
          shots: z.number(),
          revealed: z.boolean(),
        }),
        wishes: z.array(publicWish),
      }),
    )
    .handler(async ({ input, context }) => {
      const invitation = await readPublic(context.sql, input.slug, input.code)
      if (!invitation) throw new ORPCError('NOT_FOUND')
      const wishes = (await listWishes(context.sql, invitation.id, false, 100)).map(({ hidden: _, ...wish }) => wish)
      return { ...invitation, wishes }
    }),

  rsvp: pub
    .route({ method: 'POST', path: '/u/{slug}/rsvp', summary: 'Reply to an invitation' })
    .input(
      z.object({ slug: slugSchema, code: codeSchema, attending: z.boolean(), party: z.number().int().min(0).max(20) }),
    )
    .output(z.object({ attending: z.boolean(), party: z.number() }))
    .handler(async ({ input, context }) => {
      const saved = await saveRsvp(context.sql, input.slug, input.code, input.attending, input.party)
      if (!saved) throw new ORPCError('NOT_FOUND')
      return saved
    }),

  wish: pub
    .route({ method: 'POST', path: '/u/{slug}/wishes', summary: 'Send wishes to the couple' })
    .input(
      z.object({
        slug: slugSchema,
        code: codeSchema.optional(),
        name: z.string().trim().min(1).max(80),
        message: z.string().trim().min(2).max(600),
      }),
    )
    .output(publicWish)
    .handler(async ({ input, context }) => {
      const wish = await addWish(context.sql, input.slug, input)
      if (!wish) throw new ORPCError('INTERNAL_SERVER_ERROR')
      const { hidden: _, ...rest } = wish
      return rest
    }),

  guests: authed
    .route({ method: 'GET', path: '/invitations/{id}/guests', summary: 'List guests' })
    .input(z.object({ id: z.uuid() }))
    .output(z.array(guestRow))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      return listGuests(context.sql, input.id)
    }),

  addGuests: authed
    .route({ method: 'POST', path: '/invitations/{id}/guests', summary: 'Add guests' })
    .input(z.object({ id: z.uuid(), guests: z.array(guestInput).min(1).max(2000) }))
    .output(z.object({ added: z.number(), skipped: z.number() }))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      return addGuests(context.sql, input.id, input.guests)
    }),

  updateGuest: authed
    .route({ method: 'PUT', path: '/invitations/{id}/guests/{guestId}', summary: 'Change a guest' })
    .input(z.object({ id: z.uuid(), guestId: z.uuid(), guest: guestInput }))
    .output(guestRow)
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      const row = await updateGuest(context.sql, input.id, input.guestId, input.guest)
      if (!row) throw new ORPCError('NOT_FOUND')
      return row
    }),

  guestEvents: authed
    .route({ method: 'POST', path: '/invitations/{id}/guests/events', summary: 'Choose which events guests see' })
    .input(
      z.object({
        id: z.uuid(),
        guestIds: z.array(z.uuid()).min(1).max(2000),
        events: z.array(z.string().max(40)).max(3).nullable(),
      }),
    )
    .output(z.object({ changed: z.number() }))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      return { changed: await setGuestEvents(context.sql, input.id, input.guestIds, input.events) }
    }),

  removeGuests: authed
    .route({ method: 'POST', path: '/invitations/{id}/guests/remove', summary: 'Remove guests' })
    .input(z.object({ id: z.uuid(), guestIds: z.array(z.uuid()).min(1).max(2000) }))
    .output(z.object({ removed: z.number() }))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      return { removed: await removeGuests(context.sql, input.id, input.guestIds) }
    }),

  checkIn: authed
    .route({ method: 'POST', path: '/invitations/{id}/check-in', summary: 'Check a guest in at the door' })
    .input(
      z.object({
        id: z.uuid(),
        code: codeSchema,
        party: z.number().int().min(1).max(20),
        undo: z.boolean().optional(),
      }),
    )
    .output(guestRow)
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      const row = input.undo
        ? await undoCheckIn(context.sql, input.id, input.code)
        : await checkIn(context.sql, input.id, input.code, input.party)
      if (!row) throw new ORPCError('NOT_FOUND', { message: 'Tamu tidak ditemukan di undangan ini' })
      return row
    }),

  walkIn: authed
    .route({ method: 'POST', path: '/invitations/{id}/walk-in', summary: 'Check in a guest who is not on the list' })
    .input(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100), party: z.number().int().min(1).max(20) }))
    .output(guestRow)
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      const row = await addWalkIn(context.sql, input.id, input.name, input.party)
      if (!row) throw new ORPCError('INTERNAL_SERVER_ERROR')
      return row
    }),

  wishes: authed
    .route({ method: 'GET', path: '/invitations/{id}/wishes', summary: 'List wishes, including hidden ones' })
    .input(z.object({ id: z.uuid() }))
    .output(z.array(wishRow))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      return listWishes(context.sql, input.id, true, 2000)
    }),

  hideWish: authed
    .route({ method: 'POST', path: '/invitations/{id}/wishes/{wishId}', summary: 'Hide or show a wish' })
    .input(z.object({ id: z.uuid(), wishId: z.uuid(), hidden: z.boolean() }))
    .output(z.object({ ok: z.boolean() }))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      const result = await context.sql`
        update invitation_wishes set hidden = ${input.hidden} where id = ${input.wishId} and invitation_id = ${input.id}
      `
      return { ok: result.count > 0 }
    }),

  boothUpload: pub
    .route({ method: 'POST', path: '/u/{slug}/booth', summary: 'Add a photo strip to the guest album' })
    .input(
      z.object({
        slug: slugSchema,
        name: z.string().trim().min(1).max(80),
        layout: z.enum(boothLayouts),
        frame: z.string().max(40),
        jpeg: base64(1_900_000),
      }),
    )
    .output(stripRow)
    .handler(async ({ input, context }) => {
      const strip = await addStrip(context.sql, requireMedia(context.media), input.slug, input)
      if (!strip) throw new ORPCError('INTERNAL_SERVER_ERROR')
      return strip
    }),

  boothAlbum: pub
    .route({ method: 'GET', path: '/u/{slug}/booth', summary: 'Read the photobooth album' })
    .input(z.object({ slug: slugSchema }))
    .output(z.array(stripRow))
    .handler(async ({ input, context }) => listStrips(context.sql, await publishedId(context.sql, input.slug))),

  cameraStart: pub
    .route({ method: 'POST', path: '/u/{slug}/camera', summary: 'Take a roll of film' })
    .input(z.object({ slug: slugSchema, name: z.string().trim().min(1).max(80) }))
    .output(z.object({ rollId: z.uuid(), film: z.enum(films), left: z.number() }))
    .handler(({ input, context }) => startRoll(context.sql, input.slug, input.name)),

  cameraShot: pub
    .route({ method: 'POST', path: '/u/{slug}/camera/{rollId}', summary: 'Add a shot to a roll' })
    .input(z.object({ slug: slugSchema, rollId: z.uuid(), jpeg: base64(1_200_000) }))
    .output(z.object({ left: z.number() }))
    .handler(({ input, context }) =>
      addShot(context.sql, requireMedia(context.media), input.slug, input.rollId, input.jpeg),
    ),

  cameraAlbum: pub
    .route({ method: 'GET', path: '/u/{slug}/camera', summary: 'Read the camera album once the couple opens it' })
    .input(z.object({ slug: slugSchema }))
    .output(z.object({ revealed: z.boolean(), rolls: z.number(), shots: z.array(shotRow), count: z.number() }))
    .handler(async ({ input, context }) => {
      const invitation = await readPublic(context.sql, input.slug)
      if (!invitation) throw new ORPCError('NOT_FOUND')
      const stats = await cameraStats(context.sql, invitation.id)
      const shots = invitation.camera.revealed ? await listShots(context.sql, invitation.id) : []
      return { revealed: invitation.camera.revealed, rolls: stats.rolls, shots, count: stats.shots }
    }),

  hostAlbums: authed
    .route({
      method: 'GET',
      path: '/invitations/{id}/albums',
      summary: 'Photobooth strips and camera shots for the couple',
    })
    .input(z.object({ id: z.uuid() }))
    .output(z.object({ strips: z.array(stripRow), shots: z.array(shotRow), rolls: z.number() }))
    .handler(async ({ input, context }) => {
      await owned(input.id, context.user.id, context.sql)
      const [strips, shots, stats] = await Promise.all([
        listStrips(context.sql, input.id),
        listShots(context.sql, input.id),
        cameraStats(context.sql, input.id),
      ])
      return { strips, shots, rolls: stats.rolls }
    }),
}
