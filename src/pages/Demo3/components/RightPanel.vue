<script setup lang="ts">
import type { CockpitState } from '../types'

defineProps<{
  state: CockpitState
}>()

const emit = defineEmits<{
  (e: 'followDistanceChange', bars: number): void
  (e: 'toggleAcc'): void
}>()
</script>

<template>
  <aside class="right-panel-root">
    <!-- 1. 纵向控制 · ACC / AEB -->
    <div class="panel-card">
      <div class="card-header">
        <span class="card-title">纵向控制 · ACC / AEB</span>
        <button
          type="button"
          class="acc-tag-btn"
          :class="state.accActive ? 'acc-active' : 'acc-paused'"
          @click="emit('toggleAcc')"
        >
          {{ state.accActive ? '巡航激活' : '已暂停' }}
        </button>
      </div>

      <div class="metrics-grid">
        <div class="metric-label">设定车速</div>
        <div class="metric-val font-white">{{ state.targetSpeed }} km/h</div>

        <div class="metric-label">实际车速</div>
        <div class="metric-val font-cyan">{{ Math.round(state.currentSpeed) }} km/h</div>

        <div class="metric-label">前车车距</div>
        <div class="metric-val">{{ state.frontCarDistance !== null ? `${state.frontCarDistance} m` : '-- m' }}</div>

        <div class="metric-label">碰撞时间 TTC</div>
        <div class="metric-val">{{ state.ttc }}</div>
      </div>

      <!-- 跟车时距滑块标尺 -->
      <div class="slider-wrapper">
        <div class="slider-header">
          <span>0</span>
          <span class="label-center">安全车距</span>
          <span>60m</span>
        </div>
        <div class="bars-container">
          <div
            v-for="bar in [1, 2, 3, 4]"
            :key="bar"
            class="distance-bar"
            :class="{ 'bar-active': bar <= state.followDistanceBars }"
            @click="emit('followDistanceChange', bar)"
          />
        </div>
      </div>
    </div>

    <!-- 2. 车辆状态 · VEHICLE -->
    <div class="panel-card">
      <div class="card-header border-only">
        <span class="card-title">车辆状态 · VEHICLE</span>
      </div>

      <!-- 动力电池电量进度条 -->
      <div class="battery-section">
        <div class="battery-labels">
          <span class="label-dim">动力电池</span>
          <span class="battery-percent">{{ state.batteryPercent }}%</span>
        </div>
        <div class="battery-track">
          <div class="battery-fill" :style="{ width: `${state.batteryPercent}%` }" />
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-label">续航里程</div>
        <div class="metric-val font-light">{{ state.remainingRangeKm }} km</div>

        <div class="metric-label">能耗</div>
        <div class="metric-val font-light">{{ state.energyConsumption }} kWh/100km</div>

        <div class="metric-label">车内温度</div>
        <div class="metric-val font-light">{{ state.cabinTemp }} °C</div>
      </div>
    </div>

    <!-- 3. 感知系统 · PERCEPTION -->
    <div class="panel-card">
      <div class="card-header border-only">
        <span class="card-title">感知系统 · PERCEPTION</span>
      </div>

      <div class="sensors-list">
        <div class="sensor-row">
          <div class="sensor-name">
            <span class="pulse-dot green" />
            <span>激光雷达 x3</span>
          </div>
          <span class="status-green">正常</span>
        </div>

        <div class="sensor-row">
          <div class="sensor-name">
            <span class="pulse-dot green" />
            <span>毫米波雷达 x5</span>
          </div>
          <span class="status-green">正常</span>
        </div>

        <div class="sensor-row">
          <div class="sensor-name">
            <span class="pulse-dot green" />
            <span>前视摄像头 x3</span>
          </div>
          <span class="status-green">正常</span>
        </div>

        <div class="sensor-row">
          <div class="sensor-name">
            <span class="solid-dot cyan" />
            <span>高精定位 RTK</span>
          </div>
          <span class="status-cyan">厘米级</span>
        </div>

        <div class="sensor-row">
          <div class="sensor-name">
            <span class="solid-dot cyan" />
            <span>V2X 车路协同</span>
          </div>
          <span class="status-cyan">已连接</span>
        </div>

        <div class="sensor-row target-summary">
          <span class="metric-label">目标探测数</span>
          <span class="font-white-bold">4</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.right-panel-root {
  position: absolute;
  right: 20px;
  top: 112px;
  z-index: 20;
  width: 288px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  user-select: none;
}

.panel-card {
  position: relative;
  padding: 14px;
  background-color: rgba(2, 6, 23, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.6);
}

.card-header.border-only {
  justify-content: flex-start;
}

.card-title {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.acc-tag-btn {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  border-width: 1px;
  border-style: solid;
  font-family: monospace;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.acc-tag-btn.acc-active {
  background-color: rgba(6, 78, 59, 0.6);
  border-color: rgba(16, 185, 129, 0.8);
  color: #34d399;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}

.acc-tag-btn.acc-paused {
  background-color: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  row-gap: 6px;
  font-size: 12px;
}

.metric-label {
  color: #94a3b8;
}

.metric-val {
  text-align: right;
  font-family: monospace;
  color: #cbd5e1;
}

.font-white { color: #ffffff; font-weight: 700; }
.font-cyan { color: #22d3ee; font-weight: 700; }
.font-light { color: #e2e8f0; font-weight: 500; }
.font-white-bold { color: #ffffff; font-weight: 700; font-family: monospace; }

.slider-wrapper {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(30, 41, 59, 0.6);
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #64748b;
  font-family: monospace;
  margin-bottom: 4px;
}

.label-center {
  color: #94a3b8;
}

.bars-container {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 8px;
}

.distance-bar {
  flex: 1;
  height: 6px;
  border-radius: 9999px;
  cursor: pointer;
  background-color: #1e293b;
  transition: background-color 0.2s ease;
}

.distance-bar.bar-active {
  background-color: #22d3ee;
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
}

.battery-section {
  margin-bottom: 10px;
}

.battery-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}

.label-dim {
  color: #94a3b8;
}

.battery-percent {
  font-family: monospace;
  font-weight: 700;
  color: #22d3ee;
}

.battery-track {
  width: 100%;
  height: 8px;
  background-color: #1e293b;
  border-radius: 9999px;
  overflow: hidden;
  padding: 2px;
}

.battery-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #06b6d4 0%, #34d399 100%);
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.6);
  transition: width 0.3s ease;
}

.sensors-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.sensor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sensor-name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.pulse-dot.green {
  background-color: #34d399;
  animation: pulse-green 1.5s infinite;
}

@keyframes pulse-green {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.9); }
}

.solid-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.solid-dot.cyan {
  background-color: #22d3ee;
}

.status-green {
  color: #34d399;
  font-size: 11px;
  font-family: monospace;
}

.status-cyan {
  color: #22d3ee;
  font-size: 11px;
  font-family: monospace;
}

.target-summary {
  padding-top: 4px;
  border-top: 1px solid rgba(30, 41, 59, 0.6);
  margin-top: 2px;
}
</style>
