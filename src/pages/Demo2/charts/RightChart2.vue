<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c}% ({d}%)',
    backgroundColor: 'rgba(10, 25, 45, 0.9)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  legend: {
    bottom: '0%',
    left: 'center',
    textStyle: { color: '#94a3b8', fontSize: 10 },
    itemWidth: 10,
    itemHeight: 6,
  },
  series: [
    {
      name: '采出物相组分分析',
      type: 'pie',
      radius: ['42%', '72%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 5,
        borderColor: '#0b1626',
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        color: '#e2e8f0',
        fontSize: 10,
      },
      data: [
        { value: 64.2, name: '纯净原油', itemStyle: { color: '#00e5ff' } },
        { value: 22.5, name: '伴生天然气', itemStyle: { color: '#f59e0b' } },
        { value: 11.8, name: '地层回注水', itemStyle: { color: '#10b981' } },
        { value: 1.5, name: '机械杂质沉砂', itemStyle: { color: '#64748b' } },
      ],
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
