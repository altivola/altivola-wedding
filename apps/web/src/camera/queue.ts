// Develops and uploads camera shots one by one in the background, so a slow
// network never blocks the next shot. Failed uploads are retried with backoff.
import { useCallback, useEffect, useRef, useState } from 'react'
import { jpegUnder, wait } from '@/booth/media'
import { client, errorMessage } from '@/lib/orpc'
import { develop } from './films'

type Job = { raw: HTMLCanvasElement | null; at: Date; flash: boolean; jpeg: string | null; tries: number }

export type QueueOptions = {
  /** `null` in demo mode: shots are developed and kept on this device only. */
  slug: string | null
  rollId: string | null
  film: string
  /** Shots left on the roll, as the server counts them after an upload. */
  onLeft: (left: number) => void
  /** The server refused the shot for good, for example a full or missing roll. */
  onRejected: (status: number, message: string) => void
  onDeveloped?: (url: string) => void
}

// The API accepts up to 1.2 million base64 characters per shot.
const maxChars = 1_150_000

export function useShotQueue(options: QueueOptions) {
  const jobs = useRef<Job[]>([])
  const running = useRef(false)
  const wake = useRef<(() => void) | null>(null)
  const latest = useRef(options)
  const [pending, setPending] = useState(0)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    latest.current = options
  })

  const sync = useCallback(() => setPending(jobs.current.length), [])

  const pump = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      while (jobs.current.length) {
        const job = jobs.current[0] as Job
        const current = latest.current
        if (!job.jpeg && job.raw) {
          // Give the flash a moment to paint before the heavy pixel work.
          await wait(60)
          try {
            const canvas = await develop(job.raw, current.film, { at: job.at, flash: job.flash })
            job.jpeg = jpegUnder(canvas, maxChars, 0.86)
          } catch {
            jobs.current.shift()
            sync()
            current.onRejected(0, 'Satu foto gagal diproses. Coba jepret lagi.')
            continue
          }
          job.raw = null
          current.onDeveloped?.(`data:image/jpeg;base64,${job.jpeg}`)
        }
        if (!current.slug || !current.rollId || !job.jpeg) {
          jobs.current.shift()
          sync()
          continue
        }
        try {
          const { left } = await client.invitations.cameraShot({
            slug: current.slug,
            rollId: current.rollId,
            jpeg: job.jpeg,
          })
          jobs.current.shift()
          sync()
          setRetrying(false)
          latest.current.onLeft(left)
        } catch (error) {
          const status = (error as { status?: number } | null)?.status
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            jobs.current.shift()
            sync()
            setRetrying(false)
            latest.current.onRejected(status, errorMessage(error))
            continue
          }
          job.tries++
          setRetrying(true)
          await new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, Math.min(30_000, 1500 * 2 ** Math.min(job.tries, 5)))
            wake.current = () => {
              window.clearTimeout(timer)
              resolve()
            }
          })
          wake.current = null
        }
      }
    } finally {
      running.current = false
    }
  }, [sync])

  useEffect(() => {
    const onOnline = () => wake.current?.()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // Warn before leaving while shots are still on this device.
  useEffect(() => {
    if (!pending || !options.slug) return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [pending, options.slug])

  const add = useCallback(
    (raw: HTMLCanvasElement, flash: boolean) => {
      jobs.current.push({ raw, at: new Date(), flash, jpeg: null, tries: 0 })
      sync()
      void pump()
    },
    [pump, sync],
  )

  const retryNow = useCallback(() => wake.current?.(), [])

  return { add, pending, retrying, retryNow }
}
