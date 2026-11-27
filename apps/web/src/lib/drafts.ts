// Drafts started without an account are kept in this browser with their edit token.
const storageKey = 'hb-drafts'
let active: string | null = null

type Stored = Record<string, { token: string; createdAt: string }>

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Stored
  } catch {
    return {}
  }
}

function write(value: Stored) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Private mode: the draft still works for this tab through the active token.
  }
}

export function rememberDraft(id: string, token: string) {
  write({ ...read(), [id]: { token, createdAt: new Date().toISOString() } })
}

export function draftToken(id: string) {
  return read()[id]?.token ?? null
}

export function forgetDraft(id: string) {
  const all = read()
  delete all[id]
  write(all)
}

export function localDrafts() {
  return Object.entries(read()).map(([id, value]) => ({ id, ...value }))
}

/** Sends this draft's token with API calls until another draft is opened. */
export function setActiveDraft(id: string | null) {
  active = id ? draftToken(id) : null
}

export function activeDraftToken() {
  return active
}
