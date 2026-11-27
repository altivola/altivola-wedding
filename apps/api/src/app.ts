import { type Context, router } from '@app/api'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ORPCError, onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { Hono, type MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { csrf } from 'hono/csrf'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

export type Deps = Omit<Context, 'headers'> & {
  // The browser origin of the web app, e.g. http://localhost:5173.
  origin: string
  reportError?: (error: unknown) => void
}

export const openapiInfo = { title: 'Hari Bersama API', version: '0.2.0' }

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
  // Media ids are random UUIDs that only the invitation and its albums reveal, so a link works like a key.
  app.get('/api/m/:id', async (c) => {
    const { id } = c.req.param()
    if (!context.media || !mediaId.test(id)) return c.notFound()
    const [row] = await context.sql<{ contentType: string }[]>`
      select content_type as "contentType" from invitation_media where id = ${id}
    `
    if (!row) return c.notFound()
    const bytes = await context.media.get(`m/${id}`)
    if (!bytes) return c.notFound()
    const headers = new Headers({
      'Content-Type': row.contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    })
    const range = c.req.header('range')
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]))
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1
      if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
        headers.set('Content-Range', `bytes */${bytes.length}`)
        return new Response(null, { status: 416, headers })
      }
      headers.set('Content-Range', `bytes ${start}-${end}/${bytes.length}`)
      headers.set('Content-Length', String(end - start + 1))
      return new Response(bytes.subarray(start, end + 1), { status: 206, headers })
    }
    headers.set('Content-Length', String(bytes.length))
    return new Response(bytes, { headers })
  })
  // Uploads carry base64 photos and songs. Everything else stays small.
  const uploadLimit = bodyLimit({ maxSize: 2_600_000 })
  const smallLimit = bodyLimit({ maxSize: 400_000 })
  const uploads = [
    /^\/rpc\/invitations\/(upload|boothUpload|cameraShot)$/,
    /^\/api\/invitations\/[^/]+\/media$/,
    /^\/api\/u\/[^/]+\/(booth|camera\/[^/]+)$/,
  ]
  const limit: MiddlewareHandler = (c, next) =>
    (uploads.some((pattern) => pattern.test(c.req.path)) ? uploadLimit : smallLimit)(c, next)
  app.use('/rpc/*', limit)
  app.use('/api/invitations/*', limit)
  app.use('/api/u/*', limit)

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
