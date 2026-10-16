<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(10, 25, 45, 0.9)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  legend: {
    data: ['机械钻速 (m/h)', '累计进尺 (m)'],
    top: '4%',
    right: '4%',
    textStyle: { color: '#94a3b8', fontSize: 11 },
    itemWidth: 12,
    itemHeight: 6,
  },
  grid: {
    top: '26%',
    left: '12%',
    right: '12%',
    bottom: '16%',
  },
  xAxis: {
    type: 'category',
    data: ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00', '现在'],
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  yAxis: [
    {
      type: 'value',
      name: '钻速',
      nameTextStyle: { color: '#00e5ff', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    {
      type: 'value',
      name: '进尺',
      nameTextStyle: { color: '#f59e0b', fontSize: 10 },
      splitLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
  ],
  series: [
    {
      name: '机械钻速 (m/h)',
      type: 'line',
      smooth: true,
      data: [14.2, 16.8, 19.5, 22.1, 18.4, 21.6, 24.5],
      itemStyle: { color: '#00e5ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 229, 255, 0.35)' },
          { offset: 1, color: 'rgba(0, 229, 255, 0.02)' },
        ]),
      },
    },
    {
      name: '累计进尺 (m)',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: [3620, 3665, 3720, 3778, 3812, 3836, 3852],
      itemStyle: { color: '#f59e0b' },
      lineStyle: { width: 2, type: 'dashed' },
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
