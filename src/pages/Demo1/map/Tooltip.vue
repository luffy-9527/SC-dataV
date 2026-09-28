<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Html } from '@tresjs/cientos'
import { useDemo1Store } from '../stores'

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

const emit = defineEmits<{
  (event: 'click', e?: MouseEvent): void
}>()

const store = useDemo1Store()
const visible = ref(false)
const isFading = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null

function open(autoCloseDelay = 2600) {
  // 三级区县展示纯粹高清卫星影像，完全不弹窗遮挡
  if (store.drillLevel >= 2 || !store.config.showTooltip) {
    close()
    return
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }
  isFading.value = false
  visible.value = true

  // 超过指定展示时长后自动淡出并关闭，避免鼠标一直停在区域内导致弹窗永久常驻遮挡卫星底图
  if (autoCloseDelay > 0) {
    hideTimer = setTimeout(() => {
      isFading.value = true
      fadeTimer = setTimeout(() => {
        visible.value = false
        isFading.value = false
        hideTimer = null
        fadeTimer = null
      }, 260)
    }, autoCloseDelay)
  }
}

function close() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }
  isFading.value = false
  visible.value = false
}

watch(() => store.tooltipDismissSeq, () => {
  close()
})

onBeforeUnmount(() => {
  close()
})

defineExpose({ open, close })
</script>

<template>
  <Html
    v-if="visible"
    center
    :position="position"
    :z-index-range="[1001, 1500]"
    pointer-events="none"
  >
    <div class="tooltip-box" :class="{ 'fade-out': isFading }">
      <div class="city-name">
        <span>{{ data.city }}</span>
        <span v-if="store.drillLevel < 2" class="drill-hint">点击下钻</span>
      </div>
      <div class="data-item"><span>人口:</span><span>{{ data.population ?? 0 }}万</span></div>
      <div class="data-item"><span>GDP:</span><span>{{ data.gdp ?? '-' }}</span></div>
      <div class="data-item"><span>面积:</span><span>{{ data.area ?? '-' }}</span></div>
    </div>
  </Html>
</template>

<style scoped>
.tooltip-box {
  min-width: 140px;
  padding: 10px 14px;
  color: #5a4a42;
  font-size: 13px;
  pointer-events: none !important;
  background: linear-gradient(135deg, rgba(255, 252, 245, 0.96), rgba(255, 239, 215, 0.92));
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(234, 88, 12, 0.5);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(117, 69, 16, 0.22), 0 0 24px rgba(255, 140, 32, 0.2);
  user-select: none;
  transition: opacity 0.26s ease, transform 0.26s ease;
  opacity: 1;
  transform: translateY(0);
}

.tooltip-box.fade-out {
  opacity: 0;
  transform: translateY(-8px);
}

.city-name {
  margin-bottom: 8px;
  color: #ea580c;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.drill-hint {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(234, 88, 12, 0.12);
  color: #ea580c;
  border: 1px solid rgba(234, 88, 12, 0.3);
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
