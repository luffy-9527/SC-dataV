<script setup lang="ts">
import { useRouter } from 'vue-router'

interface Props {
  laneStatusText: string
  fps?: number
  frameTime?: number
  isPerfVisible?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'togglePerf'): void
}>()

const router = useRouter()

const navItems = [
  { path: '/demo1', name: 'Demo1 智慧城市' },
  { path: '/demo2', name: 'Demo2 智慧油田' },
  { path: '/demo3', name: 'Demo3 自动驾驶' },
]

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <header class="top-nav-bar">
    <!-- 左上角：导航转向指示卡片 -->
    <div class="nav-direction-card">
      <!-- 弯曲转弯箭头图标 -->
      <div class="turn-icon-box">
        <svg class="turn-svg" viewBox="0 0 24 24">
          <path d="M14 4h4v4h-2V6.41l-4.29 4.3a4 4 0 0 0-1.17 2.83V20h-2v-6.46a6 6 0 0 1 1.76-4.24L14.59 5H14V4z" />
        </svg>
      </div>

      <!-- 距离与路线文字 -->
      <div class="turn-text-box">
        <div class="dist-row">
          <span class="dist-num">300</span>
          <span class="dist-unit">米</span>
        </div>
        <div class="road-row">
          <span class="road-name">华南快速干线</span>
          <span class="turn-badge">右转 · 驶入匝道</span>
        </div>
      </div>
    </div>

    <!-- 中间：三套大屏统一导航切换器 -->
    <div class="demo-switcher-bar">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="switcher-item"
        :class="{ 'active-demo': item.path === '/demo3' }"
        @click="navigateTo(item.path)"
      >
        <span class="switcher-dot" />
        <span>{{ item.name }}</span>
      </button>
    </div>

    <!-- 右上角：行程统计 + 变道指示徽章 + 性能胶囊 + GitHub -->
    <div class="nav-right-group">
      <!-- 行程统计小字 -->
      <div class="trip-stats-box">
        <div class="trip-stat-col">
          <span class="stat-caption">剩余</span>
          <span class="stat-value">12.9 <span class="stat-unit">km</span></span>
        </div>
        <div class="stat-divider" />
        <div class="trip-stat-col">
          <span class="stat-caption">预计</span>
          <span class="stat-value">09:25</span>
        </div>
        <div class="stat-divider" />
        <div class="trip-stat-col">
          <span class="stat-caption">剩余时间</span>
          <span class="stat-value">6 <span class="stat-unit">min</span></span>
        </div>
      </div>

      <!-- 变道 / 车道保持 芯片边框徽章 -->
      <div
        class="lane-badge-chip"
        :class="laneStatusText.includes('变道') ? 'lane-badge-amber' : 'lane-badge-emerald'"
      >
        <div class="chip-corner tl" />
        <div class="chip-corner tr" />
        <div class="chip-corner bl" />
        <div class="chip-corner br" />

        <div class="badge-main-text">
          <span
            class="status-dot"
            :class="laneStatusText.includes('变道') ? 'ping-amber' : 'pulse-emerald'"
          />
          <span class="lane-status-title">{{ laneStatusText }}</span>
        </div>
        <span class="lane-sub-text">
          {{ laneStatusText.includes('变道') ? 'LANE CHANGE' : 'LANE KEEP' }}
        </span>
      </div>

      <!-- 实时性能监控胶囊按钮 -->
      <button
        type="button"
        class="perf-pill-btn"
        :class="{ 'perf-pill-active': isPerfVisible }"
        title="点击切换性能监控 HUD (快捷键 P)"
        @click="emit('togglePerf')"
      >
        <span class="beacon-wrap">
          <span
            class="beacon-ping"
            :class="(fps ?? 60) >= 50 ? 'bg-cyan' : 'bg-amber'"
          />
          <span
            class="beacon-dot"
            :class="(fps ?? 60) >= 50 ? 'bg-cyan' : 'bg-amber'"
          />
        </span>

        <div class="fps-text">
          <span class="fps-val">{{ fps ?? 60 }}</span>
          <span class="fps-unit">FPS</span>
        </div>

        <div class="pill-divider" />

        <span class="ms-val">{{ frameTime !== undefined ? `${frameTime}ms` : '16.6ms' }}</span>

        <span class="key-hint">P</span>
      </button>

      <!-- GitHub 链接 -->
      <a
        class="github-link"
        href="https://github.com/luffy-9527/autopilot-cockpit"
        target="_blank"
        rel="noreferrer"
        title="查看原始 GitHub 仓库"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.55 9.55 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      </a>
    </div>
  </header>
</template>

<style scoped>
.top-nav-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  pointer-events: none;
  user-select: none;
}

.nav-direction-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: rgba(2, 6, 23, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  padding: 10px 18px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.turn-icon-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background-color: rgba(8, 51, 68, 0.5);
  border: 1px solid rgba(6, 182, 212, 0.4);
  color: #22d3ee;
}

.turn-svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.turn-text-box {
  display: flex;
  flex-direction: column;
}

.dist-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.dist-num {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.05em;
  color: #ffffff;
  font-family: monospace;
  line-height: 1;
}

.dist-unit {
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
}

.road-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.road-name {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.turn-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(22, 78, 99, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.5);
  color: #67e8f9;
  font-weight: 500;
}

/* 中间导航切换器 */
.demo-switcher-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background-color: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(30, 41, 59, 0.9);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.switcher-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.switcher-item:hover {
  color: #e2e8f0;
  background-color: rgba(30, 41, 59, 0.6);
}

.switcher-item.active-demo {
  color: #22d3ee;
  background-color: rgba(8, 51, 68, 0.6);
  border-color: rgba(6, 182, 212, 0.5);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
}

.switcher-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.nav-right-group {
  display: flex;
  align-items: center;
  gap: 16px;
  pointer-events: auto;
}

.trip-stats-box {
  display: flex;
  align-items: center;
  gap: 18px;
  background-color: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 41, 59, 0.6);
  border-radius: 12px;
  padding: 8px 18px;
  font-size: 12px;
  color: #94a3b8;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.trip-stat-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-caption {
  font-size: 10px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  font-family: monospace;
}

.stat-unit {
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background-color: #1e293b;
}

.lane-badge-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  transition: all 0.3s ease;
}

.lane-badge-amber {
  background-color: rgba(69, 26, 3, 0.5);
  border-color: rgba(245, 158, 11, 0.7);
  color: #fde68a;
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.3);
}

.lane-badge-emerald {
  background-color: rgba(6, 78, 59, 0.4);
  border-color: rgba(16, 185, 129, 0.6);
  color: #6ee7b7;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
}

.chip-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: currentColor;
}
.chip-corner.tl { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; }
.chip-corner.tr { top: 0; right: 0; border-top: 2px solid; border-right: 2px solid; }
.chip-corner.bl { bottom: 0; left: 0; border-bottom: 2px solid; border-left: 2px solid; }
.chip-corner.br { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; }

.badge-main-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.ping-amber { background-color: #fbbf24; animation: ping 1.2s infinite; }
.pulse-emerald { background-color: #34d399; animation: pulse 2s infinite; }

.lane-status-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.lane-sub-text {
  font-size: 9px;
  letter-spacing: 0.1em;
  opacity: 0.8;
  font-family: monospace;
  margin-top: 2px;
}

.perf-pill-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.7);
  background-color: rgba(2, 6, 23, 0.7);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.perf-pill-btn:hover {
  border-color: #475569;
}

.perf-pill-active {
  background-color: rgba(8, 51, 68, 0.8);
  border-color: rgba(34, 211, 238, 0.8);
  color: #67e8f9;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.35);
}

.beacon-wrap {
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
  opacity: 0.75;
  animation: ping 1.5s infinite;
}
.beacon-dot {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.bg-cyan { background-color: #22d3ee; }
.bg-amber { background-color: #fbbf24; }

.fps-text {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: monospace;
}
.fps-val { font-size: 13px; font-weight: 800; }
.fps-unit { font-size: 10px; color: #94a3b8; }

.pill-divider {
  width: 1px;
  height: 12px;
  background-color: rgba(51, 65, 85, 0.6);
}

.ms-val {
  font-size: 11px;
  font-family: monospace;
  color: #94a3b8;
}

.key-hint {
  font-size: 9px;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 3px;
  background-color: rgba(30, 41, 59, 0.9);
  color: #94a3b8;
  border: 1px solid #334155;
}

.github-link {
  color: #94a3b8;
  display: flex;
  align-items: center;
  transition: all 0.25s ease;
}

.github-link:hover {
  color: #22d3ee;
  transform: scale(1.1);
}

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
