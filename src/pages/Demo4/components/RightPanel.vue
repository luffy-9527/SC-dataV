<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import type { AnimationType, CameraViewMode } from '../types'
import { getLiveTelemetrySnapshot, type LiveTelemetrySnapshot } from '../composables/useAIAgent'

export interface KnowledgeSlice {
  id: 'demo1' | 'demo2' | 'demo3' | 'cross_screen'
  title: string
  meta: string
  tag: string
  color: 'cyan' | 'amber' | 'purple'
  broadcastText?: string
  actionTag: string
  cameraView: CameraViewMode
  animation: AnimationType
}

interface Props {
  cameraView: CameraViewMode
  currentAnimation: AnimationType
  modelType?: 'anime' | 'magical'
  activeBroadcastingId?: string | null
  isSpeaking?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelType: 'anime',
  activeBroadcastingId: null,
  isSpeaking: false,
})

const emit = defineEmits<{
  (e: 'changeCameraView', view: CameraViewMode): void
  (e: 'playAction', action: AnimationType): void
  (e: 'changeModelType', type: 'anime' | 'magical'): void
  (e: 'broadcastKnowledge', item: KnowledgeSlice): void
  (e: 'clearHistory'): void
}>()

const activeActionTab = ref<'business' | 'stage'>('business')

// 实时动态遥测快照（每 3 秒刷新一次流式波动数据）
const snapshot = ref<LiveTelemetrySnapshot>(getLiveTelemetrySnapshot())
let telemetryTimer: any = null

onMounted(() => {
  telemetryTimer = setInterval(() => {
    snapshot.value = getLiveTelemetrySnapshot()
  }, 3000)
})

onBeforeUnmount(() => {
  if (telemetryTimer) clearInterval(telemetryTimer)
})

// 动态多源实时分析切片列表（数据实时计算，彻底告别死文字）
const knowledgeSlices = computed<KnowledgeSlice[]>(() => {
  const s = snapshot.value
  return [
    {
      id: 'demo1',
      title: 'Demo1 四川政务数据共享中枢',
      meta: `节点: 21市州 · 今日调用 ${s.demo1.todayCalls} · 负载 ${s.demo1.cpuLoad}`,
      tag: '政务智算',
      color: 'cyan',
      actionTag: '[NAVIGATE_DEMO1]',
      cameraView: 'medium',
      animation: 'Talking_1',
    },
    {
      id: 'demo2',
      title: 'Demo2 塔里木深地油气物联网',
      meta: `实时进尺: ${s.demo2.depth} · 井口压力 ${s.demo2.pressure}`,
      tag: '万米深地',
      color: 'amber',
      actionTag: '[NAVIGATE_DEMO2]',
      cameraView: 'medium',
      animation: 'Talking_0',
    },
    {
      id: 'demo3',
      title: 'Demo3 智驾高精协同决策孪生',
      meta: `融合时延: ${s.demo3.latency} · 碰撞时距 ${s.demo3.ttc}`,
      tag: '端到端智驾',
      color: 'purple',
      actionTag: '[NAVIGATE_DEMO3]',
      cameraView: 'medium',
      animation: 'Talking_2',
    },
    {
      id: 'cross_screen',
      title: '★ 全域数智协同综合研判',
      meta: `跨屏协同指数: ${s.crossScreen.synergyScore} · 运营态势 ${s.crossScreen.compositeStatus}`,
      tag: '三屏整合',
      color: 'cyan',
      actionTag: '[SHOW_REPORT]',
      cameraView: 'wide',
      animation: 'Talking_2',
    },
  ]
})

interface ActionItem {
  id: AnimationType
  name: string
  icon: string
  badge?: string
}

const BUSINESS_ACTIONS: ActionItem[] = [
  { id: 'Talking_1', name: '优雅讲解', icon: '👋', badge: '常用' },
  { id: 'Talking_0', name: '数据研判', icon: '📊', badge: '分析' },
  { id: 'Talking_2', name: '战术致意', icon: '✨', badge: '礼仪' },
  { id: 'Idle', name: '舒缓待机', icon: '🌸' },
  { id: 'Laughing', name: '亲切微笑', icon: '😄' },
  { id: 'Angry', name: '态势警示', icon: '⚡', badge: '预警' },
]

const STAGE_ACTIONS: ActionItem[] = [
  { id: 'StagePose', name: '舞台主奏', icon: '✨', badge: 'Live' },
  { id: 'Rumba', name: '才艺律动', icon: '🎵', badge: '打Call' },
  { id: 'StageCheer', name: '欢呼应援', icon: '💃', badge: '大招' },
  { id: 'Walk', name: '全息巡台', icon: '🚶' },
  { id: 'FocusPose', name: '聚焦特写', icon: '🔍' },
  { id: 'Crying', name: '警觉戒备', icon: '🛡️' },
]

// ECharts 意图语义环形图
const chartContainerRef = ref<HTMLDivElement | null>(null)
let intentChart: echarts.ECharts | null = null

function initIntentChart() {
  if (!chartContainerRef.value) return
  intentChart = echarts.init(chartContainerRef.value)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 16, 36, 0.94)',
      borderColor: 'rgba(0, 242, 254, 0.5)',
      textStyle: { color: '#f1f5f9', fontSize: 11 },
      formatter: '{b}: {c}% ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '6%',
      top: 'middle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 8,
      textStyle: {
        color: '#94a3b8',
        fontSize: 10,
      },
    },
    series: [
      {
        name: '意图分类',
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'rgba(8, 16, 36, 0.95)',
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

  intentChart.setOption(option)
}

function handleResize() {
  intentChart?.resize()
}

onMounted(() => {
  initIntentChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  intentChart?.dispose()
})

function handleSliceClick(item: KnowledgeSlice) {
  emit('broadcastKnowledge', item)
}
</script>

<template>
  <aside class="right-panel">
    <!-- 卡片 1：大屏知识调度引擎 (自然高度包裹) -->
    <div class="tech-panel-card card-knowledge">
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
        <div class="header-right">
          <span
            v-if="props.isSpeaking && props.activeBroadcastingId"
            class="status-badge live-broadcasting"
          >
            <span class="pulse-beacon" /> 正在播报
          </span>
          <span v-else class="status-badge">RAG ACTIVE</span>
        </div>
      </div>

      <div class="slice-list">
        <div
          v-for="slice in knowledgeSlices"
          :key="slice.id"
          class="slice-item"
          :class="{
            active: props.activeBroadcastingId === slice.id,
            'is-speaking': props.isSpeaking && props.activeBroadcastingId === slice.id,
          }"
          @click="handleSliceClick(slice)"
        >
          <div class="slice-dot" :class="slice.color" />
          <div class="slice-info">
            <div class="slice-name-row">
              <span class="slice-name">{{ slice.title }}</span>
              <span class="slice-tag" :class="slice.color">{{ slice.tag }}</span>
            </div>
            <div class="slice-meta">{{ slice.meta }}</div>
          </div>

          <button
            type="button"
            class="broadcast-btn"
            :class="{ active: props.activeBroadcastingId === slice.id }"
            :title="`点击快速播报：${slice.title}`"
          >
            <template v-if="props.isSpeaking && props.activeBroadcastingId === slice.id">
              <span class="wave-box">
                <span class="wave-bar b1" />
                <span class="wave-bar b2" />
                <span class="wave-bar b3" />
              </span>
              <span class="btn-text">播报中</span>
            </template>
            <template v-else>
              <span class="btn-icon">🔊</span>
              <span class="btn-text">播报</span>
            </template>
          </button>
        </div>
      </div>
    </div>

    <!-- 卡片 2：意图语义分类分布 (固定适度高度 155px) -->
    <div class="tech-panel-card card-chart">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot cyan" />
          <h3 class="card-title">意图语义分类分布</h3>
        </div>
        <span class="meta-rate">匹配率 98.4%</span>
      </div>

      <div class="chart-content">
        <div ref="chartContainerRef" class="echarts-box" />
      </div>
    </div>

    <!-- 卡片 3：全息运镜与动作调度舱 (完全按内容自然高度排布，不拉伸，不留大黑洞！) -->
    <div class="tech-panel-card card-controls">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot purple" />
          <h3 class="card-title">全息运镜与动作调度</h3>
        </div>
        <span class="status-mode-pill" :class="{ 'live-mode': props.modelType === 'magical' }">
          {{ props.modelType === 'magical' ? '🌟 LIVE 舞台态' : '💎 数智专员态' }}
        </span>
      </div>

      <!-- 1. 初音未来 3D 形象风格切换 -->
      <div class="ctrl-group">
        <div class="group-title-row">
          <span class="group-title">形象风格重构</span>
          <span class="group-sub">动态加载 3D 模型资产</span>
        </div>
        <div class="style-cards-grid">
          <button
            type="button"
            class="style-card anime"
            :class="{ active: props.modelType === 'anime' }"
            @click="emit('changeModelType', 'anime')"
          >
            <div class="card-dot cyan" />
            <div class="card-info">
              <span class="card-name">全息数智专员</span>
              <span class="card-sub">高精手办 · 商务原色</span>
            </div>
            <span v-if="props.modelType === 'anime'" class="card-check cyan">✓</span>
          </button>

          <button
            type="button"
            class="style-card magical"
            :class="{ active: props.modelType === 'magical' }"
            @click="emit('changeModelType', 'magical')"
          >
            <div class="card-dot purple" />
            <div class="card-info">
              <span class="card-name">魔法未来 Live</span>
              <span class="card-sub">舞台演出服 · 持荧光棒</span>
            </div>
            <span v-if="props.modelType === 'magical'" class="card-check purple">✓</span>
          </button>
        </div>
      </div>

      <!-- 2. 全息摄像机运镜机位 -->
      <div class="ctrl-group">
        <div class="group-title-row">
          <span class="group-title">摄像机全息运镜</span>
          <span class="group-sub">GSAP 视点三维缓动</span>
        </div>
        <div class="cam-nav-grid">
          <button
            type="button"
            class="cam-btn"
            :class="{ active: props.cameraView === 'wide' }"
            @click="emit('changeCameraView', 'wide')"
          >
            <span class="cam-icon">⛶</span>
            <span class="cam-name">全景舞台</span>
            <span class="cam-meter">3.6m</span>
          </button>

          <button
            type="button"
            class="cam-btn"
            :class="{ active: props.cameraView === 'medium' }"
            @click="emit('changeCameraView', 'medium')"
          >
            <span class="cam-icon">👤</span>
            <span class="cam-name">半身讲解</span>
            <span class="cam-meter">2.6m</span>
          </button>

          <button
            type="button"
            class="cam-btn"
            :class="{ active: props.cameraView === 'closeup' }"
            @click="emit('changeCameraView', 'closeup')"
          >
            <span class="cam-icon">🔍</span>
            <span class="cam-name">面部特写</span>
            <span class="cam-meter">1.7m</span>
          </button>
        </div>
      </div>

      <!-- 3. 专业动作与舞台互动调度 -->
      <div class="ctrl-group">
        <div class="group-title-row">
          <div class="title-with-pill">
            <span class="group-title">肢体动作神经调度</span>
          </div>
          <div class="tab-slider-wrap">
            <button
              type="button"
              class="tab-btn"
              :class="{ active: activeActionTab === 'business' }"
              @click="activeActionTab = 'business'"
            >
              🎙️ 业务
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: activeActionTab === 'stage' }"
              @click="activeActionTab = 'stage'"
            >
              🌟 舞台
            </button>
          </div>
        </div>

        <div v-show="activeActionTab === 'business'" class="actions-grid">
          <button
            v-for="act in BUSINESS_ACTIONS"
            :key="act.id"
            type="button"
            class="action-btn"
            :class="{ active: props.currentAnimation === act.id }"
            @click="emit('playAction', act.id)"
          >
            <span class="act-icon">{{ act.icon }}</span>
            <span class="act-name">{{ act.name }}</span>
            <span v-if="act.badge" class="act-badge cyan">{{ act.badge }}</span>
          </button>
        </div>

        <div v-show="activeActionTab === 'stage'" class="actions-grid">
          <button
            v-for="act in STAGE_ACTIONS"
            :key="act.id"
            type="button"
            class="action-btn stage"
            :class="{ active: props.currentAnimation === act.id }"
            @click="emit('playAction', act.id)"
          >
            <span class="act-icon">{{ act.icon }}</span>
            <span class="act-name">{{ act.name }}</span>
            <span v-if="act.badge" class="act-badge purple">{{ act.badge }}</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 右侧整体容器：与左侧面板绝对对齐 (top: 96px, bottom: 24px, width: 360px, gap: 14px) */
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
  box-sizing: border-box;
}

/* 统一赛博面板科技卡片 */
.tech-panel-card {
  position: relative;
  pointer-events: auto;
  background: linear-gradient(135deg, rgba(8, 16, 34, 0.92) 0%, rgba(12, 24, 46, 0.88) 100%);
  border: 1px solid rgba(0, 242, 254, 0.22);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  padding: 12px 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65), inset 0 0 16px rgba(0, 242, 254, 0.04);
  transition: border-color 0.25s, box-shadow 0.25s;
  box-sizing: border-box;
}

.tech-panel-card:hover {
  border-color: rgba(0, 242, 254, 0.42);
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.72), inset 0 0 20px rgba(0, 242, 254, 0.08);
}

/* 卡片 1 高度自然紧凑包裹 */
.card-knowledge {
  flex-shrink: 0;
}

/* 卡片 2 图表：弹性填充所有剩余空间 (与左侧雷达图完美呼应，左右平衡，不产生任何空隙！) */
.card-chart {
  flex: 1;
  min-height: 155px;
  display: flex;
  flex-direction: column;
}

.chart-content {
  flex: 1;
  width: 100%;
  position: relative;
  min-height: 0;
}

.echarts-box {
  width: 100%;
  height: 100%;
}

.meta-rate {
  font-size: 10px;
  color: #38bdf8;
  font-family: monospace;
  background: rgba(0, 242, 254, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid rgba(0, 242, 254, 0.25);
}

/* 卡片 3：完全根据内容紧凑排列 (flex-shrink: 0 告别大黑洞！) */
.card-controls {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 屏幕四角科技角标饰件 */
.card-corner {
  position: absolute;
  width: 7px;
  height: 7px;
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
  left: 18px;
  right: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00f2fe, #a855f7, transparent);
  opacity: 0.75;
}

/* 标题栏 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 7px;
}

.title-glow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00f2fe;
  box-shadow: 0 0 8px #00f2fe;
}
.title-glow-dot.cyan {
  background: #00f2fe;
  box-shadow: 0 0 8px #00f2fe;
}
.title-glow-dot.purple {
  background: #c084fc;
  box-shadow: 0 0 8px #c084fc;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.4px;
}

.status-badge {
  font-size: 9.5px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 4px;
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid rgba(0, 242, 254, 0.3);
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-badge.live-broadcasting {
  color: #ec4899;
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.5);
  box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
}

.pulse-beacon {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ec4899;
  box-shadow: 0 0 6px #ec4899;
  animation: pulse-ring 1.1s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.status-mode-pill {
  font-size: 9.5px;
  padding: 2px 7px;
  border-radius: 4px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.status-mode-pill.live-mode {
  color: #f472b6;
  background: rgba(236, 72, 153, 0.12);
  border-color: rgba(236, 72, 153, 0.4);
}

/* 知识切片列表 */
.slice-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.slice-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: all 0.22s ease-out;
}

.slice-item:hover {
  background: rgba(0, 242, 254, 0.08);
  border-color: rgba(0, 242, 254, 0.35);
  transform: translateY(-1px);
}

.slice-item.active {
  background: rgba(0, 242, 254, 0.12);
  border-color: #00f2fe;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.22);
}

.slice-item.is-speaking {
  border-color: #ec4899;
  background: rgba(236, 72, 153, 0.12);
  box-shadow: 0 0 14px rgba(236, 72, 153, 0.28);
}

.slice-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.slice-dot.cyan { background: #00f2fe; box-shadow: 0 0 6px #00f2fe; }
.slice-dot.amber { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
.slice-dot.purple { background: #a855f7; box-shadow: 0 0 6px #a855f7; }

.slice-info {
  flex: 1;
  min-width: 0;
}

.slice-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.slice-name {
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slice-tag {
  font-size: 8.5px;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}
.slice-tag.cyan { color: #38bdf8; background: rgba(56, 189, 248, 0.14); }
.slice-tag.amber { color: #fbbf24; background: rgba(251, 191, 36, 0.14); }
.slice-tag.purple { color: #c084fc; background: rgba(192, 132, 252, 0.14); }

.slice-meta {
  font-size: 9.5px;
  color: #8da4be;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.broadcast-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 600;
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.12);
  border: 1px solid rgba(0, 242, 254, 0.35);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.broadcast-btn:hover {
  background: rgba(0, 242, 254, 0.22);
  box-shadow: 0 0 8px rgba(0, 242, 254, 0.35);
}

.broadcast-btn.active {
  color: #ffffff;
  background: linear-gradient(135deg, #ec4899, #a855f7);
  border-color: #f472b6;
  box-shadow: 0 0 10px rgba(236, 72, 153, 0.45);
}

.wave-box {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 9px;
}
.wave-bar {
  width: 2px;
  background: #ffffff;
  border-radius: 1px;
  animation: wave-anim 0.75s ease-in-out infinite alternate;
}
.wave-bar.b1 { height: 3px; animation-delay: 0.1s; }
.wave-bar.b2 { height: 9px; animation-delay: 0.3s; }
.wave-bar.b3 { height: 5px; animation-delay: 0.2s; }

@keyframes wave-anim {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.2); }
}

/* 控制组公共排版（紧凑、自适应、不拉伸） */
.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-title {
  font-size: 11px;
  color: #cbd5e1;
  font-weight: 600;
}

.group-sub {
  font-size: 8.5px;
  color: #64748b;
  font-family: monospace;
}

/* 形象风格卡片行 */
.style-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.style-card {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.22s;
}

.style-card:hover {
  background: rgba(0, 242, 254, 0.08);
  border-color: rgba(0, 242, 254, 0.4);
}

.style-card.active.anime {
  background: rgba(0, 242, 254, 0.14);
  border-color: #00f2fe;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.25);
}

.style-card.active.magical {
  background: rgba(236, 72, 153, 0.14);
  border-color: #ec4899;
  box-shadow: 0 0 12px rgba(236, 72, 153, 0.25);
}

.card-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.card-dot.cyan {
  background: #00f2fe;
  box-shadow: 0 0 6px #00f2fe;
}
.card-dot.purple {
  background: #ec4899;
  box-shadow: 0 0 6px #ec4899;
}

.card-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
  white-space: nowrap;
}

.card-sub {
  font-size: 8.5px;
  color: #94a3b8;
  margin-top: 1px;
  white-space: nowrap;
}

.card-check {
  font-size: 11px;
  font-weight: 800;
}
.card-check.cyan {
  color: #00f2fe;
}
.card-check.purple {
  color: #ec4899;
}

/* 摄像机运镜视点（三等分胶囊卡片） */
.cam-nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.cam-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 3px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.cam-btn:hover {
  background: rgba(0, 242, 254, 0.12);
  border-color: #00f2fe;
  color: #00f2fe;
}

.cam-btn.active {
  background: linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(168, 85, 247, 0.25));
  border-color: #00f2fe;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.3);
}

.cam-icon {
  font-size: 12px;
}
.cam-name {
  font-size: 10px;
  margin-top: 1px;
}
.cam-meter {
  font-size: 8px;
  color: #64748b;
  font-family: monospace;
}
.cam-btn.active .cam-meter {
  color: #a5f3fc;
}

/* 动作调度网格 */
.tab-slider-wrap {
  display: flex;
  gap: 2px;
  background: rgba(15, 23, 42, 0.85);
  padding: 2px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tab-btn {
  padding: 2px 7px;
  font-size: 9.5px;
  color: #94a3b8;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #e2e8f0;
}

.tab-btn.active {
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.16);
  font-weight: 700;
  box-shadow: 0 0 6px rgba(0, 242, 254, 0.25);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 2px;
  font-size: 10px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #a855f7;
  color: #c084fc;
  background: rgba(168, 85, 247, 0.12);
}

.action-btn.active {
  background: rgba(168, 85, 247, 0.22);
  border-color: #a855f7;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.35);
}

.act-icon {
  font-size: 11px;
}
.act-name {
  font-size: 10px;
}

.act-badge {
  position: absolute;
  top: -3px;
  right: -2px;
  font-size: 7.5px;
  padding: 0 2px;
  border-radius: 2px;
  background: #0284c7;
  color: #e0f2fe;
  transform: scale(0.85);
}
.act-badge.purple {
  background: #9333ea;
  color: #f5d0fe;
}
</style>
