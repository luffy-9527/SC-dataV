<template>
  <Chart :option="chartOption" :use="components" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Chart from '@/components/Chart.vue'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

const components = [PieChart, GridComponent, TooltipComponent, LegendComponent]

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(255, 245, 232, 0.9)',
    borderColor: '#ea580c',
    textStyle: { color: '#5a4a42' }
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    textStyle: { color: '#5a4a42' }
  },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['40%', '50%'],
    data: [
      { value: 335, name: '罚款' },
      { value: 310, name: '警告' },
      { value: 234, name: '整改' },
      { value: 135, name: '其他' }
    ],
    itemStyle: {
      borderRadius: 6,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      color: '#5a4a42'
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 16,
        fontWeight: 'bold'
      }
    }
  }]
}))
</script>
