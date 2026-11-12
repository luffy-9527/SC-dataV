<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import AutoFit from '@/components/AutoFit.vue'
import OilScene from './components/OilScene.vue'
import Header from './components/Header.vue'
import StatMetrics from './components/StatMetrics.vue'
import PanelCard from './components/PanelCard.vue'

// 左右数据图表
import LeftChart1 from './charts/LeftChart1.vue'
import LeftChart2 from './charts/LeftChart2.vue'
import LeftChart3 from './charts/LeftChart3.vue'
import RightChart1 from './charts/RightChart1.vue'
import RightChart2 from './charts/RightChart2.vue'
import RightChart3 from './charts/RightChart3.vue'

// 沉浸全景视界模式 (收起左右图表，将中央三维油田视界最大化呈现)
const isZenMode = ref(false)

onMounted(() => {
  // 左右卡片丝滑入场动画
  gsap.fromTo(
    '.column-left .oil-panel-card',
    { autoAlpha: 0, x: -40 },
    { autoAlpha: 1, x: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' },
  )

  gsap.fromTo(
    '.column-right .oil-panel-card',
    { autoAlpha: 0, x: 40 },
    { autoAlpha: 1, x: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' },
  )

  gsap.fromTo(
    '.stat-metrics',
    { autoAlpha: 0, y: -20 },
    { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.2, ease: 'power2.out' },
  )
})
</script>

<template>
  <AutoFit :design-width="1920" :design-height="1080" background="#0f2238">
    <div class="oil-dashboard-page">
      <!-- 1. 中部 Three.js 石油钻采 3D 核心实景 -->
      <OilScene :is-zen-mode="isZenMode" @toggle-zen="isZenMode = !isZenMode" />

      <!-- 2. 顶部工业科技导航栏 -->
      <Header :is-zen-mode="isZenMode" @toggle-zen="isZenMode = !isZenMode" />

      <!-- 3. 顶部居中关键生产指标看板 -->
      <StatMetrics />

      <!-- 4. 左侧钻采工程工况面板 -->
      <aside class="column-panel column-left" :class="{ 'panel--zen-hidden': isZenMode }">
        <PanelCard
          class="chart-card"
          title="钻进深度与机械钻速趋势"
          subtitle="ROP & DRILLING DEPTH"
          badge="实时进尺"
          badge-type="info"
        >
          <LeftChart1 />
        </PanelCard>

        <PanelCard
          class="chart-card"
          title="井下流变与环空压力监控"
          subtitle="WELLBORE PRESSURE & RHEOLOGY"
          badge="井壁稳定"
          badge-type="success"
        >
          <LeftChart2 />
        </PanelCard>

        <PanelCard
          class="chart-card"
          title="钻具震动与大钩载荷载荷谱"
          subtitle="HOOK LOAD & DRILLSTRING VIBRATION"
          badge="安全受控"
          badge-type="warning"
        >
          <LeftChart3 />
        </PanelCard>
      </aside>

      <!-- 5. 右侧油田产能与能耗面板 -->
      <aside class="column-panel column-right" :class="{ 'panel--zen-hidden': isZenMode }">
        <PanelCard
          class="chart-card"
          title="各作业区块日采油量对比"
          subtitle="BLOCK PRODUCTION CAPACITY"
          badge="稳产运行"
          badge-type="success"
        >
          <RightChart1 />
        </PanelCard>

        <PanelCard
          class="chart-card"
          title="采出流体三相组分分析"
          subtitle="FLUID PHASE COMPOSITION"
          badge="原油占比 64.2%"
          badge-type="info"
        >
          <RightChart2 />
        </PanelCard>

        <PanelCard
          class="chart-card"
          title="采油机组健康度与综合电耗"
          subtitle="UNIT HEALTH & ENERGY EFFICIENCY"
          badge="机组优良"
          badge-type="success"
        >
          <RightChart3 />
        </PanelCard>
      </aside>
    </div>
  </AutoFit>
</template>

<style scoped>
.oil-dashboard-page {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background-color: #0f2238;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  user-select: none;
}

.column-panel {
  position: absolute;
  top: 96px;
  bottom: 24px;
  width: 440px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 10;
  pointer-events: none;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
}

.column-left {
  left: 24px;
}

.column-left.panel--zen-hidden {
  transform: translateX(-115%);
  opacity: 0;
  pointer-events: none;
}

.column-right {
  right: 24px;
}

.column-right.panel--zen-hidden {
  transform: translateX(115%);
  opacity: 0;
  pointer-events: none;
}

.chart-card {
  flex: 1 1 0;
  min-height: 0;
}
</style>
