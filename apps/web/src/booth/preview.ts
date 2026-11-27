import { useEffect, useState } from 'react'
import { type FrameId, type FrameText, type LayoutId, renderStrip, type ShotSource, sampleShots } from './frames'

/** A small JPEG data URL of a frame, with the guest's shots or the sample picture. */
export function useStripPreview(
  layoutId: LayoutId,
  frameId: FrameId,
  text: FrameText,
  shots: (ShotSource | undefined)[] | undefined,
  scale: number,
) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    ;(async () => {
      const source = shots ?? (await sampleShots().catch(() => []))
      const canvas = await renderStrip(layoutId, frameId, source, text, scale)
      if (active) setUrl(canvas.toDataURL('image/jpeg', 0.86))
    })().catch(() => undefined)
    return () => {
      active = false
    }
  }, [layoutId, frameId, text, shots, scale])
  return url
}
