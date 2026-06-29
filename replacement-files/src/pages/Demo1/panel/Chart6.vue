<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const chartRef = ref<InstanceType<typeof Chart> | null>(null)
const data = [3000, 2000, 4000, 5000, 4500]
const colors = ['#fbdf88', '#ea580c']
const xData = ['50万以下', '50～100万', '100～500万', '500～1000万', '1000万以上']
let tipIndex = 0
let timer = 0

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255,245,232,.8)',
    borderColor: colors[1],
    borderWidth: 1,
    borderRadius: 8,
    textStyle: { color: 'rgba(0,0,0,.8)', fontSize: 13, align: 'left' },
    axisPointer: { type: 'line', lineStyle: { width: 1, type: 'dotted', color: colors[0] } },
  },
  grid: { top: '20%', bottom: '5%', left: 10, right: 10, containLabel: true },
  xAxis: {
    type: 'category',
    axisLine: { lineStyle: { color: 'rgba(0,0,0,.1)' } },
    axisLabel: { interval: 0, color: 'rgba(0,0,0,.6)' },
    axisTick: { show: false },
    data: xData,
  },
  yAxis: {
    type: 'value',
    splitLine: { show: false },
    axisLine: { show: false },
    axisLabel: { color: 'rgba(0,0,0,.6)' },
    axisTick: { show: false },
  },
  series: [
    {
      name: '',
      type: 'bar',
      barWidth: 30,
      label: { show: true, position: 'top', color: 'rgba(0,0,0,.8)' },
      itemStyle: {
        borderRadius: [15, 15, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: colors.map((color, index) => ({ offset: index, color })),
        },
      },
      data,
    },
  ],
}))

onMounted(() => {
  timer = window.setInterval(() => {
    chartRef.value?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: tipIndex })
    tipIndex = (tipIndex + 1) % data.length
  }, 3000)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <Chart ref="chartRef" :option="option" />
</template>
