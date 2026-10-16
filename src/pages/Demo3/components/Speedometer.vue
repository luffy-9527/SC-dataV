<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentSpeed: number
  gear: 'P' | 'R' | 'N' | 'D'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'gearChange', gear: 'P' | 'R' | 'N' | 'D'): void
}>()

// 计算仪表盘圆弧进度（0 ~ 160 km/h 对应 0 ~ 240 度弧长）
const maxSpeed = 160
const radius = 68
const circumference = 2 * Math.PI * radius // ~427.25
const arcLength = circumference * (220 / 360) // ~261.1

const strokeDashoffset = computed(() => {
  const clamped = Math.min(Math.max(props.currentSpeed, 0), maxSpeed)
  const ratio = clamped / maxSpeed
  return arcLength * (1 - ratio)
})

const gears = ['P', 'R', 'N', 'D'] as const
</script>

<template>
  <div class="speedometer-root">
    <div class="speedometer-box">
      <!-- 边角修饰符 -->
      <div class="corner corner-tl" />
      <div class="corner corner-tr" />
      <div class="corner corner-bl" />
      <div class="corner corner-br" />

      <!-- 速度表盘 SVG -->
      <div class="gauge-wrapper">
        <svg class="gauge-svg" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f59e0b" />
              <stop offset="60%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>

          <!-- 背景底轨 -->
          <circle
            cx="80"
            cy="80"
            :r="radius"
            fill="none"
            stroke="#1e293b"
            stroke-width="6"
            :stroke-dasharray="`${arcLength} ${circumference}`"
            stroke-linecap="round"
          />

          <!-- 动态高亮发光进度条 -->
          <circle
            cx="80"
            cy="80"
            :r="radius"
            fill="none"
            stroke="url(#speedGrad)"
            stroke-width="6"
            :stroke-dasharray="`${arcLength} ${circumference}`"
            :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round"
            class="speed-arc"
          />
        </svg>

        <!-- 仪表盘中心数字车速 -->
        <div class="speed-center-text">
          <span class="speed-number">{{ Math.round(currentSpeed) }}</span>
          <span class="speed-unit">KM / H</span>
        </div>
      </div>

      <!-- 底部档位指示器：[ P ] [ R ] [ N ] [ D ] -->
      <div class="gear-selector">
        <button
          v-for="g in gears"
          :key="g"
          type="button"
          class="gear-btn"
          :class="{ 'gear-active': gear === g }"
          @click="emit('gearChange', g)"
        >
          {{ g }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.speedometer-root {
  position: absolute;
  left: 24px;
  bottom: 80px;
  z-index: 20;
  pointer-events: none;
  user-select: none;
}

.speedometer-box {
  position: relative;
  width: 192px;
  height: 192px;
  padding: 12px;
  background-color: rgba(2, 6, 23, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 41, 59, 0.8);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  pointer-events: auto;
}

.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(100, 116, 139, 0.7);
}
.corner-tl { top: 6px; left: 6px; border-top: 2px solid; border-left: 2px solid; }
.corner-tr { top: 6px; right: 6px; border-top: 2px solid; border-right: 2px solid; }
.corner-bl { bottom: 6px; left: 6px; border-bottom: 2px solid; border-left: 2px solid; }
.corner-br { bottom: 6px; right: 6px; border-bottom: 2px solid; border-right: 2px solid; }

.gauge-wrapper {
  position: relative;
  width: 144px;
  height: 144px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -4px;
}

.gauge-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-110deg);
}

.speed-arc {
  transition: stroke-dashoffset 0.15s ease-out;
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.7));
}

.speed-center-text {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.speed-number {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: #ffffff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  line-height: 1;
}

.speed-unit {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.1em;
  margin-top: 2px;
}

.gear-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(15, 23, 42, 0.8);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(30, 41, 59, 0.8);
  width: 100%;
  justify-content: space-around;
  margin-bottom: 4px;
}

.gear-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gear-btn:hover {
  color: #e2e8f0;
}

.gear-btn.gear-active {
  background-color: #06b6d4;
  color: #020617;
  font-weight: 900;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);
  transform: scale(1.05);
}
</style>
