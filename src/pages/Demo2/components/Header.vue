<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentTime = ref('')
let timer: number | null = null

function updateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const day = weekDays[now.getDay()]
  currentTime.value = `${year}-${month}-${date} ${hours}:${minutes}:${seconds} ${day}`
}

function navigateTo(path: string) {
  router.push(path)
}

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) {
    clearInterval(timer)
  }
})
</script>

<template>
  <header class="oil-header">
    <!-- SVG 工业科技顶栏底座 -->
    <svg class="oil-header__bg" viewBox="0 0 1920 86" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0a192f" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#050c18" stop-opacity="0.75" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.1" />
          <stop offset="35%" stop-color="#00e5ff" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="1" />
          <stop offset="65%" stop-color="#00e5ff" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.1" />
        </linearGradient>
      </defs>
      <path d="M0 0h1920v40c-220 0-320 38-480 38H480C320 78 220 40 0 40V0Z" fill="url(#headerGrad)" />
      <path d="M0 40c220 0 320 38 480 38h960c160 0 260-38 480-38" stroke="url(#lineGrad)" stroke-width="2" fill="none" />
      <path d="M520 78h880l-30 8H550l-30-8Z" fill="rgba(0, 229, 255, 0.15)" stroke="rgba(0, 229, 255, 0.4)" stroke-width="1" />
    </svg>

    <!-- 左侧状态指示与气象 -->
    <div class="header-left">
      <div class="status-indicator">
        <span class="status-pulse"></span>
        <span class="status-text">实时勘探钻采运行中</span>
      </div>
      <div class="env-info">
        <span>风速: 3.8 m/s</span>
        <span class="divider">|</span>
        <span>井场气压: 101.4 kPa</span>
      </div>
    </div>

    <!-- 中间主标题 -->
    <div class="header-center">
      <h1 class="main-title">智慧油田智能开采数字孪生平台</h1>
      <span class="sub-title">INTELLIGENT OILFIELD DIGITAL TWIN DRILLING & EXTRACTION SYSTEM</span>
    </div>

    <!-- 右侧时间与导航按钮 -->
    <div class="header-right">
      <div class="clock-display">{{ currentTime }}</div>
      <div class="header-switcher">
        <button class="nav-switch-btn" title="切换到智慧城市宏观态势" @click="navigateTo('/demo1')">
          <span>Demo1 城市</span>
        </button>
        <button class="nav-switch-btn active" title="当前：智慧油田">
          <span>Demo2 油田</span>
        </button>
        <button class="nav-switch-btn" title="切换到自动驾驶数字孪生大屏" @click="navigateTo('/demo3')">
          <span>Demo3 智驾</span>
        </button>
      </div>
      <a
        class="github-link"
        href="https://github.com/luffy-9527/SC-dataV"
        target="_blank"
        rel="noreferrer"
        title="项目源码 GitHub"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.55 9.55 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      </a>
    </div>
  </header>
</template>

<style scoped>
.oil-header {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  width: 100%;
  height: 86px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  pointer-events: none;
}

.oil-header__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: auto;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #34d399;
}

.status-pulse {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.status-pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: #10b981;
  opacity: 0.5;
  animation: pulse 2s infinite ease-out;
}

@keyframes pulse {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}

.status-text {
  text-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.env-info {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  gap: 8px;
  align-items: center;
}

.divider {
  color: #334155;
}

.header-center {
  position: absolute;
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: auto;
}

.main-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: 6px;
  font-weight: 800;
  background: linear-gradient(180deg, #ffffff 0%, #a5f3fc 40%, #00e5ff 75%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(0, 229, 255, 0.45));
}

.sub-title {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  letter-spacing: 5px;
  color: rgba(0, 229, 255, 0.7);
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  pointer-events: auto;
}

.clock-display {
  font-family: monospace, sans-serif;
  font-size: 13px;
  color: #38bdf8;
  padding: 4px 10px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 4px;
  letter-spacing: 1px;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
}

.header-switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.7);
  padding: 3px;
  border-radius: 6px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.nav-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: #f59e0b;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.nav-switch-btn:hover {
  background: rgba(245, 158, 11, 0.2);
  transform: translateY(-1px);
}

.nav-switch-btn.active {
  background: rgba(245, 158, 11, 0.9);
  color: #0f172a;
  font-weight: 700;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
}

.github-link {
  color: #94a3b8;
  display: flex;
  align-items: center;
  transition: color 0.25s ease, transform 0.25s ease;
}

.github-link:hover {
  color: #00e5ff;
  transform: scale(1.1);
}
</style>
