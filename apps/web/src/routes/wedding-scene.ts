import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TorusGeometry,
  WebGLRenderer,
} from 'three'

type SceneState = { image: string; theme: string; chapter: string; room?: string }

const finishes: Record<string, [string, string, string]> = {
  garden: ['#465942', '#e5cb96', '#93835b'],
  night: ['#181b34', '#b98a61', '#6b4566'],
  print: ['#714c59', '#e78f62', '#453976'],
}

export function mountWeddingScene(host: HTMLElement) {
  const renderer = new WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65))
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.append(renderer.domElement)

  const world = new Scene()
  const camera = new PerspectiveCamera(36, 1, 0.1, 70)
  camera.position.set(0, 1.7, 12.8)
  const board = new Group()
  world.add(board)
  world.add(new AmbientLight('#fff1de', 1.6))
  const key = new DirectionalLight('#fff3da', 2.4)
  key.position.set(-3, 8, 6)
  world.add(key)

  const frame = new MeshStandardMaterial({ color: '#e5cb96', roughness: 0.66 })
  const decoration = new MeshStandardMaterial({ color: '#93835b', roughness: 0.47 })
  const floorMaterial = new MeshStandardMaterial({ color: '#465942', roughness: 0.92 })
  const posterMaterial = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
  const cube = new BoxGeometry()
  const orb = new SphereGeometry(1, 14, 10)
  const picture = new PlaneGeometry(7.7, 4.34)
  const poster = new Mesh(picture, posterMaterial)
  poster.position.set(0, 1.03, 0.1)
  board.add(poster)

  function box(
    parent: Group | Scene,
    material: MeshStandardMaterial | MeshBasicMaterial,
    size: number[],
    position: number[],
  ) {
    const mesh = new Mesh(cube, material)
    mesh.scale.set(size[0] ?? 1, size[1] ?? 1, size[2] ?? 1)
    mesh.position.set(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0)
    parent.add(mesh)
    return mesh
  }

  box(board, frame, [8.06, 4.67, 0.24], [0, 1.03, -0.05])
  box(board, frame, [0.18, 4.67, 0.24], [-3.95, 1.03, 0.11])
  box(board, frame, [0.18, 4.67, 0.24], [3.95, 1.03, 0.11])
  box(board, frame, [8, 0.18, 0.24], [0, 3.28, 0.11])
  box(board, frame, [8, 0.18, 0.24], [0, -1.22, 0.11])
  box(world, floorMaterial, [73, 0.12, 35], [3, -2.12, 0])
  box(world, decoration, [8.75, 0.38, 2.15], [0, -1.9, 0.04])
  box(world, frame, [5.7, 0.1, 1.28], [0, -1.64, 0.18])
  for (const side of [-1, 1]) {
    box(world, decoration, [0.65, 0.88, 0.65], [side * 4.05, -1.6, 1.42])
    const bead = new Mesh(orb, frame)
    bead.scale.setScalar(0.26)
    bead.position.set(side * 4.05, -0.95, 1.42)
    world.add(bead)
  }

  const studio = new Group()
  studio.position.x = -11
  world.add(studio)
  box(studio, decoration, [7.8, 0.3, 5], [0, -1.9, 0])
  box(studio, frame, [6, 0.24, 3], [0, -0.01, 1.1])
  for (const x of [-2.4, 2.4]) {
    box(studio, frame, [0.28, 1.7, 0.28], [x, -0.87, 1.1])
    box(studio, decoration, [1, 0.22, 1.4], [x, 0.2, 0.7])
  }
  for (const x of [-1.15, 0, 1.15]) {
    const sample = box(studio, frame, [1.05, 1.55, 0.15], [x, 1, 0.36])
    sample.rotation.set(-0.31, x * 0.13, x * 0.075)
  }

  const album = new Group()
  album.position.x = 11
  world.add(album)
  box(album, decoration, [7.8, 0.29, 4.4], [0, -1.9, 0.2])
  for (const x of [-2.2, 0, 2.2]) {
    const stand = box(album, frame, [1.82, 2.62, 0.24], [x, 0.6, 0])
    stand.rotation.y = -x * 0.13
    const insert = new Mesh(picture, posterMaterial)
    insert.scale.set(0.2, 0.5, 1)
    insert.rotation.y = -x * 0.13
    insert.position.set(x, 0.68, 0.15)
    album.add(insert)
    box(album, decoration, [0.28, 1.3, 0.28], [x, -1.18, 0])
  }

  const send = new Group()
  send.position.x = 21
  world.add(send)
  box(send, decoration, [7.3, 0.3, 4.8], [0, -1.9, 0])
  box(send, frame, [3.6, 1.8, 1.1], [0, -0.85, 0.16])
  for (const x of [-1.64, 1.64]) box(send, frame, [0.62, 3.05, 0.64], [x, 0.12, 0])
  for (const x of [-1.05, 0, 1.05]) {
    const letter = box(send, decoration, [1.25, 0.85, 0.09], [x, 1.34 + Math.abs(x) * 0.25, 0.55])
    letter.rotation.z = x * 0.23
  }
  box(world, frame, [39, 0.018, 0.9], [4.6, -2.049, 2.9])

  const archGeometry = new TorusGeometry(2.47, 0.11, 8, 30, Math.PI)
  const lanternMaterial = new MeshBasicMaterial({ color: '#ffe3a6', toneMapped: false })
  for (const roomX of [-11, 0, 11, 21]) {
    const arch = new Mesh(archGeometry, frame)
    arch.position.set(roomX, 2.75, -2.05)
    arch.scale.set(1.52, 0.85, 1)
    world.add(arch)
    for (const offset of [-3.75, 3.75]) {
      box(world, frame, [0.23, 4.8, 0.34], [roomX + offset, 0.35, -2.05])
      box(world, decoration, [0.58, 0.13, 0.61], [roomX + offset, 2.44, -1.98])
      box(world, lanternMaterial, [0.28, 0.4, 0.29], [roomX + offset, 2.19, -1.77])
    }
  }
  for (let step = -15; step <= 24; step += 2) {
    const tile = box(world, decoration, [0.52, 0.022, 0.52], [step, -2.039, 2.9])
    tile.rotation.y = Math.PI / 4
  }

  const origin = host.parentElement
  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  const loader = new TextureLoader()
  let texture: Texture | undefined
  let image = ''
  let disposed = false
  let animation = 0
  let dragging = false
  let pointerX = 0
  let pointerY = 0
  let targetX = 0
  let targetY = 0
  let targetZ = 12.8
  let targetRotation = 0
  let center = 0
  let framedCenter = 0

  function draw() {
    animation = 0
    const desiredX = targetX + pointerX
    const desiredY = targetY + pointerY
    const easing = preference.matches ? 1 : 0.11
    camera.position.x += (desiredX - camera.position.x) * easing
    camera.position.y += (desiredY - camera.position.y) * easing
    camera.position.z += (targetZ - camera.position.z) * easing
    board.rotation.y += (targetRotation - board.rotation.y) * easing
    framedCenter += (center - framedCenter) * easing
    camera.lookAt(framedCenter, 0.45, 0)
    renderer.render(world, camera)
    if (
      Math.abs(camera.position.x - desiredX) +
        Math.abs(camera.position.y - desiredY) +
        Math.abs(camera.position.z - targetZ) +
        Math.abs(board.rotation.y - targetRotation) +
        Math.abs(center - framedCenter) >
      0.012
    )
      requestDraw()
  }

  function requestDraw() {
    if (!animation && !disposed) animation = requestAnimationFrame(draw)
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.fov = width / height < 1.23 ? 45 : 36
    camera.updateProjectionMatrix()
    requestDraw()
  }

  function onMove(event: PointerEvent) {
    if (preference.matches || (event.pointerType === 'touch' && !dragging)) return
    if (!origin) return
    const bounds = origin.getBoundingClientRect()
    pointerX = ((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 2.2
    pointerY = ((event.clientY - bounds.top - bounds.height / 2) / bounds.height) * -1.2
    requestDraw()
  }

  function resetPointer() {
    dragging = false
    pointerX = 0
    pointerY = 0
    requestDraw()
  }

  function pointerDown() {
    dragging = true
  }
  function loseContext() {
    delete host.dataset.ready
  }
  function restoreContext() {
    if (texture) host.dataset.ready = 'true'
    requestDraw()
  }

  renderer.domElement.addEventListener('webglcontextlost', loseContext)
  renderer.domElement.addEventListener('webglcontextrestored', restoreContext)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  origin?.addEventListener('pointermove', onMove)
  origin?.addEventListener('pointerdown', pointerDown)
  origin?.addEventListener('pointerup', resetPointer)
  origin?.addEventListener('pointerleave', resetPointer)
  origin?.addEventListener('pointercancel', resetPointer)
  preference.addEventListener('change', resetPointer)
  resize()

  return {
    update(state: SceneState) {
      const [background, material, detail] = finishes[state.theme] ??
        finishes.garden ?? ['#465942', '#e5cb96', '#93835b']
      world.background = new Color(background)
      floorMaterial.color.set(background)
      frame.color.set(material)
      decoration.color.set(detail)
      center = state.room === 'studio' ? -11 : state.room === 'album' ? 11 : state.room === 'send' ? 21 : 0
      targetX = center + (state.chapter === 'Album' ? -1.3 : state.chapter === 'Acara' ? 1.35 : 0)
      targetY = state.room === 'entry' ? 5.4 : state.chapter === 'Acara' ? 3.5 : 2.6
      targetZ = state.room === 'entry' ? 23 : state.room ? 13 : 12.8
      targetRotation = state.chapter === 'Album' ? 0.13 : state.chapter === 'Acara' ? -0.14 : 0
      if (state.image !== image) {
        image = state.image
        loader.load(state.image, (loaded) => {
          if (disposed || state.image !== image) {
            loaded.dispose()
            return
          }
          texture?.dispose()
          texture = loaded
          loaded.colorSpace = SRGBColorSpace
          posterMaterial.map = loaded
          posterMaterial.needsUpdate = true
          host.dataset.ready = 'true'
          requestDraw()
        })
      }
      requestDraw()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(animation)
      observer.disconnect()
      origin?.removeEventListener('pointermove', onMove)
      origin?.removeEventListener('pointerdown', pointerDown)
      origin?.removeEventListener('pointerup', resetPointer)
      origin?.removeEventListener('pointerleave', resetPointer)
      origin?.removeEventListener('pointercancel', resetPointer)
      preference.removeEventListener('change', resetPointer)
      texture?.dispose()
      for (const resource of [
        cube,
        orb,
        picture,
        frame,
        decoration,
        floorMaterial,
        posterMaterial,
        archGeometry,
        lanternMaterial,
      ])
        resource.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', loseContext)
      renderer.domElement.removeEventListener('webglcontextrestored', restoreContext)
      renderer.dispose()
      renderer.domElement.remove()
      delete host.dataset.ready
    },
  }
}
