<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    designWidth?: number
    designHeight?: number
    fitMode?: 'stretch' | 'contain' | 'cover'
  }>(),
  {
    designWidth: 1920,
    designHeight: 1080,
    fitMode: 'stretch',
  },
)

const viewportWidth = ref(1920)
const viewportHeight = ref(1080)

function updateViewport() {
  viewportWidth.value = window.innerWidth || document.documentElement.clientWidth || props.designWidth
  viewportHeight.value = window.innerHeight || document.documentElement.clientHeight || props.designHeight
}

const stageStyle = computed(() => {
  const scaleX = viewportWidth.value / props.designWidth
  const scaleY = viewportHeight.value / props.designHeight

  if (props.fitMode === 'contain') {
    const scale = Math.min(scaleX, scaleY)
    return {
      width: `${props.designWidth}px`,
      height: `${props.designHeight}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      left: '50%',
      top: '50%',
    }
  }

  if (props.fitMode === 'cover') {
    const scale = Math.max(scaleX, scaleY)
    return {
      width: `${props.designWidth}px`,
      height: `${props.designHeight}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      left: '50%',
      top: '50%',
    }
  }

  return {
    width: `${props.designWidth}px`,
    height: `${props.designHeight}px`,
    transform: `scale(${scaleX}, ${scaleY})`,
    left: '0',
    top: '0',
  }
})

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
})
</script>

<template>
  <div class="autofit-viewport">
    <div class="autofit-stage" :style="stageStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.autofit-viewport {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(circle at 50% 42%, #fff6e8 0%, #f7dfbc 45%, #eac38f 100%);
}

.autofit-stage {
  position: absolute;
  transform-origin: left top;
  overflow: hidden;
}
</style>
