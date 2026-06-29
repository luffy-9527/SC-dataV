<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    option: EChartsOption
    theme?: string | object
    autoResize?: boolean
  }>(),
  {
    theme: undefined,
    autoResize: true,
  },
)

const chartRef = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
let resizeObserver: ResizeObserver | null = null

function resize() {
  chart.value?.resize()
}

function getInstance() {
  return chart.value
}

function dispatchAction(payload: Parameters<echarts.ECharts['dispatchAction']>[0]) {
  chart.value?.dispatchAction(payload)
}

onMounted(() => {
  if (!chartRef.value) return
  chart.value = echarts.init(chartRef.value, props.theme)
  chart.value.setOption(props.option, { notMerge: false, lazyUpdate: true })

  if (props.autoResize) {
    window.addEventListener('resize', resize)
    resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(chartRef.value)
  }
})

watch(
  () => props.option,
  option => {
    chart.value?.setOption(option, {
      notMerge: false,
      lazyUpdate: true,
      replaceMerge: ['series'],
    })
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (props.autoResize) window.removeEventListener('resize', resize)
  resizeObserver?.disconnect()
  chart.value?.dispose()
  chart.value = null
})

defineExpose({ chart, getInstance, dispatchAction, resize })
</script>

<template>
  <div ref="chartRef" class="dv-chart"></div>
</template>

<style scoped>
.dv-chart {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
