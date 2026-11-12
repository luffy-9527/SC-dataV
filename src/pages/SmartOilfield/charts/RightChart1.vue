<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: 'rgba(10, 25, 45, 0.9)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  legend: {
    data: ['日产油量 (t)', '日产液量 (m³)'],
    top: '2%',
    right: '4%',
    textStyle: { color: '#94a3b8', fontSize: 10 },
    itemWidth: 10,
    itemHeight: 6,
  },
  grid: {
    top: '22%',
    left: '18%',
    right: '8%',
    bottom: '12%',
  },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  yAxis: {
    type: 'category',
    data: ['东区深层', '南区断块', '西区油藏', '北区注水', '中央核心区'],
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
    axisLabel: { color: '#e2e8f0', fontSize: 10 },
  },
  series: [
    {
      name: '日产油量 (t)',
      type: 'bar',
      barWidth: 8,
      data: [180, 240, 310, 390, 480],
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#00e5ff' },
          { offset: 1, color: '#38bdf8' },
        ]),
      },
    },
    {
      name: '日产液量 (m³)',
      type: 'bar',
      barWidth: 8,
      data: [260, 330, 420, 510, 620],
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#f59e0b' },
          { offset: 1, color: '#fbbf24' },
        ]),
      },
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
