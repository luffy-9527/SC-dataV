<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    list: T[]
    speed?: number
    itemHeight?: number
    pauseOnHover?: boolean
  }>(),
  {
    speed: 0.35,
    itemHeight: 32,
    pauseOnHover: true,
  },
)

const offset = ref(0)
const paused = ref(false)
let raf = 0
let last = 0

const displayList = computed(() => [...props.list, ...props.list])
const totalHeight = computed(() => props.list.length * props.itemHeight)

function loop(time: number) {
  if (!last) last = time
  const delta = time - last
  last = time
  if (!paused.value && totalHeight.value > 0) {
    offset.value = (offset.value + delta * props.speed * 0.06) % totalHeight.value
  }
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div
    class="seam-scroll"
    @mouseenter="pauseOnHover && (paused = true)"
    @mouseleave="pauseOnHover && (paused = false)"
  >
    <div class="seam-scroll__inner" :style="{ transform: `translate3d(0, -${offset}px, 0)` }">
      <div
        v-for="(item, index) in displayList"
        :key="index"
        class="seam-scroll__item"
        :style="{ height: `${itemHeight}px`, lineHeight: `${itemHeight}px` }"
      >
        <slot :item="item" :index="index % list.length">{{ item }}</slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seam-scroll {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.seam-scroll__inner {
  will-change: transform;
}

.seam-scroll__item {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
