import { type InvitationDoc, publishProblems, themes } from '@app/api/invitation-model'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authClient } from '@/lib/auth'
import { draftToken, forgetDraft, setActiveDraft } from '@/lib/drafts'
import { client, errorMessage } from '@/lib/orpc'
import { copyText, toast } from '@/lib/toast'
import { ThemeThumb } from '@/site/theme-thumb'
import { type Editable, liveUrl, type SaveState, StudioContext, type StudioValue } from './context'
import { Icon, type IconName } from './icons'
import { Modal } from './modal'
import './studio.css'

type TabRoute =
  | '/studio/$id'
  | '/studio/$id/tamu'
  | '/studio/$id/booth'
  | '/studio/$id/kamera'
  | '/studio/$id/ucapan'
  | '/studio/$id/check-in'
  | '/studio/$id/pengaturan'

const tabs: { to: TabRoute; slug: string; label: string; icon: IconName; needsAccount?: boolean }[] = [
  { to: '/studio/$id', slug: '', label: 'Builder', icon: 'brush' },
  { to: '/studio/$id/tamu', slug: 'tamu', label: 'Tamu', icon: 'users', needsAccount: true },
  { to: '/studio/$id/booth', slug: 'booth', label: 'Booth', icon: 'booth', needsAccount: true },
  { to: '/studio/$id/kamera', slug: 'kamera', label: 'Kamera', icon: 'camera', needsAccount: true },
  { to: '/studio/$id/ucapan', slug: 'ucapan', label: 'Ucapan', icon: 'heart', needsAccount: true },
  { to: '/studio/$id/check-in', slug: 'check-in', label: 'Check-in', icon: 'scan', needsAccount: true },
  { to: '/studio/$id/pengaturan', slug: 'pengaturan', label: 'Pengaturan', icon: 'gear' },
]

export function suggestSlug(doc: InvitationDoc) {
  return `${doc.names.bride}-${doc.names.groom}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function PublishDialog({ value, onClose }: { value: StudioValue; onClose: () => void }) {
  const { invitation, doc, saveNow, refresh } = value
  const [slug, setSlug] = useState(invitation.slug ?? suggestSlug(doc))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const clean = slug.trim().toLowerCase()
  const valid = /^[a-z0-9](-?[a-z0-9])*$/.test(clean) && clean.length >= 3 && clean.length <= 40
  const available = useQuery({
    queryKey: ['slug', clean, invitation.id],
    queryFn: () => client.invitations.slugAvailable({ slug: clean, id: invitation.id }),
    enabled: valid,
    staleTime: 10_000,
  })
  const problems = publishProblems(doc)
  const publish = async () => {
    setBusy(true)
    setError('')
    try {
      await saveNow()
      const result = await client.invitations.publish({ id: invitation.id, slug: clean })
      await refresh()
      setDone(result.slug)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal label="Terbitkan" onClose={onClose}>
      {done ? (
        <>
          <h2>Undanganmu sudah terbit</h2>
          <p className="st-muted">
            Bagikan link ini, atau tambahkan tamu supaya setiap orang dapat link dengan namanya.
          </p>
          <div className="st-link-box">{liveUrl(done)}</div>
          <div className="st-row">
            <button
              type="button"
              className="st-button is-dark"
              onClick={() => void copyText(liveUrl(done), 'Link disalin')}
            >
              Salin link
            </button>
            <a className="st-button" href={liveUrl(done)} target="_blank" rel="noreferrer">
              Buka
            </a>
            <Link to="/studio/$id/tamu" params={{ id: invitation.id }} className="st-button" onClick={onClose}>
              Tambah tamu
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2>{invitation.publishedAt ? 'Terbitkan perubahan' : 'Terbitkan undangan'}</h2>
          <p className="st-muted">
            {invitation.publishedAt
              ? 'Tamu langsung melihat versi terbaru. Link yang sudah dikirim tetap sama.'
              : 'Pilih alamat undanganmu. Alamat ini yang dibagikan ke tamu.'}
          </p>
          {problems.length > 0 && (
            <ul className="st-problems">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          <label className="st-label" htmlFor="slug">
            Alamat undangan
          </label>
          <div className="st-slug">
            <span>{window.location.host}/u/</span>
            <input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={40} />
          </div>
          <p className={cn('st-hint', valid && available.data?.available === false && 'is-bad')}>
            {!valid
              ? 'Pakai 3 sampai 40 huruf kecil, angka, atau tanda hubung.'
              : available.isFetching
                ? 'Mengecek...'
                : available.data?.available
                  ? 'Alamat ini bisa dipakai.'
                  : 'Alamat ini sudah dipakai.'}
          </p>
          {error && <p className="st-error">{error}</p>}
          <div className="st-row is-end">
            <button type="button" className="st-button" onClick={onClose}>
              Batal
            </button>
            <button
              type="button"
              className="st-button is-dark"
              disabled={busy || !valid || available.data?.available === false || problems.length > 0}
              onClick={publish}
            >
              {busy ? 'Menerbitkan...' : 'Terbitkan'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

export function StudioShell() {
  const { id } = useParams({ from: '/studio/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const path = useRouterState({ select: (state) => state.location.pathname })
  const { data: session, isPending: sessionPending } = authClient.useSession()
  setActiveDraft(id)
  const query = useQuery({
    queryKey: ['studio', id, session?.user.id ?? null],
    queryFn: async () => {
      const token = draftToken(id)
      if (session && token) {
        const claimed = await client.invitations.claim({ id, token }).catch(() => ({ ok: false }))
        if (claimed.ok) forgetDraft(id)
      }
      return client.invitations.get({ id })
    },
    enabled: !sessionPending,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const [invitation, setInvitation] = useState<Editable | null>(null)
  const [doc, setDoc] = useState<InvitationDoc | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [publishing, setPublishing] = useState(false)
  const pending = useRef<InvitationDoc | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (query.data) {
      setInvitation(query.data)
      setDoc((current) => (current && pending.current ? current : query.data.draft))
    }
  }, [query.data])

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const next = pending.current
    if (!next) return
    pending.current = null
    setSaveState('saving')
    try {
      setActiveDraft(id)
      await client.invitations.save({ id, draft: next })
      setSaveState(pending.current ? 'unsaved' : 'saved')
    } catch (error) {
      pending.current = pending.current ?? next
      setSaveState('error')
      toast(errorMessage(error, 'Gagal menyimpan. Coba lagi sebentar.'))
    }
  }, [id])

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (pending.current) event.preventDefault()
    }
    const hide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    window.addEventListener('beforeunload', leave)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('beforeunload', leave)
      document.removeEventListener('visibilitychange', hide)
      void flush()
    }
  }, [flush])

  const update = useCallback(
    (change: (doc: InvitationDoc) => InvitationDoc) => {
      setDoc((current) => {
        if (!current) return current
        const next = change(current)
        pending.current = next
        return next
      })
      setSaveState('unsaved')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), 900)
    },
    [flush],
  )

  const refresh = useCallback(async () => {
    const fresh = await client.invitations.get({ id })
    setInvitation(fresh)
    await queryClient.invalidateQueries({ queryKey: ['studio', id] })
  }, [id, queryClient])

  const requireAccount = useCallback(
    (reason: string) => {
      void flush().then(() =>
        navigate({
          to: '/login',
          search: { next: `/studio/${id}${path.replace(`/studio/${id}`, '')}`, alasan: reason },
        }),
      )
    },
    [flush, id, navigate, path],
  )

  const value = useMemo<StudioValue | null>(
    () =>
      invitation && doc
        ? {
            invitation,
            doc,
            update,
            saveState,
            saveNow: flush,
            owned: invitation.owned && Boolean(session),
            signedIn: Boolean(session),
            refresh,
            requireAccount,
          }
        : null,
    [invitation, doc, update, saveState, flush, session, refresh, requireAccount],
  )

  if (query.isError) {
    return (
      <div className="st-empty-page">
        <h1>Undangan tidak ditemukan</h1>
        <p>
          Mungkin sudah dihapus, atau dibuat di browser lain tanpa akun. Draf tanpa akun hanya bisa dibuka di browser
          yang membuatnya.
        </p>
        <div className="st-row">
          <Link to="/studio" className="st-button">
            Ke dashboard
          </Link>
          <Link to="/buat" className="st-button is-dark">
            Buat undangan
          </Link>
        </div>
      </div>
    )
  }
  if (!value) return <div className="st-empty-page">Membuka studio...</div>

  const theme = themes.find((item) => item.id === value.doc.theme)
  const current = path.replace(`/studio/${id}`, '').replace(/^\//, '')
  const tab = tabs.find((item) => item.slug === current) ?? tabs[0]
  const names = `${value.doc.names.bride || 'Wanita'} & ${value.doc.names.groom || 'Pria'}`
  const saveLabel = {
    saved: 'Tersimpan',
    saving: 'Menyimpan...',
    unsaved: 'Belum tersimpan',
    error: 'Gagal tersimpan',
  }[saveState]

  return (
    <StudioContext.Provider value={value}>
      <div className="st">
        <aside className="st-rail" aria-label="Navigasi studio">
          <Link to="/studio" className="st-rail-item is-home" aria-label="Dashboard">
            <Icon name="home" />
            <span>Dashboard</span>
          </Link>
          <div className="st-rail-thumb" title={theme?.name}>
            <ThemeThumb theme={value.doc.theme} />
          </div>
          <nav className="st-rail-tabs">
            {tabs.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                params={{ id }}
                className={cn('st-rail-item', item === tab && 'is-active')}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.needsAccount && !value.owned && <i className="st-dot" aria-hidden="true" />}
              </Link>
            ))}
          </nav>
          <div className="st-rail-bottom">
            {session ? (
              <button
                type="button"
                className="st-avatar"
                title={`${session.user.email} · Keluar`}
                onClick={async () => {
                  await flush()
                  await authClient.signOut()
                  await navigate({ to: '/' })
                }}
              >
                {(session.user.name || session.user.email).slice(0, 1).toUpperCase()}
              </button>
            ) : (
              <Link to="/login" search={{ next: `/studio/${id}` }} className="st-avatar is-guest" title="Masuk">
                ?
              </Link>
            )}
          </div>
        </aside>
        <div className="st-main">
          <header className="st-header">
            <div>
              <h1>{names}</h1>
              <p>
                Undangan · {tab?.label}
                <span className={cn('st-save', `is-${saveState}`)}>{saveLabel}</span>
              </p>
            </div>
            <div className="st-header-actions">
              {value.invitation.slug && value.invitation.publishedAt && (
                <a
                  className="st-button is-small"
                  href={liveUrl(value.invitation.slug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="external" /> Lihat undangan
                </a>
              )}
              {value.owned ? (
                <button type="button" className="st-button is-dark is-small" onClick={() => setPublishing(true)}>
                  <Icon name="send" /> {value.invitation.publishedAt ? 'Terbitkan perubahan' : 'Terbitkan'}
                </button>
              ) : (
                <button
                  type="button"
                  className="st-button is-dark is-small"
                  onClick={() => requireAccount('Daftar atau masuk untuk menyimpan dan menerbitkan undangan ini.')}
                >
                  <Icon name="send" /> Daftar untuk terbit
                </button>
              )}
            </div>
          </header>
          {!value.owned && (
            <div className="st-banner">
              <Icon name="cloud" />
              <div>
                <strong>Simpan drafmu</strong>
                <p>
                  Daftar supaya undangan ini tidak hilang. Draf tanpa akun dihapus 3 hari setelah dibuat
                  {value.invitation.expiresAt
                    ? `, yaitu ${new Date(value.invitation.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`
                    : ''}
                  .
                </p>
              </div>
              <button
                type="button"
                className="st-button is-dark is-small"
                onClick={() => requireAccount('Daftar untuk menyimpan undangan ini.')}
              >
                Daftar / Masuk
              </button>
            </div>
          )}
          <Outlet />
        </div>
        <nav className="st-tabbar" aria-label="Navigasi studio">
          {tabs.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              params={{ id }}
              className={cn('st-tabbar-item', item === tab && 'is-active')}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        {publishing && <PublishDialog value={value} onClose={() => setPublishing(false)} />}
      </div>
    </StudioContext.Provider>
  )
}
