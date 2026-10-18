<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import type { AgentState, FacialEmotion } from '../types'

interface Props {
  agentState: AgentState
  currentEmotion: FacialEmotion
  audioSpectrum: number[]
}

const props = defineProps<Props>()

const radarRef = ref<HTMLDivElement | null>(null)
let radarChart: echarts.ECharts | null = null

const stateLabelMap: Record<AgentState, { label: string; color: string; badge: string }> = {
  idle: { label: '待机就绪', color: '#10b981', badge: 'IDLE' },
  listening: { label: '语音聆听中', color: '#00f2fe', badge: 'LISTENING' },
  thinking: { label: '大模型推理中', color: '#f59e0b', badge: 'THINKING' },
  speaking: { label: '全息讲解中', color: '#a855f7', badge: 'SPEAKING' },
  explaining: { label: '大屏深度联动', color: '#ec4899', badge: 'EXPLAIN' },
}

const currentStateInfo = computed(() => stateLabelMap[props.agentState] || stateLabelMap.idle)

// Audio level calculated from first 10 spectrum bands
const inputVolume = computed(() => {
  if (!props.audioSpectrum || props.audioSpectrum.length === 0) return 8
  const avg = props.audioSpectrum.slice(0, 10).reduce((a, b) => a + b, 0) / 10
  return Math.min(100, Math.round(avg * 100))
})

function initRadarChart() {
  if (!radarRef.value) return
  radarChart = echarts.init(radarRef.value)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    radar: {
      center: ['50%', '52%'],
      radius: '60%',
      indicator: [
        { name: '语音识别', max: 100 },
        { name: '语义理解', max: 100 },
        { name: '大屏反控', max: 100 },
        { name: '口型拟真', max: 100 },
        { name: '知识广度', max: 100 },
        { name: '多轮推理', max: 100 },
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: '#38bdf8',
        fontSize: 11,
        fontWeight: 600,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 242, 254, 0.18)',
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(10, 18, 38, 0.5)', 'rgba(0, 242, 254, 0.04)'],
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 242, 254, 0.28)',
        },
      },
    },
    series: [
      {
        name: '数字人能力基准',
        type: 'radar',
        data: [
          {
            value: [96, 95, 98, 93, 96, 94],
            name: '初音未来 智能基准',
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: {
              color: '#00f2fe',
            },
            lineStyle: {
              color: '#00f2fe',
              width: 2,
              shadowColor: 'rgba(0, 242, 254, 0.6)',
              shadowBlur: 8,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 242, 254, 0.45)' },
                { offset: 1, color: 'rgba(168, 85, 247, 0.15)' },
              ]),
            },
          },
        ],
      },
    ],
  }

  radarChart.setOption(option)
}

function handleResize() {
  radarChart?.resize()
}

onMounted(() => {
  initRadarChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  radarChart?.dispose()
})
</script>

<template>
  <aside class="left-panel">
    <!-- 卡片 1：数字人身份档案与实时状态 -->
    <div class="tech-panel-card">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot" />
          <h3 class="card-title">数字讲解员档案</h3>
        </div>
        <span class="badge-tag" :style="{ borderColor: currentStateInfo.color, color: currentStateInfo.color }">
          {{ currentStateInfo.badge }}
        </span>
      </div>

      <div class="persona-body">
        <div class="avatar-ring">
          <div class="inner-avatar">
            <span class="avatar-initial">01</span>
          </div>
          <div class="pulse-ring" :style="{ borderColor: currentStateInfo.color }" />
        </div>

        <div class="persona-details">
          <div class="persona-name">
            初音未来
            <span class="persona-tag">AI数智专员</span>
          </div>
          <div class="persona-desc">Hatsune Miku · 虚拟数智讲解官</div>
          <div class="status-indicator">
            <span class="status-dot" :style="{ backgroundColor: currentStateInfo.color, boxShadow: `0 0 8px ${currentStateInfo.color}` }" />
            <span class="status-text">{{ currentStateInfo.label }}</span>
          </div>
        </div>
      </div>

      <!-- 实时音浪条 -->
      <div class="volume-bar-box">
        <div class="volume-label">
          <span>声学频谱输出强度</span>
          <span class="volume-num">{{ inputVolume }}%</span>
        </div>
        <div class="volume-track">
          <div class="volume-fill" :style="{ width: `${inputVolume}%` }" />
        </div>
      </div>
    </div>

    <!-- 卡片 2：遥测性能指标 -->
    <div class="tech-panel-card">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot" />
          <h3 class="card-title">多模态遥测矩阵</h3>
        </div>
        <span class="refresh-pill">50Hz 实时</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-item">
          <span class="metric-name">端到端响应时延</span>
          <div class="metric-val-row">
            <span class="metric-num cyan">118</span>
            <span class="metric-unit">ms</span>
          </div>
          <span class="metric-sub">优于基准 38%</span>
        </div>

        <div class="metric-item">
          <span class="metric-name">ASR 语音识别率</span>
          <div class="metric-val-row">
            <span class="metric-num emerald">98.8</span>
            <span class="metric-unit">%</span>
          </div>
          <span class="metric-sub">双麦阵列降噪</span>
        </div>

        <div class="metric-item">
          <span class="metric-name">大模型吞吐速率</span>
          <div class="metric-val-row">
            <span class="metric-num purple">48.5</span>
            <span class="metric-unit">tokens/s</span>
          </div>
          <span class="metric-sub">低延迟流式响应</span>
        </div>

        <div class="metric-item">
          <span class="metric-name">面部驱动微表情</span>
          <div class="metric-val-row">
            <span class="metric-num amber">67</span>
            <span class="metric-unit">BlendShapes</span>
          </div>
          <span class="metric-sub">ARKit+Oculus全兼容</span>
        </div>
      </div>
    </div>

    <!-- 卡片 3：能力雷达与意图评测 -->
    <div class="tech-panel-card flex-1">
      <div class="card-corner tl" />
      <div class="card-corner tr" />
      <div class="card-corner bl" />
      <div class="card-corner br" />
      <div class="card-top-light" />

      <div class="card-header">
        <div class="header-left">
          <span class="title-glow-dot" />
          <h3 class="card-title">数智能力多维雷达</h3>
        </div>
      </div>
      <div ref="radarRef" class="radar-chart-container" />
    </div>
  </aside>
</template>

<style scoped>
.left-panel {
  position: absolute;
  top: 96px;
  left: 24px;
  bottom: 24px;
  width: 350px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 11px;
  pointer-events: none;
}

.tech-panel-card {
  position: relative;
  pointer-events: auto;
  background: linear-gradient(135deg, rgba(8, 16, 34, 0.88) 0%, rgba(12, 24, 46, 0.82) 100%);
  border: 1px solid rgba(0, 242, 254, 0.25);
  border-radius: 6px;
  backdrop-filter: blur(14px);
  padding: 12px 14px;
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
}

/* 科技切角装配 */
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

.badge-tag {
  padding: 2px 8px;
  font-size: 10px;
  font-family: monospace;
  font-weight: 700;
  border: 1px solid;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
}

.refresh-pill {
  font-size: 10px;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.persona-body {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.avatar-ring {
  position: relative;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inner-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.7);
}

.avatar-initial {
  color: #ffffff;
  font-size: 15px;
  font-family: monospace;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid;
  animation: ripple 2.2s infinite ease-out;
}

.persona-name {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.persona-tag {
  font-size: 10px;
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.12);
  border: 1px solid rgba(0, 242, 254, 0.35);
  padding: 1px 6px;
  border-radius: 4px;
}

.persona-desc {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-text {
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
}

.volume-bar-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
}

.volume-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.volume-num {
  font-family: monospace;
  color: #00f2fe;
  font-weight: 600;
}

.volume-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #00f2fe, #a855f7);
  transition: width 0.1s ease-out;
  box-shadow: 0 0 8px rgba(0, 242, 254, 0.6);
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric-item {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
}

.metric-name {
  font-size: 11px;
  color: #94a3b8;
}

.metric-val-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin: 3px 0 1px;
}

.metric-num {
  font-family: monospace;
  font-size: 17px;
  font-weight: 800;
}

.metric-num.cyan {
  color: #00f2fe;
  text-shadow: 0 0 10px rgba(0, 242, 254, 0.4);
}
.metric-num.emerald {
  color: #10b981;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}
.metric-num.purple {
  color: #c084fc;
  text-shadow: 0 0 10px rgba(192, 132, 252, 0.4);
}
.metric-num.amber {
  color: #fbbf24;
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
}

.metric-unit {
  font-size: 10px;
  color: #64748b;
}

.metric-sub {
  font-size: 9px;
  color: #64748b;
}

.radar-chart-container {
  width: 100%;
  flex: 1;
  min-height: 170px;
}

@keyframes ripple {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}
</style>
