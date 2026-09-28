import { ref, onMounted } from 'vue'
import gsap from 'gsap'

export type Direction = 'toBottom' | 'toRight' | 'toLeft' | 'toTop'

/**
 * 获取真实的 DOM 元素（兼容 Vue 组件实例和原生 DOM 元素）
 */
function getDOMElement(refValue: any): HTMLElement | null {
  if (!refValue) return null
  // 如果是 Vue 组件实例，获取其根 DOM 元素
  if (refValue.$el) return refValue.$el as HTMLElement
  // 如果已经是 DOM 元素
  if (refValue instanceof HTMLElement) return refValue
  return null
}

/**
 * 移动动画
 */
export function useMoveTo(
  direction: Direction,
  duration = 0.8,
  delay = 0.5
) {
  const elementRef = ref<any>(null)
  let tween: gsap.core.Tween | null = null

  const getElement = (): HTMLElement | null => {
    return getDOMElement(elementRef.value)
  }

  const animate = (reverse = false) => {
    const el = getElement()
    if (!el) return

    const startValues = {
      x: direction === 'toRight' ? -100 : direction === 'toLeft' ? 100 : 0,
      y: direction === 'toBottom' ? -100 : direction === 'toTop' ? 100 : 0,
      opacity: 0
    }

    const endValues = {
      x: 0,
      y: 0,
      opacity: 1,
      duration,
      delay,
      ease: 'power2.out'
    }

    if (tween) {
      tween.kill()
    }

    if (reverse) {
      tween = gsap.fromTo(el, endValues, startValues)
    } else {
      tween = gsap.fromTo(el, startValues, endValues)
    }
  }

  const restart = () => animate(false)
  const reverse = () => animate(true)

  onMounted(() => {
    const el = getElement()
    if (el) {
      gsap.set(el, {
        x: direction === 'toRight' ? -100 : direction === 'toLeft' ? 100 : 0,
        y: direction === 'toBottom' ? -100 : direction === 'toTop' ? 100 : 0,
        opacity: 0
      })
    }
  })

  return {
    ref: elementRef,
    restart,
    reverse
  }
}
