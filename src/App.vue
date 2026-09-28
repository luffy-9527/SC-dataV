<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { gsap } from 'gsap'

const route = useRoute()
const containerRef = ref<HTMLDivElement | null>(null)

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    if (!containerRef.value) return
    gsap.fromTo(
      containerRef.value,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.6, ease: 'power3.out' },
    )
  },
  { immediate: true },
)
</script>

<template>
  <div ref="containerRef" style="will-change: transform, opacity; width: 100%; height: 100%;">
    <RouterView />
  </div>
</template>
