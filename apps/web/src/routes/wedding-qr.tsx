import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export async function scanGuestCode(video: HTMLVideoElement, signal: AbortSignal) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  const stop = () => {
    for (const track of stream.getTracks()) track.stop()
  }
  try {
    if (signal.aborted) return
    signal.addEventListener('abort', stop, { once: true })
    video.srcObject = stream
    await video.play()
    const { default: decode } = await import('jsqr')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Camera canvas unavailable')
    while (!signal.aborted) {
      await new Promise((resolve) => window.setTimeout(resolve, 150))
      if (!video.videoWidth || signal.aborted) continue
      canvas.width = Math.min(video.videoWidth, 640)
      canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      const result = decode(frame.data, frame.width, frame.height)
      if (result) return result.data
    }
  } finally {
    signal.removeEventListener('abort', stop)
    stop()
    video.srcObject = null
  }
}

export function GuestQr({ weddingId, guestId }: { weddingId: string; guestId: string }) {
  const [image, setImage] = useState('')
  useEffect(() => {
    let active = true
    void QRCode.toDataURL(`hari-bersama:${weddingId}:${guestId}`, { width: 240, margin: 3 }).then(
      (url) => {
        if (active) setImage(url)
      },
      () => {
        if (active) setImage('')
      },
    )
    return () => {
      active = false
    }
  }, [weddingId, guestId])
  return image ? (
    <img className="guest-check-in-qr" src={image} alt="Kode QR untuk absensi" width={240} height={240} />
  ) : null
}
