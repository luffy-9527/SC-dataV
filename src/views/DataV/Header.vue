<template>
  <div class="header">
    <div class="header-decoration left"></div>
    <h1 class="header-title">四川省数据可视化大屏</h1>
    <div class="header-decoration right"></div>
    <div class="header-time">{{ currentTime }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref('')
let timer: number

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.header {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  pointer-events: auto;
}

.header-title {
  font-size: 36px;
  font-weight: bold;
  color: #ea580c;
  text-shadow: 0 0 20px rgba(234, 88, 12, 0.5);
  margin: 0 40px;
  letter-spacing: 8px;
}

.header-decoration {
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ea580c, transparent);
}

.header-decoration.left {
  margin-right: 20px;
}

.header-decoration.right {
  margin-left: 20px;
}

.header-time {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #fdb961;
  background: rgba(255, 245, 232, 0.8);
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid rgba(255, 145, 0, 0.3);
}
</style>
