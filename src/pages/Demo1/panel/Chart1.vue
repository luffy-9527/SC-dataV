<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'
import cityData from '../cityData'

const colors = ['#fbdf88', '#ea580c']
const citys = Object.keys(cityData)
const source = Array.from({ length: 5 }, (_, index) => ({
  name: citys[index],
  value: cityData[citys[index] as keyof typeof cityData].population,
}))

const option = computed<EChartsOption>(() => ({
  grid: { top: 0, bottom: 0, left: '8%', right: '12%', containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: 'rgba(255, 245, 232, 0.9)',
    borderColor: colors[1],
    borderWidth: 1,
    textStyle: { color: 'rgba(0,0,0,.8)' },
  },
  xAxis: { show: false, type: 'value' },
  yAxis: {
    type: 'category',
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      fontSize: 14,
      margin: 16,
      color: '#000',
      formatter: (value: string, index: number) => `{a|NO.${index + 1}} ${value}`,
      rich: { a: { color: 'rgba(0,0,0,.6)' } },
    },
    data: source.map(item => item.name),
  },
  series: [
    {
      type: 'bar',
      data: source.map(item => item.value),
      realtimeSort: true,
      barWidth: 8,
      showBackground: true,
      backgroundStyle: { borderRadius: 4 },
      itemStyle: {
        borderRadius: 4,
        color: {
          type: 'linear',
          x: 1,
          y: 0,
          x2: 0,
          y2: 0,
          colorStops: colors.map((color, index) => ({ offset: index, color })),
        },
      },
      label: {
        show: true,
        color: 'rgba(0,0,0,.8)',
        valueAnimation: true,
        fontSize: 16,
        fontWeight: 'bold',
        position: 'right',
      },
    },
    {
      name: 'dot',
      type: 'pictorialBar',
      symbol: 'circle',
      symbolSize: 16,
      z: 12,
      itemStyle: { color: colors[0], shadowColor: colors[0], shadowBlur: 10 },
      data: source.map(item => ({ value: item.value, symbolPosition: 'end' })),
    },
  ],
  animationDuration: 0,
  animationDurationUpdate: 1000,
  animationEasing: 'linear',
  animationEasingUpdate: 'linear',
}))
</script>

<template>
  <Chart :option="option" />
</template>
