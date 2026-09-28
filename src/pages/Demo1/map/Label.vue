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
    active: false,
  },
)

const emit = defineEmits<{
  (event: 'click', e?: MouseEvent): void
  (event: 'pointerover', e?: MouseEvent): void
  (event: 'pointerout', e?: MouseEvent): void
}>()
</script>

<template>
  <Html
    :position="position"
    :center="center"
    :distance-factor="distanceFactor"
    :z-index-range="zIndexRange"
    pointer-events="none"
  >
    <div class="city-label" :class="{ active }">
      <span class="city-dot" />
      <span class="city-text"><slot /></span>
    </div>
  </Html>
</template>

<style scoped>
.city-label {
  pointer-events: none !important;
  width: max-content;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.96);
  border: 1.5px solid rgba(234, 88, 12, 0.75);
  color: #431407;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(124, 45, 18, 0.22), 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: all 0.22s ease;
  user-select: none;
  letter-spacing: 0.5px;
}

.city-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ea580c;
  box-shadow: 0 0 6px rgba(234, 88, 12, 0.85);
  flex-shrink: 0;
}

.city-label.active {
  color: #ffffff;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border-color: #ffffff;
  box-shadow: 0 4px 16px rgba(234, 88, 12, 0.6), 0 0 0 2px rgba(255, 237, 213, 0.85);
  transform: translateY(-2px) scale(1.1);
}

.city-label.active .city-dot {
  background: #ffffff;
  box-shadow: 0 0 6px #ffffff;
}
</style>
