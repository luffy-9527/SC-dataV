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
  grid: {
    top: '18%',
    left: '12%',
    right: '8%',
    bottom: '18%',
  },
  xAxis: {
    type: 'category',
    data: ['井段1', '井段2', '井段3', '井段4', '井段5', '井段6', '当前靶区'],
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    name: '载荷 (kN)',
    nameTextStyle: { color: '#94a3b8', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  series: [
    {
      name: '悬重载荷 (kN)',
      type: 'bar',
      barWidth: '38%',
      data: [720, 850, 930, 1080, 1140, 1260, 1340],
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#38bdf8' },
          { offset: 1, color: '#0284c7' },
        ]),
      },
      markLine: {
        symbol: 'none',
        data: [
          {
            yAxis: 1500,
            name: '安全警戒上限',
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
            label: {
              formatter: '警戒 1500kN',
              position: 'insideEndTop',
              color: '#ef4444',
              fontSize: 10,
            },
          },
        ],
      },
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
