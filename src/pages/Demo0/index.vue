<script setup lang="ts">
import { computed, ref } from 'vue'
import Chart from '@/components/Chart.vue'
import type { EChartsOption } from 'echarts'

const showGrid = ref(true)
const autoRotate = ref(true)
const showPanel = ref(true)

const radarOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item' },
  radar: {
    radius: '66%',
    splitNumber: 4,
    axisName: { color: '#b8e7ff', fontSize: 12 },
    splitLine: { lineStyle: { color: 'rgba(137, 219, 255, .24)' } },
    splitArea: { areaStyle: { color: ['rgba(41, 128, 185, .08)', 'rgba(41, 128, 185, .02)'] } },
    axisLine: { lineStyle: { color: 'rgba(137, 219, 255, .24)' } },
    indicator: [
      { name: '地理轮廓', max: 100 },
      { name: '飞线动画', max: 100 },
      { name: '扫光效果', max: 100 },
      { name: '图表联动', max: 100 },
      { name: '实时调试', max: 100 },
    ],
  },
  series: [
    {
      type: 'radar',
      data: [{ value: [96, 91, 88, 93, 86], name: 'Demo0 场景参数' }],
      areaStyle: { opacity: 0.22 },
      lineStyle: { width: 2 },
      symbolSize: 6,
    },
  ],
}))

const barOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  grid: { left: 34, right: 18, top: 24, bottom: 24 },
  xAxis: {
    type: 'category',
    data: ['成都', '绵阳', '德阳', '宜宾', '南充'],
    axisLabel: { color: '#b8e7ff' },
    axisLine: { lineStyle: { color: 'rgba(137, 219, 255, .25)' } },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#b8e7ff' },
    splitLine: { lineStyle: { color: 'rgba(137, 219, 255, .12)' } },
  },
  series: [
    {
      type: 'bar',
      data: [92, 78, 66, 61, 58],
      barWidth: 14,
      itemStyle: { borderRadius: [8, 8, 2, 2] },
    },
  ],
}))
</script>

<template>
  <section class="demo0-page">
    <header class="topbar">
      <RouterLink class="back" to="/">返回首页</RouterLink>
      <div>
        <h1>Demo0 · 四川省三维地图调试场景</h1>
        <p>Vue3 迁移版：保留三维地图实验台、网格背景和调试控制入口。</p>
      </div>
      <div class="status">Vue3 / Vite / ECharts</div>
    </header>

    <main class="main-stage">
      <div class="map-stage" :class="{ 'is-grid': showGrid, 'is-rotate': autoRotate }">
        <div class="glow glow-a"></div>
        <div class="glow glow-b"></div>
        <div class="fake-map">
          <div class="map-layer layer-back"></div>
          <div class="map-layer layer-front"></div>
          <span v-for="item in 7" :key="item" class="city-dot" :style="{ '--i': item }"></span>
          <span v-for="item in 5" :key="`line-${item}`" class="fly-line" :style="{ '--i': item }"></span>
        </div>
      </div>

      <aside v-if="showPanel" class="side-panel left">
        <h2>场景能力</h2>
        <Chart :option="radarOption" />
      </aside>

      <aside v-if="showPanel" class="side-panel right">
        <h2>城市热度</h2>
        <Chart :option="barOption" />
      </aside>
    </main>

    <footer class="control-bar">
      <button :class="{ active: showGrid }" @click="showGrid = !showGrid">网格</button>
      <button :class="{ active: autoRotate }" @click="autoRotate = !autoRotate">旋转</button>
      <button :class="{ active: showPanel }" @click="showPanel = !showPanel">面板</button>
    </footer>
  </section>
</template>

<style scoped>
.demo0-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #dff8ff;
  background: radial-gradient(circle at 50% 45%, #203140 0, #11161d 42%, #080c11 100%);
}

.topbar {
  position: absolute;
  z-index: 10;
  top: 24px;
  left: 32px;
  right: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

h1, h2, p { margin: 0; }
h1 { font-size: 26px; letter-spacing: 4px; }
p { margin-top: 6px; color: rgba(223, 248, 255, .68); }
.back, .status {
  color: #9eeaff;
  text-decoration: none;
  border: 1px solid rgba(158, 234, 255, .28);
  border-radius: 999px;
  padding: 8px 16px;
  background: rgba(12, 24, 34, .52);
}

.main-stage {
  position: absolute;
  inset: 0;
}

.map-stage {
  position: absolute;
  inset: 0;
  perspective: 1200px;
}

.map-stage.is-grid::before {
  content: '';
  position: absolute;
  inset: -60px;
  opacity: .4;
  background-image:
    linear-gradient(rgba(127, 229, 168, .16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(127, 229, 168, .16) 1px, transparent 1px);
  background-size: 58px 58px;
  transform: rotateX(62deg) translateY(12%);
  transform-origin: center;
}

.glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(42px);
  opacity: .34;
}
.glow-a { left: 18%; top: 18%; background: #36d6ff; }
.glow-b { right: 18%; bottom: 14%; background: #7fe5a8; }

.fake-map {
  position: absolute;
  left: 50%;
  top: 51%;
  width: 520px;
  height: 360px;
  transform: translate(-50%, -50%) rotateX(58deg) rotateZ(-16deg);
  transform-style: preserve-3d;
}

.is-rotate .fake-map { animation: slowSpin 18s linear infinite; }

.map-layer {
  position: absolute;
  inset: 0;
  clip-path: polygon(18% 27%, 38% 12%, 58% 18%, 77% 7%, 91% 31%, 82% 57%, 67% 61%, 58% 82%, 33% 78%, 13% 63%, 8% 39%);
  border: 1px solid rgba(158, 234, 255, .72);
  box-shadow: 0 0 42px rgba(54, 214, 255, .42), inset 0 0 46px rgba(54, 214, 255, .12);
}
.layer-back { transform: translateZ(-26px); background: rgba(54, 214, 255, .16); }
.layer-front { transform: translateZ(10px); background: linear-gradient(135deg, rgba(127, 229, 168, .28), rgba(54, 214, 255, .12)); }

.city-dot, .fly-line {
  position: absolute;
  display: block;
  transform: translateZ(22px);
}
.city-dot {
  left: calc(18% + var(--i) * 9%);
  top: calc(62% - var(--i) * 5%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff3a2;
  box-shadow: 0 0 18px #fff3a2;
}
.fly-line {
  left: 42%;
  top: 50%;
  width: calc(80px + var(--i) * 24px);
  height: 1px;
  background: linear-gradient(90deg, transparent, #9eeaff, transparent);
  rotate: calc(var(--i) * 35deg);
  animation: flash 1.8s linear infinite;
}

.side-panel {
  position: absolute;
  top: 132px;
  width: 360px;
  height: 260px;
  padding: 18px;
  border: 1px solid rgba(158, 234, 255, .24);
  background: linear-gradient(180deg, rgba(12, 24, 34, .74), rgba(12, 24, 34, .34));
  backdrop-filter: blur(10px);
}
.side-panel.left { left: 32px; }
.side-panel.right { right: 32px; }
.side-panel h2 { font-size: 16px; margin-bottom: 12px; }
.side-panel :deep(.dv-chart) { height: 210px; }

.control-bar {
  position: absolute;
  z-index: 10;
  left: 50%;
  bottom: 36px;
  display: flex;
  gap: 16px;
  transform: translateX(-50%);
}
button {
  cursor: pointer;
  color: #dff8ff;
  padding: 10px 22px;
  border-radius: 999px;
  border: 1px solid rgba(158, 234, 255, .24);
  background: rgba(12, 24, 34, .68);
}
button.active {
  color: #06111d;
  background: #9eeaff;
}

@keyframes slowSpin {
  from { transform: translate(-50%, -50%) rotateX(58deg) rotateZ(-16deg); }
  to { transform: translate(-50%, -50%) rotateX(58deg) rotateZ(344deg); }
}
@keyframes flash { 50% { opacity: .25; } }
</style>
