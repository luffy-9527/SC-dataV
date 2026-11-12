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
    data: ['机组综合健康指数', '单桶原油电耗 (kWh)'],
    top: '2%',
    right: '4%',
    textStyle: { color: '#94a3b8', fontSize: 10 },
    itemWidth: 10,
    itemHeight: 6,
  },
  grid: {
    top: '24%',
    left: '12%',
    right: '12%',
    bottom: '16%',
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  yAxis: [
    {
      type: 'value',
      name: '健康分',
      min: 80,
      max: 100,
      nameTextStyle: { color: '#10b981', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    {
      type: 'value',
      name: '电耗',
      nameTextStyle: { color: '#38bdf8', fontSize: 10 },
      splitLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
  ],
  series: [
    {
      name: '机组综合健康指数',
      type: 'line',
      smooth: true,
      data: [96.5, 95.8, 97.2, 98.0, 96.2, 97.8, 98.4],
      itemStyle: { color: '#10b981' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
          { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
        ]),
      },
    },
    {
      name: '单桶原油电耗 (kWh)',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: [14.2, 13.8, 13.5, 12.9, 13.1, 12.6, 12.4],
      itemStyle: { color: '#38bdf8' },
      lineStyle: { width: 2 },
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
