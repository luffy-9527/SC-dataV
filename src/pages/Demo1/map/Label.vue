<script setup lang="ts">
import { Html } from '@tresjs/cientos'

withDefaults(
  defineProps<{
    position?: [number, number, number]
    center?: boolean
    distanceFactor?: number
    zIndexRange?: [number, number]
    active?: boolean
  }>(),
  {
    position: () => [0, 0, 0],
    center: true,
    distanceFactor: 100,
    zIndexRange: () => [100, 1000],
    active: false,
  },
)
</script>

<template>
  <Html :position="position" :center="center" :distance-factor="distanceFactor" :z-index-range="zIndexRange">
    <div class="city-label" :class="{ active }"><slot /></div>
  </Html>
</template>

<style scoped>
.city-label {
  pointer-events: none;
  width: max-content;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid currentColor;
  color: #fdb961;
  font-size: 14px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
  transition: all 0.22s ease;
}

.city-label.active {
  color: #ff6b16;
  border-color: #ff8a1e;
  background: rgba(255, 249, 232, 0.98);
  box-shadow: 0 0 0 1px rgba(255, 163, 26, 0.35), 0 0 22px rgba(255, 107, 22, 0.5);
  transform: translateY(-2px) scale(1.06);
}
</style>
