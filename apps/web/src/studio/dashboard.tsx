import { type ThemeId, themes } from '@app/api/invitation-model'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { authClient } from '@/lib/auth'
import { localDrafts } from '@/lib/drafts'
import { orpc } from '@/lib/orpc'
import { SiteNav } from '@/site/layout'
import { ThemeThumb } from '@/site/theme-thumb'
import './studio.css'

function when(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DashboardPage() {
  const { data: session, isPending } = authClient.useSession()
  const mine = useQuery({ ...orpc.invitations.mine.queryOptions(), enabled: Boolean(session) })
  const drafts = localDrafts().filter((draft) => !mine.data?.some((item) => item.id === draft.id))
  useEffect(() => {
    document.title = 'Studio · Hari Bersama'
  }, [])
  return (
    <div className="site">
      <SiteNav />
      <main className="dash">
        <div className="dash-head">
          <div>
            <h1>Undanganmu</h1>
            <p className="st-muted">
              {session
                ? `Masuk sebagai ${session.user.email}`
                : 'Masuk untuk melihat undangan yang tersimpan di akunmu.'}
            </p>
          </div>
          <Link to="/buat" className="st-button is-dark is-large">
            Buat undangan baru
          </Link>
        </div>
        {!session && !isPending && (
          <div className="st-banner">
            <div>
              <strong>Belum masuk</strong>
              <p>Draf tanpa akun hanya ada di browser ini dan dihapus setelah 3 hari.</p>
            </div>
            <Link to="/login" search={{ next: '/studio' }} className="st-button is-dark is-small">
              Masuk
            </Link>
          </div>
        )}
        <div className="dash-grid">
          {mine.data?.map((item) => (
            <Link key={item.id} to="/studio/$id" params={{ id: item.id }} className="dash-card">
              <div className="dash-card-art">
                <ThemeThumb theme={item.theme as ThemeId} names={[item.bride || 'Wanita', item.groom || 'Pria']} />
              </div>
              <div className="dash-card-body">
                <div className="st-row is-between">
                  <strong>
                    {item.bride} &amp; {item.groom}
                  </strong>
                  <span className={`st-chip ${item.publishedAt ? 'is-green' : ''}`}>
                    {item.publishedAt ? 'Terbit' : 'Draf'}
                  </span>
                </div>
                <span className="st-muted">
                  {themes.find((theme) => theme.id === item.theme)?.name} · diubah {when(item.updatedAt)}
                </span>
                <div className="dash-stats">
                  <span>
                    <b>{item.guests}</b> tamu
                  </span>
                  <span>
                    <b>{item.attending}</b> hadir
                  </span>
                  <span>
                    <b>{item.wishes}</b> ucapan
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {drafts.map((draft) => (
            <Link key={draft.id} to="/studio/$id" params={{ id: draft.id }} className="dash-card is-local">
              <div className="dash-card-body">
                <strong>Draf tanpa akun</strong>
                <span className="st-muted">Dibuat {when(draft.createdAt)} di browser ini</span>
                <span className="st-chip is-warn">
                  {session ? 'Buka untuk menyimpan ke akunmu' : 'Belum tersimpan'}
                </span>
              </div>
            </Link>
          ))}
          {session && mine.isSuccess && mine.data.length === 0 && drafts.length === 0 && (
            <div className="dash-empty">
              <p>Belum ada undangan. Mulai dari memilih tema.</p>
              <Link to="/tema" className="st-button">
                Lihat tema
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
