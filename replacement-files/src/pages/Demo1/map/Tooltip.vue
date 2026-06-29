<script setup lang="ts">
import { ref } from 'vue'
import { Html } from '@tresjs/cientos'

withDefaults(
  defineProps<{
    data: {
      city: string
      population?: number
      gdp?: string
      area?: string
    }
    position?: [number, number, number]
  }>(),
  {
    position: () => [0, 0, 0],
  },
)

const visible = ref(false)

function open() {
  visible.value = true
}

function close() {
  visible.value = false
}

defineExpose({ open, close })
</script>

<template>
  <Html
    v-if="visible"
    center
    :position="position"
    :distance-factor="100"
    :z-index-range="[1001, 1500]"
    :style="{ pointerEvents: 'none' }"
  >
    <div class="tooltip-box">
      <div class="city-name">{{ data.city }}</div>
      <div class="data-item"><span>人口:</span><span>{{ data.population ?? 0 }}万</span></div>
      <div class="data-item"><span>GDP:</span><span>{{ data.gdp ?? '-' }}</span></div>
      <div class="data-item"><span>面积:</span><span>{{ data.area ?? '-' }}</span></div>
    </div>
  </Html>
</template>

<style scoped>
.tooltip-box {
  min-width: 120px;
  padding: 12px 16px;
  color: #656565;
  font-size: 12px;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255, 250, 238, 0.92), rgba(255, 232, 198, 0.78));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 133, 28, 0.38);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(117, 69, 16, 0.22), 0 0 24px rgba(255, 140, 32, 0.2);
}

.city-name {
  margin-bottom: 8px;
  color: #ea580c;
  font-weight: 700;
}

.data-item {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 4px;
}

.data-item:last-child {
  margin-bottom: 0;
}
</style>
