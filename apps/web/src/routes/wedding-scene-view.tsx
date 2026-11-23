import { useEffect, useRef } from 'react'
import type { mountWeddingScene } from './wedding-scene'

type SceneController = ReturnType<typeof mountWeddingScene>
type SceneState = Parameters<SceneController['update']>[0]

export function WeddingSceneView({ image, theme, chapter, room }: SceneState) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<SceneController>(null)
  const state = useRef({ image, theme, chapter, room })
  useEffect(() => {
    state.current = { image, theme, chapter, room }
    scene.current?.update(state.current)
  }, [image, theme, chapter, room])

  useEffect(() => {
    let mounted = true
    void import('./wedding-scene')
      .then(({ mountWeddingScene }) => {
        if (!mounted || !host.current) return
        scene.current = mountWeddingScene(host.current)
        scene.current.update(state.current)
      })
      .catch(() => {
        // The layered image remains visible on devices without WebGL.
      })
    return () => {
      mounted = false
      scene.current?.dispose()
      scene.current = null
    }
  }, [])

  return <div ref={host} className="wedding-scene" aria-hidden="true" />
}
