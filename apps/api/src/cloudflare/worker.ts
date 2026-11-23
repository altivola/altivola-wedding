// Cloudflare Workers entry. Everything Cloudflare specific stays in this folder.
import { AsyncLocalStorage } from 'node:async_hooks'
import { Buffer } from 'node:buffer'
import { createAuth } from '@app/auth'
import { createSql, type Sql } from '@app/db'
import { createApp } from '../app.ts'
import { enabledProviders, oauthProviders, parseEnv } from '../env.ts'
import { createMailer } from '../mailer.ts'
import { createQueueJobs, type JobMessage, runQueueBatch } from './queues.ts'

type Bindings = {
  HYPERDRIVE: Hyperdrive
  JOBS: Queue<JobMessage>
  WEDDING_MEDIA: D1Database
  [key: string]: unknown
}

// Workers cannot share sockets between requests, so each request opens its own small
// client (Hyperdrive does the pooling). Building Better Auth and the oRPC handlers is too
// heavy for the free plan's 10 ms CPU budget, so they are built once per isolate and reach
// the current request's client through this stable facade.
const requestSql = new AsyncLocalStorage<Sql>()

function currentSql(): Sql {
  const sql = requestSql.getStore()
  if (!sql) throw new Error('No database client for this request')
  return sql
}

const sql = new Proxy((() => {}) as unknown as Sql, {
  apply: (_target, _this, args) => (currentSql() as unknown as (...a: unknown[]) => unknown)(...args),
  has: (_target, prop) => Reflect.has(currentSql(), prop),
  get: (_target, prop) => {
    const client = currentSql()
    const value = Reflect.get(client, prop)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

let app: ReturnType<typeof createApp> | undefined

async function getApp(bindings: Bindings) {
  if (app) return app
  const vars = Object.fromEntries(Object.entries(bindings).filter(([, v]) => typeof v === 'string')) as Record<
    string,
    string
  >
  const env = parseEnv({ ...vars, DATABASE_URL: bindings.HYPERDRIVE.connectionString })
  const auth = createAuth({
    sql,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    sendEmail: createMailer(env),
    ipAddressHeaders: ['cf-connecting-ip'],
    ...oauthProviders(env),
  })
  // Discovery performs network I/O. Cache only after the initiating request finishes it,
  // so a concurrent Worker request never waits on another request's I/O.
  await auth.$context
  app ??= createApp({
    media: {
      async put(key, bytes) {
        await bindings.WEDDING_MEDIA.prepare(
          'INSERT INTO wedding_media (key, jpeg) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET jpeg = excluded.jpeg',
        )
          .bind(key, Buffer.from(bytes).toString('base64'))
          .run()
      },
      async get(key) {
        const jpeg = await bindings.WEDDING_MEDIA.prepare('SELECT jpeg FROM wedding_media WHERE key = ?')
          .bind(key)
          .first<string>('jpeg')
        return jpeg === null ? null : Buffer.from(jpeg, 'base64')
      },
      async remove(key) {
        await bindings.WEDDING_MEDIA.prepare('DELETE FROM wedding_media WHERE key = ?').bind(key).run()
      },
    },
    origin: env.BETTER_AUTH_URL,
    authProviders: enabledProviders(env),
    sql,
    jobs: createQueueJobs(bindings.JOBS),
    auth,
  })
  return app
}

function withRequestSql<T>(bindings: Bindings, ctx: ExecutionContext, fn: () => Promise<T>): Promise<T> {
  const client = createSql(bindings.HYPERDRIVE.connectionString, { max: 5, fetch_types: false })
  return requestSql.run(client, async () => {
    try {
      return await fn()
    } finally {
      ctx.waitUntil(client.end())
    }
  })
}

export default {
  fetch(request, bindings, ctx) {
    return withRequestSql(bindings, ctx, async () => (await getApp(bindings)).fetch(request))
  },

  queue(batch, bindings, ctx) {
    return withRequestSql(bindings, ctx, () => runQueueBatch(batch, { sql }))
  },
} satisfies ExportedHandler<Bindings, JobMessage>
