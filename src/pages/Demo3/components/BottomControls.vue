<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { CameraView, LayerVisibility, TimeOfDay } from '../types'

defineProps<{
  cameraView: CameraView
  layers: LayerVisibility
  targetSpeed: number
  timeOfDay: TimeOfDay
  egoLane: 0 | 1 | 2
  autoLaneChange: boolean
}>()

const emit = defineEmits<{
  (e: 'cameraViewChange', view: CameraView): void
  (e: 'toggleLayer', layer: keyof LayerVisibility): void
  (e: 'setSpeed', speed: number): void
  (e: 'timeOfDayChange', time: TimeOfDay): void
  (e: 'laneChange', direction: 'left' | 'right'): void
  (e: 'toggleAutoLaneChange'): void
}>()

const currentTime = ref({
  timeStr: '09:19',
  dateStr: '9月30日 周三',
})

let timer: number | null = null

function updateTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const week = weekDays[now.getDay()]

  currentTime.value = {
    timeStr: `${hours}:${minutes}`,
    dateStr: `${month}月${day}日 ${week}`,
  }
}

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const viewOptions = [
  { id: 'chase', label: '跟车' },
  { id: 'top', label: '俯视' },
  { id: 'cockpit', label: '驾驶' },
  { id: 'free', label: '自由' },
] as const

const layerOptions = [
  { id: 'path' as const, label: '规划路径' },
  { id: 'box' as const, label: '检测框' },
  { id: 'sensor' as const, label: '传感器' },
  { id: 'pointCloud' as const, label: '点云' },
]

const speedOptions = [60, 80, 100, 120]
</script>

<template>
  <footer class="bottom-controls-bar">
    <!-- 边角修饰符 -->
    <div class="corner corner-tl" />
    <div class="corner corner-tr" />

    <!-- 左侧控制功能区：视角、图层、车速、变道、环境 -->
    <div class="controls-left">
      <!-- 1. 视角切换 -->
      <div class="control-group">
        <span class="group-label">视角</span>
        <div class="btn-group">
          <button
            v-for="item in viewOptions"
            :key="item.id"
            type="button"
            class="seg-btn"
            :class="{ 'seg-active': cameraView === item.id }"
            @click="emit('cameraViewChange', item.id)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <!-- 2. 业务图层显隐开关 -->
      <div class="control-group">
        <span class="group-label">业务层</span>
        <div class="tags-group">
          <button
            v-for="layer in layerOptions"
            :key="layer.id"
            type="button"
            class="layer-btn"
            :class="{ 'layer-active': layers[layer.id] }"
            @click="emit('toggleLayer', layer.id)"
          >
            {{ layer.label }}
          </button>
        </div>
      </div>

      <!-- 3. 车速快捷预设 -->
      <div class="control-group">
        <span class="group-label">车速</span>
        <div class="btn-group">
          <button
            v-for="spd in speedOptions"
            :key="spd"
            type="button"
            class="seg-btn mono-font"
            :class="{ 'seg-active': targetSpeed === spd }"
            @click="emit('setSpeed', spd)"
          >
            {{ spd }}
          </button>
        </div>
      </div>

      <!-- 4. 自动变道与手动变道控制 -->
      <div class="control-group">
        <span class="group-label">变道</span>
        <div class="lane-ctrl-group">
          <button
            type="button"
            :disabled="egoLane === 0"
            title="向左变道 (快捷键 A / ←)"
            class="action-btn"
            :class="{ 'disabled-btn': egoLane === 0 }"
            @click="emit('laneChange', 'left')"
          >
            ◀ 左变道
          </button>
          <button
            type="button"
            title="开启/关闭遇到前车时自动感知变道超车"
            class="action-btn"
            :class="autoLaneChange ? 'auto-lane-on' : 'auto-lane-off'"
            @click="emit('toggleAutoLaneChange')"
          >
            智能变道
          </button>
          <button
            type="button"
            :disabled="egoLane === 2"
            title="向右变道 (快捷键 D / →)"
            class="action-btn"
            :class="{ 'disabled-btn': egoLane === 2 }"
            @click="emit('laneChange', 'right')"
          >
            右变道 ▶
          </button>
        </div>
      </div>

      <!-- 5. 白天/夜间环境切换 -->
      <div class="control-group">
        <span class="group-label">环境</span>
        <div class="btn-group">
          <button
            type="button"
            class="seg-btn flex-center"
            :class="{ 'seg-active-day': timeOfDay === 'day' }"
            @click="emit('timeOfDayChange', 'day')"
          >
            <span>☀️</span>
            <span>白天</span>
          </button>
          <button
            type="button"
            class="seg-btn flex-center"
            :class="{ 'seg-active': timeOfDay === 'night' }"
            @click="emit('timeOfDayChange', 'night')"
          >
            <span>🌙</span>
            <span>夜间</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 中部车道示意小地图与图例 -->
    <div class="mini-lane-map">
      <div class="lane-track-box">
        <div class="curb-line" />
        <div class="dashed-lane" />
        <div class="dashed-lane" />
        <!-- 自车标记小点 -->
        <div
          class="ego-car-dot"
          :style="{ left: `${7 + egoLane * 9}px` }"
        />
        <!-- 前车标记小点 -->
        <div class="front-car-dot" />
      </div>

      <!-- 图例 -->
      <div class="legend-list">
        <div class="legend-item cyan">
          <span class="legend-dot bg-cyan" />
          <span>本车</span>
        </div>
        <div class="legend-item slate">
          <span class="legend-dot bg-slate" />
          <span>同向车辆</span>
        </div>
        <div class="legend-item amber">
          <span class="legend-dot bg-amber" />
          <span>对向车辆</span>
        </div>
      </div>
    </div>

    <!-- 右下角系统时钟 -->
    <div class="clock-box">
      <span class="clock-time">{{ currentTime.timeStr }}</span>
      <span class="clock-date">{{ currentTime.dateStr }}</span>
    </div>
  </footer>
</template>

<style scoped>
.bottom-controls-bar {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: rgba(2, 6, 23, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 41, 59, 0.8);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  user-select: none;
}

.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(6, 182, 212, 0.4);
}
.corner-tl { top: 4px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.corner-tr { top: 4px; right: 8px; border-top: 1px solid; border-right: 1px solid; }

.controls-left {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 12px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-label {
  color: #94a3b8;
  font-weight: 500;
}

.btn-group {
  display: flex;
  align-items: center;
  background-color: rgba(15, 23, 42, 0.9);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid #1e293b;
}

.seg-btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.seg-btn:hover {
  color: #e2e8f0;
}

.seg-btn.seg-active {
  background-color: #22d3ee;
  color: #020617;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
}

.seg-btn.seg-active-day {
  background-color: #fbbf24;
  color: #020617;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
}

.mono-font {
  font-family: monospace;
}

.flex-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tags-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layer-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #1e293b;
  background-color: rgba(15, 23, 42, 0.6);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-btn:hover {
  color: #cbd5e1;
}

.layer-btn.layer-active {
  background-color: rgba(8, 51, 68, 0.7);
  border-color: rgba(34, 211, 238, 0.8);
  color: #67e8f9;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.lane-ctrl-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: rgba(15, 23, 42, 0.9);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid #1e293b;
}

.action-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #cbd5e1;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(.disabled-btn) {
  background-color: #1e293b;
  color: #67e8f9;
}

.action-btn.disabled-btn {
  color: #475569;
  cursor: not-allowed;
}

.action-btn.auto-lane-on {
  background-color: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(52, 211, 153, 0.7);
  color: #6ee7b7;
  font-weight: 700;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.35);
}

.action-btn.auto-lane-off {
  color: #94a3b8;
}

.mini-lane-map {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 16px;
  background-color: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(30, 41, 59, 0.8);
}

.lane-track-box {
  position: relative;
  width: 36px;
  height: 28px;
  background-color: rgba(2, 6, 23, 0.9);
  border-radius: 4px;
  border: 1px solid rgba(51, 65, 85, 0.8);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 2px;
}

.curb-line {
  width: 1px;
  height: 100%;
  background-color: rgba(245, 158, 11, 0.8);
}

.dashed-lane {
  width: 1px;
  height: 100%;
  border-right: 1px dashed #475569;
}

.ego-car-dot {
  position: absolute;
  width: 8px;
  height: 10px;
  border-radius: 2px;
  background-color: #22d3ee;
  bottom: 4px;
  transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.9);
}

.front-car-dot {
  position: absolute;
  width: 8px;
  height: 12px;
  border-radius: 2px;
  background-color: #f59e0b;
  top: 4px;
  right: 4px;
}

.legend-list {
  display: flex;
  flex-direction: column;
  font-size: 10px;
  line-height: 1.25;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-item.cyan { color: #67e8f9; }
.legend-item.slate { color: #cbd5e1; }
.legend-item.amber { color: #fbbf24; }

.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.bg-cyan { background-color: #22d3ee; }
.bg-slate { background-color: #94a3b8; }
.bg-amber { background-color: #f59e0b; }

.clock-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.clock-time {
  font-size: 20px;
  font-weight: 900;
  font-family: monospace;
  letter-spacing: -0.05em;
  color: #ffffff;
  line-height: 1;
}

.clock-date {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 2px;
}
</style>
