import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useStudio } from './context'

/** Tabs that need an account, and for some, a published invitation. */
export function Gate({
  children,
  needsPublish = false,
  what,
}: {
  children: ReactNode
  needsPublish?: boolean
  what: string
}) {
  const { owned, invitation, requireAccount } = useStudio()
  if (!owned) {
    return (
      <div className="st-locked">
        <h2>Masuk untuk membuka {what}</h2>
        <p className="st-muted">
          Draf ini belum tersimpan di akun. Setelah masuk, semua yang sudah kamu isi tetap ada.
        </p>
        <button
          type="button"
          className="st-button is-dark"
          onClick={() => requireAccount(`Masuk untuk membuka ${what}.`)}
        >
          Daftar / Masuk
        </button>
      </div>
    )
  }
  if (needsPublish && !invitation.slug) {
    return (
      <div className="st-locked">
        <h2>Terbitkan undangan dulu</h2>
        <p className="st-muted">
          {what} memakai alamat undanganmu. Pilih alamatnya lewat tombol Terbitkan di kanan atas.
        </p>
        <Link to="/studio/$id" params={{ id: invitation.id }} className="st-button">
          Kembali ke builder
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
