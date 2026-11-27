import { themes } from '@app/api/invitation-model'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { forgetDraft } from '@/lib/drafts'
import { client, errorMessage } from '@/lib/orpc'
import { copyText, toast } from '@/lib/toast'
import { liveUrl, useStudio } from './context'
import { Icon } from './icons'

function when(value: string | null) {
  return value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : 'Belum'
}

export function SettingsPage() {
  const { invitation, doc, owned, requireAccount } = useStudio()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const theme = themes.find((item) => item.id === doc.theme)
  const remove = async () => {
    setBusy(true)
    try {
      await client.invitations.remove({ id: invitation.id })
      forgetDraft(invitation.id)
      toast('Undangan dihapus')
      await navigate({ to: '/studio' })
    } catch (error) {
      toast(errorMessage(error))
      setBusy(false)
    }
  }
  return (
    <div className="st-page">
      <div className="st-card">
        <h2>Tentang undangan ini</h2>
        <div className="st-list" style={{ marginTop: 8 }}>
          <div className="st-list-row">
            <div className="st-list-main">
              <strong>Alamat</strong>
              <span>{invitation.slug ? liveUrl(invitation.slug) : 'Dipilih saat terbit'}</span>
            </div>
            {invitation.slug && (
              <button
                type="button"
                className="st-button is-small"
                onClick={() => void copyText(liveUrl(invitation.slug ?? ''), 'Link disalin')}
              >
                <Icon name="copy" size={15} /> Salin
              </button>
            )}
          </div>
          <div className="st-list-row">
            <div className="st-list-main">
              <strong>Tema</strong>
              <span>{theme?.name}</span>
            </div>
          </div>
          <div className="st-list-row">
            <div className="st-list-main">
              <strong>Terbit</strong>
              <span>{when(invitation.publishedAt)}</span>
            </div>
          </div>
          <div className="st-list-row">
            <div className="st-list-main">
              <strong>Dibuat</strong>
              <span>{when(invitation.createdAt)}</span>
            </div>
          </div>
          <div className="st-list-row">
            <div className="st-list-main">
              <strong>Penyimpanan</strong>
              <span>
                {owned
                  ? 'Tersimpan di akunmu'
                  : `Draf tanpa akun, dihapus ${invitation.expiresAt ? when(invitation.expiresAt) : 'setelah 3 hari'}`}
              </span>
            </div>
            {!owned && (
              <button
                type="button"
                className="st-button is-small is-dark"
                onClick={() => requireAccount('Masuk untuk menyimpan undangan ini.')}
              >
                Simpan ke akun
              </button>
            )}
          </div>
        </div>
        <p className="st-hint">
          Alamat undangan bisa diganti lewat tombol Terbitkan. Link lama berhenti bekerja setelah alamat diganti.
        </p>
      </div>
      {owned && (
        <div className="st-card">
          <h2>Hapus undangan</h2>
          <p className="st-muted">
            Undangan, daftar tamu, ucapan, foto, strip photobooth, dan foto kamera ikut terhapus. Tidak bisa dibatalkan.
          </p>
          <label className="st-label" style={{ marginTop: 12 }}>
            Ketik HAPUS untuk konfirmasi
            <input
              className="st-input"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              style={{ maxWidth: 260 }}
            />
          </label>
          <button
            type="button"
            className="st-button"
            style={{ marginTop: 12, borderColor: 'var(--hb-terra)', color: 'var(--hb-terra)' }}
            disabled={confirm !== 'HAPUS' || busy}
            onClick={remove}
          >
            <Icon name="trash" size={15} /> Hapus selamanya
          </button>
        </div>
      )}
    </div>
  )
}
