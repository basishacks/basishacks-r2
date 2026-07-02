import { onMounted, onUnmounted, ref, h, render } from 'vue'
import EasterEggOverlay from '../components/EasterEggOverlay.vue'

export function useEasterEggs() {
  const konamiCode = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
  ]
  const buffer = ref<string[]>([])
  let container: HTMLElement | null = null

  function showOverlay(mode: 'konami' | 'hackplanet' | 'matrix') {
    if (typeof document === 'undefined') return
    if (!container) {
      container = document.createElement('div')
      document.body.appendChild(container)
    }
    const vnode = h(EasterEggOverlay, { mode, onClose: hideOverlay })
    render(vnode, container)
  }

  function hideOverlay() {
    if (container) {
      render(null, container)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    // Konami code
    buffer.value.push(e.key)
    if (buffer.value.length > konamiCode.length) {
      buffer.value.shift()
    }
    if (buffer.value.join(',') === konamiCode.join(',')) {
      showOverlay('konami')
      buffer.value = []
      return
    }

    // Ctrl+Shift+H -> Hack the Planet
    if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
      e.preventDefault()
      showOverlay('hackplanet')
      return
    }

    // Ctrl+Shift+M -> Matrix rain
    if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
      e.preventDefault()
      showOverlay('matrix')
    }
  }

  onMounted(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', onKeyDown)
    }
  })

  onUnmounted(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onKeyDown)
    }
    hideOverlay()
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  return { showOverlay, hideOverlay }
}
