import type { InvitationDoc } from '@app/api/invitation-model'
import { createContext, useContext } from 'react'
import type { client } from '@/lib/orpc'

export type Editable = Awaited<ReturnType<typeof client.invitations.get>>
export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

export type StudioValue = {
  invitation: Editable
  /** The draft as edited in this tab. Saved automatically shortly after each change. */
  doc: InvitationDoc
  update: (change: (doc: InvitationDoc) => InvitationDoc) => void
  saveState: SaveState
  saveNow: () => Promise<void>
  /** Signed in and the invitation belongs to this account. Guests, booth, camera and check-in need it. */
  owned: boolean
  signedIn: boolean
  /** Reloads the invitation from the server, for example after settings change. */
  refresh: () => Promise<void>
  /** Asks the creator to sign in, then keeps the draft on their account. */
  requireAccount: (reason: string) => void
}

export const StudioContext = createContext<StudioValue | null>(null)

export function useStudio() {
  const value = useContext(StudioContext)
  if (!value) throw new Error('useStudio must be used inside the studio')
  return value
}

export function liveUrl(slug: string) {
  return `${window.location.origin}/u/${slug}`
}
