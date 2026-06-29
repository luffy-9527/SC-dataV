<script setup lang="ts">
import { computed, ref } from 'vue'
import Chart from '@/components/Chart.vue'
import NumberAnimation from '@/components/NumberAnimation.vue'
import SeamVirtualScroll from '@/components/SeamVirtualScroll.vue'
import type { EChartsOption } from 'echarts'

const showPanel = ref(true)
const showHeat = ref(true)
const showBar = ref(true)

const stats = [
  { label: '接入设备', value: 28640, suffix: '台' },
  { label: '今日告警', value: 326, suffix: '条' },
  { label: '在线率', value: 98.7, suffix: '%' },
  { label: '处置工单', value: 1248, suffix: '件' },
]

const lineOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  grid: { left: 38, right: 18, top: 30, bottom: 28 },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['00', '04', '08', '12', '16', '20', '24'],
    axisLabel: { color: '#b8e7ff' },
    axisLine: { lineStyle: { color: 'rgba(137,219,255,.25)' } },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#b8e7ff' },
    splitLine: { lineStyle: { color: 'rgba(137,219,255,.12)' } },
  },
  series: [
    { name: '访问量', type: 'line', smooth: true, symbolSize: 7, areaStyle: { opacity: .18 }, data: [120, 180, 260, 460, 390, 520, 610] },
    { name: '告警量', type: 'line', smooth: true, symbolSize: 7, areaStyle: { opacity: .12 }, data: [56, 72, 95, 146, 132, 118, 86] },
  ],
}))

const pieOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: { color: '#b8e7ff' } },
  series: [
    {
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: { color: '#dff8ff' },
      data: [
        { value: 42, name: '交通' },
        { value: 28, name: '安防' },
        { value: 18, name: '政务' },
        { value: 12, name: '能源' },
      ],
    },
  ],
}))

const rankList = [
  ['成都市', '智慧交通调度完成', '99.2%'],
  ['绵阳市', '视频点位巡检完成', '97.8%'],
  ['德阳市', '应急联动响应完成', '96.6%'],
  ['宜宾市', '重点区域治理完成', '95.3%'],
  ['南充市', '公共服务监测完成', '94.1%'],
  ['泸州市', '能源站点巡检完成', '93.7%'],
]
</script>

<template>
  <section class="demo2-page">
    <header class="header">
      <RouterLink class="back" to="/">返回首页</RouterLink>
      <div class="title-wrap">
        <h1>Demo2 · 城市运行态势大屏</h1>
        <p>Vue3 迁移版：地图主视觉、指标卡、趋势图、分类占比与滚动工单。</p>
      </div>
      <div class="time">SC-DATAV</div>
    </header>

    <main class="layout">
      <aside v-if="showPanel" class="panel left-panel">
        <h2>运行趋势</h2>
        <Chart :option="lineOption" />
      </aside>

      <section class="center-stage">
        <div class="map-orbit" :class="{ heat: showHeat }">
          <div class="ring r1"></div>
          <div class="ring r2"></div>
          <div class="province">
            <i v-for="item in 10" :key="item" :style="{ '--i': item }"></i>
            <template v-if="showBar">
              <b v-for="item in 8" :key="`bar-${item}`" :style="{ '--i': item }"></b>
            </template>
          </div>
        </div>
      </section>

      <aside v-if="showPanel" class="panel right-panel">
        <h2>业务分类</h2>
        <Chart :option="pieOption" />
      </aside>
    </main>

    <section v-if="showPanel" class="stat-row">
      <article v-for="item in stats" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong><NumberAnimation :value="item.value" :decimals="item.label === '在线率' ? 1 : 0" />{{ item.suffix }}</strong>
      </article>
    </section>

    <section v-if="showPanel" class="bottom-panel">
      <h2>实时事件</h2>
      <SeamVirtualScroll :list="rankList" :speed="0.42" :item-height="36">
        <template #default="{ item, index }">
          <div class="work-row">
            <span>{{ index + 1 }}</span>
            <span>{{ item[0] }}</span>
            <span>{{ item[1] }}</span>
            <em>{{ item[2] }}</em>
          </div>
        </template>
      </SeamVirtualScroll>
    </section>

    <footer class="control-bar">
      <button :class="{ active: showPanel }" @click="showPanel = !showPanel">面板</button>
      <button :class="{ active: showHeat }" @click="showHeat = !showHeat">热力</button>
      <button :class="{ active: showBar }" @click="showBar = !showBar">柱图</button>
    </footer>
  </section>
</template>

<style scoped>
.demo2-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #dff8ff;
  background:
    radial-gradient(circle at 50% 50%, rgba(21, 98, 166, .48), transparent 34%),
    linear-gradient(180deg, #061a32 0%, #030915 100%);
}
.demo2-page::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: .18;
  background-image: linear-gradient(rgba(98, 201, 255, .18) 1px, transparent 1px), linear-gradient(90deg, rgba(98, 201, 255, .18) 1px, transparent 1px);
  background-size: 44px 44px;
}
.header {
  position: absolute;
  z-index: 5;
  top: 22px;
  left: 28px;
  right: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.back, .time {
  color: #8be8ff;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid rgba(139, 232, 255, .28);
  border-radius: 999px;
  background: rgba(5, 23, 43, .58);
}
.title-wrap { text-align: center; }
h1, h2, p { margin: 0; }
h1 { font-size: 28px; letter-spacing: 4px; }
p { margin-top: 6px; color: rgba(223, 248, 255, .62); }
.layout { position: absolute; inset: 0; }
.panel {
  position: absolute;
  top: 126px;
  width: 360px;
  height: 276px;
  padding: 18px;
  z-index: 4;
  background: linear-gradient(180deg, rgba(8, 32, 58, .82), rgba(8, 32, 58, .34));
  border: 1px solid rgba(139, 232, 255, .26);
  box-shadow: 0 0 30px rgba(47, 183, 255, .08);
}
.left-panel { left: 32px; }
.right-panel { right: 32px; }
.panel h2 { font-size: 16px; margin-bottom: 12px; }
.panel :deep(.dv-chart) { height: 224px; }
.center-stage { position: absolute; inset: 0; display: grid; place-items: center; }
.map-orbit { position: relative; width: 560px; height: 560px; }
.ring { position: absolute; inset: 0; border-radius: 50%; border: 1px dashed rgba(139, 232, 255, .32); animation: rotate 20s linear infinite; }
.r2 { inset: 68px; animation-direction: reverse; opacity: .55; }
.province {
  position: absolute;
  left: 50%; top: 50%; width: 430px; height: 300px;
  transform: translate(-50%, -50%);
  clip-path: polygon(12% 32%, 33% 14%, 55% 18%, 76% 8%, 92% 32%, 84% 58%, 68% 65%, 58% 86%, 34% 80%, 11% 64%, 6% 44%);
  background: linear-gradient(135deg, rgba(89, 214, 255, .3), rgba(54, 255, 186, .08));
  border: 1px solid rgba(139, 232, 255, .72);
  box-shadow: 0 0 58px rgba(47, 183, 255, .34), inset 0 0 70px rgba(139, 232, 255, .08);
}
.province i, .province b { position: absolute; display: block; }
.province i {
  width: 9px; height: 9px; border-radius: 50%; background: #f8e48c;
  left: calc(12% + var(--i) * 7.4%); top: calc(70% - var(--i) * 4.8%);
  box-shadow: 0 0 16px #f8e48c;
}
.heat .province i::after {
  content: ''; position: absolute; inset: -16px; border-radius: 50%; background: rgba(248, 228, 140, .16); animation: pulse 2s infinite;
}
.province b {
  width: 8px; height: calc(28px + var(--i) * 6px); bottom: 42%; left: calc(18% + var(--i) * 8%);
  background: linear-gradient(180deg, #fff4a8, #27d7ff); box-shadow: 0 0 12px rgba(39,215,255,.6);
}
.stat-row { position: absolute; left: 32px; right: 32px; bottom: 150px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; z-index: 4; }
.stat-card { padding: 18px 22px; border: 1px solid rgba(139,232,255,.22); background: rgba(8,32,58,.58); }
.stat-card span { display: block; color: rgba(223,248,255,.65); }
.stat-card strong { display: block; margin-top: 8px; font-size: 30px; color: #f8e48c; }
.bottom-panel { position: absolute; left: 32px; right: 32px; bottom: 28px; height: 96px; padding: 14px 18px; z-index: 4; border: 1px solid rgba(139,232,255,.22); background: rgba(8,32,58,.58); }
.work-row { display: grid; grid-template-columns: 48px 120px 1fr 80px; height: 36px; align-items: center; color: rgba(223,248,255,.86); }
.work-row em { color: #f8e48c; font-style: normal; }
.control-bar { position: absolute; z-index: 6; left: 50%; bottom: 150px; display: flex; gap: 12px; transform: translateX(-50%); }
button { cursor: pointer; color: #dff8ff; border: 1px solid rgba(139,232,255,.25); border-radius: 999px; padding: 8px 18px; background: rgba(8,32,58,.68); }
button.active { background: #8be8ff; color: #05172b; }
@keyframes rotate { to { rotate: 360deg; } }
@keyframes pulse { 50% { transform: scale(1.35); opacity: .28; } }
</style>
