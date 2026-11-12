<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'
import NumberAnimation from '@/components/NumberAnimation.vue'

const colors = ['#fbdf88', '#ea580c']
const data = [270, 400, 380, 420, 300, 410, 400, 330, 210, 290]

const option = computed<EChartsOption>(() => ({
  grid: { top: 4, bottom: 0, left: 0, right: 0 },
  xAxis: { show: false, type: 'category', data: data.map((_, index) => index + 1) },
  yAxis: { show: false, type: 'value' },
  series: [
    {
      type: 'line',
      data,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: colors[1], width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(234,88,12,.42)' },
            { offset: 1, color: 'rgba(234,88,12,.02)' },
          ],
        },
      },
    },
  ],
}))
</script>

<template>
  <div class="revenue">
    <div class="summary">
      <div class="summary-title">收益总计</div>
      <NumberAnimation class="summary-number" :value="1205.62" :decimals="2" suffix="亿万元" />
    </div>
    <div class="trend"><Chart :option="option" /></div>

    <div v-for="index in 4" :key="index" class="stat-item">
      <span class="company-icon">▣</span>
      <span>企业数量</span>
      <NumberAnimation class="stat-number" :value="1258 + index * 317" />
    </div>
  </div>
</template>

<style scoped>
.revenue {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: 2fr repeat(2, minmax(0, 1fr));
  gap: 16px;
  color: rgba(0, 0, 0, 0.78);
}

.summary {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.summary-title {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
}

.summary-number {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 28px;
  font-weight: 600;
  color: #ea580c;
}

.trend {
  min-width: 0;
  min-height: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(0, 0, 0, 0.8);
}

.company-icon {
  color: #fbdf88;
  text-shadow: 0 0 10px rgba(251, 223, 136, 0.6);
}

.stat-number {
  margin-left: auto;
  font-size: 20px;
  font-weight: 600;
  color: #ea580c;
}
</style>
