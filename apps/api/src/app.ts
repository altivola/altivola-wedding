import { type Context, router } from '@app/api'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ORPCError, onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { csrf } from 'hono/csrf'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

export type Deps = Omit<Context, 'headers'> & {
  // The browser origin of the web app, e.g. http://localhost:5173.
  origin: string
  reportError?: (error: unknown) => void
}

export const openapiInfo = { title: 'App API', version: '0.1.0' }

// The web app and the API are always served from the same origin
// (Vite proxy in dev, nginx in Docker, Workers routes in production), so no CORS.
export function createApp(deps: Deps) {
  const { origin, reportError = console.error, ...context } = deps
  const handleError = (error: unknown) => {
    if (error instanceof ORPCError && error.status < 500) return
    reportError(error)
  }

  const rpc = new RPCHandler(router, { interceptors: [onError(handleError)] })
  const openapi = new OpenAPIHandler(router, {
    interceptors: [onError(handleError)],
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
        specGenerateOptions: { info: openapiInfo },
      }),
    ],
  })

  const app = new Hono()
  app.use(secureHeaders(), csrf({ origin }))

  const mediaId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  app.get('/api/wedding-media/:weddingId/:photoId', async (c) => {
    const { weddingId, photoId } = c.req.param()
    if (!context.media || !mediaId.test(weddingId) || !mediaId.test(photoId)) return c.notFound()
    const [published] = await context.sql`
      select 1 from weddings where id = ${weddingId} and content->'photos' @> ${context.sql.json([{ id: photoId }])}
    `
    if (!published) return c.notFound()
    const image = (await context.media.get(`assets/${photoId}`)) ?? (await context.media.get(`${weddingId}/${photoId}`))
    if (!image) return c.notFound()
    return new Response(image, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  })
  app.get('/api/wedding-audio/:weddingId/:audioId', async (c) => {
    const { weddingId, audioId } = c.req.param()
    if (!context.media || !mediaId.test(weddingId) || !mediaId.test(audioId)) return c.notFound()
    const [published] = await context.sql`select 1 from weddings
      where id = ${weddingId} and content->'audio'->>'id' = ${audioId}`
    if (!published) return c.notFound()
    const audio = await context.media.get(`audio/${audioId}`)
    if (!audio) return c.notFound()
    const headers = new Headers({
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    })
    const range = c.req.header('range')
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      const start = match?.[1] ? Number(match[1]) : Math.max(0, audio.length - Number(match?.[2]))
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), audio.length - 1) : audio.length - 1
      if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
        headers.set('Content-Range', `bytes */${audio.length}`)
        return new Response(null, { status: 416, headers })
      }
      headers.set('Content-Range', `bytes ${start}-${end}/${audio.length}`)
      headers.set('Content-Length', String(end - start + 1))
      return new Response(audio.subarray(start, end + 1), { status: 206, headers })
    }
    headers.set('Content-Length', String(audio.length))
    return new Response(audio, { headers })
  })
  const studioBodyLimit = bodyLimit({ maxSize: 8_000_000 })
  app.use('/rpc/weddings/publish', studioBodyLimit)
  app.use('/rpc/weddings/saveDraft', studioBodyLimit)
  app.use('/api/weddings', studioBodyLimit)
  app.use('/api/weddings/drafts/:id', studioBodyLimit)

  app.on(['GET', 'POST'], '/api/auth/*', (c) => context.auth.handler(c.req.raw))

  app.use(logger())

  app.use('/rpc/*', async (c, next) => {
    const { matched, response } = await rpc.handle(c.req.raw, {
      prefix: '/rpc',
      context: { ...context, headers: c.req.raw.headers },
    })
    if (matched) return c.newResponse(response.body, response)
    await next()
  })

  app.use('/api/*', async (c, next) => {
    const { matched, response } = await openapi.handle(c.req.raw, {
      prefix: '/api',
      context: { ...context, headers: c.req.raw.headers },
    })
    if (matched) return c.newResponse(response.body, response)
    await next()
  })

  return app
}
