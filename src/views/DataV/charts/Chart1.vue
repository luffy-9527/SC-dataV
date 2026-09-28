<template>
  <Chart :option="chartOption" :use="components" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Chart from '@/components/Chart.vue'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

const components = [BarChart, GridComponent, TooltipComponent, LegendComponent]

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
    data: ['成都', '绵阳', '德阳', '宜宾', '泸州', '自贡'],
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
    data: [120, 200, 150, 80, 70, 110],
    type: 'bar',
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
  }]
}))
</script>
