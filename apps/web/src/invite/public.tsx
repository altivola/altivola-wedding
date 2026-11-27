import { useQuery } from '@tanstack/react-query'
import { useParams, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { orpc } from '@/lib/orpc'
import { Invitation } from './render'
import { Stage } from './stage'
import './stage.css'

export function PublicInvitationPage() {
  const { slug } = useParams({ from: '/u/$slug' })
  const { tamu, untuk } = useSearch({ from: '/u/$slug' })
  const code = tamu && /^[a-z0-9]{6}$/.test(tamu) ? tamu : undefined
  const invitation = useQuery({
    ...orpc.invitations.view.queryOptions({ input: { slug, code } }),
    retry: false,
    staleTime: 60_000,
  })
  const data = invitation.data

  useEffect(() => {
    if (!data) return
    const names = `${data.doc.names.bride} & ${data.doc.names.groom}`
    document.title = data.doc.lang === 'id' ? `Undangan ${names}` : `The wedding of ${names}`
  }, [data])

  if (invitation.isPending) {
    return (
      <div className="stage" style={{ background: 'var(--hb-paper)' }}>
        <div className="stage-message">
          <p>Membuka undangan...</p>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="stage" style={{ background: 'var(--hb-paper)' }}>
        <div className="stage-message">
          <h1>Undangan tidak ditemukan</h1>
          <p>Periksa lagi link-nya, atau tanyakan ke mempelai.</p>
          <a href="/">hari bersama</a>
        </div>
      </div>
    )
  }
  return (
    <Stage theme={data.doc.theme}>
      <Invitation
        doc={data.doc}
        mode="live"
        slug={data.slug}
        guest={data.guest}
        untuk={data.guest ? undefined : untuk?.trim() || undefined}
        wishes={data.wishes}
      />
    </Stage>
  )
}
