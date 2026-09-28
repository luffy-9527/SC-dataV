<template>
  <Chart :option="chartOption" :use="components" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Chart from '@/components/Chart.vue'
import { GaugeChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'

const components = [GaugeChart, GridComponent, TooltipComponent]

const chartOption = computed(() => ({
  tooltip: {
    formatter: '{a} <br/>{b} : {c}%'
  },
  series: [
    {
      name: '税收完成率',
      type: 'gauge',
      min: 0,
      max: 100,
      splitNumber: 10,
      radius: '90%',
      axisLine: {
        lineStyle: {
          width: 8,
          color: [
            [0.3, '#67e0e3'],
            [0.7, '#37a2da'],
            [1, '#fd666d']
          ]
        }
      },
      pointer: {
        itemStyle: {
          color: 'inherit'
        }
      },
      axisTick: {
        distance: -3,
        length: 8,
        lineStyle: {
          color: '#fff',
          width: 1
        }
      },
      splitLine: {
        distance: -3,
        length: 30,
        lineStyle: {
          color: '#fff',
          width: 2
        }
      },
      axisLabel: {
        color: 'inherit',
        distance: 40,
        fontSize: 12
      },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        color: 'inherit',
        fontSize: 20
      },
      data: [
        {
          value: 85,
          name: '税收完成率'
        }
      ]
    }
  ]
}))
</script>
