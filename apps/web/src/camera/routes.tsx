// Route components for the guest disposable camera. The router lazy loads them by name.
import type { ReactElement } from 'react'
import { WithInvitation } from '@/booth/routes'
import { demoData } from '@/booth/shared'
import { CameraFlow } from './flow'

export function CameraDemoPage(): ReactElement {
  return <CameraFlow data={demoData} />
}

export function CameraPublicPage(): ReactElement {
  return <WithInvitation>{(data) => <CameraFlow data={data} />}</WithInvitation>
}
