import type { CinemaRoom } from './wedding-cinema-renderer'

const moods: Record<CinemaRoom, { gain: number; frequency: number }> = {
  street: { gain: 0.18, frequency: 5100 },
  lobby: { gain: 0.085, frequency: 760 },
  auditorium: { gain: 0.034, frequency: 270 },
}

export function createCinemaAmbience(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 5, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let weather = 0
  for (let index = 0; index < channel.length; index++) {
    const noise = Math.random() * 2 - 1
    weather = weather * 0.995 + noise * 0.005
    channel[index] = noise * 0.22 + weather * 1.8
  }
  const roomTone = context.createBufferSource()
  roomTone.buffer = buffer
  roomTone.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  const gain = context.createGain()
  gain.gain.value = 0
  roomTone.connect(filter).connect(gain).connect(context.destination)
  roomTone.start()
  return (room: CinemaRoom) => {
    const mood = moods[room]
    filter.frequency.setTargetAtTime(mood.frequency, context.currentTime, 0.29)
    gain.gain.setTargetAtTime(mood.gain, context.currentTime, 0.31)
  }
}
