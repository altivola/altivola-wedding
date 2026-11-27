import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { useState } from 'react'
import { client, errorMessage, orpc } from '@/lib/orpc'
import { toast } from '@/lib/toast'
import { useStudio } from './context'
import { Gate } from './gate'
import { Icon } from './icons'

function WishList() {
  const { invitation } = useStudio()
  const queryClient = useQueryClient()
  const wishes = useQuery(orpc.invitations.wishes.queryOptions({ input: { id: invitation.id } }))
  const [search, setSearch] = useState('')
  const list = (wishes.data ?? []).filter((wish) =>
    `${wish.name} ${wish.message}`.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const toggle = async (wishId: string, hidden: boolean) => {
    try {
      await client.invitations.hideWish({ id: invitation.id, wishId, hidden })
      await queryClient.invalidateQueries({ queryKey: orpc.invitations.wishes.key({ input: { id: invitation.id } }) })
    } catch (error) {
      toast(errorMessage(error))
    }
  }
  const hidden = (wishes.data ?? []).filter((wish) => wish.hidden).length
  return (
    <>
      <div className="st-stats">
        <div className="st-stat">
          <b>{wishes.data?.length ?? 0}</b>
          <span>ucapan</span>
        </div>
        <div className="st-stat">
          <b>{hidden}</b>
          <span>disembunyikan</span>
        </div>
      </div>
      <div className="st-card">
        <div className="st-row is-between">
          <h2>Ucapan dan doa</h2>
          <label className="st-search" style={{ maxWidth: 320 }}>
            <Icon name="search" size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari ucapan" />
          </label>
        </div>
        <p className="st-muted">
          Sembunyikan ucapan yang tidak ingin tampil di undangan. Kamu tetap bisa membacanya di sini.
        </p>
        <div className="st-list" style={{ marginTop: 10 }}>
          {wishes.isSuccess && list.length === 0 && <p className="st-muted">Belum ada ucapan.</p>}
          {list.map((wish) => (
            <div
              key={wish.id}
              className={cn('st-list-row', wish.hidden && 'is-muted')}
              style={{ opacity: wish.hidden ? 0.55 : 1 }}
            >
              <div className="st-list-main">
                <strong>{wish.name}</strong>
                <span style={{ color: 'var(--hb-ink)', fontSize: 14 }}>{wish.message}</span>
                <span>
                  {new Date(wish.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <button type="button" className="st-button is-small" onClick={() => toggle(wish.id, !wish.hidden)}>
                <Icon name={wish.hidden ? 'eye' : 'eyeOff'} size={15} /> {wish.hidden ? 'Tampilkan' : 'Sembunyikan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function WishesPage() {
  return (
    <div className="st-page">
      <Gate what="ucapan">
        <WishList />
      </Gate>
    </div>
  )
}
