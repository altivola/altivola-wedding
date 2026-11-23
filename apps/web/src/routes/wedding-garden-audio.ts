export type GardenSound = 'step' | 'stroke' | 'splash'

const sounds = {
  step: { duration: 0.16, frequency: 360, tail: 125, level: 0.23 },
  stroke: { duration: 0.24, frequency: 930, tail: 270, level: 0.23 },
  splash: { duration: 0.43, frequency: 2100, tail: 340, level: 0.38 },
} satisfies Record<GardenSound, { duration: number; frequency: number; tail: number; level: number }>

export function createGardenAudio() {
  const context = new AudioContext()
  const volume = context.createGain()
  volume.gain.value = 0.65
  volume.connect(context.destination)
  const texture = context.createBuffer(1, Math.ceil(context.sampleRate * 0.46), context.sampleRate)
  const samples = texture.getChannelData(0)
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1

  function play(sound: GardenSound) {
    if (context.state !== 'running') return
    const { duration, frequency, tail, level } = sounds[sound]
    const now = context.currentTime
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = texture
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency * (0.84 + Math.random() * 0.32), now)
    filter.frequency.exponentialRampToValueAtTime(tail, now + duration)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(level, now + (sound === 'stroke' ? 0.05 : 0.02))
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    source.connect(filter).connect(gain).connect(volume)
    source.start(now)
    source.stop(now + duration)
  }

  return { context, play }
}
