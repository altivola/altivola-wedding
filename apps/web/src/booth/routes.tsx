// Route components for the guest photobooth and album. The router lazy loads them by name.
import { useParams } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { AlbumPage } from './album'
import { BoothFlow } from './flow'
import { demoData, type GuestData, LoadingScreen, PrimaryButton, StatusScreen, useGuestData } from './shared'

export function BoothDemoPage(): ReactElement {
  return <BoothFlow data={demoData} />
}

export function BoothPublicPage(): ReactElement {
  return <WithInvitation>{(data) => <BoothFlow data={data} />}</WithInvitation>
}

export function AlbumPublicPage(): ReactElement {
  return <WithInvitation>{(data) => <AlbumPage data={data} />}</WithInvitation>
}

/** Loads the live invitation for the slug in the URL and shows friendly states while it does. */
export function WithInvitation({ children }: { children: (data: GuestData) => ReactElement }): ReactElement {
  const { slug } = useParams({ strict: false })
  const view = useGuestData(slug)
  if (!slug) return <NotFound />
  if (view.isPending) return <LoadingScreen />
  if (view.isError) {
    const status = (view.error as { status?: number } | null)?.status
    if (status === 404) return <NotFound />
    return (
      <StatusScreen
        title="Halaman belum bisa dibuka"
        text="Periksa koneksi internetmu, lalu coba lagi."
        action={
          <PrimaryButton className="mt-3 max-w-[240px]" onClick={() => void view.refetch()}>
            Coba lagi
          </PrimaryButton>
        }
      />
    )
  }
  return children(view.data)
}

function NotFound() {
  return (
    <StatusScreen
      title="Undangan tidak ditemukan"
      text="Link ini mungkin salah ketik atau undangannya belum diterbitkan. Cek lagi link dari pengantin ya."
    />
  )
}
