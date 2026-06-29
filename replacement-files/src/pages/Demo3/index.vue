<script setup lang="ts">
import { computed, ref } from 'vue'
import Chart from '@/components/Chart.vue'
import type { EChartsOption } from 'echarts'

const showBloom = ref(true)
const showStats = ref(true)
const rotate = ref(true)

const gaugeOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      splitNumber: 5,
      radius: '92%',
      axisLine: { lineStyle: { width: 10, color: [[0.35, '#34d399'], [0.75, '#38bdf8'], [1, '#f59e0b']] } },
      pointer: { width: 4 },
      axisLabel: { color: '#b8e7ff' },
      splitLine: { lineStyle: { color: '#b8e7ff' } },
      axisTick: { lineStyle: { color: '#b8e7ff' } },
      detail: { color: '#e6fbff', fontSize: 24, formatter: '{value}%' },
      data: [{ value: 87, name: '模型状态' }],
      title: { color: '#b8e7ff', offsetCenter: [0, '72%'] },
    },
  ],
}))

const lineOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  grid: { left: 34, right: 14, top: 22, bottom: 22 },
  xAxis: { type: 'category', data: ['1', '2', '3', '4', '5', '6'], axisLabel: { color: '#b8e7ff' }, axisLine: { lineStyle: { color: 'rgba(184,231,255,.25)' } } },
  yAxis: { type: 'value', axisLabel: { color: '#b8e7ff' }, splitLine: { lineStyle: { color: 'rgba(184,231,255,.12)' } } },
  series: [{ type: 'line', smooth: true, areaStyle: { opacity: .18 }, data: [42, 56, 49, 74, 68, 91] }],
}))
</script>

<template>
  <section class="demo3-page" :class="{ bloom: showBloom }">
    <header class="topbar">
      <RouterLink class="back" to="/">返回首页</RouterLink>
      <div>
        <h1>Demo3 · 三维模型展示场景</h1>
        <p>Vue3 迁移版：保留模型展示、环境光、后期辉光、性能监控入口的页面结构。</p>
      </div>
      <div class="badge">MODEL VIEW</div>
    </header>

    <main class="stage">
      <div class="model-space">
        <div class="floor"></div>
        <div class="model-card" :class="{ rotate }">
          <div class="model-core"></div>
          <span v-for="i in 6" :key="i" :style="{ '--i': i }"></span>
        </div>
      </div>

      <aside v-if="showStats" class="panel left">
        <h2>渲染状态</h2>
        <Chart :option="gaugeOption" />
      </aside>

      <aside v-if="showStats" class="panel right">
        <h2>帧率趋势</h2>
        <Chart :option="lineOption" />
      </aside>
    </main>

    <footer class="control-bar">
      <button :class="{ active: rotate }" @click="rotate = !rotate">旋转</button>
      <button :class="{ active: showBloom }" @click="showBloom = !showBloom">Bloom</button>
      <button :class="{ active: showStats }" @click="showStats = !showStats">Stats</button>
    </footer>
  </section>
</template>

<style scoped>
.demo3-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #e6fbff;
  background:
    radial-gradient(circle at 50% 44%, rgba(77, 124, 255, .24), transparent 32%),
    radial-gradient(circle at 72% 24%, rgba(34, 211, 238, .12), transparent 24%),
    linear-gradient(180deg, #16181d 0%, #05070b 100%);
}
.demo3-page.bloom .model-core,
.demo3-page.bloom .model-card span { filter: drop-shadow(0 0 18px rgba(56, 189, 248, .8)); }
.topbar {
  position: absolute;
  z-index: 5;
  top: 24px;
  left: 32px;
  right: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h1, h2, p { margin: 0; }
h1 { font-size: 28px; letter-spacing: 4px; }
p { margin-top: 6px; color: rgba(230, 251, 255, .62); }
.back, .badge {
  color: #93ecff;
  text-decoration: none;
  border-radius: 999px;
  padding: 8px 16px;
  border: 1px solid rgba(147, 236, 255, .26);
  background: rgba(12, 18, 28, .62);
}
.stage { position: absolute; inset: 0; }
.model-space {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  perspective: 1200px;
}
.floor {
  position: absolute;
  width: 680px;
  height: 680px;
  border-radius: 50%;
  transform: rotateX(72deg) translateY(120px);
  border: 1px solid rgba(147,236,255,.22);
  background: radial-gradient(circle, rgba(147,236,255,.13), transparent 62%);
  box-shadow: 0 0 60px rgba(56,189,248,.12);
}
.model-card {
  position: relative;
  width: 300px;
  height: 380px;
  transform-style: preserve-3d;
  transform: rotateX(-10deg) rotateY(-24deg);
}
.model-card.rotate { animation: modelRotate 12s linear infinite; }
.model-core {
  position: absolute;
  inset: 44px 64px;
  border-radius: 38px;
  background: linear-gradient(135deg, rgba(147,236,255,.34), rgba(129,140,248,.12));
  border: 1px solid rgba(147,236,255,.55);
  box-shadow: inset 0 0 45px rgba(147,236,255,.12), 0 22px 80px rgba(0,0,0,.42);
  transform: translateZ(60px);
}
.model-core::before, .model-core::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(230,251,255,.82);
}
.model-core::before { top: 52px; width: 72px; height: 72px; }
.model-core::after { bottom: 56px; width: 118px; height: 14px; opacity: .42; }
.model-card span {
  position: absolute;
  left: 50%; top: 50%; width: 180px; height: 2px;
  background: linear-gradient(90deg, transparent, #93ecff, transparent);
  transform: rotate(calc(var(--i) * 30deg)) translateZ(calc(var(--i) * 10px));
  opacity: .72;
}
.panel {
  position: absolute;
  top: 140px;
  width: 340px;
  height: 268px;
  padding: 18px;
  z-index: 3;
  border: 1px solid rgba(147,236,255,.24);
  background: linear-gradient(180deg, rgba(12,18,28,.72), rgba(12,18,28,.32));
  backdrop-filter: blur(10px);
}
.panel.left { left: 32px; }
.panel.right { right: 32px; }
.panel h2 { font-size: 16px; margin-bottom: 12px; }
.panel :deep(.dv-chart) { height: 220px; }
.control-bar { position: absolute; z-index: 5; left: 50%; bottom: 38px; transform: translateX(-50%); display: flex; gap: 14px; }
button {
  cursor: pointer;
  color: #e6fbff;
  border: 1px solid rgba(147,236,255,.24);
  border-radius: 999px;
  padding: 10px 20px;
  background: rgba(12,18,28,.68);
}
button.active { color: #05070b; background: #93ecff; }
@keyframes modelRotate {
  from { transform: rotateX(-10deg) rotateY(-24deg); }
  to { transform: rotateX(-10deg) rotateY(336deg); }
}
</style>
