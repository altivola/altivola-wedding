import type { Router } from '@app/api'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { activeDraftToken } from './drafts'

// Same origin as the page, so the session cookie is sent without extra setup.
// Drafts started without an account are edited with their token instead.
const link = new RPCLink({
  url: `${window.location.origin}/rpc`,
  headers: (): Record<string, string> => {
    const token = activeDraftToken()
    return token ? { 'x-draft-token': token } : {}
  },
})

export const client: RouterClient<Router> = createORPCClient(link)
export const orpc = createTanstackQueryUtils(client)

export function errorMessage(error: unknown, fallback = 'Ada yang salah. Coba lagi.') {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message
    if (message && !/^[A-Z_]+$/.test(message) && !message.startsWith('Input validation')) return message
  }
  return fallback
}
