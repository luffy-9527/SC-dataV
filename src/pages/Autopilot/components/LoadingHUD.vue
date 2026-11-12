<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

interface Props {
  progress: number
  isLoaded: boolean
  stageText?: string
}

const props = withDefaults(defineProps<Props>(), {
  stageText: '正在加载 3D 高精数字孪生模型与感知图层...',
})

const shouldRender = ref(true)
const displayedPercent = ref(0)
let timer: number | null = null
let dismissTimer: number | null = null

watch(
  () => props.progress,
  (newVal) => {
    const target = Math.min(100, Math.max(0, newVal))
    if (timer) clearInterval(timer)
    timer = window.setInterval(() => {
      if (displayedPercent.value >= target) {
        if (timer) clearInterval(timer)
        displayedPercent.value = target
        return
      }
      displayedPercent.value = Math.min(
        target,
        displayedPercent.value + Math.max(1, Math.round((target - displayedPercent.value) * 0.25)),
      )
    }, 25)
  },
  { immediate: true },
)

watch(
  () => props.isLoaded,
  (loaded) => {
    if (loaded) {
      dismissTimer = window.setTimeout(() => {
        shouldRender.value = false
      }, 750)
    }
  },
)

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (dismissTimer) clearTimeout(dismissTimer)
})
</script>

<template>
  <div
    v-if="shouldRender"
    class="loading-hud-mask"
    :class="{ 'hud-fade-out': isLoaded }"
  >
    <!-- 背景微网格 -->
    <div class="hud-grid-pattern" />

    <!-- 核心 HUD 卡片容器 -->
    <div class="hud-card">
      <!-- 四角刻度线 -->
      <div class="corner-marker top-left" />
      <div class="corner-marker top-right" />
      <div class="corner-marker bottom-left" />
      <div class="corner-marker bottom-right" />

      <!-- 顶部指示徽章 -->
      <div class="hud-card-header">
        <div class="brand-tag">
          <svg class="pulsing-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>COCKPIT DIGITAL TWIN</span>
        </div>
        <div class="model-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
          </svg>
          <span>DRACO 3.86MB</span>
        </div>
      </div>

      <!-- 车型与阶段标题 -->
      <div class="hud-card-body">
        <h2 class="car-title">BMW M4 Competition</h2>
        <p class="stage-text">{{ stageText }}</p>
      </div>

      <!-- 发光进度条 -->
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${displayedPercent}%` }" />
      </div>

      <!-- 进度百分比与校验状态 -->
      <div class="hud-card-footer">
        <span class="verify-status">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>{{ displayedPercent === 100 ? '资源校验完毕' : '几何流式解压缩' }}</span>
        </span>
        <span class="percent-number">{{ displayedPercent }}%</span>
      </div>

      <!-- 底部提示 -->
      <div class="hud-card-meta">
        <span>高精三维模型已就绪</span>
        <span class="mono-speed">FCP &lt; 1.5s</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-hud-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(2, 4, 11, 0.88);
  backdrop-filter: blur(8px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.hud-fade-out {
  opacity: 0;
  pointer-events: none;
}

.hud-grid-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  pointer-events: none;
  background-image: linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px);
  background-size: 32px 32px;
}

.hud-card {
  position: relative;
  width: 92vw;
  max-width: 480px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(11, 19, 41, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%);
  border: 1px solid rgba(6, 182, 212, 0.25);
  box-shadow: 0 0 50px rgba(6, 182, 212, 0.18);
}

.corner-marker {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: #22d3ee;
}
.corner-marker.top-left { top: 8px; left: 8px; border-top: 2px solid; border-left: 2px solid; }
.corner-marker.top-right { top: 8px; right: 8px; border-top: 2px solid; border-right: 2px solid; }
.corner-marker.bottom-left { bottom: 8px; left: 8px; border-bottom: 2px solid; border-left: 2px solid; }
.corner-marker.bottom-right { bottom: 8px; right: 8px; border-bottom: 2px solid; border-right: 2px solid; }

.hud-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(22, 78, 99, 0.4);
}

.brand-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #22d3ee;
  text-transform: uppercase;
}

.pulsing-icon {
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
}

.model-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: rgba(8, 51, 68, 0.7);
  border: 1px solid rgba(6, 182, 212, 0.3);
  font-size: 10px;
  color: #67e8f9;
  font-family: monospace;
}

.hud-card-body {
  text-align: center;
  margin-bottom: 20px;
}

.car-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.stage-text {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(21, 94, 117, 0.5);
  padding: 2px;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #06b6d4 0%, #38bdf8 50%, #34d399 100%);
  transition: width 0.15s ease-out;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.7);
}

.hud-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-family: monospace;
}

.verify-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
}

.verify-status svg {
  color: #34d399;
}

.percent-number {
  font-size: 16px;
  font-weight: 700;
  color: #67e8f9;
  letter-spacing: 0.05em;
}

.hud-card-meta {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(8, 51, 68, 0.5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
}

.mono-speed {
  color: rgba(34, 211, 238, 0.8);
  font-family: monospace;
}
</style>
