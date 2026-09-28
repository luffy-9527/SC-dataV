<template>
  <Chart :option="chartOption" :use="components" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Chart from '@/components/Chart.vue'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'

const components = [LineChart, GridComponent, TooltipComponent]

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 245, 232, 0.9)',
    borderColor: '#ea580c',
    textStyle: { color: '#5a4a42' }
  },
  grid: {
    left: '10%',
    right: '10%',
    bottom: '15%',
    top: '15%'
  },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLine: { lineStyle: { color: '#fdb961' } },
    axisLabel: { color: '#5a4a42' }
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: '#fdb961' } },
    axisLabel: { color: '#5a4a42' },
    splitLine: { lineStyle: { color: 'rgba(253, 185, 97, 0.3)' } }
  },
  series: [{
    data: [820, 932, 901, 934, 1290, 1330],
    type: 'line',
    smooth: true,
    lineStyle: { color: '#ea580c', width: 2 },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(234, 88, 12, 0.3)' },
          { offset: 1, color: 'rgba(234, 88, 12, 0)' }
        ]
      }
    },
    itemStyle: { color: '#ea580c' }
  }]
}))
</script>
