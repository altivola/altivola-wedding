import { type InvitationDoc, type InvitationEvent, type Lang, timezoneLabel } from '@app/api/invitation-model'

const offsets = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 } as const

export function formatDate(date: string, lang: Lang, style: 'long' | 'short' = 'long') {
  if (!date) return ''
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1))
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : undefined,
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  }).format(value)
}

export function dotTime(time: string) {
  return time.replace(':', '.')
}

export function timeRange(event: InvitationEvent, lang: Lang) {
  if (!event.start) return ''
  const end = event.untilDone ? (lang === 'id' ? 'selesai' : 'late') : event.end ? dotTime(event.end) : ''
  return `${dotTime(event.start)}${end ? ` - ${end}` : ''} ${timezoneLabel[event.tz]}`
}

/** Epoch milliseconds when an event starts, in its own time zone. */
export function eventStart(event: InvitationEvent) {
  if (!event.date || !event.start) return null
  const [year, month, day] = event.date.split('-').map(Number)
  const [hour, minute] = event.start.split(':').map(Number)
  return Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1, (hour ?? 0) - offsets[event.tz], minute ?? 0)
}

function stamp(ms: number) {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

export function calendarUrl(event: InvitationEvent, doc: InvitationDoc) {
  const start = eventStart(event)
  if (start === null) return null
  let end = start + 2 * 3_600_000
  if (event.end && !event.untilDone) {
    const [hour, minute] = event.end.split(':').map(Number)
    const candidate = start + ((hour ?? 0) * 60 + (minute ?? 0) - toMinutes(event.start)) * 60_000
    if (candidate > start) end = candidate
  }
  const names = `${doc.names.bride} & ${doc.names.groom}`
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', `${event.title} · ${names}`)
  url.searchParams.set('dates', `${stamp(start)}/${stamp(end)}`)
  url.searchParams.set('details', doc.lang === 'id' ? `Pernikahan ${names}` : `The wedding of ${names}`)
  url.searchParams.set('location', [event.venue, event.address].filter(Boolean).join(', '))
  return url.toString()
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return (hour ?? 0) * 60 + (minute ?? 0)
}

export function mapsUrl(event: InvitationEvent) {
  if (event.maps) return event.maps
  const query = [event.venue, event.address].filter(Boolean).join(', ')
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null
}

export function youtubeId(link: string) {
  const match = /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(link)
  return match?.[1] ?? null
}
