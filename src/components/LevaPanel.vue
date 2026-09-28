<template>
  <div v-if="showLeva" class="leva-panel">
    <!-- 这里可以集成 Leva 控制面板 -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// import { useControls } from 'leva'

// 开发环境显示 Leva 控制面板
const showLeva = ref(import.meta.env.DEV)

// Leva 控制项 - 暂时注释掉
// const controls = useControls({
//   cloud: { value: true, label: '云层' },
//   bar: { value: true, label: '柱状图' },
//   rotation: { value: true, label: '旋转动画' },
//   heat: { value: true, label: '热力图' },
//   mode: { value: true, label: '展示模式' }
// })

// 将 Leva 控制同步到全局状态
// import { useConfigStore } from '@/stores/config'

onMounted(() => {
  // const configStore = useConfigStore()
  
  // 监听 Leva 控制变化并同步到 store
  // 这里只是示例，实际实现会更复杂
})
</script>

<style scoped>
.leva-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
}
</style>
