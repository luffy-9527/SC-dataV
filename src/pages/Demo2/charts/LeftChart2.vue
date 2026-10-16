<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import Chart from '@/components/Chart.vue'

const option = computed<EChartsOption>(() => ({
  tooltip: {
    backgroundColor: 'rgba(10, 25, 45, 0.9)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  legend: {
    data: ['当前工况参数', '标定基准值'],
    bottom: '2%',
    textStyle: { color: '#94a3b8', fontSize: 10 },
    itemWidth: 10,
    itemHeight: 6,
  },
  radar: {
    indicator: [
      { name: '环空流压\n(MPa)', max: 40 },
      { name: '泥浆比重\n(g/cm³)', max: 2.5 },
      { name: '塑性粘度\n(mPa·s)', max: 60 },
      { name: '动切力\n(Pa)', max: 30 },
      { name: '排量循环\n(L/s)', max: 55 },
      { name: '井壁支撑力\n(kN)', max: 120 },
    ],
    center: ['50%', '46%'],
    radius: '58%',
    axisName: {
      color: '#94a3b8',
      fontSize: 10,
    },
    splitArea: {
      areaStyle: {
        color: [
          'rgba(0, 229, 255, 0.02)',
          'rgba(0, 229, 255, 0.05)',
          'rgba(0, 229, 255, 0.08)',
          'rgba(0, 229, 255, 0.12)',
        ],
      },
    },
    axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.2)' } },
    splitLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.15)' } },
  },
  series: [
    {
      name: '井下流变与地层力学分析',
      type: 'radar',
      data: [
        {
          value: [28.4, 1.82, 42.0, 18.5, 46.2, 98.0],
          name: '当前工况参数',
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#00e5ff', width: 2 },
          itemStyle: { color: '#00e5ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 229, 255, 0.45)' },
              { offset: 1, color: 'rgba(0, 229, 255, 0.08)' },
            ]),
          },
        },
        {
          value: [32.0, 1.65, 38.0, 16.0, 42.0, 90.0],
          name: '标定基准值',
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    },
  ],
}))
</script>

<template>
  <Chart :option="option" />
</template>
