<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { PerfStats } from '../types'

const props = defineProps<{
  stats: PerfStats | null
  isVisible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toggle'): void
}>()

function onKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault()
    emit('toggle')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

const fps = computed(() => props.stats?.fps ?? 60)
const frameTime = computed(() => props.stats?.frameTime ?? 16.6)
const drawCalls = computed(() => props.stats?.drawCalls ?? 0)
const triangles = computed(() => props.stats?.triangles ?? 0)
const geometries = computed(() => props.stats?.geometries ?? 0)
const textures = computed(() => props.stats?.textures ?? 0)
const memoryMB = computed(() => props.stats?.memoryMB)

const gradeInfo = computed(() => {
  const f = fps.value
  if (f >= 58) {
    return {
      text: 'S 级 · 极佳 (60FPS满帧)',
      gradeClass: 'grade-s',
      fpsClass: 'fps-s',
    }
  } else if (f >= 45) {
    return {
      text: 'A 级 · 流畅运行',
      gradeClass: 'grade-a',
      fpsClass: 'fps-a',
    }
  } else if (f >= 30) {
    return {
      text: 'B 级 · 稍有波动',
      gradeClass: 'grade-b',
      fpsClass: 'fps-b',
    }
  } else {
    return {
      text: 'C 级 · 渲染负载偏高',
      gradeClass: 'grade-c',
      fpsClass: 'fps-c',
    }
  }
})
</script>

<template>
  <div v-if="isVisible" class="perf-hud-root">
    <div class="perf-hud-card">
      <!-- 顶部高光条与科技边角 -->
      <div class="top-glow-line" />
      <div class="corner corner-tl" />
      <div class="corner corner-tr" />

      <!-- 标题栏 -->
      <div class="perf-header">
        <div class="header-title-box">
          <span class="pulsing-beacon">
            <span class="beacon-ping" />
            <span class="beacon-dot" />
          </span>
          <span class="header-title">PERFORMANCE HUD</span>
          <span class="shortcut-pill">[P]</span>
        </div>

        <button
          class="close-btn"
          title="关闭监视器 (快捷键 P)"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 状态评级徽章 -->
      <div class="badge-wrapper">
        <div class="grade-badge" :class="gradeInfo.gradeClass">
          <span class="badge-title">健康评级</span>
          <span>{{ gradeInfo.text }}</span>
        </div>
      </div>

      <!-- 核心指标 2x2 网格 -->
      <div class="metrics-grid">
        <!-- FPS -->
        <div class="metric-cell">
          <span class="cell-label">实时帧率 FPS</span>
          <div class="cell-val-box">
            <span class="cell-number" :class="gradeInfo.fpsClass">{{ fps }}</span>
            <span class="cell-sub">/ 60</span>
          </div>
        </div>

        <!-- Frame Time -->
        <div class="metric-cell">
          <span class="cell-label">帧渲染耗时</span>
          <div class="cell-val-box">
            <span class="cell-number text-white">{{ frameTime }}</span>
            <span class="cell-sub">ms</span>
          </div>
        </div>

        <!-- Draw Calls -->
        <div class="metric-cell">
          <span class="cell-label">Draw Calls</span>
          <div class="cell-val-box">
            <span class="cell-number text-cyan">{{ drawCalls }}</span>
            <span class="cell-sub">calls</span>
          </div>
        </div>

        <!-- Triangles -->
        <div class="metric-cell">
          <span class="cell-label">渲染三角面</span>
          <div class="cell-val-box">
            <span class="cell-number text-amber">
              {{ triangles >= 1000 ? `${(triangles / 1000).toFixed(1)}k` : triangles }}
            </span>
            <span class="cell-sub">tris</span>
          </div>
        </div>
      </div>

      <!-- 详细指标清单 -->
      <div class="detail-list">
        <div class="detail-row">
          <span class="detail-label">网格几何体 (Geometries)</span>
          <span class="detail-val">{{ geometries }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">GPU 纹理 (Textures)</span>
          <span class="detail-val">{{ textures }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">JS 堆内存 (Heap)</span>
          <span class="detail-val">
            {{ memoryMB !== undefined ? `${memoryMB} MB` : 'Browser Protected' }}
          </span>
        </div>
      </div>

      <!-- 底部小提示 -->
      <div class="perf-footer">
        <span>Three.js WebGL 硬件加速</span>
        <span>按 P 键快速隐藏</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perf-hud-root {
  position: absolute;
  top: 80px;
  right: 20px;
  z-index: 30;
  width: 320px;
  user-select: none;
  pointer-events: auto;
  animation: fade-down 0.2s ease-out;
}

@keyframes fade-down {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

.perf-hud-card {
  position: relative;
  border-radius: 16px;
  background-color: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(51, 65, 85, 0.6);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.top-glow-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #22d3ee 50%, transparent 100%);
  opacity: 0.8;
}

.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: #22d3ee;
}
.corner-tl { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; }
.corner-tr { top: 0; right: 0; border-top: 2px solid; border-right: 2px solid; }

.perf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.8);
  background-color: rgba(15, 23, 42, 0.4);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulsing-beacon {
  position: relative;
  display: flex;
  width: 8px;
  height: 8px;
}

.beacon-ping {
  position: absolute;
  display: inline-flex;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #22d3ee;
  opacity: 0.75;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

.beacon-dot {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #06b6d4;
}

.header-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #e2e8f0;
}

.shortcut-pill {
  font-size: 10px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #ffffff;
  background-color: rgba(30, 41, 59, 0.6);
}

.badge-wrapper {
  padding: 12px 16px 4px;
}

.grade-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  font-size: 12px;
  font-family: monospace;
  font-weight: 500;
}

.badge-title {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 600;
}

.grade-s { color: #67e8f9; border-color: rgba(34, 211, 238, 0.4); background-color: rgba(8, 51, 68, 0.4); }
.grade-a { color: #34d399; border-color: rgba(16, 185, 129, 0.4); background-color: rgba(6, 78, 59, 0.4); }
.grade-b { color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); background-color: rgba(69, 26, 3, 0.4); }
.grade-c { color: #fb7185; border-color: rgba(244, 63, 94, 0.4); background-color: rgba(76, 5, 25, 0.4); }

.fps-s { color: #67e8f9; }
.fps-a { color: #34d399; }
.fps-b { color: #fbbf24; }
.fps-c { color: #fb7185; }

.metrics-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-cell {
  display: flex;
  flex-direction: column;
  background-color: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  padding: 10px;
}

.cell-label {
  font-size: 10px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cell-val-box {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}

.cell-number {
  font-size: 20px;
  font-weight: 800;
  font-family: monospace;
}

.cell-sub {
  font-size: 10px;
  color: #64748b;
  font-family: monospace;
}

.text-white { color: #f1f5f9; }
.text-cyan { color: #67e8f9; }
.text-amber { color: #fcd34d; }

.detail-list {
  padding: 4px 16px 14px;
  border-top: 1px solid rgba(30, 41, 59, 0.6);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-family: monospace;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #94a3b8;
}

.detail-label {
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.detail-val {
  color: #e2e8f0;
  font-weight: 700;
}

.perf-footer {
  padding: 8px 16px;
  background-color: rgba(15, 23, 42, 0.7);
  border-top: 1px solid rgba(30, 41, 59, 0.8);
  font-size: 10px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
