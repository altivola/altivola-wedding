// A single short message at the bottom of the screen.
let timer: number | undefined

export function toast(message: string, duration = 2600) {
  document.querySelector('.hb-toast')?.remove()
  window.clearTimeout(timer)
  const element = document.createElement('div')
  element.className = 'hb-toast'
  element.setAttribute('role', 'status')
  element.textContent = message
  document.body.append(element)
  timer = window.setTimeout(() => element.remove(), duration)
}

export async function copyText(text: string, message = 'Disalin') {
  try {
    await navigator.clipboard.writeText(text)
    toast(message)
  } catch {
    window.prompt('Salin teks ini', text)
  }
}
