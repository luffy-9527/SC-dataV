import { watch, nextTick } from 'vue'

/**
 * 防抖效果
 */
export function useDebounceEffect(
  callback: () => void,
  dependencies: any[],
  delay = 300
) {
  let timeoutId: number | null = null

  watch(dependencies, () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(async () => {
      await nextTick()
      callback()
    }, delay)
  }, { deep: true })
}
