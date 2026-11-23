import type { GardenCharacter, GardenMap } from '@app/api/wedding-design'
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

export type GardenStation = 'album' | 'event' | 'rsvp'
export type AlbumCamera = { view: 'overview' | 'eye'; zoom: number; angle: number }
export type GardenPhoto = { src: string; caption: string }
export type GardenPlace = { id: string; label: string }
const landscapes = {
  twilight: {
    sky: '#1a273c',
    ground: '#38554b',
    path: '#9b8274',
    water: '#377b89',
    trees: ['#38685c', '#647c67', '#a37488'],
    ponds: [[6, 2.3]],
    sites: [
      [-9, -8],
      [9, -8],
      [-10, 6],
      [10, 6],
      [0, -15],
      [0, 13],
    ],
    seed: 1847,
  },
  ponds: {
    sky: '#174758',
    ground: '#477268',
    path: '#b8a47c',
    water: '#28678b',
    trees: ['#396467', '#7d9e85', '#3f7881'],
    ponds: [
      [-5.4, -5.7],
      [6, 4.7],
      [5.8, -8.5],
    ],
    sites: [
      [0, -13],
      [-11, 1],
      [11, -2],
      [0, 13],
      [-11, -10],
      [11, 10],
    ],
    seed: 3059,
  },
  orchard: {
    sky: '#493653',
    ground: '#655966',
    path: '#bd8e7f',
    water: '#775f90',
    trees: ['#8a657e', '#bc8eab', '#cba6a3'],
    ponds: [[-3.5, 8]],
    sites: [
      [-12, 1],
      [0, -12],
      [10, 7],
      [11, -7],
      [-8, -11],
      [0, 13],
    ],
    seed: 9884,
  },
  city: {
    sky: '#15132d',
    ground: '#282b48',
    path: '#ec9c9e',
    water: '#4c4871',
    trees: ['#4e4673', '#665c86', '#986f94'],
    ponds: [],
    sites: [
      [-12, -11],
      [0, -14],
      [12, -10],
      [12, 7],
      [-12, 7],
      [0, 14],
    ],
    seed: 4984,
  },
  shore: {
    sky: '#172d43',
    ground: '#c89974',
    path: '#6d5362',
    water: '#286980',
    trees: ['#466f74', '#6e8b72', '#50938a'],
    ponds: [],
    sites: [
      [-11, -6],
      [0, -14],
      [11, -6],
      [11, 7],
      [-11, 7],
      [0, 13],
    ],
    seed: 2691,
  },
} as const

export type GardenOptions = {
  map: GardenMap
  character: GardenCharacter
  event?: { date: string; venue: string }
  onSwim?: (swimming: boolean) => void
}
const seedSites = [
  [-4, -4],
  [4, -3],
  [0, -11],
  [-6, 8],
  [5, 9],
] as const

export function mountGarden(
  host: HTMLElement,
  places: GardenPlace[],
  onNear: (place: GardenPlace | null) => void,
  onPick: (count: number) => void,
  photos: GardenPhoto[],
  onPhoto: (index: number) => void,
  options: GardenOptions,
) {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.55))
  host.append(renderer.domElement)
  const scene = new Scene()
  const landscape = landscapes[options.map]
  const { sites } = landscape
  scene.background = new Color(landscape.sky)
  scene.fog = new FogExp2(landscape.sky, 0.025)
  scene.add(new AmbientLight('#a3b9ec', 2.1))
  const light = new DirectionalLight('#ffceac', 3.4)
  light.position.set(-10, 24, 10)
  scene.add(light)
  const camera = new PerspectiveCamera(44, 1, 0.1, 110)
  const cube = new BoxGeometry()
  const sphere = new SphereGeometry(1, 11, 8)
  const cone = new ConeGeometry(1, 1, 7)
  const disc = new CylinderGeometry(1, 1, 1, 28)
  const arch = new TorusGeometry(1.52, 0.12, 8, 24, Math.PI)
  const material = (color: string) => new MeshStandardMaterial({ color, roughness: 0.82 })
  const ground = material(landscape.ground)
  const edge = material('#243941')
  const path = material(landscape.path)
  const wood = material('#6b483f')
  const leaves = landscape.trees.map(material)
  const paints = ['#d5ae7d', '#c68684', '#9b9cd3', '#8eac93', '#dcaa8d', '#b4adcb'].map(material)
  const glow = new MeshBasicMaterial({ color: '#ffe3a0', toneMapped: false })
  const flame = new MeshBasicMaterial({ color: '#fff8cd', toneMapped: false })
  const playerPaint = material('#edaa79')
  const scarf = material('#8d597a')
  const pond = material(landscape.water)
  const flower = material('#d8a4b1')
  function mesh(
    parent: Group | Scene,
    geometry: typeof cube | typeof sphere | typeof cone | typeof disc | typeof arch,
    mat: MeshStandardMaterial | MeshBasicMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const object = new Mesh(geometry, mat)
    object.position.set(x, y, z)
    object.scale.set(sx, sy, sz)
    parent.add(object)
    return object
  }
  const city = options.map === 'city'
  const shore = options.map === 'shore'
  const obstacles: { x: number; z: number; r: number }[] = []
  const inChannel = (x: number, z: number) => shore && Math.abs(z) < 16 && Math.abs(Math.abs(x) - 5.5) < 3.5
  function waterHeight(x: number, z: number): number | null {
    if (inChannel(x, z) && Math.abs(z - 6) > 1.3 && Math.abs(z + 6) > 1.3) return 0.038
    if (landscape.ponds.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.98)) return 0.178
    return null
  }
  const props = [material('#313557'), material('#4a4466'), material('#675370')]
  mesh(scene, cube, edge, 0, -0.9, 0, 42, 1.4, 43)
  if (city) {
    // The playable deck stands above a separate skyline.
    for (let col = -5; col <= 5; col += 1) {
      const towerX = col * 5.2
      const height = 7 + (Math.abs(col * 7) % 6)
      const towerZ = -25 - ((col * col) % 4)
      mesh(scene, cube, props[Math.abs(col) % 3] ?? edge, towerX, height / 2 - 5, towerZ, 3.2, height, 3.0)
      for (let row = 0; row < 4; row += 1) {
        for (const dx of [-0.8, 0.8]) {
          if ((row + col + dx) % 3 > 1.5) continue
          mesh(scene, cube, glow, towerX + dx, row * 1.55 - 1.8, towerZ + 1.51, 0.36, 0.58, 0.028)
        }
      }
    }
    for (const [x, z] of [
      [-7, 1.2],
      [7, -1.3],
      [-7, -8],
      [7, -9],
    ] as const) {
      mesh(scene, cube, props[1] ?? edge, x, 1.84, z, 2.1, 3.68, 2.14)
      mesh(scene, cube, glow, x, 3.7, z, 2.24, 0.1, 2.24)
      for (let row = 0; row < 4; row += 1) {
        for (const dx of [-0.57, 0.57]) mesh(scene, cube, glow, x + dx, 0.48 + row * 0.8, z + 1.08, 0.3, 0.42, 0.018)
      }
      obstacles.push({ x, z, r: 1.22 })
    }
    for (const x of [-19, 19]) {
      mesh(scene, cube, wood, x, 0.38, 0, 0.26, 0.72, 38)
      mesh(scene, cube, glow, x, 0.77, 0, 0.075, 0.045, 38)
    }
  }
  if (shore) {
    mesh(scene, cube, pond, 0, -0.67, 0, 110, 0.14, 110)
    mesh(scene, disc, flame, 12, 10, -32, 2.15, 0.087, 2.15).rotation.x = Math.PI / 2
    for (let step = -36; step < 36; step += 3) {
      mesh(scene, cube, props[2] ?? edge, step, -0.57, -21.4, 2.5, 0.045, 0.16)
      mesh(scene, cube, props[2] ?? edge, step, -0.57, 22.4, 2.5, 0.045, 0.16)
    }
  }
  mesh(scene, cube, ground, 0, -0.2, 0, 41, 0.4, 42)
  if (shore) {
    for (const channel of [-5.5, 5.5]) {
      mesh(scene, cube, pond, channel, 0.019, 0, 7, 0.035, 32)
      for (let ripple = -14; ripple < 15; ripple += 2) {
        mesh(scene, cube, props[2] ?? edge, channel + Math.sin(ripple) * 0.85, 0.039, ripple, 0.74, 0.016, 0.13)
      }
    }
  }
  for (let i = -14; i <= 14; i += 2) {
    if (city || shore) {
      for (const x of [-11, 0, 11]) {
        mesh(scene, cube, path, x, 0.017, i, shore ? 2.6 : 1.7, 0.06, 1.88)
        if (shore) mesh(scene, cube, wood, x + 1.26, 0.14, i, 0.12, 0.3, 0.12)
        else mesh(scene, cube, glow, x + 0.78, 0.059, i, 0.065, 0.035, 0.5)
      }
      if (shore) for (const z of [-6, 6]) mesh(scene, cube, path, i, 0.065, z, 1.92, 0.095, 2.6)
      else mesh(scene, cube, path, i, 0.019, 0, 1.92, 0.04, 1.66)
      continue
    }
    const bend = options.map === 'orchard' ? Math.sin(i / 4) * 2.3 : options.map === 'ponds' ? Math.sin(i / 7) * 1.2 : 0
    mesh(scene, cube, path, bend, 0.015, i, 1.48, 0.04, 1.65).rotation.y = Math.sin(i) * 0.06
    mesh(scene, cube, path, i, 0.02, -bend, 1.65, 0.04, 1.48).rotation.y = Math.sin(i) * 0.08
  }
  for (const [px, pz] of landscape.ponds) {
    mesh(scene, disc, edge, px, 0.05, pz, 2.2, 0.16, 2.2)
    mesh(scene, disc, pond, px, 0.14, pz, 1.98, 0.075, 1.98)
    for (const [dx, dz] of [
      [-0.6, -0.3],
      [0.8, 0.3],
      [0, 1],
    ] as const) {
      mesh(scene, disc, leaves[1] ?? ground, px + dx, 0.19, pz + dz, 0.32, 0.045, 0.24)
      mesh(scene, sphere, flower, px + dx, 0.28, pz + dz, 0.12, 0.11, 0.12)
    }
  }
  let randomSeed: number = landscape.seed
  function random() {
    randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0
    return randomSeed / 4294967296
  }
  for (let i = 0; i < (city ? 15 : shore ? 24 : 43); i++) {
    const x = random() * 36 - 18
    const z = random() * 36 - 18
    if (
      inChannel(x, z) ||
      Math.abs(x) < 2 ||
      Math.abs(z) < 2 ||
      sites.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 3.6) ||
      landscape.ponds.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3)
    )
      continue
    if (city) {
      mesh(scene, cube, props[0] ?? edge, x, 0.28, z, 0.9, 0.56, 0.9)
      mesh(scene, cube, glow, x, 0.58, z, 0.5, 0.07, 0.5)
      obstacles.push({ x, z, r: 0.52 })
      continue
    }
    const height = 1.7 + random() * 1.5
    mesh(scene, cube, wood, x, height * 0.4, z, 0.22, height, 0.22)
    mesh(
      scene,
      options.map === 'orchard' || shore ? sphere : cone,
      leaves[i % 3] ?? ground,
      x,
      height + 0.58,
      z,
      height * 0.47,
      height * 1.08,
      height * 0.47,
    ).rotation.y = i * 0.45
    mesh(
      scene,
      options.map === 'orchard' || shore ? sphere : cone,
      leaves[(i + 1) % 3] ?? ground,
      x,
      height * 1.22,
      z,
      height * 0.36,
      height * 0.89,
      height * 0.36,
    ).rotation.y = i * 0.21
    obstacles.push({ x, z, r: 0.49 })
  }
  for (let i = 0; i < 95; i++) {
    const x = random() * 38 - 19
    const z = random() * 38 - 19
    if (inChannel(x, z) || Math.abs(x) < 1.2 || Math.abs(z) < 1.2) continue
    mesh(scene, sphere, leaves[i % 3] ?? ground, x, 0.09, z, 0.16, 0.17, 0.16)
    if (i % 3 === 0) mesh(scene, sphere, flower, x, 0.23, z, 0.088, 0.076, 0.088)
  }
  const signs: { texture: CanvasTexture; material: SpriteMaterial }[] = []
  function sign(landmark: Group, label: string) {
    const plate = document.createElement('canvas')
    plate.width = 512
    plate.height = 128
    const paint = plate.getContext('2d')
    if (!paint) return
    paint.fillStyle = '#222338'
    paint.beginPath()
    paint.roundRect(22, 17, 468, 94, 24)
    paint.fill()
    paint.strokeStyle = '#ecc795'
    paint.lineWidth = 3
    paint.stroke()
    paint.fillStyle = '#ffefd1'
    paint.textAlign = 'center'
    paint.textBaseline = 'middle'
    paint.font = '600 38px Georgia'
    paint.fillText(label, 256, 67, 430)
    const texture = new CanvasTexture(plate)
    texture.colorSpace = SRGBColorSpace
    const material = new SpriteMaterial({ map: texture, depthWrite: false, toneMapped: false })
    signs.push({ texture, material })
    const sprite = new Sprite(material)
    sprite.position.set(0, 4.18, 0)
    sprite.scale.set(3.4, 0.85, 1)
    landmark.add(sprite)
  }
  const destinations = places.slice(0, sites.length).map((place, index) => {
    const [x, z] = sites[index] ?? sites[0]
    const mat = paints[index] ?? ground
    mesh(scene, disc, path, x, 0.079, z, 2.45, 0.16, 2.45)
    mesh(scene, disc, mat, x, 0.18, z, 1.86, 0.16, 1.86)
    const landmark = new Group()
    scene.add(landmark)
    landmark.position.set(x, 0, z)
    sign(landmark, place.label)
    mesh(landmark, arch, mat, 0, 2.17, 0, 1, 1, 1)
    for (const dx of [-1.53, 1.53]) {
      mesh(landmark, cube, mat, dx, 1.13, 0, 0.21, 2.31, 0.26)
      mesh(landmark, cube, wood, dx * 1.08, 0.4, 1.4, 0.17, 0.8, 0.17)
      mesh(landmark, sphere, glow, dx * 1.08, 0.89, 1.4, 0.123, 0.146, 0.123)
    }
    if ((place.id !== 'album' || !photos.length) && place.id !== 'event' && place.id !== 'rsvp') {
      mesh(landmark, cone, mat, 0, 1.17, 0, 0.72, 1.5, 0.72).rotation.z = Math.PI
      mesh(landmark, sphere, flame, 0, 1.86, 0, 0.38, 0.38, 0.38)
    }
    return { ...place, x, z }
  })
  const plaques: { texture: CanvasTexture; material: MeshBasicMaterial }[] = []
  const plaqueGeometry = new PlaneGeometry(1, 1)
  function plaque(parent: Group, title: string, x: number, y: number, z: number, width: number) {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 384
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    const surface = new MeshBasicMaterial({ map: texture, toneMapped: false })
    plaques.push({ texture, material: surface })
    const board = new Mesh(plaqueGeometry, surface)
    board.position.set(x, y, z)
    board.scale.set(width, width / 2, 1)
    parent.add(board)

    return (lines: string[]) => {
      context.fillStyle = '#211c32'
      context.fillRect(0, 0, 768, 384)
      context.lineWidth = 5
      context.strokeStyle = '#eac897'
      context.strokeRect(14, 14, 740, 356)
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = '#ffe9bf'
      context.font = 'bold 54px Georgia'
      context.fillText(title, 384, 82, 682)
      context.fillStyle = '#fff5e6'
      context.font = '600 40px system-ui'
      const rows: string[] = []
      for (const line of lines) {
        let row = ''
        for (const word of line.trim().split(/\s+/)) {
          const next = row ? `${row} ${word}` : word
          if (row && context.measureText(next).width > 660) {
            rows.push(row)
            row = word
          } else row = next
        }
        if (row) rows.push(row)
      }
      const shown = rows.slice(0, 4)
      for (const [i, row] of shown.entries())
        context.fillText(i === 3 && rows.length > 4 ? `${row}…` : row, 384, 154 + i * 51, 672)
      texture.needsUpdate = true
    }
  }
  const eventPlace = destinations.find((place) => place.id === 'event')
  const rsvpPlace = destinations.find((place) => place.id === 'rsvp')
  if (eventPlace) {
    const pavilion = new Group()
    pavilion.position.set(eventPlace.x, 0, eventPlace.z - 1)
    scene.add(pavilion)
    for (const x of [-2, 2]) {
      for (const z of [-1.3, 1.3]) mesh(pavilion, cube, wood, x, 1.82, z, 0.22, 3.7, 0.22)
    }
    mesh(pavilion, cone, paints[0] ?? wood, 0, 4.1, 0, 2.7, 1.04, 1.56)
    mesh(pavilion, cube, wood, 0, 1.62, 0, 3.55, 1.87, 0.15)
    plaque(pavilion, 'Jadwal & lokasi', 0, 1.62, 0.086, 3.4)?.([options.event?.date ?? '', options.event?.venue ?? ''])
  }
  const book = new Group()
  book.position.set(0, 0.99, -0.38)
  const bookCover = new Group()
  bookCover.position.set(-0.54, 0.12, 0)
  const rsvpLamp = new MeshBasicMaterial({ color: '#9b7468', toneMapped: false })
  let updateRsvpSign: ((lines: string[]) => void) | undefined
  if (rsvpPlace) {
    const table = new Group()
    table.position.set(rsvpPlace.x, 0, rsvpPlace.z - 1.1)
    scene.add(table)
    mesh(table, cube, wood, 0, 0.83, 0, 2.3, 0.15, 1.35)
    for (const x of [-0.84, 0.84]) mesh(table, cube, wood, x, 0.39, 0, 0.12, 0.8, 0.12)
    updateRsvpSign = plaque(table, 'RSVP · Buku tamu', 0, 2.02, -0.96, 3.2)
    updateRsvpSign?.(['Konfirmasi kehadiran', 'Hadir · Berhalangan'])
    table.add(book)
    book.add(bookCover)
    mesh(book, cube, path, 0, 0, 0, 1.1, 0.13, 0.74)
    mesh(bookCover, cube, scarf, 0.54, 0.015, 0, 1.1, 0.08, 0.77)
    mesh(table, cube, wood, 0.79, 1.03, 0.1, 0.18, 0.28, 0.18)
    mesh(table, sphere, rsvpLamp, 0.79, 1.25, 0.1, 0.14, 0.2, 0.14)
  }
  const albumPlace = destinations.find((place) => place.id === 'album')
  const albumGroup = new Group()
  const printPlane = new PlaneGeometry(1, 1)
  const photoMaterials: (MeshBasicMaterial | MeshStandardMaterial)[] = []
  const photoMeshes: Mesh[] = []
  const photoTextures = new Set<Texture>()
  let destroyed = false
  if (albumPlace && photos.length) {
    scene.add(albumGroup)
    albumGroup.position.set(albumPlace.x, 0, albumPlace.z - 2)
    const paper = material('#ffe9c0')
    const curtain = material('#593f58')
    photoMaterials.push(paper, curtain)
    mesh(albumGroup, cube, curtain, 0, 1.55, -1.25, 7.6, 3.7, 0.14)
    mesh(albumGroup, cube, wood, 0, 3.55, -0.6, 7.8, 0.13, 0.17)
    for (const x of [-3.82, 3.82]) mesh(albumGroup, cube, wood, x, 1.78, -0.6, 0.17, 3.58, 0.17)
    const loader = new TextureLoader()
    photos.forEach((photo, index) => {
      const columns = Math.min(4, photos.length)
      const x = ((index % columns) - (columns - 1) / 2) * 1.75
      const y = index < 4 ? 2.61 : 1.05
      const frame = new Group()
      frame.position.set(x, y, -0.98)
      frame.rotation.z = index % 2 ? 0.055 : -0.06
      albumGroup.add(frame)
      mesh(frame, cube, paper, 0, 0, 0, 1.52, 1.4, 0.08)
      const drop = new MeshBasicMaterial({ color: '#754662', toneMapped: false })
      photoMaterials.push(drop)
      const picture = new Mesh(printPlane, drop)
      picture.position.set(0, 0.06, 0.048)
      picture.scale.set(1.33, 1.04, 1)
      frame.add(picture)
      photoMeshes.push(picture)
      picture.userData.index = index
      mesh(albumGroup, cube, wood, x, (3.55 + y + 0.67) / 2, -0.94, 0.018, Math.max(0.04, 3.55 - y - 0.67), 0.018)
      mesh(frame, sphere, glow, 0, 0.73, 0.18, 0.085, 0.085, 0.085)
      loader.load(photo.src, (texture) => {
        if (destroyed) {
          texture.dispose()
          return
        }
        texture.colorSpace = SRGBColorSpace
        const meta = texture.image as { width: number; height: number }
        const sourceAspect = meta.width / meta.height
        const frameAspect = 1.33 / 1.04
        if (sourceAspect > frameAspect) {
          texture.repeat.x = frameAspect / sourceAspect
          texture.offset.x = (1 - texture.repeat.x) / 2
        } else {
          texture.repeat.y = sourceAspect / frameAspect
          texture.offset.y = (1 - texture.repeat.y) / 2
        }
        photoTextures.add(texture)
        drop.color.set('#ffffff')
        drop.map = texture
        drop.needsUpdate = true
      })
    })
  }
  const shoreSeeds = [
    [-4, -6],
    [4, -6],
    [0, -11],
    [-6, 6],
    [5, 6],
  ] as const
  const seeds = (shore ? shoreSeeds : seedSites).map(([x, z]) => ({
    x,
    z,
    mesh: mesh(scene, sphere, glow, x, 0.8, z, 0.14, 0.14, 0.14),
    collected: false,
  }))
  const trail: Mesh[] = []
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2
    const lamp = mesh(scene, sphere, glow, Math.cos(angle) * 3.15, 0.17, Math.sin(angle) * 3.15, 0.085, 0.08, 0.085)
    lamp.visible = false
    trail.push(lamp)
  }
  const player = new Group()
  scene.add(player)
  player.position.set(0, 0, 5)
  player.rotation.order = 'YXZ'
  if (options.character === 'lantern') {
    mesh(player, cone, playerPaint, 0, 0.52, 0, 0.42, 1, 0.36)
    mesh(player, sphere, playerPaint, 0, 1.1, 0, 0.29, 0.31, 0.29)
    mesh(player, cube, scarf, 0, 0.82, 0.2, 0.54, 0.18, 0.18)
    mesh(player, sphere, flame, 0, 0.88, 0.48, 0.16, 0.2, 0.16)
  } else {
    const hare = options.character === 'hare'
    const coat = hare ? flower : playerPaint
    mesh(player, sphere, coat, 0, 0.51, 0, 0.39, 0.46, 0.37)
    mesh(player, sphere, coat, 0, 0.99, 0.12, 0.34, 0.32, 0.33)
    for (const side of [-1, 1]) {
      const ear = mesh(
        player,
        hare ? sphere : cone,
        coat,
        side * 0.19,
        hare ? 1.46 : 1.28,
        0.1,
        0.109,
        hare ? 0.34 : 0.27,
        0.12,
      )
      ear.rotation.z = side * (hare ? -0.24 : -0.36)
      mesh(player, sphere, wood, side * 0.116, 1.02, 0.415, 0.04, 0.045, 0.027)
      mesh(player, sphere, coat, side * 0.21, 0.15, 0.22, 0.16, 0.12, 0.2)
    }
    mesh(player, sphere, flower, 0, 0.92, 0.451, 0.062, 0.044, 0.034)
    mesh(player, sphere, coat, 0.19, 0.52, -0.35, 0.21, hare ? 0.17 : 0.34, 0.17).rotation.z = -0.45
  }
  const wakeGeometry = new RingGeometry(0.84, 1, 32)
  const wake = Array.from({ length: 2 }, () => {
    const ripple = new Mesh(
      wakeGeometry,
      new MeshBasicMaterial({
        color: '#d5f2f0',
        transparent: true,
        depthWrite: false,
      }),
    )
    ripple.rotation.x = -Math.PI / 2
    ripple.visible = false
    scene.add(ripple)
    return ripple
  })
  let swimming = false
  const shadow = mesh(scene, disc, edge, 0, 0.035, 5, 0.52, 0.035, 0.37)
  const target = new Vector3()
  const raycaster = new Raycaster()
  const vector = new Vector2()
  const landing = mesh(scene, disc, glow, 0, 0.061, 0, 0.2, 0.035, 0.2)
  landing.visible = false
  let station: GardenStation | null = null
  let albumCamera: AlbumCamera = { view: 'overview', zoom: 0, angle: 0 }
  let rsvpSaved = false
  let walkingTo: { x: number; z: number } | null = null
  let last = 0
  let frame = 0
  let nextPlace: GardenPlace | null = null
  let picked = 0
  let axisX = 0
  let axisZ = 0
  const keys = new Set<string>()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const directions = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'])
  function blocked(x: number, z: number) {
    return Math.abs(x) > 19.5 || Math.abs(z) > 19.5 || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.25)
  }
  function resize() {
    if (!host.clientWidth || !host.clientHeight) return
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  const warmLight = new Color('#ffd8ad')
  const gardenLight = new Color('#ffceac')
  const dimLamp = new Color('#9b7468')
  const cameraTarget = new Vector3(0, 13, 19)
  const lookTarget = new Vector3(0, 0, 3.5)
  camera.position.copy(cameraTarget)
  camera.lookAt(lookTarget)
  function groundHit(event: PointerEvent) {
    const rect = host.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    vector.set(((event.clientX - rect.left) / rect.width) * 2 - 1, (-(event.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(vector, camera)
    const { origin, direction } = raycaster.ray
    const distance = -origin.y / direction.y
    return distance > 0 ? origin.clone().addScaledVector(direction, distance) : null
  }
  function point(event: PointerEvent) {
    if (event.button !== 0) return
    const hit = groundHit(event)
    if (station === 'album') {
      const target = raycaster.intersectObjects(photoMeshes)[0]
      const index: unknown = target?.object.userData.index
      if (typeof index === 'number') onPhoto(index)
      return
    }
    if (event.pointerType === 'touch' || station || !hit || Math.abs(hit.x) > 19 || Math.abs(hit.z) > 19) return
    walkingTo = { x: hit.x, z: hit.z }
    landing.position.set(hit.x, 0.061, hit.z)
    landing.visible = true
  }
  function keyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLElement && event.target.matches('input,textarea,select,[contenteditable]')) return
    const key = event.key.toLowerCase()
    if (!directions.has(key) || station) return
    event.preventDefault()
    keys.add(key)
    walkingTo = null
    landing.visible = false
  }
  function keyUp(event: KeyboardEvent) {
    keys.delete(event.key.toLowerCase())
  }
  function clear() {
    keys.clear()
    axisX = 0
    axisZ = 0
  }
  host.addEventListener('pointerdown', point)
  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('blur', clear)
  function animate(now: number) {
    if (destroyed) return
    frame = requestAnimationFrame(animate)
    const delta = Math.min(0.035, (now - (last || now)) / 1000)
    last = now
    const p = player.position
    let x = axisX + Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
    let z = axisZ + Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'))
    if (walkingTo && !x && !z) {
      x = walkingTo.x - p.x
      z = walkingTo.z - p.z
      if (Math.hypot(x, z) < 0.25) {
        walkingTo = null
        landing.visible = false
        x = 0
        z = 0
      }
    }
    const speed = Math.hypot(x, z)
    const moving = speed > 0.01
    if (moving) {
      const travel = delta * (swimming ? 3.4 : 5.9) * (walkingTo ? 1 : Math.min(speed, 1))
      const dx = (x / speed) * travel
      const dz = (z / speed) * travel
      const beforeX = p.x
      const beforeZ = p.z
      if (!blocked(p.x + dx, p.z)) p.x += dx
      if (!blocked(p.x, p.z + dz)) p.z += dz
      if (walkingTo && p.x === beforeX && p.z === beforeZ) {
        walkingTo = null
        landing.visible = false
      }
      player.rotation.y = Math.atan2(x, z)
    }
    const surface = waterHeight(p.x, p.z)
    if (swimming !== (surface !== null)) {
      swimming = surface !== null
      options.onSwim?.(swimming)
    }
    const waterMotion = reduced.matches ? 0 : Math.sin(now * 0.008)
    const pitch = swimming && moving ? 0.86 + waterMotion * 0.1 : 0
    const playerHeight =
      surface === null
        ? moving && !reduced.matches
          ? Math.abs(Math.sin(now * 0.014)) * 0.12
          : 0
        : surface - 0.47 + waterMotion * 0.055
    const blend = reduced.matches ? 1 : Math.min(1, delta * 13)
    p.y += (playerHeight - p.y) * blend
    player.rotation.x += (pitch - player.rotation.x) * blend
    player.rotation.z = swimming && moving ? waterMotion * 0.18 : 0
    shadow.visible = !swimming
    wake.forEach((ripple, index) => {
      ripple.visible = surface !== null && !reduced.matches
      if (surface === null) return
      const phase = (now * (moving ? 0.0022 : 0.00105) + index / wake.length) % 1
      ripple.position.set(p.x, surface + 0.034, p.z)
      ripple.scale.setScalar(0.34 + phase * 0.85)
      ripple.material.opacity = (1 - phase) * (moving ? 0.57 : 0.27)
    })
    shadow.position.x = p.x
    shadow.position.z = p.z
    const place = destinations.find((item) => Math.hypot(item.x - p.x, item.z - p.z) < 2.55) ?? null
    if (place?.id !== nextPlace?.id) {
      nextPlace = place
      onNear(place)
    }
    for (const seed of seeds) {
      if (seed.collected) continue
      if (!reduced.matches) seed.mesh.position.y = 0.8 + Math.sin(now * 0.002 + seed.x) * 0.18
      if (Math.hypot(seed.x - p.x, seed.z - p.z) < 0.83) {
        seed.collected = true
        seed.mesh.visible = false
        picked++
        light.intensity = 3.4 + picked * 0.27
        trail.slice(0, picked * 4).forEach((lamp) => {
          lamp.visible = true
        })
        if (picked === seeds.length) {
          scene.background = new Color('#493452')
          scene.fog = new FogExp2('#493452', 0.025)
          light.color.set('#ffd2a6')
        }
        onPick(picked)
      }
    }
    light.color.lerp(station ? warmLight : gardenLight, reduced.matches ? 1 : 0.045)
    target.set(p.x, 13, p.z + 14)
    const placeForCamera =
      station === 'album' ? albumPlace : station === 'event' ? eventPlace : station === 'rsvp' ? rsvpPlace : null
    if (placeForCamera) {
      const eye = station === 'album' && albumCamera.view === 'eye'
      const zoom = station === 'album' ? albumCamera.zoom : 0
      const angle = station === 'album' ? (albumCamera.angle * Math.PI) / 180 : 0
      const distance = (eye ? 5.3 : station === 'album' ? 9.45 : 6.5) - 2.1 * zoom
      target.set(
        placeForCamera.x + Math.sin(angle) * distance,
        eye ? 2.35 : station === 'rsvp' ? 3.3 : 4.8,
        placeForCamera.z - 2.2 + Math.cos(angle) * distance,
      )
    }
    camera.position.lerp(target, reduced.matches ? 1 : 0.065)
    target.set(p.x, 0, p.z - 1.6)
    if (placeForCamera) target.set(placeForCamera.x, station === 'rsvp' ? 1.03 : 1.9, placeForCamera.z - 2.2)
    lookTarget.lerp(target, reduced.matches ? 1 : 0.08)
    bookCover.rotation.z += ((station === 'rsvp' ? 2.66 : 0) - bookCover.rotation.z) * (reduced.matches ? 1 : 0.09)
    rsvpLamp.color.lerp(rsvpSaved ? warmLight : dimLamp, reduced.matches ? 1 : 0.055)
    camera.lookAt(lookTarget)
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(animate)
  return {
    setStation(next: GardenStation | null) {
      station = next
      clear()
      walkingTo = null
      landing.visible = false
    },
    setAlbumCamera(next: AlbumCamera) {
      albumCamera = next
    },
    setRsvpSaved(saved: boolean) {
      rsvpSaved = saved
      updateRsvpSign?.(saved ? ['Jawaban tersimpan', 'Terima kasih!'] : ['Konfirmasi kehadiran', 'Hadir · Berhalangan'])
    },
    steer(x: number, z: number) {
      if (station) return
      axisX = x
      axisZ = z
      if (x || z) {
        walkingTo = null
        landing.visible = false
      }
    },
    dispose() {
      destroyed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener('pointerdown', point)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clear)
      for (const resource of [
        cube,
        sphere,
        cone,
        disc,
        arch,
        ground,
        edge,
        path,
        wood,
        ...leaves,
        ...paints,
        ...props,
        glow,
        flame,
        playerPaint,
        scarf,
        pond,
        flower,
        wakeGeometry,
        ...wake.map((ripple) => ripple.material),
      ])
        resource.dispose()
      for (const sign of signs) {
        sign.texture.dispose()
        sign.material.dispose()
      }
      for (const texture of photoTextures) texture.dispose()
      for (const material of photoMaterials) material.dispose()
      for (const plaque of plaques) {
        plaque.texture.dispose()
        plaque.material.dispose()
      }
      plaqueGeometry.dispose()
      printPlane.dispose()
      rsvpLamp.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
