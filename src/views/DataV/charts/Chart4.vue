<template>
  <Chart :option="chartOption" :use="components" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Chart from '@/components/Chart.vue'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

const components = [BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent]

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 245, 232, 0.9)',
    borderColor: '#ea580c',
    textStyle: { color: '#5a4a42' }
  },
  legend: {
    data: ['收益', '增长率'],
    textStyle: { color: '#5a4a42' }
  },
  grid: {
    left: '10%',
    right: '10%',
    bottom: '15%',
    top: '20%'
  },
  xAxis: {
    type: 'category',
    data: ['Q1', 'Q2', 'Q3', 'Q4'],
    axisLine: { lineStyle: { color: '#fdb961' } },
    axisLabel: { color: '#5a4a42' }
  },
  yAxis: [
    {
      type: 'value',
      name: '收益(万)',
      axisLine: { lineStyle: { color: '#fdb961' } },
      axisLabel: { color: '#5a4a42' },
      splitLine: { lineStyle: { color: 'rgba(253, 185, 97, 0.3)' } }
    },
    {
      type: 'value',
      name: '增长率(%)',
      axisLine: { lineStyle: { color: '#fdb961' } },
      axisLabel: { color: '#5a4a42' }
    }
  ],
  series: [
    {
      name: '收益',
      type: 'bar',
      data: [120, 200, 150, 180],
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#ea580c' },
            { offset: 1, color: '#fdb961' }
          ]
        }
      }
    },
    {
      name: '增长率',
      type: 'line',
      yAxisIndex: 1,
      data: [20, 35, 25, 30],
      lineStyle: { color: '#5a4a42', width: 2 },
      itemStyle: { color: '#5a4a42' }
    }
  ]
}))
</script>
