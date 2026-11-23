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
    const image = await context.media.get(`${weddingId}/${photoId}`)
    if (!image) return c.notFound()
    return new Response(image, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  })
  app.use('/rpc/weddings/publish', bodyLimit({ maxSize: 5_600_000 }))
  app.use('/api/weddings', bodyLimit({ maxSize: 5_600_000 }))

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
