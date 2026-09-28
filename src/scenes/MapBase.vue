<template>
  <div v-if="false">地图基础组件占位符</div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

// 模拟地图加载完成
onMounted(() => {
  // 模拟地图加载完成后设置状态
  setTimeout(() => {
    configStore.$patch({ mapPlayComplete: true })
  }, 1000)
})
</script>
