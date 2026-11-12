<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const colors = ['#fbdf88', '#ea580c']
const dataType = { type1: '今年同期', type2: '去年同期' }
const data: [string[], number[], number[]] = [[], [], []]

for (let index = 0; index < 30; index++) {
  data[0].push(`${index + 1}`.padStart(2, '0'))
  data[1].push(Math.round((index + 1) * (420 + ((index * 97) % 520))))
  data[2].push(Math.round((index + 1) * (380 + ((index * 83) % 560))))
}

const chartRef = ref<InstanceType<typeof Chart> | null>(null)
let timer = 0
let xLength = 0

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    textStyle: { color: 'rgba(0,0,0,.8)' },
    backgroundColor: 'rgba(255,245,232,.8)',
    borderColor: colors[1],
    borderWidth: 1,
    borderRadius: 8,
  },
  grid: { top: 16, bottom: 16, left: 16, right: 16, containLabel: true },
  legend: {
    right: 16,
    top: 0,
    data: Object.values(dataType).map((item, index) => ({
      name: item,
      icon: 'none',
      textStyle: { color: colors[index] },
    })),
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    axisLine: { lineStyle: { color: 'rgba(0,0,0,.1)' } },
    axisLabel: { interval: 0, color: 'rgba(0,0,0,.6)' },
    splitLine: { show: false },
    axisTick: { show: false },
    data: data[0],
  },
  yAxis: {
    type: 'value',
    axisLabel: { interval: 0, color: 'rgba(0,0,0,.6)' },
    splitLine: { show: false },
    axisLine: { show: true, lineStyle: { color: 'rgba(0,0,0,.1)' } },
  },
  dataZoom: { type: 'slider', show: false, realtime: true, startValue: 0, endValue: 8 },
  series: [
    {
      name: dataType.type1,
      type: 'line',
      symbol: 'none',
      smooth: true,
      itemStyle: { color: colors[0] },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: colors[0] },
            { offset: 1, color: 'rgba(255,255,255,.1)' },
          ],
        },
      },
      markPoint: {
        symbol: 'rect',
        symbolSize: [50, 20],
        symbolOffset: [0, -10],
        label: { color: '#fff' },
        data: [{ type: 'max', name: '最大值' }],
      },
      data: data[1],
    },
    {
      name: dataType.type2,
      type: 'line',
      symbol: 'none',
      smooth: true,
      itemStyle: { color: colors[1] },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: colors[1] },
            { offset: 1, color: 'rgba(255,255,255,.1)' },
          ],
        },
      },
      markPoint: {
        symbol: 'rect',
        symbolSize: [50, 20],
        symbolOffset: [0, -10],
        label: { color: '#fff' },
        data: [{ type: 'max', name: '最大值' }],
      },
      data: data[2],
    },
  ],
}))

onMounted(() => {
  timer = window.setInterval(() => {
    chartRef.value?.dispatchAction({
      type: 'dataZoom',
      startValue: xLength,
      endValue: xLength + 8,
    })
    xLength = (xLength + 1) % (data[0].length - 8)
  }, 2000)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <Chart ref="chartRef" :option="option" />
</template>
