import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { setActiveDraft } from '@/lib/drafts'
import { client } from '@/lib/orpc'
import { Invitation } from './render'
import { Stage } from './stage'
import './stage.css'

/** The draft as guests will see it, opened from the studio in a new tab. */
export function DraftPreviewPage() {
  const { id } = useParams({ from: '/pratinjau/$id' })
  const query = useQuery({
    queryKey: ['draft-preview', id],
    queryFn: () => {
      setActiveDraft(id)
      return client.invitations.get({ id })
    },
    retry: false,
  })
  if (!query.data) {
    return (
      <div className="stage" style={{ background: 'var(--hb-paper)' }}>
        <div className="stage-message">
          {query.isPending ? <p>Membuka pratinjau...</p> : <h1>Pratinjau tidak bisa dibuka di browser ini</h1>}
        </div>
      </div>
    )
  }
  return (
    <Stage
      theme={query.data.draft.theme}
      bar={
        <div className="stage-bar">
          <Link to="/studio/$id" params={{ id }} className="stage-chip">
            ‹ Studio
          </Link>
          <span className="stage-chip">Pratinjau</span>
        </div>
      }
    >
      <Invitation doc={query.data.draft} mode="preview" slug={query.data.slug} />
    </Stage>
  )
}
