<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AutopilotScene from './components/AutopilotScene.vue'
import TopNavBar from './components/TopNavBar.vue'
import DecisionLog from './components/DecisionLog.vue'
import Speedometer from './components/Speedometer.vue'
import RightPanel from './components/RightPanel.vue'
import BottomControls from './components/BottomControls.vue'
import PerformanceHUD from './components/PerformanceHUD.vue'
import LoadingHUD from './components/LoadingHUD.vue'
import type {
  CameraView,
  CockpitState,
  LayerVisibility,
  PerfStats,
  SurroundingVehicle,
  TimeOfDay,
} from './types'

// 3D 数字孪生模型流式加载状态
const modelLoadingProgress = ref<number>(0)
const isModelLoaded = ref<boolean>(false)

// 性能监视器状态 (默认展开，可按 P 键或点击右上角胶囊收起)
const perfStats = ref<PerfStats | null>(null)
const showPerfHUD = ref<boolean>(true)

// 1. 核心自动驾驶与座舱状态
const cockpitState = reactive<CockpitState>({
  targetSpeed: 120,
  currentSpeed: 120,
  gear: 'D',
  accActive: true,
  followDistanceBars: 2,
  ttc: '--',
  frontCarDistance: null,
  batteryPercent: 77,
  remainingRangeKm: 428,
  energyConsumption: 13.1,
  cabinTemp: 23.5,
  cameraView: 'chase',
  timeOfDay: 'day',
  layers: {
    path: true,
    box: true,
    sensor: true,
    pointCloud: true,
  },
  laneStatusText: '车道保持',
  egoLane: 0,
  autoLaneChange: true,
  turnDistanceMeters: 300,
  decisionLogs: [
    { id: '1', time: '09:19:55', text: 'NOA 领航辅助已激活，智能变道超车就绪', type: 'success' },
    { id: '2', time: '09:19:35', text: '变道完成，恢复正常车道保持', type: 'success' },
    { id: '3', time: '09:19:31', text: '目标车辆间距充足，准备向右变道', type: 'info' },
    { id: '4', time: '09:19:21', text: '毫米波与激光雷达多传感融合状态正常', type: 'info' },
  ],
})

// 辅助函数：生成当前时间戳 HH:mm:ss
function getTimeStr() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0',
  )}:${String(now.getSeconds()).padStart(2, '0')}`
}

// 2. 车速平滑插值动画（当用户点击 60 / 80 / 100 / 120 时平滑过渡）
let animId: number
function smoothSpeed() {
  const diff = cockpitState.targetSpeed - cockpitState.currentSpeed
  if (Math.abs(diff) < 0.2) {
    cockpitState.currentSpeed = cockpitState.targetSpeed
  } else {
    cockpitState.currentSpeed += diff * 0.05
  }
  animId = requestAnimationFrame(smoothSpeed)
}

// 3. 模拟环境感知日志动态追加
let logInterval: number | null = null
const candidateTexts = [
  '毫米波雷达持续追踪周围 4 辆动态交通目标',
  '高精地图提示前方 300 米进入平直巡航路段',
  '多线束激光雷达点云配准正常，盲区无异常障碍物',
]

// 4. 车辆感知数据回传联动（更新前车距离与 TTC）
function handleVehicleDataUpdate(vehicles: SurroundingVehicle[]) {
  const frontCars = vehicles.filter(
    (v) => (v.id === 'car-2' || v.id === 'truck-1') && v.z < -3.8,
  )
  const frontCar = frontCars.sort((a, b) => a.distance - b.distance)[0]
  if (frontCar) {
    const dist = frontCar.distance
    const relSpeed = Math.max(1, cockpitState.currentSpeed - frontCar.speed)
    const ttcVal = (dist / (relSpeed * (1000 / 3600))).toFixed(1)

    cockpitState.frontCarDistance = dist
    cockpitState.ttc = Number(ttcVal) > 0 && Number(ttcVal) < 15 ? `${ttcVal}s` : '--'
  } else {
    cockpitState.frontCarDistance = null
    cockpitState.ttc = '--'
  }
}

// 5. 变道控制与自动驾驶事件处理
function handleManualLaneChange(direction: 'left' | 'right') {
  const nextLane = (
    direction === 'left'
      ? Math.max(0, cockpitState.egoLane - 1)
      : Math.min(2, cockpitState.egoLane + 1)
  ) as 0 | 1 | 2
  if (nextLane === cockpitState.egoLane) return
  const dirText = direction === 'left' ? '左' : '右'
  cockpitState.egoLane = nextLane
  cockpitState.laneStatusText = `向${dirText}变道中`
  cockpitState.decisionLogs = [
    {
      id: String(Date.now()),
      time: getTimeStr(),
      text: `手动变道指令：确认${dirText}侧车道安全，开启${dirText}转向灯并执行变道`,
      type: 'info',
    },
    ...cockpitState.decisionLogs.slice(0, 5),
  ]
}

function handleAutoLaneChangeTrigger(targetLane: 0 | 1 | 2, reasonText: string) {
  const dirText = targetLane < cockpitState.egoLane ? '左' : '右'
  cockpitState.egoLane = targetLane
  cockpitState.laneStatusText = `向${dirText}变道中`
  cockpitState.decisionLogs = [
    {
      id: String(Date.now()),
      time: getTimeStr(),
      text: reasonText,
      type: 'info',
    },
    ...cockpitState.decisionLogs.slice(0, 5),
  ]
}

function handleLaneChangeComplete(lane: 0 | 1 | 2) {
  const laneNames = ['左侧快车道', '中间行车道', '右侧慢车道']
  cockpitState.egoLane = lane
  cockpitState.laneStatusText = '车道保持'
  cockpitState.decisionLogs = [
    {
      id: String(Date.now()),
      time: getTimeStr(),
      text: `变道完成，已平稳切入${laneNames[lane]}并恢复 LCC 居中保持`,
      type: 'success',
    },
    ...cockpitState.decisionLogs.slice(0, 5),
  ]
}

function handleLaneChangeBlocked(safeLane: 0 | 1 | 2, reasonText: string) {
  cockpitState.egoLane = safeLane
  cockpitState.laneStatusText = '车道保持'
  cockpitState.decisionLogs = [
    {
      id: String(Date.now()),
      time: getTimeStr(),
      text: reasonText,
      type: 'warning',
    },
    ...cockpitState.decisionLogs.slice(0, 5),
  ]
}

function handleToggleAutoLaneChange() {
  const nextAuto = !cockpitState.autoLaneChange
  cockpitState.autoLaneChange = nextAuto
  cockpitState.decisionLogs = [
    {
      id: String(Date.now()),
      time: getTimeStr(),
      text: nextAuto
        ? 'NOA 智能自主变道超车已开启'
        : 'NOA 智能自主变道已关闭，切换为手动变道模式',
      type: nextAuto ? 'success' : 'warning',
    },
    ...cockpitState.decisionLogs.slice(0, 5),
  ]
}

function handleCameraViewChange(view: CameraView) {
  cockpitState.cameraView = view
}

function handleToggleLayer(layer: keyof LayerVisibility) {
  cockpitState.layers[layer] = !cockpitState.layers[layer]
}

function handleSetSpeed(speed: number) {
  cockpitState.targetSpeed = speed
}

function handleGearChange(gear: 'P' | 'R' | 'N' | 'D') {
  cockpitState.gear = gear
  cockpitState.targetSpeed = gear === 'D' ? 120 : 0
}

function handleFollowDistanceChange(bars: number) {
  cockpitState.followDistanceBars = bars
}

function handleToggleAcc() {
  cockpitState.accActive = !cockpitState.accActive
}

function handleTimeOfDayChange(time: TimeOfDay) {
  cockpitState.timeOfDay = time
}

function handleModelLoaded() {
  isModelLoaded.value = true
  cockpitState.decisionLogs = [
    {
      id: String(Date.now()),
      time: getTimeStr(),
      text: '宝马 M4 数字孪生模型挂载成功，Draco 几何流式解压缩就绪',
      type: 'success',
    },
    ...cockpitState.decisionLogs.slice(0, 5),
  ]
}

function onKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    handleManualLaneChange('left')
  } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    handleManualLaneChange('right')
  }
}

onMounted(() => {
  animId = requestAnimationFrame(smoothSpeed)

  let count = 0
  logInterval = window.setInterval(() => {
    const text = candidateTexts[count % candidateTexts.length]
    count++
    cockpitState.decisionLogs = [
      {
        id: String(Date.now()),
        time: getTimeStr(),
        text,
        type: 'info',
      },
      ...cockpitState.decisionLogs.slice(0, 5),
    ]
  }, 12000)

  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animId)
  if (logInterval) clearInterval(logInterval)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="autopilot-page-root">
    <!-- 3D 模型预加载 HUD 骨架进度遮罩 -->
    <LoadingHUD
      :progress="modelLoadingProgress"
      :is-loaded="isModelLoaded"
    />

    <!-- 3D WebGL 自动驾驶数字孪生主场景 -->
    <AutopilotScene
      :current-speed="cockpitState.currentSpeed"
      :target-speed="cockpitState.targetSpeed"
      :camera-view="cockpitState.cameraView"
      :layers="cockpitState.layers"
      :time-of-day="cockpitState.timeOfDay"
      :lane-status-text="cockpitState.laneStatusText"
      :ego-lane="cockpitState.egoLane"
      :auto-lane-change="cockpitState.autoLaneChange"
      @vehicle-data-update="handleVehicleDataUpdate"
      @perf-update="(stats) => (perfStats = stats)"
      @auto-lane-change-trigger="handleAutoLaneChangeTrigger"
      @lane-change-complete="handleLaneChangeComplete"
      @lane-change-blocked="handleLaneChangeBlocked"
      @model-loading-progress="(p) => (modelLoadingProgress = p)"
      @model-loaded="handleModelLoaded"
    />

    <!-- 2D 车机座舱 HUD 系统 UI 层 -->
    <TopNavBar
      :lane-status-text="cockpitState.laneStatusText"
      :fps="perfStats?.fps"
      :frame-time="perfStats?.frameTime"
      :is-perf-visible="showPerfHUD"
      @toggle-perf="showPerfHUD = !showPerfHUD"
    />

    <DecisionLog :logs="cockpitState.decisionLogs" />

    <Speedometer
      :current-speed="cockpitState.currentSpeed"
      :gear="cockpitState.gear"
      @gear-change="handleGearChange"
    />

    <RightPanel
      :state="cockpitState"
      @follow-distance-change="handleFollowDistanceChange"
      @toggle-acc="handleToggleAcc"
    />

    <BottomControls
      :camera-view="cockpitState.cameraView"
      :layers="cockpitState.layers"
      :target-speed="cockpitState.targetSpeed"
      :time-of-day="cockpitState.timeOfDay"
      :ego-lane="cockpitState.egoLane"
      :auto-lane-change="cockpitState.autoLaneChange"
      @camera-view-change="handleCameraViewChange"
      @toggle-layer="handleToggleLayer"
      @set-speed="handleSetSpeed"
      @time-of-day-change="handleTimeOfDayChange"
      @lane-change="handleManualLaneChange"
      @toggle-auto-lane-change="handleToggleAutoLaneChange"
    />

    <!-- 实时性能 HUD 监控浮窗 -->
    <PerformanceHUD
      :stats="perfStats"
      :is-visible="showPerfHUD"
      @close="showPerfHUD = false"
      @toggle="showPerfHUD = !showPerfHUD"
    />
  </div>
</template>

<style scoped>
.autopilot-page-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #030712;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #f1f5f9;
}
</style>
