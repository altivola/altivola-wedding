export const cinemaArtwork = '/wedding/bioskop.jpg'
export type CinemaRoom = 'street' | 'lobby' | 'auditorium'
export const cinemaSurfaces = {
  lobby: [0.353, 0.32, 0.61, 0.562],
  auditorium: [0.285, 0.163, 0.752, 0.408],
} as const
export type SurfaceRect = { x: number; y: number; width: number; height: number }

const scenes: Record<CinemaRoom, number> = { street: 0, lobby: 1, auditorium: 2 }
const count = 8
const vertex = `
attribute vec2 aPosition;
varying vec2 vScene;
void main() {
  vScene = vec2(aPosition.x * .5 + .5, .5 - aPosition.y * .5);
  gl_Position = vec4(aPosition, 0., 1.);
}`

const fragment = `
precision mediump float;
varying vec2 vScene;
uniform sampler2D uArtwork;
uniform sampler2D uSurface;
uniform float uSurfaceEnabled;
uniform vec4 uSurfaceBounds;
uniform float uCenterY;
uniform float uProjectionPulse;
uniform vec2 uCrop;
uniform vec2 uLook;
uniform vec2 uLight;
uniform float uTime;
uniform float uRoom;
uniform float uPreviousRoom;
uniform float uArrival;
uniform float uReduced;
uniform vec4 uHits[${count}];

vec2 world(vec2 point) {
  return (point - .5) * uCrop + vec2(.5, uCenterY) + uLook;
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(19.42, 67.71))) * 1731.13);
}

void main() {
  vec2 point = world(vScene);
  vec2 displacement = vec2(0.);
  float rim = 0.;
  float flash = 0.;
  float outside = 1. - step(.5, uRoom);
  float water = outside * smoothstep(.689, .735, point.y);
  float lightDistance = length((point - uLight) * vec2(1., 1.15));
  float bounce = exp(-lightDistance * lightDistance * 35.) * .092;
  for (int i = 0; i < ${count}; i++) {
    vec4 hit = uHits[i];
    float age = uTime - hit.z;
    if (age >= 0. && age < 2.1 && hit.w > 0.) {
      vec2 delta = point - hit.xy;
      float distance = length(delta * vec2(1., 2.5));
      float wavefront = age * .31 + .008;
      float crest = exp(-abs(distance - wavefront) * 30.);
      float decay = exp(-age * 2.4) * hit.w;
      float waves = sin((distance - wavefront) * 103.);
      float hitWater = step(.69, hit.y) * water;
      displacement += normalize(delta + vec2(.0001)) * waves * crest * decay * hitWater * .027;
      rim += waves * crest * decay * hitWater * .17;
      flash += exp(-dot(delta, delta) * (67. / (1. + age))) * exp(-age * 5.3) * hit.w * (1. - hitWater);
    }
  }
  float breath = sin(point.x * 37. + uTime * 2.0) * sin(point.y * 49. - uTime * 1.5);
  displacement.x += breath * water * (1. - uReduced) * .0021;
  vec2 samplePoint = clamp(point + displacement, .002, .998);
  vec3 color = texture2D(uArtwork, vec2((samplePoint.x + uRoom) / 3., samplePoint.y)).rgb;
  if (uSurfaceEnabled > .5) {
    vec2 uv = (point - uSurfaceBounds.xy) / (uSurfaceBounds.zw - uSurfaceBounds.xy);
    float inSurface = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
    vec3 picture = texture2D(uSurface, clamp(uv, 0., 1.)).rgb;
    if (uRoom > 1.5) {
      float gate = (1. - uReduced) * uProjectionPulse;
      float filmFlicker = 1. + .035 * sin(uTime * 36.) * (1. - uReduced);
      color = mix(color, picture * filmFlicker * (1. - gate * .72) + color * .145, inSurface * .90);
      float centerGlow = exp(-pow((point.x - .52) * 3.1, 2.)) * smoothstep(.28, .48, point.y) *
        (1. - smoothstep(.45, .70, point.y));
      float beam = max(0., 1. - abs(point.x - .52) / (.14 + point.y * .45));
      vec2 dustCoord = (point + vec2(uTime * .009, -uTime * .003)) * 232.;
      vec2 dustCell = floor(dustCoord);
      vec2 position = vec2(hash(dustCell), hash(dustCell + 27.));
      float dust = (1. - smoothstep(.02, .24, length(fract(dustCoord) - position))) * step(.87, position.x);
      color += vec3(.25, .13, .05) * centerGlow * (.22 + beam * dust * (1. - uReduced)) * (1. - gate);
    } else {
      float insideEdge = smoothstep(0., .026, min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y)));
      color = mix(color, picture * (.77 + bounce) + color * .07, inSurface * insideEdge);
    }
  }
  color *= 1. + bounce + rim;
  color += vec3(1., .62, .26) * (flash * .24 + rim * .14);
  if (outside > .5 && uReduced < .5) {
    vec2 seg = vec2(point.x + point.y * .13, point.y) * vec2(110., 16.);
    vec2 cell = floor(seg);
    float seed = hash(vec2(cell.x, 2.));
    float fall = fract(seg.y - uTime * (3.3 + seed * 4.3) + seed);
    float rain = (1. - smoothstep(.02, .105, abs(fract(seg.x) - seed * .75))) *
      smoothstep(.27, .64, fall) * (1. - smoothstep(.68, .97, fall)) * step(.47, seed);
    color += vec3(.45, .62, .7) * rain * (.13 + bounce) * (1. - water * .7);
  }
  vec2 edge = abs(vScene - .5);
  if (uArrival < 1.) {
    vec2 leaving = clamp((point - .5) * (1. - uArrival * .12) + .5, .002, .998);
    vec3 previous = texture2D(uArtwork, vec2((leaving.x + uPreviousRoom) / 3., leaving.y)).rgb;
    color = mix(previous, color, smoothstep(0., 1., uArrival));
    color *= .75 + .25 * abs(2. * uArrival - 1.);
  }
  color *= 1. - .39 * smoothstep(.27, .68, length(edge * vec2(.9, .85)));
  gl_FragColor = vec4(max(color, 0.), 1.);
}`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

export function mountCinema(
  canvas: HTMLCanvasElement,
  onReady: () => void,
  positionSign: (x: number, y: number) => void,
  positionSurface: (rectangle: SurfaceRect) => void,
) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' })
  if (!gl) return null
  const vertexShader = compile(gl, gl.VERTEX_SHADER, vertex)
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()
  const texture = gl.createTexture()
  const surface = gl.createTexture()
  const quad = gl.createBuffer()
  function release() {
    gl?.deleteShader(vertexShader)
    gl?.deleteShader(fragmentShader)
    gl?.deleteTexture(texture)
    gl?.deleteTexture(surface)
    gl?.deleteBuffer(quad)
    gl?.deleteProgram(program)
  }
  if (!vertexShader || !fragmentShader || !program || !texture || !surface || !quad) {
    release()
    return null
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    release()
    return null
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: The method binds a WebGL program.
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  function bindTexture(image: WebGLTexture, unit: number) {
    if (!gl) return
    gl.activeTexture(unit)
    gl.bindTexture(gl.TEXTURE_2D, image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }
  bindTexture(surface, gl.TEXTURE1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3))
  bindTexture(texture, gl.TEXTURE0)
  gl.uniform1i(gl.getUniformLocation(program, 'uSurface'), 1)

  const uSurfaceEnabled = gl.getUniformLocation(program, 'uSurfaceEnabled')
  const uSurfaceBounds = gl.getUniformLocation(program, 'uSurfaceBounds')
  const uCenterY = gl.getUniformLocation(program, 'uCenterY')
  const uProjectionPulse = gl.getUniformLocation(program, 'uProjectionPulse')
  const uCrop = gl.getUniformLocation(program, 'uCrop')
  const uLook = gl.getUniformLocation(program, 'uLook')
  const uLight = gl.getUniformLocation(program, 'uLight')
  const uTime = gl.getUniformLocation(program, 'uTime')
  const uRoom = gl.getUniformLocation(program, 'uRoom')
  const uPreviousRoom = gl.getUniformLocation(program, 'uPreviousRoom')
  const uArrival = gl.getUniformLocation(program, 'uArrival')
  const uReduced = gl.getUniformLocation(program, 'uReduced')
  const uHits = gl.getUniformLocation(program, 'uHits[0]')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const hits = new Float32Array(count * 4)
  const start = performance.now()
  let room: CinemaRoom = 'street'
  let previousRoom: CinemaRoom = room
  let arrived = -1
  let lookX = 0
  let lookY = 0
  let targetX = 0
  let targetY = 0
  let lightX = 0.5
  let lightY = 0.5
  let focusX = 0.5
  let focusY = 0.5
  let cropX = 1
  let cropY = 1
  let centerY = 0.5
  let hasSurface = false
  let projectionChanged = -1
  let nextHit = 0
  let frame = 0
  let last = 0
  let ready = false
  let visible = false
  let disposed = false

  function time() {
    return (performance.now() - start) / 1000
  }

  function resize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height || !gl) return
    const pixelRatio = Math.min(devicePixelRatio, 1.45, 1450 / Math.max(width, height))
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    gl.viewport(0, 0, canvas.width, canvas.height)
    frameScene(width / height)
  }

  function frameScene(aspect: number) {
    cropX = Math.min(1, aspect) * 0.89
    // Keep the pavement in frame on wide screens.
    cropY = Math.min(1, (1 / aspect) * 1.13) * 0.89
    if (room === 'auditorium') {
      cropX = Math.max(cropX, 0.57)
      centerY = 0.49 - (1 - cropY) * 0.16
    } else centerY = 0.5 + (1 - cropY) * 0.11
    gl?.uniform2f(uCrop, cropX, cropY)
    gl?.uniform1f(uCenterY, centerY)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  function worldX(x: number) {
    return (x - 0.5) * cropX + 0.5 + lookX
  }

  function worldY(y: number) {
    return (y - 0.5) * cropY + centerY + lookY
  }

  function draw(now: number) {
    if (!gl || disposed || !ready) return
    frame = requestAnimationFrame(draw)
    if (document.hidden || now - last < (reduce.matches ? 100 : 31)) return
    last = now
    lookX += ((reduce.matches ? 0 : targetX) - lookX) * 0.16
    lookY += ((reduce.matches ? 0 : targetY) - lookY) * 0.16
    lightX += (worldX(focusX) - lightX) * 0.24
    lightY += (worldY(focusY) - lightY) * 0.24
    const elapsed = time()
    const bounds = room === 'street' ? null : cinemaSurfaces[room]
    gl.uniform1f(uSurfaceEnabled, Number(Boolean(bounds && hasSurface)))
    if (bounds) gl.uniform4f(uSurfaceBounds, bounds[0], bounds[1], bounds[2], bounds[3])
    gl.uniform1f(uProjectionPulse, Math.max(0, 1 - (elapsed - projectionChanged) * 3))
    gl.uniform1f(uTime, elapsed)
    gl.uniform1f(uReduced, Number(reduce.matches))
    gl.uniform1f(uRoom, scenes[room])
    gl.uniform1f(uPreviousRoom, scenes[previousRoom])
    gl.uniform1f(uArrival, reduce.matches ? 1 : Math.min(1, (elapsed - arrived) / 0.55))
    gl.uniform2f(uLook, lookX, lookY)
    gl.uniform2f(uLight, lightX, lightY)
    gl.uniform4fv(uHits, hits)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (bounds) {
      positionSurface({
        x: 0.5 + (bounds[0] - worldX(0.5)) / cropX,
        y: 0.5 + (bounds[1] - worldY(0.5)) / cropY,
        width: (bounds[2] - bounds[0]) / cropX,
        height: (bounds[3] - bounds[1]) / cropY,
      })
    } else positionSign(0.5 - lookX / cropX, 0.5 + (0.412 - worldY(0.5)) / cropY)
    if (!visible) {
      visible = true
      onReady()
    }
  }

  const image = new Image()
  image.onload = () => {
    if (disposed) return
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
    ready = true
    frame = requestAnimationFrame(draw)
  }
  image.src = cinemaArtwork

  return {
    look(x: number, y: number) {
      focusX = x
      focusY = y
      targetX = (x - 0.5) * (room === 'auditorium' && cropX < 0.72 ? 0.25 : 0.095)
      targetY = (y - 0.5) * 0.067
    },
    hotspot(x: number, y: number) {
      const px = worldX(x)
      const py = worldY(y)
      if (room === 'auditorium' && px > 0.79 && px < 0.965 && py > 0.59 && py < 0.75) return 'bell'
      if (room === 'street' && px > 0.43 && px < 0.56 && py > 0.52 && py < 0.69) return 'booth'
      return null
    },
    tap(x: number, y: number) {
      const pointY = worldY(y)
      if (!reduce.matches) {
        hits.set([worldX(x), pointY, time(), 1], nextHit * 4)
        nextHit = (nextHit + 1) % count
      }
      return room === 'street' && pointY > 0.69 ? 'water' : 'light'
    },
    visit(next: CinemaRoom) {
      previousRoom = room
      room = next
      hasSurface = false
      if (canvas.clientHeight) frameScene(canvas.clientWidth / canvas.clientHeight)
      arrived = time()
      hits.fill(0)
    },
    project(frame: HTMLCanvasElement, pulse: boolean) {
      gl.activeTexture(gl.TEXTURE1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, frame)
      gl.activeTexture(gl.TEXTURE0)
      if (pulse) projectionChanged = time()
      hasSurface = true
    },
    dispose() {
      disposed = true
      image.onload = null
      cancelAnimationFrame(frame)
      observer.disconnect()
      release()
    },
  }
}
