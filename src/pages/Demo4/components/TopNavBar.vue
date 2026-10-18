<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

interface Props {
  fps?: number
  agentState: string
  modelName: string
  enableWebSearch?: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'openSettings'): void
}>()

const router = useRouter()
const currentTime = ref('')
let timer: number | null = null

const navItems = [
  { path: '/demo1', name: 'Demo1 智慧城市' },
  { path: '/demo2', name: 'Demo2 智慧油田' },
  { path: '/demo3', name: 'Demo3 自动驾驶' },
  { path: '/demo4', name: 'Demo4 AI数字人' },
]

function updateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`
}

function navigateTo(path: string) {
  router.push(path)
}

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <header class="ai-header">
    <!-- SVG 赛博科技发光底座 -->
    <svg class="ai-header__bg" viewBox="0 0 1920 86" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="aiHeaderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0a1226" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#030712" stop-opacity="0.75" />
        </linearGradient>
        <linearGradient id="aiLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.1" />
          <stop offset="35%" stop-color="#00f2fe" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#a855f7" stop-opacity="1" />
          <stop offset="65%" stop-color="#00f2fe" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.1" />
        </linearGradient>
      </defs>
      <path d="M0 0h1920v40c-220 0-320 38-480 38H480C320 78 220 40 0 40V0Z" fill="url(#aiHeaderGrad)" />
      <path d="M0 40c220 0 320 38 480 38h960c160 0 260-38 480-38" stroke="url(#aiLineGrad)" stroke-width="2" fill="none" />
      <path d="M520 78h880l-30 8H550l-30-8Z" fill="rgba(0, 242, 254, 0.15)" stroke="rgba(0, 242, 254, 0.4)" stroke-width="1" />
    </svg>

    <!-- 左侧：系统时间与状态 -->
    <div class="header-left">
      <div class="time-box">
        <span class="live-dot" />
        <span class="time-text">{{ currentTime }}</span>
      </div>
      <div class="badge-chip">
        <span class="chip-label">大模型</span>
        <span class="chip-val">{{ modelName }}</span>
      </div>
      <div v-if="enableWebSearch" class="grounding-chip" title="已开启 Google Search 实时全网搜索">
        <span class="globe-ping">🌐</span>
        <span class="ground-text">联网模式</span>
      </div>
    </div>

    <!-- 中间：大屏主标题与四大板块切换 -->
    <div class="header-center">
      <div class="main-title">
        全息 AI 数字人智能指挥中心
        <span class="sub-title">AI AVATAR COGNITIVE COMMAND CENTER</span>
      </div>

      <nav class="nav-switchers">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="nav-btn"
          :class="{ active: item.path === '/demo4' }"
          @click="navigateTo(item.path)"
        >
          <span class="nav-dot" />
          <span>{{ item.name }}</span>
        </button>
      </nav>
    </div>

    <!-- 右侧：FPS / 设置 / GitHub -->
    <div class="header-right">
      <div class="fps-capsule" title="渲染帧率">
        <span class="fps-num">{{ fps || 60 }}</span>
        <span class="fps-unit">FPS</span>
      </div>

      <button class="settings-btn" title="配置大模型 API Key 与音色参数" @click="emit('openSettings')">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>引擎设置</span>
      </button>

      <a
        class="github-link"
        href="https://github.com/luffy-9527/SC-dataV"
        target="_blank"
        rel="noreferrer"
        title="查看 GitHub 仓库"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.33 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.55 9.55 0 0 1 12 6.99c.85 0 1.71.11 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      </a>
    </div>
  </header>
</template>

<style scoped>
.ai-header {
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
  box-sizing: border-box;
  pointer-events: none;
}

.ai-header > * {
  pointer-events: auto;
}

.ai-header__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 380px;
}

.time-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(0, 242, 254, 0.25);
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  color: #cbd5e1;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 2s infinite;
}

.badge-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.35);
  font-size: 12px;
}

.chip-label {
  color: #a855f7;
  font-weight: 500;
}

.chip-val {
  color: #f1f5f9;
  font-family: monospace;
}

.grounding-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 242, 254, 0.12);
  border: 1px solid rgba(0, 242, 254, 0.4);
  font-size: 11px;
  color: #00f2fe;
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
}

.globe-ping {
  font-size: 12px;
  animation: ping-slow 2s infinite;
}

@keyframes ping-slow {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.8;
  }
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -6px;
}

.main-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 2px;
  background: linear-gradient(180deg, #ffffff 20%, #67e8f9 70%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 24px rgba(0, 242, 254, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sub-title {
  font-size: 9px;
  letter-spacing: 4px;
  color: rgba(148, 163, 184, 0.75);
  margin-top: 1px;
}

.nav-switchers {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  font-size: 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.25s;
}

.nav-btn:hover {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.1);
}

.nav-btn.active {
  color: #ffffff;
  background: linear-gradient(90deg, rgba(0, 242, 254, 0.25), rgba(168, 85, 247, 0.25));
  border-color: #00f2fe;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.35);
}

.nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  width: 380px;
}

.fps-capsule {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 4px 10px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
}

.fps-num {
  font-family: monospace;
  font-weight: 700;
  color: #10b981;
  font-size: 14px;
}

.fps-unit {
  font-size: 10px;
  color: #64748b;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 12px;
  color: #cbd5e1;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: rgba(0, 242, 254, 0.15);
  border-color: #00f2fe;
  color: #00f2fe;
}

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
}

.github-link:hover {
  color: #ffffff;
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}
</style>
