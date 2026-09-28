import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 监听元素尺寸变化
 */
export function useSize(elementRef: any) {
  const size = ref({ width: 0, height: 0 })
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (elementRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          size.value = {
            width: entry.contentRect.width,
            height: entry.contentRect.height
          }
        }
      })
      resizeObserver.observe(elementRef.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver && elementRef.value) {
      resizeObserver.unobserve(elementRef.value)
    }
  })

  return size
}
