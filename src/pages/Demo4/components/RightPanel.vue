<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import type { AnimationType, CameraViewMode } from '../types'

interface Props {
  cameraView: CameraViewMode
  currentAnimation: AnimationType
  modelType?: 'anime' | 'magical'
}

withDefaults(defineProps<Props>(), {
  modelType: 'anime',
})

const emit = defineEmits<{
  (e: 'changeCameraView', view: CameraViewMode): void
  (e: 'playAction', action: AnimationType): void
  (e: 'changeModelType', type: 'anime' | 'magical'): void
  (e: 'clearHistory'): void
}>()

const activeActionTab = ref<'business' | 'stage'>('business')

interface ActionItem {
  id: AnimationType
  name: string
  icon: string
}

const BUSINESS_ACTIONS: ActionItem[] = [
  { id: 'Talking_1', name: '优雅讲解', icon: '👋' },
  { id: 'Talking_0', name: '数据研判', icon: '📊' },
  { id: 'Talking_2', name: '战术致意', icon: '✨' },
  { id: 'Idle', name: '舒缓待机', icon: '🌸' },
  { id: 'Laughing', name: '亲切微笑', icon: '😄' },
  { id: 'Angry', name: '态势警示', icon: '⚡' },
]

const STAGE_ACTIONS: ActionItem[] = [
  { id: 'Rumba', name: '才艺律动', icon: '🎵' },
  { id: 'StagePose', name: '舞台主奏', icon: '✨' },
  { id: 'StageCheer', name: '欢呼应援', icon: '💃' },
  { id: 'Walk', name: '全息巡台', icon: '🚶' },
  { id: 'FocusPose', name: '聚焦特写', icon: '🔍' },
  { id: 'Crying', name: '警觉戒备', icon: '🛡️' },
]

const pieChartRef = ref<HTMLDivElement | null>(null)
let pieChart: echarts.ECharts | null = null

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10, 18, 38, 0.9)',
      borderColor: 'rgba(0, 242, 254, 0.5)',
      textStyle: { color: '#f8fafc', fontSize: 12 },
    },
    legend: {
      bottom: '0%',
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: '会话意图分类',
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: 'rgba(8, 16, 34, 0.9)',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        data: [
          { value: 38, name: '智慧城市', itemStyle: { color: '#00f2fe' } },
          { value: 27, name: '工业油田', itemStyle: { color: '#f59e0b' } },
          { value: 20, name: '自动驾驶', itemStyle: { color: '#a855f7' } },
          { value: 15, name: '调度指令', itemStyle: { color: '#10b981' } },
        ],
      },
    ],
  }

  pieChart.setOption(option)
}

function handleResize() {
  pieChart?.resize()
}

onMounted(() => {
  initPieChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
})
</script>

<template>
  <aside class="right-panel">
    <!-- 卡片 1：知识中枢活跃切片 -->
    <div class="tech-panel-card">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot" />
          <h3 class="card-title">大屏知识调度引擎</h3>
        </div>
        <span class="status-badge">RAG ACTIVE</span>
      </div>

      <div class="slice-list">
        <div class="slice-item active">
          <div class="slice-dot cyan" />
          <div class="slice-info">
            <div class="slice-name">Demo1 四川政务数据共享中枢</div>
            <div class="slice-meta">节点：21个市州 · 向量检索度 98.4%</div>
          </div>
        </div>

        <div class="slice-item">
          <div class="slice-dot amber" />
          <div class="slice-info">
            <div class="slice-name">Demo2 塔里木深地油气物联网</div>
            <div class="slice-meta">井深：9820m · 遥测指令通道就绪</div>
          </div>
        </div>

        <div class="slice-item">
          <div class="slice-dot purple" />
          <div class="slice-info">
            <div class="slice-name">Demo3 智驾高精协同决策孪生</div>
            <div class="slice-meta">传感器融合：毫米波 + 激光雷达</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 卡片 2：意图分类饼图 -->
    <div class="tech-panel-card chart-card">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot" />
          <h3 class="card-title">意图语义分类分布</h3>
        </div>
      </div>
      <div ref="pieChartRef" class="chart-container" />
    </div>

    <!-- 卡片 3：全息运镜与动作调度 -->
    <div class="tech-panel-card flex-1">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot" />
          <h3 class="card-title">全息运镜与动作调度</h3>
        </div>
      </div>

      <!-- 初音未来全息模型版本切换 -->
      <div class="ctrl-group">
        <span class="ctrl-label">初音未来 3D 形象风格</span>
        <div class="model-style-grid">
          <button
            class="style-toggle-btn"
            :class="{ active: modelType === 'anime' }"
            @click="emit('changeModelType', 'anime')"
          >
            <div class="style-icon-dot cyan" />
            <div class="style-text-box">
              <span class="style-name">蔚蓝动漫萌系</span>
              <span class="style-sub">经典高精贴图</span>
            </div>
            <span v-if="modelType === 'anime'" class="active-check">✓</span>
          </button>
          <button
            class="style-toggle-btn"
            :class="{ active: modelType === 'magical' }"
            @click="emit('changeModelType', 'magical')"
          >
            <div class="style-icon-dot purple" />
            <div class="style-text-box">
              <span class="style-name">魔法未来Live</span>
              <span class="style-sub">舞台全息32步</span>
            </div>
            <span v-if="modelType === 'magical'" class="active-check">✓</span>
          </button>
        </div>
      </div>

      <!-- 机位切换 -->
      <div class="ctrl-group">
        <span class="ctrl-label">摄像机全息运镜机位</span>
        <div class="btn-group">
          <button
            class="action-btn"
            :class="{ active: cameraView === 'wide' }"
            @click="emit('changeCameraView', 'wide')"
          >
            <span>⛶</span>
            <span>全景舞台</span>
          </button>
          <button
            class="action-btn"
            :class="{ active: cameraView === 'medium' }"
            @click="emit('changeCameraView', 'medium')"
          >
            <span>👤</span>
            <span>半身讲解</span>
          </button>
          <button
            class="action-btn"
            :class="{ active: cameraView === 'closeup' }"
            @click="emit('changeCameraView', 'closeup')"
          >
            <span>🔍</span>
            <span>面部特写</span>
          </button>
        </div>
      </div>

      <!-- 动作触发 (业务讲解 6 动作 + 舞台才艺 6 动作) -->
      <div class="ctrl-group">
        <div class="action-tab-header">
          <span class="ctrl-label">专业动作与舞台互动</span>
          <div class="tab-pill-box">
            <button
              type="button"
              class="tab-pill"
              :class="{ active: activeActionTab === 'business' }"
              @click="activeActionTab = 'business'"
            >
              🎙️ 业务
            </button>
            <button
              type="button"
              class="tab-pill"
              :class="{ active: activeActionTab === 'stage' }"
              @click="activeActionTab = 'stage'"
            >
              🌟 舞台
            </button>
          </div>
        </div>

        <div v-show="activeActionTab === 'business'" class="action-grid">
          <button
            v-for="act in BUSINESS_ACTIONS"
            :key="act.id"
            class="action-chip"
            :class="{ active: currentAnimation === act.id }"
            @click="emit('playAction', act.id)"
          >
            <span>{{ act.icon }}</span>
            <span>{{ act.name }}</span>
          </button>
        </div>

        <div v-show="activeActionTab === 'stage'" class="action-grid">
          <button
            v-for="act in STAGE_ACTIONS"
            :key="act.id"
            class="action-chip"
            :class="{ active: currentAnimation === act.id }"
            @click="emit('playAction', act.id)"
          >
            <span>{{ act.icon }}</span>
            <span>{{ act.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.right-panel {
  position: absolute;
  top: 96px;
  right: 24px;
  bottom: 24px;
  width: 360px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 14px;
  pointer-events: none;
}

.tech-panel-card {
  position: relative;
  pointer-events: auto;
  background: linear-gradient(135deg, rgba(8, 16, 34, 0.88) 0%, rgba(12, 24, 46, 0.82) 100%);
  border: 1px solid rgba(0, 242, 254, 0.25);
  border-radius: 6px;
  backdrop-filter: blur(14px);
  padding: 14px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 16px rgba(0, 242, 254, 0.04);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.tech-panel-card:hover {
  border-color: rgba(0, 242, 254, 0.45);
  box-shadow: 0 8px 36px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0, 242, 254, 0.08);
}

.tech-panel-card.flex-1 {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  pointer-events: none;
}

.card-corner.tl {
  top: -1px;
  left: -1px;
  border-top: 2px solid #00f2fe;
  border-left: 2px solid #00f2fe;
}
.card-corner.tr {
  top: -1px;
  right: -1px;
  border-top: 2px solid #00f2fe;
  border-right: 2px solid #00f2fe;
}
.card-corner.bl {
  bottom: -1px;
  left: -1px;
  border-bottom: 2px solid #00f2fe;
  border-left: 2px solid #00f2fe;
}
.card-corner.br {
  bottom: -1px;
  right: -1px;
  border-bottom: 2px solid #00f2fe;
  border-right: 2px solid #00f2fe;
}

.card-top-light {
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00f2fe, #a855f7, transparent);
  opacity: 0.8;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-glow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00f2fe;
  box-shadow: 0 0 8px #00f2fe;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.5px;
}

.status-badge {
  font-size: 10px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 4px;
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid rgba(0, 242, 254, 0.35);
}

.slice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slice-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.25s;
}

.slice-item:hover {
  background: rgba(0, 242, 254, 0.06);
  border-color: rgba(0, 242, 254, 0.25);
}

.slice-item.active {
  background: rgba(0, 242, 254, 0.1);
  border-color: rgba(0, 242, 254, 0.4);
  box-shadow: inset 0 0 12px rgba(0, 242, 254, 0.08);
}

.slice-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}

.slice-dot.cyan {
  background: #00f2fe;
  box-shadow: 0 0 8px #00f2fe;
}
.slice-dot.amber {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
}
.slice-dot.purple {
  background: #a855f7;
  box-shadow: 0 0 8px #a855f7;
}

.slice-name {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
}

.slice-meta {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

.chart-card {
  height: 195px;
  display: flex;
  flex-direction: column;
}

.chart-container {
  width: 100%;
  flex: 1;
}

.model-style-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.style-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.25s;
}

.style-toggle-btn:hover {
  border-color: rgba(0, 242, 254, 0.5);
  background: rgba(0, 242, 254, 0.08);
}

.style-toggle-btn.active {
  border-color: #00f2fe;
  background: rgba(0, 242, 254, 0.16);
  box-shadow: 0 0 14px rgba(0, 242, 254, 0.25);
}

.style-icon-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.style-icon-dot.cyan {
  background: #00f2fe;
  box-shadow: 0 0 8px #00f2fe;
}
.style-icon-dot.purple {
  background: #c084fc;
  box-shadow: 0 0 8px #c084fc;
}

.style-text-box {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.style-name {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
}

.style-sub {
  font-size: 9px;
  color: #94a3b8;
  margin-top: 1px;
}

.active-check {
  font-size: 11px;
  color: #00f2fe;
  font-weight: 800;
}

.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ctrl-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.action-tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tab-pill-box {
  display: flex;
  gap: 3px;
  background: rgba(15, 23, 42, 0.85);
  padding: 2px 3px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-pill {
  padding: 2px 8px;
  font-size: 10px;
  color: #94a3b8;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-pill:hover {
  color: #e2e8f0;
}

.tab-pill.active {
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.18);
  font-weight: 700;
  box-shadow: 0 0 8px rgba(0, 242, 254, 0.3);
}

.btn-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  font-size: 11px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0, 242, 254, 0.15);
  border-color: #00f2fe;
  color: #00f2fe;
}

.action-btn.active {
  background: linear-gradient(90deg, rgba(0, 242, 254, 0.3), rgba(168, 85, 247, 0.3));
  border-color: #00f2fe;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.35);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.action-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 2px;
  font-size: 11px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-chip:hover {
  border-color: #a855f7;
  color: #c084fc;
}

.action-chip.active {
  background: rgba(168, 85, 247, 0.22);
  border-color: #a855f7;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
}
</style>
