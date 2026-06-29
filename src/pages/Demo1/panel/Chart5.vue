<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const color = ['#fbdf88', '#ffa800', '#ff5b00', '#ff3000']
const trafficWay = [
  { name: '第一季度', value: 20 },
  { name: '第二季度', value: 10 },
  { name: '第三季度', value: 30 },
  { name: '第四季度', value: 40 },
]

const option = computed<EChartsOption>(() => ({
  tooltip: { show: false },
  legend: {
    icon: 'circle',
    orient: 'vertical',
    data: trafficWay.map(item => item.name),
    top: 'middle',
    right: '10%',
    textStyle: { color: '#000' },
    itemGap: 20,
  },
  series: [
    {
      name: '',
      type: 'pie',
      center: ['30%', '50%'],
      radius: [70, 80],
      label: { show: false },
      labelLine: { show: false },
      data: trafficWay.flatMap((item, index) => [
        {
          value: item.value,
          name: item.name,
          itemStyle: {
            borderRadius: 10,
            shadowBlur: 20,
            color: color[index],
            shadowColor: color[index],
          },
        },
        {
          value: 2,
          name: '',
          itemStyle: {
            color: 'rgba(0,0,0,0)',
            borderColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
          },
        },
      ]),
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
