export type CinemaFrame = {
  title: string
  lines: string[]
  photo?: string
}

export function buildCinemaFrame(
  frame: CinemaFrame,
  poster: boolean,
  onDraw: (canvas: HTMLCanvasElement, firstDraw: boolean) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 432
  const paint = canvas.getContext('2d')
  if (!paint) return
  const width = canvas.width
  const height = canvas.height
  let firstDraw = true

  function draw(image?: HTMLImageElement) {
    if (!paint) return
    paint.fillStyle = poster ? '#74452e' : '#17150f'
    paint.fillRect(0, 0, width, height)
    if (image) {
      const scale = Math.max(width / image.width, height / image.height)
      const w = image.width * scale
      const h = image.height * scale
      paint.filter = 'contrast(1.08) brightness(1.24)'
      paint.drawImage(image, (width - w) / 2, (height - h) / 2, w, h)
      paint.filter = 'none'
      const shade = paint.createLinearGradient(0, height * 0.5, 0, height)
      shade.addColorStop(0, '#140c0400')
      shade.addColorStop(1, '#160c0844')
      paint.fillStyle = shade
      paint.fillRect(0, 0, width, height)
    } else {
      const gradient = paint.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.63)
      gradient.addColorStop(0, poster ? '#f8dda4' : '#e9d9a9')
      gradient.addColorStop(1, poster ? '#ba8957' : '#ac9167')
      paint.fillStyle = gradient
      paint.fillRect(12, 12, width - 24, height - 24)
      paint.strokeStyle = poster ? '#805331' : '#9b643e'
      paint.lineWidth = 2
      paint.strokeRect(29, 29, width - 58, height - 58)
    }

    paint.textAlign = 'center'
    paint.textBaseline = 'middle'
    paint.fillStyle = image ? '#fff2c8' : '#592b1a'
    if (image) {
      paint.font = 'italic 33px Georgia'
      paint.fillText(frame.title, width / 2, height - 44, width - 125)
    } else {
      paint.font = 'bold 72px Georgia'
      paint.fillText(frame.title, width / 2, frame.lines.length ? 145 : height / 2, width - 103)
      paint.font = '29px Georgia'
      const lines = frame.lines.flatMap((line) => {
        const wrapped: string[] = []
        let current = ''
        for (const word of line.split(/\s+/)) {
          const candidate = current ? `${current} ${word}` : word
          if (current && paint.measureText(candidate).width > width - 136) {
            wrapped.push(current)
            current = word
          } else current = candidate
        }
        return current ? [...wrapped, current] : wrapped
      })
      lines.slice(0, 5).forEach((line, index) => {
        paint.fillText(index === 4 && lines.length > 5 ? `${line}…` : line, width / 2, 226 + index * 32, width - 103)
      })
    }
    onDraw(canvas, firstDraw)
    firstDraw = false
  }

  draw()
  if (!frame.photo) return
  const image = new Image()
  image.onload = () => draw(image)
  image.src = frame.photo
  return () => {
    image.onload = null
  }
}
